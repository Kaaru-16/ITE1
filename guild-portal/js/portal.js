import { bindProfileForms, paintAvatar } from './account-settings.js';

const byId = id => document.getElementById(id);
const portalApi = new URL('../api/portal-data.php', import.meta.url);

let currentUser = null;
let allBookings = [];
let allUsers = [];
let activeBookingRef = null;

const today = new Date();
let calYear = today.getFullYear();
let calMonth = today.getMonth();
let selectedDateStr = calendarDate(calYear, calMonth, today.getDate());
let staffEditId = 0;
let calendarInitialized = false;

function calendarDate(year, month, day) {
    return [year, String(month + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}

async function request(action, data) {
    const options = data === undefined ? {} : {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify(data)
    };
    let response;
    try {
        const url = new URL(portalApi);
        url.searchParams.set('action', action);
        response = await fetch(url, options);
        return { ...await response.json(), httpStatus: response.status };
    } catch {
        return { error: 'The portal could not connect. Try again.', httpStatus: response?.status };
    }
}

const post = (action, data = {}) => request(action, data);

function showMessage(id, message = '', success = false) {
    const element = byId(id);
    element.textContent = message;
    element.className = message ? (success ? 'alert-box success' : 'alert-box') : 'alert-box hidden';
}

function initTheme() {
    const saved = localStorage.getItem('guild_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    const toggle = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('guild_theme', next);
    };

    byId('themeToggleAuth').addEventListener('click', toggle);
    byId('themeToggleNav').addEventListener('click', toggle);
}

function setAuthFieldError(field, message) {
    byId(field.id + 'Error').textContent = message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
}

function validateAuthForm(email, password, creatingAccount = false) {
    const emailValue = email.value.trim();
    let emailError = '';
    if (!emailValue) emailError = 'Enter your work email.';
    else if (email.validity.typeMismatch || !emailValue.split('@').at(-1).includes('.') || emailValue.length > 254) {
        emailError = 'Enter a valid work email, such as name@teyvat.example.';
    }

    let passwordError = '';
    if (!password.value) passwordError = 'Enter your password.';
    else if (creatingAccount && ([...password.value].length < 8 || new TextEncoder().encode(password.value).length > 72)) {
        passwordError = 'Use at least 8 characters and at most 72 bytes.';
    }

    setAuthFieldError(email, emailError);
    setAuthFieldError(password, passwordError);
    if (emailError || passwordError) (emailError ? email : password).focus();
    return !emailError && !passwordError;
}

function setPasswordVisibility(input, button, visible) {
    input.type = visible ? 'text' : 'password';
    const label = visible ? 'Hide password' : 'Show password';
    button.setAttribute('aria-label', label);
    button.title = label;
}

function bindPasswordVisibility(form) {
    const toggles = [...form.querySelectorAll('.password-toggle')];
    const hidePasswords = () => {
        for (const button of toggles) {
            setPasswordVisibility(byId(button.getAttribute('aria-controls')), button, false);
        }
    };

    for (const button of toggles) {
        const input = byId(button.getAttribute('aria-controls'));
        button.addEventListener('click', () => setPasswordVisibility(input, button, input.type === 'password'));
    }
    form.addEventListener('reset', hidePasswords);
    return hidePasswords;
}

function bindAuthEvents() {
    const loginForm = byId('loginForm');
    const signupForm = byId('signupForm');
    const loginAlert = byId('loginAlert');
    const signupAlert = byId('signupAlert');
    const loginEmail = byId('loginEmail');
    const loginPassword = byId('loginPassword');
    const signupEmail = byId('signupEmail');
    const signupPassword = byId('signupPassword');
    for (const [form, alert, otherForm] of [
        [loginForm, loginAlert, signupForm],
        [signupForm, signupAlert, loginForm]
    ]) {
        const view = form.closest('.auth-card');
        const hidePassword = bindPasswordVisibility(form);
        form.addEventListener('input', event => {
            setAuthFieldError(event.target, '');
            alert.textContent = '';
        });
        view.querySelector('.auth-switch-link a').addEventListener('click', event => {
            event.preventDefault();
            hidePassword();
            view.classList.add('hidden');
            otherForm.closest('.auth-card').classList.remove('hidden');
            otherForm.querySelector('input[type="email"]').focus();
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginAlert.textContent = '';
        if (!validateAuthForm(loginEmail, loginPassword)) return;
        const button = loginForm.querySelector('[type=submit]');
        if (button.disabled) return;
        button.disabled = true;
        const data = await post('login', { email: loginEmail.value.trim(), password: loginPassword.value });
        button.disabled = false;
        if (!data.success) {
            loginAlert.textContent = data.message || data.error || 'Sign-in failed. Try again.';
            return;
        }
        loginForm.reset();
        currentUser = data.user;
        enterWorkspace();
    });

    const nameDialog = byId('signupNameDialog');
    const nameForm = byId('signupNameForm');
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        signupAlert.textContent = '';
        if (validateAuthForm(signupEmail, signupPassword, true)) nameDialog.showModal();
    });
    byId('cancelSignupName').addEventListener('click', () => nameDialog.close());
    nameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = byId('signupName').value;
        const email = signupEmail.value.trim();
        const password = signupPassword.value;

        const button = e.submitter || nameForm.querySelector('[type=submit]');
        button.disabled = true;
        const data = await post('signup', { name, email, password });
        button.disabled = false;
        nameDialog.close();

        signupAlert.classList.toggle('success', Boolean(data.success));
        signupAlert.textContent = data.message || data.error || 'The request could not be sent.';
        if (data.success) {
            signupForm.reset();
            nameForm.reset();
        }
    });

    const logout = async () => {
        const result = await post('logout');
        if (result.success) location.reload();
        else window.alert(result.error || 'Sign-out failed. Try again.');
    };
    byId('workspaceSignOutBtn').addEventListener('click', logout);
}

