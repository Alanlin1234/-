const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // 记录错误日志
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Mongoose 重复键错误
    if (err.code === 11000) {
        const message = '数据已存在';
        error = {
            message,
            statusCode: 400
        };
    }

    // Mongoose 验证错误
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = {
            message,
            statusCode: 400
        };
    }

    // Mongoose 转换错误
    if (err.name === 'CastError') {
        const message = '无效的数据格式';
        error = {
            message,
            statusCode: 400
        };
    }

    // JWT 错误
    if (err.name === 'JsonWebTokenError') {
        const message = '无效的令牌';
        error = {
            message,
            statusCode: 401
        };
    }

    // JWT 过期错误
    if (err.name === 'TokenExpiredError') {
        const message = '令牌已过期';
        error = {
            message,
            statusCode: 401
        };
    }

    // 文件上传错误
    if (err.code === 'LIMIT_FILE_SIZE') {
        const message = '文件大小超过限制';
        error = {
            message,
            statusCode: 400
        };
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        const message = '意外的文件字段';
        error = {
            message,
            statusCode: 400
        };
    }

    // 默认错误
    const statusCode = error.statusCode || 500;
    const message = error.message || '服务器内部错误';

    res.status(statusCode).json({
        status: 'error',
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler; 