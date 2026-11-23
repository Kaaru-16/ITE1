let currentUser = null;
let allBookings = [];
let allUsers = [];
let activeBookingRef = null;

// Calendar defaults to January 2027 to showcase seeded bookings
let calYear = 2027;
let calMonth = 0; // 0 = January
let selectedDateStr = '2027-01-16';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    bindAuthEvents();
    bindWorkspaceEvents();
    checkSession();
});

/* ---------------- THEME ---------------- */
function initTheme() {
    const saved = localStorage.getItem('guild_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    const toggle = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('guild_theme', next);
    };

    document.getElementById('themeToggleAuth').addEventListener('click', toggle);
    document.getElementById('themeToggleNav').addEventListener('click', toggle);
}

/* ---------------- AUTH ---------------- */
function bindAuthEvents() {
    document.getElementById('goToSignup').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('signupView').classList.remove('hidden');
    });

    document.getElementById('goToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupView').classList.add('hidden');
        document.getElementById('loginView').classList.remove('hidden');
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const res = await fetch('data.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        const alertBox = document.getElementById('loginAlert');
        if (!data.success) {
            alertBox.textContent = data.message;
            alertBox.className = 'alert-box';
            return;
        }
        alertBox.classList.add('hidden');
        currentUser = data.user;
        enterWorkspace();
    });

    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        const res = await fetch('data.php?action=signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        const alertBox = document.getElementById('signupAlert');
        alertBox.textContent = data.message;
        alertBox.className = data.success ? 'alert-box success' : 'alert-box';
        if (data.success) {
            document.getElementById('signupForm').reset();
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('data.php?action=logout');
        currentUser = null;
        document.body.classList.remove('workspace-mode');
        document.body.classList.add('auth-mode');
        document.getElementById('topNav').classList.add('hidden');
        document.getElementById('appWorkspace').classList.add('hidden');
        document.getElementById('authContainer').classList.remove('hidden');
        document.getElementById('authThemeWrap').classList.remove('hidden');
    });
}

async function checkSession() {
    const res = await fetch('data.php?action=session');
    const data = await res.json();
    if (data.authenticated) {
        currentUser = data.user;
        enterWorkspace();
    }
}

async function enterWorkspace() {
    document.body.classList.remove('auth-mode');
    document.body.classList.add('workspace-mode');

    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('authThemeWrap').classList.add('hidden');
    document.getElementById('topNav').classList.remove('hidden');
    document.getElementById('appWorkspace').classList.remove('hidden');

    // Set Header User Info
    document.getElementById('userDisplayName').textContent = currentUser.name;
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('userAvatar').textContent = initials;

    // Configure Role Tabs (Admin sees Admin Overview + Booking Queue; Staff sees Booking Queue)
    const tabsContainer = document.getElementById('roleTabs');
    tabsContainer.innerHTML = '';

    if (currentUser.role === 'admin') {
        tabsContainer.innerHTML = `
            <button class="role-tab-btn active" data-target="adminDashboardView">Admin Overview</button>
            <button class="role-tab-btn" data-target="staffQueueView">Booking Queue</button>
        `;
    } else {
        tabsContainer.innerHTML = `
            <button class="role-tab-btn active" data-target="staffQueueView">Booking Queue</button>
        `;
    }

    tabsContainer.querySelectorAll('.role-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            tabsContainer.querySelectorAll('.role-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            switchSection(btn.dataset.target);
        });
    });

    await loadDashboardData();

    if (currentUser.role === 'admin') {
        switchSection('adminDashboardView');
    } else {
        switchSection('staffQueueView');
    }
}

