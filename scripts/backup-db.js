/**
 * MojAssets Database Backup Script
 *
 * Usage:
 *   node scripts/backup-db.js                        # Run backup
 *   node scripts/backup-db.js --notes "pre-migration" # With notes
 *   BACKUP_STORAGE=s3 node scripts/backup-db.js       # S3 storage
 *
 * Environment variables (see .env.example):
 *   DATABASE_URL           - PostgreSQL connection string (required)
 *   BACKUP_STORAGE         - Storage backend: local (default), s3, backblaze
 *   BACKUP_LOCAL_DIR       - Local backup directory (default: ./backups)
 *   BACKUP_S3_BUCKET       - S3 bucket name
 *   BACKUP_S3_REGION       - S3 region
 *   BACKUP_S3_ACCESS_KEY   - S3 access key
 *   BACKUP_S3_SECRET_KEY   - S3 secret key
 *   BACKUP_B2_BUCKET       - Backblaze B2 bucket name
 *   BACKUP_B2_ENDPOINT     - Backblaze B2 endpoint
 *   BACKUP_B2_REGION       - Backblaze B2 region
 *   BACKUP_B2_ACCESS_KEY   - Backblaze B2 application key ID
 *   BACKUP_B2_SECRET_KEY   - Backblaze B2 application key
 *   BACKUP_RETENTION_DAYS  - Number of days to keep backups (default: 30)
 *   SMTP_*                 - Email notification settings (optional)
 *   BACKUP_NOTIFICATION_EMAIL - Email to notify on failure (optional)
 */

const { execSync } = require('child_process');
const { existsSync, mkdirSync, unlinkSync, readdirSync, statSync, createReadStream } = require('fs');
const { join, resolve } = require('path');
const { createHash } = require('crypto');
const { createGzip } = require('zlib');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');

