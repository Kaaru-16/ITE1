<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teyvat Travel Services — Guild Portal</title>
    <link rel="stylesheet" href="style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="auth-mode">

    <!-- Background Layers -->
    <div class="bg-layer auth-bg"></div>
    <div class="bg-layer app-bg"></div>
    <div class="bg-overlay"></div>

    <!-- Top Navigation Bar (Hidden on Auth Screens) -->
    <header id="topNav" class="top-nav hidden">
        <div class="nav-left">
            <div class="brand-logo">
                <img src="../image/home-imgLogo12.png" alt="Teyvat Travel Services Logo" class="brand-logo-img">
            </div>
            <span class="nav-divider"></span>
            <span class="portal-label">Guild Portal</span>
            <nav id="roleTabs" class="role-tabs"></nav>
        </div>

        <div class="nav-right">
            <button id="themeToggleNav" class="theme-switch" type="button" title="Toggle Theme">
                <span class="sun-icon"><img src="../image/sun.png" alt="Light mode"></span>
                <span class="moon-icon"><img src="../image/moon.png" alt="Dark mode"></span>
            </button>
            <div class="user-badge">
                <div id="userAvatar" class="avatar-circle">OT</div>
                <span id="userDisplayName" class="user-name">Operations team</span>
            </div>
            <button id="logoutBtn" class="btn-ghost-sm" type="button">Sign out</button>
        </div>
    </header>

    <!-- Floating Theme Toggle for Auth Screens -->
    <div id="authThemeWrap" class="auth-theme-wrap">
        <button id="themeToggleAuth" class="theme-switch" type="button" title="Toggle Theme">
            <span class="sun-icon"><img src="sun.png" alt="Light mode"></span>
            <span class="moon-icon"><img src="moon.png" alt="Dark mode"></span>
        </button>
    </div>

    <!-- AUTHENTICATION VIEWS (Centered Card) -->
    <main id="authContainer" class="auth-container">
        <!-- Login Card -->
        <section id="loginView" class="auth-card">
            <h1 class="auth-heading">Guild <span>Portal</span></h1>
            <p class="auth-sub">Sign in to review booking inquiries.</p>

            <div id="loginAlert" class="alert-box hidden"></div>

            <form id="loginForm">
                <div class="form-group">
                    <label>Work email</label>
                    <input type="email" id="loginEmail" placeholder="name@teyvat.example" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="loginPassword" placeholder="Enter your password" required>
                </div>
                <button type="submit" class="btn-gold-full">Sign in</button>
            </form>

            <p class="auth-switch-link">
                <a href="#" id="goToSignup">Invited staff? Set up your account</a>
            </p>

            <div class="demo-credentials">
                <small><strong>Admin:</strong> admin@teyvat.example / admin123</small><br>
                <small><strong>Staff:</strong> jules@teyvat.example / staff123</small>
            </div>
        </section>

        <!-- Staff Sign-Up Card -->
        <section id="signupView" class="auth-card hidden">
            <h1 class="auth-heading">Staff sign-up</h1>
            <p class="auth-sub">Use the work email on your invitation.</p>

            <div id="signupAlert" class="alert-box hidden"></div>

            <form id="signupForm">
                <div class="form-group">
                    <label>Full name</label>
                    <input type="text" id="signupName" placeholder="e.g. Kaeya Alberich" required>
                </div>
                <div class="form-group">
                    <label>Work email</label>
                    <input type="email" id="signupEmail" placeholder="name@teyvat.example" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="signupPassword" placeholder="Create a password" required>
                </div>
                <button type="submit" class="btn-gold-full">Create account</button>
            </form>

            <p class="auth-switch-link">
                <a href="#" id="goToLogin">Back to sign in</a>
            </p>
        </section>
    </main>

    <!-- FULL-WIDTH WORKSPACE (Occupies full space when logged in) -->
    <main id="appWorkspace" class="app-workspace hidden">

        <!-- STAFF VIEW: BOOKING QUEUE -->
        <section id="staffQueueView" class="workspace-section booking-font hidden">
            <div class="section-header">
                <div>
                    <h1 class="page-title">Booking queue</h1>
                    <p class="page-subtitle">Pending inquiries appear first. Search or filter to find a booking.</p>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <span class="kpi-label"><i class="dot dot-pending"></i> Pending</span>
                    <div id="kpiPending" class="kpi-value text-gold">0</div>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label"><i class="dot dot-review"></i> In review</span>
                    <div id="kpiReview" class="kpi-value text-blue">0</div>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label"><i class="dot dot-confirmed"></i> Confirmed</span>
                    <div id="kpiConfirmed" class="kpi-value text-green">0</div>
                </div>
            </div>

            <!-- Filter Bar & Table Panel -->
            <div class="panel-card">
                <div class="filter-bar">
                    <input type="text" id="searchInput" class="search-input" placeholder="Search by reference or traveler">
                    <select id="nationFilter" class="filter-select">
                        <option value="">All nations</option>
                        <option value="Mondstadt">Mondstadt</option>
                        <option value="Liyue">Liyue</option>
                        <option value="Inazuma">Inazuma</option>
                        <option value="Sumeru">Sumeru</option>
                        <option value="Fontaine">Fontaine</option>
                        <option value="Natlan">Natlan</option>
                        <option value="Snezhnaya">Snezhnaya</option>
                    </select>
                    <select id="statusFilter" class="filter-select">
                        <option value="">All statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="In review">In review</option>
                        <option value="Confirmed">Confirmed</option>
                    </select>
                    <select id="assigneeFilter" class="filter-select">
                        <option value="">All assignees</option>
                    </select>
                </div>

                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Traveler</th>
                                <th>Nation / package</th>
                                <th>Travel date</th>
                                <th>Guests</th>
                                <th>Booking status</th>
                                <th>Assigned to</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="bookingsTableBody"></tbody>
                    </table>
                </div>
                <div id="tableFooterCount" class="table-footer">Showing 0 bookings</div>
            </div>
        </section>

        <!-- STAFF VIEW: BOOKING DETAIL & ASSIGNMENT -->
        <section id="bookingDetailView" class="workspace-section booking-font hidden">
            <button id="backToQueueBtn" class="btn-pill-back" type="button">← Back to queue</button>

            <div class="detail-header">
                <div>
                    <h1 id="detailRefTitle" class="page-title">Booking TYV-0000</h1>
                    <p id="detailSubTitle" class="page-subtitle">Traveler · Nation</p>
                </div>
                <span id="detailStatusBadge" class="status-badge">Pending</span>
            </div>

            <div class="detail-grid">
                <div class="detail-left">
                    <div class="panel-card">
                        <h3 class="card-heading">Trip details</h3>
                        <div class="info-grid-3">
                            <div>
                                <span class="field-label">Nation / package</span>
                                <p id="detailNation" class="field-value">-</p>
                            </div>
                            <div>
                                <span class="field-label">Preferred travel date</span>
                                <p id="detailDate" class="field-value">-</p>
                            </div>
                            <div>
                                <span class="field-label">Travelers</span>
                                <p id="detailGuests" class="field-value">-</p>
                            </div>
                        </div>
                        <hr class="card-divider">
                        <div class="info-grid-2">
                            <div>
                                <span class="field-label">Per-person rate</span>
                                <p id="detailRate" class="field-value">-</p>
                            </div>
                            <div>
                                <span class="field-label">Estimated total</span>
                                <p id="detailTotal" class="field-value text-gold">-</p>
                            </div>
                        </div>
                        <div class="mt-20">
                            <span class="field-label">Special requests</span>
                            <p id="detailRequests" class="field-value">-</p>
                        </div>
                    </div>

                    <div class="panel-card mt-20">
                        <h3 class="card-heading">Traveler contact</h3>
                        <div class="info-grid-3">
                            <div>
                                <span class="field-label">Lead traveler</span>
                                <p id="detailContactName" class="field-value">-</p>
                            </div>
                            <div>
                                <span class="field-label">Email</span>
                                <p id="detailContactEmail" class="field-value">-</p>
                            </div>
                            <div>
                                <span class="field-label">Phone</span>
                                <p id="detailContactPhone" class="field-value">-</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Staff Review & Assignment Sidebar -->
                <div class="detail-right">
                    <div class="panel-card">
                        <h3 class="card-heading">Staff review</h3>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="detailStatusSelect" class="form-control">
                                <option value="Pending">Pending</option>
                                <option value="In review">In review</option>
                                <option value="Confirmed">Confirmed</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Assigned to</label>
                            <select id="detailAssigneeSelect" class="form-control"></select>
                        </div>
                        <hr class="card-divider">
                        <button id="saveBookingBtn" class="btn-gold-full" type="button">Save changes</button>
                        <div id="saveToast" class="save-toast hidden">Changes saved!</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ADMIN VIEW: REVENUE, CALENDAR & STAFF APPROVAL -->
        <section id="adminDashboardView" class="workspace-section booking-font hidden">
            <div class="section-header">
                <div>
                    <h1 class="page-title">Admin overview</h1>
                    <p class="page-subtitle">Accumulated revenue metrics, monthly booking calendar, and staff account approvals.</p>
                </div>
                <div class="month-controls">
                    <button id="prevMonthBtn" class="btn-ghost-sm" type="button">◀ Prev</button>
                    <span id="currentMonthLabel" class="month-title">January 2027</span>
                    <button id="nextMonthBtn" class="btn-ghost-sm" type="button">Next ▶</button>
                </div>
            </div>

            <!-- Accumulated Amount KPI Cards (Per Day, Per Week, Per Month) -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <span class="kpi-label"><i class="dot dot-confirmed"></i> Accumulated Per Day (<span id="selectedDayLabel">Selected Day</span>)</span>
                    <div id="adminDailyTotal" class="kpi-value text-gold">PHP 0</div>
                    <small id="adminDailyCount" class="kpi-sub">0 bookings on this date</small>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label"><i class="dot dot-review"></i> Accumulated Per Week (<span id="selectedWeekLabel">Week 1</span>)</span>
                    <div id="adminWeeklyTotal" class="kpi-value text-blue">PHP 0</div>
                    <small id="adminWeeklyCount" class="kpi-sub">0 bookings in selected week</small>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label"><i class="dot dot-pending"></i> Accumulated Per Month (<span id="selectedMonthShort">Month</span>)</span>
                    <div id="adminMonthlyTotal" class="kpi-value text-green">PHP 0</div>
                    <small id="adminMonthlyCount" class="kpi-sub">0 total bookings this month</small>
                </div>
            </div>

            <!-- Calendar Breakdown + Weekly Summary -->
            <div class="admin-main-grid">
                <div class="panel-card">
                    <div class="calendar-header-row">
                        <h3 class="card-heading">Booked Dates Breakdown</h3>
                        <span class="calendar-hint">Click any date to inspect daily & weekly totals</span>
                    </div>
                    <div class="calendar-weekdays">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>
                    <div id="calendarGrid" class="calendar-grid"></div>
                </div>

                <div class="admin-side-col">
                    <!-- Weekly Breakdown Card -->
                    <div class="panel-card">
                        <h3 class="card-heading">Weekly Breakdown</h3>
                        <div id="weeklyBreakdownList" class="weekly-list"></div>
                    </div>

                    <!-- Staff Account Approvals Card -->
                    <div class="panel-card mt-20">
                        <h3 class="card-heading">Staff Account Approvals</h3>
                        <p class="card-sub">Confirm newly registered staff accounts before they can access the portal.</p>
                        <div id="staffApprovalList" class="staff-approval-list"></div>
                    </div>
                </div>
            </div>
        </section>

    </main>

    <script src="app.js"></script>
</body>
</html>