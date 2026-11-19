const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { buatToken } = require('../middleware/auth');

// Registrasi pengguna baru (Mahasiswa, Tenant, atau Admin)
// US-01, US-02
exports.register = async (req, res) => {
    try {
        const { nama, nim, email, kata_sandi, peran, no_hp, nama_tenant, lokasi_stan } = req.body;

        if (!nama || !email || !kata_sandi || !peran) {
            return res.status(400).json({
                success: false,
                message: 'Nama, email, kata sandi, dan peran wajib diisi'
            });
        }

        // Hanya mahasiswa yang diperbolehkan mendaftar secara mandiri
        // Pendaftaran tenant dikelola sepenuhnya oleh Super Admin
        if (peran !== 'mahasiswa') {
            return res.status(403).json({
                success: false,
                message: 'Pendaftaran mandiri hanya dibuka untuk Mahasiswa. Pendaftaran stan Tenant hanya dapat dilakukan oleh Super Admin FastCanteen.'
            });
        }

        if (!nim) {
            return res.status(400).json({
                success: false,
                message: 'NIM Mahasiswa wajib diisi untuk verifikasi kampus UINSA'
            });
        }

        // Cek email apakah sudah terdaftar
        const [existing] = await db.query('SELECT id FROM pengguna WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk.'
            });
        }
        // Cek NIM apakah sudah terdaftar (login bisa memakai NIM, jadi harus unik)
        const [nimAda] = await db.query('SELECT id FROM pengguna WHERE nim = ?', [nim.trim()]);
        if (nimAda.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'NIM sudah terdaftar. Silakan masuk atau hubungi admin jika ini bukan Anda.'
            });
        }
        // Simpan akun mahasiswa
        const [resultUser] = await db.query(
            'INSERT INTO pengguna (nama, nim, email, kata_sandi, peran, no_hp) VALUES (?, ?, ?, ?, ?, ?)',
            [nama, nim.trim(), email, await bcrypt.hash(String(kata_sandi).trim(), 10), 'mahasiswa', no_hp || null]
        );

        const newUserId = resultUser.insertId;

        res.status(201).json({
            success: true,
            message: 'Registrasi Mahasiswa berhasil',
            token: buatToken({ id: newUserId, peran: 'mahasiswa' }),
            data: {
                id: newUserId,
                nama,
                nim,
                email,
                peran: 'mahasiswa',
                no_hp: no_hp || null,
                tenant: null
            }
        });
    } catch (error) {
        console.error('Error saat registrasi:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// Login pengguna (Mahasiswa, Tenant, atau Admin)
// US-02
exports.login = async (req, res) => {
    try {
        const { email, kata_sandi } = req.body;

        if (!email || !kata_sandi) {
            return res.status(400).json({
                success: false,
                message: 'Email/NIM dan kata sandi wajib diisi'
            });
        }

        const identifier = email.trim();
        const inputPassword = kata_sandi.trim();

        // Cari pengguna berdasarkan email ATAU NIM (memudahkan login mahasiswa)
        const [users] = await db.query(
            'SELECT * FROM pengguna WHERE email = ? OR nim = ?',
            [identifier, identifier]
        );
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email/NIM atau kata sandi tidak cocok'
            });
        }

        const user = users[0];

        // Cek kata sandi. Akun lama (teks biasa) otomatis di-hash saat login pertama.
        const sudahHash = String(user.kata_sandi).startsWith('$2');
        const cocok = sudahHash
            ? await bcrypt.compare(inputPassword, user.kata_sandi)
            : user.kata_sandi === inputPassword || user.kata_sandi === kata_sandi;

        if (!cocok) {
            return res.status(401).json({
                success: false,
                message: 'Email/NIM atau kata sandi tidak cocok'
            });
        }

        if (!sudahHash) {
            const hashBaru = await bcrypt.hash(inputPassword, 10);
            await db.query('UPDATE pengguna SET kata_sandi = ? WHERE id = ?', [hashBaru, user.id]);
        }

        // Jika pengguna adalah tenant, ambil info tenant miliknya
        let tenantInfo = null;
        if (user.peran === 'tenant') {
            const [tenants] = await db.query(
                'SELECT * FROM tenant WHERE id_admin_pendaftar = ? LIMIT 1',
                [user.id]
            );
            if (tenants.length > 0) {
                tenantInfo = tenants[0];
            }
        }

        res.status(200).json({
            success: true,
            message: 'Login berhasil',
            token: buatToken(user),
            data: {
                id: user.id,
                nama: user.nama,
                nim: user.nim,
                email: user.email,
                peran: user.peran,
                no_hp: user.no_hp,
                tenant: tenantInfo
            }
        });
    } catch (error) {
        console.error('Error saat login:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// Mengambil profil pengguna saat ini
exports.getProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const [users] = await db.query(
            'SELECT id, nama, nim, email, peran, no_hp FROM pengguna WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pengguna tidak ditemukan'
            });
        }

        const user = users[0];
        let tenantInfo = null;

        if (user.peran === 'tenant') {
            const [tenants] = await db.query(
                'SELECT * FROM tenant WHERE id_admin_pendaftar = ? LIMIT 1',
                [user.id]
            );
            if (tenants.length > 0) {
                tenantInfo = tenants[0];
            }
        }

        res.status(200).json({
            success: true,
            data: {
                ...user,
                tenant: tenantInfo
            }
        });
    } catch (error) {
        console.error('Error saat mengambil profil:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};

// ---------------------------------------------------------------
// Lupa kata sandi (2 langkah, tanpa email/SMS):
//   1. /auth/lupa-sandi/verifikasi : cocokkan email/NIM + nomor HP yang terdaftar -> token reset
//   2. /auth/lupa-sandi/reset      : token + kata sandi baru -> kata sandi diganti
// Akun Super Admin tidak bisa direset mandiri (hubungi Super Admin lain).
// ---------------------------------------------------------------
const MENIT_BERLAKU_TOKEN = 10;
const MIN_PANJANG_SANDI = 6;
const BATAS_PERCOBAAN = 5;          // maksimal percobaan verifikasi
const JENDELA_PERCOBAAN_MS = 15 * 60 * 1000; // per 15 menit
const percobaan = new Map();        // kunci "ip|identitas" -> { jumlah, mulai }

// Token reset memakai kunci terpisah dari token login, jadi tidak bisa dipakai untuk mengakses API lain
const kunciReset = () => `${process.env.JWT_SECRET}:reset-sandi`;
// Sidik jari kata sandi saat ini: begitu kata sandi diganti, token lama otomatis tidak berlaku (sekali pakai)
const sidikSandi = (hash) => crypto.createHash('sha256').update(String(hash)).digest('hex').slice(0, 16);
// 0812..., +62812..., 62812... dianggap nomor yang sama
const normalHp = (v) => {
    const digit = String(v || '').replace(/\D/g, '');
    if (digit.startsWith('62')) return digit.slice(2);
    if (digit.startsWith('0')) return digit.slice(1);
    return digit;
};

const cekBatasPercobaan = (kunci) => {
    const sekarang = Date.now();
    const data = percobaan.get(kunci);
    if (!data || sekarang - data.mulai > JENDELA_PERCOBAAN_MS) {
        percobaan.set(kunci, { jumlah: 0, mulai: sekarang });
        return true;
    }
    return data.jumlah < BATAS_PERCOBAAN;
};
const catatGagal = (kunci) => {
    const data = percobaan.get(kunci);
    if (data) data.jumlah += 1;
};

exports.verifikasiLupaSandi = async (req, res) => {
    try {
        const identitas = String(req.body.identitas || '').trim();
        const noHp = String(req.body.no_hp || '').trim();
        if (!identitas || !noHp) {
            return res.status(400).json({
                success: false,
                message: 'Email/NIM dan nomor HP terdaftar wajib diisi'
            });
        }

        const kunci = `${req.ip}|${identitas.toLowerCase()}`;
        if (!cekBatasPercobaan(kunci)) {
            return res.status(429).json({
                success: false,
                message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.'
            });
        }

        const [users] = await db.query('SELECT * FROM pengguna WHERE email = ? OR nim = ? LIMIT 1', [identitas, identitas]);
        const user = users[0];
        const hpCocok = user && normalHp(user.no_hp) !== '' && normalHp(user.no_hp) === normalHp(noHp);

        // Pesan sengaja sama untuk "akun tidak ada" dan "HP salah" agar akun orang lain tidak bisa ditebak
        if (!user || !hpCocok) {
            catatGagal(kunci);
            return res.status(401).json({
                success: false,
                message: 'Data tidak cocok. Periksa kembali email/NIM dan nomor HP yang terdaftar.'
            });
        }
        if (user.peran === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Akun Super Admin tidak dapat direset mandiri. Hubungi Super Admin lainnya.'
            });
        }

        percobaan.delete(kunci);
        const tokenReset = jwt.sign(
            { id: user.id, v: sidikSandi(user.kata_sandi) },
            kunciReset(),
            { expiresIn: `${MENIT_BERLAKU_TOKEN}m` }
        );
        res.status(200).json({
            success: true,
            message: 'Verifikasi berhasil. Silakan buat kata sandi baru.',
            token_reset: tokenReset,
            data: { nama: user.nama, berlaku_menit: MENIT_BERLAKU_TOKEN }
        });
    } catch (error) {
        console.error('Error saat verifikasi lupa kata sandi:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
    }
};

exports.resetLupaSandi = async (req, res) => {
    try {
        const { token_reset } = req.body;
        const sandiBaru = String(req.body.kata_sandi_baru || '').trim();
        if (!token_reset || !sandiBaru) {
            return res.status(400).json({ success: false, message: 'Token dan kata sandi baru wajib diisi' });
        }
        if (sandiBaru.length < MIN_PANJANG_SANDI) {
            return res.status(400).json({
                success: false,
                message: `Kata sandi baru minimal ${MIN_PANJANG_SANDI} karakter`
            });
        }

        let payload;
        try {
            payload = jwt.verify(token_reset, kunciReset());
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Sesi reset habis atau tidak valid. Ulangi dari langkah verifikasi.'
            });
        }

        const [users] = await db.query('SELECT id, kata_sandi, peran FROM pengguna WHERE id = ?', [payload.id]);
        const user = users[0];
        if (!user || user.peran === 'admin' || sidikSandi(user.kata_sandi) !== payload.v) {
            return res.status(401).json({
                success: false,
                message: 'Tautan reset sudah dipakai atau tidak valid. Ulangi dari langkah verifikasi.'
            });
        }

        await db.query('UPDATE pengguna SET kata_sandi = ? WHERE id = ?', [await bcrypt.hash(sandiBaru, 10), user.id]);
        res.status(200).json({
            success: true,
            message: 'Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.'
        });
    } catch (error) {
        console.error('Error saat reset kata sandi:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
    }
};
