export function notFoundHandler(request, _response, next) {
  const error = new Error(`Route ${request.method} ${request.originalUrl} not found`)
  error.statusCode = 404
  next(error)
}

export function errorHandler(error, _request, response, _next) {
  if (error.code === '23505') {
    return response.status(409).json({
      status: 'error',
      message: 'This email is already in use',
    })
  }

  if (error.code === '22P02') {
    return response.status(400).json({
      status: 'error',
      message: 'Invalid value format',
    })
  }

  const statusCode = error.statusCode || 500

  return response.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal server error' : error.message,
  })
}
