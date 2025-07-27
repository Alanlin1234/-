const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const Game = require('../models/Game');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/categories
// @desc    获取所有分类
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { active = true, tree = false } = req.query;
        
        let categories;
        if (tree === 'true') {
            categories = await Category.getCategoryTree();
        } else {
            categories = await Category.getActiveCategories();
        }

        res.json({
            status: 'success',
            data: { categories }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取分类列表失败'
        });
    }
});

// @route   GET /api/categories/popular
// @desc    获取热门分类
// @access  Public
router.get('/popular', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const categories = await Category.getPopularCategories(parseInt(limit));
        
        res.json({
            status: 'success',
            data: { categories }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取热门分类失败'
        });
    }
});

// @route   GET /api/categories/:id
// @desc    获取单个分类详情
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('parent', 'name icon')
            .populate('children', 'name icon');

        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: '分类不存在'
            });
        }

        // 获取该分类下的游戏
        const { page = 1, limit = 12 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const games = await Game.find({ 
            category: category._id, 
            status: 'active' 
        })
        .populate('category', 'name icon color')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Game.countDocuments({ 
            category: category._id, 
            status: 'active' 
        });

        res.json({
            status: 'success',
            data: {
                category,
                games,
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
            message: '获取分类详情失败'
        });
    }
});

// @route   POST /api/categories
// @desc    创建新分类（管理员）
// @access  Private/Admin
router.post('/', protect, authorize('admin'), [
    body('name')
        .notEmpty()
        .withMessage('分类名称不能为空')
        .isLength({ max: 50 })
        .withMessage('分类名称不能超过50个字符'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('分类描述不能超过500个字符'),
    body('icon')
        .notEmpty()
        .withMessage('分类图标不能为空'),
    body('color')
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage('请输入有效的颜色代码')
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

        const { name, description, icon, color, parent, order } = req.body;

        // 检查父分类是否存在
        if (parent) {
            const parentCategory = await Category.findById(parent);
            if (!parentCategory) {
                return res.status(400).json({
                    status: 'error',
                    message: '父分类不存在'
                });
            }
        }

        const category = await Category.create({
            name,
            description,
            icon,
            color,
            parent,
            order: order || 0
        });

        res.status(201).json({
            status: 'success',
            message: '分类创建成功',
            data: { category }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '创建分类失败'
        });
    }
});

// @route   PUT /api/categories/:id
// @desc    更新分类（管理员）
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), [
    body('name')
        .optional()
        .isLength({ max: 50 })
        .withMessage('分类名称不能超过50个字符'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('分类描述不能超过500个字符'),
    body('color')
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage('请输入有效的颜色代码')
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

        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: '分类不存在'
            });
        }

        // 更新分类
        Object.assign(category, req.body);
        await category.save();

        res.json({
            status: 'success',
            message: '分类更新成功',
            data: { category }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '更新分类失败'
        });
    }
});

// @route   DELETE /api/categories/:id
// @desc    删除分类（管理员）
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: '分类不存在'
            });
        }

        // 检查是否有游戏使用此分类
        const gameCount = await Game.countDocuments({ category: category._id });
        if (gameCount > 0) {
            return res.status(400).json({
                status: 'error',
                message: `无法删除分类，还有 ${gameCount} 个游戏使用此分类`
            });
        }

        // 检查是否有子分类
        const childCount = await Category.countDocuments({ parent: category._id });
        if (childCount > 0) {
            return res.status(400).json({
                status: 'error',
                message: `无法删除分类，还有 ${childCount} 个子分类`
            });
        }

        await Category.findByIdAndDelete(req.params.id);

        res.json({
            status: 'success',
            message: '分类删除成功'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '删除分类失败'
        });
    }
});

// @route   PUT /api/categories/:id/stats
// @desc    更新分类统计信息
// @access  Private/Admin
router.put('/:id/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: '分类不存在'
            });
        }

        await category.updateStats();

        res.json({
            status: 'success',
            message: '分类统计更新成功',
            data: { category }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '更新分类统计失败'
        });
    }
});

module.exports = router; 