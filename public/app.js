// ============================================================
// CloudStream Premium — Admin Dashboard Frontend
// All click handling via event delegation — NO inline onclick
// ============================================================

const API = '';
let token = localStorage.getItem('cs_token') || null;
let currentPage = 'dashboard';

// Pagination state
let licPage = 1, licSearch = '', licFilter = '', licSelectMode = false;
let licSelected = new Set();
let devPage = 1, devSearch = '';
let puPage = 1, puSearch = '';
let pbPage = 1, pbSearch = '';
let alPage = 1, alSearch = '';

// ============================================================
// INIT — All event listeners registered here
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Sidebar navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Modal close on overlay click
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') closeModal();
    });

    // Global event delegation for dynamic content
    document.getElementById('pageContent').addEventListener('click', handlePageClick);
    document.getElementById('headerActions').addEventListener('click', handleHeaderClick);
    document.getElementById('modalContent').addEventListener('click', handleModalClick);

    // Init
    if (token) {
        showApp();
        navigateTo('dashboard');
    } else {
        showLogin();
    }
});

// ============================================================
// EVENT DELEGATION HANDLERS
// ============================================================

function handlePageClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const val = btn.dataset.value;

    switch (action) {
        // Licenses
        case 'view-license': viewLicenseDetails(parseInt(id)); break;
        case 'revoke-license': revokeLicense(parseInt(id)); break;
        case 'activate-license': activateLicense(parseInt(id)); break;
        case 'delete-license': deleteLicense(parseInt(id)); break;
        case 'edit-license': openEditLicenseModal(parseInt(id)); break;
        case 'restore-license': restoreLicense(parseInt(id)); break;
        case 'permanent-delete-license': permanentDeleteLicense(parseInt(id)); break;
        case 'copy': copyToClipboard(val); break;
        case 'copy-repo-url': copyToClipboard(val); break;

        // License filter tabs
        case 'lic-filter':
            licFilter = val;
            licPage = 1;
            licSelected.clear();
            renderLicenses(1);
            break;

        // Select mode
        case 'toggle-select-mode':
            licSelectMode = !licSelectMode;
            licSelected.clear();
            renderLicenses(licPage);
            break;
        case 'exit-select-mode':
            licSelectMode = false;
            licSelected.clear();
            renderLicenses(licPage);
            break;
        case 'select-license': {
            const lid = parseInt(id);
            if (licSelected.has(lid)) licSelected.delete(lid); else licSelected.add(lid);
            updateSelectUI();
            break;
        }
        case 'select-all-licenses': {
            const checkboxes = document.querySelectorAll('[data-action="select-license"]');
            if (licSelected.size === checkboxes.length && checkboxes.length > 0) {
                licSelected.clear();
            } else {
                checkboxes.forEach(cb => licSelected.add(parseInt(cb.dataset.id)));
            }
            updateSelectUI();
            break;
        }
        case 'bulk-revoke': bulkAction('revoke'); break;
        case 'bulk-delete': bulkAction('delete'); break;
        case 'bulk-activate': bulkAction('activate'); break;
        case 'bulk-restore': bulkAction('restore'); break;
        case 'bulk-force-delete': bulkAction('force_delete'); break;

        // License pagination
        case 'lic-page': renderLicenses(parseInt(val)); break;
        case 'lic-search':
            licSearch = document.getElementById('licSearchInput')?.value || '';
            licPage = 1;
            renderLicenses(1);
            break;

        // Devices
        case 'block-device': deviceAction(parseInt(id), 'block'); break;
        case 'unblock-device': deviceAction(parseInt(id), 'unblock'); break;
        case 'delete-device': deviceAction(parseInt(id), 'delete'); break;
        case 'dev-page': renderDevices(parseInt(val)); break;
        case 'dev-search':
            devSearch = document.getElementById('devSearchInput')?.value || '';
            renderDevices(1);
            break;

        // Plugin usage
        case 'pu-page': renderPluginUsage(parseInt(val)); break;
        case 'pu-search':
            puSearch = document.getElementById('puSearchInput')?.value || '';
            renderPluginUsage(1);
            break;

        // Playback
        case 'pb-page': renderPlaybackLogs(parseInt(val)); break;
        case 'pb-search':
            pbSearch = document.getElementById('pbSearchInput')?.value || '';
            renderPlaybackLogs(1);
            break;

        // Access logs
        case 'al-page': renderAccessLogs(parseInt(val)); break;
        case 'al-search':
            alSearch = document.getElementById('alSearchInput')?.value || '';
            renderAccessLogs(1);
            break;

        // Security
        case 'unblock-ip': unblockIP(val); break;
        case 'open-block-ip-modal': openBlockIPModal(); break;

        // Settings
        case 'save-settings': saveSettings(); break;
        case 'change-password': changePassword(); break;

        // Activity & Sessions
        case 'refresh-activity': renderActivityFeed(); break;
        case 'refresh-sessions': renderActiveSessions(); break;
        case 'view-user-activity': viewUserActivity(val); break;

        // Detail modal inline tabs
        case 'detail-tab': {
            document.querySelectorAll('.inline-tab').forEach(t => t.classList.toggle('active', t.dataset.value === val));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === val));
            break;
        }
    }
}

function handleHeaderClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    switch (action) {
        case 'open-create-license': openCreateLicenseModal(); break;
    }
}

function handleModalClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
        case 'close-modal': closeModal(); break;
        case 'create-license': createLicense(); break;
        case 'delete-license': deleteLicense(parseInt(id)); break;
        case 'edit-license-save': saveEditLicense(parseInt(id)); break;
        case 'revoke-license': revokeLicense(parseInt(id)); break;
        case 'activate-license': activateLicense(parseInt(id)); break;
        case 'block-ip-confirm': blockIPConfirm(); break;
        case 'copy': copyToClipboard(btn.dataset.value); break;
        case 'copy-repo-url': copyToClipboard(btn.dataset.value); break;
        case 'detail-tab': {
            document.querySelectorAll('.inline-tab').forEach(t => t.classList.toggle('active', t.dataset.value === btn.dataset.value));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === btn.dataset.value));
            break;
        }
    }
}

// ============================================================
// AUTH
// ============================================================

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const res = await apiFetch('/api/auth/login', {
            method: 'POST', body: JSON.stringify({ username, password })
        });
        if (res.status === 'ok') {
            token = res.token;
            localStorage.setItem('cs_token', token);
            showApp();
            navigateTo('dashboard');
            toast('Login successful', 'success');
        } else {
            toast(res.message || 'Login failed', 'error');
        }
    } catch (e) { toast('Connection error', 'error'); }
}

function logout() {
    token = null;
    localStorage.removeItem('cs_token');
    showLogin();
}

function showLogin() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('appLayout').classList.add('hidden');
}

function showApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appLayout').classList.remove('hidden');
}

// ============================================================
// API HELPER
// ============================================================

