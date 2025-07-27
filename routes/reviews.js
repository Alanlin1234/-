const express = require('express');
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Game = require('../models/Game');
const { protect, reviewLimiter } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reviews
// @desc    获取评论列表
// @access  Public
router.get('/', async (req, res) => {
    try {
        const {
            game,
            user,
            rating,
            page = 1,
            limit = 10,
            sort = 'createdAt',
            order = 'desc'
        } = req.query;

        const query = { status: 'active' };
        
        if (game) query.game = game;
        if (user) query.user = user;
        if (rating) query.rating = parseInt(rating);

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortObj = {};
        sortObj[sort] = order === 'desc' ? -1 : 1;

        const reviews = await Review.find(query)
            .populate('user', 'username avatar')
            .populate('game', 'title thumbnail')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Review.countDocuments(query);
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            status: 'success',
            data: {
                reviews,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    total,
                    hasNext: parseInt(page) < totalPages,
                    hasPrev: parseInt(page) > 1
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取评论列表失败'
        });
    }
});

// @route   GET /api/reviews/game/:gameId
// @desc    获取游戏评论
// @access  Public
router.get('/game/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const {
            page = 1,
            limit = 10,
            rating,
            sort = 'createdAt',
            order = 'desc'
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            rating: rating ? parseInt(rating) : null,
            sort,
            order
        };

        const reviews = await Review.getGameReviews(gameId, options);

        res.json({
            status: 'success',
            data: { reviews }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取游戏评论失败'
        });
    }
});

// @route   POST /api/reviews
// @desc    创建评论
// @access  Private
router.post('/', protect, reviewLimiter, [
    body('game')
        .notEmpty()
        .withMessage('游戏ID不能为空'),
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('评分必须在1-5之间'),
    body('content')
        .notEmpty()
        .withMessage('评论内容不能为空')
        .isLength({ max: 2000 })
        .withMessage('评论内容不能超过2000个字符'),
    body('title')
        .optional()
        .isLength({ max: 100 })
        .withMessage('评论标题不能超过100个字符')
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

        const { game, rating, content, title, pros, cons, playTime, difficulty } = req.body;

        // 检查游戏是否存在
        const gameExists = await Game.findById(game);
        if (!gameExists) {
            return res.status(404).json({
                status: 'error',
                message: '游戏不存在'
            });
        }

        // 检查用户是否已经评论过这个游戏
        const existingReview = await Review.findOne({
            game,
            user: req.user.id,
            status: 'active'
        });

        if (existingReview) {
            return res.status(400).json({
                status: 'error',
                message: '您已经评论过这个游戏了'
            });
        }

        const review = await Review.create({
            game,
            user: req.user.id,
            rating,
            content,
            title,
            pros,
            cons,
            playTime,
            difficulty
        });

        // 增加用户评论统计
        await req.user.incrementReviewStats();

        // 重新计算游戏评分
        await gameExists.updateRating(rating);

        const populatedReview = await Review.findById(review._id)
            .populate('user', 'username avatar')
            .populate('game', 'title thumbnail');

        res.status(201).json({
            status: 'success',
            message: '评论发布成功',
            data: { review: populatedReview }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '发布评论失败'
        });
    }
});

// @route   PUT /api/reviews/:id
// @desc    更新评论
// @access  Private
router.put('/:id', protect, [
    body('rating')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('评分必须在1-5之间'),
    body('content')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('评论内容不能超过2000个字符'),
    body('title')
        .optional()
        .isLength({ max: 100 })
        .withMessage('评论标题不能超过100个字符')
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

        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                status: 'error',
                message: '评论不存在'
            });
        }

        // 检查权限
        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: '权限不足，无法修改此评论'
            });
        }

        // 更新评论
        Object.assign(review, req.body);
        await review.save();

        // 如果评分有变化，重新计算游戏评分
        if (req.body.rating && req.body.rating !== review.rating) {
            const game = await Game.findById(review.game);
            if (game) {
                await game.updateRating(req.body.rating);
            }
        }

        const updatedReview = await Review.findById(review._id)
            .populate('user', 'username avatar')
            .populate('game', 'title thumbnail');

        res.json({
            status: 'success',
            message: '评论更新成功',
            data: { review: updatedReview }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '更新评论失败'
        });
    }
});

// @route   DELETE /api/reviews/:id
// @desc    删除评论
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                status: 'error',
                message: '评论不存在'
            });
        }

        // 检查权限
        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: '权限不足，无法删除此评论'
            });
        }

        await Review.findByIdAndDelete(req.params.id);

        res.json({
            status: 'success',
            message: '评论删除成功'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '删除评论失败'
        });
    }
});

// @route   POST /api/reviews/:id/helpful
// @desc    标记评论为有用
// @access  Private
router.post('/:id/helpful', protect, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                status: 'error',
                message: '评论不存在'
            });
        }

        const isHelpful = review.helpful.users.includes(req.user.id);
        
        if (isHelpful) {
            await review.unmarkHelpful(req.user.id);
        } else {
            await review.markHelpful(req.user.id);
        }

        res.json({
            status: 'success',
            message: isHelpful ? '已取消标记' : '标记成功',
            data: {
                isHelpful: !isHelpful,
                helpfulCount: review.helpful.count
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '操作失败'
        });
    }
});

// @route   POST /api/reviews/:id/report
// @desc    举报评论
// @access  Private
router.post('/:id/report', protect, [
    body('reason')
        .isIn(['spam', 'inappropriate', 'offensive', 'other'])
        .withMessage('无效的举报原因'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('描述不能超过500个字符')
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

        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                status: 'error',
                message: '评论不存在'
            });
        }

        const { reason, description } = req.body;
        await review.report(req.user.id, reason, description);

        res.json({
            status: 'success',
            message: '举报成功，我们会尽快处理'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '举报失败'
        });
    }
});

// @route   POST /api/reviews/:id/reply
// @desc    回复评论（管理员）
// @access  Private/Admin
router.post('/:id/reply', protect, [
    body('content')
        .notEmpty()
        .withMessage('回复内容不能为空')
        .isLength({ max: 1000 })
        .withMessage('回复内容不能超过1000个字符')
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

        const review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                status: 'error',
                message: '评论不存在'
            });
        }

        const { content } = req.body;
        await review.addReply(req.user.id, content);

        const updatedReview = await Review.findById(review._id)
            .populate('user', 'username avatar')
            .populate('reply.user', 'username avatar');

        res.json({
            status: 'success',
            message: '回复成功',
            data: { review: updatedReview }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '回复失败'
        });
    }
});

module.exports = router; 