const dotenv = require('dotenv');
const app = require('./src/app');
const { initDatabase } = require('./src/config/db');
const { startTrashCleanupCron } = require('./src/services/trash.cleanup');

dotenv.config();

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