async function apiFetch(url, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...opts.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}${url}`, { ...opts, headers });
    if (res.status === 401) {
        logout();
        toast('Session expired', 'error');
        throw new Error('Unauthorized');
    }
    return res.json();
}

// ============================================================
// NAVIGATION
// ============================================================

function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    const titles = {
        dashboard: 'Dashboard', licenses: 'License Management',
        devices: 'Device Management', plugins: 'Plugin Usage',
        playback: 'Playback Logs', logs: 'Access Logs',
        security: 'Security Monitor', settings: 'Settings',
        activity: 'Live Activity', sessions: 'Active Sessions'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    document.getElementById('headerActions').innerHTML = '';

    // Stop activity auto-refresh when leaving activity page
    if (activityRefreshInterval && page !== 'activity') {
        clearInterval(activityRefreshInterval);
        activityRefreshInterval = null;
    }

    const renderers = {
        dashboard: renderDashboard, licenses: renderLicenses,
        devices: renderDevices, plugins: renderPluginUsage,
        playback: renderPlaybackLogs, logs: renderAccessLogs,
        security: renderSecurity, settings: renderSettings,
        activity: renderActivityFeed, sessions: renderActiveSessions
    };
    if (renderers[page]) renderers[page]();
}

// ============================================================
// TOAST / MODAL / UTIL
// ============================================================

function cleanServerUrl(url) {
    return url ? url.replace(/\/+$/, '') : '';
}

function toast(message, type = 'info') {
    const c = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const span = document.createElement('span');
    span.textContent = message;
    el.appendChild(span);
    c.appendChild(el);
    setTimeout(() => {
        el.classList.add('removing');
        setTimeout(() => el.remove(), 300);
    }, 3500);
}

function confirmAction({ title, message, icon, iconType, confirmText, confirmClass, onConfirm }) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-icon ${iconType || 'warning'}">${icon || '⚠'}</div>
                <h3>${title || 'Confirm'}</h3>
                <p>${message || 'Are you sure?'}</p>
                <div class="confirm-actions">
                    <button class="btn btn-secondary confirm-cancel">Cancel</button>
                    <button class="btn ${confirmClass || 'btn-danger'} confirm-ok">${confirmText || 'Confirm'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const cleanup = (result) => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
            resolve(result);
        };

        overlay.querySelector('.confirm-cancel').onclick = () => cleanup(false);
        overlay.querySelector('.confirm-ok').onclick = () => { if (onConfirm) onConfirm(); cleanup(true); };
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
    });
}

function updateSelectUI() {
    // Update checkboxes without re-rendering
    document.querySelectorAll('[data-action="select-license"]').forEach(cb => {
        const id = parseInt(cb.dataset.id);
        cb.classList.toggle('checked', licSelected.has(id));
        cb.closest('tr')?.classList.toggle('selected', licSelected.has(id));
    });
    // Update select-all checkboxes
    document.querySelectorAll('[data-action="select-all-licenses"]').forEach(cb => {
        const total = document.querySelectorAll('[data-action="select-license"]').length;
        cb.classList.toggle('checked', licSelected.size > 0 && licSelected.size === total);
    });
    // Update counter and bulk buttons
    const counter = document.querySelector('.select-bar-info span');
    if (counter) counter.textContent = licSelected.size + ' selected';
    document.querySelectorAll('.select-bar-actions .btn').forEach(btn => {
        btn.disabled = licSelected.size === 0;
    });
}

function copyToClipboard(text) {
    if (!text) return;

    // Try modern API first (if available and secure context)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            toast('Copied!', 'success');
        }).catch((err) => {
            console.warn('Clipboard API failed, trying fallback', err);
            fallbackCopy(text);
        });
    } else {
        // Fallback for HTTP or older browsers
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '0';
        ta.style.top = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(ta);
        if (successful) toast('Copied!', 'success');
        else toast('Copy failed', 'error');
    } catch (err) {
        console.error('Fallback copy failed', err);
        toast('Copy failed', 'error');
    }
}

function openModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(d) {
    if (!d) return '-';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function esc(s) { return !s ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function statusBadge(s) {
    const c = { active: 'badge-active', expired: 'badge-expired', revoked: 'badge-revoked', trashed: 'badge-trashed' };
    return `<span class="badge ${c[s] || 'badge-info'}">${esc(s)}</span>`;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => toast('Copied!', 'success')).catch(() => toast('Copy failed', 'error'));
}

function pagBtns(page, total, actionName) {
    if (total <= 1) return '';
    let h = '<div class="pagination">';
    h += `<button ${page <= 1 ? 'disabled' : ''} data-action="${actionName}" data-value="${page - 1}">Prev</button>`;
    for (let i = Math.max(1, page - 2); i <= Math.min(total, page + 2); i++) {
        h += `<button class="${i === page ? 'active' : ''}" data-action="${actionName}" data-value="${i}">${i}</button>`;
    }
    h += `<button ${page >= total ? 'disabled' : ''} data-action="${actionName}" data-value="${page + 1}">Next</button>`;
    return h + '</div>';
}

function searchBox(id, placeholder, actionName) {
    return `<div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="${id}" placeholder="${placeholder}" value="" onkeydown="if(event.key==='Enter'){document.querySelector('[data-action=${actionName}]')?.click()}">
        <button data-action="${actionName}" class="btn btn-sm btn-secondary" style="margin-left:4px">Go</button>
    </div>`;
}

// ============================================================
// DASHBOARD
// ============================================================

async function renderDashboard() {
    const c = document.getElementById('pageContent');
    c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
        const d = await apiFetch('/api/admin/dashboard');

        let topPlugins = '';
        if (d.topPlugins?.length) {
            topPlugins = '<h3 style="margin:0 0 12px;font-size:15px">Top Plugins (7 days)</h3><div class="top-list">' +
                d.topPlugins.map(p => `<div class="top-item"><span class="top-item-name">${esc(p.plugin_name)}</span><span class="top-item-count">${p.count}</span></div>`).join('') + '</div>';
        }

        let recent = '';
        if (d.recentActivity?.length) {
            recent = `<div class="table-container"><div class="table-header"><h3>Recent Activity</h3></div>
            <table><thead><tr><th>Action</th><th>Key</th><th>IP</th><th>Details</th><th>Time</th></tr></thead><tbody>` +
                d.recentActivity.map(a => `<tr>
                <td><span class="badge badge-info">${esc(a.action)}</span></td>
                <td>${a.license_key ? `<span class="license-key" data-action="copy" data-value="${esc(a.license_key)}">${esc(a.license_key?.substring(0, 15))}</span>` : '-'}</td>
                <td>${esc(a.ip_address)}</td>
                <td>${esc(a.details?.substring(0, 40))}</td>
                <td>${timeAgo(a.created_at)}</td>
            </tr>`).join('') + '</tbody></table></div>';
        }

        c.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div></div><div class="stat-card-value">${d.totalLicenses}</div><div class="stat-card-label">Total Licenses</div><div class="stat-card-sub">${d.activeLicenses} active</div></div>
                <div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div></div><div class="stat-card-value">${d.totalDevices}</div><div class="stat-card-label">Total Devices</div><div class="stat-card-sub">${d.activeDevices} online</div></div>
                <div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div></div><div class="stat-card-value">${d.totalPluginEvents}</div><div class="stat-card-label">Plugin Events</div><div class="stat-card-sub">${d.todayPluginEvents} today</div></div>
                <div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div><div class="stat-card-value">${d.totalPlaybacks}</div><div class="stat-card-label">Playback Events</div><div class="stat-card-sub">${d.todayPlaybacks} today</div></div>
                <div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div></div><div class="stat-card-value">${d.blockedIPs}</div><div class="stat-card-label">Blocked IPs</div><div class="stat-card-sub">${d.revokedLicenses} revoked, ${d.expiredLicenses} expired</div></div>
            </div>
            ${topPlugins}
            ${recent}
        `;
    } catch (e) { c.innerHTML = '<div class="empty-state"><p>Failed to load dashboard</p></div>'; }
}

// ============================================================
// LICENSES
// ============================================================

let licTrashedView = false;

