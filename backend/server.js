const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');

// Import rute-rute FastCanteen
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const menuRoutes = require('./routes/menuRoutes');
const pesananRoutes = require('./routes/pesananRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notifikasiRoutes = require('./routes/notifikasiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sajikan file bukti pembayaran yang diunggah (backend/uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging sederhana permintaan HTTP
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Endpoint Utama & Health Check
app.get('/', (req, res) => {
    res.json({
        message: 'FastCanteen API Server - UINSA Kampus 2',
        status: 'Online',
        version: '2.0.0'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'FastCanteen Backend is fully healthy and running',
        timestamp: new Date()
    });
});

// Pasang Router API FastCanteen
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/pesanan', pesananRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifikasi', notifikasiRoutes);

// Penanganan Route 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route tidak ditemukan: ${req.method} ${req.originalUrl}`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan internal pada server FastCanteen',
        error: err.message
    });
});

// Pembatalan otomatis pesanan non-tunai yang pembayarannya tidak terverifikasi (cek tiap menit)
const pesananController = require('./controllers/pesananController');
setInterval(async () => {
    try {
        const jumlah = await pesananController.batalkanPesananKedaluwarsa();
        if (jumlah > 0) console.log(`⏰ ${jumlah} pesanan kedaluwarsa dibatalkan otomatis`);
    } catch (err) {
        console.warn('⚠️ Gagal menjalankan pembatalan otomatis:', err.message);
    }
}, 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 FastCanteen Server berjalan di http://localhost:${PORT}`);
    console.log(`📱 Untuk Emulator Android: http://10.0.2.2:${PORT}/api`);
    console.log(`📡 Rute API: /api/auth, /api/tenant, /api/menu, /api/pesanan, /api/admin, /api/notifikasi`);
    console.log(`=======================================================`);
});