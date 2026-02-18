// ============================================================
// CloudStream Premium — API Server
// Production-grade Express + JWT + Helmet
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const os = require('os');
const db = require('./database');

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRY = '24h';

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// RATE LIMITING
// ============================================================

const rateBuckets = new Map();

function rateLimit(windowMs = 60000, max = 60) {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `${ip}:${req.route?.path || req.path}`;
        const now = Date.now();
        let bucket = rateBuckets.get(key);

        if (!bucket || now > bucket.resetAt) {
            bucket = { count: 0, resetAt: now + windowMs };
            rateBuckets.set(key, bucket);
        }

        bucket.count++;
        if (bucket.count > max) {
            return res.status(429).json({ status: 'error', message: 'Too many requests' });
        }
        next();
    };
}

// Cleanup rate buckets every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateBuckets) {
        if (now > v.resetAt) rateBuckets.delete(k);
    }
}, 300000);

// ============================================================
// JWT AUTH MIDDLEWARE
// ============================================================

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }
}

// ============================================================
// HELPERS
// ============================================================

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress || '';
}

function cleanInput(val) {
    if (typeof val !== 'string') return '';
    return val.trim().substring(0, 500);
}

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// ============================================================
// IP SESSION CACHE (for check-ip fast path)
// ============================================================

const ipSessions = new Map();

function createIPSession(ip, key, durationMs = 24 * 60 * 60 * 1000) {
    ipSessions.set(ip, { key, expiresAt: Date.now() + durationMs });
}

function getIPSession(ip) {
    const session = ipSessions.get(ip);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
        ipSessions.delete(ip);
        return null;
    }
    return session;
}

// Cleanup expired sessions every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, s] of ipSessions) {
        if (now > s.expiresAt) ipSessions.delete(ip);
    }
}, 600000);

// ============================================================
// PUBLIC API — License Validation
// ============================================================

