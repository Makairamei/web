const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const db = require('./database');

// Multer setup for database upload
const upload = multer({ dest: '/tmp/', limits: { fileSize: 50 * 1024 * 1024 } });

// Auto-detect LAN IP
function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('172.') && !net.address.startsWith('10.')) {
                return net.address;
            }
        }
    }
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return 'localhost';
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// AUTH
// ============================================================
const adminTokens = new Map();
function generateToken() { return crypto.randomBytes(32).toString('hex'); }

function authMiddleware(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token || !adminTokens.has(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.admin = adminTokens.get(token);
    next();
}

// Rate limit
const rateLimiter = new Map();
function rateLimit(windowMs = 60000, max = 30) {
    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        let entry = rateLimiter.get(ip);
        if (!entry || now > entry.resetAt) {
            entry = { count: 0, resetAt: now + windowMs };
            rateLimiter.set(ip, entry);
        }
        entry.count++;
        if (entry.count > max) return res.status(429).json({ error: 'Too many requests' });
        next();
    };
}
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateLimiter) { if (now > v.resetAt) rateLimiter.delete(k); }
}, 300000);

// Plugin cache (5 min)
let pluginCache = null;
let pluginCacheTime = 0;
const CACHE_MS = 5 * 60 * 1000;

// Session tokens for extensions (1 hour expiry)
const sessionTokens = new Map();
function createSessionToken(key) {
    const token = crypto.randomBytes(16).toString('hex');
    sessionTokens.set(token, { key, created: Date.now() });
    return token;
}
setInterval(() => {
    const hour = 60 * 60 * 1000;
    for (const [t, v] of sessionTokens) {
        if (Date.now() - v.created > hour) sessionTokens.delete(t);
    }
}, 600000);

// ============================================================
// IP SESSIONS (For seamless plugin auth)
// ============================================================
const ipSessions = new Map();

function createIpSession(ip, key, durationMs = 24 * 60 * 60 * 1000) {
    ipSessions.set(ip, {
        key,
        expiresAt: Date.now() + durationMs
    });
}

function getIpSession(ip) {
    const session = ipSessions.get(ip);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
        ipSessions.delete(ip);
        return null;
    }
    return session;
}

// ============================================================
// HELPER: Extract plugin name from URL
// ============================================================
function extractPluginName(url) {
    if (!url) return 'Unknown';
    try {
        const urlDecoded = decodeURIComponent(url);
        const parts = urlDecoded.split('/');
        let filename = parts[parts.length - 1] || 'Unknown';
        // Remove query params
        filename = filename.split('?')[0];
        // Remove extension
        filename = filename.replace(/\.cs3$/i, '').replace(/\.apk$/i, '');
        // Clean up dashes/underscores to spaces
        filename = filename.replace(/[-_]+/g, ' ').trim();
        return filename || 'Unknown';
    } catch (e) {
        return 'Unknown';
    }
}

// Normalize device ID — treat junk values as empty
function cleanDeviceId(id) {
    if (!id || id === 'unknown' || id === 'null' || id === 'undefined' || id === 'N/A') return '';
    return id;
}

// ============================================================
// 🔓 PUBLIC API — Extension License Validation
// ============================================================

app.post('/api/validate', rateLimit(60000, 30), (req, res) => {
    try {
        const { key, device_id, device_name } = req.body;
        const ip = req.ip;

        if (!key) {
            return res.json({
                status: 'error',
                message: 'Masukkan License Key terlebih dahulu'
            });
        }

        const lic = db.getLicenseByKey(key);
        if (!lic) {
            db.logAccess(key, 'INVALID_KEY', ip, `device: ${device_id}`);
            return res.json({
                status: 'error',
                message: 'License key tidak ditemukan. Periksa kembali atau hubungi admin.'
            });
        }

        if (!lic.is_active) {
            db.logAccess(key, 'REVOKED', ip, `device: ${device_id}`);
            return res.json({
                status: 'revoked',
                message: 'License key telah di-revoke oleh admin.'
            });
        }

        const now = new Date();
        const expDate = new Date(lic.expired_at);
        if (now > expDate) {
            db.logAccess(key, 'EXPIRED', ip, `device: ${device_id}`);
            return res.json({
                status: 'expired',
                message: 'License key sudah expired. Hubungi admin untuk perpanjang.'
            });
        }

        const daysLeft = Math.ceil((expDate - now) / 86400000);
        const sessionToken = createSessionToken(key);
        db.logAccess(key, 'VALID', ip, `device: ${device_id} | ${device_name || 'Unknown'}`);

        res.json({
            status: 'active',
            message: 'License key aktif',
            expired_at: lic.expired_at,
            days_left: daysLeft,
            max_devices: lic.max_devices || 0,
            current_devices: 0,
            session_token: sessionToken
        });
    } catch (e) {
        console.error('Validate error:', e);
        res.status(500).json({
            status: 'error',
            message: 'Server error, coba lagi nanti'
        });
    }
});

