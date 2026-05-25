// Redirect from file:// to localhost:3001 server
if (window.location.protocol === 'file:') {
  const fileName = window.location.pathname.split('/').pop() || 'index.html';
  window.location.href = 'http://localhost:3001/' + fileName;
}

// Intercept global fetch to map relative /api calls to port 3001 if on other port or file://
(function interceptFetch() {
  if (window.fetch && window.fetch.__isIntercepted) return;
  const originalFetch = window.fetch;
  if (!originalFetch) return;

  window.fetch = function (resource, options) {
    if (typeof resource === 'string') {
      const isLocalDev = window.location.protocol === 'file:' || 
        ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3001');
      
      if (isLocalDev) {
        if (resource.startsWith('/api/')) {
          resource = 'http://localhost:3001' + resource;
        } else if (resource.startsWith('api/')) {
          resource = 'http://localhost:3001/' + resource;
        } else if (resource === '/api') {
          resource = 'http://localhost:3001/api';
        }
      }
    }
    return originalFetch.call(window, resource, options);
  };
  window.fetch.__isIntercepted = true;
})();

const API_BASE = (window.location.protocol === 'file:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3001'))
  ? 'http://localhost:3001/api'
  : '/api';

// ===== THEME (DARK / LIGHT MODE) =====
(function initTheme() {
  const saved = localStorage.getItem("app_theme");
  if (saved === "light") {
    document.body.classList.add("light-mode");
  }
})();

function toggleTheme() {
  const isLight = document.body.classList.toggle("light-mode");
  localStorage.setItem("app_theme", isLight ? "light" : "dark");
  // Update all toggle buttons on the page
  const icons = document.querySelectorAll(".theme-toggle-icon");
  const labels = document.querySelectorAll(".theme-toggle-label");
  icons.forEach((el) => {
    el.textContent = isLight ? "☀️" : "🌙";
  });
  labels.forEach((el) => {
    el.textContent = isLight ? "Mode Terang" : "Mode Gelap";
  });
}

// --- SESSION PERSISTENCE GUARD ---
// Enforce session-only login credentials (wipe from localStorage on fresh session startup)
if (!sessionStorage.getItem("session_active_flag")) {
  // Check if user came from another internal app page (not just login.html)
  const isInternalNavigation = document.referrer && (
    document.referrer.includes("login.html") ||
    document.referrer.includes("index.html") ||
    document.referrer.includes("admin.html") ||
    document.referrer.includes("member.html") ||
    document.referrer.includes("karaoke.html") ||
    document.referrer.includes("pos.html") ||
    document.referrer.includes("finance.html") ||
    document.referrer.includes("booking") ||
    document.referrer.includes("monitoring.html") ||
    document.referrer.includes("db-admin.html") ||
    document.referrer.includes("profile.html") ||
    document.referrer.includes("stock-history.html") ||
    document.referrer.includes("attendance") ||
    document.referrer.includes("rental.html") ||
    document.referrer.includes("karaoke-settings.html") ||
    document.referrer.includes("users-admin.html") ||
    (document.referrer.includes("localhost:3001") || document.referrer.includes("127.0.0.1:3001"))
  );

  if (isInternalNavigation) {
    sessionStorage.setItem("session_active_flag", "true");
  } else {
    localStorage.removeItem("auth_role");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_name");
    localStorage.removeItem("auth_profile_pic");
    localStorage.removeItem("auth_token");
    sessionStorage.setItem("session_active_flag", "true");
  }
}

// --- TIME SYNC SYSTEM ---
let serverTimeOffset = 0;
async function syncTime() {
  try {
    const start = Date.now();
    const response = await fetch(`${API_BASE}/time`);
    const { serverTime } = await response.json();
    const end = Date.now();
    const latency = (end - start) / 2;
    serverTimeOffset = serverTime + latency - end;
  } catch (e) {}
}
syncTime();
setInterval(syncTime, 60000);

function getSyncedNow() {
  return new Date(Date.now() + serverTimeOffset);
}

// --- SHOP SETTINGS LOCK GUARD ---
async function checkShopStatusLock() {
  // Only apply shop status lock to CASHIER/OPERATOR dashboards
  // Admin, db-admin, and public reservasi are exempt or handled separately
  const isCashierPage =
    window.location.href.includes("index.html") ||
    window.location.href.includes("karaoke.html") ||
    window.location.href.includes("pos.html");

  const roleNow = localStorage.getItem("auth_role");

  // Allow engineer to access system even if shop is locked (shopOpen=false)
  // Engineer bypasses the shop status lock overlay.
  if (roleNow === "engineer") {
    return;
  }

  if (isCashierPage) {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const settings = await res.json();
      if (
        settings &&
        (settings.shopOpen === false || settings.shopOpen === "false")
      ) {
        // Cashier server/dashboard is turned off / locked!
        // Create a full page glassmorphic overlay that cannot be closed.
        const lockOverlay = document.createElement("div");
        lockOverlay.style.position = "fixed";
        lockOverlay.style.top = "0";
        lockOverlay.style.left = "0";
        lockOverlay.style.width = "100vw";
        lockOverlay.style.height = "100vh";
        lockOverlay.style.background = "rgba(10, 10, 20, 0.98)";
        lockOverlay.style.backdropFilter = "blur(20px)";
        lockOverlay.style.display = "flex";
        lockOverlay.style.flexDirection = "column";
        lockOverlay.style.justifyContent = "center";
        lockOverlay.style.alignItems = "center";
        lockOverlay.style.zIndex = "999999";
        lockOverlay.style.color = "#ffffff";
        lockOverlay.style.textAlign = "center";
        lockOverlay.style.padding = "2rem";

        lockOverlay.innerHTML = `
                    <div style="max-width: 600px; background: rgba(231, 76, 60, 0.05); border: 2px solid rgba(231, 76, 60, 0.4); border-radius: 24px; padding: 3rem 2rem; box-shadow: 0 0 50px rgba(231,76,60,0.25);">
                        <div style="font-size: 5rem; margin-bottom: 1.5rem; animation: pulse 2s infinite;">🔒</div>
                        <h1 style="color: #e74c3c; font-family: var(--font-heading); margin-bottom: 1.5rem; font-weight: 900; letter-spacing: 1px; font-size: 2rem; text-shadow: 0 0 20px rgba(231,76,60,0.3);">
                            SISTEM OPERASIONAL NONAKTIF
                        </h1>
                        <p style="font-size: 1.1rem; line-height: 1.6; color: #eceff1; margin-bottom: 1.5rem;">
                            Saat ini status toko diatur **TUTUP (Operasional Dinonaktifkan)** oleh Administrator / Manager.
                        </p>
                        <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-dim); margin-bottom: 2.5rem;">
                            Semua fitur kasir, pemesanan F&B, dan transaksi rental meja billiard/karaoke telah dikunci demi keamanan. Silakan hubungi Administrator untuk mengubah status menjadi BUKA agar sistem dapat digunakan kembali.
                        </p>
                        <div style="display: flex; gap: 1rem; justify-content: center;">
                            <button onclick="window.location.reload()" class="btn btn-outline" style="width: auto; padding: 0.6rem 1.5rem; font-weight: bold; border-color: rgba(255,255,255,0.2); color: white; cursor: pointer;">
                                ↻ Coba Muat Ulang
                            </button>
                            <button onclick="logout()" class="btn btn-primary" style="width: auto; padding: 0.6rem 1.5rem; font-weight: bold; background: #e74c3c; border-color: #e74c3c; cursor: pointer;">
                                🚪 Keluar Akun
                            </button>
                        </div>
                    </div>
                `;
        document.body.appendChild(lockOverlay);
      }
    } catch (e) {
      console.error("Failed to verify store operational lock status:", e);
    }
  }
}
checkShopStatusLock();

