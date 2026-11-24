function errorHandler(err, req, res, next) {
  console.error(' [Error Handler]', err);

  // Multer file size limit error
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxMb = process.env.MAX_FILE_SIZE_MB || '50';
    return res.status(400).json({
      error: `File size exceeds the maximum limit of ${maxMb}MB.`
    });
  }

  // General Multer errors or custom client errors
  if (err.name === 'MulterError' || err.statusCode === 400) {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  res.status(status).json({
    error: message,
    code: err.code || undefined
  });
}

module.exports = {
  errorHandler
};
