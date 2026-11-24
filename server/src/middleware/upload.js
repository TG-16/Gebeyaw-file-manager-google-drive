const multer = require('multer');

// Memory storage allows streaming directly to Google Drive or disk buffer
const storage = multer.memoryStorage();

// Accepted media types:
// Photo: .jpg, .jpeg, .png, .gif, .webp
// Audio: .mp3, .wav, .ogg, .m4a
// Video: .mp4, .mov, .webm
const ALLOWED_MIME_TYPES = {
  // Photos
  'image/jpeg': 'photo',
  'image/png': 'photo',
  'image/gif': 'photo',
  'image/webp': 'photo',
  // Audio
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/x-m4a': 'audio',
  'audio/mp4': 'audio',
  'audio/aac': 'audio',
  // Video
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video'
};

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);

function fileFilter(req, file, cb) {
  const mediaType = ALLOWED_MIME_TYPES[file.mimetype];
  if (!mediaType) {
    return cb(
      new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, GIF, WEBP, MP3, WAV, OGG, M4A, MP4, MOV, WEBM.`),
      false
    );
  }
  file.detectedMediaType = mediaType;
  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024 // e.g. 50 MB
  },
  fileFilter
});

module.exports = {
  upload,
  ALLOWED_MIME_TYPES
};