// --- AUTO-SAVE DATABASE MIRROR TO BROWSER LOCALSTORAGE ---
async function startAutoDatabaseMirrorSync() {
  // Only run this on cashier or admin dashboards, not on the public reservasi portal
  const isDashboardPage =
    window.location.href.includes("index.html") ||
    window.location.href.includes("karaoke.html") ||
    window.location.href.includes("pos.html") ||
    window.location.href.includes("admin.html") ||
    window.location.href.includes("db-admin.html");

  if (isDashboardPage) {
    // Sync immediately on load, then every 10 seconds
    const syncMirror = async () => {
      try {
        const statsRes = await fetch(`${API_BASE}/db/stats`);
        if (statsRes.ok) {
          const stats = await statsRes.json();
          if (stats.counts.menu > 0 || stats.counts.transactions > 0) {
            const rawRes = await fetch(`${API_BASE}/db/download`);
            if (rawRes.ok) {
              const dbData = await rawRes.text();
              localStorage.setItem("offline_db_mirror", dbData);
              localStorage.setItem(
                "offline_db_mirror_time",
                new Date().toISOString(),
              );
              console.log(
                "[Auto-Save] Database mirrored successfully in browser storage.",
              );
            }
          }
        }
      } catch (e) {
        console.error("[Auto-Save] Local mirror sync failed:", e);
      }
    };

    // Run first sync after 2 seconds, then every 10 seconds
    setTimeout(syncMirror, 2000);
    setInterval(syncMirror, 10000);
  }
}
startAutoDatabaseMirrorSync();

// --- AUTH GUARD ---
if (
  !window.location.href.includes("login.html") &&
  !window.location.href.includes("attendance.html") &&
  !window.location.href.includes("absen") &&
  !window.location.href.includes("presensi") &&
  !window.location.href.includes("reservasi.html")
) {
  const currentRole = localStorage.getItem("auth_role");
  if (!currentRole) {
    window.location.href = "login.html";
  } else if (currentRole === "tv" && !window.location.href.includes("tv.html")) {
    window.location.href = "tv.html";
  }
}

function logout() {
  const username = localStorage.getItem("auth_user");
  if (username) {
    fetch("/api/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      keepalive: true
    }).catch(err => console.error("Error calling logout API:", err));
  }
  localStorage.removeItem("auth_role");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("auth_name");
  localStorage.removeItem("auth_profile_pic");
  localStorage.removeItem("auth_token");
  window.location.href = "login.html";
}

// --- HEARTBEAT SYSTEM TO KEEP SESSION ALIVE & DETECT REMOTE LOGOUTS ---
(function startSessionHeartbeat() {
  const username = localStorage.getItem("auth_user");
  const token = localStorage.getItem("auth_token");

  // Only run if the user is logged in
  if (username && token) {
    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, token }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.active) {
            alert("Sesi Anda telah berakhir karena akun ini login di perangkat lain.");
            logout();
          }
        }
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    };

    // Run first heartbeat after 2 seconds, then every 5 seconds
    setTimeout(() => {
      sendHeartbeat();
      setInterval(sendHeartbeat, 5000);
    }, 2000);
  }
})();

const formatRupiah = (n) => {
  if (n === undefined || n === null) return "Rp -";
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
  // Replace non-breaking spaces (\u00A0) with standard space (\u0020) to prevent thermal printer character glitched outputs (e.g. printing 'a' or 'â')
  return formatted.replace(/\u00a0/g, " ").replace(/\s+/g, " ");
};