async function renderLicenses(page = 1) {
    licPage = page;
    licTrashedView = licFilter === 'trashed';
    const c = document.getElementById('pageContent');
    document.getElementById('headerActions').innerHTML = '<button class="btn btn-primary" data-action="open-create-license"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create License</button>';
    c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

    try {
        const isTrashed = licFilter === 'trashed';
        const statusParam = isTrashed ? '' : (licFilter || '');
        const trashedParam = isTrashed ? 'true' : 'false';

        const [data, settingsRes] = await Promise.all([
            apiFetch('/api/admin/licenses?page=' + page + '&limit=15&search=' + encodeURIComponent(licSearch) + '&status=' + statusParam + '&trashed=' + trashedParam),
            apiFetch('/api/admin/settings')
        ]);

        const rawServerUrl = (settingsRes.settings && settingsRes.settings.server_url) ? settingsRes.settings.server_url : window.location.origin;
        const serverUrl = rawServerUrl.replace(/\/+$/, '');
        const tp = Math.ceil(data.total / data.limit);

        // Get counts for filter tabs
        const [allData, activeData, expiredData, revokedData, trashedData] = await Promise.all([
            apiFetch('/api/admin/licenses?page=1&limit=1&trashed=false'),
            apiFetch('/api/admin/licenses?page=1&limit=1&status=active&trashed=false'),
            apiFetch('/api/admin/licenses?page=1&limit=1&status=expired&trashed=false'),
            apiFetch('/api/admin/licenses?page=1&limit=1&status=revoked&trashed=false'),
            apiFetch('/api/admin/licenses?page=1&limit=1&trashed=true')
        ]);

        const tabs = [
            { key: '', label: 'All', count: allData.total, icon: '\u{1F4CB}' },
            { key: 'active', label: 'Active', count: activeData.total, icon: '\u2705' },
            { key: 'expired', label: 'Expired', count: expiredData.total, icon: '\u23F0' },
            { key: 'revoked', label: 'Revoked', count: revokedData.total, icon: '\u{1F6AB}' },
            { key: 'trashed', label: 'Trash', count: trashedData.total, icon: '\u{1F5D1}\uFE0F' }
        ];

        const filterTabsHtml = '<div class="filter-tabs">' + tabs.map(function (t) {
            return '<button class="filter-tab ' + (licFilter === t.key ? 'active' : '') + '" data-action="lic-filter" data-value="' + t.key + '">' + t.icon + ' ' + t.label + ' <span class="tab-count">' + t.count + '</span></button>';
        }).join('') + '</div>';

        const selectToggle = licSelectMode
            ? '<button class="btn btn-sm btn-ghost active" data-action="exit-select-mode" title="Cancel select"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancel</button>'
            : '<button class="btn btn-sm btn-ghost" data-action="toggle-select-mode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Select</button>';

        var selectBar = '';
        if (licSelectMode) {
            var barActions = '';
            if (!isTrashed) {
                barActions = '<button class="btn btn-sm btn-success" data-action="bulk-activate"' + (licSelected.size === 0 ? ' disabled' : '') + '>Activate</button>' +
                    '<button class="btn btn-sm btn-warning" data-action="bulk-revoke"' + (licSelected.size === 0 ? ' disabled' : '') + '>Revoke</button>' +
                    '<button class="btn btn-sm btn-danger" data-action="bulk-delete"' + (licSelected.size === 0 ? ' disabled' : '') + '>Delete</button>';
            } else {
                barActions = '<button class="btn btn-sm btn-success" data-action="bulk-restore"' + (licSelected.size === 0 ? ' disabled' : '') + '>Restore</button>' +
                    '<button class="btn btn-sm btn-danger" data-action="bulk-force-delete"' + (licSelected.size === 0 ? ' disabled' : '') + '>Delete Forever</button>';
            }
            selectBar = '<div class="select-bar">' +
                '<div class="select-bar-info">' +
                '<div class="custom-checkbox ' + (licSelected.size > 0 ? 'checked' : '') + '" data-action="select-all-licenses"></div>' +
                '<span>' + licSelected.size + ' selected</span></div>' +
                '<div class="select-bar-actions">' + barActions + '</div></div>';
        }

        var rows = '';
        if (data.licenses && data.licenses.length) {
            rows = data.licenses.map(function (l) {
                var isSelected = licSelected.has(l.id);
                var checkCol = licSelectMode ? '<td style="width:40px"><div class="custom-checkbox ' + (isSelected ? 'checked' : '') + '" data-action="select-license" data-id="' + l.id + '"></div></td>' : '';

                var daysLeft = l.expires_at ? Math.ceil((new Date(l.expires_at) - Date.now()) / 86400000) : 0;
                var expiryText = daysLeft > 0 ? daysLeft + 'd left' : 'Expired';
                var expiryColor = daysLeft <= 0 ? 'var(--danger)' : daysLeft <= 3 ? 'var(--warning)' : 'var(--text-secondary)';

                var actions = '';
                if (isTrashed) {
                    actions = '<div class="action-group">' +
                        '<button class="btn btn-sm btn-success" data-action="restore-license" data-id="' + l.id + '" title="Restore"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>' +
                        '<button class="btn btn-sm btn-danger" data-action="permanent-delete-license" data-id="' + l.id + '" title="Delete Forever"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button></div>';
                } else {
                    var toggleBtn = l.status === 'active'
                        ? '<button class="btn btn-sm btn-warning" data-action="revoke-license" data-id="' + l.id + '" title="Revoke"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></button>'
                        : '<button class="btn btn-sm btn-success" data-action="activate-license" data-id="' + l.id + '" title="Activate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></button>';
                    actions = '<div class="action-group">' +
                        '<button class="btn btn-sm btn-secondary" data-action="view-license" data-id="' + l.id + '" title="Detail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>' +
                        '<button class="btn btn-sm btn-secondary" data-action="edit-license" data-id="' + l.id + '" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
                        toggleBtn +
                        '<button class="btn btn-sm btn-danger" data-action="delete-license" data-id="' + l.id + '" title="Trash"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div>';
                }

                var statusDisplay = isTrashed ? statusBadge('trashed') : statusBadge(l.status);

                return '<tr class="' + (isSelected ? 'selected' : '') + '">' +
                    checkCol +
                    '<td><div style="display:flex;align-items:center;gap:6px">' +
                    '<span class="license-key" data-action="copy" data-value="' + esc(l.license_key) + '" title="Copy License Key">' + esc(l.license_key) + '</span>' +
                    '<button class="btn btn-sm btn-secondary" style="padding:2px 6px;height:24px" data-action="copy" data-value="' + esc(serverUrl + '/r/' + l.license_key + '/repo.json') + '" title="Copy Repo URL">🔗</button>' +
                    '</div></td>' +
                    '<td>' + esc(l.name || '-') + '</td>' +
                    '<td>' + statusDisplay + '</td>' +
                    '<td><span class="badge badge-info">' + (l.device_count || 0) + '/' + l.max_devices + '</span></td>' +
                    '<td title="' + formatDate(l.expires_at) + '"><span style="color:' + expiryColor + '">' + expiryText + '</span></td>' +
                    '<td>' + timeAgo(l.created_at) + '</td>' +
                    '<td>' + actions + '</td></tr>';
            }).join('');
        }

        var checkAllCol = licSelectMode ? '<th style="width:40px"><div class="custom-checkbox ' + (licSelected.size > 0 ? 'checked' : '') + '" data-action="select-all-licenses"></div></th>' : '';
        var colspan = licSelectMode ? 8 : 7;

        c.innerHTML =
            '<div class="license-toolbar">' + filterTabsHtml +
            '<div class="toolbar-actions">' + searchBox('licSearchInput', 'Search licenses...', 'lic-search') + selectToggle + '</div></div>' +
            selectBar +
            '<div class="table-container"><table><thead><tr>' + checkAllCol +
            '<th>License Key</th><th>Name</th><th>Status</th><th>Devices</th><th>Expires</th><th>Created</th><th>Actions</th>' +
            '</tr></thead><tbody>' +
            (rows || '<tr><td colspan="' + colspan + '"><div class="empty-state"><p>' + (isTrashed ? 'Trash is empty' : 'No licenses found') + '</p></div></td></tr>') +
            '</tbody></table>' +
            '<div class="table-footer"><span>Showing ' + (data.licenses ? data.licenses.length : 0) + ' of ' + data.total + ' \u00B7 Page ' + page + ' of ' + (tp || 1) + '</span>' +
            pagBtns(page, tp, 'lic-page') + '</div></div>';

        // Restore search value
        var si = document.getElementById('licSearchInput');
        if (si) si.value = licSearch;
    } catch (e) {
        console.error('Render licenses error:', e);
        c.innerHTML = '<div class="empty-state"><p>Failed to load licenses</p></div>';
    }
}

// --- License Detail Modal ---
async function viewLicenseDetails(id) {
    openModal('<div class="loading-overlay"><div class="spinner"></div></div>');
    try {
        var d = await apiFetch('/api/admin/licenses/' + id + '/details');
        var settings = await apiFetch('/api/admin/settings');
        var serverUrl = settings.settings ? (settings.settings.server_url || window.location.origin) : window.location.origin;
        var repoUrl = serverUrl + '/r/' + d.license_key + '/repo.json';
        var daysLeft = d.expires_at ? Math.ceil((new Date(d.expires_at) - Date.now()) / 86400000) : 0;

        // Devices tab
        var devicesHtml = '<div class="empty-state"><p>No devices registered</p></div>';
        if (d.devices && d.devices.length) {
            devicesHtml = '<table style="font-size:12px"><thead><tr><th>Device</th><th>IP</th><th>Last Seen</th><th>Status</th></tr></thead><tbody>' +
                d.devices.map(function (dev) {
                    return '<tr><td>' + esc(dev.device_name || (dev.device_id ? dev.device_id.substring(0, 16) : '-')) + '</td>' +
                        '<td>' + esc(dev.ip_address) + '</td><td>' + timeAgo(dev.last_seen) + '</td>' +
                        '<td>' + (dev.is_blocked ? '<span class="badge badge-blocked">Blocked</span>' : '<span class="badge badge-active">Active</span>') + '</td></tr>';
                }).join('') + '</tbody></table>';
        }

        // Plugins tab
        var pluginHtml = '<div class="empty-state"><p>No plugin activity</p></div>';
        if (d.pluginUsage && d.pluginUsage.length) {
            pluginHtml = '<table style="font-size:12px"><thead><tr><th>Plugin</th><th>Action</th><th>Device</th><th>Time</th></tr></thead><tbody>' +
                d.pluginUsage.slice(0, 20).map(function (p) {
                    return '<tr><td>' + esc(p.plugin_name) + '</td><td><span class="badge badge-info">' + esc(p.action) + '</span></td>' +
                        '<td>' + esc(p.device_id ? p.device_id.substring(0, 12) : '-') + '</td><td>' + timeAgo(p.used_at) + '</td></tr>';
                }).join('') + '</tbody></table>';
        }

        // Logs tab
        var logsHtml = '<div class="empty-state"><p>No activity logs</p></div>';
        if (d.recentLogs && d.recentLogs.length) {
            logsHtml = '<table style="font-size:12px"><thead><tr><th>Action</th><th>IP</th><th>Details</th><th>Time</th></tr></thead><tbody>' +
                d.recentLogs.slice(0, 20).map(function (lg) {
                    return '<tr><td><span class="badge badge-info">' + esc(lg.action) + '</span></td>' +
                        '<td>' + esc(lg.ip_address) + '</td>' +
                        '<td title="' + esc(lg.details) + '">' + esc(lg.details ? lg.details.substring(0, 30) : '-') + '</td>' +
                        '<td>' + timeAgo(lg.created_at) + '</td></tr>';
                }).join('') + '</tbody></table>';
        }

        var mc = document.getElementById('modalContent');
        mc.className = 'modal modal-lg';
        mc.innerHTML =
            '<div class="modal-header"><h3>License Details</h3>' +
            '<button class="btn-icon" data-action="close-modal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
            '<div class="modal-body" style="padding:0">' +
            // Key header
            '<div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
            '<div><div style="font-family:monospace;font-size:15px;font-weight:600;color:var(--accent);margin-bottom:4px">' + esc(d.license_key) + '</div>' +
            '<div style="font-size:12px;color:var(--text-muted)">' + esc(d.name || 'Unnamed License') + '</div></div>' +
            '<div style="display:flex;gap:8px;align-items:center">' + statusBadge(d.status) +
            '<span style="font-size:13px;color:' + (daysLeft > 0 ? 'var(--success)' : 'var(--danger)') + '">' + (daysLeft > 0 ? daysLeft + 'd left' : 'Expired') + '</span></div></div>' +
            // Info grid
            '<div style="padding:20px 24px">' +
            '<div class="info-grid">' +
            '<div class="info-item"><div class="info-label">Status</div><div class="info-value">' + statusBadge(d.status) + '</div></div>' +
            '<div class="info-item"><div class="info-label">Max Devices</div><div class="info-value">' + d.max_devices + '</div></div>' +
            '<div class="info-item"><div class="info-label">Devices Used</div><div class="info-value">' + (d.devices ? d.devices.length : 0) + '</div></div>' +
            '<div class="info-item"><div class="info-label">Expires</div><div class="info-value">' + formatDate(d.expires_at) + '</div></div>' +
            '<div class="info-item"><div class="info-label">Created</div><div class="info-value">' + formatDate(d.created_at) + '</div></div>' +
            '<div class="info-item"><div class="info-label">Note</div><div class="info-value">' + esc(d.note || '-') + '</div></div></div>' +
            // Repo URL
            '<div style="background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:16px">' +
            '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px">Repository URL</div>' +
            '<div style="display:flex;align-items:center;gap:8px">' +
            '<code style="font-size:12px;color:var(--success);word-break:break-all;flex:1">' + esc(repoUrl) + '</code>' +
            '<button class="btn btn-sm btn-secondary" data-action="copy" data-value="' + esc(repoUrl) + '">Copy</button></div></div>' +
            // Tabs
            '<div class="inline-tabs">' +
            '<button class="inline-tab active" data-action="detail-tab" data-value="devices">Devices (' + (d.devices ? d.devices.length : 0) + ')</button>' +
            '<button class="inline-tab" data-action="detail-tab" data-value="plugins">Plugins (' + (d.pluginUsage ? d.pluginUsage.length : 0) + ')</button>' +
            '<button class="inline-tab" data-action="detail-tab" data-value="logs">Logs (' + (d.recentLogs ? d.recentLogs.length : 0) + ')</button></div>' +
            '<div class="tab-panel active" data-tab="devices">' + devicesHtml + '</div>' +
            '<div class="tab-panel" data-tab="plugins">' + pluginHtml + '</div>' +
            '<div class="tab-panel" data-tab="logs">' + logsHtml + '</div></div></div>' +
            // Footer
            '<div class="modal-footer">' +
            (d.status === 'active' ? '<button class="btn btn-warning btn-sm" data-action="revoke-license" data-id="' + d.id + '">Revoke</button>' : '<button class="btn btn-success btn-sm" data-action="activate-license" data-id="' + d.id + '">Activate</button>') +
            '<button class="btn btn-secondary btn-sm" data-action="edit-license" data-id="' + d.id + '">Edit</button>' +
            '<button class="btn btn-danger btn-sm" data-action="delete-license" data-id="' + d.id + '">Delete</button>' +
            '<button class="btn btn-secondary btn-sm" data-action="close-modal">Close</button></div>';
    } catch (e) {
        console.error('License detail error:', e);
        document.getElementById('modalContent').innerHTML = '<div class="modal-body"><div class="empty-state"><p>Failed to load details</p></div></div>';
    }
}

