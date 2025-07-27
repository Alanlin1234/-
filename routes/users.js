const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Review = require('../models/Review');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    获取用户个人资料
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('preferences.favoriteCategories', 'name icon color')
            .select('-password');

        res.json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取用户资料失败'
        });
    }
});

// @route   PUT /api/users/profile
// @desc    更新用户个人资料
// @access  Private
router.put('/profile', protect, [
    body('username')
        .optional()
        .isLength({ min: 3, max: 20 })
        .withMessage('用户名长度必须在3-20个字符之间')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用户名只能包含字母、数字和下划线'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail()
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

        const { username, email, preferences } = req.body;
        const user = await User.findById(req.user.id);

        // 检查用户名是否已被使用
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({
                    status: 'error',
                    message: '用户名已被使用'
                });
            }
        }

        // 检查邮箱是否已被使用
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    status: 'error',
                    message: '邮箱已被使用'
                });
            }
        }

        // 更新用户信息
        if (username) user.username = username;
        if (email) user.email = email;
        if (preferences) {
            user.preferences = { ...user.preferences, ...preferences };
        }

        await user.save();

        const updatedUser = await User.findById(user._id)
            .populate('preferences.favoriteCategories', 'name icon color')
            .select('-password');

        res.json({
            status: 'success',
            message: '个人资料更新成功',
            data: { user: updatedUser }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '更新个人资料失败'
        });
    }
});

// @route   PUT /api/users/password
// @desc    修改密码
// @access  Private
router.put('/password', protect, [
    body('currentPassword')
        .notEmpty()
        .withMessage('当前密码不能为空'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('新密码至少需要6个字符')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('新密码必须包含大小写字母和数字')
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

        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+password');

        // 验证当前密码
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                status: 'error',
                message: '当前密码错误'
            });
        }

        // 更新密码
        user.password = newPassword;
        await user.save();

        res.json({
            status: 'success',
            message: '密码修改成功'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '修改密码失败'
        });
    }
});

// @route   GET /api/users/reviews
// @desc    获取用户评论
// @access  Private
router.get('/reviews', protect, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const reviews = await Review.getUserReviews(req.user.id, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            status: 'success',
            data: { reviews }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取用户评论失败'
        });
    }
});

// @route   GET /api/users/stats
// @desc    获取用户统计信息
// @access  Private
router.get('/stats', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('stats level');

        // 获取用户评论统计
        const reviewStats = await Review.aggregate([
            { $match: { user: user._id, status: 'active' } },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$rating' },
                    totalHelpful: { $sum: '$helpful.count' }
                }
            }
        ]);

        const stats = {
            ...user.stats,
            level: user.level,
            reviewStats: reviewStats[0] || {
                totalReviews: 0,
                averageRating: 0,
                totalHelpful: 0
            }
        };

        res.json({
            status: 'success',
            data: { stats }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取用户统计失败'
        });
    }
});

// @route   POST /api/users/avatar
// @desc    上传用户头像
// @access  Private
router.post('/avatar', protect, async (req, res) => {
    try {
        // 这里应该实现文件上传逻辑
        // 由于没有配置multer，这里只是示例
        const avatarUrl = req.body.avatarUrl; // 假设前端已经上传并返回URL

        if (!avatarUrl) {
            return res.status(400).json({
                status: 'error',
                message: '请提供头像URL'
            });
        }

        const user = await User.findById(req.user.id);
        user.avatar = avatarUrl;
        await user.save();

        res.json({
            status: 'success',
            message: '头像更新成功',
            data: { avatar: avatarUrl }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '上传头像失败'
        });
    }
});

// @route   DELETE /api/users/account
// @desc    删除用户账户
// @access  Private
router.delete('/account', protect, [
    body('password')
        .notEmpty()
        .withMessage('请输入密码确认删除')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: '请输入密码确认删除',
                errors: errors.array()
            });
        }

        const { password } = req.body;
        const user = await User.findById(req.user.id).select('+password');

        // 验证密码
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({
                status: 'error',
                message: '密码错误'
            });
        }

        // 删除用户的所有评论
        await Review.deleteMany({ user: user._id });

        // 删除用户账户
        await User.findByIdAndDelete(user._id);

        res.json({
            status: 'success',
            message: '账户删除成功'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '删除账户失败'
        });
    }
});

// @route   GET /api/users/:id
// @desc    获取其他用户信息（公开）
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('username avatar stats level createdAt')
            .populate('preferences.favoriteCategories', 'name icon');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: '用户不存在'
            });
        }

        res.json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取用户信息失败'
        });
    }
});

// @route   GET /api/users/:id/reviews
// @desc    获取其他用户的评论（公开）
// @access  Public
router.get('/:id/reviews', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const reviews = await Review.getUserReviews(req.params.id, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            status: 'success',
            data: { reviews }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取用户评论失败'
        });
    }
});

// 管理员路由
// @route   GET /api/users
// @desc    获取所有用户（管理员）
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role } = req.query;
        
        const query = {};
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) query.role = role;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            status: 'success',
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    total,
                    hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
                    hasPrev: parseInt(page) > 1
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取用户列表失败'
        });
    }
});

// @route   PUT /api/users/:id/role
// @desc    修改用户角色（管理员）
// @access  Private/Admin
router.put('/:id/role', protect, authorize('admin'), [
    body('role')
        .isIn(['user', 'moderator', 'admin'])
        .withMessage('无效的角色')
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

        const { role } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: '用户不存在'
            });
        }

        user.role = role;
        await user.save();

        res.json({
            status: 'success',
            message: '用户角色更新成功',
            data: { user }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '更新用户角色失败'
        });
    }
});

module.exports = router; 