const formatTime = (iso) => {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "--:--"
    : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

const calculateTimeDiff = (startISO) => {
  const start = new Date(startISO);
  const diff = Math.max(0, getSyncedNow() - start);
  const h = Math.floor(diff / 3600000),
    m = Math.floor((diff % 3600000) / 60000),
    s = Math.floor((diff % 60000) / 1000);
  return {
    h,
    m,
    s,
    formatted: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
  };
};

const calculateCountdown = (endISO) => {
  const end = new Date(endISO);
  const diff = Math.max(0, end - getSyncedNow());
  const h = Math.floor(diff / 3600000),
    m = Math.floor((diff % 3600000) / 60000),
    s = Math.floor((diff % 60000) / 1000);
  return {
    h,
    m,
    s,
    isExpired: diff <= 0,
    formatted: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
  };
};

async function fetchData(ep) {
  try {
    return await (await fetch(`${API_BASE}${ep}`)).json();
  } catch (e) {
    return [];
  }
}
async function postData(ep, data) {
  try {
    return await (
      await fetch(`${API_BASE}${ep}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    ).json();
  } catch (e) {
    return null;
  }
}
async function putData(ep, data) {
  try {
    return await (
      await fetch(`${API_BASE}${ep}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    ).json();
  } catch (e) {
    return null;
  }
}
async function deleteData(ep) {
  try {
    return await (await fetch(`${API_BASE}${ep}`, { method: "DELETE" })).json();
  } catch (e) {
    return null;
  }
}

window.changePrinterSize = function(val) {
  localStorage.setItem("printer_width", val);
  console.log("[Printer] Width set to:", val);
};

function renderNavbar(active) {
  const role = localStorage.getItem("auth_role");
  const user = localStorage.getItem("auth_user") || "User";
  const nav = document.querySelector("nav");
  if (!nav) return;

  let linksHtml = "";
  if (role === "admin" || role === "engineer") {
    linksHtml += `
            <li class="nav-label">ADMIN PANEL:</li>
            <li><a href="admin.html" class="${active === "admin" ? "active-admin" : ""}">🍔 Menu</a></li>
            <li><a href="karaoke-settings.html" class="${active === "karaoke-settings" ? "active-admin" : ""}">🎤 Ruang</a></li>
            <li><a href="rental.html" class="${active === "rental" ? "active-admin" : ""}">🎱 Meja</a></li>
            <li class="nav-divider"></li>
            <li><a href="monitoring.html" class="${active === "monitoring" ? "active-admin" : ""}">📡 LIVE</a></li>
            <li><a href="cctv.html" class="${active === "cctv" ? "active-admin" : ""}">📹 CCTV</a></li>
            <li><a href="stock-history.html" class="${active === "stock-history" ? "active-admin" : ""}">📦 STOK</a></li>
            <li><a href="finance.html" class="${active === "finance" ? "active-admin" : ""}">📊 LAPORAN</a></li>
            <li><a href="attendance-admin.html" class="${active === "attendance-admin" ? "active-admin" : ""}">👥 STAF</a></li>
            <li><a href="bookings.html" class="nav-booking ${active === "bookings" ? "active-admin" : ""}">📅 BOOKING</a></li>
            <li><a href="member.html" class="${active === "member" ? "active-admin" : ""}">🪪 MEMBER</a></li>
            <li><a href="db-admin.html" class="${active === "db-admin" ? "active-admin" : ""}">💾 BACKUP</a></li>
        `;
  } else {
    linksHtml += `
            <li class="nav-label">KASIR:</li>
            <li><a href="index.html" class="${active === "billiard" ? "active" : ""}">🎱 Billiard</a></li>
            <li><a href="karaoke.html" class="${active === "karaoke" ? "active" : ""}">🎤 Karaoke</a></li>
            <li><a href="pos.html" class="${active === "pos" ? "active" : ""}">🍔 Menu</a></li>
            <li><a href="bookings.html" class="nav-booking ${active === "bookings" ? "active-admin" : ""}">📅 Booking</a></li>
            <li><a href="member.html" class="${active === "member" ? "active" : ""}">🪪 Member</a></li>
        `;
  }

  const profilePic =
    localStorage.getItem("auth_profile_pic") || "assets/logo.png";

  const isLightNow = document.body.classList.contains("light-mode");
  let html = `
    <ul>
        ${linksHtml}
    </ul>
    
    <div class="nav-user-section">
        <style>
            @keyframes navCloudPulse {
                0% { transform: scale(0.9); opacity: 0.6; }
                50% { transform: scale(1.2); opacity: 1; filter: drop-shadow(0 0 4px #2ecc71); }
                100% { transform: scale(0.9); opacity: 0.6; }
            }
            .cloud-indicator {
                display: flex;
                align-items: center;
                gap: 0.35rem;
                background: rgba(46, 204, 113, 0.08);
                border: 1.5px solid rgba(46, 204, 113, 0.25);
                border-radius: 30px;
                padding: 0.25rem 0.6rem;
                margin-right: 0.5rem;
                color: #2ecc71;
                font-size: 0.65rem;
                font-weight: bold;
                font-family: 'Inter', system-ui, sans-serif;
                letter-spacing: 0.1px;
                transition: all 0.3s ease;
            }
            @media (max-width: 1366px) {
                .cloud-indicator {
                    padding: 0.25rem 0.45rem;
                    margin-right: 0.3rem;
                    gap: 0.2rem;
                }
                .cloud-text {
                    display: none;
                }
            }
        </style>

        <!-- THEME TOGGLE BUTTON -->
        <button class="theme-toggle-btn" onclick="toggleTheme()" title="Ganti tema terang/gelap" id="theme-toggle-btn">
            <span class="theme-toggle-icon">${isLightNow ? "☀️" : "🌙"}</span>
            <span class="theme-toggle-label">${isLightNow ? "Mode Terang" : "Mode Gelap"}</span>
        </button>

        <div class="cloud-indicator" title="Data terhubung & tersimpan secara otomatis di Database Cloud MongoDB.">
            <span class="cloud-dot" style="display: inline-block; width: 5px; height: 5px; background: #2ecc71; border-radius: 50%; animation: navCloudPulse 2s infinite;"></span>
            <span>☁️ <span class="cloud-text">Tersimpan Otomatis</span></span>
        </div>
        
        <!-- PRINTER SIZE SELECTOR -->
        <select id="select-printer-size" onchange="changePrinterSize(this.value)" class="printer-size-select" title="Pilih Ukuran Kertas Struk Thermal">
            <option value="58mm" ${localStorage.getItem("printer_width") !== "80mm" ? "selected" : ""}>📏 58mm</option>
            <option value="80mm" ${localStorage.getItem("printer_width") === "80mm" ? "selected" : ""}>📏 80mm</option>
        </select>
        
        <!-- DIRECT BLUETOOTH PRINTER BUTTON -->
        <button id="btn-connect-bluetooth" onclick="connectBluetoothPrinter()" class="${window.bleCharacteristic ? 'connected' : 'disconnected'}" title="${window.bleCharacteristic ? 'Printer Terkoneksi' : 'Konek Printer'}">
            <span class="btn-icon">${window.bleCharacteristic ? "🖨️" : "🔌"}</span>
            <span class="btn-text">${window.bleCharacteristic ? "Printer Konek" : "Konek Printer"}</span>
        </button>
        
        ${role === "admin" ? `<a href="users-admin.html" class="${active === "users-admin" ? "active-admin" : ""}" style="color: var(--primary-color);">⚙️</a>` : ""}
        <a href="profile.html" class="profile-link ${active === "profile" ? "active" : ""}">
            <img src="${profilePic}" class="nav-avatar">
            <span class="nav-username">${user}</span>
        </a>
        <button onclick="logout()" class="logout-btn">🚪</button>
    </div>
  `;
  nav.innerHTML = html;
}

// --- WEB BLUETOOTH DIRECT PRINTING SYSTEM (VANILLA JS) ---
window.bleDevice = null;
window.bleCharacteristic = null;

function cleanPrintText(str) {
  if (!str) return "";
  // Replace all non-breaking spaces, thin spaces, and special whitespaces with standard space (\u0020)
  let cleaned = str.replace(
    /[\u00a0\u200b\u202f\u2007\u2008\u2009\u200a]/g,
    " ",
  );
  // Filter out any non-ASCII characters to keep the byte layout 100% clean and correct for thermal printers
  return cleaned.replace(/[^\x00-\x7F]/g, "");
}

async function connectBluetoothPrinter() {
  try {
    // Enforce user click gesture for Web Bluetooth API
    window.bleDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb", // Standard POS BLE UUID
        "0000e7e1-0000-1000-8000-00805f9b34fb", // generic printer
        "49535343-fe7d-4ae5-8fa9-9fafd205e455", // microprinter BLE UUID
      ],
    });

    console.log("[WebBluetooth] Printer terpilih:", window.bleDevice.name);
    const server = await window.bleDevice.gatt.connect();

    let service = null;
    let characteristic = null;

    // Common Printer Service UUIDs
    const uuids = [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "0000e7e1-0000-1000-8000-00805f9b34fb",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    ];

    for (const uuid of uuids) {
      try {
        service = await server.getPrimaryService(uuid);
        if (service) break;
      } catch (e) {}
    }

    if (!service) {
      // Try getting first available primary service
      const services = await server.getPrimaryServices();
      if (services.length > 0) service = services[0];
    }

    if (service) {
      const characteristics = await service.getCharacteristics();
      // Find characteristic with WRITE or WRITE_WITHOUT_RESPONSE property
      characteristic = characteristics.find(
        (c) => c.properties.write || c.properties.writeWithoutResponse,
      );
      if (!characteristic && characteristics.length > 0) {
        characteristic = characteristics[0];
      }
    }

    if (!characteristic)
      throw new Error("Karakteristik data tulis (GATT Write) tidak ditemukan.");

    window.bleCharacteristic = characteristic;
    alert(`🎉 Sukses terhubung ke printer: ${window.bleDevice.name}!`);
    updateBluetoothButtonState(true);

    window.bleDevice.addEventListener(
      "gattserverdisconnected",
      onBluetoothDisconnected,
    );
  } catch (err) {
    console.error("[WebBluetooth] Gagal menghubungkan printer:", err);
    alert("⚠️ Gagal terhubung: " + err.message);
    updateBluetoothButtonState(false);
  }
}

