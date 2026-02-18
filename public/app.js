// ============================================
// LUCIDE SVG ICON SYSTEM
// ============================================
const ICONS = {
    key: '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    'key-square': '<path d="M12.4 2.7c.9-.9 2.5-.9 3.4 0l5.5 5.5c.9.9.9 2.5 0 3.4l-3.7 3.7c-.9.9-2.5.9-3.4 0L8.7 9.8c-.9-.9-.9-2.5 0-3.4z"/><path d="m14 7 3 3"/><path d="m9.4 16.6-4.6 4.6"/><path d="m11.8 14.2-4.6 4.6"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    smartphone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    ban: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8z"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    'rotate-ccw': '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'bar-chart': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    loader: '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
};

function icon(name, size = 16, cls = '') {
    const paths = ICONS[name] || ICONS.zap;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}" style="display:inline-block;vertical-align:middle;flex-shrink:0">${paths}</svg>`;
}

const API = '';
let TOKEN = localStorage.getItem('cs_admin_token') || '';
let refreshInterval = null;
let searchDebounce = null;
let currentDetailId = null;
let currentDetailData = null;

// ============================================
// THEME TOGGLE
// ============================================
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cs_theme', theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Auto-apply saved theme on load
(function () {
    const saved = localStorage.getItem('cs_theme') || 'light';
    applyTheme(saved);
})();

// Toast
function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// API helper
async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
    const res = await fetch(API + path, { ...opts, headers });
    if (res.status === 401 && path !== '/api/admin/login') {
        // Token expired — force re-login
        localStorage.removeItem('cs_admin_token');
        TOKEN = '';
        document.getElementById('app-main').classList.add('hidden');
        document.getElementById('app-login').classList.remove('hidden');
        toast('Session expired, silakan login ulang', 'error');
        throw new Error('Session expired');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    return data;
}

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        const loaders = { repos: loadRepos, keys: loadKeys, logs: loadAllLogs, settings: loadSettings, dashboard: loadDashboard, devices: loadDevicesTab, plugins: loadPluginStats };
        if (loaders[tab.dataset.tab]) loaders[tab.dataset.tab]();
    };
});

// Login
async function login() {
    try {
        const data = await api('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username: document.getElementById('login-user').value, password: document.getElementById('login-pass').value })
        });
        TOKEN = data.token;
        localStorage.setItem('cs_admin_token', TOKEN);
        enterDashboard();
    } catch (e) { toast(e.message, 'error'); }
}

function enterDashboard() {
    document.getElementById('app-login').classList.add('hidden');
    document.getElementById('app-main').classList.remove('hidden');
    loadDashboard();
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        const active = document.querySelector('.tab.active');
        if (active && active.dataset.tab === 'dashboard') loadDashboard();
        if (active && active.dataset.tab === 'devices') loadDevicesTab();
        if (active && active.dataset.tab === 'plugins') loadPluginStats(); // Auto-refresh plugins tab
    }, 5000); // Faster refresh for realtime feel
}

function logout() {
    TOKEN = '';
    localStorage.removeItem('cs_admin_token');
    if (refreshInterval) clearInterval(refreshInterval);
    location.reload();
}

