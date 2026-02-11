const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const os = require('os');
const db = require('./database');

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
    // fallback: any non-internal IPv4
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
// Cleanup expired tokens every 10 min
setInterval(() => {
    const hour = 60 * 60 * 1000;
    for (const [t, v] of sessionTokens) {
        if (Date.now() - v.created > hour) sessionTokens.delete(t);
    }
}, 600000);

// ============================================================
// IP SESSIONS (For seamless plugin auth)
// ============================================================
const ipSessions = new Map(); // IP -> { key, expiresAt }

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
// 🔓 PUBLIC API — Extension License Validation
// Extensions call this to check if a key is valid
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

        // Valid! Create session token
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

// Public config endpoint (extensions can discover server URL)
app.get('/api/config', (req, res) => {
    res.json({
        server_url: db.getSetting('server_url') || `http://${getLocalIP()}:${PORT}`,
        version: '2.0.0'
    });
});

// Check IP & Device Status (Called by plugins automatically)
app.get('/api/check-ip', (req, res) => {
    const ip = req.ip;
    const deviceId = req.query.device_id || null;
    const ua = req.headers['user-agent'] || '';

    const session = getIpSession(ip);

    if (!session) {
        return res.json({ status: 'error', message: 'IP belum terdaftar. Silakan refresh Repository.' });
    }

    // STRICT DEVICE CHECK & VALIDATE KEY
    const result = db.validateKey(session.key, ip, ua, deviceId);

    if (!result.valid) {
        const messages = {
            'EXPIRED': 'License key sudah expired',
            'REVOKED': 'License key di-revoke',
            'BLOCKED_IP': 'IP anda diblokir',
            'MAX_DEVICES': `Batas device tercapai (${result.current}/${result.max})`,
            'DEVICE_BLOCKED': 'Device anda diblokir'
        };
        return res.json({ 
            status: 'error', 
            message: messages[result.reason] || 'Akses Ditolak' 
        });
    }

    if (deviceId) {
        db.logAccess(session.key, 'PLUGIN_CHECK', ip, `Device: ${deviceId}`);
    } else {
        db.logAccess(session.key, 'PLUGIN_CHECK', ip, 'Auto-Check (No Device ID)');
    }

    res.json({ status: 'active', message: 'IP & Device Valid', expiry: result.license.expired_at });
});

// ============================================================
// 🌟 PROXY REPO ENDPOINTS (KEY-GATED)
// These are what CloudStream users add as their repo URL
// ============================================================


// repo.json — entry point for CloudStream
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
        return res.status(403).json({
            error: messages[result.reason] || 'License key tidak valid'
        });
    }

    // REGISTER IP SESSION!
    // User accessed repo with valid key -> IP is now authorized for plugins
    createIpSession(ip, req.params.key);

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

// plugins.json — merged from all active source repos
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

