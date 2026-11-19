const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
    console.error('❌ JWT_SECRET belum diisi (minimal 16 karakter) di backend/.env');
    process.exit(1);
}

const tolak = (res, kode, pesan) => res.status(kode).json({ success: false, message: pesan });

// Membuat token login (berlaku 7 hari)
exports.buatToken = (user) =>
    jwt.sign({ id: user.id, peran: user.peran }, JWT_SECRET, { expiresIn: '7d' });

// Wajib membawa token yang valid. Hasilnya: req.user = { id, peran }
exports.wajibLogin = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return tolak(res, 401, 'Silakan login terlebih dahulu');
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return tolak(res, 401, 'Sesi berakhir atau tidak valid. Silakan login ulang');
    }
};

// Hanya peran tertentu yang boleh masuk
exports.wajibPeran = (...peran) => (req, res, next) => {
    if (peran.includes(req.user.peran)) return next();
    return tolak(res, 403, 'Anda tidak memiliki akses ke fitur ini');
};

// ID di URL harus sama dengan ID pengguna yang login (admin boleh semua)
exports.hanyaDiriSendiri = (namaParam) => (req, res, next) => {
    if (req.user.peran === 'admin' || Number(req.params[namaParam]) === req.user.id) return next();
    return tolak(res, 403, 'Anda tidak boleh mengakses data pengguna lain');
};

const ambilIdStan = async (idPengguna) => {
    const [rows] = await db.query(
        'SELECT id FROM tenant WHERE id_admin_pendaftar = ? LIMIT 1',
        [idPengguna]
    );
    return rows.length > 0 ? rows[0].id : null;
};

// ID stan (di params/body/query) harus stan milik tenant yang login (admin boleh semua)
exports.stanSendiri = (sumber, nama) => async (req, res, next) => {
    try {
        if (req.user.peran === 'admin') return next();
        const nilai = (req[sumber] || {})[nama];
        const idStan = await ambilIdStan(req.user.id);
        if (idStan !== null && Number(nilai) === idStan) return next();
        return tolak(res, 403, 'Anda tidak boleh mengakses data stan lain');
    } catch (err) {
        next(err);
    }
};

// Menu (/:id) harus milik stan tenant yang login
exports.menuSendiri = async (req, res, next) => {
    try {
        if (req.user.peran === 'admin') return next();
        const [rows] = await db.query('SELECT id_tenant FROM menu WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return next(); // biar controller yang menjawab 404
        const idStan = await ambilIdStan(req.user.id);
        if (idStan !== null && rows[0].id_tenant === idStan) return next();
        return tolak(res, 403, 'Menu ini bukan milik stan Anda');
    } catch (err) {
        next(err);
    }
};

// Pesanan (/:id) harus milik mahasiswa pemesan atau tenant pemilik stan
exports.pesananSendiri = (...peranDiizinkan) => async (req, res, next) => {
    try {
        if (!peranDiizinkan.includes(req.user.peran)) {
            return tolak(res, 403, 'Anda tidak memiliki akses ke fitur ini');
        }
        if (req.user.peran === 'admin') return next();
        const [rows] = await db.query(
            `SELECT p.id_mahasiswa, t.id_admin_pendaftar
             FROM pesanan p JOIN tenant t ON p.id_tenant = t.id WHERE p.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return next(); // biar controller yang menjawab 404
        const r = rows[0];
        const milik =
            (req.user.peran === 'mahasiswa' && r.id_mahasiswa === req.user.id) ||
            (req.user.peran === 'tenant' && r.id_admin_pendaftar === req.user.id);
        if (milik) return next();
        return tolak(res, 403, 'Pesanan ini bukan milik Anda');
    } catch (err) {
        next(err);
    }
};

// Notifikasi (/:id) harus milik penerima yang login
exports.notifikasiSendiri = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT id_penerima FROM notifikasi WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return next();
        if (req.user.peran === 'admin' || rows[0].id_penerima === req.user.id) return next();
        return tolak(res, 403, 'Notifikasi ini bukan milik Anda');
    } catch (err) {
        next(err);
    }
};

// Isi field body dengan ID pengguna yang login (nilai kiriman aplikasi diabaikan)
exports.paksaBody = (nama) => (req, res, next) => {
    req.body = req.body || {};
    req.body[nama] = req.user.id;
    next();
};