# Database Restore Guide

## Prerequisites

- PostgreSQL client tools (`pg_restore`, `psql`) installed locally or on the target server
- Access to the backup file (download from admin UI or storage backend)
- `DATABASE_URL` for the target database
- Sufficient disk space for the decompressed dump

---

## Quick Restore (from admin UI download)

### Step 1 — Download the backup

From the admin **Database Backups** page, click **Download** on the desired backup. This gives you a `.sql.gz` file.

### Step 2 — Restore

```bash
# Direct restore
pg_restore --clean --if-exists --no-owner --dbname="postgresql://user:pass@host:5432/dbname" backup-file.sql.gz
```

Or decompress and inspect first:

```bash
gunzip -c backup-file.sql.gz > backup-file.sql
# Inspect the SQL if needed
less backup-file.sql
# Then restore
psql "postgresql://user:pass@host:5432/dbname" < backup-file.sql
```

---

## Restore from Local Backups Directory

```bash
# List available backups
ls -lh ./backups/*.sql.gz

# Restore the most recent
pg_restore --clean --if-exists --no-owner \
  --dbname="$DATABASE_URL" \
  ./backups/$(ls -t ./backups/*.sql.gz | head -1)
```

---

## Restore from S3

```bash
# Download from S3
aws s3 cp s3://mozassets-backups/backups/<BACKUP_ID>.sql.gz ./restore-<BACKUP_ID>.sql.gz

# Restore
pg_restore --clean --if-exists --no-owner \
  --dbname="postgresql://user:pass@host:5432/dbname" \
  ./restore-<BACKUP_ID>.sql.gz
```

---

## Restore from Backblaze B2

```bash
# Download using b2 CLI
b2 download-file-by-name mozassets-backups backups/<BACKUP_ID>.sql.gz ./restore.sql.gz

# Or using AWS CLI compatible endpoint
aws s3 --endpoint https://s3.us-west-004.backblazeb2.com \
  cp s3://mozassets-backups/backups/<BACKUP_ID>.sql.gz ./restore.sql.gz

# Restore
pg_restore --clean --if-exists --no-owner \
  --dbname="postgresql://user:pass@host:5432/dbname" \
  ./restore.sql.gz
```

---

## Automated Restore Script

Create a file `scripts/restore-db.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_ID="${1:-}"
TARGET_DB_URL="${DATABASE_URL}"

if [ -z "$BACKUP_ID" ]; then
  echo "Usage: $0 <backup-id>"
  echo "Available backups:"
  ls -1 ./backups/*.sql.gz | sed 's/.*\///; s/\.sql\.gz//'
  exit 1
fi

BACKUP_FILE="./backups/${BACKUP_ID}.sql.gz"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Restoring ${BACKUP_ID}..."
echo "Target: ${TARGET_DB_URL//:[^:@]*@/:****@}"

read -p "Are you sure? Type 'RESTORE' to confirm: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Aborted."
  exit 1
fi

pg_restore --clean --if-exists --no-owner --dbname="$TARGET_DB_URL" "$BACKUP_FILE"

echo "Restore complete."
```

```bash
chmod +x scripts/restore-db.sh
```

---

## Important Notes

- **Always test the restore on a staging database first** before restoring to production
- The restore will **overwrite all data** in the target database
- Run `npx prisma db push` after restore to ensure schema is up to date
- Notify the team before performing a production restore
- Keep the downloaded backup file in a secure location until the restore is verified

## Verification

After restore, verify:

```bash
# Check user count
psql "$DATABASE_URL" -c "SELECT count(*) FROM \"User\";"

# Check asset count
psql "$DATABASE_URL" -c "SELECT count(*) FROM \"Asset\";"

# Run Prisma validation
npx prisma db push --accept-data-loss
npx prisma generate
```

Then restart the application and verify the admin dashboard loads correctly.
