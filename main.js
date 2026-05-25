const { app, BrowserWindow, ipcMain, globalShortcut, dialog, utilityProcess } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;
let serverProcess;
const SERVER_PORT = 3001;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Get the root directory of the app — works in both dev and packaged mode.
 */
function getAppRoot() {
  return app.getAppPath();
}

function startBackendServer() {
  return new Promise((resolve, reject) => {
    const appRoot = getAppRoot();
    const serverPath = path.join(appRoot, 'backend', 'server.js');

    console.log('[Main] Starting backend at:', serverPath);

    // utilityProcess.fork() is the correct way to spawn a Node.js child
    // process inside a packaged Electron app. Unlike child_process.fork(),
    // it does NOT re-launch the Electron binary — it runs a plain Node script.
    serverProcess = utilityProcess.fork(serverPath, [], {
      cwd: path.join(appRoot, 'backend'),
      env: {
        ...process.env,
        PORT: SERVER_PORT.toString(),
        NODE_ENV: 'production',
      },
      stdio: 'pipe',
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Server] ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data}`);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[Server] Process exited with code: ${code}`);
      }
    });

    // Poll until the server is actually ready to accept connections
    let attempts = 0;
    const maxAttempts = 40;
    const checkServer = setInterval(() => {
      attempts++;
      const http = require('http');
      const req = http.get(`http://localhost:${SERVER_PORT}/api/time`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(checkServer);
          console.log('[Main] Backend is ready!');
          resolve();
        }
      });
      req.on('error', () => {}); // Expected while server is starting up
      req.end();

      if (attempts >= maxAttempts) {
        clearInterval(checkServer);
        console.warn('[Main] Backend startup timeout — proceeding anyway.');
        resolve();
      }
    }, 500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    kiosk: true,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    resizable: false,
    closable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: 'Om Ben Billiard - POS System',
    icon: path.join(getAppRoot(), 'frontend', 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(getAppRoot(), 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
  });

  // Load the login page
  mainWindow.loadURL(`http://localhost:${SERVER_PORT}/`);

  // Block Alt+F4 and other escape methods
  mainWindow.on('close', (e) => {
    e.preventDefault();
  });

  // Keep kiosk mode enforced
  mainWindow.on('leave-full-screen', () => {
    mainWindow.setKiosk(true);
  });

  mainWindow.on('blur', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }, 100);
  });

  // Inject taskbar CSS + JS into every page after it finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      (function() {
        if (document.getElementById('electron-taskbar')) return;

        // Load taskbar CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'http://localhost:${SERVER_PORT}/taskbar.css';
        document.head.appendChild(link);

        // Load taskbar JS
        const script = document.createElement('script');
        script.src = 'http://localhost:${SERVER_PORT}/taskbar.js';
        document.body.appendChild(script);
      })();
    `);
  });
}

// Block keyboard shortcuts that could escape kiosk mode
function registerShortcuts() {
  const blockedKeys = [
    'Alt+F4', 'Alt+Tab', 'Super', 'CommandOrControl+W',
    'CommandOrControl+Q', 'CommandOrControl+F4',
    'Alt+Escape', 'CommandOrControl+Escape',
  ];

  blockedKeys.forEach((key) => {
    try {
      globalShortcut.register(key, () => {
        // Intentionally blocked
      });
    } catch (e) {
      // Some shortcuts can't be registered on all platforms
    }
  });
}

// ===== IPC HANDLERS =====

// Exit app (called by taskbar after confirmation)
ipcMain.handle('app:exit', () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch (_) {}
  }
  mainWindow.removeAllListeners('close');
  mainWindow.close();
  app.quit();
  process.exit(0);
});

// Reload page
ipcMain.handle('app:reload', () => {
  if (mainWindow) mainWindow.webContents.reload();
});

// System info
ipcMain.handle('system:info', () => {
  const os = require('os');
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus()[0]?.model || 'Unknown',
    cpuCores: os.cpus().length,
    osVersion: os.release(),
  };
});

// Scan WiFi networks using Windows netsh
ipcMain.handle('wifi:scan', () => {
  return new Promise((resolve) => {
    exec('netsh wlan show networks mode=bssid', { encoding: 'utf8' }, (err, stdout) => {
      if (err) { resolve([]); return; }

      const networks = [];
      const blocks = stdout.split('\n\n');

      for (const block of blocks) {
        const ssidMatch = block.match(/SSID\s*\d*\s*:\s*(.+)/);
        const signalMatch = block.match(/Signal\s*:\s*(\d+)%/i) || block.match(/Sinyal\s*:\s*(\d+)%/i);
        const authMatch = block.match(/Authentication\s*:\s*(.+)/i) || block.match(/Autentikasi\s*:\s*(.+)/i);

        if (ssidMatch && ssidMatch[1].trim()) {
          networks.push({
            ssid: ssidMatch[1].trim(),
            signal: signalMatch ? parseInt(signalMatch[1]) : 0,
            security: authMatch ? authMatch[1].trim() : 'Unknown',
          });
        }
      }

      // Deduplicate and sort by signal strength
      const seen = new Set();
      const unique = networks.filter((n) => {
        if (seen.has(n.ssid)) return false;
        seen.add(n.ssid);
        return true;
      });
      unique.sort((a, b) => b.signal - a.signal);
      resolve(unique);
    });
  });
});

// Get current WiFi connection
ipcMain.handle('wifi:current', () => {
  return new Promise((resolve) => {
    exec('netsh wlan show interfaces', { encoding: 'utf8' }, (err, stdout) => {
      if (err) { resolve(null); return; }

      const ssidMatch = stdout.match(/\bSSID\s*:\s*(.+)/m);
      const signalMatch = stdout.match(/Signal\s*:\s*(\d+)%/i) || stdout.match(/Sinyal\s*:\s*(\d+)%/i);
      const stateMatch = stdout.match(/State\s*:\s*(.+)/i) || stdout.match(/Status\s*:\s*(.+)/i);

      if (ssidMatch) {
        resolve({
          ssid: ssidMatch[1].trim(),
          signal: signalMatch ? parseInt(signalMatch[1]) : 0,
          state: stateMatch ? stateMatch[1].trim() : 'Unknown',
        });
      } else {
        resolve(null);
      }
    });
  });
});

// Connect to WiFi
ipcMain.handle('wifi:connect', (event, ssid, password) => {
  return new Promise((resolve) => {
    const connectCmd = `netsh wlan connect name="${ssid}" ssid="${ssid}"`;

    if (password) {
      const profileXml = `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>${ssid}</name>
  <SSIDConfig>
    <SSID>
      <name>${ssid}</name>
    </SSID>
  </SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>auto</connectionMode>
  <MSM>
    <security>
      <authEncryption>
        <authentication>WPA2PSK</authentication>
        <encryption>AES</encryption>
        <useOneX>false</useOneX>
      </authEncryption>
      <sharedKey>
        <keyType>passPhrase</keyType>
        <protected>false</protected>
        <keyMaterial>${password}</keyMaterial>
      </sharedKey>
    </security>
  </MSM>