// --- Revoke / Activate ---
async function revokeLicense(id) {
    const ok = await confirmAction({
        title: 'Revoke License',
        message: 'Users will lose access immediately. This can be undone later.',
        icon: '🚫',
        iconType: 'warning',
        confirmText: 'Revoke',
        confirmClass: 'btn-warning'
    });
    if (!ok) return;
    try {
        await apiFetch('/api/admin/licenses/' + id, { method: 'PUT', body: JSON.stringify({ action: 'revoke' }) });
        toast('License revoked', 'success');
        closeModal();
        renderLicenses(licPage);
    } catch (e) { toast('Error revoking license', 'error'); }
}

async function activateLicense(id) {
    const ok = await confirmAction({
        title: 'Activate License',
        message: 'This will restore access for this license.',
        icon: '✓',
        iconType: 'info',
        confirmText: 'Activate',
        confirmClass: 'btn-success'
    });
    if (!ok) return;
    try {
        await apiFetch('/api/admin/licenses/' + id, { method: 'PUT', body: JSON.stringify({ action: 'activate' }) });
        toast('License activated', 'success');
        closeModal();
        renderLicenses(licPage);
    } catch (e) { toast('Error activating license', 'error'); }
}

// --- Soft Delete (to Trash) ---
async function deleteLicense(id) {
    const ok = await confirmAction({
        title: 'Move to Trash',
        message: 'This license will be moved to trash. You can restore it later.',
        icon: '🗑️',
        iconType: 'warning',
        confirmText: 'Delete',
        confirmClass: 'btn-danger'
    });
    if (!ok) return;
    try {
        await apiFetch('/api/admin/licenses/' + id, { method: 'DELETE' });
        toast('License moved to trash', 'success');
        closeModal();
        renderLicenses(licPage);
    } catch (e) { toast('Error deleting license', 'error'); }
}

// --- Restore from Trash ---
async function restoreLicense(id) {
    try {
        await apiFetch('/api/admin/licenses/' + id, { method: 'PUT', body: JSON.stringify({ action: 'restore' }) });
        toast('License restored', 'success');
        renderLicenses(licPage);
    } catch (e) { toast('Error restoring license', 'error'); }
}

// --- Permanent Delete ---
async function permanentDeleteLicense(id) {
    const ok = await confirmAction({
        title: 'Delete Forever',
        message: 'This will PERMANENTLY delete this license and ALL its data. This cannot be undone!',
        icon: '⚠',
        iconType: 'danger',
        confirmText: 'Delete Forever',
        confirmClass: 'btn-danger'
    });
    if (!ok) return;
    try {
        await apiFetch('/api/admin/licenses/' + id + '?force=true', { method: 'DELETE' });
        toast('License permanently deleted', 'success');
        renderLicenses(licPage);
    } catch (e) { toast('Error deleting license', 'error'); }
}

// --- Edit License Modal ---
async function openEditLicenseModal(id) {
    openModal('<div class="loading-overlay"><div class="spinner"></div></div>');
    try {
        var d = await apiFetch('/api/admin/licenses/' + id + '/details');
        var expDate = d.expires_at ? new Date(d.expires_at).toISOString().slice(0, 16) : '';

        var mc = document.getElementById('modalContent');
        mc.className = 'modal';
        mc.innerHTML =
            '<div class="modal-header"><h3>Edit License</h3>' +
            '<button class="btn-icon" data-action="close-modal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
            '<div class="modal-body">' +
            '<div style="background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:20px;font-family:monospace;font-size:13px;color:var(--accent)">' + esc(d.license_key) + '</div>' +
            '<div class="form-group"><label>Name</label><input type="text" id="editLicName" value="' + esc(d.name || '') + '"></div>' +
            '<div class="form-group"><label>Note</label><textarea id="editLicNote" rows="2" style="resize:vertical">' + esc(d.note || '') + '</textarea></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
            '<div class="form-group"><label>Max Devices</label><input type="number" id="editLicMaxDev" value="' + d.max_devices + '" min="1" max="100"></div>' +
            '<div class="form-group"><label>Status</label>' +
            '<select id="editLicStatus">' +
            '<option value="active"' + (d.status === 'active' ? ' selected' : '') + '>Active</option>' +
            '<option value="revoked"' + (d.status === 'revoked' ? ' selected' : '') + '>Revoked</option>' +
            '<option value="expired"' + (d.status === 'expired' ? ' selected' : '') + '>Expired</option>' +
            '</select></div></div>' +
            '<div class="form-group"><label>Expiry Date</label><input type="datetime-local" id="editLicExpiry" value="' + expDate + '"></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" data-action="close-modal">Cancel</button>' +
            '<button class="btn btn-primary" data-action="edit-license-save" data-id="' + d.id + '">Save Changes</button></div>';
    } catch (e) {
        toast('Error loading license', 'error');
        closeModal();
    }
}

async function saveEditLicense(id) {
    var name = document.getElementById('editLicName').value;
    var note = document.getElementById('editLicNote').value;
    var maxDevices = parseInt(document.getElementById('editLicMaxDev').value) || 2;
    var status = document.getElementById('editLicStatus').value;
    var expiryVal = document.getElementById('editLicExpiry').value;
    var expiresAt = expiryVal ? new Date(expiryVal).toISOString() : undefined;

    try {
        await apiFetch('/api/admin/licenses/' + id, {
            method: 'PUT',
            body: JSON.stringify({ name: name, note: note, max_devices: maxDevices, status: status, expires_at: expiresAt })
        });
        toast('License updated', 'success');
        closeModal();
        renderLicenses(licPage);
    } catch (e) { toast('Error saving license', 'error'); }
}