app.get('/api/config', (req, res) => {
    res.json({
        server_url: db.getSetting('server_url') || `http://${getLocalIP()}:${PORT}`,
        version: '2.0.0'
    });
});

app.get('/api/check-ip', (req, res) => {
    const ip = req.ip;
    const deviceId = cleanDeviceId(req.query.device_id);
    const ua = req.headers['user-agent'] || '';
    const pluginName = req.query.plugin || null;

    const session = getIpSession(ip);

    if (!session) {
        return res.json({ status: 'error', message: 'IP belum terdaftar. Silakan refresh Repository.' });
    }

    const result = db.validateKey(session.key, ip, ua, deviceId || null);

    if (!result.valid) {
        const messages = {
            'EXPIRED': 'License key sudah expired',
            'REVOKED': 'License key di-revoke',
            'BLOCKED_IP': 'IP anda diblokir',
            'MAX_DEVICES': `Batas device tercapai (${result.current}/${result.max})`,
            'DEVICE_BLOCKED': 'Device anda diblokir'
        };
        // Only log errors, not routine checks
        db.logAccess(session.key, result.reason, ip, deviceId ? `Device: ${deviceId}` : '');
        return res.json({
            status: 'error',
            message: messages[result.reason] || 'Akses Ditolak'
        });
    }

    // Only log plugin OPEN events (not routine check-ip pings)
    if (pluginName) {
        const action = req.query.action || 'OPEN';
        const data = req.query.data || '';

        // Filter out routine checks if named 'check'
        if (action !== 'check') {
            const actionUpper = action.toUpperCase();
            db.logPluginActivity(session.key, pluginName, actionUpper, ip, deviceId);

            // Format details
            let details = pluginName;
            if (data) details += ` | ${data}`;

            db.logAccess(session.key, `PLUGIN_${actionUpper}`, ip, details);
        }
    }

    res.json({ status: 'active', message: 'IP & Device Valid', expiry: result.license.expired_at });
});

// ============================================================
// 🌟 PROXY REPO ENDPOINTS (KEY-GATED)
// ============================================================

app.get('/r/:key/repo.json', rateLimit(60000, 60), async (req, res) => {
    const ip = req.ip;
    const ua = req.headers['user-agent'] || '';
    const result = db.validateKey(req.params.key, ip, ua);

    if (!result.valid) {
        const messages = {
            'EXPIRED': 'License key sudah expired',
            'REVOKED': 'License key di-revoke',
            'BLOCKED_IP': 'IP anda diblokir',
            'MAX_DEVICES': `Batas device tercapai (${result.current}/${result.max})`,
            'DEVICE_BLOCKED': 'Device anda diblokir'
        };
        // If request accepts HTML (browser), show blocked page
        if (req.accepts('html')) {
            return res.status(403).sendFile(path.join(__dirname, 'public', 'blocked.html'));
        }
        return res.status(403).json({
            error: messages[result.reason] || 'License key tidak valid'
        });
    }

    createIpSession(ip, req.params.key);
    db.logAccess(req.params.key, 'REPO_ACCESS', ip, `Repo loaded`);

    const serverUrl = db.getSetting('server_url') || `http://${getLocalIP()}:${PORT}`;
    res.json({
        name: "Premium Extensions",
        description: "Premium CloudStream Extensions",
        manifestVersion: 1,
        pluginLists: [
            `${serverUrl}/r/${req.params.key}/plugins.json`
        ]
    });
});