// ─── Config ───────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = process.env.BACKUP_LOCAL_DIR || resolve(__dirname, '..', 'backups');
const BACKEND = (process.env.BACKUP_STORAGE || 'local').toLowerCase();
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const NOTES = process.argv.includes('--notes')
  ? process.argv[process.argv.indexOf('--notes') + 1] || ''
  : '';

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_ID = `backup-${TIMESTAMP}`;
const LOCAL_PATH = join(BACKUP_DIR, `${BACKUP_ID}.sql.gz`);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [BACKUP] ${msg}`);
}

function error(msg) {
  const ts = new Date().toISOString();
  console.error(`[${ts}] [BACKUP] ERROR: ${msg}`);
}

function md5File(filePath) {
  const hash = createHash('md5');
  const data = require('fs').readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

async function sendFailureNotification(errMsg) {
  const notifyEmail = process.env.BACKUP_NOTIFICATION_EMAIL;
  if (!notifyEmail) {
    log('No BACKUP_NOTIFICATION_EMAIL set — skipping notification');
    return;
  }

  const nodemailer = (() => {
    try { return require('nodemailer'); }
    catch { return null; }
  })();

  if (!nodemailer) {
    log('nodemailer not available — skipping email notification');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@mozassets.com',
      to: notifyEmail,
      subject: `[MozAssets] Database Backup Failed — ${BACKUP_ID}`,
      html: `
        <h2>Database Backup Failed</h2>
        <p><strong>Backup ID:</strong> ${BACKUP_ID}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Storage:</strong> ${BACKEND}</p>
        <p><strong>Error:</strong> ${errMsg}</p>
        <hr />
        <p style="color:#666;font-size:12px;">This is an automated message from MozAssets backup system.</p>
      `,
    });

    log(`Failure notification sent to ${notifyEmail}`);
  } catch (e) {
    error(`Failed to send notification email: ${e.message}`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  log(`Starting backup: ${BACKUP_ID}`);
  log(`Storage backend: ${BACKEND}`);

  // 1. Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 2. Validate DATABASE_URL
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  // Parse the database URL for pg_dump
  const dbUrl = new URL(DATABASE_URL);
  const dbName = dbUrl.pathname.replace('/', '');
  const dbHost = dbUrl.hostname;
  const dbPort = dbUrl.port || '5432';
  const dbUser = decodeURIComponent(dbUrl.username);
  const dbPass = decodeURIComponent(dbUrl.password);

  // 3. Run pg_dump with compression
  log('Running pg_dump...');

  // Use PGPASSWORD env var for auth
  const env = { ...process.env, PGPASSWORD: dbPass };

  const pgDumpArgs = [
    'pg_dump',
    `--host=${dbHost}`,
    `--port=${dbPort}`,
    `--username=${dbUser}`,
    `--dbname=${dbName}`,
    '--format=custom',
    '--compress=9',
    '--no-owner',
    '--no-acl',
    '--verbose',
  ];

  // Write raw dump first, then gzip
  const rawPath = LOCAL_PATH.replace('.sql.gz', '.dump');
  try {
    execSync(pgDumpArgs.join(' '), {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000, // 5 min
    });
  } catch (pgError) {
    // pg_dump may not output to stdout directly with --file; use pipe approach
    throw new Error(`pg_dump failed: ${pgError.stderr?.toString() || pgError.message}`);
  }

  // Actually use pg_dump with pipe to gzip
  const dumpCommand = [
    `set PGPASSWORD=${dbPass} &&`,
    'pg_dump',
    `--host=${dbHost}`,
    `--port=${dbPort}`,
    `--username=${dbUser}`,
    `--dbname=${dbName}`,
    '--format=custom',
    '--compress=9',
    '--no-owner',
    '--no-acl',
    `--file=${LOCAL_PATH}`,
  ].join(' ');

  try {
    execSync(dumpCommand, {
      env: { ...process.env, PGPASSWORD: dbPass },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000,
    });
  } catch (pgError) {
    throw new Error(`pg_dump failed: ${pgError.stderr?.toString() || pgError.message}`);
  }

  if (!existsSync(LOCAL_PATH)) {
    throw new Error('pg_dump did not produce output file');
  }

  const fileSize = statSync(LOCAL_PATH).size;
  const md5Hash = md5File(LOCAL_PATH);
  log(`Backup written to ${LOCAL_PATH} (${(fileSize / 1024 / 1024).toFixed(2)} MB, md5: ${md5Hash})`);

  // 4. Upload to remote storage (if configured)
  if (BACKEND !== 'local') {
    log(`Uploading to ${BACKEND}...`);
    // We upload from the Prisma-based API instead of inline
    // The script writes the file locally; the DB record is managed by the API
    log('Remote upload handled by backup API layer after script completes.');
  }

  // 5. Apply retention policy — delete old local backups
  log(`Applying retention policy (${RETENTION_DAYS} days)...`);
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = readdirSync(BACKUP_DIR);
  let deleted = 0;
  for (const file of files) {
    if (!file.endsWith('.sql.gz') && !file.endsWith('.dump')) continue;
    const filePath = join(BACKUP_DIR, file);
    const s = statSync(filePath);
    if (s.mtimeMs < cutoff) {
      unlinkSync(filePath);
      deleted++;
    }
  }
  log(`Retention cleanup: deleted ${deleted} old backup(s)`);

  // 6. Record in database via Prisma
  log('Recording backup in database...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.backup.create({
      data: {
        id: BACKUP_ID,
        status: 'SUCCESS',
        storageBackend: BACKEND.toUpperCase(),
        filePath: LOCAL_PATH,
        fileSize: BigInt(fileSize),
        md5Hash,
        notes: NOTES || null,
        completedAt: new Date(),
      },
    });
    log('Backup record created in database');
  } catch (dbError) {
    error(`Failed to record backup in database: ${dbError.message}`);
    // Don't fail — the backup file exists on disk
  } finally {
    await prisma.$disconnect();
  }

  log('Backup completed successfully');
  console.log(`BACKUP_ID=${BACKUP_ID}`);
  console.log(`BACKUP_PATH=${LOCAL_PATH}`);
  console.log(`BACKUP_SIZE=${fileSize}`);
  console.log(`BACKUP_MD5=${md5Hash}`);
}

// ─── Execute ──────────────────────────────────────────────────────────────────
run().catch(async (err) => {
  error(err.message);

  // Record failure in database
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.backup.create({
      data: {
        id: BACKUP_ID,
        status: 'FAILED',
        storageBackend: BACKEND.toUpperCase(),
        errorMessage: err.message,
        notes: NOTES || null,
        completedAt: new Date(),
      },
    });
    await prisma.$disconnect();
  } catch { /* ignore db errors during failure logging */ }

  await sendFailureNotification(err.message);
  process.exit(1);
});