function onBluetoothDisconnected() {
  alert("🔌 Printer Bluetooth terputus!");
  window.bleDevice = null;
  window.bleCharacteristic = null;
  updateBluetoothButtonState(false);
}

function updateBluetoothButtonState(connected) {
  const btn = document.getElementById("btn-connect-bluetooth");
  if (!btn) return;
  if (connected) {
    btn.innerHTML = "<span>🖨️ Printer Konek</span>";
    btn.style.background = "rgba(46, 204, 113, 0.15)";
    btn.style.borderColor = "#2ecc71";
    btn.style.color = "#2ecc71";
  } else {
    btn.innerHTML = "<span>🔌 Konek Printer</span>";
    btn.style.background = "rgba(231, 76, 60, 0.08)";
    btn.style.borderColor = "rgba(231, 76, 60, 0.3)";
    btn.style.color = "#e74c3c";
  }
}

async function writeBLEData(dataArray) {
  const chunkSize = 20; // BLE packets maximum payload is 20 bytes
  for (let i = 0; i < dataArray.length; i += chunkSize) {
    const chunk = dataArray.slice(i, i + chunkSize);
    await window.bleCharacteristic.writeValue(new Uint8Array(chunk));
    await new Promise((resolve) => setTimeout(resolve, 25)); // 25ms delay to prevent buffer overflows
  }
}

