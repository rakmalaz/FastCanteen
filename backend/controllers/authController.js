const db = require('../config/db');

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

        // Simpan akun mahasiswa
        const [resultUser] = await db.query(
            'INSERT INTO pengguna (nama, nim, email, kata_sandi, peran, no_hp) VALUES (?, ?, ?, ?, ?, ?)',
            [nama, nim, email, kata_sandi, 'mahasiswa', no_hp || null]
        );

        const newUserId = resultUser.insertId;

        res.status(201).json({
            success: true,
            message: 'Registrasi Mahasiswa berhasil',
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

        // Validasi kata sandi
        if (user.kata_sandi !== inputPassword && user.kata_sandi !== kata_sandi) {
            return res.status(401).json({
                success: false,
                message: 'Email/NIM atau kata sandi tidak cocok'
            });
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
            } else {
                // Fallback jika belum terikat ke stan spesifik, cari stan pertama atau buatkan otomatis
                const [anyTenant] = await db.query('SELECT * FROM tenant ORDER BY id ASC LIMIT 1');
                if (anyTenant.length > 0) {
                    tenantInfo = anyTenant[0];
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Login berhasil',
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