app.post('/api/validate', rateLimit(60000, 30), (req, res) => {
    try {
        const key = cleanInput(req.body.key);
        const deviceId = cleanInput(req.body.device_id);
        const deviceName = cleanInput(req.body.device_name);
        const ip = getClientIP(req);

        if (!key) {
            return res.json({ status: 'error', message: 'License key required' });
        }

        const result = db.validateLicense(key, ip, deviceId, deviceName);

        if (!result.valid) {
            const messages = {
                not_found: 'License key not found',
                revoked: 'License has been revoked',
                expired: 'License has expired',
                max_devices: 'Maximum device limit reached',
                device_blocked: 'This device has been blocked',
                ip_blocked: 'Your IP has been blocked'
            };
            db.logAccess(key, 'VALIDATE_FAIL', ip, result.reason);
            return res.json({ status: 'error', message: messages[result.reason] || 'Access denied', reason: result.reason });
        }

        // Create IP session for fast check-ip path
        createIPSession(ip, key);
        db.logAccess(key, 'VALIDATE_OK', ip, `device: ${deviceId}`);

        res.json({
            status: 'active',
            message: 'License valid',
            expires_at: result.license.expires_at,
            days_left: result.daysLeft,
            max_devices: result.license.max_devices
        });
    } catch (e) {
        console.error('Validate error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// PUBLIC API — Heartbeat
// ============================================================

app.post('/api/heartbeat', rateLimit(60000, 60), (req, res) => {
    try {
        const key = cleanInput(req.body.key);
        const deviceId = cleanInput(req.body.device_id);
        const ip = getClientIP(req);

        if (!key) return res.json({ status: 'error', message: 'Key required' });

        const lic = db.getLicenseByKey(key);
        if (!lic) return res.json({ status: 'error', reason: 'not_found' });
        if (lic.status !== 'active') return res.json({ status: 'error', reason: lic.status });

        const now = new Date();
        const expiry = new Date(lic.expires_at);
        if (now > expiry) {
            db.updateLicenseStatus(lic.id, 'expired');
            return res.json({ status: 'error', reason: 'expired' });
        }

        // Refresh IP session
        createIPSession(ip, key);

        res.json({ status: 'active', days_left: Math.ceil((expiry - now) / 86400000) });
    } catch (e) {
        console.error('Heartbeat error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// PUBLIC API — Quick IP Check
// ============================================================

app.get('/api/check-ip', rateLimit(60000, 120), (req, res) => {
    try {
        const ip = getClientIP(req);
        const deviceId = cleanInput(req.query.device_id || '');
        const pluginName = cleanInput(req.query.plugin || '');
        const action = cleanInput(req.query.action || '');
        const data = cleanInput(req.query.data || '');

        // Check IP blocked
        if (db.isIPBlocked(ip)) {
            return res.json({ status: 'error', message: 'IP blocked' });
        }

        // Check IP session
        const session = getIPSession(ip);
        if (!session) {
            return res.json({ status: 'error', message: 'No active session. Please validate license.' });
        }

        // Validate license is still good
        const lic = db.getLicenseByKey(session.key);
        if (!lic || lic.status !== 'active') {
            ipSessions.delete(ip);
            return res.json({ status: 'error', message: 'License inactive' });
        }

        const expiry = new Date(lic.expires_at);
        if (new Date() > expiry) {
            db.updateLicenseStatus(lic.id, 'expired');
            ipSessions.delete(ip);
            return res.json({ status: 'error', message: 'License expired' });
        }

        // Track plugin activity
        if (pluginName && action && action !== 'check') {
            const actionUpper = action.toUpperCase();
            if (['HOME', 'OPEN', 'SEARCH', 'LOAD', 'PLAY', 'SWITCH', 'DOWNLOAD'].includes(actionUpper)) {
                db.trackPluginUsage(session.key, deviceId, pluginName, actionUpper, ip);
            }
            if ((actionUpper === 'PLAY' || actionUpper === 'DOWNLOAD') && data) {
                db.trackPlayback(session.key, deviceId, pluginName, data, actionUpper === 'DOWNLOAD' ? 'DOWNLOAD' : '', ip);
            }
        }

        res.json({ status: 'active', message: 'Valid', expiry: lic.expires_at });
    } catch (e) {
        console.error('Check-IP error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// PUBLIC API — Plugin Tracking
// ============================================================

app.post('/api/track/plugin', rateLimit(60000, 60), (req, res) => {
    try {
        const key = cleanInput(req.body.key);
        const deviceId = cleanInput(req.body.device_id);
        const pluginName = cleanInput(req.body.plugin_name);
        const action = cleanInput(req.body.action || 'OPEN');
        const ip = getClientIP(req);

        if (!key || !pluginName) {
            return res.json({ status: 'error', message: 'Missing fields' });
        }

        db.trackPluginUsage(key, deviceId, pluginName, action.toUpperCase(), ip);
        res.json({ status: 'ok' });
    } catch (e) {
        console.error('Track plugin error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// PUBLIC API — Playback Tracking
// ============================================================

app.post('/api/track/playback', rateLimit(60000, 60), (req, res) => {
    try {
        const key = cleanInput(req.body.key);
        const deviceId = cleanInput(req.body.device_id);
        const pluginName = cleanInput(req.body.plugin_name);
        const videoTitle = cleanInput(req.body.video_title);
        const sourceProvider = cleanInput(req.body.source_provider);
        const ip = getClientIP(req);

        if (!key || !pluginName || !videoTitle) {
            return res.json({ status: 'error', message: 'Missing fields' });
        }

        db.trackPlayback(key, deviceId, pluginName, videoTitle, sourceProvider, ip);
        res.json({ status: 'ok' });
    } catch (e) {
        console.error('Track playback error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// PUBLIC API — Config
// ============================================================

app.get('/api/config', (req, res) => {
    res.json({
        server_url: db.getSetting('server_url') || `http://${getLocalIP()}:${PORT}`,
        version: '2.0.0'
    });
});

// ============================================================
// PUBLIC API — Health Check
// ============================================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ============================================================
// REPO GATING
// ============================================================

app.get('/r/:key/repo.json', rateLimit(60000, 60), (req, res) => {
    try {
        const key = req.params.key;
        const lic = db.getLicenseByKey(key);

        if (!lic || lic.status !== 'active') {
            return res.status(403).json({ status: 'error', message: 'Invalid or expired license' });
        }

        const expiry = new Date(lic.expires_at);
        if (new Date() > expiry) {
            db.updateLicenseStatus(lic.id, 'expired');
            return res.status(403).json({ status: 'error', message: 'License expired' });
        }

        const serverUrl = db.getSetting('server_url') || `http://${getLocalIP()}:${PORT}`;
        const ip = getClientIP(req);
        createIPSession(ip, key);
        db.logAccess(key, 'REPO_ACCESS', ip, 'repo.json');

        res.json({
            name: "Premium Extensions",
            description: "CloudStream Premium Extensions",
            manifestVersion: 1,
            pluginLists: [`${serverUrl}/r/${key}/plugins.json`]
        });
    } catch (e) {
        console.error('Repo error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.get('/r/:key/plugins.json', rateLimit(60000, 60), async (req, res) => {
    try {
        const key = req.params.key;
        const lic = db.getLicenseByKey(key);

        if (!lic || lic.status !== 'active') {
            return res.status(403).json({ status: 'error', message: 'Invalid license' });
        }

        const expiry = new Date(lic.expires_at);
        if (new Date() > expiry) {
            db.updateLicenseStatus(lic.id, 'expired');
            return res.status(403).json({ status: 'error', message: 'License expired' });
        }

        // Fetch from upstream builds branch
        const upstream = db.getSetting('upstream_plugins_url') || 'https://raw.githubusercontent.com/Makairamei/CS/builds/plugins.json';

        const response = await fetch(upstream);
        if (!response.ok) {
            return res.status(502).json({ status: 'error', message: 'Failed to fetch plugins' });
        }

        const plugins = await response.json();
        res.json(plugins);
    } catch (e) {
        console.error('Plugins.json error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// ADMIN AUTH
// ============================================================

app.post('/api/auth/login', rateLimit(300000, 20), (req, res) => {
    try {
        const { username, password } = req.body;
        const ip = getClientIP(req);

        if (!username || !password) {
            return res.status(400).json({ status: 'error', message: 'Missing credentials' });
        }

        // Check if IP blocked
        if (db.isIPBlocked(ip)) {
            return res.status(403).json({ status: 'error', message: 'IP blocked' });
        }

        const admin = db.getAdminByUsername(username);
        if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
            db.recordFailedLogin(ip);
            db.logAccess('', 'LOGIN_FAIL', ip, `username: ${username}`);
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        // Clear failed logins on success
        db.clearFailedLogins(ip);

        const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        db.logAccess('', 'LOGIN_OK', ip, `admin: ${username}`);

        res.json({ status: 'ok', token, username: admin.username });
    } catch (e) {
        console.error('Login error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// ADMIN — Dashboard
// ============================================================

app.get('/api/admin/dashboard', authMiddleware, (req, res) => {
    try {
        const stats = db.getDashboardStats();
        res.json({ status: 'ok', ...stats });
    } catch (e) {
        console.error('Dashboard error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// ADMIN — License Management
// ============================================================

app.post('/api/admin/licenses', authMiddleware, (req, res) => {
    try {
        const { duration_days, name, note, max_devices, count } = req.body;
        const ip = getClientIP(req);

        if (count && count > 1) {
            const keys = db.createBulkLicenses({
                count: Math.min(count, 100),
                durationDays: duration_days || 30,
                maxDevices: max_devices || 2,
                note: note || ''
            });
            db.logAccess('', 'BULK_CREATE', ip, `${keys.length} licenses created by ${req.admin.username}`);
            return res.json({ status: 'ok', keys });
        }

        const result = db.createLicense({
            durationDays: duration_days || 30,
            name: name || '',
            note: note || '',
            maxDevices: max_devices || 2
        });

        db.logAccess(result.key, 'LICENSE_CREATE', ip, `by ${req.admin.username}`);
        res.json({ status: 'ok', ...result });
    } catch (e) {
        console.error('Create license error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.get('/api/admin/licenses', authMiddleware, (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const search = cleanInput(req.query.search || '');
        const status = cleanInput(req.query.status || '');
        const trashed = req.query.trashed === 'true';

        const result = db.getLicensesPaginated(page, limit, search, status, trashed);
        res.json({ status: 'ok', ...result });
    } catch (e) {
        console.error('List licenses error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.get('/api/admin/licenses/:id/details', authMiddleware, (req, res) => {
    try {
        const details = db.getLicenseDetails(parseInt(req.params.id));
        if (!details) return res.status(404).json({ status: 'error', message: 'Not found' });
        res.json({ status: 'ok', ...details });
    } catch (e) {
        console.error('License details error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.put('/api/admin/licenses/:id', authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, note, max_devices, expires_at, status: newStatus, action } = req.body;
        const ip = getClientIP(req);

        if (action === 'revoke') {
            db.updateLicenseStatus(id, 'revoked');
            db.logAccess('', 'LICENSE_REVOKE', ip, `id:${id} by ${req.admin.username}`);
        } else if (action === 'activate') {
            db.updateLicenseStatus(id, 'active');
            db.logAccess('', 'LICENSE_ACTIVATE', ip, `id:${id} by ${req.admin.username}`);
        } else if (action === 'restore') {
            db.restoreLicense(id);
            db.logAccess('', 'LICENSE_RESTORE', ip, `id:${id} by ${req.admin.username}`);
        } else {
            db.updateLicense(id, {
                name, note,
                maxDevices: max_devices,
                expiresAt: expires_at,
                status: newStatus
            });
            db.logAccess('', 'LICENSE_UPDATE', ip, `id:${id} by ${req.admin.username}`);
        }

        res.json({ status: 'ok' });
    } catch (e) {
        console.error('Update license error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.delete('/api/admin/licenses/:id', authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const force = req.query.force === 'true';
        const ip = getClientIP(req);

        if (force) {
            db.forceDeleteLicense(id);
            db.logAccess('', 'LICENSE_FORCE_DELETE', ip, `id:${id} by ${req.admin.username}`);
        } else {
            db.softDeleteLicense(id);
            db.logAccess('', 'LICENSE_SOFT_DELETE', ip, `id:${id} by ${req.admin.username}`);
        }

        res.json({ status: 'ok' });
    } catch (e) {
        console.error('Delete license error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// ADMIN — Bulk License Operations
// ============================================================

app.post('/api/admin/licenses/bulk', authMiddleware, (req, res) => {
    try {
        const { ids, action } = req.body;
        const ip = getClientIP(req);
        if (!Array.isArray(ids) || !ids.length || !action) {
            return res.status(400).json({ status: 'error', message: 'ids array and action required' });
        }
        const validActions = ['revoke', 'activate', 'delete', 'force_delete'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ status: 'error', message: 'Invalid action' });
        }
        let processed = 0;
        for (const id of ids.slice(0, 100)) {
            const numId = parseInt(id);
            if (isNaN(numId)) continue;
            if (action === 'revoke') db.updateLicenseStatus(numId, 'revoked');
            else if (action === 'activate') db.updateLicenseStatus(numId, 'active');
            else if (action === 'delete') db.softDeleteLicense(numId);
            else if (action === 'force_delete') db.forceDeleteLicense(numId);
            processed++;
        }
        db.logAccess('', `BULK_${action.toUpperCase()}`, ip, `${processed} licenses by ${req.admin.username}`);
        res.json({ status: 'ok', processed });
    } catch (e) {
        console.error('Bulk action error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// ADMIN — Device Management
// ============================================================

app.get('/api/admin/devices', authMiddleware, (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const search = cleanInput(req.query.search || '');

        const result = db.getDevicesPaginated(page, limit, search);
        res.json({ status: 'ok', ...result });
    } catch (e) {
        console.error('List devices error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.put('/api/admin/devices/:id', authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { action, name } = req.body;
        const ip = getClientIP(req);

        if (action === 'block') {
            db.blockDevice(id);
            db.logAccess('', 'DEVICE_BLOCK', ip, `device_id:${id} by ${req.admin.username}`);
        } else if (action === 'unblock') {
            db.unblockDevice(id);
            db.logAccess('', 'DEVICE_UNBLOCK', ip, `device_id:${id} by ${req.admin.username}`);
        } else if (action === 'rename') {
            db.renameDevice(id, name || '');
        } else if (action === 'delete') {
            db.deleteDevice(id);
            db.logAccess('', 'DEVICE_DELETE', ip, `device_id:${id} by ${req.admin.username}`);
        }

        res.json({ status: 'ok' });
    } catch (e) {
        console.error('Device action error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// ADMIN — Analytics
// ============================================================

app.get('/api/admin/plugin-usage', authMiddleware, (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const search = cleanInput(req.query.search || '');

        const result = db.getPluginUsagePaginated(page, limit, search);
        res.json({ status: 'ok', ...result });
    } catch (e) {
        console.error('Plugin usage error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.get('/api/admin/playback-logs', authMiddleware, (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const search = cleanInput(req.query.search || '');

        const result = db.getPlaybackLogsPaginated(page, limit, search);
        res.json({ status: 'ok', ...result });
    } catch (e) {
        console.error('Playback logs error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.get('/api/admin/logs', authMiddleware, (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const search = cleanInput(req.query.search || '');
        const action = cleanInput(req.query.action || '');

        const result = db.getAccessLogsPaginated(page, limit, search, action);
        res.json({ status: 'ok', ...result });
    } catch (e) {
        console.error('Access logs error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// ADMIN — Enhanced Analytics
// ============================================================

// Real-time activity feed (last N minutes)
app.get('/api/admin/activity-feed', authMiddleware, (req, res) => {
    try {
        const minutes = Math.min(parseInt(req.query.minutes) || 30, 1440);
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);

        const pluginActivity = db.all(
            `SELECT pu.license_key, pu.device_id, pu.plugin_name, pu.action, pu.ip_address, pu.used_at,
                    l.name as license_name
             FROM plugin_usage pu
             LEFT JOIN licenses l ON pu.license_key = l.license_key
             WHERE pu.used_at > datetime('now', '-${minutes} minutes')
             ORDER BY pu.used_at DESC LIMIT ?`, [limit]
        );

        const playbackActivity = db.all(
            `SELECT pl.license_key, pl.device_id, pl.plugin_name, pl.video_title, pl.source_provider, 
                    pl.ip_address, pl.played_at,
                    l.name as license_name
             FROM playback_logs pl
             LEFT JOIN licenses l ON pl.license_key = l.license_key
             WHERE pl.played_at > datetime('now', '-${minutes} minutes')
             ORDER BY pl.played_at DESC LIMIT ?`, [limit]
        );

        // Merge and sort by time
        const feed = [
            ...pluginActivity.map(a => ({ ...a, type: 'plugin', timestamp: a.used_at })),
            ...playbackActivity.map(a => ({ ...a, type: 'playback', timestamp: a.played_at }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

        res.json({ status: 'ok', feed, count: feed.length });
    } catch (e) {
        console.error('Activity feed error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// Plugin breakdown statistics
app.get('/api/admin/analytics/plugins', authMiddleware, (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 7, 90);

        // Usage by plugin
        const byPlugin = db.all(
            `SELECT plugin_name, action, COUNT(*) as count 
             FROM plugin_usage 
             WHERE used_at > datetime('now', '-${days} days')
             GROUP BY plugin_name, action
             ORDER BY count DESC`
        );

        // Unique users per plugin
        const uniqueUsers = db.all(
            `SELECT plugin_name, COUNT(DISTINCT license_key) as unique_users
             FROM plugin_usage
             WHERE used_at > datetime('now', '-${days} days')
             GROUP BY plugin_name
             ORDER BY unique_users DESC`
        );

        // Hourly activity pattern (last 24h)
        const hourlyPattern = db.all(
            `SELECT strftime('%H', used_at) as hour, COUNT(*) as count
             FROM plugin_usage
             WHERE used_at > datetime('now', '-1 day')
             GROUP BY hour
             ORDER BY hour`
        );

        // Most watched content
        const topContent = db.all(
            `SELECT video_title, plugin_name, COUNT(*) as play_count
             FROM playback_logs
             WHERE played_at > datetime('now', '-${days} days')
             GROUP BY video_title, plugin_name
             ORDER BY play_count DESC
             LIMIT 20`
        );

        // Download statistics
        const downloads = db.all(
            `SELECT plugin_name, COUNT(*) as download_count
             FROM playback_logs
             WHERE source_provider = 'DOWNLOAD' AND played_at > datetime('now', '-${days} days')
             GROUP BY plugin_name
             ORDER BY download_count DESC`
        );

        // Daily trends (last N days)
        const dailyTrends = db.all(
            `SELECT date(used_at) as day, plugin_name, action, COUNT(*) as count
             FROM plugin_usage
             WHERE used_at > datetime('now', '-${days} days')
             GROUP BY day, plugin_name, action
             ORDER BY day DESC`
        );

        res.json({
            status: 'ok',
            byPlugin, uniqueUsers, hourlyPattern,
            topContent, downloads, dailyTrends,
            period: `${days} days`
        });
    } catch (e) {
        console.error('Analytics plugins error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// Per-user activity
app.get('/api/admin/analytics/user/:key', authMiddleware, (req, res) => {
    try {
        const key = req.params.key;
        const days = Math.min(parseInt(req.query.days) || 7, 90);

        const license = db.getLicenseByKey(key);
        if (!license) return res.status(404).json({ status: 'error', message: 'License not found' });

        const pluginUsage = db.all(
            `SELECT plugin_name, action, COUNT(*) as count, MAX(used_at) as last_used
             FROM plugin_usage
             WHERE license_key = ? AND used_at > datetime('now', '-${days} days')
             GROUP BY plugin_name, action
             ORDER BY count DESC`, [key]
        );

        const playbackHistory = db.all(
            `SELECT plugin_name, video_title, source_provider, played_at
             FROM playback_logs
             WHERE license_key = ? AND played_at > datetime('now', '-${days} days')
             ORDER BY played_at DESC
             LIMIT 100`, [key]
        );

        const devices = db.all(
            `SELECT * FROM devices WHERE license_key = ?`, [key]
        );

        const recentLogs = db.all(
            `SELECT * FROM access_logs
             WHERE license_key = ?
             ORDER BY created_at DESC LIMIT 50`, [key]
        );

        res.json({
            status: 'ok',
            license,
            pluginUsage,
            playbackHistory,
            devices,
            recentLogs,
            period: `${days} days`
        });
    } catch (e) {
        console.error('User analytics error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// Active sessions overview
app.get('/api/admin/active-sessions', authMiddleware, (req, res) => {
    try {
        const sessions = [];
        for (const [ip, session] of ipSessions) {
            const lic = db.getLicenseByKey(session.key);
            sessions.push({
                ip,
                license_key: session.key,
                license_name: lic?.name || '',
                status: lic?.status || 'unknown',
                expires_at: new Date(session.expiresAt).toISOString(),
                ttl_minutes: Math.round((session.expiresAt - Date.now()) / 60000)
            });
        }
        res.json({ status: 'ok', sessions, count: sessions.length });
    } catch (e) {
        console.error('Active sessions error:', e.message);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// ADMIN — Security
// ============================================================

app.get('/api/admin/security/failed-logins', authMiddleware, (req, res) => {
    try {
        const logs = db.getFailedLogins();
        res.json({ status: 'ok', logs });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.get('/api/admin/security/blocked-ips', authMiddleware, (req, res) => {
    try {
        const ips = db.getBlockedIPs();
        res.json({ status: 'ok', ips });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.post('/api/admin/security/block-ip', authMiddleware, (req, res) => {
    try {
        const { ip, reason } = req.body;
        if (!ip) return res.status(400).json({ status: 'error', message: 'IP required' });
        db.blockIP(ip, reason || '');
        db.logAccess('', 'IP_BLOCK', getClientIP(req), `blocked ${ip} by ${req.admin.username}`);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.post('/api/admin/security/unblock-ip', authMiddleware, (req, res) => {
    try {
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ status: 'error', message: 'IP required' });
        db.unblockIP(ip);
        db.logAccess('', 'IP_UNBLOCK', getClientIP(req), `unblocked ${ip} by ${req.admin.username}`);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// ADMIN — Settings
// ============================================================

app.get('/api/admin/settings', authMiddleware, (req, res) => {
    try {
        const settings = db.getAllSettings();
        const obj = {};
        settings.forEach(s => { obj[s.key] = s.value; });
        res.json({ status: 'ok', settings: obj });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.put('/api/admin/settings', authMiddleware, (req, res) => {
    try {
        const { settings } = req.body;
        if (settings && typeof settings === 'object') {
            for (const [k, v] of Object.entries(settings)) {
                db.setSetting(k, v);
            }
        }
        db.logAccess('', 'SETTINGS_UPDATE', getClientIP(req), `by ${req.admin.username}`);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// ADMIN — Password Change
// ============================================================

app.put('/api/admin/password', authMiddleware, (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ status: 'error', message: 'Both passwords required' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
        }

        const admin = db.getAdminByUsername(req.admin.username);
        if (!bcrypt.compareSync(current_password, admin.password_hash)) {
            return res.status(401).json({ status: 'error', message: 'Current password incorrect' });
        }

        const hash = bcrypt.hashSync(new_password, 12);
        db.updateAdminPassword(admin.id, hash);
        db.logAccess('', 'PASSWORD_CHANGE', getClientIP(req), `admin: ${req.admin.username}`);

        res.json({ status: 'ok', message: 'Password updated' });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// ============================================================
// FALLBACK — SPA
// ============================================================

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
});

// ============================================================
// START SERVER
// ============================================================

db.initDatabase().then(() => {
    const lanIP = getLocalIP();
    app.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('  ╔══════════════════════════════════════════╗');
        console.log('  ║   CloudStream Premium License Server     ║');
        console.log('  ╠══════════════════════════════════════════╣');
        console.log(`  ║  Local:    http://localhost:${PORT}          ║`);
        console.log(`  ║  Network:  http://${lanIP}:${PORT}    ║`);
        console.log('  ╚══════════════════════════════════════════╝');
        console.log('');
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
