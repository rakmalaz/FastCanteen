const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------
// Upload foto menu: gambar dikirim base64, disimpan sebagai file di
// backend/uploads, dan hanya path-nya yang masuk database (kolom foto)
// ---------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_FOTO_BYTES = 3 * 1024 * 1024; // 3 MB

const errorFoto = (message) => {
    const err = new Error(message);
    err.statusCode = 400;
    return err;
};

// Cek tanda file asli (JPEG / PNG / WEBP), bukan sekadar percaya ekstensi
const isImageBuffer = (buf) =>
    (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ||
    (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP');

// Tahap 1: periksa kiriman dari aplikasi (belum menulis apa pun ke disk)
const siapkanFoto = (base64, mimeType) => {
    const ext = MIME_EXT[String(mimeType || 'image/jpeg').toLowerCase()];
    if (!ext) throw errorFoto('Format foto harus JPG, PNG, atau WEBP');

    const buffer = Buffer.from(String(base64).replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (buffer.length === 0) throw errorFoto('Data foto kosong');
    if (buffer.length > MAX_FOTO_BYTES) throw errorFoto('Ukuran foto maksimal 3 MB');
    if (!isImageBuffer(buffer)) throw errorFoto('File foto bukan gambar yang valid');

    return { buffer, ext };
};

// Tahap 2: tulis file ke backend/uploads, kembalikan path untuk disimpan di database
const tulisFoto = async (idMenu, { buffer, ext }) => {
    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    const fileName = `menu-${parseInt(idMenu, 10)}-${Date.now()}.${ext}`;
    await fs.promises.writeFile(path.join(UPLOAD_DIR, fileName), buffer);
    return `/uploads/${fileName}`;
};

// Hapus file foto lama saat diganti (hanya file buatan aplikasi, bukan URL luar)
const hapusFotoLama = async (fotoLama) => {
    if (!fotoLama || !/^\/uploads\/menu-\d+-\d+\.(jpg|png|webp)$/.test(fotoLama)) return;
    try {
        await fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(fotoLama)));
    } catch (e) {
        /* file sudah tidak ada: abaikan */
    }
};

// Mengambil seluruh menu makanan & minuman (US-03)
exports.getAllMenu = async (req, res) => {
    try {
        const { id_tenant, cari, status } = req.query;

        let query = `
            SELECT m.id, m.id_tenant, m.nama_menu, m.harga, m.foto, m.status_tersedia,
                   t.nama_tenant, t.lokasi_stan
            FROM menu m
            JOIN tenant t ON m.id_tenant = t.id
            WHERE 1=1
        `;
        const params = [];

        if (id_tenant) {
            query += ' AND m.id_tenant = ?';
            params.push(id_tenant);
        }

        if (status) {
            query += ' AND m.status_tersedia = ?';
            params.push(status);
        }

        if (cari) {
            query += ' AND (m.nama_menu LIKE ? OR t.nama_tenant LIKE ?)';
            params.push(`%${cari}%`, `%${cari}%`);
        }

        query += ' ORDER BY m.id DESC';

        const [rows] = await db.query(query, params);

        res.status(200).json({
            success: true,
            total: rows.length,
            data: rows
        });
    } catch (error) {
        console.error('Error saat mengambil menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data menu',
            error: error.message
        });
    }
};