app.get('/r/:key/plugins.json', rateLimit(60000, 60), async (req, res) => {
    const ip = req.ip;
    const ua = req.headers['user-agent'] || '';
    const result = db.validateKey(req.params.key, ip, ua);

    if (!result.valid) {
        return res.status(403).json({ error: 'Key tidak valid' });
    }

    try {
        const plugins = await fetchAllPlugins(req.params.key);
        res.json(plugins);
    } catch (err) {
        console.error('Fetch plugins error:', err.message);
        res.status(500).json({ error: 'Gagal fetch plugins dari source repos' });
    }
});

// Enhanced download proxy — logs plugin name
app.get('/r/:key/dl', rateLimit(60000, 120), async (req, res) => {
    const ip = req.ip;
    const ua = req.headers['user-agent'] || '';
    const result = db.validateKey(req.params.key, ip, ua);

    if (!result.valid) {
        return res.status(403).json({ error: 'Key tidak valid' });
    }

    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing url param' });

    const pluginName = extractPluginName(url);

    try {
        db.logAccess(req.params.key, 'DOWNLOAD', ip, pluginName);
        db.logPluginActivity(req.params.key, pluginName, 'DOWNLOAD', ip);

        const response = await fetch(url, {
            headers: { 'User-Agent': 'CloudStream/Premium-Proxy' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        res.setHeader('Content-Type', 'application/octet-stream');
        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);
    } catch (err) {
        console.error('Download proxy error:', err.message);
        db.logAccess(req.params.key, 'DOWNLOAD_ERROR', ip, `${pluginName} — ${err.message}`);
        res.status(500).json({ error: 'Gagal download file' });
    }
});

// ============================================================
// 🎬 PLAYBACK CHECK ENDPOINT (STRICT MODE)
// ============================================================
app.post('/api/check-play', rateLimit(60000, 100), (req, res) => {
    let { key, plugin_name, video_title, device_id } = req.body;
    const ip = req.ip;
    const ua = req.headers['user-agent'] || '';

    // 0. Auto-resolve Key from IP Session if missing
    if (!key) {
        const session = getIpSession(ip);
        if (session) {
            key = session.key;
        } else {
            return res.status(401).json({
                status: 'error',
                allowed: false,
                message: 'Session expired. Please refresh the Repository to re-authenticate.'
            });
        }
    }

    // 1. Validate License (Enhanced check with device ID if provided)
    const result = db.validateKey(key, ip, ua, device_id);

    if (!result.valid) {
        const messages = {
            'EXPIRED': 'License expired',
            'REVOKED': 'License revoked',
            'BLOCKED_IP': 'IP blocked',
            'MAX_DEVICES': 'Max devices reached',
            'DEVICE_BLOCKED': 'Device blocked',
            'INVALID_KEY': 'Invalid license key'
        };
        const reason = messages[result.reason] || 'Access denied';

        // Log failure
        db.logAccess(key, 'PLAY_BLOCK', ip, `${plugin_name} | ${video_title} | ${reason}`);
        db.logPluginActivity(key, plugin_name || 'Unknown', 'PLAY_BLOCK', ip, device_id);

        return res.status(403).json({
            status: 'error',
            allowed: false,
            message: reason
        });
    }

    // 2. Log Success
    db.logAccess(key, 'PLAY', ip, `${plugin_name} | ${video_title}`);
    db.logPluginActivity(key, plugin_name || 'Unknown', 'PLAY', ip, device_id);

    // 3. Return Success
    res.json({
        status: 'success',
        allowed: true,
        message: 'Playback authorized'
    });
});

// Fetch and merge plugins from all active repos
async function fetchAllPlugins(key) {
    if (pluginCache && (Date.now() - pluginCacheTime < CACHE_MS)) {
        return rewriteUrls(pluginCache, key);
    }

    const repos = db.getActiveRepos();
    let allPlugins = [];

    for (const repo of repos) {
        try {
            const res = await fetch(repo.url, {
                headers: { 'User-Agent': 'CloudStream/Premium-Proxy' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (Array.isArray(data)) {
                allPlugins.push(...data);
                console.log(`✅ Fetched ${repo.name}: ${data.length} plugins`);
            } else if (data.pluginLists) {
                for (const listUrl of data.pluginLists) {
                    try {
                        const listRes = await fetch(listUrl, {
                            headers: { 'User-Agent': 'CloudStream/Premium-Proxy' }
                        });
                        if (listRes.ok) {
                            const plugins = await listRes.json();
                            if (Array.isArray(plugins)) {
                                allPlugins.push(...plugins);
                                console.log(`✅ Fetched ${repo.name}: found plugins`);
                            }
                        }
                    } catch (e) {
                        console.error(`❌ Error fetching plugin list: ${e.message}`);
                    }
                }
            }
        } catch (e) {
            console.error(`❌ Error fetching ${repo.name}: ${e.message}`);
        }
    }

    pluginCache = allPlugins;
    pluginCacheTime = Date.now();
    return rewriteUrls(allPlugins, key);
}

// Rewrite .cs3 download URLs — ALWAYS proxy by default for security
function rewriteUrls(plugins, key) {
    const setting = db.getSetting('proxy_downloads');
    // Default to TRUE — only disable if explicitly set to 'false'
    const proxyDownloads = setting !== 'false';
    if (!proxyDownloads) {
        return plugins;
    }
    const serverUrl = db.getSetting('server_url') || `http://${getLocalIP()}:${PORT}`;
    return plugins.map(p => {
        const copy = { ...p };
        if (copy.url) {
            copy.url = `${serverUrl}/r/${key}/dl?url=${encodeURIComponent(copy.url)}`;
        }
        return copy;
    });
}

// ============================================================
// 🔒 ADMIN API
// ============================================================
app.post('/api/admin/login', rateLimit(60000, 10), (req, res) => {
    const { username, password } = req.body;
    const admin = db.verifyAdmin(username, password);
    if (!admin) return res.status(401).json({ error: 'Username atau password salah' });
    const token = generateToken();
    adminTokens.set(token, admin);
    res.json({ token, admin: { username: admin.username } });
});

app.post('/api/admin/change-password', authMiddleware, (req, res) => {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
    db.changeAdminPassword(req.admin.username, new_password);
    res.json({ message: 'Password diganti' });
});

// Stats
app.get('/api/admin/stats', authMiddleware, (req, res) => {
    res.json(db.getStats());
});

// Repos
app.get('/api/admin/repos', authMiddleware, (req, res) => {
    res.json(db.getAllRepos());
});

app.post('/api/admin/repos', authMiddleware, (req, res) => {
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Name dan URL wajib diisi' });
    const repo = db.addRepo(name, url);
    res.json(repo);
});

app.put('/api/admin/repos/:id/toggle', authMiddleware, (req, res) => {
    db.toggleRepo(req.params.id, req.body.active);
    res.json({ message: 'Repo diperbarui' });
});

app.delete('/api/admin/repos/:id', authMiddleware, (req, res) => {
    db.deleteRepo(req.params.id);
    res.json({ message: 'Repo dihapus' });
});

app.post('/api/admin/repos/refresh', authMiddleware, (req, res) => {
    pluginCache = null;
    pluginCacheTime = 0;
    res.json({ message: 'Cache plugin di-reset. Akan fetch ulang saat ada request.' });
});

// Keys
app.get('/api/admin/keys', authMiddleware, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const trashed = req.query.trashed === 'true';

    const result = db.getLicensesPaginated(page, limit, search, trashed);
    const serverUrl = db.getSetting('server_url') || `http://${getLocalIP()}:${PORT}`;

    res.json({
        ...result,
        data: result.data.map(k => ({
            ...k,
            repo_url: `${serverUrl}/r/${k.license_key}/repo.json`
        }))
    });
});

app.post('/api/admin/keys/bulk-delete', authMiddleware, (req, res) => {
    const { ids, force } = req.body; // force=true for permanent delete
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs invalid' });

    ids.forEach(id => {
        if (force) db.forceDeleteLicense(id);
        else db.deleteLicense(id);
    });
    res.json({ message: `${ids.length} key berhasil dihapus` });
});

app.post('/api/admin/keys/bulk-restore', authMiddleware, (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs invalid' });

    ids.forEach(id => db.restoreLicense(id));
    res.json({ message: `${ids.length} key berhasil dipulihkan` });
});

app.post('/api/admin/keys/bulk-renew', authMiddleware, (req, res) => {
    const { ids, days } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs invalid' });

    ids.forEach(id => db.renewLicense(id, parseInt(days)));
    res.json({ message: `${ids.length} key berhasil diperpanjang` });
});

app.delete('/api/admin/trash', authMiddleware, (req, res) => {
    db.emptyTrash();
    res.json({ message: 'Sampah berhasil dikosongkan' });
});

app.post('/api/admin/keys/generate', authMiddleware, (req, res) => {
    const { duration_days = 30, note = '', name = '', count = 1, max_devices = 2 } = req.body;
    const serverUrl = db.getSetting('server_url') || `http://${getLocalIP()}:${PORT}`;
    if (count > 1) {
        // Bulk currently doesn't support individual names, maybe auto-gen names? User didn't ask.
        const licenses = db.createBulkLicenses({ count, durationDays: duration_days, note, maxDevices: max_devices });
        return res.json({
            message: `${count} key berhasil dibuat`,
            licenses: licenses.map(l => ({ ...l, repo_url: `${serverUrl}/r/${l.license_key}/repo.json` }))
        });
    }
    const license = db.createLicense({ durationDays: duration_days, note, name, maxDevices: max_devices });
    res.json({
        message: 'Key berhasil dibuat',
        license: { ...license, repo_url: `${serverUrl}/r/${license.license_key}/repo.json` }
    });
});

app.put('/api/admin/keys/:id/revoke', authMiddleware, (req, res) => {
    db.revokeLicense(req.params.id); res.json({ message: 'Key di-revoke' });
});

app.put('/api/admin/keys/:id/activate', authMiddleware, (req, res) => {
    db.activateLicense(req.params.id); res.json({ message: 'Key diaktifkan' });
});

app.delete('/api/admin/keys/:id', authMiddleware, (req, res) => {
    db.deleteLicense(req.params.id); res.json({ message: 'Key dihapus' });
});

app.put('/api/admin/keys/:id/renew', authMiddleware, (req, res) => {
    const { days } = req.body;
    db.renewLicense(req.params.id, parseInt(days));
    res.json({ message: 'Key diperpanjang' });
});

app.get('/api/admin/keys/:id/details', authMiddleware, (req, res) => {
    const d = db.getKeyDetails(req.params.id);
    if (!d) return res.status(404).json({ error: 'Key tidak ditemukan' });
    const serverUrl = db.getSetting('server_url') || `http://${getLocalIP()}:${PORT}`;
    d.repo_url = `${serverUrl}/r/${d.license_key}/repo.json`;
    res.json(d);
});

app.put('/api/admin/keys/:id/expiry', authMiddleware, (req, res) => {
    db.updateLicenseExpiry(req.params.id, req.body.expiry_date);
    res.json({ message: 'Expired date diperbarui' });
});

app.put('/api/admin/keys/:id/max-devices', authMiddleware, (req, res) => {
    db.updateLicenseMaxDevices(req.params.id, req.body.max_devices);
    res.json({ message: 'Max devices diperbarui' });
});

app.put('/api/admin/keys/:id/note', authMiddleware, (req, res) => {
    db.updateLicenseNote(req.params.id, req.body.note);
    res.json({ message: 'Catatan diperbarui' });
});

app.put('/api/admin/keys/:id/name', authMiddleware, (req, res) => {
    db.updateLicenseName(req.params.id, req.body.name);
    res.json({ message: 'Nama diperbarui' });
});

// Devices
app.get('/api/admin/devices', authMiddleware, (req, res) => {
    // Return online devices first, then recent offline
    const online = db.getOnlineDevices();
    const all = db.getAllDevicesRecent(20);
    const onlineIds = new Set(online.map(d => d.id));
    const offline = all.filter(d => !onlineIds.has(d.id));
    res.json([...online, ...offline].slice(0, 20));
});
app.post('/api/admin/devices/:id/block', authMiddleware, (req, res) => {
    db.blockDevice(req.params.id); res.json({ message: 'Device diblokir' });
});

app.post('/api/admin/devices/:id/unblock', authMiddleware, (req, res) => {
    db.unblockDevice(req.params.id); res.json({ message: 'Device di-unblock' });
});

app.delete('/api/admin/devices/:id', authMiddleware, (req, res) => {
    db.deleteDevice(req.params.id); res.json({ message: 'Device dihapus' });
});

// NEW: Rename device
app.put('/api/admin/devices/:id/name', authMiddleware, (req, res) => {
    db.renameDevice(req.params.id, req.body.name || '');
    res.json({ message: 'Device renamed' });
});

app.get('/api/admin/online', authMiddleware, (req, res) => {
    res.json(db.getOnlineDevices());
});

// Blocked IPs
app.get('/api/admin/blocked-ips', authMiddleware, (req, res) => {
    res.json(db.getBlockedIPs());
});

app.post('/api/admin/blocked-ips', authMiddleware, (req, res) => {
    const { ip, reason } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP wajib diisi' });
    db.blockIP(ip, reason);
    res.json({ message: `IP ${ip} diblokir` });
});

app.delete('/api/admin/blocked-ips/:ip', authMiddleware, (req, res) => {
    db.unblockIP(req.params.ip);
    res.json({ message: 'IP di-unblock' });
});

// Logs
app.get('/api/admin/logs', authMiddleware, (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json(db.getRecentLogs(limit));
});

// NEW: Log search
app.get('/api/admin/logs/search', authMiddleware, (req, res) => {
    const { query, action, limit } = req.query;
    res.json(db.searchLogs({
        query: query || '',
        action: action || '',
        limit: parseInt(limit) || 100
    }));
});

// NEW: Plugin stats
app.get('/api/admin/plugin-stats', authMiddleware, (req, res) => {
    res.json(db.getPluginStats());
});

// Backup Database
app.get('/api/admin/backup', authMiddleware, (req, res) => {
    const file = path.join(__dirname, 'premium.db');
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Database file tidak ditemukan' });
    res.download(file, `backup-premium-${new Date().toISOString().slice(0, 10)}.db`);
});

// Restore Database
app.post('/api/admin/restore', authMiddleware, upload.single('database'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const uploadedPath = req.file.path;
        const dbPath = path.join(__dirname, 'premium.db');
        const backupPath = path.join(__dirname, `premium-backup-${Date.now()}.db`);

        // Create backup of current database first
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, backupPath);
        }

        // Replace with uploaded file
        fs.copyFileSync(uploadedPath, dbPath);
        fs.unlinkSync(uploadedPath); // Clean temp file

        res.json({ message: 'Database berhasil di-restore! Server akan restart dalam 3 detik...' });

        // Restart server after response
        setTimeout(() => {
            const { exec } = require('child_process');
            exec('pm2 restart cs-premium', (err) => {
                if (err) console.error('PM2 restart error:', err);
            });
        }, 2000);
    } catch (e) {
        console.error('Restore error:', e);
        res.status(500).json({ error: 'Gagal restore: ' + e.message });
    }
});

// Settings
app.get('/api/admin/settings', authMiddleware, (req, res) => {
    const settings = {};
    db.getAllSettings().forEach(s => settings[s.key] = s.value);
    res.json(settings);
});

app.post('/api/admin/settings', authMiddleware, (req, res) => {
    if (req.body.server_url !== undefined) db.setSetting('server_url', req.body.server_url);
    if (req.body.proxy_downloads !== undefined) db.setSetting('proxy_downloads', req.body.proxy_downloads ? 'true' : 'false');
    res.json({ message: 'Settings disimpan' });
});

// ============================================================
// START
// ============================================================
db.initDatabase().then(() => {
    // Fetch plugins on startup
    fetchAllPlugins('__startup__').catch(() => { });

    app.listen(PORT, '0.0.0.0', () => {
        const ip = getLocalIP();
        console.log(`
╔════════════════════════════════════════════════════════╗
║   CS Premium — Repo Proxy Gateway                      ║
╠════════════════════════════════════════════════════════╣
║   Dashboard : http://localhost:${PORT}                   ║
║   LAN/Phone : http://${ip}:${PORT}                    ║
║   Server URL: ${db.getSetting('server_url')}                               ║
║                                                        ║
║   Login: admin / admin123                              ║
║   ⚠️  Ganti password default setelah login!             ║
╚════════════════════════════════════════════════════════╝
`);
    });
});