// .cs3 download proxy — proxies the actual file through the server
app.get('/r/:key/dl', rateLimit(60000, 120), async (req, res) => {
    const ip = req.ip;
    const ua = req.headers['user-agent'] || '';
    const result = db.validateKey(req.params.key, ip, ua);

    if (!result.valid) {
        return res.status(403).json({ error: 'Key tidak valid' });
    }

    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing url param' });

    try {
        db.logAccess(req.params.key, 'DOWNLOAD', ip, url);
        const response = await fetch(url, {
            headers: { 'User-Agent': 'CloudStream/Premium-Proxy' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        res.setHeader('Content-Type', 'application/octet-stream');
        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);
    } catch (err) {
        console.error('Download proxy error:', err.message);
        res.status(500).json({ error: 'Gagal download file' });
    }
});

// Fetch and merge plugins from all active repos
async function fetchAllPlugins(key) {
    // Check cache
    if (pluginCache && (Date.now() - pluginCacheTime < CACHE_MS)) {
        return rewriteUrls(pluginCache, key);
    }

    const repos = db.getActiveRepos();
    if (repos.length === 0) return [];

    let allPlugins = [];

    for (const repo of repos) {
        try {
            let pluginsUrl = repo.url;

            // If URL is a repo.json, fetch it first to get plugins.json URL
            if (pluginsUrl.includes('repo.json')) {
                const repoRes = await fetch(pluginsUrl);
                const repoData = await repoRes.json();
                if (repoData.pluginLists && repoData.pluginLists.length > 0) {
                    // Fetch each plugins.json
                    for (const pUrl of repoData.pluginLists) {
                        const pRes = await fetch(pUrl);
                        const plugins = await pRes.json();
                        if (Array.isArray(plugins)) {
                            allPlugins = allPlugins.concat(plugins);
                        }
                    }
                }
            }
            // If URL is a direct plugins.json
            else if (pluginsUrl.includes('plugins.json')) {
                const pRes = await fetch(pluginsUrl);
                const plugins = await pRes.json();
                if (Array.isArray(plugins)) {
                    allPlugins = allPlugins.concat(plugins);
                }
            }
            // If URL is a GitHub repo URL, try builds branch
            else if (pluginsUrl.includes('github.com')) {
                const match = pluginsUrl.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
                if (match) {
                    const [, owner, repoName] = match;
                    const cleanRepo = repoName.replace(/\.git$/, '');
                    // Try builds branch
                    const buildUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}/builds/plugins.json`;
                    try {
                        const pRes = await fetch(buildUrl);
                        if (pRes.ok) {
                            const plugins = await pRes.json();
                            if (Array.isArray(plugins)) {
                                allPlugins = allPlugins.concat(plugins);
                            }
                        }
                    } catch (_) { }
                    // Try main branch repo.json
                    if (allPlugins.length === 0) {
                        const repoJsonUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/repo.json`;
                        try {
                            const rRes = await fetch(repoJsonUrl);
                            if (rRes.ok) {
                                const rData = await rRes.json();
                                if (rData.pluginLists) {
                                    for (const pUrl of rData.pluginLists) {
                                        const pRes2 = await fetch(pUrl);
                                        const plugs = await pRes2.json();
                                        if (Array.isArray(plugs)) allPlugins = allPlugins.concat(plugs);
                                    }
                                }
                            }
                        } catch (_) { }
                    }
                }
            }
            console.log(`✅ Fetched ${repo.name}: found plugins`);
        } catch (err) {
            console.error(`❌ Error fetching ${repo.name}: ${err.message}`);
        }
    }

    // Cache the raw plugins
    pluginCache = allPlugins;
    pluginCacheTime = Date.now();

    return rewriteUrls(allPlugins, key);
}

