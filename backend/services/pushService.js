const db = require('../config/db');

// Alamat layanan push milik Expo (bisa diganti lewat .env untuk pengujian)
const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send';
const TOKEN_REGEX = /^Expo(nent)?PushToken\[[^\]\s]+\]$/;

// Cek format token dari aplikasi, contoh: ExponentPushToken[xxxxxxxx]
const tokenValid = (t) => typeof t === 'string' && t.length <= 255 && TOKEN_REGEX.test(t);

// Mengirim ke Expo Push Service. Mengembalikan daftar "tiket" (satu per token).
async function kirimExpoPush(daftarToken, pesan) {
  const messages = daftarToken.map((to) => ({
    to,
    sound: 'default',
    channelId: 'default',
    title: pesan.title || 'FastCanteen',
    body: pesan.body || '',
    data: pesan.data || {},
  }));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Expo Push Service membalas ${res.status}`);
    return Array.isArray(json.data) ? json.data : [];
  } finally {
    clearTimeout(timer);
  }
}

// Kirim push ke SEMUA perangkat milik satu pengguna.
// TIDAK PERNAH melempar error: gagal kirim push tidak boleh menggagalkan pesanan.
async function kirimPushKeUser(idUser, pesan) {
  try {
    const [rows] = await db.query(
      'SELECT expo_push_token FROM push_tokens WHERE user_id = ? ORDER BY diperbarui_pada DESC',
      [idUser]
    );
    if (rows.length === 0) return { terkirim: 0, tiket: [], alasan: 'belum_ada_token' };

    const tokens = rows.map((r) => r.expo_push_token);
    const tiket = await kirimExpoPush(tokens, pesan);

    // Buang token perangkat yang sudah tidak aktif (aplikasi dihapus, dll.)
    const mati = [];
    tiket.forEach((t, i) => {
      if (t && t.status === 'error' && t.details && t.details.error === 'DeviceNotRegistered') {
        mati.push(tokens[i]);
      }
    });
    if (mati.length > 0) {
      await db.query('DELETE FROM push_tokens WHERE expo_push_token IN (?)', [mati]);
    }

    return { terkirim: tiket.filter((t) => t && t.status === 'ok').length, tiket };
  } catch (err) {
    console.warn('⚠️ Push notification gagal dikirim (non-fatal):', err.message);
    return { terkirim: 0, tiket: [], error: err.message };
  }
}

module.exports = { tokenValid, kirimExpoPush, kirimPushKeUser };