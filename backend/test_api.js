const http = require('http');

async function testBackend() {
    // 1. Start server locally in script
    require('./server');

    // Wait 1.5s for server to listen
    await new Promise(r => setTimeout(r, 1500));

    async function get(url) {
        return new Promise((resolve, reject) => {
            http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });
    }

    try {
        console.log('🧪 Testing GET /api/health ...');
        const health = await get('http://localhost:5000/api/health');
        console.log('Health:', health.message);

        console.log('🧪 Testing GET /api/notifikasi/user/1 ...');
        const notif = await get('http://localhost:5000/api/notifikasi/user/1');
        console.log('Notif count:', notif.total, 'unread:', notif.unread_count);

        console.log('🧪 Testing GET /api/pesanan/mahasiswa/1?filter=aktif ...');
        const pesananAktif = await get('http://localhost:5000/api/pesanan/mahasiswa/1?filter=aktif');
        console.log('Pesanan aktif:', pesananAktif.total);

        console.log('🧪 Testing GET /api/pesanan/mahasiswa/1?filter=riwayat ...');
        const pesananRiwayat = await get('http://localhost:5000/api/pesanan/mahasiswa/1?filter=riwayat');
        console.log('Pesanan riwayat:', pesananRiwayat.total);

        console.log('✅ SEMUA PENGUJIAN BACKEND ENDPOINT BERHASIL!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Gagal menguji backend:', e);
        process.exit(1);
    }
}

testBackend();

