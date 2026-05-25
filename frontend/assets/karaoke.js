let activeSessions = [];
let rooms = [];
let activeCategory = 'Semua';

const tableContainer = document.getElementById('table-container');
const startModal = document.getElementById('start-modal');
const stopModal = document.getElementById('stop-modal');
const startForm = document.getElementById('start-form');
const rentalType = document.getElementById('rental-type');
const durationGroup = document.getElementById('duration-group');

async function init() {
    await refreshData();
    setInterval(updateTimers, 1000);
    setInterval(refreshData, 1000); // REFRESH DATA SETIAP 1 DETIK
}

let menuItems = [];

async function refreshData() {
    const newRooms = await fetchData('/rooms');
    const allSessions = await fetchData('/sessions');
    const newMenu = await fetchData('/menu');
    
    menuItems = newMenu;
    
    // FILTER ONLY ROOM SESSIONS
    const roomSessions = allSessions.filter(s => s.targetType === 'room');
    
    if (JSON.stringify(rooms) !== JSON.stringify(newRooms) || JSON.stringify(activeSessions) !== JSON.stringify(roomSessions)) {
        rooms = newRooms;
        activeSessions = roomSessions;

        const todayStr = getSyncedNow().toISOString().split('T')[0];
        const allTransactions = await fetchData(`/transactions`);
        const todayTransactions = allTransactions.filter(t => t.date === todayStr);
        
        renderCategoryTabs();
        renderRooms();
        updateStats(todayTransactions);
    }
}

function updateStats(transactions) {
    const available = rooms.filter(r => r.status === 'available').length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const revenue = transactions ? transactions.reduce((acc, t) => acc + t.amount, 0) : 0;

    document.getElementById('available-count').textContent = available;
    document.getElementById('occupied-count').textContent = occupied;
    document.getElementById('today-revenue').textContent = formatRupiah(revenue);
}