async function printDirectBluetooth(data) {
  if (!window.bleCharacteristic) return false;

  try {
    const now = getSyncedNow();
    const encoder = new TextEncoder();
    let esc = [];

    // Retrieve selected paper size
    const paperSize = localStorage.getItem("printer_width") || "58mm";
    const is80 = paperSize === "80mm";
    const maxChars = is80 ? 48 : 32;
    const divider = "-".repeat(maxChars) + "\n";
    const leftPad = is80 ? 32 : 18;
    const rightPad = is80 ? 15 : 13;
    const labelPad = is80 ? 15 : 10;

    // 1. Initialize printer
    esc.push(0x1b, 0x40);

    // 2. Align Center
    esc.push(0x1b, 0x61, 1);

    // Double width + height for Title
    esc.push(0x1b, 0x21, 0x30);
    esc.push(...encoder.encode(cleanPrintText("OM BEN BILLIARD\n")));

    // Standard text size
    esc.push(0x1b, 0x21, 0x00);
    esc.push(0x1b, 0x45, 1); // Bold on
    esc.push(...encoder.encode(cleanPrintText("X V3 KARAOKE\n")));
    esc.push(0x1b, 0x45, 0); // Bold off

    esc.push(
      ...encoder.encode(cleanPrintText(`${now.toLocaleString("id-ID")}\n`)),
    );
    esc.push(
      ...encoder.encode(cleanPrintText(divider)),
    );

    // 3. Align Left
    esc.push(0x1b, 0x61, 0);
    
    const kasirVal = (localStorage.getItem("auth_user") || "Kasir");
    esc.push(
      ...encoder.encode(
        cleanPrintText(
          `Kasir:`.padEnd(labelPad) + kasirVal.padStart(maxChars - labelPad) + "\n",
        ),
      ),
    );
    
    const custVal = (data.customerName || "Customer");
    esc.push(
      ...encoder.encode(
        cleanPrintText(
          `Pelanggan:`.padEnd(labelPad) + custVal.padStart(maxChars - labelPad) + "\n",
        ),
      ),
    );
    esc.push(
      ...encoder.encode(cleanPrintText(divider)),
    );

    // 4. Print Items
    if (data.tableName) {
      esc.push(...encoder.encode(cleanPrintText(`Sewa ${data.tableName}\n`)));
      const durText = `Durasi: ${data.durationMinutes || 0} Menit`;
      const priceText = formatRupiah(data.tableAmount || data.amount);
      esc.push(
        ...encoder.encode(
          cleanPrintText(`${durText.padEnd(leftPad)} ${priceText.padStart(rightPad)}\n`),
        ),
      );

      if (data.orders && data.orders.length > 0) {
        esc.push(
          ...encoder.encode(
            cleanPrintText("- ".repeat(maxChars / 2) + "\n"),
          ),
        );
        data.orders.forEach((o) => {
          const nameQty = `${o.name} x${o.qty}`;
          const subtotal = formatRupiah(o.subtotal);
          if (nameQty.length > leftPad) {
            esc.push(...encoder.encode(cleanPrintText(`${nameQty}\n`)));
            esc.push(
              ...encoder.encode(
                cleanPrintText(`${"".padEnd(leftPad)} ${subtotal.padStart(rightPad)}\n`),
              ),
            );
          } else {
            esc.push(
              ...encoder.encode(
                cleanPrintText(
                  `${nameQty.padEnd(leftPad)} ${subtotal.padStart(rightPad)}\n`,
                ),
              ),
            );
          }
        });
      }
    } else if (data.orders) {
      data.orders.forEach((o) => {
        const nameQty = `${o.name} x${o.qty || o.quantity}`;
        const subtotal = formatRupiah(o.subtotal);
        if (nameQty.length > leftPad) {
          esc.push(...encoder.encode(cleanPrintText(`${nameQty}\n`)));
          esc.push(
            ...encoder.encode(
              cleanPrintText(`${"".padEnd(leftPad)} ${subtotal.padStart(rightPad)}\n`),
            ),
          );
        } else {
          esc.push(
            ...encoder.encode(
              cleanPrintText(
                `${nameQty.padEnd(leftPad)} ${subtotal.padStart(rightPad)}\n`,
              ),
            ),
          );
        }
      });
    }

    esc.push(
      ...encoder.encode(cleanPrintText(divider)),
    );

    // 5. Total
    esc.push(0x1b, 0x45, 1); // Bold on
    const totVal = formatRupiah(data.amount || data.totalAmount);
    esc.push(
      ...encoder.encode(cleanPrintText(`TOTAL:`.padEnd(labelPad) + totVal.padStart(maxChars - labelPad) + "\n")),
    );
    esc.push(0x1b, 0x45, 0); // Bold off

    esc.push(
      ...encoder.encode(cleanPrintText(divider)),
    );

    // 6. Footer Center
    esc.push(0x1b, 0x61, 1);
    esc.push(0x1b, 0x45, 1);
    esc.push(...encoder.encode(cleanPrintText("Terima Kasih!\n")));
    esc.push(0x1b, 0x45, 0);
    esc.push(...encoder.encode(cleanPrintText("Selamat Datang Kembali\n\n")));

    // 7. Paper Feed lines
    esc.push(0x1b, 0x64, 4);

    // Send raw ESC/POS bytes over BLE
    await writeBLEData(esc);
    return true;
  } catch (e) {
    console.error("[WebBluetooth] Gagal mengirim data cetak:", e);
    alert("⚠️ Gagal cetak Bluetooth: " + e.message);
    return false;
  }
}