function switchSection(sectionId) {
    ['staffQueueView', 'bookingDetailView', 'adminDashboardView'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

async function loadDashboardData() {
    const res = await fetch('data.php?action=dashboard_data');
    const data = await res.json();
    allBookings = data.bookings || [];
    allUsers = data.users || [];

    populateStaffDropdowns();
    renderStaffQueue();
    renderAdminDashboard();
}

/* ---------------- STAFF VIEW: BOOKING QUEUE & DETAIL ---------------- */
function bindWorkspaceEvents() {
    ['searchInput', 'nationFilter', 'statusFilter', 'assigneeFilter'].forEach(id => {
        document.getElementById(id).addEventListener('input', renderStaffQueue);
        document.getElementById(id).addEventListener('change', renderStaffQueue);
    });

    document.getElementById('backToQueueBtn').addEventListener('click', () => {
        switchSection('staffQueueView');
    });

    document.getElementById('saveBookingBtn').addEventListener('click', async () => {
        if (!activeBookingRef) return;
        const status = document.getElementById('detailStatusSelect').value;
        const assigned_to = document.getElementById('detailAssigneeSelect').value;

        const res = await fetch('data.php?action=update_booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: activeBookingRef, status, assigned_to })
        });
        const data = await res.json();
        if (data.success) {
            allBookings = data.bookings;
            renderStaffQueue();
            renderAdminDashboard();

            const badge = document.getElementById('detailStatusBadge');
            badge.textContent = status;
            badge.className = `status-badge status-${status.replace(/\s+/g, '-')}`;

            const toast = document.getElementById('saveToast');
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 2000);
        }
    });

    // Admin Month Navigation
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        selectedDateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
        renderAdminDashboard();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        selectedDateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
        renderAdminDashboard();
    });
}

function populateStaffDropdowns() {
    const approvedStaff = allUsers.filter(u => u.role === 'staff' && u.status === 'approved');

    // Filter Dropdown
    const filterSelect = document.getElementById('assigneeFilter');
    filterSelect.innerHTML = `<option value="">All assignees</option><option value="Unassigned">Unassigned</option>`;
    approvedStaff.forEach(s => {
        filterSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
    });

    // Detail Assignment Dropdown
    const detailSelect = document.getElementById('detailAssigneeSelect');
    detailSelect.innerHTML = `<option value="Unassigned">Unassigned</option>`;
    approvedStaff.forEach(s => {
        detailSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
    });
}

function renderStaffQueue() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const nation = document.getElementById('nationFilter').value;
    const status = document.getElementById('statusFilter').value;
    const assignee = document.getElementById('assigneeFilter').value;

    // KPI counts across all bookings
    document.getElementById('kpiPending').textContent = allBookings.filter(b => b.status === 'Pending').length;
    document.getElementById('kpiReview').textContent = allBookings.filter(b => b.status === 'In review').length;
    document.getElementById('kpiConfirmed').textContent = allBookings.filter(b => b.status === 'Confirmed').length;

    const statusOrder = { 'Pending': 1, 'In review': 2, 'Confirmed': 3 };

    const filtered = allBookings
        .filter(b => {
            const matchesSearch = b.reference.toLowerCase().includes(search) || b.traveler.toLowerCase().includes(search);
            const matchesNation = !nation || b.nation === nation;
            const matchesStatus = !status || b.status === status;
            const matchesAssignee = !assignee || b.assigned_to === assignee;
            return matchesSearch && matchesNation && matchesStatus && matchesAssignee;
        })
        .sort((a, b) => (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9));

    const tbody = document.getElementById('bookingsTableBody');
    tbody.innerHTML = '';

    filtered.forEach(b => {
        const badgeClass = `status-${b.status.replace(/\s+/g, '-')}`;
        const assigneeHtml = b.assigned_to === 'Unassigned'
            ? `<span class="assignee-pill">Unassigned</span>`
            : `<span>${b.assigned_to}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${b.reference}</strong></td>
            <td><strong>${b.traveler}</strong></td>
            <td>${b.nation}</td>
            <td>${formatDisplayDate(b.travel_date)}</td>
            <td>${b.guests}</td>
            <td><span class="status-badge ${badgeClass}">${b.status}</span></td>
            <td>${assigneeHtml}</td>
            <td><a class="action-link" data-ref="${b.reference}">View</a></td>
        `;
        tr.querySelector('.action-link').addEventListener('click', () => openBookingDetail(b.reference));
        tbody.appendChild(tr);
    });

    document.getElementById('tableFooterCount').textContent = `Showing ${filtered.length} bookings`;
}

