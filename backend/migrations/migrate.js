const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigration() {
    const sqlFile = path.join(__dirname, '001_enterprise_security_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split on DELIMITER changes and semicolons, handling triggers
    // Strip DELIMITER directives and split into individual statements
    const cleaned = sql
        .replace(/DELIMITER \$\$/g, '')
        .replace(/DELIMITER ;/g, '')
        .replace(/\$\$/g, ';');

    const statements = cleaned
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Running migration: 001_enterprise_security_tables.sql`);
    console.log(`Executing ${statements.length} statements...`);

    for (const statement of statements) {
        try {
            await db.query(statement);
            const preview = statement.substring(0, 60).replace(/\n/g, ' ');
            console.log(`  ✓ ${preview}...`);
        } catch (err) {
            // Ignore "already exists" errors for idempotency
            if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_KEYNAME') {
                console.log(`  ~ Skipped (already exists)`);
            } else {
                console.error(`  ✗ Failed: ${err.message}`);
                console.error(`    Statement: ${statement.substring(0, 100)}`);
                process.exit(1);
            }
        }
    }

    console.log('\nMigration complete.');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
