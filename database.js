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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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

    // ======= NEW TABLES =======
    db.run(`CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT NOT NULL,
        device_id TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT DEFAULT '',
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
    const seg = [];
    for (let i = 0; i < 4; i++) seg.push(crypto.randomBytes(2).toString('hex').toUpperCase());
    return `${prefix}-${seg.join('-')}`;
}

function createLicense({ durationDays = 30, note = '', maxDevices = 2 }) {
    const key = generateKey();
    const exp = new Date();
    exp.setDate(exp.getDate() + durationDays);
    db.run("INSERT INTO licenses (license_key, duration_days, expired_at, note, max_devices) VALUES (?, ?, ?, ?, ?)",
        [key, durationDays, exp.toISOString(), note, maxDevices]);
    saveDb();
    return { license_key: key, duration_days: durationDays, expired_at: exp.toISOString(), note, max_devices: maxDevices };
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
    const licenses = queryAll("SELECT * FROM licenses ORDER BY created_at DESC");
    // Enrich with device count and online status
    return licenses.map(l => {
        const deviceCount = queryOne("SELECT COUNT(*) as c FROM devices WHERE license_key = ? AND is_blocked = 0", [l.license_key]);
        const onlineCount = queryOne("SELECT COUNT(*) as c FROM devices WHERE license_key = ? AND is_blocked = 0 AND last_seen >= datetime('now', '-5 minutes')", [l.license_key]);
        return {
            ...l,
            device_count: deviceCount ? deviceCount.c : 0,
            online_count: onlineCount ? onlineCount.c : 0
        };
    });
}

function getLicenseByKey(key) {
    return queryOne("SELECT * FROM licenses WHERE license_key = ?", [key]);
}

function revokeLicense(id) {
    db.run("UPDATE licenses SET is_active = 0 WHERE id = ?", [id]); saveDb();
}
function activateLicense(id) {
    db.run("UPDATE licenses SET is_active = 1 WHERE id = ?", [id]); saveDb();
}
function deleteLicense(id) {
    // Also clean up devices and logs for that key
    const lic = queryOne("SELECT license_key FROM licenses WHERE id = ?", [id]);
    if (lic) {
        db.run("DELETE FROM devices WHERE license_key = ?", [lic.license_key]);
    }
    db.run("DELETE FROM licenses WHERE id = ?", [id]);
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

function getKeyDetails(id) {
    const lic = queryOne("SELECT * FROM licenses WHERE id = ?", [id]);
    if (!lic) return null;
    const devices = queryAll("SELECT * FROM devices WHERE license_key = ? ORDER BY last_seen DESC", [lic.license_key]);
    const recentLogs = queryAll("SELECT * FROM access_logs WHERE license_key = ? ORDER BY created_at DESC LIMIT 30", [lic.license_key]);
    const deviceCount = devices.filter(d => !d.is_blocked).length;
    const onlineDevices = devices.filter(d => !d.is_blocked && (new Date() - new Date(d.last_seen)) < 5 * 60 * 1000);
    return {
        ...lic,
        devices,
        recent_logs: recentLogs,
        device_count: deviceCount,
        online_count: onlineDevices.length
    };
}

// ============== DEVICE TRACKING ==============
function registerDevice(key, ip, userAgent = '', explicitDeviceId = null) {
    // If no explicit device ID, fallback to IP+UA hash
    let deviceId = explicitDeviceId;
    if (!deviceId) {
        deviceId = crypto.createHash('md5').update(ip + '|' + (userAgent || '')).digest('hex').substring(0, 16);
    }

    const existing = queryOne("SELECT * FROM devices WHERE license_key = ? AND device_id = ?", [key, deviceId]);

    if (existing) {
        // Update last_seen and IP (might change on same device)
        db.run("UPDATE devices SET last_seen = datetime('now'), ip_address = ? WHERE id = ?", [ip, existing.id]);
        saveDb();
        return { registered: true, device: existing, isNew: false };
    }

    // Check max devices
    const lic = getLicenseByKey(key);
    if (!lic) return { registered: false, reason: 'INVALID_KEY' };

    const activeDeviceCount = queryOne("SELECT COUNT(*) as c FROM devices WHERE license_key = ? AND is_blocked = 0", [key]);
    const count = activeDeviceCount ? activeDeviceCount.c : 0;

    if (lic.max_devices > 0 && count >= lic.max_devices) {
        return { registered: false, reason: 'MAX_DEVICES', current: count, max: lic.max_devices };
    }

    // Register new device
    db.run("INSERT INTO devices (license_key, device_id, ip_address, user_agent) VALUES (?, ?, ?, ?)",
        [key, deviceId, ip, userAgent || '']);
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

function getOnlineDevices() {
    return queryAll(`
        SELECT d.*, l.note as license_note, l.expired_at, l.is_active as license_active
        FROM devices d
        JOIN licenses l ON l.license_key = d.license_key
        WHERE d.is_blocked = 0 AND d.last_seen >= datetime('now', '-5 minutes')
        ORDER BY d.last_seen DESC
    `);
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
    // Check global IP block first
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

    // Register/check device
    if (ipAddress) {
        const deviceResult = registerDevice(key, ipAddress, userAgent, deviceId);
        if (!deviceResult.registered) {
            if (deviceResult.reason === 'MAX_DEVICES') {
                logAccess(key, 'MAX_DEVICES', ipAddress, `Limit: ${deviceResult.max}, Current: ${deviceResult.current}`);
                return { valid: false, reason: 'MAX_DEVICES', current: deviceResult.current, max: deviceResult.max };
            }
        }
        // Check if this specific device is blocked
        if (deviceResult.registered && deviceResult.device && deviceResult.device.is_blocked) {
            logAccess(key, 'DEVICE_BLOCKED', ipAddress, `Device ${deviceResult.device.device_id} is blocked`);
            return { valid: false, reason: 'DEVICE_BLOCKED' };
        }
    }

    logAccess(key, 'VALID', ipAddress);
    return { valid: true, license: lic };
}

// ============== LOGS ==============
function logAccess(key, action, ip = '', details = '') {
    db.run("INSERT INTO access_logs (license_key, action, ip_address, details) VALUES (?, ?, ?, ?)",
        [key, action, ip, details]);
    saveDb();
}
function getRecentLogs(limit = 50) {
    return queryAll("SELECT * FROM access_logs ORDER BY created_at DESC LIMIT ?", [limit]);
}
function getLogsForKey(key, limit = 30) {
    return queryAll("SELECT * FROM access_logs WHERE license_key = ? ORDER BY created_at DESC LIMIT ?", [key, limit]);
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
    };
}

module.exports = {
    initDatabase, getSetting, setSetting, getAllSettings,
    addRepo, getAllRepos, toggleRepo, deleteRepo, getActiveRepos,
    createLicense, createBulkLicenses, getAllLicenses, getLicenseByKey,
    revokeLicense, activateLicense, deleteLicense, renewLicense,
    updateLicenseExpiry, updateLicenseMaxDevices, updateLicenseNote, getKeyDetails,
    validateKey, logAccess, getRecentLogs, getLogsForKey,
    verifyAdmin, changeAdminPassword, getStats,
    registerDevice, getDevicesForKey, getDeviceCount, blockDevice, unblockDevice, deleteDevice, getOnlineDevices,
    blockIP, unblockIP, getBlockedIPs, isIPBlocked
};
