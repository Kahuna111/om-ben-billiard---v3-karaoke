
(function () {
  // Don't inject if already present
  if (document.getElementById('electron-taskbar')) return;

  // Add electron-app class to body for CSS padding
  document.body.classList.add('electron-app');

  // State
  let selectedWifiSSID = null;
  let currentWifi = null;
  let isScanning = false;
  let isUnlocked = false;
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // ===== BUILD TASKBAR HTML =====
  const taskbar = document.createElement('div');
  taskbar.id = 'electron-taskbar';
  taskbar.innerHTML = `
    <!-- LEFT: App Info -->
    <div class="taskbar-left">
      <img src="/assets/Logo Baru.jpeg" class="taskbar-logo" alt="Logo">
      <div class="taskbar-app-name">
        <span class="app-title">Om Ben Billiard</span>
        <span class="app-subtitle">POS System • V3 Karaoke</span>
      </div>
      <div class="taskbar-status-dot" id="taskbar-status-dot" title="Status koneksi server"></div>
    </div>

    <!-- CENTER: Clock -->
    <div class="taskbar-center">
      <div class="taskbar-clock" id="taskbar-clock">--:--:--</div>
      <div class="taskbar-date" id="taskbar-date">Memuat...</div>
    </div>

    <!-- RIGHT: Action Buttons -->
    <div class="taskbar-right">
      <button class="taskbar-btn wifi-btn" id="taskbar-wifi-btn" title="Pengaturan WiFi" style="${isElectron ? '' : 'display: none;'}">
        <span class="btn-icon">📶</span>
        <span class="btn-text" id="taskbar-wifi-label">WiFi</span>
      </button>
      <button class="taskbar-btn reload-btn" id="taskbar-reload-btn" title="Muat Ulang Halaman">
        <span class="btn-icon">🔄</span>
        <span class="btn-text">Reload</span>
      </button>
      <button class="taskbar-btn lock-btn" id="taskbar-lock-btn" title="Buka Kunci Keluar">
        <span class="btn-icon" id="taskbar-lock-icon">🔒</span>
        <span class="btn-text" id="taskbar-lock-text">Lock</span>
      </button>
      <button class="taskbar-btn exit-btn" id="taskbar-exit-btn" title="Keluar dari Aplikasi" style="display: none;">
        <span class="btn-icon">⏻</span>
        <span class="btn-text">Keluar</span>
      </button>
    </div>
  `;

  // ===== BUILD WIFI MODAL =====
  const wifiOverlay = document.createElement('div');
  wifiOverlay.className = 'wifi-modal-overlay';
  wifiOverlay.id = 'wifi-modal-overlay';
  wifiOverlay.innerHTML = `
    <div class="wifi-modal">
      <div class="wifi-modal-header">
        <h3>📶 Pengaturan WiFi</h3>
        <button class="wifi-close-btn" id="wifi-close-btn">✕</button>
      </div>

      <div class="wifi-current" id="wifi-current-section">
        <span class="wifi-current-icon">📡</span>
        <div class="wifi-current-info">
          <div class="wifi-current-label">Terhubung ke</div>
          <div class="wifi-current-ssid" id="wifi-current-ssid">Memindai...</div>
        </div>
      </div>

      <div class="wifi-network-list" id="wifi-network-list">
        <div class="wifi-scanning">
          <div class="spinner"></div>
          <div>Memindai jaringan WiFi...</div>
        </div>
      </div>

      <div class="wifi-password-section" id="wifi-password-section">
        <label id="wifi-password-label">Password untuk: —</label>
        <div class="wifi-password-input-row">
          <input type="password" id="wifi-password-input" placeholder="Masukkan password WiFi...">
          <button class="wifi-connect-btn" id="wifi-connect-btn">Hubungkan</button>
        </div>
      </div>

      <div class="wifi-modal-footer">
        <button class="wifi-scan-btn" id="wifi-rescan-btn">🔍 Pindai Ulang</button>
        <span style="color: rgba(160,190,220,0.3); font-size: 0.65rem;">Windows WiFi Manager</span>
      </div>
    </div>
  `;

  // ===== BUILD EXIT MODAL =====
  const exitOverlay = document.createElement('div');
  exitOverlay.className = 'exit-modal-overlay';
  exitOverlay.id = 'exit-modal-overlay';
  exitOverlay.innerHTML = `
    <div class="exit-modal">
      <div class="exit-icon">⏻</div>
      <h3>Keluar dari Aplikasi?</h3>
      <p>Apakah Anda yakin ingin menutup aplikasi dan keluar dari sistem?</p>
      <div class="exit-modal-actions">
        <button class="exit-cancel-btn" id="exit-cancel-btn">Batal</button>
        <button class="exit-confirm-btn" id="exit-confirm-btn">Keluar Aplikasi</button>
      </div>
    </div>
  `;

  // ===== INJECT INTO PAGE =====
  document.body.appendChild(taskbar);
  document.body.appendChild(wifiOverlay);
  document.body.appendChild(exitOverlay);

  // ===== CLOCK =====
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');

    document.getElementById('taskbar-clock').textContent = `${h} : ${m} : ${s}`;
    document.getElementById('taskbar-date').textContent =
      `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ===== SERVER STATUS CHECK =====
  async function checkServerStatus() {
    const dot = document.getElementById('taskbar-status-dot');
    try {
      const res = await fetch('/api/time');
      if (res.ok) {
        dot.classList.remove('offline');
        dot.title = 'Server terhubung';
      } else {
        dot.classList.add('offline');
        dot.title = 'Server tidak merespon';
      }
    } catch (e) {
      dot.classList.add('offline');
      dot.title = 'Server tidak terhubung';
    }
  }
  checkServerStatus();
  setInterval(checkServerStatus, 10000);

  // ===== WIFI FUNCTIONS =====
  function getSignalIcon(signal) {
    if (signal >= 75) return '📶';
    if (signal >= 50) return '📶';
    if (signal >= 25) return '📡';
    return '📡';
  }

  function getSignalBars(signal) {
    const bars = [
      signal >= 10,
      signal >= 35,
      signal >= 60,
      signal >= 80
    ];
    return `<div class="wifi-signal-bar">
      ${bars.map(active => `<span class="${active ? 'active' : ''}"></span>`).join('')}
    </div>`;
  }

  async function updateCurrentWifi() {
    try {
      if (!isElectron) return;
      currentWifi = await window.electronAPI.getCurrentWifi();
      const ssidEl = document.getElementById('wifi-current-ssid');
      const wifiLabel = document.getElementById('taskbar-wifi-label');
      const wifiBtn = document.getElementById('taskbar-wifi-btn');

      if (currentWifi && currentWifi.ssid) {
        ssidEl.textContent = currentWifi.ssid;
        ssidEl.classList.remove('disconnected');
        wifiLabel.textContent = currentWifi.ssid;
        wifiBtn.classList.add('connected');
      } else {
        ssidEl.textContent = 'Tidak terhubung';
        ssidEl.classList.add('disconnected');
        wifiLabel.textContent = 'WiFi';
        wifiBtn.classList.remove('connected');
      }
    } catch (e) {
      console.error('Failed to get current WiFi:', e);
    }
  }

  async function scanWifiNetworks() {
    const listEl = document.getElementById('wifi-network-list');
    if (isScanning) return;
    if (!isElectron) return;
    isScanning = true;

    listEl.innerHTML = `<div class="wifi-scanning"><div class="spinner"></div><div>Memindai jaringan WiFi...</div></div>`;

    try {
      await updateCurrentWifi();
      const networks = await window.electronAPI.scanWifi();

      if (networks.length === 0) {
        listEl.innerHTML = `<div class="wifi-scanning"><div>Tidak ada jaringan WiFi ditemukan.</div></div>`;
        isScanning = false;
        return;
      }

      listEl.innerHTML = '';
      networks.forEach(net => {
        const isActive = currentWifi && currentWifi.ssid === net.ssid;
        const isSecure = net.security && net.security !== 'Open' && net.security !== 'Terbuka';

        const item = document.createElement('div');
        item.className = `wifi-network-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
          <span class="wifi-signal-icon">${getSignalIcon(net.signal)}</span>
          <div class="wifi-network-info">
            <div class="wifi-network-name">${net.ssid} ${isActive ? '<span style="color:#2ecc71;font-size:0.7rem;">● Terhubung</span>' : ''}</div>
            <div class="wifi-network-detail">${net.security} • Sinyal: ${net.signal}%</div>
          </div>
          ${getSignalBars(net.signal)}
          ${isSecure ? '<span class="wifi-lock-icon">🔒</span>' : ''}
        `;

        item.addEventListener('click', () => {
          if (isActive) return;
          selectedWifiSSID = net.ssid;

          // Remove active highlight from others
          document.querySelectorAll('.wifi-network-item').forEach(el => el.style.borderColor = '');
          item.style.borderColor = 'rgba(0,200,255,0.3)';

          // Show password section
          if (isSecure) {
            const pwSection = document.getElementById('wifi-password-section');
            pwSection.classList.add('active');
            document.getElementById('wifi-password-label').textContent = `Password untuk: ${net.ssid}`;
            document.getElementById('wifi-password-input').value = '';
            document.getElementById('wifi-password-input').focus();
          } else {
            // Connect without password
            connectToWifi(net.ssid, '');
          }
        });

        listEl.appendChild(item);
      });
    } catch (e) {
      listEl.innerHTML = `<div class="wifi-scanning"><div>Gagal memindai: ${e.message}</div></div>`;
    }
    isScanning = false;
  }

  async function connectToWifi(ssid, password) {
    if (!isElectron) return;
    const listEl = document.getElementById('wifi-network-list');
    const pwSection = document.getElementById('wifi-password-section');

    listEl.innerHTML = `<div class="wifi-scanning"><div class="spinner"></div><div>Menghubungkan ke ${ssid}...</div></div>`;
    pwSection.classList.remove('active');

    try {
      const result = await window.electronAPI.connectWifi(ssid, password);
      if (result.success) {
        // Wait for connection to establish
        setTimeout(async () => {
          await updateCurrentWifi();
          await scanWifiNetworks();
        }, 2000);
      } else {
        listEl.innerHTML = `<div class="wifi-scanning"><div>❌ Gagal: ${result.message}</div></div>`;
        setTimeout(() => scanWifiNetworks(), 2000);
      }
    } catch (e) {
      listEl.innerHTML = `<div class="wifi-scanning"><div>❌ Error: ${e.message}</div></div>`;
      setTimeout(() => scanWifiNetworks(), 2000);
    }
  }

  // ===== EVENT LISTENERS =====

  // WiFi button
  document.getElementById('taskbar-wifi-btn').addEventListener('click', () => {
    document.getElementById('wifi-modal-overlay').classList.add('active');
    scanWifiNetworks();
  });

  document.getElementById('wifi-close-btn').addEventListener('click', () => {
    document.getElementById('wifi-modal-overlay').classList.remove('active');
    document.getElementById('wifi-password-section').classList.remove('active');
  });

  document.getElementById('wifi-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('wifi-modal-overlay').classList.remove('active');
      document.getElementById('wifi-password-section').classList.remove('active');
    }
  });

  document.getElementById('wifi-rescan-btn').addEventListener('click', () => {
    scanWifiNetworks();
  });

  document.getElementById('wifi-connect-btn').addEventListener('click', () => {
    const password = document.getElementById('wifi-password-input').value;
    if (selectedWifiSSID) {
      connectToWifi(selectedWifiSSID, password);
    }
  });

  document.getElementById('wifi-password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const password = document.getElementById('wifi-password-input').value;
      if (selectedWifiSSID) {
        connectToWifi(selectedWifiSSID, password);
      }
    }
  });

  // Reload button
  document.getElementById('taskbar-reload-btn').addEventListener('click', () => {
    if (isElectron) {
      window.electronAPI.reloadApp();
    } else {
      window.location.reload();
    }
  });

  // Lock button
  document.getElementById('taskbar-lock-btn').addEventListener('click', () => {
    isUnlocked = !isUnlocked;
    const lockBtn = document.getElementById('taskbar-lock-btn');
    const lockIcon = document.getElementById('taskbar-lock-icon');
    const lockText = document.getElementById('taskbar-lock-text');
    const exitBtn = document.getElementById('taskbar-exit-btn');

    if (isUnlocked) {
      lockBtn.classList.add('unlocked');
      lockIcon.textContent = '🔓';
      lockText.textContent = 'Unlock';
      exitBtn.style.display = 'flex';
    } else {
      lockBtn.classList.remove('unlocked');
      lockIcon.textContent = '🔒';
      lockText.textContent = 'Lock';
      exitBtn.style.display = 'none';
    }
  });

  // Exit button
  document.getElementById('taskbar-exit-btn').addEventListener('click', () => {
    document.getElementById('exit-modal-overlay').classList.add('active');
  });

  document.getElementById('exit-cancel-btn').addEventListener('click', () => {
    document.getElementById('exit-modal-overlay').classList.remove('active');
  });

  document.getElementById('exit-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('exit-modal-overlay').classList.remove('active');
    }
  });

  document.getElementById('exit-confirm-btn').addEventListener('click', () => {
    if (isElectron) {
      window.electronAPI.exitApp();
    } else {
      localStorage.clear();
      window.location.href = '/login.html';
    }
  });

  // Initial WiFi status update
  if (isElectron) {
    updateCurrentWifi();
    setInterval(updateCurrentWifi, 15000);
  }

  console.log('[Taskbar] Om Ben Billiard taskbar loaded successfully.');
})();
