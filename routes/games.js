const express = require('express');
const { body, validationResult } = require('express-validator');
const Game = require('../models/Game');
const Category = require('../models/Category');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/games
// @desc    获取游戏列表
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            category,
            difficulty,
            search,
            sort = 'createdAt',
            order = 'desc',
            featured,
            new: isNew,
            external
        } = req.query;

        // 构建查询条件
        const query = { status: 'active' };
        
        if (category) query.category = category;
        if (difficulty) query.difficulty = difficulty;
        if (featured === 'true') query.isFeatured = true;
        if (isNew === 'true') query.isNew = true;
        if (external === 'true') query.isExternal = true;

        // 搜索功能
        if (search) {
            query.$text = { $search: search };
        }

        // 分页
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // 排序
        const sortObj = {};
        sortObj[sort] = order === 'desc' ? -1 : 1;

        // 执行查询
        const games = await Game.find(query)
            .populate('category', 'name icon color')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit));

        // 获取总数
        const total = await Game.countDocuments(query);

        // 计算总页数
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            status: 'success',
            data: {
                games,
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
            message: '获取游戏列表失败'
        });
    }
});

// @route   GET /api/games/popular
// @desc    获取热门游戏
// @access  Public
router.get('/popular', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const games = await Game.getPopularGames(parseInt(limit));
        
        res.json({
            status: 'success',
            data: { games }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取热门游戏失败'
        });
    }
});

// @route   GET /api/games/recommended
// @desc    获取推荐游戏
// @access  Private
router.get('/recommended', protect, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const games = await Game.getRecommendedGames(req.user.id, parseInt(limit));
        
        res.json({
            status: 'success',
            data: { games }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取推荐游戏失败'
        });
    }
});

// @route   GET /api/games/search
// @desc    搜索游戏
// @access  Public
router.get('/search', async (req, res) => {
    try {
        const { q, category, difficulty, limit = 20, page = 1 } = req.query;
        
        if (!q) {
            return res.status(400).json({
                status: 'error',
                message: '搜索关键词不能为空'
            });
        }

        const options = {
            category,
            difficulty,
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit)
        };

        const games = await Game.searchGames(q, options);
        
        res.json({
            status: 'success',
            data: { games }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '搜索游戏失败'
        });
    }
});

// @route   GET /api/games/:id
// @desc    获取单个游戏详情
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id)
            .populate('category', 'name icon color description');

        if (!game) {
            return res.status(404).json({
                status: 'error',
                message: '游戏不存在'
            });
        }

        // 如果用户已登录，增加游戏统计
        if (req.user) {
            await game.updateStats();
            await req.user.incrementGameStats();
        }

        res.json({
            status: 'success',
            data: { game }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取游戏详情失败'
        });
    }
});

// @route   POST /api/games
// @desc    创建新游戏（管理员）
// @access  Private/Admin
router.post('/', protect, authorize('admin'), [
    body('title')
        .notEmpty()
        .withMessage('游戏标题不能为空')
        .isLength({ max: 100 })
        .withMessage('游戏标题不能超过100个字符'),
    body('description')
        .notEmpty()
        .withMessage('游戏描述不能为空')
        .isLength({ max: 1000 })
        .withMessage('游戏描述不能超过1000个字符'),
    body('category')
        .notEmpty()
        .withMessage('游戏分类不能为空'),
    body('gameUrl')
        .notEmpty()
        .withMessage('游戏URL不能为空')
        .isURL()
        .withMessage('请输入有效的游戏URL')
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

        // 检查分类是否存在
        const category = await Category.findById(req.body.category);
        if (!category) {
            return res.status(400).json({
                status: 'error',
                message: '指定的分类不存在'
            });
        }

        const game = await Game.create({
            ...req.body,
            createdBy: req.user.id
        });

        // 更新分类统计
        await category.updateStats();

        res.status(201).json({
            status: 'success',
            message: '游戏创建成功',
            data: { game }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '创建游戏失败'
        });
    }
});

// @route   PUT /api/games/:id
// @desc    更新游戏（管理员）
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), [
    body('title')
        .optional()
        .isLength({ max: 100 })
        .withMessage('游戏标题不能超过100个字符'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('游戏描述不能超过1000个字符'),
    body('gameUrl')
        .optional()
        .isURL()
        .withMessage('请输入有效的游戏URL')
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

        const game = await Game.findById(req.params.id);
        
        if (!game) {
            return res.status(404).json({
                status: 'error',
                message: '游戏不存在'
            });
        }

        // 更新游戏
        Object.assign(game, req.body);
        game.lastUpdated = Date.now();
        await game.save();

        res.json({
            status: 'success',
            message: '游戏更新成功',
            data: { game }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '更新游戏失败'
        });
    }
});

// @route   DELETE /api/games/:id
// @desc    删除游戏（管理员）
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        
        if (!game) {
            return res.status(404).json({
                status: 'error',
                message: '游戏不存在'
            });
        }

        await Game.findByIdAndDelete(req.params.id);

        res.json({
            status: 'success',
            message: '游戏删除成功'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '删除游戏失败'
        });
    }
});

// @route   POST /api/games/:id/favorite
// @desc    收藏/取消收藏游戏
// @access  Private
router.post('/:id/favorite', protect, async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        
        if (!game) {
            return res.status(404).json({
                status: 'error',
                message: '游戏不存在'
            });
        }

        // 检查用户是否已收藏
        const isFavorited = req.user.preferences.favoriteCategories.includes(game.category);
        
        if (isFavorited) {
            // 取消收藏
            req.user.preferences.favoriteCategories = req.user.preferences.favoriteCategories
                .filter(catId => catId.toString() !== game.category.toString());
            await game.decrementFavorites();
        } else {
            // 添加收藏
            req.user.preferences.favoriteCategories.push(game.category);
            await game.incrementFavorites();
        }

        await req.user.save();

        res.json({
            status: 'success',
            message: isFavorited ? '已取消收藏' : '收藏成功',
            data: {
                isFavorited: !isFavorited,
                favoriteCount: game.stats.favoriteCount
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '操作失败'
        });
    }
});

// @route   GET /api/games/:id/stats
// @desc    获取游戏统计信息
// @access  Public
router.get('/:id/stats', async (req, res) => {
    try {
        const game = await Game.findById(req.params.id)
            .select('stats rating');

        if (!game) {
            return res.status(404).json({
                status: 'error',
                message: '游戏不存在'
            });
        }

        res.json({
            status: 'success',
            data: {
                stats: game.stats,
                rating: game.rating
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取游戏统计失败'
        });
    }
});

module.exports = router; 