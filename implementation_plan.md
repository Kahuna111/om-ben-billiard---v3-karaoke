# Rencana Implementasi: Penguncian Tombol Keluar dengan Ikon Lock & Fitur Show Password Login

Rencana ini bertujuan untuk:
1. Mengganti sistem password pada modal keluar dengan tombol kunci (`lock-btn`) di taskbar. Tombol keluar (`exit-btn`) akan disembunyikan secara default, dan baru muncul setelah tombol gembok (`🔒`) diklik/dibuka.
2. Menambahkan fitur "Show Password" (tampilkan password) di halaman login (`login.html`) menggunakan tombol ikon mata (`👁️`).
3. Menjamin taskbar berjalan stabil di browser biasa maupun APK (non-Electron) dengan menyembunyikan opsi WiFi dan mendukung fallback reload/logout.

## Perubahan yang Diusulkan

### 1. Komponen Taskbar (Desktop/APK/Browser)

#### [MODIFY] [taskbar.js (frontend)](file:///f:/vini%20vidi%20vici%20billiard/frontend/taskbar.js) dan [taskbar.js (root)](file:///f:/vini%20vidi%20vici%20billiard/taskbar.js)
- **Struktur HTML Taskbar:**
  - Tambahkan tombol kunci gembok `#taskbar-lock-btn` dengan ikon gembok `🔒`.
  - Atur tombol keluar `#taskbar-exit-btn` agar tersembunyi secara default (`style="display: none;"`).
  - Hapus pembatasan `if (!window.electronAPI) return;` di awal file agar taskbar tetap ter-injeksi di APK/browser.
- **Logika Lock/Unlock:**
  - Ketika `#taskbar-lock-btn` diklik, lakukan toggle status kunci:
    - Jika terkunci (`🔒`): Ubah ikon menjadi terbuka (`🔓`), ubah teks tombol menjadi "Unlock", dan tampilkan `#taskbar-exit-btn`.
    - Jika terbuka (`🔓`): Ubah ikon menjadi terkunci (`🔒`), ubah teks tombol menjadi "Lock", dan sembunyikan kembali `#taskbar-exit-btn`.
- **Logika WiFi Safeguard & Fallback Reload:**
  - Sembunyikan tombol WiFi `#taskbar-wifi-btn` jika tidak berada di lingkungan Electron.
  - Berikan pengaman agar fungsi WiFi tidak melempar error di browser/APK.
  - Untuk tombol reload, jika berada di luar Electron, gunakan fallback `window.location.reload()`.
- **Exit Modal:**
  - Gunakan modal konfirmasi keluar sederhana tanpa input password. Jika verifikasi di luar Electron, hapus otentikasi local storage dan arahkan ke `/login.html` (sebagai logout).

#### [MODIFY] [taskbar.css (frontend)](file:///f:/vini%20vidi%20vici%20billiard/frontend/taskbar.css) dan [taskbar.css (root)](file:///f:/vini%20vidi%20vici%20billiard/taskbar.css)
- Tambahkan style premium untuk `.taskbar-btn.lock-btn` agar harmonis dengan reload dan wifi buttons.

---

### 2. Komponen Login

#### [MODIFY] [login.html (frontend)](file:///f:/vini%20vidi%20vici%20billiard/frontend/login.html)
- Bungkus input `#password` dalam container dengan `position: relative; display: flex; align-items: center;`.
- Tambahkan tombol `#toggle-password-btn` bermata `👁️` di dalam container tersebut dengan styling absolute.
- Tambahkan JavaScript event listener untuk men-toggle atribut `type` input antara `"password"` dan `"text"`, serta mengubah ikon menjadi `🙈` / `👁️`.

## Rencana Verifikasi

### Pengujian Manual
1. **Verifikasi Taskbar di Browser/APK:**
   - Buka aplikasi. Tombol WiFi disembunyikan (karena di luar Electron). Tombol Reload dan Lock terlihat.
   - Tombol Keluar (`exit-btn`) tidak terlihat pada kondisi awal.
   - Klik tombol **Lock** (`🔒`). Pastikan ikonnya berubah menjadi terbuka (`🔓`) dan tombol **Keluar** muncul di sebelahnya.
   - Klik tombol **Keluar**. Pastikan modal konfirmasi muncul. Batalkan, lalu klik tombol **Lock** lagi untuk menyembunyikannya kembali.
   - Klik **Keluar** dan konfirmasi. Di browser/APK, pastikan diarahkan ke `/login.html`.
2. **Verifikasi Show Password di Login:**
   - Buka halaman login.
   - Masukkan teks pada field password. Klik ikon `👁️` dan pastikan password terlihat jelas.
   - Klik ikon `🙈` dan pastikan password disembunyikan kembali.
