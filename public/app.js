const API = '';
let TOKEN = '';
let refreshInterval = null;

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
        const loaders = { repos: loadRepos, keys: loadKeys, logs: loadAllLogs, settings: loadSettings, dashboard: loadDashboard, devices: loadDevicesTab };
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
        document.getElementById('app-login').classList.add('hidden');
        document.getElementById('app-main').classList.remove('hidden');
        loadDashboard();
        // Auto-refresh dashboard every 30s
        refreshInterval = setInterval(() => {
            const active = document.querySelector('.tab.active');
            if (active && active.dataset.tab === 'dashboard') loadDashboard();
            if (active && active.dataset.tab === 'devices') loadDevicesTab();
        }, 30000);
    } catch (e) { toast(e.message, 'error'); }
}

function logout() { TOKEN = ''; if (refreshInterval) clearInterval(refreshInterval); location.reload(); }

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
    try {
        const stats = await api('/api/admin/stats');
        document.getElementById('stats-grid').innerHTML = `
            <div class="stat-card"><div class="label">Total Keys</div><div class="value purple">${stats.total_keys}</div></div>
            <div class="stat-card"><div class="label">Active Keys</div><div class="value green">${stats.active_keys}</div></div>
            <div class="stat-card"><div class="label">Expired</div><div class="value yellow">${stats.expired_keys}</div></div>
            <div class="stat-card"><div class="label">Revoked</div><div class="value red">${stats.revoked_keys}</div></div>
            <div class="stat-card"><div class="label">Online Devices</div><div class="value cyan"><span class="pulse"></span>${stats.online_devices}</div></div>
            <div class="stat-card"><div class="label">Total Devices</div><div class="value purple">${stats.total_devices}</div></div>
            <div class="stat-card"><div class="label">Blocked IPs</div><div class="value red">${stats.blocked_ips}</div></div>
            <div class="stat-card"><div class="label">Access 24h</div><div class="value">${stats.access_24h}</div></div>
            <div class="stat-card"><div class="label">Source Repos</div><div class="value purple">${stats.active_repos}/${stats.total_repos}</div></div>
        `;
        const logs = await api('/api/admin/logs?limit=10');
        document.getElementById('recent-logs').innerHTML = logs.map(l => `
            <tr>
                <td style="font-size:11px;color:var(--muted)">${fmtDate(l.created_at)}</td>
                <td class="key-masked">${maskKey(l.license_key)}</td>
                <td><span class="badge ${actionBadge(l.action)}">${l.action}</span></td>
                <td style="font-size:12px">${l.ip_address || '-'}</td>
                <td style="font-size:11px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis">${l.details || '-'}</td>
            </tr>
        `).join('');
    } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// REPOS
