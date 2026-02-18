const db = require('./database');

async function unblock() {
    try {
        await db.initDatabase();

        const blocks = db.getBlockedIPs();
        console.log(`Found ${blocks.length} blocked IP(s).`);

        if (blocks.length > 0) {
            for (const b of blocks) {
                console.log(`Unblocking ${b.ip_address} (reason: ${b.reason})...`);
                db.unblockIP(b.ip_address);
                db.clearFailedLogins(b.ip_address);
            }
        } else {
            // Just in case, try clearing common locals
            db.unblockIP('127.0.0.1');
            db.clearFailedLogins('127.0.0.1');
            db.unblockIP('::1');
            db.clearFailedLogins('::1');
        }

        console.log('Unblocked successfully.');

        // Also verify admin
        const admin = db.getAdminByUsername('admin');
        if (admin) {
            console.log('Admin user OK.');
        } else {
            console.log('Creating default admin...');
            // initDatabase creates it if missing, so we are good.
        }

    } catch (e) {
        console.error('Error during unblock:', e);
    } finally {
        // Force exit because database.js has intervals running
        process.exit(0);
    }
}

unblock();