</WLANProfile>`;

      const fs = require('fs');
      const tempProfile = path.join(app.getPath('temp'), `wifi_${Date.now()}.xml`);
      fs.writeFileSync(tempProfile, profileXml);

      exec(`netsh wlan add profile filename="${tempProfile}" && ${connectCmd}`, { encoding: 'utf8' }, (err) => {
        try { fs.unlinkSync(tempProfile); } catch (_) {}
        if (err) {
          resolve({ success: false, message: err.message });
        } else {
          resolve({ success: true, message: `Terhubung ke ${ssid}` });
        }
      });
    } else {
      exec(connectCmd, { encoding: 'utf8' }, (err) => {
        if (err) {
          resolve({ success: false, message: 'Gagal terhubung. Mungkin perlu password.' });
        } else {
          resolve({ success: true, message: `Terhubung ke ${ssid}` });
        }
      });
    }
  });
});

// Disconnect WiFi
ipcMain.handle('wifi:disconnect', () => {
  return new Promise((resolve) => {
    exec('netsh wlan disconnect', { encoding: 'utf8' }, (err) => {
      resolve({ success: !err });
    });
  });
});

// ===== APP LIFECYCLE =====

app.whenReady().then(async () => {
  try {
    await startBackendServer();
    createWindow();
    registerShortcuts();
  } catch (err) {
    console.error('[Main] Failed to initialize app:', err);
    dialog.showErrorBox(
      'Gagal Memulai Aplikasi',
      `Terjadi kesalahan saat menjalankan server backend:\n\n${err.message}\n\nCoba jalankan aplikasi sebagai Administrator.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) { try { serverProcess.kill(); } catch (_) {} }
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) { try { serverProcess.kill(); } catch (_) {} }
  globalShortcut.unregisterAll();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