function openBookingDetail(ref) {
    const b = allBookings.find(item => item.reference === ref);
    if (!b) return;

    activeBookingRef = ref;
    document.getElementById('detailRefTitle').textContent = `Booking ${b.reference}`;
    document.getElementById('detailSubTitle').textContent = `${b.traveler} · ${b.nation}`;

    const badge = document.getElementById('detailStatusBadge');
    badge.textContent = b.status;
    badge.className = `status-badge status-${b.status.replace(/\s+/g, '-')}`;

    document.getElementById('detailNation').textContent = b.nation;
    document.getElementById('detailDate').textContent = formatDisplayDate(b.travel_date);
    document.getElementById('detailGuests').textContent = `${b.guests} guests`;
    document.getElementById('detailRate').textContent = `PHP ${Number(b.rate).toLocaleString()}`;
    document.getElementById('detailTotal').textContent = `PHP ${(b.rate * b.guests).toLocaleString()}`;
    document.getElementById('detailRequests').textContent = b.requests || 'None';

    document.getElementById('detailContactName').textContent = b.traveler;
    document.getElementById('detailContactEmail').textContent = b.email;
    document.getElementById('detailContactPhone').textContent = b.phone;

    document.getElementById('detailStatusSelect').value = b.status;
    document.getElementById('detailAssigneeSelect').value = b.assigned_to;

    switchSection('bookingDetailView');
}

/* ---------------- ADMIN VIEW: REVENUE, CALENDAR & STAFF APPROVAL ---------------- */
function renderAdminDashboard() {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    document.getElementById('currentMonthLabel').textContent = `${monthNames[calMonth]} ${calYear}`;
    document.getElementById('selectedMonthShort').textContent = `${monthNames[calMonth]} ${calYear}`;

    const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
    const monthBookings = allBookings.filter(b => b.travel_date.startsWith(monthPrefix));

    // Monthly Accumulated Total
    const monthlyAmount = monthBookings.reduce((sum, b) => sum + (b.rate * b.guests), 0);
    document.getElementById('adminMonthlyTotal').textContent = `PHP ${monthlyAmount.toLocaleString()}`;
    document.getElementById('adminMonthlyCount').textContent = `${monthBookings.length} booked trip(s) in ${monthNames[calMonth]}`;

    // Daily Accumulated Total (for selectedDateStr)
    const dayBookings = allBookings.filter(b => b.travel_date === selectedDateStr);
    const dailyAmount = dayBookings.reduce((sum, b) => sum + (b.rate * b.guests), 0);
    document.getElementById('selectedDayLabel').textContent = formatDisplayDate(selectedDateStr);
    document.getElementById('adminDailyTotal').textContent = `PHP ${dailyAmount.toLocaleString()}`;
    document.getElementById('adminDailyCount').textContent = `${dayBookings.length} booking(s) on this day`;

    // Build Calendar Grid & Weekly Buckets
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const calGrid = document.getElementById('calendarGrid');
    calGrid.innerHTML = '';

    // Weekly buckets (Week 1..5 of the month)
    const weeks = [
        { label: 'Week 1 (Days 1–7)', start: 1, end: 7, count: 0, amount: 0 },
        { label: 'Week 2 (Days 8–14)', start: 8, end: 14, count: 0, amount: 0 },
        { label: 'Week 3 (Days 15–21)', start: 15, end: 21, count: 0, amount: 0 },
        { label: 'Week 4 (Days 22–28)', start: 22, end: 28, count: 0, amount: 0 },
        { label: 'Week 5 (Days 29–31)', start: 29, end: 31, count: 0, amount: 0 }
    ];

    monthBookings.forEach(b => {
        const dayNum = parseInt(b.travel_date.split('-')[2], 10);
        const wIdx = Math.min(Math.floor((dayNum - 1) / 7), 4);
        weeks[wIdx].count += 1;
        weeks[wIdx].amount += (b.rate * b.guests);
    });

    // Selected Week KPI
    const selectedDayNum = parseInt(selectedDateStr.split('-')[2], 10) || 1;
    const activeWeekIdx = Math.min(Math.floor((selectedDayNum - 1) / 7), 4);
    const activeWeek = weeks[activeWeekIdx];
    document.getElementById('selectedWeekLabel').textContent = activeWeek.label;
    document.getElementById('adminWeeklyTotal').textContent = `PHP ${activeWeek.amount.toLocaleString()}`;
    document.getElementById('adminWeeklyCount').textContent = `${activeWeek.count} booking(s) in this week`;

    // Empty leading cells
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day empty';
        calGrid.appendChild(emptyCell);
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
        const items = monthBookings.filter(b => b.travel_date === dateStr);
        const dayTotal = items.reduce((sum, b) => sum + (b.rate * b.guests), 0);

        const cell = document.createElement('div');
        cell.className = `cal-day ${dateStr === selectedDateStr ? 'selected' : ''}`;
        cell.innerHTML = `
            <div class="cal-day-num">${d}</div>
            <div>
                ${items.length > 0 ? `<span class="cal-badge-count">${items.length} booked</span>` : ''}
                ${dayTotal > 0 ? `<div class="cal-badge-amount">PHP ${dayTotal.toLocaleString()}</div>` : ''}
            </div>
        `;
        cell.addEventListener('click', () => {
            selectedDateStr = dateStr;
            renderAdminDashboard();
        });
        calGrid.appendChild(cell);
    }

    // Render Weekly Breakdown List
    const weeklyList = document.getElementById('weeklyBreakdownList');
    weeklyList.innerHTML = '';
    weeks.forEach((w, idx) => {
        const row = document.createElement('div');
        row.className = `weekly-row ${idx === activeWeekIdx ? 'active-week' : ''}`;
        row.innerHTML = `
            <div>
                <strong>${w.label}</strong><br>
                <small class="text-secondary">${w.count} booking(s)</small>
            </div>
            <div class="text-gold"><strong>PHP ${w.amount.toLocaleString()}</strong></div>
        `;
        weeklyList.appendChild(row);
    });

    // Render Staff Account Approvals
    renderStaffApprovals();
}

