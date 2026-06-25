export function notFoundHandler(request, _response, next) {
  const error = new Error(`Route ${request.method} ${request.originalUrl} not found`)
  error.statusCode = 404
  next(error)
}

export function errorHandler(error, _request, response, _next) {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return response.status(413).json({
      status: 'error',
      message: 'The import file must not exceed 5 MB',
    })
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return response.status(400).json({
      status: 'error',
      message: 'Upload exactly one file using the field name "file"',
    })
  }

  if (error.code === '23505') {
    return response.status(409).json({
      status: 'error',
      message: 'A record with this unique value already exists',
    })
  }

  if (error.code === '22P02') {
    return response.status(400).json({
      status: 'error',
      message: 'Invalid value format',
    })
  }

  const statusCode = error.statusCode || 500

  const payload = {
    status: 'error',
    message: statusCode === 500 ? 'Internal server error' : error.message,
  }

  if (statusCode < 500 && Array.isArray(error.details)) {
    payload.errors = error.details
  }

  return response.status(statusCode).json(payload)
}