// --- Create License Modal ---
function openCreateLicenseModal() {
    var mc = document.getElementById('modalContent');
    mc.className = 'modal';
    openModal(
        '<div class="modal-header"><h3>Create License</h3>' +
        '<button class="btn-icon" data-action="close-modal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
        '<div class="modal-body">' +
        '<div class="form-group"><label>Customer Name (optional)</label><input type="text" id="createLicName" placeholder="e.g. John Doe"></div>' +
        '<div class="form-group"><label>Note (optional)</label><textarea id="createLicNote" rows="2" style="resize:vertical" placeholder="Internal notes"></textarea></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
        '<div class="form-group"><label>Duration (days)</label><input type="number" id="createLicDuration" value="30" min="1" max="3650"></div>' +
        '<div class="form-group"><label>Max Devices</label><input type="number" id="createLicMaxDev" value="2" min="1" max="100"></div></div>' +
        '<div class="form-group"><label>Bulk Count (1 = single key)</label><input type="number" id="createLicCount" value="1" min="1" max="100"></div>' +
        '</div>' +
        '<div class="modal-footer">' +
        '<button class="btn btn-secondary" data-action="close-modal">Cancel</button>' +
        '<button class="btn btn-primary" data-action="create-license">Create</button></div>'
    );
}

async function createLicense() {
    var name = document.getElementById('createLicName').value;
    var note = document.getElementById('createLicNote').value;
    var duration = parseInt(document.getElementById('createLicDuration').value) || 30;
    var maxDev = parseInt(document.getElementById('createLicMaxDev').value) || 2;
    var count = parseInt(document.getElementById('createLicCount').value) || 1;

    try {
        var res = await apiFetch('/api/admin/licenses', {
            method: 'POST',
            body: JSON.stringify({ duration_days: duration, name: name, note: note, max_devices: maxDev, count: count })
        });
        if (res.status === 'ok') {
            // Fetch settings to get server URL
            const settingsRes = await apiFetch('/api/admin/settings');
            const rawServerUrl = (settingsRes.settings && settingsRes.settings.server_url) ? settingsRes.settings.server_url : window.location.origin;
            const serverUrl = rawServerUrl.replace(/\/+$/, '');

            if (res.keys) {
                var keysList = res.keys.map(function (k) {
                    var url = serverUrl + '/r/' + k + '/repo.json';
                    return '<div style="border-bottom:1px solid var(--border);padding:8px 0">' +
                        '<div style="font-family:monospace;font-size:12px;color:var(--accent)">' + esc(k) + '</div>' +
                        '<div style="font-size:11px;color:var(--text-muted);word-break:break-all;margin-top:2px">' + esc(url) + '</div>' +
                        '</div>';
                }).join('');

                var allUrls = res.keys.map(k => serverUrl + '/r/' + k + '/repo.json').join('\n');

                document.getElementById('modalContent').innerHTML =
                    '<div class="modal-header"><h3>\u2705 ' + res.keys.length + ' Licenses Created</h3>' +
                    '<button class="btn-icon" data-action="close-modal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
                    '<div class="modal-body" style="max-height:50vh;overflow-y:auto">' +
                    '<button class="btn btn-sm btn-secondary" data-action="copy" data-value="' + esc(allUrls) + '" style="margin-bottom:12px">Copy All URLs</button>' +
                    keysList + '</div>' +
                    '<div class="modal-footer"><button class="btn btn-primary" data-action="close-modal">Done</button></div>';
            } else {
                var url = serverUrl + '/r/' + res.key + '/repo.json';
                document.getElementById('modalContent').innerHTML =
                    '<div class="modal-header"><h3>\u2705 License Created</h3>' +
                    '<button class="btn-icon" data-action="close-modal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
                    '<div class="modal-body">' +
                    '<div style="background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:16px;">' +
                    '<div style="margin-bottom:12px">' +
                    '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">License Key</div>' +
                    '<div style="font-family:monospace;font-size:14px;color:var(--accent);font-weight:600">' +
                    esc(res.key) +
                    '</div></div>' +
                    '<div>' +
                    '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Repository URL</div>' +
                    '<div style="font-family:monospace;font-size:12px;color:var(--success);word-break:break-all;background:rgba(0,0,0,0.2);padding:8px;border-radius:4px;margin-bottom:8px">' + esc(url) + '</div>' +
                    '<button class="btn btn-sm btn-primary" style="width:100%" data-action="copy" data-value="' + esc(url) + '">📋 Copy Full Repository URL</button>' +
                    '</div>' +
                    '</div></div>' +
                    '<div class="modal-footer"><button class="btn btn-primary" data-action="close-modal">Done</button></div>';
            }
            renderLicenses(1);
            toast('License(s) created!', 'success');
        } else {
            toast(res.message || 'Create failed', 'error');
        }
    } catch (e) { toast('Error creating license', 'error'); }
}

// --- Bulk Actions ---
async function bulkAction(action) {
    if (licSelected.size === 0) { toast('No licenses selected', 'error'); return; }
    var labels = { revoke: 'Revoke', activate: 'Activate', delete: 'Move to Trash', force_delete: 'Delete Forever', restore: 'Restore' };
    var icons = { revoke: '🚫', activate: '✓', delete: '🗑️', force_delete: '⚠', restore: '↩' };
    var types = { revoke: 'warning', activate: 'info', delete: 'warning', force_delete: 'danger', restore: 'info' };
    var classes = { revoke: 'btn-warning', activate: 'btn-success', delete: 'btn-danger', force_delete: 'btn-danger', restore: 'btn-success' };
    const ok = await confirmAction({
        title: (labels[action] || action) + ' ' + licSelected.size + ' License(s)',
        message: 'This will ' + (labels[action] || action).toLowerCase() + ' all ' + licSelected.size + ' selected license(s).',
        icon: icons[action] || '⚠',
        iconType: types[action] || 'warning',
        confirmText: labels[action] || action,
        confirmClass: classes[action] || 'btn-danger'
    });
    if (!ok) return;

    try {
        if (action === 'restore') {
            for (var id of licSelected) {
                await apiFetch('/api/admin/licenses/' + id, { method: 'PUT', body: JSON.stringify({ action: 'restore' }) });
            }
        } else {
            await apiFetch('/api/admin/licenses/bulk', {
                method: 'POST',
                body: JSON.stringify({ ids: Array.from(licSelected), action: action })
            });
        }
        toast(licSelected.size + ' license(s) ' + action + 'd', 'success');
        licSelected.clear();
        renderLicenses(licPage);
    } catch (e) { toast('Bulk action failed', 'error'); }
}

// ============================================================
// DEVICES
// ============================================================

async function renderDevices(page = 1) {
    devPage = page;
    const c = document.getElementById('pageContent');
    document.getElementById('headerActions').innerHTML = '';
    c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
        const data = await apiFetch(`/api/admin/devices?page=${page}&limit=20&search=${encodeURIComponent(devSearch)}`);
        const tp = Math.ceil(data.total / data.limit);

        let rows = data.devices?.length ? data.devices.map(d => `<tr>
            <td>${esc(d.device_name || d.device_id?.substring(0, 16) || '-')}</td>
            <td><span class="license-key" data-action="copy" data-value="${esc(d.license_key)}">${esc(d.license_key?.substring(0, 15))}</span></td>
            <td>${esc(d.ip_address)}</td>
            <td>${timeAgo(d.last_seen)}</td>
            <td>${d.is_blocked ? '<span class="badge badge-blocked">Blocked</span>' : '<span class="badge badge-active">Active</span>'}</td>
            <td>
                ${d.is_blocked
                ? `<button class="btn btn-sm btn-success" data-action="unblock-device" data-id="${d.id}">Unblock</button>`
                : `<button class="btn btn-sm btn-danger" data-action="block-device" data-id="${d.id}">Block</button>`}
                <button class="btn btn-sm btn-secondary" data-action="delete-device" data-id="${d.id}">Delete</button>
            </td>
        </tr>`).join('') : '';

        c.innerHTML = `<div class="table-container">
            <div class="table-header"><h3>All Devices (${data.total})</h3><div class="table-actions">${searchBox('devSearchInput', 'Search devices...', 'dev-search')}</div></div>
            <table><thead><tr><th>Device</th><th>License</th><th>IP</th><th>Last Seen</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6"><div class="empty-state"><p>No devices found</p></div></td></tr>'}</tbody></table>
            <div class="table-footer"><span>Page ${page} of ${tp || 1}</span>${pagBtns(page, tp, 'dev-page')}</div>
        </div>`;
    } catch (e) { c.innerHTML = '<div class="empty-state"><p>Failed to load devices</p></div>'; }
}

async function deviceAction(id, action) {
    if (action === 'delete' && !confirm('Delete this device?')) return;
    if (action === 'block' && !confirm('Block this device?')) return;
    try {
        await apiFetch(`/api/admin/devices/${id}`, { method: 'PUT', body: JSON.stringify({ action }) });
        toast(`Device ${action}ed`, 'success');
        renderDevices(devPage);
    } catch (e) { toast('Error', 'error'); }
}

// ============================================================
// LIVE ACTIVITY FEED
// ============================================================

let activityRefreshInterval = null;

