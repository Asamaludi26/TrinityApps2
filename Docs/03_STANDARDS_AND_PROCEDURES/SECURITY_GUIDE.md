
### 4.2. Database Security
*   **SQL Injection**: Penggunaan **Prisma ORM** secara otomatis memitigasi risiko SQL Injection karena penggunaan *parameterized queries* di level engine. Hindari penggunaan `$queryRaw` dengan string concatenation manual.
*   **Database User Isolation**: User database yang digunakan aplikasi (`triniti_admin`) sebaiknya hanya memiliki hak akses `CRUD` pada tabel aplikasi, bukan `SUPERUSER`.
*   **Backup Encryption**: File backup `.sql.gz` harus dienkripsi (misal menggunakan GPG) sebelum ditransfer keluar server (ke Cloud Storage) untuk mencegah kebocoran data jika backup dicuri.

## 5. Audit Keamanan Autentikasi (Fitur Login & Reset)

Bagian ini mendokumentasikan mekanisme keamanan yang diterapkan pada modul autentikasi (Update v1.2).

### 5.1. Rate Limiting (Client-Side & Server-Side)
Untuk mencegah serangan *Brute Force* pada halaman login:

1.  **Client-Side (UX Layer - Sudah Diimplementasikan)**:
    *   **Logika**: Jika user gagal login 3x berturut-turut, tombol login dikunci selama 30 detik.
    *   **Tujuan**: Mencegah spam klik manual dan memberikan umpan balik visual ke pengguna.
    *   **Limitasi**: Dapat di-bypass dengan refresh browser.
2.  **Server-Side (Security Layer - Wajib Implementasi Backend)**:
    *   **Wajib**: Backend harus menggunakan `ThrottlerGuard` (NestJS) pada endpoint `/auth/login`.
    *   **Config**: Max 5 request per menit per IP Address.

### 5.2. Alur Reset Password (Admin-Assisted)
Aplikasi menggunakan metode *Admin-Assisted Reset* untuk keamanan maksimal di lingkungan korporat.

*   **User Enumeration Protection**: Saat user melakukan "Lupa Password", sistem memberikan pesan generik ("Jika email terdaftar, instruksi dikirim...") baik email ditemukan atau tidak. Ini mencegah penyerang memindai daftar email karyawan.
*   **Flagging Pattern**: Tidak ada token reset yang dikirim ke email user (menghindari risiko email hijacking). Sebaliknya, akun ditandai (`passwordResetRequested = true`) di database.
*   **Secure Temporary Password**: Password sementara yang dibuat oleh Admin harus:
    *   Dihasilkan menggunakan *Cryptographically Secure Pseudo-Random Number Generator* (CSPRNG), bukan `Math.random()`.
    *   Minimal 10 karakter, kombinasi alfanumerik.
    *   Ditampilkan **hanya sekali** kepada Admin.

### 5.3. Checklist Integrasi Backend
Backend Developer wajib memastikan poin berikut saat mengimplementasikan fitur ini:
- [ ] Kolom `passwordResetRequested` (Boolean) dan `passwordResetRequestDate` (DateTime) ada di tabel `User`.
- [ ] Endpoint `POST /auth/forgot-password` hanya mengubah flag tersebut, tidak mengirim email berisi link reset.
- [ ] Endpoint `PATCH /users/:id` otomatis menghapus flag `passwordResetRequested` saat password diubah.
