const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'premium.db');
let db;

async function initDatabase() {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
        db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
        db = new SQL.Database();
    }

    db.run(`CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT UNIQUE NOT NULL,
        max_devices INTEGER NOT NULL DEFAULT 2,
        duration_days INTEGER NOT NULL DEFAULT 30,
        expired_at DATETIME NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        note TEXT DEFAULT '',
        deleted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Migration: Add deleted_at if missing
    try {
        db.run("ALTER TABLE licenses ADD COLUMN deleted_at DATETIME DEFAULT NULL");
    } catch (e) { /* ignore if exists */ }

    // Migration: Auto-name unnamed devices
    try {
        const keys = queryAll("SELECT DISTINCT license_key FROM devices WHERE (device_name IS NULL OR device_name = '') AND (device_model IS NULL OR device_model = '' OR device_model LIKE '%Unknown%')");
        keys.forEach(row => {
            const devices = queryAll("SELECT id FROM devices WHERE license_key = ? ORDER BY first_seen ASC", [row.license_key]);
            devices.forEach((dev, idx) => {
                const name = `Device ${idx + 1}`;
                db.run("UPDATE devices SET device_name = ?, device_model = ? WHERE id = ? AND (device_name IS NULL OR device_name = '')", [name, name, dev.id]);
            });
        });
        if (keys.length > 0) saveDb();
    } catch (e) { /* ignore */ }

    db.run(`CREATE TABLE IF NOT EXISTS repos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT NOT NULL,
        action TEXT NOT NULL,
        ip_address TEXT,
        details TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )`);

    // Enhanced devices table
    db.run(`CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT NOT NULL,
        device_id TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT DEFAULT '',
        device_name TEXT DEFAULT '',
        device_model TEXT DEFAULT '',
        os_info TEXT DEFAULT '',
        is_blocked INTEGER NOT NULL DEFAULT 0,
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(license_key, device_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS blocked_ips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT UNIQUE NOT NULL,
        reason TEXT DEFAULT '',
        blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // NEW: Plugin activity tracking
    db.run(`CREATE TABLE IF NOT EXISTS plugin_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT NOT NULL,
        plugin_name TEXT NOT NULL,
        action TEXT NOT NULL,
        ip_address TEXT DEFAULT '',
        device_id TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Migration: add new columns to existing devices table
    try { db.run("ALTER TABLE devices ADD COLUMN device_name TEXT DEFAULT ''"); } catch (_) { }
    try { db.run("ALTER TABLE devices ADD COLUMN device_model TEXT DEFAULT ''"); } catch (_) { }
    try { db.run("ALTER TABLE devices ADD COLUMN os_info TEXT DEFAULT ''"); } catch (_) { }

    // Migration: Add name column to licenses if not exists
    try { db.run("ALTER TABLE licenses ADD COLUMN name TEXT DEFAULT ''"); } catch (_) { }

    // Migration: Add data column to plugin_activity if not exists
    try { db.run("ALTER TABLE plugin_activity ADD COLUMN data TEXT DEFAULT ''"); } catch (_) { }

    // Default admin
    const adminCount = queryOne("SELECT COUNT(*) as c FROM admin");
    if (!adminCount || adminCount.c === 0) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.run("INSERT INTO admin (username, password_hash) VALUES (?, ?)", ['admin', hash]);
        console.log('✅ Default admin: admin / admin123');
    }

    // Default settings
    if (!getSetting('server_url')) setSetting('server_url', 'http://localhost:3000');

    saveDb();
    console.log('✅ Database initialized');
}

function saveDb() {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function queryOne(sql, params = []) {
    const stmt = db.prepare(sql); stmt.bind(params);
    let row = null;
    if (stmt.step()) {
        const cols = stmt.getColumnNames(), vals = stmt.get();
        row = {}; cols.forEach((c, i) => row[c] = vals[i]);
    }
    stmt.free(); return row;
}

function queryAll(sql, params = []) {
    const stmt = db.prepare(sql); stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        const cols = stmt.getColumnNames(), vals = stmt.get();
        const row = {}; cols.forEach((c, i) => row[c] = vals[i]);
        rows.push(row);
    }
    stmt.free(); return rows;
}

// ============== SETTINGS ==============
function getSetting(key) {
    const row = queryOne("SELECT value FROM settings WHERE key = ?", [key]);
    return row ? row.value : null;
}
function setSetting(key, value) {
    const existing = getSetting(key);
    if (existing !== null) {
        db.run("UPDATE settings SET value = ? WHERE key = ?", [value, key]);
    } else {
        db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, value]);
    }
    saveDb();
}
function getAllSettings() {
    return queryAll("SELECT * FROM settings");
}

// ============== REPOS ==============
function addRepo(name, url) {
    db.run("INSERT INTO repos (name, url) VALUES (?, ?)", [name, url]);
    saveDb();
    return queryOne("SELECT * FROM repos ORDER BY id DESC LIMIT 1");
}
function getAllRepos() {
    return queryAll("SELECT * FROM repos ORDER BY created_at DESC");
}
function toggleRepo(id, active) {
    db.run("UPDATE repos SET is_active = ? WHERE id = ?", [active ? 1 : 0, id]);
    saveDb();
}
function deleteRepo(id) {
    db.run("DELETE FROM repos WHERE id = ?", [id]);
    saveDb();
}
function getActiveRepos() {
    return queryAll("SELECT * FROM repos WHERE is_active = 1");
}

// ============== LICENSES ==============
function generateKey(prefix = 'CS') {
    // Get next sequential number
    const countRow = queryOne("SELECT COUNT(*) as c FROM licenses");
    const num = (countRow ? countRow.c : 0) + 1;
    const numStr = String(num).padStart(2, '0');
    const seg = [];
    for (let i = 0; i < 3; i++) seg.push(crypto.randomBytes(2).toString('hex').toUpperCase());
    return `${prefix}-${numStr}-${seg.join('-')}`;
}

function createLicense({ durationDays = 30, note = '', name = '', maxDevices = 2 }) {
    const key = generateKey();
    const exp = new Date();
    exp.setDate(exp.getDate() + durationDays);
    db.run("INSERT INTO licenses (license_key, duration_days, expired_at, note, name, max_devices) VALUES (?, ?, ?, ?, ?, ?)",
        [key, durationDays, exp.toISOString(), note, name, maxDevices]);
    saveDb();
    return { license_key: key, duration_days: durationDays, expired_at: exp.toISOString(), note, name, max_devices: maxDevices };
}

function createBulkLicenses({ count = 1, durationDays = 30, note = '', maxDevices = 2 }) {
    const licenses = [];
    for (let i = 0; i < count; i++) {
        const key = generateKey();
        const exp = new Date();
        exp.setDate(exp.getDate() + durationDays);
        db.run("INSERT INTO licenses (license_key, duration_days, expired_at, note, max_devices) VALUES (?, ?, ?, ?, ?)",
            [key, durationDays, exp.toISOString(), note, maxDevices]);
        licenses.push({ license_key: key, duration_days: durationDays, expired_at: exp.toISOString(), note, max_devices: maxDevices });
    }
    saveDb();
    return licenses;
}

function getAllLicenses() {
    return getLicensesPaginated(1, 100000, '', false).data; // Fallback for legacy calls, explicitly not trashed
}

// Pagination with Soft Delete Support
function getLicensesPaginated(page = 1, limit = 20, search = '', trashed = false) {
    const offset = (page - 1) * limit;
    let whereClause = trashed ? "WHERE deleted_at IS NOT NULL" : "WHERE deleted_at IS NULL";
    let params = [];

    if (search) {
        let term = search.trim();
        // Extract key from Repo URL if pasted
        if (term.includes('/r/')) {
            const match = term.match(/\/r\/([^/]+)/);
            if (match) term = match[1];
        }
        whereClause += " AND (license_key LIKE ? OR name LIKE ? OR note LIKE ?)";
        const like = `%${term}%`;
        params.push(like, like, like);
    }

    const countSql = `SELECT COUNT(*) as total FROM licenses ${whereClause}`;
    const total = queryOne(countSql, params)?.total || 0;

    const sql = `SELECT * FROM licenses ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const licenses = queryAll(sql, [...params, limit, offset]);

    const data = licenses.map(l => {
        const deviceCount = queryOne("SELECT COUNT(*) as c FROM devices WHERE license_key = ? AND is_blocked = 0", [l.license_key]);
        const onlineCount = queryOne("SELECT COUNT(*) as c FROM devices WHERE license_key = ? AND is_blocked = 0 AND last_seen >= datetime('now', '-5 minutes')", [l.license_key]);
        return {
            ...l,
            device_count: deviceCount ? deviceCount.c : 0,
            online_count: onlineCount ? onlineCount.c : 0
        };
    });

    return { data, total, page, limit, total_pages: Math.ceil(total / limit) };
}

function getLicenseByKey(key) {
    // Only return active (non-deleted) keys for validation
    return queryOne("SELECT * FROM licenses WHERE license_key = ? AND deleted_at IS NULL", [key]);
}

function revokeLicense(id) {
    db.run("UPDATE licenses SET is_active = 0 WHERE id = ?", [id]);
    saveDb();
}

function activateLicense(id) {
    db.run("UPDATE licenses SET is_active = 1 WHERE id = ?", [id]);
    saveDb();
}

function deleteLicense(id) {
    // Soft Delete
    db.run("UPDATE licenses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
    saveDb();
}

function restoreLicense(id) {
    db.run("UPDATE licenses SET deleted_at = NULL WHERE id = ?", [id]);
    saveDb();
}

function forceDeleteLicense(id) {
    // Hard Delete
    const lic = queryOne("SELECT license_key FROM licenses WHERE id = ?", [id]);
    if (lic) {
        // Clean up related data
        db.run("DELETE FROM devices WHERE license_key = ?", [lic.license_key]);
        db.run("DELETE FROM access_logs WHERE license_key = ?", [lic.license_key]);
        db.run("DELETE FROM plugin_activity WHERE license_key = ?", [lic.license_key]);
    }
    db.run("DELETE FROM licenses WHERE id = ?", [id]);
    saveDb();
}

function emptyTrash() {
    const deleted = queryAll("SELECT license_key FROM licenses WHERE deleted_at IS NOT NULL");
    deleted.forEach(l => {
        db.run("DELETE FROM devices WHERE license_key = ?", [l.license_key]);
        db.run("DELETE FROM access_logs WHERE license_key = ?", [l.license_key]);
        db.run("DELETE FROM plugin_activity WHERE license_key = ?", [l.license_key]);
    });
    db.run("DELETE FROM licenses WHERE deleted_at IS NOT NULL");
    saveDb();
}

function renewLicense(id, additionalDays) {
    const lic = queryOne("SELECT * FROM licenses WHERE id = ?", [id]);
    if (!lic) return;
    const cur = new Date(lic.expired_at);
    const now = new Date();
    const base = cur > now ? cur : now;
    base.setDate(base.getDate() + additionalDays);
    db.run("UPDATE licenses SET expired_at = ?, is_active = 1 WHERE id = ?", [base.toISOString(), id]);
    saveDb();
}

function updateLicenseExpiry(id, newExpiryDate) {
    db.run("UPDATE licenses SET expired_at = ? WHERE id = ?", [newExpiryDate, id]);
    saveDb();
}

function updateLicenseMaxDevices(id, maxDevices) {
    db.run("UPDATE licenses SET max_devices = ? WHERE id = ?", [maxDevices, id]);
    saveDb();
}

function updateLicenseNote(id, note) {
    db.run("UPDATE licenses SET note = ? WHERE id = ?", [note, id]);
    saveDb();
}

function updateLicenseName(id, name) {
    db.run("UPDATE licenses SET name = ? WHERE id = ?", [name, id]);
    saveDb();
}

function getKeyDetails(id) {
    const lic = queryOne("SELECT * FROM licenses WHERE id = ?", [id]);
    if (!lic) return null;
    const devices = queryAll("SELECT * FROM devices WHERE license_key = ? ORDER BY last_seen DESC", [lic.license_key]);
    const recentLogs = queryAll("SELECT * FROM access_logs WHERE license_key = ? ORDER BY created_at DESC LIMIT 50", [lic.license_key]);
    const pluginUsage = queryAll(`
        SELECT plugin_name, action, COUNT(*) as count, MAX(created_at) as last_used 
        FROM plugin_activity WHERE license_key = ? 
        GROUP BY plugin_name, action ORDER BY last_used DESC LIMIT 30
    `, [lic.license_key]);
    const deviceCount = devices.filter(d => !d.is_blocked).length;
    const onlineDevices = devices.filter(d => !d.is_blocked && (new Date() - new Date(d.last_seen)) < 5 * 60 * 1000);
    return {
        ...lic,
        devices,
        recent_logs: recentLogs,
        plugin_usage: pluginUsage,
        device_count: deviceCount,
        online_count: onlineDevices.length
    };
}

// ============== USER-AGENT PARSER ==============
function parseUserAgent(ua) {
    if (!ua) return { model: '', os: '' };
    let model = '', os = '';

    // Android detection
    const androidMatch = ua.match(/Android\s+([\d.]+)/);
    if (androidMatch) os = `Android ${androidMatch[1]}`;

    // Device model from Build/
    const buildMatch = ua.match(/;\s*([^;)]+)\s*Build\//);
    if (buildMatch) model = buildMatch[1].trim();

    // Samsung
    if (!model && ua.includes('SM-')) { const m = ua.match(/(SM-[A-Z0-9]+)/); if (m) model = m[1]; }

    // iOS
    const iosMatch = ua.match(/iPhone OS ([\d_]+)/);
    if (iosMatch) { os = `iOS ${iosMatch[1].replace(/_/g, '.')}`; model = 'iPhone'; }
    const ipadMatch = ua.match(/iPad.*OS ([\d_]+)/);
    if (ipadMatch) { os = `iPadOS ${ipadMatch[1].replace(/_/g, '.')}`; model = 'iPad'; }

    // Windows/Mac/Linux
    if (!os && ua.includes('Windows')) os = 'Windows';
    if (!os && ua.includes('Macintosh')) os = 'macOS';
    if (!os && ua.includes('Linux')) os = 'Linux';

    // CloudStream specific
    if (ua.includes('CloudStream')) model = model || 'CloudStream App';

    return { model: model || 'Unknown', os: os || 'Unknown' };
}

// ============== DEVICE TRACKING ==============
function registerDevice(key, ip, userAgent = '', explicitDeviceId = null) {
    let deviceId = explicitDeviceId;
    if (!deviceId) {
        deviceId = crypto.createHash('md5').update(ip + '|' + (userAgent || '')).digest('hex').substring(0, 16);
    }

    const existing = queryOne("SELECT * FROM devices WHERE license_key = ? AND device_id = ?", [key, deviceId]);
    const parsed = parseUserAgent(userAgent);

    if (existing) {
        db.run("UPDATE devices SET last_seen = datetime('now'), ip_address = ?, device_model = ?, os_info = ? WHERE id = ?",
            [ip, parsed.model || existing.device_model, parsed.os || existing.os_info, existing.id]);
        saveDb();
        return { registered: true, device: { ...existing, device_model: parsed.model, os_info: parsed.os }, isNew: false };
    }

    const lic = getLicenseByKey(key);
    if (!lic) return { registered: false, reason: 'INVALID_KEY' };

    const activeDeviceCount = queryOne("SELECT COUNT(*) as c FROM devices WHERE license_key = ? AND is_blocked = 0", [key]);
    const count = activeDeviceCount ? activeDeviceCount.c : 0;

    if (lic.max_devices > 0 && count >= lic.max_devices) {
        return { registered: false, reason: 'MAX_DEVICES', current: count, max: lic.max_devices };
    }

    const autoName = parsed.model || `Device ${count + 1}`;
    db.run("INSERT INTO devices (license_key, device_id, ip_address, user_agent, device_name, device_model, os_info) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [key, deviceId, ip, userAgent || '', autoName, autoName, parsed.os || 'CloudStream']);
    saveDb();
    const newDevice = queryOne("SELECT * FROM devices WHERE license_key = ? AND device_id = ?", [key, deviceId]);
    return { registered: true, device: newDevice, isNew: true };
}

function getDevicesForKey(key) {
    return queryAll("SELECT * FROM devices WHERE license_key = ? ORDER BY last_seen DESC", [key]);
}

function getDeviceCount(key) {
    const r = queryOne("SELECT COUNT(*) as c FROM devices WHERE license_key = ? AND is_blocked = 0", [key]);
    return r ? r.c : 0;
}

function blockDevice(deviceId) {
    db.run("UPDATE devices SET is_blocked = 1 WHERE id = ?", [deviceId]);
    saveDb();
}

function unblockDevice(deviceId) {
    db.run("UPDATE devices SET is_blocked = 0 WHERE id = ?", [deviceId]);
    saveDb();
}

function deleteDevice(deviceId) {
    db.run("DELETE FROM devices WHERE id = ?", [deviceId]);
    saveDb();
}

function renameDevice(deviceId, name) {
    db.run("UPDATE devices SET device_name = ? WHERE id = ?", [name, deviceId]);
    saveDb();
}

function getOnlineDevices() {
    return queryAll(`
        SELECT d.*, l.note as license_note, l.expired_at, l.is_active as license_active
        FROM devices d
        JOIN licenses l ON l.license_key = d.license_key
        WHERE d.is_blocked = 0 AND d.last_seen >= datetime('now', '-5 minutes')
        ORDER BY d.last_seen DESC
    `);
}

function getAllDevicesRecent(limit = 20) {
    return queryAll("SELECT * FROM devices ORDER BY last_seen DESC LIMIT ?", [limit]);
}

// ============== IP BLOCKING ==============
function blockIP(ip, reason = '') {
    const existing = queryOne("SELECT * FROM blocked_ips WHERE ip_address = ?", [ip]);
    if (existing) return existing;
    db.run("INSERT INTO blocked_ips (ip_address, reason) VALUES (?, ?)", [ip, reason]);
    saveDb();
    return queryOne("SELECT * FROM blocked_ips WHERE ip_address = ?", [ip]);
}

function unblockIP(ip) {
    db.run("DELETE FROM blocked_ips WHERE ip_address = ?", [ip]);
    saveDb();
}

function getBlockedIPs() {
    return queryAll("SELECT * FROM blocked_ips ORDER BY blocked_at DESC");
}

function isIPBlocked(ip) {
    const row = queryOne("SELECT id FROM blocked_ips WHERE ip_address = ?", [ip]);
    return !!row;
}

// ============== KEY VALIDATION (ENHANCED) ==============
function validateKey(key, ipAddress = '', userAgent = '', deviceId = null) {
    if (ipAddress && isIPBlocked(ipAddress)) {
        logAccess(key, 'BLOCKED_IP', ipAddress, 'IP is globally blocked');
        return { valid: false, reason: 'BLOCKED_IP' };
    }

    const lic = getLicenseByKey(key);
    if (!lic) {
        logAccess(key, 'INVALID_KEY', ipAddress);
        return { valid: false, reason: 'INVALID_KEY' };
    }
    if (!lic.is_active) {
        logAccess(key, 'REVOKED', ipAddress);
        return { valid: false, reason: 'REVOKED' };
    }
    if (new Date() > new Date(lic.expired_at)) {
        logAccess(key, 'EXPIRED', ipAddress);
        return { valid: false, reason: 'EXPIRED' };
    }

    let deviceResult = null;
    if (ipAddress) {
        deviceResult = registerDevice(key, ipAddress, userAgent, deviceId);
        if (!deviceResult.registered) {
            if (deviceResult.reason === 'MAX_DEVICES') {
                logAccess(key, 'MAX_DEVICES', ipAddress, `Limit: ${deviceResult.max}, Current: ${deviceResult.current}`);
                return { valid: false, reason: 'MAX_DEVICES', current: deviceResult.current, max: deviceResult.max };
            }
        }
        if (deviceResult.registered && deviceResult.device && deviceResult.device.is_blocked) {
            logAccess(key, 'DEVICE_BLOCKED', ipAddress, `Device ${deviceResult.device.device_id} is blocked`);
            return { valid: false, reason: 'DEVICE_BLOCKED' };
        }
    }

    // Don't log VALID here — caller logs meaningful access (REPO_ACCESS, DOWNLOAD, etc.)
    return { valid: true, license: lic, device: deviceResult?.device || null };
}

// ============== LOGS ==============
function logAccess(key, action, ip = '', details = '') {
    db.run("INSERT INTO access_logs (license_key, action, ip_address, details) VALUES (?, ?, ?, ?)",
        [key, action, ip, details]);
    saveDb();
}
function getRecentLogs(limit = 50) {
    return queryAll(`
        SELECT al.*, 
            COALESCE(d.device_name, d.device_model, 'Unknown') as device_name,
            l.name as license_name
        FROM access_logs al
        LEFT JOIN devices d ON d.license_key = al.license_key AND d.ip_address = al.ip_address
        LEFT JOIN licenses l ON l.license_key = al.license_key
        ORDER BY al.created_at DESC LIMIT ?
    `, [limit]);
}
function getLogsForKey(key, limit = 50) {
    return queryAll("SELECT * FROM access_logs WHERE license_key = ? ORDER BY created_at DESC LIMIT ?", [key, limit]);
}

// NEW: Search/filter logs
function searchLogs({ query = '', action = '', limit = 100 } = {}) {
    let sql = "SELECT * FROM access_logs WHERE 1=1";
    const params = [];
    if (query) {
        sql += " AND (license_key LIKE ? OR ip_address LIKE ? OR details LIKE ?)";
        const q = `%${query}%`;
        params.push(q, q, q);
    }
    if (action) {
        sql += " AND action = ?";
        params.push(action);
    }
    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);
    return queryAll(sql, params);
}

// ============== PLUGIN ACTIVITY ==============
function logPluginActivity(key, pluginName, action, ip = '', deviceId = '', data = '') {
    db.run("INSERT INTO plugin_activity (license_key, plugin_name, action, ip_address, device_id, data) VALUES (?, ?, ?, ?, ?, ?)",
        [key, pluginName, action, ip, deviceId, data]);
    saveDb();
}

function getPluginActivity(key, limit = 50) {
    return queryAll("SELECT * FROM plugin_activity WHERE license_key = ? ORDER BY created_at DESC LIMIT ?", [key, limit]);
}

function getPluginStats() {
    const popular = queryAll(`
        SELECT plugin_name, COUNT(*) as total, 
        SUM(CASE WHEN action='DOWNLOAD' THEN 1 ELSE 0 END) as downloads,
        SUM(CASE WHEN action='OPEN' THEN 1 ELSE 0 END) as opens,
        SUM(CASE WHEN action='SEARCH' THEN 1 ELSE 0 END) as searches,
        SUM(CASE WHEN action='LOAD' THEN 1 ELSE 0 END) as loads,
        SUM(CASE WHEN action='PLAY' THEN 1 ELSE 0 END) as plays,
        COUNT(DISTINCT license_key) as unique_users
        FROM plugin_activity GROUP BY plugin_name ORDER BY total DESC LIMIT 20
    `);
    const recent = queryAll(`
        SELECT pa.*, 
            l.note as license_note, l.name as license_name,
            COALESCE(d.device_name, d.device_model, 'Unknown') as device_name
        FROM plugin_activity pa
        LEFT JOIN licenses l ON l.license_key = pa.license_key
        LEFT JOIN devices d ON d.license_key = pa.license_key AND d.device_id = pa.device_id
        ORDER BY pa.created_at DESC LIMIT 30
    `);
    return { popular, recent };
}

// ============== ADMIN ==============
function verifyAdmin(username, password) {
    const admin = queryOne("SELECT * FROM admin WHERE username = ?", [username]);
    if (!admin) return null;
    if (!bcrypt.compareSync(password, admin.password_hash)) return null;
    return { id: admin.id, username: admin.username };
}
function changeAdminPassword(username, newPassword) {
    const hash = bcrypt.hashSync(newPassword, 10);
    db.run("UPDATE admin SET password_hash = ? WHERE username = ?", [hash, username]);
    saveDb();
}

// ============== STATS (ENHANCED) ==============
function getStats() {
    return {
        total_keys: queryOne("SELECT COUNT(*) as c FROM licenses").c,
        active_keys: queryOne("SELECT COUNT(*) as c FROM licenses WHERE is_active = 1 AND expired_at > datetime('now')").c,
        expired_keys: queryOne("SELECT COUNT(*) as c FROM licenses WHERE expired_at <= datetime('now')").c,
        revoked_keys: queryOne("SELECT COUNT(*) as c FROM licenses WHERE is_active = 0").c,
        total_repos: queryOne("SELECT COUNT(*) as c FROM repos").c,
        active_repos: queryOne("SELECT COUNT(*) as c FROM repos WHERE is_active = 1").c,
        access_24h: queryOne("SELECT COUNT(*) as c FROM access_logs WHERE created_at >= datetime('now', '-24 hours')").c,
        total_devices: queryOne("SELECT COUNT(*) as c FROM devices").c,
        online_devices: queryOne("SELECT COUNT(*) as c FROM devices WHERE is_blocked = 0 AND last_seen >= datetime('now', '-5 minutes')").c,
        blocked_ips: queryOne("SELECT COUNT(*) as c FROM blocked_ips").c,
        blocked_devices: queryOne("SELECT COUNT(*) as c FROM devices WHERE is_blocked = 1").c,
        downloads_today: queryOne("SELECT COUNT(*) as c FROM access_logs WHERE action = 'DOWNLOAD' AND created_at >= datetime('now', '-24 hours')").c,
        errors_today: queryOne("SELECT COUNT(*) as c FROM access_logs WHERE action IN ('REVOKED','EXPIRED','BLOCKED_IP','INVALID_KEY','MAX_DEVICES','DEVICE_BLOCKED') AND created_at >= datetime('now', '-24 hours')").c,
        plugin_activity_24h: queryOne("SELECT COUNT(*) as c FROM plugin_activity WHERE created_at >= datetime('now', '-24 hours')").c,
    };
}

module.exports = {
    initDatabase, getSetting, setSetting, getAllSettings,
    addRepo, getAllRepos, toggleRepo, deleteRepo, getActiveRepos,
    createLicense, createBulkLicenses, getAllLicenses, getLicensesPaginated, getLicenseByKey,
    revokeLicense, activateLicense, deleteLicense, restoreLicense, forceDeleteLicense, emptyTrash, renewLicense,
    updateLicenseExpiry, updateLicenseMaxDevices, updateLicenseNote, updateLicenseName, getKeyDetails,
    validateKey, logAccess, getRecentLogs, getLogsForKey, searchLogs,
    verifyAdmin, changeAdminPassword, getStats,
    registerDevice, getDevicesForKey, getDeviceCount, blockDevice, unblockDevice, deleteDevice, renameDevice, getOnlineDevices, getAllDevicesRecent,
    blockIP, unblockIP, getBlockedIPs, isIPBlocked,
    logPluginActivity, getPluginActivity, getPluginStats, parseUserAgent
};
