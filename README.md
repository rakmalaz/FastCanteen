# FastCanteen 🍛📱
**Aplikasi Mobile Pre-Order Makanan Kantin Kampus untuk Efisiensi Waktu Istirahat Mahasiswa**  
Tugas PjBL Tahap 2 · SIF125113 Pemrograman Mobile · UIN Sunan Ampel Surabaya (Kampus 2)

**Kelompok 3 (Kelas H6C.3):**
1. **Rayhan Akmal Azhari** (09020625073) - Ketua
2. **Putra Mahardhika Surasa** (09040625094) - Anggota
3. **Elka Putra Prasetiyo** (09010625007) - Anggota
4. **Rizki Ridhwan Arif S.** (09030625107) - Anggota

**Tautan Repositori GitHub:** [https://github.com/rakmalaz/FastCanteen.git](https://github.com/rakmalaz/FastCanteen.git)

---

## 📖 Deskripsi Proyek
FastCanteen adalah solusi aplikasi mobile pre-order makanan kantin kampus yang dirancang khusus untuk mengatasi masalah antrean panjang saat jam istirahat kuliah yang singkat (15–25 menit). Mahasiswa dapat memesan makanan secara jarak jauh dari ruang kelas/perpustakaan, melakukan pembayaran digital (QRIS), dan memantau status pembuatan makanan secara *real-time* hingga makanan siap diambil di stan kantin tanpa perlu mengantre di kasir.

Aplikasi ini mencakup 3 peran pengguna (*multi-role*):
1. **Mahasiswa:** Jelajah menu stan kantin, buat pre-order makanan, bayar digital, lacak status tahapan masak, dan terima notifikasi langsung saat makanan siap diambil.
2. **Tenant (Pengelola Stan Kantin):** Dashboard pesanan masuk, pembaruan status masak (*Menunggu* ➔ *Diproses* ➔ *Siap Diambil* ➔ *Selesai* / *Dibatalkan*), kelola ketersediaan menu/stok, dan kirim notifikasi kustom langsung ke pembeli.
3. **Super Admin Kantin:** Manajemen tenant stan, ringkasan transaksi & keuangan kantin, serta rekam jejak pengguna.

---

## 🛠️ Arsitektur & Tech Stack
- **Frontend Mobile:** React Native (Expo SDK 57), React Navigation Native Stack, Axios.
- **Backend API:** Node.js, Express.js, MySQL (`mysql2` Connection Pool & async/await), CORS, Dotenv.
- **Database:** MySQL (`fastcanteen_db` v2) lengkap dengan pemisahan status pembayaran & pemesanan serta sistem notifikasi in-app.
- **Desain Sistem:** Palet warna hijau identitas kampus UINSA (`#00442A`, `#1F5C3F`), aksen oranye (`#FEA619`), dan latar krem natural (`#FAFAF4`).

---

## 🗄️ Skema Database (MySQL `fastcanteen_db` v2)
1. **`pengguna`**: `id` (PK), `nama`, `nim`, `email` (unik), `kata_sandi`, `peran` (`mahasiswa`, `tenant`, `admin`), `no_hp`.
2. **`tenant`**: `id` (PK), `nama_tenant`, `lokasi_stan`, `id_admin_pendaftar` (FK ke `pengguna.id`).
3. **`menu`**: `id` (PK), `id_tenant` (FK ke `tenant.id`), `nama_menu`, `harga` (DECIMAL), `foto`, `status_tersedia` (`tersedia`, `habis`).
4. **`pesanan`**:
   - `id` (PK)
   - `id_mahasiswa` (FK ke `pengguna.id`)
   - `id_tenant` (FK ke `tenant.id`)
   - `total_harga` (DECIMAL)
   - `metode_pembayaran` (`QRIS`, `Tunai`, dll.)
   - `status_pembayaran` (`ENUM`: `'Belum Dibayar'`, `'Sudah Dibayar'`, `'Dikembalikan'`)
   - `status_pesanan` (`ENUM`: `'Menunggu'`, `'Diproses'`, `'Siap Diambil'`, `'Selesai'`, `'Dibatalkan'`)
   - `bukti_pembayaran`, `catatan`, `waktu_transaksi`, `waktu_perubahan_status`.
5. **`detail_pesanan`**: `id_detail` (PK), `id_pesanan` (FK), `id_menu` (FK), `jumlah_pesanan`, `sub_harga`.
6. **`notifikasi`**: `id` (PK), `id_penerima` (FK), `id_pengirim` (FK), `id_pesanan` (FK), `judul`, `pesan`, `tipe`, `is_read`, `created_at`.

---

## 🚀 Panduan Menjalankan Proyek

### 1. Persiapan Database MySQL
1. Pastikan service MySQL (XAMPP / MySQL Server) telah aktif.
2. Import skema database v2 dan data awal:
   ```bash
   cd backend
   npm install
   node migrate.js
   ```
   *(Atau jalankan `node seed.js` untuk mereset dan mengisi ulang data pengujian).*

### 2. Menjalankan Backend API Server
```bash
cd backend
npm start
# Server berjalan di http://localhost:5000 (API Base URL: /api)
```

### 3. Menjalankan Frontend Mobile (Expo)
```bash
cd frontend
npm install
npx expo start -c
```
- **Di HP Fisik:** Buka aplikasi **Expo Go** (Android/iOS) dan pindai (*scan*) QR Code yang tampil di terminal. Pastikan HP dan laptop terhubung ke jaringan Wi-Fi yang sama.
- **Di Android Emulator:** Tekan tombol `a` pada terminal Expo.
- **Di Web Browser:** Tekan tombol `w` pada terminal Expo.

---

## 🔐 Kredensial Akun untuk Pengujian Sistem

| Peran (Role) | Email / Akun | Kata Sandi | Keterangan |
| :--- | :--- | :--- | :--- |
| **Mahasiswa** | `elka@uinsa.ac.id` | `123456` | Mahasiswa UINSA (NIM: 09010625007) |
| **Mahasiswa** | `rayhan@uinsa.ac.id` | `123456` | Mahasiswa UINSA (NIM: 09020625073) |
| **Mahasiswa** | `mahasiswa@uinsa.ac.id` | `123456` | Akun Mahasiswa Reguler |
| **Tenant** | `siti@fastcanteen.com` | `123456` | Pengelola Stan Mbak Siti (Stan 01) |
| **Tenant** | `slamet@fastcanteen.com` | `123456` | Pengelola Stan Berkah Cak Slamet (Stan 02) |
| **Tenant** | `barokah@fastcanteen.com` | `123456` | Pengelola Kedai Barokah (Stan 03) |
| **Super Admin** | `admin@fastcanteen.com` | `123456` | Akun Super Admin FastCanteen |

---

## 📡 Daftar Endpoint API Utama

### Autentikasi (`/api/auth`)
- `POST /api/auth/register` : Registrasi akun mahasiswa baru.
- `POST /api/auth/login` : Masuk akun (Mahasiswa, Tenant, atau Super Admin).

### Menu & Stan Kantin (`/api/menu`, `/api/tenant`)
- `GET /api/menu` : Mengambil seluruh daftar menu makanan & minuman.
- `GET /api/tenant` : Mengambil daftar seluruh stan kantin aktif.
- `POST /api/menu` : Menambahkan menu baru oleh tenant (US-09).
- `PATCH /api/menu/:id/status` : Mengubah ketersediaan stok menu (*tersedia* / *habis*).

### Transaksi & Pesanan (`/api/pesanan`)
- `POST /api/pesanan` : Membuat pre-order baru (US-04).
- `GET /api/pesanan/mahasiswa/:id?filter=aktif` : Mengambil pesanan aktif mahasiswa (*Menunggu*, *Diproses*, *Siap Diambil* - US-11).
- `GET /api/pesanan/mahasiswa/:id?filter=riwayat` : Mengambil riwayat transaksi mahasiswa (*Selesai*, *Dibatalkan* - US-11).
- `GET /api/pesanan/tenant/:id_tenant` : Daftar antrean pesanan masuk pada stan tenant (US-05).
- `PUT /api/pesanan/:id/status` : Memperbarui status pesanan & otomatis memicu notifikasi (US-08, US-10).
- `PUT /api/pesanan/:id/status-pembayaran` : Memperbarui status verifikasi pembayaran.

### Sistem Notifikasi (`/api/notifikasi`)
- `GET /api/notifikasi/user/:id_user` : Mengambil daftar notifikasi milik pengguna beserta jumlah belum dibaca.
- `PUT /api/notifikasi/:id/baca` : Menandai satu notifikasi telah dibaca.
- `PUT /api/notifikasi/user/:id_user/baca-semua` : Menandai semua notifikasi pengguna telah dibaca.
- `POST /api/notifikasi` : Mengirim notifikasi kustom langsung ke pengguna.
