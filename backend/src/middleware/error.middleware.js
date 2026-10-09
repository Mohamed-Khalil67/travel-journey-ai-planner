export const errorHandler = (err, req, res, next) => {
  // Malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') err.statusCode = 400;
  if (err.type === 'entity.too.large') err.statusCode = 413;

  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 500) console.error(err.stack);

  if (res.headersSent) return next(err);

  res.status(statusCode).json({
    error: {
      // Never leak internal error details to clients for server errors
      message: statusCode >= 500 ? 'Internal Server Error' : err.message,
      status: statusCode
    }
  });
};