async function renderActivityFeed() {
    const c = document.getElementById('pageContent');
    document.getElementById('headerActions').innerHTML = '<button class="btn btn-sm btn-secondary" data-action="refresh-activity"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Refresh</button>';
    c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

    try {
        const data = await apiFetch('/api/admin/activity-feed?minutes=60&limit=200');

        const actionColors = {
            'HOME': 'badge-info', 'OPEN': 'badge-info', 'SEARCH': 'badge-active',
            'LOAD': 'badge-active', 'PLAY': 'badge-warning', 'DOWNLOAD': 'badge-expired',
            'SWITCH': 'badge-info'
        };

        const actionIcons = {
            'HOME': '🏠', 'OPEN': '📂', 'SEARCH': '🔍', 'LOAD': '📄',
            'PLAY': '▶️', 'DOWNLOAD': '⬇️', 'SWITCH': '🔄', 'playback': '🎬'
        };

        let feedHtml = '';
        if (data.feed && data.feed.length) {
            feedHtml = '<div class="activity-feed">' + data.feed.map(item => {
                const isPlayback = item.type === 'playback';
                const actionBadge = isPlayback
                    ? '<span class="badge badge-warning">PLAY</span>'
                    : '<span class="badge ' + (actionColors[item.action] || 'badge-info') + '">' + esc(item.action) + '</span>';
                const icon = isPlayback ? actionIcons['playback'] : (actionIcons[item.action] || '📋');
                const detail = isPlayback
                    ? '<span style="color:var(--text-primary);font-weight:500">' + esc(item.video_title || '') + '</span> <span style="color:var(--text-muted)">via</span> ' + esc(item.plugin_name)
                    : '<span style="color:var(--text-primary);font-weight:500">' + esc(item.plugin_name) + '</span>';
                const source = isPlayback && item.source_provider === 'DOWNLOAD' ? ' <span class="badge badge-expired">DL</span>' : '';
                // Device label: prefer device_name, fallback to shortened device_id
                const deviceLabel = (item.device_name && item.device_name.trim())
                    ? item.device_name
                    : (item.device_id ? item.device_id.substring(0, 14) : '');
                const deviceBit = deviceLabel ? ' · 📱 <span style="color:var(--text-secondary)">' + esc(deviceLabel) + '</span>' : '';

                return '<div class="activity-item">' +
                    '<div class="activity-icon">' + icon + '</div>' +
                    '<div class="activity-body">' +
                    '<div class="activity-main">' + actionBadge + ' ' + detail + source + '</div>' +
                    '<div class="activity-meta">' +
                    '<span class="license-key" data-action="copy" data-value="' + esc(item.license_key) + '" title="Click to copy">' + esc(item.license_name || item.license_key?.substring(0, 12)) + '</span>' +
                    deviceBit +
                    ' · ' + esc(item.ip_address) +
                    ' · ' + timeAgo(item.timestamp) +
                    '</div></div></div>';
            }).join('') + '</div>';
        } else {
            feedHtml = '<div class="empty-state"><p>No activity in the last 60 minutes</p></div>';
        }

        // Summary stats
        const plays = data.feed ? data.feed.filter(f => f.type === 'playback' || f.action === 'PLAY').length : 0;
        const searches = data.feed ? data.feed.filter(f => f.action === 'SEARCH').length : 0;
        const downloads = data.feed ? data.feed.filter(f => f.source_provider === 'DOWNLOAD').length : 0;
        const uniqueUsers = data.feed ? new Set(data.feed.map(f => f.license_key)).size : 0;

        c.innerHTML = `
            <div class="stats-grid" style="margin-bottom:20px">
                <div class="stat-card mini">
                    <div class="stat-card-value">${data.count || 0}</div>
                    <div class="stat-card-label">Total Events</div>
                </div>
                <div class="stat-card mini">
                    <div class="stat-card-value">${uniqueUsers}</div>
                    <div class="stat-card-label">Active Users</div>
                </div>
                <div class="stat-card mini">
                    <div class="stat-card-value">${plays}</div>
                    <div class="stat-card-label">Plays</div>
                </div>
                <div class="stat-card mini">
                    <div class="stat-card-value">${searches}</div>
                    <div class="stat-card-label">Searches</div>
                </div>
                <div class="stat-card mini">
                    <div class="stat-card-value">${downloads}</div>
                    <div class="stat-card-label">Downloads</div>
                </div>
            </div>
            <div class="table-container">
                <div class="table-header">
                    <h3>Live Feed <span class="badge badge-active" style="font-size:11px;animation:pulse 2s infinite">● LIVE</span></h3>
                    <div class="table-actions"><span style="color:var(--text-muted);font-size:12px">Auto-refreshes every 30s</span></div>
                </div>
                ${feedHtml}
            </div>
        `;

        // Auto refresh every 30s
        if (!activityRefreshInterval) {
            activityRefreshInterval = setInterval(() => {
                if (currentPage === 'activity') renderActivityFeed();
            }, 30000);
        }
    } catch (e) {
        console.error('Activity feed error:', e);
        c.innerHTML = '<div class="empty-state"><p>Failed to load activity feed</p></div>';
    }
}

// ============================================================
// ACTIVE SESSIONS
// ============================================================

async function renderActiveSessions() {
    const c = document.getElementById('pageContent');
    document.getElementById('headerActions').innerHTML = '<button class="btn btn-sm btn-secondary" data-action="refresh-sessions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Refresh</button>';
    c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

    try {
        const data = await apiFetch('/api/admin/active-sessions');

        let rows = '';
        if (data.sessions && data.sessions.length) {
            rows = data.sessions.map(s => {
                const isExpiring = s.ttl_minutes < 30;
                const ttlColor = isExpiring ? 'var(--warning)' : 'var(--success)';
                return '<tr>' +
                    '<td><span class="badge badge-active">● Online</span></td>' +
                    '<td>' + esc(s.ip) + '</td>' +
                    '<td><span class="license-key" data-action="copy" data-value="' + esc(s.license_key) + '" title="Click to copy">' + esc(s.license_key.substring(0, 16)) + '</span></td>' +
                    '<td>' + esc(s.license_name || '-') + '</td>' +
                    '<td>' + statusBadge(s.status) + '</td>' +
                    '<td><span style="color:' + ttlColor + '">' + s.ttl_minutes + ' min</span></td>' +
                    '<td><button class="btn btn-sm btn-secondary" data-action="view-user-activity" data-value="' + esc(s.license_key) + '">Activity</button></td>' +
                    '</tr>';
            }).join('');
        }

        c.innerHTML = `
            <div class="stats-grid" style="margin-bottom:20px">
                <div class="stat-card mini">
                    <div class="stat-card-value">${data.count || 0}</div>
                    <div class="stat-card-label">Active Sessions</div>
                </div>
            </div>
            <div class="table-container">
                <div class="table-header"><h3>Connected Users</h3></div>
                <table><thead><tr>
                    <th>Status</th><th>IP Address</th><th>License Key</th><th>Name</th>
                    <th>License Status</th><th>Session TTL</th><th>Actions</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="7"><div class="empty-state"><p>No active sessions</p></div></td></tr>'}</tbody></table>
            </div>
        `;
    } catch (e) {
        console.error('Active sessions error:', e);
        c.innerHTML = '<div class="empty-state"><p>Failed to load sessions</p></div>';
    }
}

// ============================================================
// PLUGIN USAGE
// ============================================================

async function renderPluginUsage(page = 1) {
    puPage = page;
    const c = document.getElementById('pageContent');
    document.getElementById('headerActions').innerHTML = '';
    c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
        const data = await apiFetch(`/api/admin/plugin-usage?page=${page}&limit=50&search=${encodeURIComponent(puSearch)}`);
        const tp = Math.ceil(data.total / data.limit);
        let rows = data.logs?.length ? data.logs.map(l => `<tr>
            <td>${esc(l.plugin_name)}</td>
            <td><span class="badge badge-info">${esc(l.action)}</span></td>
            <td><span class="license-key" data-action="copy" data-value="${esc(l.license_key)}">${esc(l.license_name || l.license_key?.substring(0, 15))}</span></td>
            <td title="${esc(l.device_id)}">${esc(l.device_name || l.device_id?.substring(0, 16) || '-')}</td>
            <td>${esc(l.ip_address)}</td>
            <td>${timeAgo(l.used_at)}</td>
        </tr>`).join('') : '';

        c.innerHTML = `<div class="table-container">
            <div class="table-header"><h3>Plugin Activity (${data.total})</h3><div class="table-actions">${searchBox('puSearchInput', 'Search plugins/devices...', 'pu-search')}</div></div>
            <table><thead><tr><th>Plugin</th><th>Action</th><th>License</th><th>Device</th><th>IP</th><th>Time</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6"><div class="empty-state"><p>No plugin activity</p></div></td></tr>'}</tbody></table>
            <div class="table-footer"><span>Page ${page} of ${tp || 1}</span>${pagBtns(page, tp, 'pu-page')}</div>
        </div>`;
    } catch (e) { c.innerHTML = '<div class="empty-state"><p>Failed to load plugin usage</p></div>'; }
}

// ============================================================
// PLAYBACK LOGS
// ============================================================