// Auto-login if saved token is valid
(async function tryAutoLogin() {
    if (!TOKEN) return;
    try {
        await api('/api/admin/stats');
        enterDashboard();
    } catch (e) {
        TOKEN = '';
        localStorage.removeItem('cs_admin_token');
    }
})();

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
    try {
        const stats = await api('/api/admin/stats');
        document.getElementById('stats-grid').innerHTML = `
            <div class="stat-card"><div class="stat-icon green">${icon('key', 20)}</div><div class="stat-body"><div class="label">Active Keys</div><div class="value green">${stats.active_keys}</div></div></div>
            <div class="stat-card"><div class="stat-icon purple">${icon('key-square', 20)}</div><div class="stat-body"><div class="label">Total Keys</div><div class="value purple">${stats.total_keys}</div></div></div>
            <div class="stat-card"><div class="stat-icon cyan">${icon('monitor', 20)}</div><div class="stat-body"><div class="label">Online Devices</div><div class="value cyan"><span class="pulse"></span>${stats.online_devices}</div></div></div>
            <div class="stat-card"><div class="stat-icon yellow">${icon('clock', 20)}</div><div class="stat-body"><div class="label">Expired</div><div class="value yellow">${stats.expired_keys}</div></div></div>
            <div class="stat-card"><div class="stat-icon red">${icon('ban', 20)}</div><div class="stat-body"><div class="label">Revoked</div><div class="value red">${stats.revoked_keys}</div></div></div>
            <div class="stat-card"><div class="stat-icon purple">${icon('download', 20)}</div><div class="stat-body"><div class="label">Downloads 24h</div><div class="value purple">${stats.downloads_today}</div></div></div>
            <div class="stat-card"><div class="stat-icon red">${icon('alert-triangle', 20)}</div><div class="stat-body"><div class="label">Errors 24h</div><div class="value red">${stats.errors_today}</div></div></div>
            <div class="stat-card"><div class="stat-icon cyan">${icon('plug', 20)}</div><div class="stat-body"><div class="label">Plugin Acts 24h</div><div class="value cyan">${stats.plugin_activity_24h}</div></div></div>
            <div class="stat-card"><div class="stat-icon purple">${icon('database', 20)}</div><div class="stat-body"><div class="label">Source Repos</div><div class="value purple">${stats.active_repos}/${stats.total_repos}</div></div></div>
        `;
        const logs = await api('/api/admin/logs?limit=15');
        document.getElementById('recent-logs').innerHTML = logs.map(l => {
            // Extract key number prefix (e.g. CS-01 from CS-01-XXXX-XXXX-XXXX)
            const keyParts = (l.license_key || '').split('-');
            const keyLabel = keyParts.length >= 2 ? `${keyParts[0]}-${keyParts[1]}` : (l.license_key || '-');
            const badgeClass = actionBadge(l.action);
            const devName = l.device_name && l.device_name !== 'Unknown' ? l.device_name : '-';

            return `<tr>
                <td style="font-size:11px;color:var(--muted)">${fmtDate(l.created_at)}</td>
                <td><span class="badge badge-cyan" style="font-size:10px">${keyLabel}</span>${l.license_name ? `<div style="font-size:10px;color:var(--muted)">${esc(l.license_name)}</div>` : ''}</td>
                <td><span class="badge ${badgeClass}">${l.action}</span></td>
                <td style="font-size:12px;font-weight:600">${esc(devName)}</td>
                <td style="font-size:12px">${l.ip_address || '-'}</td>
                <td style="font-size:11px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis">${l.details || '-'}</td>
            </tr>`;
        }).join('');

        // Dashboard devices
        try {
            const devRes = await api('/api/admin/devices');
            const devContainer = document.getElementById('dashboard-devices');
            if (devRes && devRes.length > 0) {
                devContainer.innerHTML = devRes.slice(0, 12).map(d => {
                    const online = (new Date() - new Date(d.last_seen)) < 5 * 60 * 1000;
                    const keyParts = (d.license_key || '').split('-');
                    const keyLabel = keyParts.length >= 2 ? `${keyParts[0]}-${keyParts[1]}` : '';
                    const name = d.device_name || d.device_model || 'Device';
                    return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px;min-width:180px;flex:1;max-width:250px">
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                            ${online ? '<span class="pulse"></span>' : '<span style="width:8px;height:8px;border-radius:50%;background:var(--muted);display:inline-block"></span>'}
                            <span style="font-weight:600;font-size:13px">${esc(name)}</span>
                        </div>
                        <div style="font-size:11px;color:var(--muted)">
                            <span class="badge badge-cyan" style="font-size:9px;padding:2px 6px">${keyLabel}</span>
                            · ${d.ip_address || '-'}
                        </div>
                    </div>`;
                }).join('');
            } else {
                devContainer.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;width:100%;font-size:13px">Belum ada device terdaftar</p>';
            }
        } catch (e) {
            document.getElementById('dashboard-devices').innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;width:100%;font-size:13px">-</p>';
        }

        // Popular plugins
        try {
            const ps = await api('/api/admin/plugin-stats');
            if (ps.popular && ps.popular.length > 0) {
                const maxTotal = ps.popular[0].total;
                document.getElementById('popular-plugins').innerHTML = ps.popular.slice(0, 8).map(p => `
                    <div class="plugin-bar-item">
                        <div class="plugin-bar-header">
                            <span class="plugin-bar-name">${icon('plug', 14)} ${esc(p.plugin_name)}</span>
                            <span class="plugin-bar-count">${p.total} access · ${p.unique_users} users</span>
                        </div>
                        <div class="plugin-bar-track">
                            <div class="plugin-bar-fill" style="width:${Math.max(5, (p.total / maxTotal) * 100)}%">
                                <span class="plugin-bar-dl">${icon('download', 12)} ${p.downloads}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                document.getElementById('popular-plugins').innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;font-size:13px">Belum ada aktivitas plugin</p>';
            }
        } catch (e) {
            document.getElementById('popular-plugins').innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;font-size:13px">Belum ada aktivitas plugin</p>';
        }
    } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// REPOS
// ============================================================
async function loadRepos() {
    try {
        const repos = await api('/api/admin/repos');
        if (repos.length === 0) {
            document.getElementById('repo-list').innerHTML = '<p style="color:var(--muted);text-align:center;padding:30px">No repos added yet. Click Add Repo to get started.</p>';
            return;
        }
        document.getElementById('repo-list').innerHTML = repos.map(r => `
            <div class="repo-item">
                <div class="repo-info">
                    <div class="repo-name"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${r.is_active ? 'var(--success)' : 'var(--danger)'}"></span> ${esc(r.name)}</div>
                    <div class="repo-url">${esc(r.url)}</div>
                </div>
                <div class="repo-actions">
                    <button class="btn btn-sm ${r.is_active ? 'btn-warning' : 'btn-success'}" onclick="toggleRepo(${r.id},${r.is_active ? 'false' : 'true'})">${r.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    <button class="btn btn-sm btn-danger" onclick="if(confirm('Hapus repo?'))delRepo(${r.id})">Hapus</button>
                </div>
            </div>
        `).join('');
    } catch (e) { toast(e.message, 'error'); }
}
function openAddRepoModal() { document.getElementById('modal-add-repo').classList.add('active'); }
async function addRepo() {
    try {
        const name = document.getElementById('repo-name').value.trim();
        const url = document.getElementById('repo-url').value.trim();
        if (!name || !url) return toast('Name dan URL wajib diisi', 'error');
        await api('/api/admin/repos', { method: 'POST', body: JSON.stringify({ name, url }) });
        toast('Repo ditambahkan!', 'success');
        closeModal('modal-add-repo');
        document.getElementById('repo-name').value = '';
        document.getElementById('repo-url').value = '';
        loadRepos();
    } catch (e) { toast(e.message, 'error'); }
}
async function toggleRepo(id, active) { try { await api(`/api/admin/repos/${id}/toggle`, { method: 'PUT', body: JSON.stringify({ active }) }); toast(active ? 'Repo diaktifkan' : 'Repo dinonaktifkan', 'success'); loadRepos(); } catch (e) { toast(e.message, 'error'); } }
async function delRepo(id) { try { await api(`/api/admin/repos/${id}`, { method: 'DELETE' }); toast('Repo dihapus', 'success'); loadRepos(); } catch (e) { toast(e.message, 'error'); } }
async function refreshRepos() { try { toast('Refreshing...', 'info'); const d = await api('/api/admin/repos/refresh', { method: 'POST' }); toast(d.message, 'success'); } catch (e) { toast(e.message, 'error'); } }

// ============================================================
// KEYS
// ============================================================

// Search & Pagination & Bulk Actions
let keySearchDebounce = null;
let currentPage = 1;
const itemsPerPage = 20;
let isTrashMode = false;
let selectedKeys = new Set();

function debounceKeySearch() {
    if (keySearchDebounce) clearTimeout(keySearchDebounce);
    keySearchDebounce = setTimeout(() => loadKeys(1), 300);
}

function clearSearch() {
    const input = document.getElementById('key-search');
    if (input) { input.value = ''; loadKeys(1); }
}

function toggleTrashMode() {
    isTrashMode = !isTrashMode;
    const btn = document.getElementById('btn-trash-mode');
    if (isTrashMode) {
        btn.classList.add('trash-active');
        btn.innerHTML = `${icon('folder', 14)} Active Keys`;
        document.getElementById('btn-bulk-restore').style.display = 'block'; // Show restore in trash
    } else {
        btn.classList.remove('trash-active');
        btn.innerHTML = `${icon('trash', 14)} Trash`;
        document.getElementById('btn-bulk-restore').style.display = 'none';
    }
    selectedKeys.clear();
    updateBulkActions();
    loadKeys(1);
}

async function loadKeys(page = 1) {
    currentPage = page;
    const search = document.getElementById('key-search')?.value.trim() || '';
    const tableRx = document.getElementById('keys-table');
    const paginationRx = document.getElementById('keys-pagination');

    // Reset selection on page change? Optional. Let's keep it for now but maybe clear it.
    // selectedKeys.clear(); updateBulkActions(); // Uncomment to clear on page change

    if (tableRx) tableRx.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--muted)">Loading...</td></tr>';

    try {
        const res = await api(`/api/admin/keys?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}&trashed=${isTrashMode}`);

        if (res.data.length === 0) {
            if (tableRx) tableRx.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:30px">${isTrashMode ? 'Sampah kosong.' : 'Tidak ada key yang cocok.'} ${isTrashMode ? `<br><button class="btn btn-sm btn-ghost" onclick="api('/api/admin/trash',{method:'DELETE'}).then(()=>toast('Sampah dikosongkan','success')).then(()=>loadKeys())">Kosongkan Sampah Permanen</button>` : ''}</td></tr>`;
            if (paginationRx) paginationRx.innerHTML = '';
            return;
        }

        if (tableRx) {
            tableRx.innerHTML = res.data.map(k => {
                const now = new Date();
                const exp = new Date(k.expired_at.endsWith('Z') ? k.expired_at : k.expired_at + 'Z');
                const isExp = now > exp;
                const status = isTrashMode ? 'DELETED' : (!k.is_active ? 'REVOKED' : isExp ? 'EXPIRED' : 'ACTIVE');
                const badge = status === 'ACTIVE' ? 'badge-green' : status === 'EXPIRED' ? 'badge-yellow' : 'badge-red';

                // Duration / Remaining
                let durationText = '-';
                if (status === 'ACTIVE') {
                    const diff = exp - now;
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    durationText = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                } else if (status === 'EXPIRED') durationText = 'Habis';

                const isSelected = selectedKeys.has(k.id);

                return `<tr class="${isSelected ? 'selected' : ''}" onclick="toggleSelectKey(${k.id})">
                    <td style="text-align:center" onclick="event.stopPropagation()">
                        <input type="checkbox" class="key-checkbox" onchange="toggleSelectKey(${k.id})" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td onclick="openKeyDetail(${k.id});event.stopPropagation()">
                        ${k.online_count > 0 ? '<span class="pulse"></span>' : ''} 
                        ${k.name ? `<div style="font-weight:600;color:var(--text);margin-bottom:2px">${esc(k.name)}</div><div style="font-family:monospace;font-size:11px;color:var(--muted)">${k.license_key}</div>` : `<span style="font-family:monospace;font-weight:600">${k.license_key}</span>`}
                    </td>
                    <td><div class="url-box"><span class="url-text">${esc(k.repo_url)}</span><button class="copy-btn" data-url="${esc(k.repo_url)}" onclick="event.stopPropagation();copyUrl(this)">${icon('copy', 12)}</button></div></td>
                    <td><span class="badge ${badge}">${status}</span></td>
                    <td><div style="font-weight:600">${durationText}</div><div style="font-size:11px;color:var(--muted)">Total: ${k.duration_days}d</div></td>
                    <td style="font-size:12px"><div>${fmtDate(k.created_at).split(' ')[0]}</div></td>
                    <td style="font-size:12px">${fmtDate(k.expired_at)}</td>
                    <td><span class="badge badge-cyan">${k.device_count}/${k.max_devices}</span></td>
                    <td style="font-size:12px;color:var(--muted);max-width:150px;overflow:hidden;text-overflow:ellipsis">${esc(k.note || '-')}</td>
                    <td>
                        <div style="display:flex;gap:4px;flex-wrap:wrap" onclick="event.stopPropagation()">
                            ${isTrashMode ?
                        `<button class="btn btn-xs btn-success" onclick="restoreKey(${k.id})">${icon('rotate-ccw', 12)} Restore</button>
                                 <button class="btn btn-xs btn-danger" onclick="forceDeleteKey(${k.id})">${icon('flame', 12)}</button>` :
                        `${status === 'ACTIVE' ? `<button class="btn btn-xs btn-warning" onclick="revokeKey(${k.id})">Revoke</button>` : `<button class="btn btn-xs btn-success" onclick="activateKey(${k.id})">Activate</button>`}
                                 <button class="btn btn-xs btn-ghost" onclick="openRenewModal(${k.id})">${icon('clock', 12)}</button>
                                 <button class="btn btn-xs btn-danger" onclick="confirmDeleteKey(${k.id})">${icon('trash', 12)}</button>`
                    }
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }

        renderPagination(res.total_pages, page);
        // Sync "Select All" checkbox
        const allChecks = document.querySelectorAll('.key-checkbox');
        const selectAll = document.getElementById('select-all-keys');
        if (selectAll && allChecks.length > 0) {
            selectAll.checked = Array.from(allChecks).every(c => c.checked);
        }

    } catch (e) { toast(e.message, 'error'); }
}

// Bulk Actions Logic
function toggleSelectAll() {
    const selectAll = document.getElementById('select-all-keys');
    const checked = selectAll.checked;

    document.querySelectorAll('.key-checkbox').forEach(c => {
        c.checked = checked;
        const match = c.getAttribute('onchange').match(/\d+/);
        if (match) {
            const id = parseInt(match[0]);
            if (checked) selectedKeys.add(id);
            else selectedKeys.delete(id);
        }
    });

    document.querySelectorAll('#keys-table tr').forEach(tr => {
        if (checked) tr.classList.add('selected');
        else tr.classList.remove('selected');
    });

    updateBulkActions();
}

function toggleSelectKey(id) {
    // Toggle set state
    if (selectedKeys.has(id)) selectedKeys.delete(id);
    else selectedKeys.add(id);

    // Update dom directly to avoid reload/flicker
    const checkbox = document.querySelector(`.key-checkbox[onchange="toggleSelectKey(${id})"]`);
    if (checkbox) checkbox.checked = selectedKeys.has(id);

    const tr = checkbox ? checkbox.closest('tr') : null;
    if (tr) {
        if (selectedKeys.has(id)) tr.classList.add('selected');
        else tr.classList.remove('selected');
    }

    // Sync "Select All" header checkbox
    const selectAll = document.getElementById('select-all-keys');
    if (selectAll) {
        const allChecks = document.querySelectorAll('.key-checkbox');
        selectAll.checked = allChecks.length > 0 && Array.from(allChecks).every(c => c.checked);
    }

    updateBulkActions();
}

function updateBulkActions() {
    const bar = document.getElementById('bulk-actions');
    const count = document.getElementById('selected-count');
    if (selectedKeys.size > 0) {
        bar.classList.add('active');
        count.textContent = `${selectedKeys.size} Terpilih`;
    } else {
        bar.classList.remove('active');
    }
}

function startBulkDelete() {
    showConfirm(
        'Hapus ' + selectedKeys.size + ' Key?',
        isTrashMode ? 'Key akan dihapus PERMANEN. Tidak bisa dikembalikan.' : 'Key akan dipindahkan ke Sampah.',
        async () => {
            try {
                await api('/api/admin/keys/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: Array.from(selectedKeys), force: isTrashMode }) });
                toast('Berhasil dihapus', 'success');
                selectedKeys.clear(); updateBulkActions(); loadKeys(currentPage);
            } catch (e) { toast(e.message, 'error'); }
        }
    );
}

async function bulkRestore() {
    try {
        await api('/api/admin/keys/bulk-restore', { method: 'POST', body: JSON.stringify({ ids: Array.from(selectedKeys) }) });
        toast('Berhasil dipulihkan', 'success');
        selectedKeys.clear(); updateBulkActions(); loadKeys(currentPage);
    } catch (e) { toast(e.message, 'error'); }
}

// Wrapper aliases
function confirmBulkDelete() { startBulkDelete(); }
function promptBulkRenew() {
    const days = prompt('Tambah berapa hari?', '30');
    if (days) api('/api/admin/keys/bulk-renew', { method: 'POST', body: JSON.stringify({ ids: Array.from(selectedKeys), days }) }).then(() => { toast('Berhasil diperpanjang', 'success'); selectedKeys.clear(); updateBulkActions(); loadKeys(currentPage); }).catch(e => toast(e.message, 'error'));
}

// Single Item Actions Wrappers (Refresh list after)
async function restoreKey(id) { try { await api(`/api/admin/keys/bulk-restore`, { method: 'POST', body: JSON.stringify({ ids: [id] }) }); toast('Dipulihkan', 'success'); loadKeys(currentPage); } catch (e) { toast(e.message, 'error'); } }

function forceDeleteKey(id) {
    showConfirm('Hapus Permanen?', 'Data device dan log akan ikut terhapus.', async () => {
        try {
            await api(`/api/admin/keys/bulk-delete`, { method: 'POST', body: JSON.stringify({ ids: [id], force: true }) });
            toast('Dihapus permanen', 'success');
            loadKeys(currentPage);
        } catch (e) { toast(e.message, 'error'); }
    });
}

function renderPagination(totalPages, current) {
    const container = document.getElementById('keys-pagination');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Prev
    html += `<button class="btn btn-sm ${current === 1 ? 'btn-ghost' : 'btn-secondary'}" ${current === 1 ? 'disabled' : `onclick="loadKeys(${current - 1})"`}>Prev</button>`;

    // Page Numbers (Show max 5)
    let start = Math.max(1, current - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);

    for (let i = start; i <= end; i++) {
        html += `<button class="btn btn-sm ${i === current ? 'btn-primary' : 'btn-ghost'}" onclick="loadKeys(${i})">${i}</button>`;
    }

    // Next
    html += `<button class="btn btn-sm ${current === totalPages ? 'btn-ghost' : 'btn-secondary'}" ${current === totalPages ? 'disabled' : `onclick="loadKeys(${current + 1})"`}>Next</button>`;

    container.innerHTML = html;
}


// ============================================================
// KEY DETAIL MODAL (Full Screen)
// ============================================================
async function openKeyDetail(id) {
    currentDetailId = id;
    document.getElementById('modal-key-detail').classList.add('active');
    document.getElementById('detail-modal-content').innerHTML = '<p style="color:var(--muted);padding:30px;text-align:center">Loading...</p>';
    // Reset to overview tab
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.detail-tab[data-dtab="overview"]').classList.add('active');

    try {
        const d = await api(`/api/admin/keys/${id}/details`);
        currentDetailData = d;
        document.getElementById('detail-modal-title').innerHTML = `${icon('key', 18)} ${d.license_key}`;
        renderDetailTab('overview');
    } catch (e) {
        document.getElementById('detail-modal-content').innerHTML = `<p style="color:var(--danger);padding:30px;text-align:center">${e.message}</p>`;
    }
}

function closeKeyDetail() {
    document.getElementById('modal-key-detail').classList.remove('active');
    currentDetailId = null;
    currentDetailData = null;
}

function switchDetailTab(tab) {
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.detail-tab[data-dtab="${tab}"]`).classList.add('active');
    renderDetailTab(tab);
}

function renderDetailTab(tab) {
    const d = currentDetailData;
    if (!d) return;
    const container = document.getElementById('detail-modal-content');
    const now = new Date(), exp = new Date(d.expired_at);
    const status = !d.is_active ? 'REVOKED' : now > exp ? 'EXPIRED' : 'ACTIVE';
    const badge = status === 'ACTIVE' ? 'badge-green' : status === 'EXPIRED' ? 'badge-yellow' : 'badge-red';
    const days = Math.ceil((exp - now) / 86400000);

    switch (tab) {
        case 'overview':
            container.innerHTML = `
        <div class="detail-overview">
            <div class="overview-grid">
                <div class="overview-card">
                    <div class="overview-label">Status</div>
                    <div class="overview-value"><span class="badge ${badge}" style="font-size:13px;padding:6px 16px">${status}</span></div>
                </div>
                <div class="overview-card">
                    <div class="overview-label">Sisa Waktu</div>
                    <div class="overview-value ${status === 'ACTIVE' ? 'green' : 'red'}">${status === 'ACTIVE' ? days + ' hari' : status}</div>
                </div>
                <div class="overview-card">
                    <div class="overview-label">Devices</div>
                    <div class="overview-value cyan">${d.device_count}/${d.max_devices}</div>
                </div>
                <div class="overview-card">
                    <div class="overview-label">Online</div>
                    <div class="overview-value green">${d.online_count > 0 ? '<span class="pulse"></span>' : ''}${d.online_count}</div>
                </div>
            </div>
            <div class="overview-info-grid">
                <div class="overview-info-row"><span class="overview-info-label">${icon('key', 14)} License Key</span><span class="overview-info-value mono">${d.license_key} <button class="btn btn-xs btn-ghost" onclick="copyText('${d.license_key}')">${icon('copy', 12)}</button></span></div>
                <div class="overview-info-row"><span class="overview-info-label">${icon('globe', 14)} Repo URL</span><span class="overview-info-value mono" style="font-size:11px">${esc(d.repo_url)} <button class="btn btn-xs btn-ghost" onclick="copyText('${esc(d.repo_url)}')">${icon('copy', 12)}</button></span></div>
                <div class="overview-info-row"><span class="overview-info-label">${icon('calendar', 14)} Created</span><span class="overview-info-value">${fmtDate(d.created_at)}</span></div>
                <div class="overview-info-row"><span class="overview-info-label">${icon('clock', 14)} Expires</span><span class="overview-info-value">${new Date(d.expired_at).toLocaleString('id')}</span></div>
                <div class="overview-info-row"><span class="overview-info-label">${icon('file-text', 14)} Note</span><span class="overview-info-value">${esc(d.note || '-')}</span></div>
                <div class="overview-info-row"><span class="overview-info-label">${icon('clock', 14)} Duration</span><span class="overview-info-value">${d.duration_days} days</span></div>
            </div>
            ${d.plugin_usage && d.plugin_usage.length > 0 ? `
            <div style="margin-top:16px">
                <h4 style="margin-bottom:8px">${icon('plug', 16)} Recently Accessed Plugins</h4>
                <div class="plugin-chips">${d.plugin_usage.slice(0, 5).map(p => `<span class="plugin-chip"><span class="plugin-chip-icon">${p.action === 'DOWNLOAD' ? icon('download', 14) : icon('plug', 14)}</span>${esc(p.plugin_name)}<span class="plugin-chip-count">${p.count}x</span></span>`).join('')}</div>
            </div>` : ''}
        </div>`;
            break;

        case 'devices':
            container.innerHTML = `
        <div class="detail-devices">
            <h4>${icon('smartphone', 16)} Connected Devices (${d.device_count}/${d.max_devices})</h4>
            ${d.devices.length === 0 ? '<p style="color:var(--muted);font-size:13px;padding:20px;text-align:center">Belum ada device terhubung</p>' :
                    d.devices.map(dev => {
                        const online = (new Date() - new Date(dev.last_seen)) < 5 * 60 * 1000;
                        const displayName = dev.device_name || dev.device_model || 'Unknown Device';
                        return `<div class="device-card-enhanced">
                    <div class="device-card-left">
                        <div class="device-avatar ${online ? 'online' : ''}">${getDeviceIcon(dev.os_info)}</div>
                        <div class="device-info-enhanced">
                            <div class="device-name-row">
                                ${online ? '<span class="pulse"></span>' : ''}
                                <span class="device-display-name">${esc(displayName)}</span>
                                ${dev.is_blocked ? '<span class="badge badge-red">BLOCKED</span>' : ''}
                            </div>
                            <div class="device-meta-row">
                                ${dev.device_model ? `<span class="device-meta-tag">${icon('smartphone', 12)} ${esc(dev.device_model)}</span>` : ''}
                                ${dev.os_info ? `<span class="device-meta-tag">${icon('monitor', 12)} ${esc(dev.os_info)}</span>` : ''}
                                <span class="device-meta-tag">${icon('globe', 12)} ${dev.ip_address}</span>
                            </div>
                            <div class="device-meta-row">
                                <span class="device-meta-tag dim">ID: ${dev.device_id}</span>
                                <span class="device-meta-tag dim">First: ${fmtDate(dev.first_seen)}</span>
                                <span class="device-meta-tag dim">Last: ${fmtDate(dev.last_seen)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="device-card-right">
                        <button class="btn btn-xs btn-ghost" onclick="promptRenameDevice(${dev.id},'${esc(dev.device_name || '')}')">${icon('tag', 12)} Label</button>
                        ${dev.is_blocked ? `<button class="btn btn-xs btn-success" onclick="unblockDevDetail(${dev.id})">Unblock</button>` : `<button class="btn btn-xs btn-warning" onclick="blockDevDetail(${dev.id})">Block</button>`}
                        <button class="btn btn-xs btn-danger" onclick="if(confirm('Delete device?'))deleteDevDetail(${dev.id})">${icon('trash', 12)}</button>
                        <button class="btn btn-xs btn-ghost" onclick="addBlockedIP('${dev.ip_address}','Device ${dev.device_id}')">${icon('ban', 12)} IP</button>
                    </div>
                </div>`;
                    }).join('')}
        </div>`;
            break;

        case 'activity':
            // Build IP-to-device map from device list
            const ipDeviceMap = {};
            if (d.devices) {
                d.devices.forEach(dev => {
                    const name = dev.device_name || dev.device_model || 'Unknown';
                    if (dev.ip_address) ipDeviceMap[dev.ip_address] = name;
                });
            }

            container.innerHTML = `
        <div class="detail-activity">
            <h4>${icon('file-text', 16)} Access Log (last 50)</h4>
            <div class="table-wrap" style="max-height:500px;overflow-y:auto">
                <table><thead><tr><th>Waktu</th><th>Aksi</th><th>Device</th><th>IP</th><th>Detail</th></tr></thead>
                <tbody>${d.recent_logs.map(l => {
                const deviceName = ipDeviceMap[l.ip_address] || '-';
                return `<tr>
                    <td style="font-size:11px;color:var(--muted)">${fmtDate(l.created_at)}</td>
                    <td><span class="badge ${actionBadge(l.action)}">${l.action}</span></td>
                    <td style="font-size:12px;font-weight:600">${esc(deviceName)}</td>
                    <td style="font-size:12px">${l.ip_address || '-'}</td>
                    <td style="font-size:11px;color:var(--muted)">${esc(l.details || '-')}</td>
                </tr>`;
            }).join('')}</tbody></table>
            </div>
        </div>`;
            break;

        case 'plugin-usage':
            container.innerHTML = `
        <div class="detail-plugins">
            <h4>${icon('activity', 16)} Plugin Usage</h4>
            ${d.plugin_usage && d.plugin_usage.length > 0 ? `
            <div class="table-wrap">
                <table><thead><tr><th>Plugin</th><th>Aksi</th><th>Jumlah</th><th>Terakhir</th></tr></thead>
                <tbody>${d.plugin_usage.map(p => `<tr>
                    <td style="font-weight:600">${icon('plug', 14)} ${esc(p.plugin_name)}</td>
                    <td><span class="badge ${p.action === 'DOWNLOAD' ? 'badge-purple' : 'badge-cyan'}">${p.action}</span></td>
                    <td style="font-weight:700">${p.count}x</td>
                    <td style="font-size:11px;color:var(--muted)">${fmtDate(p.last_used)}</td>
                </tr>`).join('')}</tbody></table>
            </div>` : '<p style="color:var(--muted);font-size:13px;padding:20px;text-align:center">Belum ada aktivitas plugin</p>'}
        </div>`;
            break;

        case 'edit':
            container.innerHTML = `
        <div class="detail-edit">
            <h4>${icon('edit', 16)} Edit License</h4>
            <div class="edit-grid">
                <div class="form-group">
                    <label>Tanggal Expired</label>
                    <div class="inline-edit">
                        <input type="date" id="modal-edit-exp" value="${exp.toISOString().split('T')[0]}">
                        <button class="btn btn-sm btn-primary" onclick="modalSaveExpiry()">${icon('save', 14)} Save</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Max Devices</label>
                    <div class="inline-edit">
                        <input type="number" id="modal-edit-maxdev" value="${d.max_devices}" min="1" max="100" style="width:80px">
                        <button class="btn btn-sm btn-primary" onclick="modalSaveMaxDevices()">${icon('save', 14)} Save</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Catatan / Nama User</label>
                    <div class="inline-edit">
                        <input type="text" id="modal-edit-note" value="${esc(d.note || '')}" placeholder="Nama user, keterangan...">
                        <button class="btn btn-sm btn-primary" onclick="modalSaveNote()">${icon('save', 14)} Save</button>
                    </div>
                </div>
            </div>
            <div style="margin-top:24px;display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-sm btn-ghost" onclick="openRenewModal(${d.id});closeKeyDetail()">${icon('clock', 14)} Renew</button>
                ${d.is_active ? `<button class="btn btn-sm btn-warning" onclick="revokeKeyDetail()">${icon('ban', 14)} Revoke Key</button>` : `<button class="btn btn-sm btn-success" onclick="activateKeyDetail()">${icon('check-circle', 14)} Activate Key</button>`}
                <button class="btn btn-sm btn-danger" onclick="if(confirm('Delete this license key and all associated device and log data?'))deleteKeyDetail()">${icon('trash', 14)} Delete Key</button>
            </div>
        </div>`;
            break;
    }
}

// Detail modal actions
async function modalSaveExpiry() {
    try { await api(`/api/admin/keys/${currentDetailId}/expiry`, { method: 'PUT', body: JSON.stringify({ expiry_date: new Date(document.getElementById('modal-edit-exp').value).toISOString() }) }); toast('Expired date diperbarui', 'success'); await refreshDetailData(); } catch (e) { toast(e.message, 'error'); }
}
async function modalSaveMaxDevices() {
    try { await api(`/api/admin/keys/${currentDetailId}/max-devices`, { method: 'PUT', body: JSON.stringify({ max_devices: parseInt(document.getElementById('modal-edit-maxdev').value) }) }); toast('Max devices diperbarui', 'success'); await refreshDetailData(); } catch (e) { toast(e.message, 'error'); }
}
async function modalSaveNote() {
    try { await api(`/api/admin/keys/${currentDetailId}/note`, { method: 'PUT', body: JSON.stringify({ note: document.getElementById('modal-edit-note').value }) }); toast('Catatan diperbarui', 'success'); } catch (e) { toast(e.message, 'error'); }
}
async function revokeKeyDetail() {
    try { await api(`/api/admin/keys/${currentDetailId}/revoke`, { method: 'PUT' }); toast('Key di-revoke', 'success'); await refreshDetailData(); loadKeys(); } catch (e) { toast(e.message, 'error'); }
}
async function activateKeyDetail() {
    try { await api(`/api/admin/keys/${currentDetailId}/activate`, { method: 'PUT' }); toast('Key diaktifkan', 'success'); await refreshDetailData(); loadKeys(); } catch (e) { toast(e.message, 'error'); }
}
async function deleteKeyDetail() {
    try { await api(`/api/admin/keys/${currentDetailId}`, { method: 'DELETE' }); toast('Key dihapus', 'success'); closeKeyDetail(); loadKeys(); } catch (e) { toast(e.message, 'error'); }
}

async function blockDevDetail(devId) {
    try { await api(`/api/admin/devices/${devId}/block`, { method: 'POST' }); toast('Device diblokir', 'success'); await refreshDetailData(); renderDetailTab('devices'); } catch (e) { toast(e.message, 'error'); }
}
async function unblockDevDetail(devId) {
    try { await api(`/api/admin/devices/${devId}/unblock`, { method: 'POST' }); toast('Device di-unblock', 'success'); await refreshDetailData(); renderDetailTab('devices'); } catch (e) { toast(e.message, 'error'); }
}
async function deleteDevDetail(devId) {
    try { await api(`/api/admin/devices/${devId}`, { method: 'DELETE' }); toast('Device dihapus', 'success'); await refreshDetailData(); renderDetailTab('devices'); } catch (e) { toast(e.message, 'error'); }
}

async function promptRenameDevice(devId, currentName) {
    const name = prompt('Masukkan label untuk device ini:', currentName);
    if (name === null) return;
    try { await api(`/api/admin/devices/${devId}/name`, { method: 'PUT', body: JSON.stringify({ name }) }); toast('Device di-rename', 'success'); await refreshDetailData(); renderDetailTab('devices'); } catch (e) { toast(e.message, 'error'); }
}

async function refreshDetailData() {
    if (!currentDetailId) return;
    try {
        const d = await api(`/api/admin/keys/${currentDetailId}/details`);
        currentDetailData = d;
    } catch (e) { /* ignore */ }
}

function getDeviceIcon(os) {
    if (!os) return icon('smartphone', 18);
    const lower = os.toLowerCase();
    if (lower.includes('android')) return icon('smartphone', 18);
    if (lower.includes('ios') || lower.includes('ipad')) return icon('smartphone', 18);
    if (lower.includes('windows')) return icon('monitor', 18);
    if (lower.includes('mac')) return icon('monitor', 18);
    if (lower.includes('linux')) return icon('monitor', 18);
    return icon('smartphone', 18);
}

// ============================================================
// KEYS (basic actions)
function openGenModal() { document.getElementById('gen-result').innerHTML = ''; document.getElementById('gen-name').value = ''; document.getElementById('gen-note').value = ''; document.getElementById('modal-gen').classList.add('active'); }
async function genKey() {
    try {
        const data = await api('/api/admin/keys/generate', {
            method: 'POST',
            body: JSON.stringify({
                duration_days: parseInt(document.getElementById('gen-duration').value),
                count: parseInt(document.getElementById('gen-count').value),
                max_devices: parseInt(document.getElementById('gen-maxdev').value),
                note: document.getElementById('gen-note').value.trim(),
                name: document.getElementById('gen-name') ? document.getElementById('gen-name').value.trim() : ''
            })
        });
        toast(data.message, 'success');
        const items = data.licenses ? data.licenses : [data.license];
        document.getElementById('gen-result').innerHTML = `
            <div class="gen-result"><h4>${icon('check-circle', 18)} Keys Generated Successfully!</h4>
            ${items.map(l => `<div class="gen-key-item" data-url="${esc(l.repo_url)}" onclick="copyUrl(this)" title="Click to copy URL">
                <span class="key-label">${icon('key', 14)} ${l.license_key}</span><span class="key-url">${icon('copy', 12)} ${esc(l.repo_url)}</span>
            </div>`).join('')}
            <p style="font-size:11px;color:var(--muted);margin-top:8px">Click a key to copy the repo URL.</p></div>`;
        loadKeys();
    } catch (e) { toast(e.message, 'error'); }
}

async function revokeKey(id) { try { await api(`/api/admin/keys/${id}/revoke`, { method: 'PUT' }); toast('Key di-revoke', 'success'); loadKeys(); } catch (e) { toast(e.message, 'error'); } }
async function activateKey(id) { try { await api(`/api/admin/keys/${id}/activate`, { method: 'PUT' }); toast('Key diaktifkan', 'success'); loadKeys(); } catch (e) { toast(e.message, 'error'); } }
async function confirmDeleteKey(id) {
    showConfirm('Hapus Key?', 'Data yang dihapus tidak bisa dikembalikan.', () => deleteKey(id));
}

// Custom Confirm Helper
function showConfirm(title, msg, onYes) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-msg').innerText = msg;
    const btn = document.getElementById('confirm-yes-btn');
    btn.onclick = () => { onYes(); closeConfirm(true); };
    document.getElementById('modal-confirm').classList.add('active');
}
function closeConfirm() { document.getElementById('modal-confirm').classList.remove('active'); }

async function deleteKey(id) {
    console.log('Deleting key ID:', id);
    try {
        await api(`/api/admin/keys/${id}`, { method: 'DELETE' });
        toast('Key dihapus', 'success');
        loadKeys();
    } catch (e) {
        toast('Gagal hapus: ' + e.message, 'error');
    }
}

function openRenewModal(id) { document.getElementById('renew-id').value = id; document.getElementById('modal-renew').classList.add('active'); }
async function renewKey() {
    try {
        const id = document.getElementById('renew-id').value;
        await api(`/api/admin/keys/${id}/renew`, { method: 'PUT', body: JSON.stringify({ days: parseInt(document.getElementById('renew-days').value) }) });
        toast('Key diperpanjang!', 'success');
        closeModal('modal-renew');
        loadKeys();
    } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// DEVICES & IPs TAB
// ============================================================
async function loadDevicesTab() {
    try {
        const [online, blocked] = await Promise.all([api('/api/admin/online'), api('/api/admin/blocked-ips')]);

        document.getElementById('online-list').innerHTML = online.length === 0
            ? '<p style="color:var(--muted);text-align:center;padding:20px">Tidak ada device online saat ini</p>'
            : online.map(d => {
                const displayName = d.device_name || d.device_model || 'Unknown Device';
                return `<div class="device-card-enhanced">
                <div class="device-card-left">
                    <div class="device-avatar online">${getDeviceIcon(d.os_info)}</div>
                    <div class="device-info-enhanced">
                        <div class="device-name-row"><span class="pulse"></span><span class="device-display-name">${esc(displayName)}</span> <span class="badge badge-purple">${maskKey(d.license_key)}</span></div>
                        <div class="device-meta-row">
                            ${d.device_model ? `<span class="device-meta-tag">${icon('smartphone', 12)} ${esc(d.device_model)}</span>` : ''}
                            ${d.os_info ? `<span class="device-meta-tag">${icon('monitor', 12)} ${esc(d.os_info)}</span>` : ''}
                            <span class="device-meta-tag">${icon('globe', 12)} ${d.ip_address}</span>
                            <span class="device-meta-tag dim">Last: ${fmtDate(d.last_seen)}</span>
                        </div>
                    </div>
                </div>
                <div class="device-card-right">
                    <button class="btn btn-xs btn-warning" onclick="blockDev2(${d.id})">Block</button>
                    <button class="btn btn-xs btn-ghost" onclick="addBlockedIP('${d.ip_address}','Online device')">${icon('ban', 12)} IP</button>
                </div>
            </div>`;
            }).join('');

        document.getElementById('blocked-list').innerHTML = blocked.length === 0
            ? '<p style="color:var(--muted);text-align:center;padding:20px">Tidak ada IP yang diblokir</p>'
            : blocked.map(b => `<div class="ip-item">
                <div class="ip-addr">${icon('ban', 14)} ${b.ip_address}</div>
                <div class="ip-reason">${esc(b.reason || '-')}</div>
                <div style="font-size:11px;color:var(--muted)">${fmtDate(b.blocked_at)}</div>
                <button class="btn btn-xs btn-success" onclick="removeBlockedIP('${b.ip_address}')">Unblock</button>
            </div>`).join('');
    } catch (e) { toast(e.message, 'error'); }
}

async function blockDev2(devId) { try { await api(`/api/admin/devices/${devId}/block`, { method: 'POST' }); toast('Device diblokir', 'success'); loadDevicesTab(); } catch (e) { toast(e.message, 'error'); } }

async function addBlockedIP(ip, reason) {
    if (!ip) { ip = document.getElementById('block-ip-input').value.trim(); reason = document.getElementById('block-ip-reason').value.trim(); }
    if (!ip) return toast('IP wajib diisi', 'error');
    try {
        await api('/api/admin/blocked-ips', { method: 'POST', body: JSON.stringify({ ip, reason }) });
        toast(`IP ${ip} diblokir`, 'success');
        if (document.getElementById('block-ip-input')) document.getElementById('block-ip-input').value = '';
        if (document.getElementById('block-ip-reason')) document.getElementById('block-ip-reason').value = '';
        loadDevicesTab();
    } catch (e) { toast(e.message, 'error'); }
}

async function removeBlockedIP(ip) { try { await api(`/api/admin/blocked-ips/${encodeURIComponent(ip)}`, { method: 'DELETE' }); toast(`IP ${ip} di-unblock`, 'success'); loadDevicesTab(); } catch (e) { toast(e.message, 'error'); } }

// ============================================================
// PLUGIN ACTIVITY TAB
// ============================================================
async function loadPluginStats() {
    try {
        const stats = await api('/api/admin/plugin-stats');

        // Popular plugins
        if (stats.popular && stats.popular.length > 0) {
            const maxTotal = stats.popular[0].total;
            document.getElementById('plugin-stats-popular').innerHTML = stats.popular.map(p => `
                <div class="plugin-bar-item">
                    <div class="plugin-bar-header">
                        <span class="plugin-bar-name">${icon('plug', 14)} ${esc(p.plugin_name)}</span>
                        <span class="plugin-bar-count">${p.total} total · ${p.downloads} downloads · ${p.unique_users} users</span>
                    </div>
                    <div class="plugin-bar-track">
                        <div class="plugin-bar-fill" style="width:${Math.max(5, (p.total / maxTotal) * 100)}%">
                            <span class="plugin-bar-dl">${icon('download', 12)}${p.downloads} ${icon('plug', 12)}${p.opens} ${icon('search', 12)}${p.searches || 0} ${icon('loader', 12)}${p.loads || 0} ${icon('play', 12)}${p.plays || 0}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            document.getElementById('plugin-stats-popular').innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;font-size:13px">Belum ada aktivitas plugin. Data akan muncul saat user download/buka plugin.</p>';
        }

        // Recent activity
        if (stats.recent && stats.recent.length > 0) {
            document.getElementById('plugin-stats-recent').innerHTML = `
            <div class="table-wrap" style="max-height:400px;overflow-y:auto">
                <table><thead><tr><th>Waktu</th><th>Plugin</th><th>Aksi</th><th>Detail</th><th>Key</th><th>User</th><th>Device</th><th>IP</th></tr></thead>
                <tbody>${stats.recent.map(r => {
                const keyParts = (r.license_key || '').split('-');
                const keyLabel = keyParts.length >= 2 ? `${keyParts[0]}-${keyParts[1]}` : '-';
                const userName = r.license_name || r.license_note || '-';
                const devName = r.device_name && r.device_name !== 'Unknown' ? r.device_name : '-';
                const detail = r.data ? r.data : '-';
                return `<tr>
                    <td style="font-size:11px;color:var(--muted)">${fmtDate(r.created_at)}</td>
                    <td style="font-weight:600">${icon('plug', 14)} ${esc(r.plugin_name)}</td>
                    <td><span class="badge ${r.action === 'DOWNLOAD' ? 'badge-purple' : 'badge-cyan'}">${r.action}</span></td>
                    <td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(detail)}">${esc(detail)}</td>
                    <td><span class="badge badge-cyan" style="font-size:10px">${keyLabel}</span></td>
                    <td style="font-size:12px">${esc(userName)}</td>
                    <td style="font-size:12px;font-weight:600">${esc(devName)}</td>
                    <td style="font-size:12px">${r.ip_address || '-'}</td>
                </tr>`;
            }).join('')}</tbody></table>
            </div>`;
        } else {
            document.getElementById('plugin-stats-recent').innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;font-size:13px">Belum ada aktivitas plugin terbaru.</p>';
        }
    } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// LOGS (with search)
// ============================================================
async function loadAllLogs() {
    try {
        const logs = await api('/api/admin/logs?limit=200');
        renderLogs(logs);
    } catch (e) { toast(e.message, 'error'); }
}

function debounceSearch() {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(searchLogsFilter, 300);
}

async function searchLogsFilter() {
    const query = document.getElementById('log-search-input').value.trim();
    const action = document.getElementById('log-action-filter').value;
    try {
        const logs = await api(`/api/admin/logs/search?query=${encodeURIComponent(query)}&action=${encodeURIComponent(action)}&limit=200`);
        renderLogs(logs);
    } catch (e) { toast(e.message, 'error'); }
}

function renderLogs(logs) {
    document.getElementById('all-logs').innerHTML = logs.length === 0
        ? '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:30px">Tidak ada log yang cocok</td></tr>'
        : logs.map(l => `
        <tr>
            <td style="font-size:11px;color:var(--muted)">${fmtDate(l.created_at)}</td>
            <td class="key-masked">${maskKey(l.license_key)}</td>
            <td><span class="badge ${actionBadge(l.action)}">${l.action}</span></td>
            <td style="font-size:12px">${l.ip_address || '-'}</td>
            <td style="font-size:11px;color:var(--muted);max-width:300px;overflow:hidden;text-overflow:ellipsis">${esc(l.details || '-')}</td>
        </tr>
    `).join('');
}

// ============================================================
// SETTINGS
// ============================================================
async function loadSettings() {
    try {
        const s = await api('/api/admin/settings');
        document.getElementById('setting-server-url').value = s.server_url || '';
        document.getElementById('setting-proxy').checked = s.proxy_downloads === 'true';
    } catch (e) { toast(e.message, 'error'); }
}
async function saveSettings() {
    try {
        await api('/api/admin/settings', {
            method: 'POST',
            body: JSON.stringify({ server_url: document.getElementById('setting-server-url').value.trim(), proxy_downloads: document.getElementById('setting-proxy').checked })
        });
        toast('Settings disimpan!', 'success');
    } catch (e) { toast(e.message, 'error'); }
}

// Password
function openPasswordModal() { document.getElementById('modal-password').classList.add('active'); }
async function changePass() {
    try {
        await api('/api/admin/change-password', { method: 'POST', body: JSON.stringify({ new_password: document.getElementById('new-pass').value }) });
        toast('Password diganti!', 'success');
        closeModal('modal-password');
    } catch (e) { toast(e.message, 'error'); }
}

// Utils
async function downloadBackup() {
    try {
        const res = await fetch('/api/admin/backup', {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        if (!res.ok) throw new Error('Download gagal');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-premium-${new Date().toISOString().slice(0, 10)}.db`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Backup berhasil didownload', 'success');
    } catch (e) { toast(e.message, 'error'); }
}

function triggerUpload() {
    document.getElementById('db-upload-input').click();
}

async function uploadRestore(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.name.endsWith('.db')) { toast('File harus berformat .db', 'error'); return; }

    showConfirm('Restore Database?', 'Database saat ini akan DIGANTI dengan file backup. Server akan restart otomatis. Lanjutkan?', async () => {
        try {
            const formData = new FormData();
            formData.append('database', file);

            const res = await fetch('/api/admin/restore', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + TOKEN },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload gagal');
            toast(data.message, 'success');
            // Reload after delay for server restart
            setTimeout(() => location.reload(), 3000);
        } catch (e) { toast(e.message, 'error'); }
    });
    input.value = ''; // Reset input
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function maskKey(k) { if (!k) return ''; const p = k.split('-'); return p[0] + '-****-****-' + p[p.length - 1]; }
function fmtDate(d) {
    if (!d) return '-';
    // Force UTC parsing if no timezone specified (server returns UTC without Z)
    const dateStr = d.endsWith('Z') ? d : d + 'Z';
    return new Date(dateStr).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: '2-digit', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}
function actionBadge(a) {
    const map = {
        'VALID': 'badge-green', 'REPO_ACCESS': 'badge-green', 'DOWNLOAD': 'badge-purple', 'PLUGIN_OPEN': 'badge-cyan', 'PLUGIN_CHECK': 'badge-cyan',
        'SEARCH': 'badge-blue', 'LOAD': 'badge-yellow', 'PLAY': 'badge-green',
        'DOWNLOAD_ERROR': 'badge-yellow', 'MAX_DEVICES': 'badge-yellow', 'BLOCKED_IP': 'badge-red', 'DEVICE_BLOCKED': 'badge-red',
        'REVOKED': 'badge-red', 'EXPIRED': 'badge-yellow', 'INVALID_KEY': 'badge-red'
    };
    return map[a] || 'badge-red';
}
function copyUrl(el) {
    const text = el.getAttribute('data-url') || el.textContent.trim();
    copyText(text);
}
function copyText(text) {
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) { toast('Copied: ' + text.substring(0, 50) + '...', 'success'); return; }
    } catch (e) { }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('Copied!', 'success')).catch(() => toast('Gagal copy, salin manual', 'error'));
    } else {
        window.prompt('Salin URL ini:', text);
    }
}
