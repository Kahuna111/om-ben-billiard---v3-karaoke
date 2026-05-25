# Daftar Tugas Implementasi

- [x] Modifikasi `frontend/taskbar.js`
  - [x] Hapus pembatasan `window.electronAPI` di baris awal.
  - [x] Tambahkan tombol gembok (`#taskbar-lock-btn`) dan sembunyikan tombol keluar (`#taskbar-exit-btn`).
  - [x] Tambahkan safeguard pada fungsi WiFi agar tidak error jika tidak di Electron.
  - [x] Sembunyikan tombol WiFi (`#taskbar-wifi-btn`) jika tidak di Electron.
  - [x] Implementasikan logika reload fallback menggunakan `window.location.reload()`.
  - [x] Implementasikan logika toggle lock/unlock tombol keluar.
  - [x] Sederhanakan modal keluar (tanpa input password) dan tambahkan fallback logout untuk non-Electron.
- [x] Modifikasi root `taskbar.js` dengan perubahan yang sama untuk sinkronisasi.
- [x] Modifikasi `frontend/taskbar.css`
  - [x] Tambahkan style untuk `#taskbar-lock-btn`.
- [x] Modifikasi root `taskbar.css` dengan perubahan yang sama.
- [x] Modifikasi `frontend/login.html`
  - [x] Bungkus input password dan tambahkan tombol mata (`👁️`).
  - [x] Tambahkan logika JS untuk men-toggle tipe password.
- [x] Pengujian manual dan verifikasi perubahan.