// --- NEW ROBUST PRINT SYSTEM ---
async function printReceipt(data) {
  if (!data) return alert("Data struk tidak tersedia!");

  // Check if direct Web Bluetooth printer is connected and active
  if (window.bleCharacteristic) {
    const directSuccess = await printDirectBluetooth(data);
    if (directSuccess) return; // Print complete, exit cleanly!
  }

  const now = getSyncedNow();
  const paperWidth = localStorage.getItem("printer_width") || "58mm";
  const is80 = paperWidth === "80mm";
  
  let itemsHtml = "";

  if (data.tableName) {
    itemsHtml = `
            <div class="row"><span>Sewa ${data.tableName}</span> <span>${formatRupiah(data.tableAmount || data.amount)}</span></div>
            <div class="row"><small>Durasi: ${data.durationMinutes || 0} Menit</small></div>
        `;
    if (data.orders && data.orders.length > 0) {
      itemsHtml += '<div class="divider"></div>';
      data.orders.forEach((o) => {
        itemsHtml += `<div class="row"><span>${o.name} x${o.qty}</span> <span>${formatRupiah(o.subtotal)}</span></div>`;
      });
    }
  } else if (data.orders) {
    data.orders.forEach((o) => {
      itemsHtml += `<div class="row"><span>${o.name} x${o.qty || o.quantity}</span> <span>${formatRupiah(o.subtotal)}</span></div>`;
    });
  }

  // Create an invisible iframe to bypass popup blockers 100% on both HP and PC
  let iframe = document.getElementById("receipt-print-iframe");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "receipt-print-iframe";
    iframe.style.position = "absolute";
    iframe.style.left = "-9999px";
    iframe.style.top = "0";
    // Set width according to selected printer size for accurate layout
    const paperWidth = is80 ? "80mm" : "58mm";
    iframe.style.width = paperWidth;
    // Height set high enough to contain full receipt content
    iframe.style.height = "500px";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Struk Pembayaran</title>
            <style>
                @page {
                    margin: 0;
                    size: ${is80 ? "80mm auto" : "58mm auto"};
                }
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    width: ${is80 ? "80mm" : "58mm"};
                    padding: ${is80 ? "4mm 5mm" : "2mm 3mm"};
                    font-size: ${is80 ? "13px" : "11px"};
                    line-height: 1.3;
                    color: #000;
                    background: #fff;
                }
                .text-center {
                    text-align: center;
                }
                .divider {
                    border-top: 1px dashed #000;
                    margin: 6px 0;
                    width: 100%;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    width: 100%;
                    word-break: break-word;
                }
                .bold {
                    font-weight: bold;
                }
                .total {
                    font-size: ${is80 ? "15px" : "13px"};
                    margin-top: 5px;
                    border-top: 1px dashed #000;
                    padding-top: 5px;
                }
                .logo-title {
                    font-size: ${is80 ? "16px" : "14px"};
                    font-weight: bold;
                    letter-spacing: 0.5px;
                }
            </style>
        </head>
        <body>
            <div class="text-center">
                <div class="logo-title">OM BEN BILLIARD</div>
                <div style="font-size: 10px; font-weight: bold; margin-top: 1px;">X V3 KARAOKE</div>
                <div style="font-size: 8px; color: #555; margin-top: 2px;">${now.toLocaleString("id-ID")}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="row"><span>Kasir:</span> <span>${localStorage.getItem("auth_user") || "Kasir"}</span></div>
            <div class="row"><span>Pelanggan:</span> <span>${data.customerName || "Pelanggan"}</span></div>
            
            <div class="divider"></div>
            
            ${itemsHtml}
            
            <div class="divider"></div>
            
            <div class="row bold total"><span>TOTAL</span> <span>${formatRupiah(data.amount || data.totalAmount)}</span></div>
            
            <div class="divider"></div>
            
            <div class="text-center" style="margin-top: 8px; font-size: 9px;">
                <p style="font-weight: bold;">Terima Kasih!</p>
                <p>Selamat Datang Kembali</p>
            </div>
        </body>
        </html>
    `);
  doc.close();
  // Attach onload handler to trigger print after iframe content loads
  iframe.onload = function() {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // Clean up the iframe after printing
    setTimeout(() => {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 500);
  };
}

// --- CROSS-TAB ALARM SYSTEM & BROADCAST CHANNEL ---

// Define admin pages to bypass the alarm system completely
const isAdminPage =
  window.location.href.includes("db-admin.html") ||
  window.location.href.includes("admin.html") ||
  window.location.href.includes("users-admin.html") ||
  window.location.href.includes("attendance-admin.html") ||
  window.location.href.includes("finance.html") ||
  window.location.href.includes("karaoke-settings.html") ||
  window.location.href.includes("rental.html") ||
  window.location.href.includes("stock-history.html") ||
  window.location.href.includes("monitoring.html") ||
  window.location.href.includes("cctv.html") ||
  window.location.href.includes("bookings.html");

if (!isAdminPage) {
  // Injection of Alarm Alert CSS
  const alarmStyle = document.createElement("style");
  alarmStyle.textContent = `
        @keyframes pulseAlarm {
            0% { transform: translate(-50%, 0) scale(1); box-shadow: 0 10px 30px rgba(255,0,0,0.5); }
            50% { transform: translate(-50%, 0) scale(1.05); box-shadow: 0 10px 50px rgba(255,0,0,0.8); }
            100% { transform: translate(-50%, 0) scale(1); box-shadow: 0 10px 30px rgba(255,0,0,0.5); }
        }
        .pulse-danger {
            animation: pulseDanger 1s infinite alternate;
        }
        @keyframes pulseDanger {
            from { background-color: rgba(255, 0, 0, 0.2); }
            to { background-color: rgba(255, 0, 0, 0.6); }
        }
    `;
  document.head.appendChild(alarmStyle);
}

let alarmAudioCtx = null;
let alarmInterval = null;

// Unlocking Web Audio API on mobile devices on first user gesture
function unlockAudioContext() {
  if (isAdminPage) return;
  if (!alarmAudioCtx) {
    alarmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (alarmAudioCtx && alarmAudioCtx.state === "suspended") {
    alarmAudioCtx
      .resume()
      .then(() => {
        console.log("AudioContext successfully unlocked!");
      })
      .catch((e) => console.error("AudioContext unlock failed:", e));
  }
  // Remove listeners once successfully initialized
  document.removeEventListener("click", unlockAudioContext);
  document.removeEventListener("touchstart", unlockAudioContext);
}

if (!isAdminPage) {
  document.addEventListener("click", unlockAudioContext, { passive: true });
  document.addEventListener("touchstart", unlockAudioContext, {
    passive: true,
  });
}

function startAlarmSound() {
  if (isAdminPage) return;
  if (alarmInterval) return; // already running

  if (!alarmAudioCtx) {
    alarmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (alarmAudioCtx.state === "suspended") {
    alarmAudioCtx.resume();
  }

  const playBeep = (timeOffset, duration) => {
    const osc1 = alarmAudioCtx.createOscillator();
    const osc2 = alarmAudioCtx.createOscillator();
    const gainNode = alarmAudioCtx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(880, alarmAudioCtx.currentTime + timeOffset); // A5 note (piercing)

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, alarmAudioCtx.currentTime + timeOffset); // E6 note (Fifth harmonic, sharp)

    gainNode.gain.setValueAtTime(0.85, alarmAudioCtx.currentTime + timeOffset); // Very loud
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      alarmAudioCtx.currentTime + timeOffset + duration - 0.02,
    );

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(alarmAudioCtx.destination);

    osc1.start(alarmAudioCtx.currentTime + timeOffset);
    osc1.stop(alarmAudioCtx.currentTime + timeOffset + duration);

    osc2.start(alarmAudioCtx.currentTime + timeOffset);
    osc2.stop(alarmAudioCtx.currentTime + timeOffset + duration);
  };

  // Rhythmic double-beep: Beep 1 at 0s, Beep 2 at 0.22s, repeats every 1.0s
  alarmInterval = setInterval(() => {
    try {
      playBeep(0, 0.18);
      playBeep(0.22, 0.18);
    } catch (e) {
      console.error("Audio alarm play error:", e);
    }
  }, 1000);
}

function stopAlarmSound() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

// Global cross-tab tracking
const alarmedSessions = new Set();
const alarmChannel = new BroadcastChannel("v3-billiard-karaoke-alarms");

// Inject the custom notification banner UI
function injectAlarmBanner() {
  if (isAdminPage) return;
  if (document.getElementById("alarm-notification-banner")) return;
  const banner = document.createElement("div");
  banner.id = "alarm-notification-banner";
  banner.style.cssText = `
        display: none;
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translate(-50%, 0);
        z-index: 10000;
        background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);
        border: 3px solid #fff;
        border-radius: 20px;
        padding: 1.5rem 2rem;
        box-shadow: 0 15px 40px rgba(255,0,0,0.6);
        width: 90%;
        max-width: 550px;
        text-align: center;
        color: white;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        animation: pulseAlarm 1.2s infinite;
    `;

  banner.innerHTML = `
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🚨</div>
        <h2 style="margin: 0 0 0.5rem 0; font-size: 1.6rem; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Waktu Habis!</h2>
        <p id="alarm-banner-message" style="margin: 0 0 1.5rem 0; font-size: 1.2rem; font-weight: bold; line-height: 1.4; background: rgba(0,0,0,0.15); padding: 0.8rem; border-radius: 10px;"></p>
        <button id="dismiss-alarm-btn" style="background: white; color: #ff0844; border: none; padding: 0.8rem 2.5rem; border-radius: 50px; font-weight: 900; cursor: pointer; font-size: 1.1rem; box-shadow: 0 5px 15px rgba(0,0,0,0.3); transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px;">MATIKAN ALARM 🔕</button>
    `;

  document.body.appendChild(banner);

  document.getElementById("dismiss-alarm-btn").onclick = () => {
    dismissActiveAlarm();
  };
}

if (!isAdminPage) {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", injectAlarmBanner);
  } else {
    injectAlarmBanner();
  }
}

function showExpirationAlert(tableName, customerName, targetType, sessionId) {
  if (isAdminPage) return;
  const banner = document.getElementById("alarm-notification-banner");
  const msgEl = document.getElementById("alarm-banner-message");
  if (banner && msgEl) {
    const typeLabel = targetType === "room" ? "🎤 KARAOKE" : "🎱 BILLIARD";
    msgEl.innerHTML = `<span style="color: #ffeb3b; font-weight: 900;">[${typeLabel}]</span><br>Sewa <strong style="font-size: 1.3rem;">${tableName}</strong> oleh <strong>${customerName || "Pelanggan"}</strong> telah selesai!`;
    banner.style.display = "block";
  }

  if (sessionId) alarmedSessions.add(sessionId);
  startAlarmSound();
}

function hideExpirationAlert() {
  const banner = document.getElementById("alarm-notification-banner");
  if (banner) {
    banner.style.display = "none";
  }
}

// Public global triggers called by individual timers
function triggerSessionExpired(session) {
  if (isAdminPage) return;
  if (alarmedSessions.has(session.id)) return;

  // Play locally
  showExpirationAlert(
    session.tableName,
    session.customerName,
    session.targetType || "table",
    session.id,
  );

  // Broadcast to other tabs
  alarmChannel.postMessage({
    type: "SESSION_EXPIRED",
    sessionId: session.id,
    tableName: session.tableName,
    customerName: session.customerName,
    targetType: session.targetType || "table",
  });
}

function dismissActiveAlarm() {
  stopAlarmSound();
  hideExpirationAlert();

  // Broadcast dismiss to other tabs
  alarmChannel.postMessage({
    type: "DISMISS_ALARM",
  });
}

// Listen to other tabs
if (!isAdminPage) {
  alarmChannel.onmessage = (event) => {
    const { type, sessionId, tableName, customerName, targetType } = event.data;
    if (type === "SESSION_EXPIRED") {
      if (!alarmedSessions.has(sessionId)) {
        showExpirationAlert(tableName, customerName, targetType, sessionId);
      }
    } else if (type === "DISMISS_ALARM") {
      stopAlarmSound();
      hideExpirationAlert();
    }
  };
}

// --- GLOBAL BACKGROUND ALARM POLLER ---
// Periodically checks the backend server so alarms trigger across different devices/browsers
let globalSessionPollInterval = null;

async function startGlobalAlarmPoller() {
  if (isAdminPage) return;
  if (globalSessionPollInterval) return;

  const checkSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`);
      if (!response.ok) return;
      const sessions = await response.json();

      let hasActiveAlarm = false;
      let currentExpiredSession = null;
      let anyExpiredActive = false;

      (sessions || []).forEach((session) => {
        if (session.type === "duration" && session.endTime) {
          const end = new Date(session.endTime);
          const now = new Date(Date.now() + serverTimeOffset);
          const diff = end - now;

          if (diff <= 0) {
            anyExpiredActive = true;
            if (!alarmedSessions.has(session.id)) {
              currentExpiredSession = session;
              hasActiveAlarm = true;
            }
          }
        }
      });

      if (hasActiveAlarm && currentExpiredSession) {
        showExpirationAlert(
          currentExpiredSession.tableName,
          currentExpiredSession.customerName,
          currentExpiredSession.targetType || "table",
          currentExpiredSession.id,
        );
      } else if (!anyExpiredActive && alarmInterval) {
        // If no expired sessions exist on backend (e.g. cashier stopped/saved transaction), auto-silence
        stopAlarmSound();
        hideExpirationAlert();
      }
    } catch (e) {
      console.error("Global alarm poller error:", e);
    }
  };

  checkSessions();
  globalSessionPollInterval = setInterval(checkSessions, 5000);
}