// Mengambil menu berdasarkan ID
exports.getMenuById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT m.*, t.nama_tenant, t.lokasi_stan
            FROM menu m
            JOIN tenant t ON m.id_tenant = t.id
            WHERE m.id = ?
        `;
        const [rows] = await db.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menu tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error saat mengambil detail menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail menu',
            error: error.message
        });
    }
};

// Menambahkan menu baru oleh pihak tenant (US-09)
exports.createMenu = async (req, res) => {
    try {
        const { id_tenant, nama_menu, harga, foto, foto_base64, foto_mime, status_tersedia } = req.body;

        const namaBersih = String(nama_menu || '').trim();
        const hargaAngka = Number(harga);

        if (!id_tenant || !namaBersih || !Number.isFinite(hargaAngka)) {
            return res.status(400).json({ success: false, message: 'ID Tenant, nama menu, dan harga wajib diisi' });
        }
        if (hargaAngka <= 0 || hargaAngka > 1000000) {
            return res.status(400).json({ success: false, message: 'Harga harus lebih dari 0 dan maksimal Rp 1.000.000' });
        }
        if (namaBersih.length > 100) {
            return res.status(400).json({ success: false, message: 'Nama menu maksimal 100 karakter' });
        }
        if (foto && String(foto).length > 255) {
            return res.status(400).json({ success: false, message: 'Alamat foto maksimal 255 karakter' });
        }
        if (status_tersedia && !['tersedia', 'habis'].includes(status_tersedia)) {
            return res.status(400).json({ success: false, message: "Status menu harus 'tersedia' atau 'habis'" });
        }

        // Periksa foto unggahan SEBELUM menyentuh database (bila tidak valid -> 400)
        const fotoSiap = foto_base64 ? siapkanFoto(foto_base64, foto_mime) : null;

        // Pastikan tenant ada
        const [tenants] = await db.query('SELECT id FROM tenant WHERE id = ?', [id_tenant]);
        if (tenants.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tenant tidak valid atau tidak ditemukan'
            });
        }

        const statusTersedia = status_tersedia || 'tersedia';
        let fotoFinal = foto || null;

        const [result] = await db.query(
            'INSERT INTO menu (id_tenant, nama_menu, harga, foto, status_tersedia) VALUES (?, ?, ?, ?, ?)',
            [id_tenant, namaBersih, hargaAngka, fotoFinal, statusTersedia]
        );

        // Nama file memakai id menu, jadi file ditulis setelah INSERT lalu path-nya disimpan
        if (fotoSiap) {
            fotoFinal = await tulisFoto(result.insertId, fotoSiap);
            await db.query('UPDATE menu SET foto = ? WHERE id = ?', [fotoFinal, result.insertId]);
        }

        res.status(201).json({
            success: true,
            message: 'Menu berhasil ditambahkan',
            data: {
                id: result.insertId,
                id_tenant,
                nama_menu: namaBersih,
                harga: hargaAngka,
                foto: fotoFinal,
                status_tersedia: statusTersedia
            }
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error('Error saat menambahkan menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan menu',
            error: error.message
        });
    }
};

        res.status(201).json({
            success: true,
            message: 'Menu berhasil ditambahkan',
            data: {
                id: result.insertId,
                id_tenant,
                nama_menu,
                harga: parseFloat(harga),
                foto: fotoUrl,
                status_tersedia: statusTersedia
            }
        });
    } catch (error) {
        console.error('Error saat menambahkan menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan menu',
            error: error.message
        });
    }
};

// Memperbarui menu makanan
exports.updateMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_menu, harga, foto, foto_base64, foto_mime, status_tersedia } = req.body;

        const [existing] = await db.query('SELECT id, foto FROM menu WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menu tidak ditemukan'
            });
        }

        // Foto baru dari galeri: periksa dulu, lalu simpan sebagai file
        let fotoBaru = foto;
        if (foto_base64) {
            fotoBaru = await tulisFoto(id, siapkanFoto(foto_base64, foto_mime));
        }

        await db.query(
            `UPDATE menu 
             SET nama_menu = COALESCE(?, nama_menu),
                 harga = COALESCE(?, harga),
                 foto = COALESCE(?, foto),
                 status_tersedia = COALESCE(?, status_tersedia)
             WHERE id = ?`,
            [nama_menu, harga ? parseFloat(harga) : null, fotoBaru, status_tersedia, id]
        );

        // Foto lama sudah tergantikan: hapus filenya agar folder uploads tidak menumpuk
        if (foto_base64) await hapusFotoLama(existing[0].foto);

        const [updated] = await db.query('SELECT * FROM menu WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: 'Menu berhasil diperbarui',
            data: updated[0]
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error('Error saat memperbarui menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui menu',
            error: error.message
        });
    }
};

        const [updated] = await db.query('SELECT * FROM menu WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: 'Menu berhasil diperbarui',
            data: updated[0]
        });
    } catch (error) {
        console.error('Error saat memperbarui menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui menu',
            error: error.message
        });
    }
};

// Mengubah status ketersediaan menu (Tersedia / Habis)
exports.toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status_tersedia } = req.body;

        if (!status_tersedia || !['tersedia', 'habis'].includes(status_tersedia)) {
            return res.status(400).json({
                success: false,
                message: 'Status harus berupa "tersedia" atau "habis"'
            });
        }

        const [result] = await db.query(
            'UPDATE menu SET status_tersedia = ? WHERE id = ?',
            [status_tersedia, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menu tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            message: `Status menu berhasil diubah menjadi ${status_tersedia}`,
            data: { id, status_tersedia }
        });
    } catch (error) {
        console.error('Error saat mengubah status menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengubah status menu',
            error: error.message
        });
    }
};

// Menghapus menu
exports.deleteMenu = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query('DELETE FROM menu WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menu tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Menu berhasil dihapus'
        });
    } catch (error) {
        console.error('Error saat menghapus menu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus menu',
            error: error.message
        });
    }
};
