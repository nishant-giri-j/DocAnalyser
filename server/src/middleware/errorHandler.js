const errorHandler = (err, req, res, next) => {
  console.error(err);

  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';

  // Handle Prisma specific errors
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = `Unique constraint failed on the fields: ${err.meta?.target?.join(', ')}`;
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        break;
      case 'P2003':
        statusCode = 400;
        message = `Foreign key constraint failed on the field: ${err.meta?.field_name}`;
        break;
      default:
        if (err.code.startsWith('P')) {
          statusCode = 400;
          message = 'Database error occurred';
        }
    }
  }

  // Multer errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack, details: err }),
    },
  });
};

module.exports = { errorHandler };
