const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 保护路由中间件
const protect = async (req, res, next) => {
    let token;

    // 从请求头获取token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // 从cookie获取token
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: '未提供访问令牌，请先登录'
        });
    }

    try {
        // 验证token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 获取用户信息
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: '用户不存在'
            });
        }

        // 检查用户是否被禁用
        if (!user.isVerified) {
            return res.status(401).json({
                status: 'error',
                message: '账户未验证，请先验证邮箱'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            status: 'error',
            message: '无效的访问令牌'
        });
    }
};

// 可选认证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            if (user && user.isVerified) {
                req.user = user;
            }
        } catch (error) {
            // 忽略token错误，继续执行
        }
    }

    next();
};

// 角色授权中间件
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: '需要登录才能访问此资源'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: '权限不足，无法访问此资源'
            });
        }

        next();
    };
};

// 资源所有权检查中间件
const checkOwnership = (model, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[paramName];
            const Model = require(`../models/${model}`);
            
            const resource = await Model.findById(resourceId);
            
            if (!resource) {
                return res.status(404).json({
                    status: 'error',
                    message: '资源不存在'
                });
            }

            // 检查是否是资源所有者或管理员
            if (resource.user && resource.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: '权限不足，无法操作此资源'
                });
            }

            req.resource = resource;
            next();
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                message: '服务器错误'
            });
        }
    };
};

// 速率限制中间件
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            status: 'error',
            message: message || '请求过于频繁，请稍后再试'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// 登录限制
const loginLimiter = createRateLimiter(
    15 * 60 * 1000, // 15分钟
    5, // 最多5次尝试
    '登录尝试次数过多，请15分钟后再试'
);

// 注册限制
const registerLimiter = createRateLimiter(
    60 * 60 * 1000, // 1小时
    3, // 最多3次注册
    '注册次数过多，请1小时后再试'
);

// 评论限制
const reviewLimiter = createRateLimiter(
    60 * 60 * 1000, // 1小时
    10, // 最多10条评论
    '评论发布过于频繁，请稍后再试'
);

module.exports = {
    protect,
    optionalAuth,
    authorize,
    checkOwnership,
    loginLimiter,
    registerLimiter,
    reviewLimiter
}; 