async function renderPlaybackLogs(page = 1) {
    pbPage = page;
    const c = document.getElementById('pageContent');
    document.getElementById('headerActions').innerHTML = '';
    c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
        const data = await apiFetch(`/api/admin/playback-logs?page=${page}&limit=50&search=${encodeURIComponent(pbSearch)}`);
        const tp = Math.ceil(data.total / data.limit);
        let rows = data.logs?.length ? data.logs.map(l => `<tr>
            <td title="${esc(l.video_title)}">${esc(l.video_title?.substring(0, 40))}</td>
            <td>${esc(l.plugin_name)}</td>
            <td>${esc(l.source_provider || '-')}</td>
            <td><span class="license-key" data-action="copy" data-value="${esc(l.license_key)}">${esc(l.license_name || l.license_key?.substring(0, 15))}</span></td>
            <td title="${esc(l.device_id)}">${esc(l.device_name || l.device_id?.substring(0, 16) || '-')}</td>
            <td>${esc(l.ip_address)}</td>
            <td>${timeAgo(l.played_at)}</td>
        </tr>`).join('') : '';

        c.innerHTML = `<div class="table-container">
            <div class="table-header"><h3>Playback History (${data.total})</h3><div class="table-actions">${searchBox('pbSearchInput', 'Search videos/devices...', 'pb-search')}</div></div>
            <table><thead><tr><th>Video Title</th><th>Plugin</th><th>Source</th><th>License</th><th>Device</th><th>IP</th><th>Time</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7"><div class="empty-state"><p>No playback logs</p></div></td></tr>'}</tbody></table>
            <div class="table-footer"><span>Page ${page} of ${tp || 1}</span>${pagBtns(page, tp, 'pb-page')}</div>
        </div>`;
    } catch (e) { c.innerHTML = '<div class="empty-state"><p>Failed to load playback logs</p></div>'; }
}

// ============================================================
// ACCESS LOGS
// ============================================================

async function renderAccessLogs(page = 1) {
    alPage = page;
    const c = document.getElementById('pageContent');
    document.getElementById('headerActions').innerHTML = '';
    c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
        const data = await apiFetch(`/api/admin/logs?page=${page}&limit=50&search=${encodeURIComponent(alSearch)}`);
        const tp = Math.ceil(data.total / data.limit);
        let rows = data.logs?.length ? data.logs.map(l => `<tr>
            <td><span class="badge badge-info">${esc(l.action)}</span></td>
            <td>${l.license_key ? `<span class="license-key" data-action="copy" data-value="${esc(l.license_key)}">${esc(l.license_name || l.license_key?.substring(0, 15))}</span>` : '-'}</td>
            <td title="${esc(l.device_id)}">${esc(l.device_name || l.device_id?.substring(0, 16) || '-')}</td>
            <td>${esc(l.ip_address)}</td>
            <td title="${esc(l.details)}">${esc(l.details?.substring(0, 60) || '-')}</td>
            <td>${timeAgo(l.created_at)}</td>
        </tr>`).join('') : '';

        c.innerHTML = `<div class="table-container">
            <div class="table-header"><h3>Access Logs (${data.total})</h3><div class="table-actions">${searchBox('alSearchInput', 'Search logs/devices...', 'al-search')}</div></div>
            <table><thead><tr><th>Action</th><th>License</th><th>Device</th><th>IP</th><th>Details</th><th>Time</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6"><div class="empty-state"><p>No logs</p></div></td></tr>'}</tbody></table>
            <div class="table-footer"><span>Page ${page} of ${tp || 1}</span>${pagBtns(page, tp, 'al-page')}</div>
        </div>`;
    } catch (e) { c.innerHTML = '<div class="empty-state"><p>Failed to load logs</p></div>'; }
}

// ============================================================
// SECURITY
// ============================================================