// ============================================================
async function loadRepos() {
    try {
        const repos = await api('/api/admin/repos');
        if (repos.length === 0) {
            document.getElementById('repo-list').innerHTML = '<p style="color:var(--muted);text-align:center;padding:30px">Belum ada repo. Klik ➕ Tambah Repo.</p>';
            return;
        }
        document.getElementById('repo-list').innerHTML = repos.map(r => `
            <div class="repo-item">
                <div class="repo-info">
                    <div class="repo-name">${r.is_active ? '🟢' : '🔴'} ${esc(r.name)}</div>
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
async function loadKeys() {
    try {
        const keys = await api('/api/admin/keys');
        if (keys.length === 0) {
            document.getElementById('keys-table').innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:30px">Belum ada key. Klik ✨ Generate Key.</td></tr>';
            return;
        }
        document.getElementById('keys-table').innerHTML = keys.map(k => {
            const now = new Date(), exp = new Date(k.expired_at), isExp = now > exp;
            const status = !k.is_active ? 'REVOKED' : isExp ? 'EXPIRED' : 'ACTIVE';
            const badge = status === 'ACTIVE' ? 'badge-green' : status === 'EXPIRED' ? 'badge-yellow' : 'badge-red';
            const days = Math.ceil((exp - now) / 86400000);
            const onlineDot = k.online_count > 0 ? '<span class="pulse"></span>' : '';
            return `<tr id="key-row-${k.id}" style="cursor:pointer" onclick="toggleKeyDetails(${k.id})">
                <td><span class="key-masked" title="${k.license_key}">${onlineDot}${maskKey(k.license_key)}</span></td>
                <td><div class="url-box"><span class="url-text">${esc(k.repo_url)}</span><button class="copy-btn" data-url="${esc(k.repo_url)}" onclick="event.stopPropagation();copyUrl(this)">📋</button></div></td>
                <td><span class="badge ${badge}">${status}</span></td>
                <td>${k.duration_days}d</td>
                <td style="font-size:12px">${exp.toLocaleDateString('id')} <small style="color:var(--muted)">${status === 'ACTIVE' ? days + 'd left' : ''}</small></td>
                <td><span class="badge badge-cyan">${k.device_count}/${k.max_devices}</span></td>
                <td style="font-size:12px;color:var(--muted);max-width:100px;overflow:hidden;text-overflow:ellipsis">${esc(k.note || '-')}</td>
                <td>
                    <div style="display:flex;gap:4px;flex-wrap:wrap" onclick="event.stopPropagation()">
                        ${status === 'ACTIVE' ? `<button class="btn btn-xs btn-warning" onclick="revokeKey(${k.id})">Revoke</button>` : `<button class="btn btn-xs btn-success" onclick="activateKey(${k.id})">Aktifkan</button>`}
                        <button class="btn btn-xs btn-ghost" onclick="openRenewModal(${k.id})">⏰</button>
                        <button class="btn btn-xs btn-danger" onclick="if(confirm('Hapus?'))deleteKey(${k.id})">🗑️</button>
                    </div>
                </td>
            </tr>
            <tr id="key-detail-${k.id}" style="display:none"><td colspan="9" id="key-detail-content-${k.id}"></td></tr>`;
        }).join('');
    } catch (e) { toast(e.message, 'error'); }
}

async function toggleKeyDetails(id) {
    const row = document.getElementById(`key-detail-${id}`);
    if (row.style.display !== 'none') { row.style.display = 'none'; return; }
    row.style.display = '';
    const td = document.getElementById(`key-detail-content-${id}`);
    td.innerHTML = '<p style="color:var(--muted);padding:10px">Loading...</p>';
    try {
        const d = await api(`/api/admin/keys/${id}/details`);
        const exp = new Date(d.expired_at);
        td.innerHTML = `
        <div class="detail-panel">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
                <div class="form-group">
                    <label>Expired Date</label>
                    <div class="inline-edit">
                        <input type="date" id="edit-exp-${id}" value="${exp.toISOString().split('T')[0]}">
                        <button class="btn btn-xs btn-primary" onclick="saveExpiry(${id})">💾</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Max Devices</label>
                    <div class="inline-edit">
                        <input type="number" id="edit-maxdev-${id}" value="${d.max_devices}" min="1" max="100" style="width:80px">
                        <button class="btn btn-xs btn-primary" onclick="saveMaxDevices(${id})">💾</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Catatan</label>
                    <div class="inline-edit">
                        <input type="text" id="edit-note-${id}" value="${esc(d.note || '')}" placeholder="Nama user...">
                        <button class="btn btn-xs btn-primary" onclick="saveNote(${id})">💾</button>
                    </div>
                </div>
            </div>
            <h4>📱 Devices Terhubung (${d.device_count}/${d.max_devices})</h4>
            ${d.devices.length === 0 ? '<p style="color:var(--muted);font-size:13px">Belum ada device terhubung</p>' :
                d.devices.map(dev => {
                    const online = (new Date() - new Date(dev.last_seen)) < 5 * 60 * 1000;
                    return `<div class="device-card">
                    <div class="device-info">
                        <div class="device-ip">${online ? '<span class="pulse"></span>' : ''}${dev.ip_address} ${dev.is_blocked ? '<span class="badge badge-red">BLOCKED</span>' : ''}</div>
                        <div class="device-meta">ID: ${dev.device_id} | UA: ${esc((dev.user_agent || '').substring(0, 60))} | Last: ${fmtDate(dev.last_seen)}</div>
                    </div>
                    <div class="device-actions">
                        ${dev.is_blocked ? `<button class="btn btn-xs btn-success" onclick="unblockDev(${dev.id},${id})">Unblock</button>` : `<button class="btn btn-xs btn-warning" onclick="blockDev(${dev.id},${id})">Block</button>`}
                        <button class="btn btn-xs btn-danger" onclick="if(confirm('Hapus device?'))deleteDev(${dev.id},${id})">🗑️</button>
                        <button class="btn btn-xs btn-ghost" onclick="addBlockedIP('${dev.ip_address}','From device ${dev.device_id}')">🚫 Block IP</button>
                    </div>
                </div>`;
                }).join('')}
            <h4 style="margin-top:16px">📋 Log Terakhir</h4>
            <div class="table-wrap" style="max-height:200px;overflow-y:auto">
                <table><thead><tr><th>Waktu</th><th>Aksi</th><th>IP</th><th>Detail</th></tr></thead>
                <tbody>${d.recent_logs.map(l => `<tr>
                    <td style="font-size:11px;color:var(--muted)">${fmtDate(l.created_at)}</td>
                    <td><span class="badge ${actionBadge(l.action)}">${l.action}</span></td>
                    <td style="font-size:12px">${l.ip_address || '-'}</td>
                    <td style="font-size:11px;color:var(--muted)">${esc(l.details || '-')}</td>
                </tr>`).join('')}</tbody></table>
            </div>
        </div>`;
    } catch (e) { td.innerHTML = `<p style="color:var(--danger);padding:10px">${e.message}</p>`; }
}

async function saveExpiry(id) { try { await api(`/api/admin/keys/${id}/expiry`, { method: 'PUT', body: JSON.stringify({ expiry_date: new Date(document.getElementById(`edit-exp-${id}`).value).toISOString() }) }); toast('Expired date diperbarui', 'success'); loadKeys(); } catch (e) { toast(e.message, 'error'); } }
async function saveMaxDevices(id) { try { await api(`/api/admin/keys/${id}/max-devices`, { method: 'PUT', body: JSON.stringify({ max_devices: parseInt(document.getElementById(`edit-maxdev-${id}`).value) }) }); toast('Max devices diperbarui', 'success'); loadKeys(); } catch (e) { toast(e.message, 'error'); } }
async function saveNote(id) { try { await api(`/api/admin/keys/${id}/note`, { method: 'PUT', body: JSON.stringify({ note: document.getElementById(`edit-note-${id}`).value }) }); toast('Catatan diperbarui', 'success'); } catch (e) { toast(e.message, 'error'); } }

async function blockDev(devId, keyId) { try { await api(`/api/admin/devices/${devId}/block`, { method: 'POST' }); toast('Device diblokir', 'success'); toggleKeyDetails(keyId); toggleKeyDetails(keyId); } catch (e) { toast(e.message, 'error'); } }
async function unblockDev(devId, keyId) { try { await api(`/api/admin/devices/${devId}/unblock`, { method: 'POST' }); toast('Device di-unblock', 'success'); toggleKeyDetails(keyId); toggleKeyDetails(keyId); } catch (e) { toast(e.message, 'error'); } }
async function deleteDev(devId, keyId) { try { await api(`/api/admin/devices/${devId}`, { method: 'DELETE' }); toast('Device dihapus', 'success'); toggleKeyDetails(keyId); toggleKeyDetails(keyId); } catch (e) { toast(e.message, 'error'); } }

function openGenModal() { document.getElementById('gen-result').innerHTML = ''; document.getElementById('modal-gen').classList.add('active'); }
async function genKey() {
    try {
        const data = await api('/api/admin/keys/generate', {
            method: 'POST',
            body: JSON.stringify({
                duration_days: parseInt(document.getElementById('gen-duration').value),
                count: parseInt(document.getElementById('gen-count').value),
                max_devices: parseInt(document.getElementById('gen-maxdev').value),
                note: document.getElementById('gen-note').value
            })
        });
        toast(data.message, 'success');
        const items = data.licenses ? data.licenses : [data.license];
        document.getElementById('gen-result').innerHTML = `
            <div class="gen-result"><h4>✅ Key Berhasil Dibuat!</h4>
            ${items.map(l => `<div class="gen-key-item" data-url="${esc(l.repo_url)}" onclick="copyUrl(this)" title="Klik untuk copy URL">
                <span class="key-label">🔑 ${l.license_key}</span><span class="key-url">📋 ${esc(l.repo_url)}</span>
            </div>`).join('')}
            <p style="font-size:11px;color:var(--muted);margin-top:8px">Klik key untuk copy URL repo.</p></div>`;
        loadKeys();
    } catch (e) { toast(e.message, 'error'); }
}

async function revokeKey(id) { try { await api(`/api/admin/keys/${id}/revoke`, { method: 'PUT' }); toast('Key di-revoke', 'success'); loadKeys(); } catch (e) { toast(e.message, 'error'); } }
async function activateKey(id) { try { await api(`/api/admin/keys/${id}/activate`, { method: 'PUT' }); toast('Key diaktifkan', 'success'); loadKeys(); } catch (e) { toast(e.message, 'error'); } }
async function deleteKey(id) { try { await api(`/api/admin/keys/${id}`, { method: 'DELETE' }); toast('Key dihapus', 'success'); loadKeys(); } catch (e) { toast(e.message, 'error'); } }

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
            : online.map(d => `<div class="device-card">
                <div class="device-info">
                    <div class="device-ip"><span class="pulse"></span>${d.ip_address} <span class="badge badge-purple">${maskKey(d.license_key)}</span></div>
                    <div class="device-meta">Last: ${fmtDate(d.last_seen)} | UA: ${esc((d.user_agent || '').substring(0, 80))}</div>
                </div>
                <div class="device-actions">
                    <button class="btn btn-xs btn-warning" onclick="blockDev2(${d.id})">Block Device</button>
                    <button class="btn btn-xs btn-ghost" onclick="addBlockedIP('${d.ip_address}','Online device')">🚫 Block IP</button>
                </div>
            </div>`).join('');

        document.getElementById('blocked-list').innerHTML = blocked.length === 0
            ? '<p style="color:var(--muted);text-align:center;padding:20px">Tidak ada IP yang diblokir</p>'
            : blocked.map(b => `<div class="ip-item">
                <div class="ip-addr">🚫 ${b.ip_address}</div>
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
        document.getElementById('block-ip-input').value = '';
        document.getElementById('block-ip-reason').value = '';
        loadDevicesTab();
    } catch (e) { toast(e.message, 'error'); }
}

async function removeBlockedIP(ip) { try { await api(`/api/admin/blocked-ips/${encodeURIComponent(ip)}`, { method: 'DELETE' }); toast(`IP ${ip} di-unblock`, 'success'); loadDevicesTab(); } catch (e) { toast(e.message, 'error'); } }

// ============================================================
// LOGS
// ============================================================
async function loadAllLogs() {
    try {
        const logs = await api('/api/admin/logs?limit=100');
        document.getElementById('all-logs').innerHTML = logs.map(l => `
            <tr>
                <td style="font-size:11px;color:var(--muted)">${fmtDate(l.created_at)}</td>
                <td class="key-masked">${maskKey(l.license_key)}</td>
                <td><span class="badge ${actionBadge(l.action)}">${l.action}</span></td>
                <td style="font-size:12px">${l.ip_address || '-'}</td>
                <td style="font-size:11px;color:var(--muted);max-width:300px;overflow:hidden;text-overflow:ellipsis">${esc(l.details || '-')}</td>
            </tr>
        `).join('');
    } catch (e) { toast(e.message, 'error'); }
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

// ============================================================
// UTILS
// ============================================================
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function maskKey(k) { if (!k) return ''; const p = k.split('-'); return p[0] + '-****-****-' + p[p.length - 1]; }
function truncUrl(u) { return u.length > 45 ? u.substring(0, 45) + '...' : u; }
function fmtDate(d) { if (!d) return '-'; return new Date(d).toLocaleString('id', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function actionBadge(a) { return a === 'VALID' ? 'badge-green' : a === 'DOWNLOAD' ? 'badge-purple' : a === 'MAX_DEVICES' ? 'badge-yellow' : a === 'BLOCKED_IP' || a === 'DEVICE_BLOCKED' ? 'badge-red' : 'badge-red'; }
function copyUrl(el) {
    const text = el.getAttribute('data-url') || el.textContent.trim();
    copyText(text);
}
function copyText(text) {
    // Use textarea method first (works on HTTP, not just HTTPS)
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
    // Fallback to clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('Copied!', 'success')).catch(() => toast('Gagal copy, salin manual', 'error'));
    } else {
        // Last resort: show in prompt
        window.prompt('Salin URL ini:', text);
    }
}
