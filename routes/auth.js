const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, loginLimiter, registerLimiter } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    用户注册
// @access  Public
router.post('/register', registerLimiter, [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('用户名长度必须在3-20个字符之间')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用户名只能包含字母、数字和下划线'),
    body('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('密码至少需要6个字符')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('密码必须包含大小写字母和数字')
], async (req, res) => {
    try {
        // 检查验证错误
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: '输入数据有误',
                errors: errors.array()
            });
        }

        const { username, email, password } = req.body;

        // 检查用户是否已存在
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: '用户名或邮箱已被注册'
            });
        }

        // 创建用户
        const user = await User.create({
            username,
            email,
            password
        });

        // 生成验证令牌
        const verificationToken = user.getVerificationToken();
        await user.save();

        // 发送验证邮件
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify/${verificationToken}`;
        
        try {
            await sendEmail({
                email: user.email,
                subject: 'GameHub - 邮箱验证',
                message: `
                    <h2>欢迎加入GameHub！</h2>
                    <p>请点击下面的链接验证您的邮箱：</p>
                    <a href="${verificationUrl}">验证邮箱</a>
                    <p>如果您没有注册GameHub账户，请忽略此邮件。</p>
                `
            });

            res.status(201).json({
                status: 'success',
                message: '注册成功！请检查您的邮箱完成验证。',
                data: {
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email
                    }
                }
            });
        } catch (emailError) {
            // 如果邮件发送失败，删除用户
            await User.findByIdAndDelete(user._id);
            return res.status(500).json({
                status: 'error',
                message: '邮件发送失败，请稍后重试'
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '注册失败，请稍后重试'
        });
    }
});

// @route   POST /api/auth/login
// @desc    用户登录
// @access  Public
router.post('/login', loginLimiter, [
    body('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('密码不能为空')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: '输入数据有误',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // 查找用户并包含密码字段
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: '邮箱或密码错误'
            });
        }

        // 验证密码
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                status: 'error',
                message: '邮箱或密码错误'
            });
        }

        // 检查账户是否已验证
        if (!user.isVerified) {
            return res.status(401).json({
                status: 'error',
                message: '请先验证您的邮箱'
            });
        }

        // 更新最后登录时间
        await user.updateLastLogin();

        // 生成JWT令牌
        const token = user.getSignedJwtToken();

        // 设置cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
        });

        res.json({
            status: 'success',
            message: '登录成功',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    level: user.level,
                    stats: user.stats
                },
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '登录失败，请稍后重试'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    用户登出
// @access  Private
router.post('/logout', protect, (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.json({
        status: 'success',
        message: '登出成功'
    });
});

// @route   GET /api/auth/me
// @desc    获取当前用户信息
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('preferences.favoriteCategories', 'name icon');

        res.json({
            status: 'success',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    level: user.level,
                    stats: user.stats,
                    preferences: user.preferences,
                    isVerified: user.isVerified,
                    lastLogin: user.lastLogin
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取用户信息失败'
        });
    }
});

// @route   GET /api/auth/verify/:token
// @desc    验证邮箱
// @access  Public
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // 加密令牌
        const crypto = require('crypto');
        const verificationToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            verificationToken,
            isVerified: false
        });

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: '无效的验证令牌'
            });
        }

        // 验证用户
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.json({
            status: 'success',
            message: '邮箱验证成功！现在可以登录了。'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '验证失败，请稍后重试'
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    忘记密码
// @access  Public
router.post('/forgot-password', [
    body('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: '请输入有效的邮箱地址'
            });
        }

        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: '该邮箱未注册'
            });
        }

        // 生成重置令牌
        const resetToken = user.getResetPasswordToken();
        await user.save();

        // 发送重置邮件
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        
        try {
            await sendEmail({
                email: user.email,
                subject: 'GameHub - 密码重置',
                message: `
                    <h2>密码重置请求</h2>
                    <p>您请求重置密码，请点击下面的链接：</p>
                    <a href="${resetUrl}">重置密码</a>
                    <p>如果您没有请求重置密码，请忽略此邮件。</p>
                    <p>此链接将在10分钟后失效。</p>
                `
            });

            res.json({
                status: 'success',
                message: '密码重置邮件已发送，请检查您的邮箱'
            });
        } catch (emailError) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            return res.status(500).json({
                status: 'error',
                message: '邮件发送失败，请稍后重试'
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '发送重置邮件失败'
        });
    }
});

// @route   PUT /api/auth/reset-password/:token
// @desc    重置密码
// @access  Public
router.put('/reset-password/:token', [
    body('password')
        .isLength({ min: 6 })
        .withMessage('密码至少需要6个字符')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('密码必须包含大小写字母和数字')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: '密码格式不正确',
                errors: errors.array()
            });
        }

        const { token } = req.params;
        const { password } = req.body;

        // 加密令牌
        const crypto = require('crypto');
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: '无效的重置令牌或已过期'
            });
        }

        // 设置新密码
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({
            status: 'success',
            message: '密码重置成功'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '密码重置失败'
        });
    }
});

module.exports = router; 