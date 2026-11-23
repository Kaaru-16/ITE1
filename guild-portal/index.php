<?php
session_start();
header('Cache-Control: no-store');
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));

function passwordVisibilityButton(string $inputId): void
{
    ?>
    <button class="password-toggle" type="button" aria-controls="<?= htmlspecialchars($inputId, ENT_QUOTES) ?>" aria-label="Show password" title="Show password">
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/>
            <circle cx="12" cy="12" r="2.5"/>
            <path class="eye-slash" d="m4 4 16 16"/>
        </svg>
    </button>
    <?php
}
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="<?= htmlspecialchars($_SESSION['csrf'], ENT_QUOTES, 'UTF-8') ?>">
    <title>Teyvat Travel Services — Guild Portal</title>
    <link rel="stylesheet" href="css/portal.css?v=<?= filemtime(__DIR__ . '/css/portal.css') ?>">
    <link rel="stylesheet" href="css/portal-layout.css?v=<?= filemtime(__DIR__ . '/css/portal-layout.css') ?>">
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
                <img src="../shared/image/home-imgLogo12.png" alt="Teyvat Travel Services Logo" class="brand-logo-img">
            </div>
            <span class="nav-divider"></span>
            <span class="portal-label">Guild Portal</span>
        </div>

    </header>

    <aside id="workspaceSidebar" class="workspace-sidebar hidden" aria-label="Guild Portal navigation">
        <button id="workspaceAccount" class="sidebar-trigger" type="button" aria-label="Open workspace menu" aria-expanded="false" aria-controls="workspaceMenu">
            <span id="workspaceAvatar" class="avatar-circle" aria-hidden="true"></span>
        </button>
        <div id="workspaceMenu" class="sidebar-menu hidden">
            <div class="sidebar-identity">
                <strong id="workspaceUserName"></strong>
                <span id="workspaceUserRole"></span>
            </div>
            <nav class="sidebar-links" aria-label="Workspace">
                <button class="sidebar-link" type="button" data-workspace-view="staffQueueView">
                    <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-12 4h4m-4 3h7"/></svg>
                    Booking Queue
                </button>
                <button class="sidebar-link hidden" type="button" data-workspace-view="adminDashboardView" data-admin-only>
                    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 4v16h16M8 16v-4m4 4V8m4 8v-6m4 6V5"/></svg>
                    Admin Overview
                </button>
                <button class="sidebar-link hidden" type="button" data-workspace-view="staffManagementView" data-admin-only>
                    <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m3-15a3 3 0 0 1 0 6m3 9v-2a4 4 0 0 0-3-4"/></svg>
                    Staff Management
                </button>
                <button class="sidebar-link" type="button" data-workspace-view="profileView">
                    <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>
                    Account Settings
                </button>
            </nav>
            <div class="sidebar-footer">
                <span>Appearance</span>
                <button id="themeToggleNav" class="theme-switch" type="button" aria-label="Switch color theme">
                    <span class="sun-icon"><img src="image/portal-sun.svg" alt=""></span>
                    <span class="moon-icon"><img src="image/portal-moon.svg" alt=""></span>
                </button>
                <button id="workspaceSignOutBtn" class="sidebar-link" type="button">
                    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M11 4H5v16h6m-2-8h12m-4-4 4 4-4 4"/></svg>
                    Sign out
                </button>
            </div>
        </div>
    </aside>

    <!-- Floating Theme Toggle for Auth Screens -->
    <div id="authThemeWrap" class="auth-theme-wrap">
        <button id="themeToggleAuth" class="theme-switch" type="button" title="Toggle Theme">
            <span class="sun-icon"><img src="image/portal-sun.svg" alt="Light mode"></span>
            <span class="moon-icon"><img src="image/portal-moon.svg" alt="Dark mode"></span>
        </button>
    </div>

    <!-- AUTHENTICATION VIEWS (Centered Card) -->
    <main id="authContainer" class="auth-container">
        <!-- Login Card -->
        <section id="loginView" class="auth-card">
            <h1 class="auth-heading">Guild <span>Portal</span></h1>
            <p class="auth-sub">Sign in to review booking inquiries.</p>

            <form id="loginForm" novalidate>
                <div class="form-group">
                    <label for="loginEmail">Work email</label>
                    <input type="email" id="loginEmail" autocomplete="username" maxlength="254" placeholder="name@teyvat.example" aria-describedby="loginEmailError" required>
                    <p id="loginEmailError" class="auth-field-error" role="status"></p>
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <div class="password-field">
                        <input type="password" id="loginPassword" autocomplete="current-password" placeholder="Enter your password" aria-describedby="loginPasswordError loginAlert" required>
                        <?php passwordVisibilityButton('loginPassword'); ?>
                    </div>
                    <p id="loginPasswordError" class="auth-field-error" role="status"></p>
                    <p id="loginAlert" class="auth-field-error" role="alert"></p>
                </div>
                <button type="submit" class="btn-gold-full">Sign in</button>
            </form>

            <p class="auth-switch-link">
                <a href="#" id="goToSignup">Request a staff account</a>
            </p>

        </section>

        <!-- Staff Sign-Up Card -->
        <section id="signupView" class="auth-card hidden">
            <h1 class="auth-heading">Staff sign-up</h1>
            <p class="auth-sub">Use your work email to request access.</p>

            <form id="signupForm" novalidate>
                <div class="form-group">
                    <label for="signupEmail">Work email</label>
                    <input type="email" id="signupEmail" autocomplete="username" maxlength="254" placeholder="name@teyvat.example" aria-describedby="signupEmailError" required>
                    <p id="signupEmailError" class="auth-field-error" role="status"></p>
                </div>
                <div class="form-group">
                    <label for="signupPassword">Password</label>
                    <div class="password-field">
                        <input type="password" id="signupPassword" autocomplete="new-password" minlength="8" placeholder="Create a password" aria-describedby="signupPasswordError signupAlert" required>
                        <?php passwordVisibilityButton('signupPassword'); ?>
                    </div>
                    <p id="signupPasswordError" class="auth-field-error" role="status"></p>
                    <p id="signupAlert" class="auth-field-error" role="status"></p>
                </div>
                <button type="submit" class="btn-gold-full">Create account</button>
            </form>

            <p class="auth-switch-link">
                <a href="#" id="goToLogin">Back to sign in</a>
            </p>
            <dialog id="signupNameDialog" class="signup-name-dialog" aria-labelledby="signupNameTitle">
                <h2 id="signupNameTitle">Your full name</h2>
                <p>An admin will use this name to review your request and assign bookings.</p>
                <form id="signupNameForm">
                    <div class="form-group">
                        <label for="signupName">Full name</label>
                        <input type="text" id="signupName" autocomplete="name" maxlength="120" required>
                    </div>
                    <div class="signup-dialog-actions">
                        <button id="cancelSignupName" class="btn-ghost-sm" type="button">Back</button>
                        <button class="btn-gold-full" type="submit">Send request</button>
                    </div>
                </form>
            </dialog>
        </section>
    </main>

    <!-- FULL-WIDTH WORKSPACE (Occupies full space when logged in) -->
    <main id="appWorkspace" class="app-workspace hidden">

        <!-- STAFF VIEW: BOOKING QUEUE -->
        <section id="staffQueueView" class="workspace-section booking-font hidden">
            <div class="section-header">
                <div>
                    <h1 class="page-title">Booking queue</h1>
                    <p id="bookingQueueSubtitle" class="page-subtitle">Pending inquiries appear first. Search or filter to find a booking.</p>
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
                    <input type="text" id="searchInput" class="search-input" aria-label="Search by reference or traveler" placeholder="Search by reference or traveler">
                    <select id="nationFilter" class="filter-select" aria-label="Filter by nation">
                        <option value="">All nations</option>
                        <option value="Mondstadt">Mondstadt</option>
                        <option value="Liyue">Liyue</option>
                        <option value="Inazuma">Inazuma</option>
                        <option value="Sumeru">Sumeru</option>
                        <option value="Fontaine">Fontaine</option>
                        <option value="Natlan">Natlan</option>
                        <option value="Snezhnaya">Snezhnaya</option>
                    </select>
                    <select id="statusFilter" class="filter-select" aria-label="Filter by booking status">
                        <option value="">All statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="In review">In review</option>
                        <option value="Confirmed">Confirmed</option>
                    </select>
                    <select id="assigneeFilter" class="filter-select" aria-label="Filter by assignee">
                        <option value="">All assignees</option>
                    </select>
                </div>

                <div class="table-responsive" role="region" aria-label="Booking results" tabindex="0">
                    <table class="data-table">
                        <colgroup><col><col><col><col><col><col><col><col></colgroup>
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
                            <label for="detailStatusSelect">Status</label>
                            <select id="detailStatusSelect" class="form-control">
                                <option value="Pending">Pending</option>
                                <option value="In review">In review</option>
                                <option value="Confirmed">Confirmed</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="detailAssigneeSelect">Assigned to</label>
                            <select id="detailAssigneeSelect" class="form-control"></select>
                        </div>
                        <hr class="card-divider">
                        <button id="saveBookingBtn" class="btn-gold-full" type="button">Save changes</button>
                        <button id="assignAllBookingsBtn" class="btn-ghost-sm hidden" type="button" disabled>Assign all bookings</button>
                        <div id="saveToast" class="save-toast hidden" role="status"></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ADMIN VIEW: REVENUE, CALENDAR & STAFF APPROVAL -->
        <section id="adminDashboardView" class="workspace-section booking-font hidden">
            <div class="section-header">
                <div>
                    <h1 class="page-title">Admin overview</h1>
                    <p class="page-subtitle">Review confirmed bookings and totals.</p>
                </div>
                <div class="month-controls">
                    <button id="prevMonthBtn" class="btn-ghost-sm" type="button">◀ Prev</button>
                    <span id="currentMonthLabel" class="month-title">January 2027</span>
                    <button id="nextMonthBtn" class="btn-ghost-sm" type="button">Next ▶</button>
                </div>
            </div>

            <p class="admin-metric-note">Totals show confirmed booking value by travel date.</p>
            <div class="kpi-grid">
                <div class="kpi-card">
                    <span class="kpi-label">Selected day · <span id="selectedDayLabel"></span></span>
                    <div id="adminDailyTotal" class="kpi-value text-gold">PHP 0</div>
                    <small id="adminDailyCount" class="kpi-sub">0 bookings on this date</small>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Selected period · <span id="selectedWeekLabel"></span></span>
                    <div id="adminWeeklyTotal" class="kpi-value text-blue">PHP 0</div>
                    <small id="adminWeeklyCount" class="kpi-sub">0 bookings in selected week</small>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Selected month · <span id="selectedMonthShort"></span></span>
                    <div id="adminMonthlyTotal" class="kpi-value text-green">PHP 0</div>
                    <small id="adminMonthlyCount" class="kpi-sub">0 total bookings this month</small>
                </div>
            </div>

            <!-- Calendar Breakdown + Weekly Summary -->
            <div class="admin-main-grid">
                <div class="panel-card">
                    <div class="calendar-header-row">
                        <h2 class="card-heading">Confirmed booking calendar</h2>
                        <span class="calendar-hint">Select a day to see its total.</span>
                    </div>
                    <div class="calendar-weekdays">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>
                    <div id="calendarGrid" class="calendar-grid"></div>
                </div>

                <div class="admin-side-col">
                    <!-- Weekly Breakdown Card -->
                    <div class="panel-card">
                        <h2 class="card-heading">Seven-day periods</h2>
                        <div id="weeklyBreakdownList" class="weekly-list"></div>
                    </div>

                </div>
            </div>
        </section>

        <section id="staffManagementView" class="workspace-section booking-font hidden" aria-labelledby="staffAccessHeading">
            <div class="section-header">
                <div>
                    <h1 id="staffAccessHeading" class="page-title" tabindex="-1">Staff Management</h1>
                    <p class="page-subtitle">Manage access requests and staff accounts.</p>
                </div>
                <button id="addStaffBtn" class="btn-ghost-sm" type="button">Add staff</button>
            </div>
            <div class="panel-card">
                <p id="staffAccessMessage" role="status" class="alert-box hidden"></p>
                <div id="staffApprovalList" class="staff-approval-list"></div>
            </div>
            <dialog id="staffEditor" class="panel-card" aria-labelledby="staffEditorTitle">
                <h2 id="staffEditorTitle" class="card-heading">Add staff</h2>
                <form id="staffEditorForm">
                    <p id="staffEditorError" class="alert-box hidden" role="alert"></p>
                    <div class="form-group"><label for="staffName">Full name</label><input id="staffName" maxlength="120" required></div>
                    <div class="form-group"><label for="staffEmail">Work email</label><input id="staffEmail" type="email" maxlength="254" required></div>
                    <div class="form-group"><label for="staffPassword">Password</label><input id="staffPassword" type="password" autocomplete="new-password" minlength="8"></div>
                    <div class="form-group"><label for="staffStatus">Access status</label><select id="staffStatus">
                        <option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="disabled">Deactivated</option>
                    </select></div>
                    <div class="form-group">
                        <label for="staffBookingAccess">Booking permissions</label>
                        <select id="staffBookingAccess">
                            <option value="review_all">View and update all bookings</option>
                            <option value="view_all">View all bookings only</option>
                            <option value="review">View and update assigned bookings</option>
                            <option value="view">View assigned bookings only</option>
                            <option value="none">No booking access</option>
                        </select>
                    </div>
                    <div class="staff-actions">
                        <button type="button" id="cancelStaffBtn" class="btn-ghost-sm">Cancel</button>
                        <button type="submit" class="btn-approve">Save staff account</button>
                    </div>
                </form>
            </dialog>
        </section>

        <section id="profileView" class="workspace-section booking-font hidden" aria-labelledby="profileHeading">
            <div class="section-header">
                <h1 id="profileHeading" class="page-title" tabindex="-1">Account Settings</h1>
            </div>
            <div class="profile-grid">
                <form id="profileForm" class="panel-card">
                    <h2 class="card-heading">Profile</h2>
                    <p id="profileMessage" role="status" class="alert-box hidden"></p>
                    <div class="form-group">
                        <label for="profileName">Display name</label>
                        <input id="profileName" autocomplete="name" maxlength="120" required>
                    </div>
                    <div class="form-group">
                        <label for="profileEmail">Work email</label>
                        <input id="profileEmail" type="email" readonly>
                    </div>
                    <div class="form-group">
                        <label for="profilePhoto">Profile photo</label>
                        <div class="profile-photo-row">
                            <span id="profilePreview" class="avatar-circle" aria-hidden="true"></span>
                            <input id="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="profilePhotoHint">
                        </div>
                        <p id="profilePhotoHint" class="card-sub">JPEG, PNG, or WebP up to 5 MB.</p>
                        <div class="profile-photo-actions">
                            <button id="adjustProfilePhoto" type="button" class="btn-ghost-sm hidden" aria-controls="profilePhotoEditor" aria-expanded="false">Adjust photo</button>
                            <button id="removeProfilePhoto" type="button" class="btn-ghost-sm hidden">Remove photo</button>
                        </div>
                        <fieldset id="profilePhotoEditor" class="profile-photo-editor hidden">
                            <legend>Adjust photo</legend>
                            <canvas id="profileCropPreview" width="256" height="256" role="img" aria-label="Circular profile photo preview"></canvas>
                            <div class="profile-crop-controls">
                                <label for="profileCropZoom">Zoom</label>
                                <input id="profileCropZoom" type="range" min="1" max="3" step="0.05" value="1">
                                <label for="profileCropX">Horizontal position</label>
                                <input id="profileCropX" type="range" min="0" max="100" value="50">
                                <label for="profileCropY">Vertical position</label>
                                <input id="profileCropY" type="range" min="0" max="100" value="50">
                                <button id="resetProfileCrop" type="button" class="btn-ghost-sm">Reset crop</button>
                            </div>
                        </fieldset>
                    </div>
                    <div class="profile-actions">
                        <button type="submit" class="btn-gold-full">Save profile</button>
                    </div>
                </form>
                <div class="password-panel">
                    <form id="passwordForm" class="panel-card">
                        <h2 class="card-heading">Change password</h2>
                        <input id="passwordUsername" type="email" autocomplete="username" hidden>
                        <div class="form-group">
                            <label for="currentPassword">Current password</label>
                            <div class="password-field">
                                <input id="currentPassword" type="password" autocomplete="current-password" required>
                                <?php passwordVisibilityButton('currentPassword'); ?>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="newPassword">New password</label>
                            <div class="password-field">
                                <input id="newPassword" type="password" autocomplete="new-password" minlength="8" required>
                                <?php passwordVisibilityButton('newPassword'); ?>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="confirmPassword">Confirm new password</label>
                            <div class="password-field">
                                <input id="confirmPassword" type="password" autocomplete="new-password" minlength="8" required>
                                <?php passwordVisibilityButton('confirmPassword'); ?>
                            </div>
                        </div>
                        <div class="profile-actions">
                            <button type="submit" class="btn-gold-full">Change password</button>
                        </div>
                    </form>
                    <p id="passwordMessage" role="status" class="alert-box hidden"></p>
                </div>
            </div>
        </section>

    </main>

    <script type="module" src="js/portal.js"></script>
</body>
</html>
