const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

try {
  require('dotenv').config();
} catch (e) {}

const authRoutes = require('./routes/auth.routes');
const folderRoutes = require('./routes/folder.routes');
const objectRoutes = require('./routes/object.routes');
const mediaRoutes = require('./routes/media.routes');
const trashRoutes = require('./routes/trash.routes');
const shareRoutes = require('./routes/share.routes');
const searchRoutes = require('./routes/search.routes');
const adminRoutes = require('./routes/admin.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security headers with media streaming policy
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
  })
);

// Cross-Origin Resource Sharing with credentials for HTTP-only cookies
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin, configured CLIENT_URL, localhost, or *.gebeyawsolar.com
      if (
        !origin ||
        origin === allowedOrigin ||
        origin.startsWith('http://localhost:') ||
        origin.endsWith('gebeyawsolar.com')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Dev convenience
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range']
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Personal File Manager API'
  });
});

// API v1 Endpoints
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/folders', folderRoutes);
app.use('/api/v1/objects', objectRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/trash', trashRoutes);
app.use('/api/v1/share', shareRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/admin', adminRoutes);

// Central error handler
app.use(errorHandler);

module.exports = app;
