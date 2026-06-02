// Force-delete a mock/test user and all related records by email.
// SAFETY: refuses to run against production or remote databases.

const DATABASE_URL = process.env.DATABASE_URL || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production') {
  console.error('Refusing to run in production (NODE_ENV=production).');
  process.exit(1);
}

const isLocal =
  DATABASE_URL.includes('localhost') ||
  DATABASE_URL.includes('127.0.0.1') ||
  DATABASE_URL.includes('0.0.0.0') ||
  DATABASE_URL.includes('::1') ||
  /\.(local|test|dev)$/.test(DATABASE_URL.split('@').pop()?.split(':')[0] || '');

if (!isLocal) {
  console.error('Refusing to run against non-local database:', DATABASE_URL.replace(/\/\/.*@/, '//***@'));
  process.exit(1);
}

console.log('Safety check passed — running against local database.');
