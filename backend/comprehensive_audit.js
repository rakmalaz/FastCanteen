const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runComprehensiveAudit() {
  console.log('====================================================');
  console.log('🔍 MEMULAI AUDIT LENGKAP BACKEND & DATABASE FASTCANTEEN');
  console.log('====================================================\n');

  // Start the server in-process if not already running
  try {
    require('./server');
    await new Promise((r) => setTimeout(r, 1200));
  } catch (err) {
    console.log('Server process note:', err.message);
  }

  const results = [];

  async function test(name, fn) {
    try {
      const res = await fn();
      console.log(`✅ [PASS] ${name}`);
      results.push({ name, pass: true, detail: res });
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      results.push({ name, pass: false, error: err.message });
    }
  }

  // 1. Health check
  await test('GET /api/health', async () => {
    const r = await request('GET', '/api/health');
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    return r.body.message;
  });

  // 2. Auth Login - Mahasiswa
  let mhsUser;
  await test('POST /api/auth/login (Mahasiswa)', async () => {
    const r = await request('POST', '/api/auth/login', {
      email: 'elka@uinsa.ac.id',
      kata_sandi: '123456',
    });
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    mhsUser = r.body.data;
    return `ID: ${mhsUser.id}, Nama: ${mhsUser.nama}`;
  });

  // 3. Auth Login - Tenant
  let tenantUser;
  await test('POST /api/auth/login (Tenant)', async () => {
    const r = await request('POST', '/api/auth/login', {
      email: 'siti@fastcanteen.com',
      kata_sandi: '123456',
    });
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    tenantUser = r.body.data;
    return `ID: ${tenantUser.id}, Tenant: ${tenantUser.tenant?.nama_tenant}`;
  });

  // 4. Menu: GET /api/menu
  let menus = [];
  await test('GET /api/menu', async () => {
    const r = await request('GET', '/api/menu');
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    menus = r.body.data;
    return `Ditemukan ${menus.length} menu makanan/minuman`;
  });

  // 5. Tenant: GET /api/tenant
  await test('GET /api/tenant', async () => {
    const r = await request('GET', '/api/tenant');
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    return `Ditemukan ${r.body.total} stan kantin`;
  });

  // 6. Buat Pesanan Baru (US-04) tanpa jam_pengambilan
  let newOrderId;
  await test('POST /api/pesanan (Pre-Order Baru V2)', async () => {
    const targetMenu = menus[0];
    const r = await request('POST', '/api/pesanan', {
      id_mahasiswa: mhsUser.id,
      id_tenant: targetMenu.id_tenant,
      metode_pembayaran: 'QRIS',
      // US-07: pembayaran non-tunai wajib melampirkan bukti (di sini PNG 1x1 untuk pengujian)
      bukti_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      bukti_mime: 'image/png',
      catatan: 'Pedas sedang, tolong jangan lama-lama ya',
      items: [{ id_menu: targetMenu.id, jumlah_pesanan: 2 }],
    });
    if (r.status !== 201 || !r.body.success) throw new Error(JSON.stringify(r));
    newOrderId = r.body.data.id_pesanan;
    return `Pesanan #${newOrderId} berhasil dibuat, total: Rp ${r.body.data.total_harga}`;
  });

  // 7. Mahasiswa: GET /api/pesanan/mahasiswa/:id?filter=aktif (US-11)
  await test('GET /api/pesanan/mahasiswa/:id?filter=aktif', async () => {
    const r = await request('GET', `/api/pesanan/mahasiswa/${mhsUser.id}?filter=aktif`);
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    return `Ada ${r.body.total} pesanan aktif`;
  });

  // 8. Tenant: Ubah status pesanan ke 'Diproses' (US-08)
  await test('PUT /api/pesanan/:id/status (Ke "Diproses")', async () => {
    const r = await request('PUT', `/api/pesanan/${newOrderId}/status`, {
      status_pesanan: 'Diproses',
    });
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    return r.body.message;
  });

  // 9. Tenant: Ubah status pesanan ke 'Siap Diambil' (US-08 + Auto Notifikasi US-10)
  await test('PUT /api/pesanan/:id/status (Ke "Siap Diambil")', async () => {
    const r = await request('PUT', `/api/pesanan/${newOrderId}/status`, {
      status_pesanan: 'Siap Diambil',
    });
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    return r.body.message;
  });

  // 10. Tenant: Kirim Notifikasi Custom ke Mahasiswa (Poin 7)
  await test('POST /api/notifikasi (Kirim Pesan Custom dari Tenant)', async () => {
    const r = await request('POST', '/api/notifikasi', {
      id_penerima: mhsUser.id,
      id_pengirim: tenantUser.id,
      id_pesanan: newOrderId,
      judul: 'Pesan dari Bu Siti',
      pesan: 'Halo Kak Elka, krupuk udang tambahan sudah kami siapkan di meja stan ya!',
      tipe: 'info',
    });
    if (r.status !== 201 || !r.body.success) throw new Error(JSON.stringify(r));
    return `Notifikasi #${r.body.data.id} terkirim`;
  });

  // 11. Mahasiswa: Cek notifikasi masuk
  let unreadCount = 0;
  let firstNotifId;
  await test('GET /api/notifikasi/user/:id (Mahasiswa Menerima)', async () => {
    const r = await request('GET', `/api/notifikasi/user/${mhsUser.id}`);
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    unreadCount = r.body.unread_count;
    if (r.body.data.length > 0) firstNotifId = r.body.data[0].id;
    return `Total: ${r.body.total} notifikasi, ${unreadCount} belum dibaca`;
  });

  // 12. Mahasiswa: Tandai satu notifikasi sudah dibaca
  if (firstNotifId) {
    await test('PUT /api/notifikasi/:id/baca', async () => {
      const r = await request('PUT', `/api/notifikasi/${firstNotifId}/baca`);
      if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
      return r.body.message;
    });
  }

  // 13. Mahasiswa: Tandai semua notifikasi sudah dibaca
  await test('PUT /api/notifikasi/user/:id/baca-semua', async () => {
    const r = await request('PUT', `/api/notifikasi/user/${mhsUser.id}/baca-semua`);
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    return r.body.message;
  });

  // 14. Tenant: Selesaikan pesanan (Ke "Selesai")
  await test('PUT /api/pesanan/:id/status (Ke "Selesai")', async () => {
    const r = await request('PUT', `/api/pesanan/${newOrderId}/status`, {
      status_pesanan: 'Selesai',
    });
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    return r.body.message;
  });

  // 15. Mahasiswa: GET /api/pesanan/mahasiswa/:id?filter=riwayat (US-11)
  await test('GET /api/pesanan/mahasiswa/:id?filter=riwayat', async () => {
    const r = await request('GET', `/api/pesanan/mahasiswa/${mhsUser.id}?filter=riwayat`);
    if (r.status !== 200 || !r.body.success) throw new Error(JSON.stringify(r));
    return `Ada ${r.body.total} riwayat pesanan (termasuk pesanan #${newOrderId})`;
  });

  console.log('\n====================================================');
  const allPass = results.every((r) => r.pass);
  if (allPass) {
    console.log(`🎉 SEMUA ${results.length} PENGUJIAN API BERHASIL 100%!`);
  } else {
    console.log(`⚠️ ADA PENGUJIAN YANG GAGAL!`);
  }
  console.log('====================================================');

  process.exit(allPass ? 0 : 1);
}

runComprehensiveAudit();