async function renderSecurity() {
    const c = document.getElementById('pageContent');
    document.getElementById('headerActions').innerHTML = '';
    c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
        const [failedRes, blockedRes] = await Promise.all([
            apiFetch('/api/admin/security/failed-logins'),
            apiFetch('/api/admin/security/blocked-ips')
        ]);

        let failedRows = failedRes.logs?.length
            ? failedRes.logs.map(l => `<tr><td>${esc(l.ip_address)}</td><td>${l.attempt_count}</td><td>${formatDate(l.last_attempt)}</td></tr>`).join('')
            : '<tr><td colspan="3"><div class="empty-state"><p>No failed logins</p></div></td></tr>';

        let blockedRows = blockedRes.ips?.length
            ? blockedRes.ips.map(ip => `<tr><td>${esc(ip.ip_address)}</td><td>${esc(ip.reason || '-')}</td><td>${formatDate(ip.created_at)}</td><td><button class="btn btn-sm btn-success" data-action="unblock-ip" data-value="${esc(ip.ip_address)}">Unblock</button></td></tr>`).join('')
            : '<tr><td colspan="4"><div class="empty-state"><p>No blocked IPs</p></div></td></tr>';

        c.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
            <div class="table-container">
                <div class="table-header"><h3>Failed Login Attempts</h3></div>
                <table><thead><tr><th>IP</th><th>Attempts</th><th>Last Attempt</th></tr></thead><tbody>${failedRows}</tbody></table>
            </div>
            <div class="table-container">
                <div class="table-header"><h3>Blocked IPs</h3><button class="btn btn-sm btn-danger" data-action="open-block-ip-modal">Block IP</button></div>
                <table><thead><tr><th>IP</th><th>Reason</th><th>Blocked At</th><th>Action</th></tr></thead><tbody>${blockedRows}</tbody></table>
            </div>
        </div>`;
    } catch (e) { c.innerHTML = '<div class="empty-state"><p>Failed to load security data</p></div>'; }
}

function openBlockIPModal() {
    openModal(`
        <div class="modal-header"><h3>Block IP Address</h3><button class="btn-icon" data-action="close-modal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div class="modal-body">
            <div class="form-group"><label>IP Address</label><input type="text" id="blockIpAddr" placeholder="192.168.1.1"></div>
            <div class="form-group"><label>Reason</label><input type="text" id="blockIpReason" placeholder="Optional reason"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
            <button class="btn btn-danger" data-action="block-ip-confirm">Block</button>
        </div>
    `);
}

async function blockIPConfirm() {
    const ip = document.getElementById('blockIpAddr').value;
    const reason = document.getElementById('blockIpReason').value;
    if (!ip) { toast('IP required', 'error'); return; }
    try {
        await apiFetch('/api/admin/security/block-ip', { method: 'POST', body: JSON.stringify({ ip, reason }) });
        toast('IP blocked', 'success');
        closeModal();
        renderSecurity();
    } catch (e) { toast('Error', 'error'); }
}

async function unblockIP(ip) {
    const ok = await confirmAction({
        title: 'Unblock IP',
        message: `Remove <strong>${ip}</strong> from the block list?`,
        icon: '🔓',
        iconType: 'info',
        confirmText: 'Unblock',
        confirmClass: 'btn-success'
    });
    if (!ok) return;
    try {
        await apiFetch('/api/admin/security/unblock-ip', { method: 'POST', body: JSON.stringify({ ip }) });
        toast('IP unblocked', 'success');
        renderSecurity();
    } catch (e) { toast('Error', 'error'); }
}

// ============================================================
// SETTINGS — with repo/GitHub integration guide
// ============================================================

async function renderSettings() {
    const c = document.getElementById('pageContent');
    document.getElementById('headerActions').innerHTML = '';
    c.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
        const data = await apiFetch('/api/admin/settings');
        const s = data.settings || {};
        const serverUrl = cleanServerUrl(s.server_url || window.location.origin);

        // Parse upstream URLs
        let upstreamUrls = [];
        try {
            if (s.upstream_urls) upstreamUrls = JSON.parse(s.upstream_urls);
            else if (s.upstream_plugins_url) upstreamUrls = [{ url: s.upstream_plugins_url, active: true }];
        } catch (e) { }

        if (!upstreamUrls.length) upstreamUrls = [{ url: '', active: true }];

        const repoRows = upstreamUrls.map((u, i) => `
            <div class="repo-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
                <input type="text" class="repo-url-input" value="${esc(u.url)}" placeholder="https://..." style="flex:1">
                <button class="btn btn-sm btn-secondary" onclick="testRepo(this)">Test</button>
                <button class="btn btn-sm btn-danger" onclick="this.closest('.repo-row').remove()">✖</button>
            </div>
        `).join('');

        c.innerHTML = `
            <div style="max-width:700px">
                <!-- HOW IT WORKS -->
                <div class="table-container" style="margin-bottom:24px">
                    <div class="table-header"><h3>🔗 How Plugin Access Works</h3></div>
                    <div style="padding:20px;font-size:13px;line-height:1.8;color:var(--text-secondary)">
                        <div style="display:grid;grid-template-columns:auto 1fr;gap:12px 16px;align-items:start">
                            <span style="background:var(--accent);color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">1</span>
                            <div><strong style="color:var(--text-primary)">GitHub builds your plugins</strong><br>Your GitHub Actions workflow in <code>${esc(s.github_repo || 'Makairamei/CS')}</code> builds plugins into the <code>builds</code> branch, creating a <code>plugins.json</code> file.</div>

                            <span style="background:var(--accent);color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">2</span>
                            <div><strong style="color:var(--text-primary)">This server gates access</strong><br>Each license key gets a unique repo URL: <code style="color:var(--success)">${esc(serverUrl)}/r/{LICENSE_KEY}/repo.json</code><br>This server fetches plugins from your upstream repositories and serves them — only if the license is valid.</div>

                            <span style="background:var(--accent);color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">3</span>
                            <div><strong style="color:var(--text-primary)">User installs in CloudStream</strong><br>User goes to <strong>CloudStream → Settings → Extensions → Add Repository</strong> → pastes their unique repo URL → plugins appear.</div>
                        </div>
                    </div>
                </div>

                <!-- SERVER CONFIG -->
                <div class="table-container" style="margin-bottom:24px">
                    <div class="table-header"><h3>⚙️ Server Configuration</h3></div>
                    <div style="padding:24px">
                        <div class="form-group">
                            <label>Server URL (public URL of this server)</label>
                            <input type="text" id="setServerUrl" value="${esc(s.server_url || '')}" placeholder="http://your-vps-ip:3000">
                            <p style="font-size:11px;color:var(--text-muted);margin-top:4px">Must be accessible from the internet. Do not include trailing slash.</p>
                        </div>
                        <div class="form-group">
                            <label>GitHub Repository</label>
                            <input type="text" id="setGithubRepo" value="${esc(s.github_repo || '')}" placeholder="Makairamei/CS">
                        </div>
                        
                        <div class="form-group">
                            <label>Upstream Plugin Repositories</label>
                            <div id="repoList">${repoRows}</div>
                            <button class="btn btn-sm btn-secondary" onclick="addRepoRow()" style="margin-top:8px">+ Add Repository</button>
                            <p style="font-size:11px;color:var(--text-muted);margin-top:8px">Direct URLs to <code>plugins.json</code>. The server will merge plugins from all these sources.</p>
                        </div>

                        <button class="btn btn-primary" data-action="save-settings">Save Settings</button>
                    </div>
                </div>

                <!-- PASSWORD -->
                <div class="table-container">
                    <div class="table-header"><h3>🔐 Change Password</h3></div>
                    <div style="padding:24px">
                        <div class="form-group"><label>Current Password</label><input type="password" id="currentPwd" placeholder="••••••"></div>
                        <div class="form-group"><label>New Password</label><input type="password" id="newPwd" placeholder="••••••"></div>
                        <button class="btn btn-primary" data-action="change-password">Change Password</button>
                    </div>
                </div>
            </div>
        `;
    } catch (e) { c.innerHTML = '<div class="empty-state"><p>Failed to load settings</p></div>'; }
}

function addRepoRow() {
    const div = document.createElement('div');
    div.className = 'repo-row';
    div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center';
    div.innerHTML = `
        <input type="text" class="repo-url-input" placeholder="https://..." style="flex:1">
        <button class="btn btn-sm btn-secondary" onclick="testRepo(this)">Test</button>
        <button class="btn btn-sm btn-danger" onclick="this.closest('.repo-row').remove()">✖</button>
    `;
    document.getElementById('repoList').appendChild(div);
}

async function testRepo(btn) {
    const row = btn.closest('.repo-row');
    const url = row.querySelector('input').value;
    if (!url) return toast('Enter URL first', 'error');

    const originalText = btn.innerText;
    btn.innerText = 'Testing...';
    btn.disabled = true;

    try {
        const res = await apiFetch('/api/admin/test-repo', { method: 'POST', body: JSON.stringify({ url }) });
        if (res.status === 'ok') {
            toast(`Success! Found ${res.count} plugins.`, 'success');
            btn.innerText = '✅ OK';
        } else {
            toast(res.message, 'error');
            btn.innerText = '❌ Fail';
        }
    } catch (e) {
        toast('Connection failed', 'error');
        btn.innerText = '❌ Error';
    }

    setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    }, 3000);
}

async function saveSettings() {
    try {
        const repoInputs = document.querySelectorAll('.repo-url-input');
        const upstreamUrls = Array.from(repoInputs)
            .map(input => ({ url: input.value.trim(), active: true }))
            .filter(u => u.url);

        const settings = {
            server_url: document.getElementById('setServerUrl').value.replace(/\/+$/, ''),
            github_repo: document.getElementById('setGithubRepo').value,
            upstream_urls: JSON.stringify(upstreamUrls)
        };

        await apiFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) });
        toast('Settings saved', 'success');
    } catch (e) { toast('Error saving', 'error'); }
}

async function changePassword() {
    const curr = document.getElementById('currentPwd').value;
    const newP = document.getElementById('newPwd').value;
    if (!curr || !newP) { toast('Fill both fields', 'error'); return; }
    try {
        const res = await apiFetch('/api/admin/password', { method: 'PUT', body: JSON.stringify({ current_password: curr, new_password: newP }) });
        if (res.status === 'ok') {
            toast('Password changed', 'success');
            document.getElementById('currentPwd').value = '';
            document.getElementById('newPwd').value = '';
        } else { toast(res.message || 'Failed', 'error'); }
    } catch (e) { toast('Error', 'error'); }
}

// ============================================================
// USER ACTIVITY DETAIL (Modal)
// ============================================================

async function viewUserActivity(licenseKey) {
    openModal('<div class="loading-overlay"><div class="spinner"></div></div>');
    try {
        const d = await apiFetch('/api/admin/analytics/user/' + encodeURIComponent(licenseKey) + '?days=7');

        let pluginRows = '';
        if (d.pluginUsage && d.pluginUsage.length) {
            pluginRows = '<table style="font-size:12px"><thead><tr><th>Plugin</th><th>Action</th><th>Count</th><th>Last Used</th></tr></thead><tbody>' +
                d.pluginUsage.map(p =>
                    '<tr><td>' + esc(p.plugin_name) + '</td><td><span class="badge badge-info">' + esc(p.action) + '</span></td>' +
                    '<td>' + p.count + '</td><td>' + timeAgo(p.last_used) + '</td></tr>'
                ).join('') + '</tbody></table>';
        } else {
            pluginRows = '<div class="empty-state"><p>No plugin activity</p></div>';
        }

        let playbackRows = '';
        if (d.playbackHistory && d.playbackHistory.length) {
            playbackRows = '<table style="font-size:12px"><thead><tr><th>Video</th><th>Plugin</th><th>Source</th><th>Time</th></tr></thead><tbody>' +
                d.playbackHistory.slice(0, 30).map(p =>
                    '<tr><td title="' + esc(p.video_title) + '">' + esc(p.video_title?.substring(0, 35)) + '</td>' +
                    '<td>' + esc(p.plugin_name) + '</td>' +
                    '<td>' + (p.source_provider === 'DOWNLOAD' ? '<span class="badge badge-expired">DOWNLOAD</span>' : esc(p.source_provider || 'PLAY')) + '</td>' +
                    '<td>' + timeAgo(p.played_at) + '</td></tr>'
                ).join('') + '</tbody></table>';
        } else {
            playbackRows = '<div class="empty-state"><p>No playback history</p></div>';
        }

        let deviceRows = '';
        if (d.devices && d.devices.length) {
            deviceRows = '<table style="font-size:12px"><thead><tr><th>Device</th><th>IP</th><th>Last Seen</th><th>Status</th></tr></thead><tbody>' +
                d.devices.map(dev =>
                    '<tr><td>' + esc(dev.device_name || dev.device_id?.substring(0, 16)) + '</td>' +
                    '<td>' + esc(dev.ip_address) + '</td>' +
                    '<td>' + timeAgo(dev.last_seen) + '</td>' +
                    '<td>' + (dev.is_blocked ? '<span class="badge badge-blocked">Blocked</span>' : '<span class="badge badge-active">Active</span>') + '</td></tr>'
                ).join('') + '</tbody></table>';
        } else {
            deviceRows = '<div class="empty-state"><p>No devices</p></div>';
        }

        const mc = document.getElementById('modalContent');
        mc.className = 'modal modal-lg';
        mc.innerHTML =
            '<div class="modal-header"><h3>User Activity</h3>' +
            '<button class="btn-icon" data-action="close-modal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
            '<div class="modal-body" style="padding:0">' +
            '<div style="padding:20px 24px;border-bottom:1px solid var(--border)">' +
            '<div style="font-family:monospace;font-size:15px;font-weight:600;color:var(--accent)">' + esc(licenseKey) + '</div>' +
            '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">' + esc(d.license?.name || 'Unnamed') + ' · ' + statusBadge(d.license?.status || 'unknown') + ' · Period: ' + esc(d.period) + '</div></div>' +
            '<div style="padding:20px 24px">' +
            '<div class="inline-tabs">' +
            '<button class="inline-tab active" data-action="detail-tab" data-value="ua-plugins">Plugin Usage (' + (d.pluginUsage?.length || 0) + ')</button>' +
            '<button class="inline-tab" data-action="detail-tab" data-value="ua-playback">Playback (' + (d.playbackHistory?.length || 0) + ')</button>' +
            '<button class="inline-tab" data-action="detail-tab" data-value="ua-devices">Devices (' + (d.devices?.length || 0) + ')</button>' +
            '</div>' +
            '<div class="tab-panel active" data-tab="ua-plugins">' + pluginRows + '</div>' +
            '<div class="tab-panel" data-tab="ua-playback">' + playbackRows + '</div>' +
            '<div class="tab-panel" data-tab="ua-devices">' + deviceRows + '</div>' +
            '</div></div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal">Close</button></div>';
    } catch (e) {
        console.error('User activity error:', e);
        document.getElementById('modalContent').innerHTML = '<div class="modal-body"><div class="empty-state"><p>Failed to load user activity</p></div></div>';
    }
}