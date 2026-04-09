export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = err.status ?? err.statusCode ?? 500;
  const message =
    status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: message });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found' });
}