// Rewrite .cs3 download URLs — proxy mode or direct mode
function rewriteUrls(plugins, key) {
    const proxyDownloads = db.getSetting('proxy_downloads') === 'true';
    if (!proxyDownloads) {
        // Direct mode: keep original download URLs (GitHub direct)
        // Gate is at repo.json/plugins.json level only
        return plugins;
    }
    // Proxy mode: route downloads through server
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
// ADMIN AUTH
// ============================================================

app.post('/api/admin/login', rateLimit(60000, 5), (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username dan password diperlukan' });
        const admin = db.verifyAdmin(username, password);
        if (!admin) return res.status(401).json({ error: 'Username atau password salah' });
        const token = generateToken();
        adminTokens.set(token, admin);
        setTimeout(() => adminTokens.delete(token), 24 * 60 * 60 * 1000);
        res.json({ token, admin: { username: admin.username } });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/logout', authMiddleware, (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    adminTokens.delete(token);
    res.json({ message: 'Logged out' });
});

app.post('/api/admin/change-password', authMiddleware, (req, res) => {
    try {
        const { new_password } = req.body;
        if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Min 6 karakter' });
        db.changeAdminPassword(req.admin.username, new_password);
        res.json({ message: 'Password berhasil diganti' });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ============================================================
// ADMIN — STATS
// ============================================================
app.get('/api/admin/stats', authMiddleware, (req, res) => {
    res.json(db.getStats());
});

// ============================================================
// ADMIN — REPOS
// ============================================================
app.get('/api/admin/repos', authMiddleware, (req, res) => {
    res.json(db.getAllRepos());
});

app.post('/api/admin/repos', authMiddleware, (req, res) => {
    try {
        const { name, url } = req.body;
        if (!name || !url) return res.status(400).json({ error: 'Name dan URL diperlukan' });
        const repo = db.addRepo(name, url);
        // Clear plugin cache
        pluginCache = null;
        res.json({ message: 'Repo berhasil ditambahkan', repo });
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/repos/:id/toggle', authMiddleware, (req, res) => {
    const { active } = req.body;
    db.toggleRepo(req.params.id, active);
    pluginCache = null;
    res.json({ message: active ? 'Repo diaktifkan' : 'Repo dinonaktifkan' });
});

app.delete('/api/admin/repos/:id', authMiddleware, (req, res) => {
    db.deleteRepo(req.params.id);
    pluginCache = null;
    res.json({ message: 'Repo dihapus' });
});

// Force refresh plugin cache
app.post('/api/admin/repos/refresh', authMiddleware, async (req, res) => {
    pluginCache = null;
    try {
        const plugins = await fetchAllPlugins('admin-test');
        res.json({ message: `Berhasil refresh! ${plugins.length} extension ditemukan`, count: plugins.length });
    } catch (e) {
        res.status(500).json({ error: 'Gagal fetch: ' + e.message });
    }
});

// ============================================================
// ADMIN — KEYS
// ============================================================
app.get('/api/admin/keys', authMiddleware, (req, res) => {
    const licenses = db.getAllLicenses();
    const serverUrl = db.getSetting('server_url') || `http://localhost:${PORT}`;
    // Add repo URL to each key
    const enriched = licenses.map(l => ({
        ...l,
        repo_url: `${serverUrl}/r/${l.license_key}/repo.json`
    }));
    res.json(enriched);
});

app.get('/api/admin/keys/:id/details', authMiddleware, (req, res) => {
    const details = db.getKeyDetails(parseInt(req.params.id));
    if (!details) return res.status(404).json({ error: 'Key tidak ditemukan' });
    const serverUrl = db.getSetting('server_url') || `http://localhost:${PORT}`;
    details.repo_url = `${serverUrl}/r/${details.license_key}/repo.json`;
    res.json(details);
});

app.post('/api/admin/keys/generate', authMiddleware, (req, res) => {
    try {
        const { duration_days = 30, note = '', count = 1, max_devices = 2 } = req.body;
        if (duration_days < 1 || duration_days > 3650) return res.status(400).json({ error: 'Durasi 1-3650 hari' });
        if (count < 1 || count > 50) return res.status(400).json({ error: 'Maks 50 key' });
        if (max_devices < 1 || max_devices > 100) return res.status(400).json({ error: 'Max devices 1-100' });

        const serverUrl = db.getSetting('server_url') || `http://localhost:${PORT}`;

        if (count > 1) {
            const licenses = db.createBulkLicenses({ count, durationDays: duration_days, note, maxDevices: max_devices });
            const enriched = licenses.map(l => ({ ...l, repo_url: `${serverUrl}/r/${l.license_key}/repo.json` }));
            res.json({ message: `${licenses.length} key berhasil dibuat`, licenses: enriched });
        } else {
            const license = db.createLicense({ durationDays: duration_days, note, maxDevices: max_devices });
            license.repo_url = `${serverUrl}/r/${license.license_key}/repo.json`;
            res.json({ message: 'Key berhasil dibuat', license });
        }
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/keys/:id/revoke', authMiddleware, (req, res) => {
    db.revokeLicense(req.params.id);
    res.json({ message: 'Key di-revoke' });
});
app.put('/api/admin/keys/:id/activate', authMiddleware, (req, res) => {
    db.activateLicense(req.params.id);
    res.json({ message: 'Key diaktifkan' });
});
app.put('/api/admin/keys/:id/renew', authMiddleware, (req, res) => {
    const { days } = req.body;
    if (!days || days < 1) return res.status(400).json({ error: 'Durasi tidak valid' });
    db.renewLicense(req.params.id, days);
    res.json({ message: `Key diperpanjang ${days} hari` });
});
app.put('/api/admin/keys/:id/expiry', authMiddleware, (req, res) => {
    const { expiry_date } = req.body;
    if (!expiry_date) return res.status(400).json({ error: 'Tanggal tidak valid' });
    db.updateLicenseExpiry(req.params.id, expiry_date);
    res.json({ message: 'Tanggal expired diperbarui' });
});
app.put('/api/admin/keys/:id/max-devices', authMiddleware, (req, res) => {
    const { max_devices } = req.body;
    if (!max_devices || max_devices < 1) return res.status(400).json({ error: 'Max devices minimal 1' });
    db.updateLicenseMaxDevices(req.params.id, max_devices);
    res.json({ message: `Max devices diubah menjadi ${max_devices}` });
});
app.put('/api/admin/keys/:id/note', authMiddleware, (req, res) => {
    const { note } = req.body;
    db.updateLicenseNote(req.params.id, note || '');
    res.json({ message: 'Catatan diperbarui' });
});
app.delete('/api/admin/keys/:id', authMiddleware, (req, res) => {
    db.deleteLicense(req.params.id);
    res.json({ message: 'Key dihapus' });
});

// ============================================================
// ADMIN — DEVICES
// ============================================================
app.get('/api/admin/online', authMiddleware, (req, res) => {
    res.json(db.getOnlineDevices());
});

app.post('/api/admin/devices/:id/block', authMiddleware, (req, res) => {
    db.blockDevice(req.params.id);
    res.json({ message: 'Device diblokir' });
});

app.post('/api/admin/devices/:id/unblock', authMiddleware, (req, res) => {
    db.unblockDevice(req.params.id);
    res.json({ message: 'Device di-unblock' });
});

app.delete('/api/admin/devices/:id', authMiddleware, (req, res) => {
    db.deleteDevice(req.params.id);
    res.json({ message: 'Device dihapus' });
});

// ============================================================
// ADMIN — IP BLOCKING
// ============================================================
app.get('/api/admin/blocked-ips', authMiddleware, (req, res) => {
    res.json(db.getBlockedIPs());
});

app.post('/api/admin/blocked-ips', authMiddleware, (req, res) => {
    const { ip, reason } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP diperlukan' });
    db.blockIP(ip, reason || '');
    res.json({ message: `IP ${ip} diblokir` });
});

app.delete('/api/admin/blocked-ips/:ip', authMiddleware, (req, res) => {
    db.unblockIP(req.params.ip);
    res.json({ message: `IP ${req.params.ip} di-unblock` });
});

// ============================================================
// ADMIN — SETTINGS
// ============================================================
app.get('/api/admin/settings', authMiddleware, (req, res) => {
    const settings = {};
    db.getAllSettings().forEach(s => settings[s.key] = s.value);
    res.json(settings);
});

app.post('/api/admin/settings', authMiddleware, (req, res) => {
    const { server_url, proxy_downloads } = req.body;
    if (server_url) db.setSetting('server_url', server_url.replace(/\/$/, ''));
    if (proxy_downloads !== undefined) db.setSetting('proxy_downloads', proxy_downloads ? 'true' : 'false');
    res.json({ message: 'Settings disimpan' });
});

// ============================================================
// ADMIN — LOGS
// ============================================================
app.get('/api/admin/logs', authMiddleware, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    res.json(db.getRecentLogs(limit));
});

// ============================================================
// SERVE DASHBOARD
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// START
// ============================================================
async function start() {
    await db.initDatabase();

    // Auto-set server_url if still localhost
    const curUrl = db.getSetting('server_url');
    const lanIP = getLocalIP();
    if (!curUrl || curUrl.includes('localhost') || curUrl.includes('127.0.0.1')) {
        db.setSetting('server_url', `http://${lanIP}:${PORT}`);
    }

    // Listen on 0.0.0.0 so accessible from LAN/phone
    app.listen(PORT, '0.0.0.0', () => {
        const serverUrl = db.getSetting('server_url');
        console.log(`
╔════════════════════════════════════════════════════════╗
║   CS Premium — Repo Proxy Gateway                      ║
╠════════════════════════════════════════════════════════╣
║   Dashboard : http://localhost:${PORT}                   ║
║   LAN/Phone : http://${lanIP}:${PORT}                    ║
║   Server URL: ${serverUrl}                               ║
║                                                        ║
║   Login: admin / admin123                              ║
║   ⚠️  Ganti password default setelah login!             ║
╚════════════════════════════════════════════════════════╝
        `);
    });
}
start().catch(e => { console.error('Failed to start:', e); process.exit(1); });