function renderCategoryTabs() {
    const tabsContainer = document.getElementById('dashboard-category-tabs');
    if (!tabsContainer) return;
    
    const descriptions = [...new Set(rooms.map(r => r.description || 'Standar'))];
    const allCategories = ['Semua', ...descriptions];
    
    if (!allCategories.includes(activeCategory)) {
        activeCategory = 'Semua';
    }
    
    tabsContainer.innerHTML = '';
    allCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-tab-btn ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`;
        btn.textContent = cat.toUpperCase();
        btn.onclick = () => {
            activeCategory = cat;
            renderCategoryTabs();
            renderRooms();
        };
        tabsContainer.appendChild(btn);
    });
}

function handleSearchFilter() {
    renderRooms();
}

function renderRooms() {
    tableContainer.innerHTML = '';
    
    const searchVal = document.getElementById('search-dashboard-input') ? document.getElementById('search-dashboard-input').value.toLowerCase() : '';
    
    const filtered = rooms.filter(room => {
        const cat = room.description || 'Standar';
        const matchesCategory = activeCategory === 'Semua' || cat.toLowerCase() === activeCategory.toLowerCase();
        const matchesSearch = room.name.toLowerCase().includes(searchVal) || cat.toLowerCase().includes(searchVal);
        return matchesCategory && matchesSearch;
    });

    filtered.forEach(room => {
        const session = activeSessions.find(s => s.tableId == room.id);
        const card = document.createElement('div');
        card.className = `table-card ${room.status}`;
        
        card.innerHTML = `
            <div class="table-header">
                <div class="table-info">
                    <h2>${room.name}</h2>
                    <div class="rate">${formatRupiah(room.hourlyRate)} / jam • ${room.description}</div>
                </div>
                <div class="status-badge">${room.status === 'available' ? 'Tersedia' : (room.status === 'booked' ? 'RESERVED' : 'Digunakan')}</div>
            </div>
            <div class="table-content">
                <div class="timer-display" id="timer-${room.id}">${session ? '--:--:--' : '00:00:00'}</div>
                <div class="table-details">
                    <span>${session ? 'Penyewa: ' + session.customerName : 'Ruangan Kosong'}</span>
                    <span>${session ? 'Mulai: ' + formatTime(session.startTime) : '-'}</span>
                </div>
            </div>
            <div class="table-footer" style="display: flex; gap: 0.5rem;">
                ${room.status === 'available' 
                    ? `<button class="btn btn-primary" style="flex: 1.2;" onclick="openStartModal(${room.id})">Mulai Sewa</button>
                       <button class="btn btn-outline" style="flex: 0.8; color: var(--accent-gold); border-color: rgba(240, 192, 64, 0.3);" onclick="goToBookingPage('room', ${room.id})">📅 Booking</button>`
                    : (room.status === 'booked' 
                        ? `<button class="btn btn-primary" onclick="openStartModal(${room.id})">Cek-in Booking</button>`
                        : `<button class="btn btn-outline" style="flex: 1;" onclick="openOrderModal(${session ? session.id : 0})">Order F&B</button>
                           <button class="btn btn-outline" style="flex: 1;" onclick="openStopModal(${session ? session.id : 0}, ${room.id})">Selesaikan</button>`
                      )
                }
            </div>
        `;
        tableContainer.appendChild(card);
    });
    updateTimers();
}

function updateTimers() {
    activeSessions.forEach(session => {
        const timerEl = document.getElementById(`timer-${session.tableId}`);
        if (timerEl) {
            if (session.type === 'duration' && session.endTime) {
                const countdown = calculateCountdown(session.endTime);
                timerEl.textContent = countdown.formatted;
                if (countdown.isExpired) {
                    timerEl.style.color = 'var(--danger)';
                    timerEl.classList.add('pulse');
                    if (typeof triggerSessionExpired === 'function') {
                        triggerSessionExpired(session);
                    }
                } else {
                    timerEl.style.color = 'var(--accent-gold)';
                    timerEl.classList.remove('pulse');
                }
            } else {
                const diff = calculateTimeDiff(session.startTime);
                timerEl.textContent = diff.formatted;
                timerEl.style.color = 'var(--text-light)';
            }
        }
    });
}

function openStartModal(roomId) {
    document.getElementById('modal-table-id').value = roomId;
    
    // Reset member inputs and feedbacks
    const memberInput = document.getElementById('member-id-input');
    const memberFeedback = document.getElementById('member-feedback');
    const submitBtn = document.getElementById('start-submit-btn');
    if (memberInput) memberInput.value = '';
    if (memberFeedback) {
        memberFeedback.style.display = 'none';
        memberFeedback.textContent = '';
    }
    if (submitBtn) submitBtn.disabled = false;

    startModal.style.display = 'flex';
}

let currentSessionForOrder = null;
function openOrderModal(sessionId) {
    currentSessionForOrder = sessionId;
    const session = activeSessions.find(s => s.id == sessionId);
    
    const input = document.getElementById('menu-input');
    if (input) input.value = '';
    
    const select = document.getElementById('menu-options');
    select.innerHTML = '';
    menuItems.forEach(m => {
        if ((m.stock || 0) > 0) {
            select.innerHTML += `<option value="${m.name} - ${formatRupiah(m.price)}"></option>`;
        }
    });

    const list = document.getElementById('session-orders-list');
    list.innerHTML = '';
    if (session.orders && session.orders.length > 0) {
        session.orders.forEach(o => {
            list.innerHTML += `<tr><td>${o.name}</td><td>x${o.qty}</td><td>${formatRupiah(o.subtotal)}</td></tr>`;
        });
    } else {
        list.innerHTML = '<tr><td colspan="3" style="text-align:center;">Belum ada pesanan</td></tr>';
    }
    document.getElementById('order-modal').style.display = 'flex';
}

async function addOrderToSession() {
    const menuVal = document.getElementById('menu-input').value;
    const qty = parseInt(document.getElementById('menu-qty').value) || 0;
    if (!menuVal || qty <= 0) return;

    const menuItem = menuItems.find(m => `${m.name} - ${formatRupiah(m.price)}` === menuVal || m.name.toLowerCase() === menuVal.toLowerCase());
    if (!menuItem) {
        alert("Pilih menu yang valid dari daftar!");
        return;
    }
    const menuId = menuItem.id;

    if (qty > (menuItem.stock || 0)) {
        alert(`Maaf, stok ${menuItem.name} tidak mencukupi (Tersisa: ${menuItem.stock || 0}).`);
        return;
    }

    const res = await postData(`/sessions/${currentSessionForOrder}/order`, { 
        menuId, 
        qty,
        user: localStorage.getItem('auth_user') 
    });
    if (res && res.success) {
        await refreshData();
        openOrderModal(currentSessionForOrder);
    } else if (res && res.message) {
        alert(res.message);
    }
}

document.getElementById('close-order-modal').onclick = () => document.getElementById('order-modal').style.display = 'none';

let lastStopTransaction = null;
async function openStopModal(sessionId, roomId) {
    const session = activeSessions.find(s => s.id == sessionId);
    const diff = calculateTimeDiff(session.startTime);
    
    const durationMs = getSyncedNow() - new Date(session.startTime);
    const durationHours = Math.ceil(durationMs / 3600000);
    const tableAmount = (durationMs <= 5 * 60 * 1000) ? 0 : durationHours * session.hourlyRate;
    const ordersAmount = session.orders ? session.orders.reduce((acc, o) => acc + o.subtotal, 0) : 0;
    const totalAmount = tableAmount + ordersAmount;

    document.getElementById('bill-details').innerHTML = `
        <div style="display:flex; justify-content:space-between;"><span>Ruangan</span> <strong>${session.tableName}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Durasi</span> <strong>${diff.formatted}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Total</span> <strong style="color:var(--accent-gold)">${formatRupiah(totalAmount)}</strong></div>
    `;

    document.getElementById('confirm-stop').onclick = async () => {
        const result = await postData(`/sessions/${sessionId}/stop`, {});
        if (result) {
            lastStopTransaction = result;
            document.querySelector('#stop-modal h2').textContent = "Berhasil!";
            document.getElementById('confirm-stop').style.display = 'none';
            document.getElementById('print-receipt-btn').style.display = 'block';
            refreshData();
        }
    };
    
    document.getElementById('print-receipt-btn').style.display = 'none';
    document.getElementById('print-receipt-btn').onclick = () => printReceipt(lastStopTransaction);
    document.getElementById('confirm-stop').style.display = 'block';
    stopModal.style.display = 'flex';
}

document.getElementById('close-modal').onclick = () => startModal.style.display = 'none';
document.getElementById('close-stop-modal').onclick = () => {
    stopModal.style.display = 'none';
    refreshData();
};

rentalType.onchange = () => {
    durationGroup.style.display = rentalType.value === 'duration' ? 'block' : 'none';
};

startForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        tableId: document.getElementById('modal-table-id').value,
        customerName: document.getElementById('customer-name').value,
        type: rentalType.value,
        durationMinutes: parseInt(document.getElementById('duration-minutes').value) || 0,
        targetType: 'room'
    };
    const result = await postData('/sessions/start', data);
    if (result) {
        startModal.style.display = 'none';
        startForm.reset();
        refreshData();
    }
};

init();

// Handle Auto-start from Booking
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const autoId = params.get('autoStart');
    const name = params.get('name');
    const memberId = params.get('memberId');
    if (autoId) {
        setTimeout(() => {
            openStartModal(autoId);
            document.getElementById('customer-name').value = decodeURIComponent(name || '');
            if (memberId) {
                const memberInput = document.getElementById('member-id-input');
                if (memberInput) {
                    memberInput.value = decodeURIComponent(memberId);
                    checkMemberStatus();
                }
            }
        }, 500);
    }
});

function goToBookingPage(type, id) {
    window.location.href = `bookings.html?target=${type}|${id}`;
}

// Logika Validasi & Deteksi ID Member Real-time di Kasir
async function checkMemberStatus() {
    console.log("[Karaoke] checkMemberStatus starting...");
    const memberInput = document.getElementById('member-id-input');
    const memberFeedback = document.getElementById('member-feedback');
    const submitBtn = document.getElementById('start-submit-btn');
    const nameInput = document.getElementById('customer-name');

    if (!memberInput || !memberFeedback) {
        console.error("[Karaoke] memberInput or memberFeedback element is missing!");
        return;
    }

    const val = memberInput.value.replace(/\s/g, '');
    console.log("[Karaoke] Input value:", val);
    if (!val) {
        console.log("[Karaoke] Empty value, clearing feedback");
        memberFeedback.style.display = 'none';
        memberFeedback.textContent = '';
        memberInput.style.borderColor = '';
        if (submitBtn) submitBtn.disabled = false;
        return;
    }

    // Must be numeric
    if (!/^\d+$/.test(val)) {
        console.log("[Karaoke] Value is not numeric");
        memberFeedback.style.display = 'block';
        memberFeedback.style.color = '#ef4444';
        memberFeedback.textContent = '⚠️ ID Member harus berupa angka!';
        memberInput.style.borderColor = '#ef4444';
        if (submitBtn) submitBtn.disabled = true;
        return;
    }

    memberFeedback.style.display = 'block';
    memberFeedback.style.color = 'var(--text-dim)';
    memberFeedback.textContent = '⏳ Memeriksa status member...';
    memberInput.style.borderColor = '';

    try {
        const apiBaseUrl = (typeof API_BASE !== 'undefined') ? API_BASE : '/api';
        console.log("[Karaoke] Fetching from:", `${apiBaseUrl}/members/check/${val}`);
        const res = await fetch(`${apiBaseUrl}/members/check/${val}`).then(r => r.json()).catch((err) => {
            console.error("[Karaoke] Fetch call failed:", err);
            return null;
        });

        console.log("[Karaoke] Fetch response:", res);

        if (res && res.found && res.member) {
            const m = res.member;
            console.log("[Karaoke] Member found:", m);
            if (m.status === 'blocked') {
                memberFeedback.style.color = '#ef4444';
                memberFeedback.textContent = `❌ ID Member DIBLOKIR! Alasan: ${m.blockReason || 'Tidak ada alasan'}`;
                memberInput.style.borderColor = '#ef4444';
                if (submitBtn) submitBtn.disabled = true;
            } else {
                memberFeedback.style.color = '#10b981';
                memberFeedback.textContent = `✅ Member Aktif: ${m.name}`;
                memberInput.style.borderColor = '#10b981';
                if (nameInput) nameInput.value = m.name;
                if (submitBtn) submitBtn.disabled = false;
            }
        } else {
            console.log("[Karaoke] Member not found");
            memberFeedback.style.color = '#ef4444';
            memberFeedback.textContent = '❌ ID Member tidak terdaftar!';
            memberInput.style.borderColor = '#ef4444';
            if (submitBtn) submitBtn.disabled = false;
        }
    } catch (err) {
        console.error("[Karaoke] Error caught in try-catch:", err);
        memberFeedback.style.color = '#ef4444';
        memberFeedback.textContent = '⚠️ Gagal memeriksa member ke server.';
        memberInput.style.borderColor = '#ef4444';
        if (submitBtn) submitBtn.disabled = false;
    }
}

function onMemberIdInput() {
    const memberInput = document.getElementById('member-id-input');
    if (!memberInput) return;
    const val = memberInput.value.replace(/\s/g, '');
    console.log("[Karaoke] onMemberIdInput called, ID value:", val);
    
    const memberFeedback = document.getElementById('member-feedback');
    const submitBtn = document.getElementById('start-submit-btn');

    if (val.length === 8) {
        checkMemberStatus();
    } else if (val.length === 0) {
        if (memberFeedback) {
            memberFeedback.style.display = 'none';
            memberFeedback.textContent = '';
        }
        memberInput.style.borderColor = '';
        if (submitBtn) submitBtn.disabled = false;
    } else {
        if (memberFeedback) {
            memberFeedback.style.display = 'block';
            memberFeedback.style.color = '#f59e0b';
            memberFeedback.textContent = '⏳ Menunggu 8 digit ID...';
        }
        memberInput.style.borderColor = '#f59e0b';
        if (submitBtn) submitBtn.disabled = true;
    }
}
