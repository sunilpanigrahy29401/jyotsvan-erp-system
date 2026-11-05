// Runs before every test file: point the server at the TEST database and make auth deterministic.
// TEST_DATABASE_URL must point at a disposable Postgres database (never a shared or production one).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.DATABASE_SSL = process.env.TEST_DATABASE_SSL || 'disable';
process.env.SESSION_SECRET = 'test-session-secret-test-session-secret-0123456789';
process.env.ENCRYPTION_SECRET = 'test-encryption-secret-test-encryption-0123456789';
process.env.COOKIE_SECURE = 'false';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';
process.env.RUN_MIGRATIONS_ON_BOOT = 'false';