function renderStaffApprovals() {
    const list = document.getElementById('staffApprovalList');
    const staffUsers = allUsers.filter(u => u.role === 'staff');

    if (staffUsers.length === 0) {
        list.innerHTML = `<p class="text-secondary">No staff accounts found.</p>`;
        return;
    }

    list.innerHTML = '';
    staffUsers.forEach(u => {
        const row = document.createElement('div');
        row.className = 'staff-row';

        let actionHtml = '';
        if (u.status === 'pending') {
            actionHtml = `
                <div class="staff-actions">
                    <button class="btn-approve" data-id="${u.id}">Confirm</button>
                    <button class="btn-reject" data-id="${u.id}">Reject</button>
                </div>
            `;
        } else {
            const badgeClass = u.status === 'approved' ? 'status-Confirmed' : 'status-Pending';
            actionHtml = `<span class="status-badge ${badgeClass}">${u.status.toUpperCase()}</span>`;
        }

        row.innerHTML = `
            <div>
                <strong>${u.name}</strong><br>
                <small style="color: var(--text-secondary)">${u.email}</small>
            </div>
            ${actionHtml}
        `;

        const approveBtn = row.querySelector('.btn-approve');
        if (approveBtn) {
            approveBtn.addEventListener('click', () => handleStaffDecision(u.id, 'approved'));
        }
        const rejectBtn = row.querySelector('.btn-reject');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => handleStaffDecision(u.id, 'rejected'));
        }

        list.appendChild(row);
    });
}

async function handleStaffDecision(userId, decision) {
    const res = await fetch('data.php?action=approve_staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, decision })
    });
    const data = await res.json();
    if (data.success) {
        await loadDashboardData();
    }
}

/* ---------------- HELPERS ---------------- */
function formatDisplayDate(isoDate) {
    if (!isoDate) return '-';
    const [y, m, d] = isoDate.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}