function renderWorkspaceIdentity() {
    paintAvatar(byId('workspaceAvatar'), currentUser.name, currentUser.profile_photo);
    byId('workspaceUserName').textContent = currentUser.name;
    byId('workspaceUserRole').textContent = currentUser.role === 'admin' ? 'Admin' : 'Staff';
    document.querySelectorAll('[data-admin-only]').forEach(link => {
        link.classList.toggle('hidden', currentUser.role !== 'admin');
    });
}

function setWorkspaceMenu(open) {
    const trigger = byId('workspaceAccount');
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? 'Close workspace menu' : 'Open workspace menu');
    byId('workspaceMenu').classList.toggle('hidden', !open);
    byId('workspaceSidebar').classList.toggle('expanded', open);
}

function bindWorkspaceMenu() {
    const sidebar = byId('workspaceSidebar');
    const trigger = byId('workspaceAccount');
    let pinned = false;
    const close = () => {
        pinned = false;
        setWorkspaceMenu(false);
    };
    trigger.addEventListener('click', () => {
        pinned = !pinned;
        setWorkspaceMenu(pinned);
    });
    sidebar.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse') setWorkspaceMenu(true);
    });
    sidebar.addEventListener('pointerleave', () => {
        if (!pinned && !sidebar.contains(document.activeElement)) close();
    });
    sidebar.addEventListener('focusout', event => {
        if (!pinned && !sidebar.contains(event.relatedTarget) && !sidebar.matches(':hover')) close();
    });
    document.addEventListener('pointerdown', event => {
        if (!sidebar.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && sidebar.classList.contains('expanded')) {
            if (sidebar.contains(document.activeElement)) trigger.focus();
            close();
        }
    });
    document.querySelectorAll('[data-workspace-view]').forEach(link => {
        link.addEventListener('click', () => {
            const id = link.dataset.workspaceView;
            switchSection(id);
            window.scrollTo(0, 0);
            const heading = document.querySelector('#' + id + ' .page-title');
            if (heading) {
                heading.tabIndex = -1;
                heading.focus({ preventScroll: true });
            }
            close();
        });
    });
}

