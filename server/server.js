const fs = require('fs');
const path = require('path');

// 1. Load environment variables safely (supports dotenv, Node.js built-in, or manual parser)
function loadEnvironment() {
  try {
    require('dotenv').config();
    return;
  } catch (e) {
    // Fallback: parse .env with built-in fs if dotenv is not yet installed
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '.env')
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          content.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
              const idx = trimmed.indexOf('=');
              const key = trimmed.slice(0, idx).trim();
              const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          });
          break;
        } catch (readErr) {
          console.warn('Could not read .env file:', readErr.message);
        }
      }
    }
  }
}

loadEnvironment();

// 2. Safely import application dependencies
let app;
let initDatabase;
let startTrashCleanupCron;

try {
  app = require('./src/app');
  initDatabase = require('./src/config/db').initDatabase;
  startTrashCleanupCron = require('./src/services/trash.cleanup').startTrashCleanupCron;
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.error('\n=============================================================');
    console.error(' MISSING NPM DEPENDENCIES ERROR:');
    console.error(err.message);
    console.error('-------------------------------------------------------------');
    console.error('Your server cannot find installed npm packages.');
    console.error('To fix this on cPanel / LiteSpeed:');
    console.error('1. Make sure "package.json" is placed in:');
    console.error('   ' + __dirname + '/package.json');
    console.error('2. Go to cPanel -> "Setup Node.js App" -> Click "Run NPM Install"');
    console.error('   (Or via SSH terminal: cd ' + __dirname + ' && npm install)');
    console.error('=============================================================\n');
  }
  throw err;
}

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    // 1. Initialize DB tables & seed admin user if needed
    await initDatabase();

    // 2. Start 30-day trash cleanup schedule
    startTrashCleanupCron();

    // 3. Start listening
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(` File Manager Server running on port ${PORT}`);
      console.log(` API Endpoint: http://localhost:${PORT}/api/v1`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