// Only start background poller on non-public, non-login, non-admin screens
if (
  !isAdminPage &&
  !window.location.href.includes("reservasi.html") &&
  !window.location.href.includes("login.html")
) {
  startGlobalAlarmPoller();
}

// --- PREMIUM CUSTOM SECURE PASSWORD PROMPT ---
async function promptAdminPassword(message) {
  return new Promise((resolve) => {
    // Create modal overlay element
    const overlay = document.createElement("div");
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(10, 10, 20, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000000;
            opacity: 0;
            transition: opacity 0.25s ease;
        `;

    // Create modal content container
    const modal = document.createElement("div");
    modal.style.cssText = `
            background: linear-gradient(135deg, #1e1e32 0%, #151528 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 2.2rem;
            width: 90%;
            max-width: 420px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,255,255,0.02);
            text-align: center;
            color: #ffffff;
            transform: scale(0.9);
            transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        `;

    // Safe message format
    const cleanMessage = (message || "").replace(/\\n/g, "<br>");

    modal.innerHTML = `
            <div style="font-size: 2.5rem; margin-bottom: 1rem; filter: drop-shadow(0 0 10px rgba(0, 243, 255, 0.4));">🔑</div>
            <h3 style="margin: 0 0 1.2rem 0; font-size: 1.15rem; font-weight: 700; line-height: 1.5; color: #eceff1;">${cleanMessage}</h3>
            
            <div style="position: relative; margin-bottom: 1.8rem; text-align: left;">
                <input type="password" id="secure-prompt-input" placeholder="Masukkan kata sandi..." autocomplete="off" style="
                    width: 100%;
                    padding: 0.9rem 3rem 0.9rem 1.1rem;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1.5px solid rgba(255, 255, 255, 0.15);
                    border-radius: 14px;
                    color: #ffffff;
                    font-size: 1.05rem;
                    outline: none;
                    box-sizing: border-box;
                    transition: all 0.3s ease;
                ">
                <button type="button" id="secure-prompt-toggle" style="
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.4);
                    cursor: pointer;
                    font-size: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    transition: color 0.2s;
                " title="Tampilkan/Sembunyikan password">👁️</button>
            </div>
            
            <div style="display: flex; gap: 0.8rem; justify-content: flex-end;">
                <button type="button" id="secure-prompt-cancel" style="
                    flex: 1;
                    padding: 0.8rem 1.2rem;
                    border: 1.5px solid rgba(255, 255, 255, 0.15);
                    border-radius: 12px;
                    background: transparent;
                    color: #eceff1;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">Batal</button>
                <button type="button" id="secure-prompt-confirm" style="
                    flex: 1;
                    padding: 0.8rem 1.2rem;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #00f3ff 0%, #4facfe 100%);
                    color: #0d0d1b;
                    font-weight: 800;
                    font-size: 0.95rem;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(0, 243, 255, 0.35);
                    transition: all 0.2s ease;
                ">Konfirmasi</button>
            </div>
        `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus input field immediately
    const input = modal.querySelector("#secure-prompt-input");
    const confirmBtn = modal.querySelector("#secure-prompt-confirm");
    const cancelBtn = modal.querySelector("#secure-prompt-cancel");
    const toggleBtn = modal.querySelector("#secure-prompt-toggle");

    // Style hover & focus states via JS
    input.addEventListener("focus", () => {
      input.style.borderColor = "#00f3ff";
      input.style.boxShadow = "0 0 10px rgba(0, 243, 255, 0.2)";
      input.style.background = "rgba(255, 255, 255, 0.08)";
    });
    input.addEventListener("blur", () => {
      input.style.borderColor = "rgba(255, 255, 255, 0.15)";
      input.style.boxShadow = "none";
      input.style.background = "rgba(255, 255, 255, 0.04)";
    });

    cancelBtn.addEventListener("mouseenter", () => {
      cancelBtn.style.background = "rgba(255, 255, 255, 0.05)";
      cancelBtn.style.borderColor = "rgba(255, 255, 255, 0.3)";
    });
    cancelBtn.addEventListener("mouseleave", () => {
      cancelBtn.style.background = "transparent";
      cancelBtn.style.borderColor = "rgba(255, 255, 255, 0.15)";
    });

    confirmBtn.addEventListener("mouseenter", () => {
      confirmBtn.style.transform = "translateY(-1px)";
      confirmBtn.style.boxShadow = "0 6px 20px rgba(0, 243, 255, 0.55)";
    });
    confirmBtn.addEventListener("mouseleave", () => {
      confirmBtn.style.transform = "translateY(0)";
      confirmBtn.style.boxShadow = "0 4px 15px rgba(0, 243, 255, 0.35)";
    });

    toggleBtn.addEventListener("mouseenter", () => {
      toggleBtn.style.color = "rgba(255, 255, 255, 0.8)";
    });
    toggleBtn.addEventListener("mouseleave", () => {
      toggleBtn.style.color = "rgba(255, 255, 255, 0.4)";
    });

    // Toggle visibility action
    let isPasswordHidden = true;
    toggleBtn.addEventListener("click", () => {
      isPasswordHidden = !isPasswordHidden;
      if (isPasswordHidden) {
        input.type = "password";
        toggleBtn.textContent = "👁️";
      } else {
        input.type = "text";
        toggleBtn.textContent = "🔒";
      }
      input.focus();
    });

    // Trigger animations
    setTimeout(() => {
      overlay.style.opacity = "1";
      modal.style.transform = "scale(1)";
      input.focus();
    }, 20);

    // Helper to close and resolve
    const closePrompt = (val) => {
      overlay.style.opacity = "0";
      modal.style.transform = "scale(0.9)";
      setTimeout(() => {
        overlay.remove();
        resolve(val);
      }, 250);
    };

    // Actions
    confirmBtn.addEventListener("click", () => {
      closePrompt(input.value);
    });

    cancelBtn.addEventListener("click", () => {
      closePrompt(null);
    });

    // Escape and Enter key binding
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        closePrompt(input.value);
      } else if (e.key === "Escape") {
        closePrompt(null);
      }
    });

    // Allow closing when clicking the overlay itself (background)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closePrompt(null);
      }
    });
  });
}