async function checkSession() {
    const data = await request('session');
    if (data.authenticated) {
        currentUser = data.user;
        enterWorkspace();
    } else if (data.error && !currentUser) {
        byId('loginAlert').textContent = data.error;
    }
}

async function enterWorkspace() {
    document.body.classList.remove('auth-mode');
    document.body.classList.add('workspace-mode');

    byId('authContainer').classList.add('hidden');
    byId('authThemeWrap').classList.add('hidden');
    byId('topNav').classList.remove('hidden');
    byId('workspaceSidebar').classList.remove('hidden');
    byId('appWorkspace').classList.remove('hidden');

    renderWorkspaceIdentity();

    if (!await loadDashboardData()) return;

    switchSection(currentUser.role === 'admin' ? 'adminDashboardView' : 'staffQueueView', false);
}

function switchSection(sectionId, refresh = true) {
    const sections = ['staffQueueView', 'bookingDetailView', 'adminDashboardView', 'staffManagementView', 'profileView'];
    if (!sections.includes(sectionId)) return;
    if (['adminDashboardView', 'staffManagementView'].includes(sectionId) && currentUser?.role !== 'admin') return;
    document.body.classList.toggle('figma-workspace', ['staffQueueView', 'bookingDetailView', 'profileView'].includes(sectionId));
    const activeView = sectionId === 'bookingDetailView' ? 'staffQueueView' : sectionId;
    document.querySelectorAll('[data-workspace-view]').forEach(link => {
        if (link.dataset.workspaceView === activeView) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    for (const id of sections) {
        byId(id).classList.toggle('hidden', id !== sectionId);
    }
    if (sectionId === 'profileView') resetProfileForms();
    if (refresh) refreshBookings();
}

function assigneeValue(booking) {
    return String(booking.assigned_user_id ?? 'Unassigned');
}

async function loadDashboardData() {
    const data = await request('dashboard_data');
    if (!data.user) {
        if (data.httpStatus === 401) location.reload();
        else window.alert(data.error || 'The workspace could not load.');
        return false;
    }
    renderDashboardData(data);
    return true;
}

function renderDashboardData(data) {
    currentUser = data.user;
    allBookings = data.bookings || [];
    allUsers = data.users || [];
    const admin = currentUser.role === 'admin';
    const canReview = admin || currentUser.booking_access === 'review';
    byId('assigneeFilter').classList.toggle('hidden', !admin);
    byId('detailAssigneeSelect').disabled = !admin;
    byId('detailStatusSelect').disabled = !canReview;
    byId('saveBookingBtn').classList.toggle('hidden', !canReview);
    populateStaffDropdowns();
    renderStaffQueue();
    if (admin) {
        renderAdminDashboard();
        renderStaffApprovals();
    }
}

let refreshingBookings = false;

function showingBookingSummary() {
    return currentUser && document.visibilityState === 'visible'
        && ['staffQueueView', 'adminDashboardView'].some(id => !byId(id).classList.contains('hidden'));
}

async function refreshBookings() {
    if (refreshingBookings || !showingBookingSummary()) return;
    refreshingBookings = true;
    const previousBookings = allBookings;
    const previousUsers = allUsers;
    try {
        const data = await request('dashboard_data');
        // Leave active forms alone and discard results overtaken by a local save.
        if (!showingBookingSummary() || previousBookings !== allBookings || previousUsers !== allUsers) return;
        if (data.httpStatus === 401) {
            location.reload();
        } else if (data.user && (data.user.booking_access !== currentUser.booking_access
            || JSON.stringify(data.bookings) !== JSON.stringify(previousBookings)
            || JSON.stringify(data.users) !== JSON.stringify(previousUsers))) {
            renderDashboardData(data);
        }
    } finally {
        refreshingBookings = false;
    }
}

function bindWorkspaceEvents() {
    bindWorkspaceMenu();
    byId('addStaffBtn').addEventListener('click', () => openStaffEditor());
    byId('cancelStaffBtn').addEventListener('click', () => byId('staffEditor').close());
    byId('staffEditorForm').addEventListener('submit', saveStaffEditor);
    byId('searchInput').addEventListener('input', renderStaffQueue);
    for (const id of ['nationFilter', 'statusFilter', 'assigneeFilter']) {
        byId(id).addEventListener('change', renderStaffQueue);
    }

    byId('backToQueueBtn').addEventListener('click', () => {
        switchSection('staffQueueView');
    });

    byId('saveBookingBtn').addEventListener('click', async () => {
        if (!activeBookingRef) return;
        const status = byId('detailStatusSelect').value;
        const assigned_to = byId('detailAssigneeSelect').value;

        const data = await post('update_booking', { reference: activeBookingRef, status, assigned_to });
        if (data.success) {
            allBookings = data.bookings;
            renderStaffQueue();
            renderAdminDashboard();

            const badge = byId('detailStatusBadge');
            badge.textContent = status;
            badge.className = `status-badge status-${status.replace(/\s+/g, '-')}`;

            const toast = byId('saveToast');
            toast.textContent = 'Changes saved.';
            toast.className = 'save-toast';
            setTimeout(() => { if (toast.className === 'save-toast') toast.classList.add('hidden'); }, 2200);
        } else {
            const toast = byId('saveToast');
            toast.textContent = data.error || 'The booking could not be saved.';
            toast.className = 'alert-box';
        }
    });

    byId('prevMonthBtn').addEventListener('click', () => moveCalendar(-1));
    byId('nextMonthBtn').addEventListener('click', () => moveCalendar(1));
}

function moveCalendar(offset) {
    const month = new Date(calYear, calMonth + offset, 1);
    calYear = month.getFullYear();
    calMonth = month.getMonth();
    selectedDateStr = calendarDate(calYear, calMonth, 1);
    renderAdminDashboard();
}

function populateStaffDropdowns() {
    const approvedStaff = allUsers.filter(u => u.role === 'staff' && u.status === 'approved' && u.booking_access !== 'none');
    const staffValue = user => String(user.id);
    const assignees = new Map(approvedStaff.map(user => [staffValue(user), user.name]));
    for (const booking of allBookings) {
        const value = assigneeValue(booking);
        if (value !== 'Unassigned') assignees.set(value, booking.assigned_to);
    }

    const filterSelect = byId('assigneeFilter');
    const selected = filterSelect.value;
    filterSelect.replaceChildren(new Option('All assignees', ''), new Option('Unassigned'));
    for (const [value, name] of [...assignees].sort((a, b) => a[1].localeCompare(b[1]))) {
        filterSelect.add(new Option(name, value));
    }
    filterSelect.value = assignees.has(selected) || selected === 'Unassigned' ? selected : '';

    const detailSelect = byId('detailAssigneeSelect');
    detailSelect.replaceChildren(new Option('Unassigned', 'Unassigned'));
    for (const person of approvedStaff) {
        const duplicate = allUsers.some(user => user.id !== person.id && user.name === person.name);
        detailSelect.add(new Option(duplicate ? `${person.name} (${person.email})` : person.name, staffValue(person)));
    }
}

function renderStaffQueue() {
    const isStaff = currentUser.role === 'staff';
    const access = currentUser.booking_access;
    if (isStaff) {
        const descriptions = {
            review: 'Review bookings assigned to you and update their status.',
            view: 'View bookings assigned to you.',
            none: 'The Director manages booking access.'
        };
        byId('bookingQueueSubtitle').textContent = descriptions[access] || descriptions.view;
    }
    const bookingAction = isStaff && access === 'review' ? 'Review' : 'View';
    const search = byId('searchInput').value.toLowerCase();
    const nation = byId('nationFilter').value;
    const status = byId('statusFilter').value;
    const assignee = byId('assigneeFilter').value;

    byId('kpiPending').textContent = allBookings.filter(b => b.status === 'Pending').length;
    byId('kpiReview').textContent = allBookings.filter(b => b.status === 'In review').length;
    byId('kpiConfirmed').textContent = allBookings.filter(b => b.status === 'Confirmed').length;

    const statusOrder = { 'Pending': 1, 'In review': 2, 'Confirmed': 3 };

    const filtered = allBookings
        .filter(b => {
            const matchesSearch = b.reference.toLowerCase().includes(search) || b.traveler.toLowerCase().includes(search);
            const matchesNation = !nation || b.nation === nation;
            const matchesStatus = !status || b.status === status;
            const matchesAssignee = !assignee || assigneeValue(b) === assignee;
            return matchesSearch && matchesNation && matchesStatus && matchesAssignee;
        })
        .sort((a, b) => (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9));

    const tbody = byId('bookingsTableBody');
    tbody.innerHTML = '';

    for (const b of filtered) {
        const tr = tbody.insertRow();
        for (const [i, value] of [b.reference, b.traveler, b.nation, formatDisplayDate(b.travel_date), b.guests].entries()) {
            const cell = tr.insertCell();
            cell.textContent = value;
            if (i < 2) cell.className = 'strong-cell';
        }
        const badge = document.createElement('span');
        badge.className = 'status-badge status-' + b.status.replace(/\s+/g, '-');
        badge.textContent = b.status;
        tr.insertCell().append(badge);
        const assignee = document.createElement('span');
        assignee.textContent = b.assigned_to;
        if (b.assigned_to === 'Unassigned') assignee.className = 'assignee-pill';
        tr.insertCell().append(assignee);
        const view = makeButton(bookingAction, 'action-link', () => openBookingDetail(b.reference));
        view.setAttribute('aria-label', bookingAction + ' booking ' + b.reference);
        tr.insertCell().append(view);
    }
    if (!filtered.length) {
        const cell = tbody.insertRow().insertCell();
        cell.colSpan = 8;
        if (isStaff && access === 'none') {
            cell.textContent = 'Your account has no booking access.';
        } else {
            cell.textContent = isStaff && !allBookings.length
                ? 'No bookings have been assigned to you yet.'
                : 'No bookings match these filters.';
        }
    }

    byId('tableFooterCount').textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'booking' : 'bookings'}`;
}

function openBookingDetail(ref) {
    const b = allBookings.find(item => item.reference === ref);
    if (!b) return;

    activeBookingRef = ref;
    byId('detailRefTitle').textContent = `Booking ${b.reference}`;
    byId('detailSubTitle').textContent = `${b.traveler} · ${b.nation}`;

    const badge = byId('detailStatusBadge');
    badge.textContent = b.status;
    badge.className = `status-badge status-${b.status.replace(/\s+/g, '-')}`;

    byId('detailNation').textContent = b.package && b.package !== b.nation ? `${b.nation} · ${b.package}` : b.nation;
    byId('detailDate').textContent = formatDisplayDate(b.travel_date);
    byId('detailGuests').textContent = `${b.guests} guests`;
    byId('detailRate').textContent = `PHP ${Number(b.rate).toLocaleString()}`;
    byId('detailTotal').textContent = `PHP ${(b.rate * b.guests).toLocaleString()}`;
    byId('detailRequests').textContent = b.requests || 'None';

    byId('detailContactName').textContent = b.traveler;
    byId('detailContactEmail').textContent = b.email;
    byId('detailContactPhone').textContent = b.phone;

    byId('detailStatusSelect').value = b.status;
    populateStaffDropdowns();
    const assignee = byId('detailAssigneeSelect');
    const value = assigneeValue(b);
    if (![...assignee.options].some(o => o.value === value)) assignee.add(new Option(b.assigned_to, value));
    assignee.value = value;

    switchSection('bookingDetailView');
}

function renderAdminDashboard() {
    if (currentUser?.role !== 'admin') return;
    const confirmed = allBookings.filter(b => b.status === 'Confirmed');
    if (!calendarInitialized) {
        calendarInitialized = true;
        const upcoming = confirmed.map(b => b.travel_date).filter(d => d >= selectedDateStr).sort()[0];
        if (upcoming && !confirmed.some(b => b.travel_date.startsWith(selectedDateStr.slice(0, 7)))) {
            selectedDateStr = upcoming;
            [calYear, calMonth] = upcoming.split('-').map(Number);
            calMonth--;
        }
    }
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = monthNames[calMonth];
    const monthLabel = `${month} ${calYear}`;
    byId('currentMonthLabel').textContent = monthLabel;
    byId('selectedMonthShort').textContent = monthLabel;

    const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
    const monthBookings = confirmed.filter(b => b.travel_date.startsWith(monthPrefix));

    const monthlyAmount = monthBookings.reduce((sum, b) => sum + (b.rate * b.guests), 0);
    byId('adminMonthlyTotal').textContent = `PHP ${monthlyAmount.toLocaleString()}`;
    byId('adminMonthlyCount').textContent = `${monthBookings.length} confirmed in ${month}`;

    const dayBookings = confirmed.filter(b => b.travel_date === selectedDateStr);
    const dailyAmount = dayBookings.reduce((sum, b) => sum + (b.rate * b.guests), 0);
    byId('selectedDayLabel').textContent = formatDisplayDate(selectedDateStr);
    byId('adminDailyTotal').textContent = `PHP ${dailyAmount.toLocaleString()}`;
    byId('adminDailyCount').textContent = `${dayBookings.length} confirmed on this day`;

    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const calGrid = byId('calendarGrid');
    calGrid.innerHTML = '';

    // Reporting periods start on the first of the month regardless of the calendar weekday.
    const weeks = Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => ({
        label: `Days ${index * 7 + 1}–${Math.min((index + 1) * 7, daysInMonth)}`,
        count: 0,
        amount: 0
    }));

    monthBookings.forEach(b => {
        const dayNum = parseInt(b.travel_date.split('-')[2], 10);
        const wIdx = Math.min(Math.floor((dayNum - 1) / 7), 4);
        weeks[wIdx].count += 1;
        weeks[wIdx].amount += (b.rate * b.guests);
    });

    const selectedDayNum = parseInt(selectedDateStr.split('-')[2], 10) || 1;
    const activeWeekIdx = Math.min(Math.floor((selectedDayNum - 1) / 7), 4);
    const activeWeek = weeks[activeWeekIdx];
    byId('selectedWeekLabel').textContent = activeWeek.label;
    byId('adminWeeklyTotal').textContent = `PHP ${activeWeek.amount.toLocaleString()}`;
    byId('adminWeeklyCount').textContent = `${activeWeek.count} confirmed in this period`;

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day empty';
        calGrid.appendChild(emptyCell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
        const items = monthBookings.filter(b => b.travel_date === dateStr);
        const dayTotal = items.reduce((sum, b) => sum + (b.rate * b.guests), 0);

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.setAttribute('aria-pressed', String(dateStr === selectedDateStr));
        cell.dataset.date = dateStr;
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
            calGrid.querySelector('[data-date="' + dateStr + '"]')?.focus();
        });
        calGrid.appendChild(cell);
    }

    const weeklyList = byId('weeklyBreakdownList');
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

}

const accessLabels = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', disabled: 'Deactivated' };

function makeButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
}

function renderStaffApprovals() {
    const list = byId('staffApprovalList');
    list.replaceChildren();
    const staff = allUsers.filter(u => u.role === 'staff').sort((a,b) =>
        Number(b.status === 'pending') - Number(a.status === 'pending') || a.name.localeCompare(b.name));
    if (!staff.length) {
        list.textContent = 'No staff accounts yet.';
        return;
    }
    for (const user of staff) {
        const row = document.createElement('div');
        row.className = 'staff-row';
        const identity = document.createElement('div');
        const name = document.createElement('strong');
        const email = document.createElement('small');
        name.textContent = user.name;
        email.textContent = user.email;
        identity.className = 'staff-identity';
        identity.append(name, email);
        const status = document.createElement('span');
        status.className = 'status-badge status-' + ({pending:'Pending', approved:'Confirmed'}[user.status] || 'neutral');
        status.textContent = accessLabels[user.status] || user.status;
        const actions = document.createElement('div');
        actions.className = 'staff-actions';
        actions.append(makeButton('Edit', 'btn-ghost-sm', () => openStaffEditor(user)));
        if (user.status === 'pending') {
            actions.append(makeButton('Approve', 'btn-approve', () => handleStaffDecision(user, 'approved')));
            actions.append(makeButton('Reject', 'btn-reject', () => handleStaffDecision(user, 'rejected')));
        } else if (user.status === 'approved') {
            actions.append(makeButton('Deactivate', 'btn-reject', () => handleStaffDecision(user, 'disabled')));
        } else {
            actions.append(makeButton('Restore access', 'btn-approve', () => handleStaffDecision(user, 'approved')));
        }
        row.append(identity, status, actions);
        list.appendChild(row);
    }
}

function openStaffEditor(user) {
    if (currentUser?.role !== 'admin') return;
    staffEditId = user?.id || 0;
    byId('staffEditorTitle').textContent = user ? 'Edit staff' : 'Add staff';
    byId('staffName').value = user?.name || '';
    byId('staffEmail').value = user?.email || '';
    const password = byId('staffPassword');
    password.value = '';
    password.required = !user;
    password.placeholder = user ? 'Leave blank to keep the current password' : 'At least 8 characters';
    byId('staffStatus').value = user?.status || 'approved';
    byId('staffBookingAccess').value = user?.booking_access || 'review';
    byId('staffEditorError').classList.add('hidden');
    byId('staffEditor').showModal();
}

async function saveStaffEditor(event) {
    event.preventDefault();
    const submit = event.submitter || event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    const data = await post('save_staff', {
        user_id: staffEditId,
        name: byId('staffName').value,
        email: byId('staffEmail').value,
        password: byId('staffPassword').value,
        status: byId('staffStatus').value,
        booking_access: byId('staffBookingAccess').value
    });
    submit.disabled = false;
    if (!data.success) {
        const error = byId('staffEditorError');
        error.textContent = data.error || data.message;
        error.classList.remove('hidden');
        return;
    }
    byId('staffEditor').close();
    await loadDashboardData();
    showMessage('staffAccessMessage', data.message, true);
}

async function handleStaffDecision(user, decision) {
    if (decision === 'disabled' && !window.confirm('Deactivate access for ' + user.name + '?')) return;
    const data = await post('approve_staff', {user_id: user.id, decision});
    if (data.success) await loadDashboardData();
    showMessage('staffAccessMessage', data.success ? 'Staff access updated.' : (data.error || 'Staff access could not be updated.'), data.success);
}

function formatDisplayDate(isoDate) {
    if (!isoDate) return '-';
    const [y, m, d] = isoDate.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

const resetProfileForms = bindProfileForms({
    getUser: () => currentUser,
    updateUser(user) {
        currentUser = user;
        renderWorkspaceIdentity();
    },
    post,
    showMessage
});

initTheme();
bindAuthEvents();
bindPasswordVisibility(byId('passwordForm'));
bindWorkspaceEvents();
document.addEventListener('visibilitychange', refreshBookings);
setInterval(refreshBookings, 30000);
checkSession();