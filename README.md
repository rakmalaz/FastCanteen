# FastCanteen 🍛📱
**Aplikasi Mobile Pre-Order Makanan Kantin Kampus untuk Efisiensi Waktu Istirahat Mahasiswa**  
Tugas PjBL Tahap 2 · SIF125113 Pemrograman Mobile · UIN Sunan Ampel Surabaya (Kampus 2)

**Kelompok 3 (Kelas H6C.3):**
1. Rayhan Akmal Azhari (09020625073) - Ketua
2. Putra Mahardhika Surasa (09040625094) - Anggota
3. Elka Putra Prasetiyo (09010625007) - Anggota
4. Rizki Ridhwan Arif S. (09030625107) - Anggota

---

## 🛠️ Tech Stack
- **Frontend Mobile:** React Native (Expo SDK 57), React Navigation Native Stack, Axios.
- **Backend API:** Node.js, Express.js, MySQL (`mysql2` pool & async/await), CORS, Dotenv.
- **Database:** MySQL (`fastcanteen_db`).

---

## 🚀 Panduan Menjalankan Proyek

### 1. Persiapan Database MySQL
1. Buka XAMPP / MySQL server Anda.
2. Buat database baru bernama `fastcanteen_db`.
3. Import file `backend/fastcanteen_db.sql` atau jalankan perintah seed:
   ```bash
   cd backend
   npm install
   node seed.js
   ```

### 2. Menjalankan Backend API
```bash
cd backend
npm install
npm run dev
# Server aktif di http://localhost:5000 (API: /api)
```

### 3. Menjalankan Frontend Mobile (Expo)
```bash
cd frontend
npm install
npx expo start -c
```
- Buka aplikasi **Expo Go** di Android / iOS dan scan QR code.
- Atau tekan tombol `a` di terminal untuk membuka langsung di **Android Emulator**.

---

## 🔑 Akun Uji Coba Cepat (Demo)
Pada layar Login tersedia tombol otomatis untuk mencoba 3 peran (Super Admin, Tenant, Mahasiswa):
- **Akun Mahasiswa (Demo):** `mahasiswa@uinsa.ac.id` (atau NIM: `09010625088`) | Kata Sandi: `123456`
- **Akun Mahasiswi:** `aisyah@uinsa.ac.id` (atau NIM: `09020625055`) | Kata Sandi: `123456`
- **Akun Tenant (Kantin Bu Siti):** `siti@fastcanteen.com` | Kata Sandi: `123456`
- **Akun Super Admin UINSA:** `elka@uinsa.ac.id` / `rayhan@uinsa.ac.id` / `putra@uinsa.ac.id` / `rizki@uinsa.ac.id` | Kata Sandi: `123456`
