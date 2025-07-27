const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 游戏指南数据
const guides = [
    {
        id: 'poor-bunny',
        title: 'Poor Bunny 游戏指南',
        game: 'Poor Bunny',
        difficulty: 'medium',
        content: `
            <h2>游戏介绍</h2>
            <p>Poor Bunny 是一款经典的平台跳跃游戏，玩家需要控制小兔子收集胡萝卜并避开障碍物。</p>
            
            <h2>操作说明</h2>
            <ul>
                <li><strong>方向键</strong>：控制兔子移动</li>
                <li><strong>空格键</strong>：跳跃</li>
                <li><strong>R键</strong>：重新开始</li>
            </ul>
            
            <h2>游戏目标</h2>
            <ul>
                <li>收集所有胡萝卜</li>
                <li>避开尖刺和敌人</li>
                <li>到达终点</li>
            </ul>
            
            <h2>技巧提示</h2>
            <div class="tip">
                <p><strong>💡 小贴士：</strong></p>
                <ul>
                    <li>利用跳跃来避开障碍物</li>
                    <li>注意观察敌人的移动模式</li>
                    <li>收集胡萝卜可以增加分数</li>
                </ul>
            </div>
        `
    },
    {
        id: 'tetris',
        title: '俄罗斯方块游戏指南',
        game: 'Tetris',
        difficulty: 'hard',
        content: `
            <h2>游戏介绍</h2>
            <p>俄罗斯方块是一款经典的益智游戏，玩家需要旋转和移动不同形状的方块，使其填满水平行。</p>
            
            <h2>操作说明</h2>
            <ul>
                <li><strong>方向键左右</strong>：移动方块</li>
                <li><strong>方向键下</strong>：加速下落</li>
                <li><strong>方向键上</strong>：旋转方块</li>
                <li><strong>空格键</strong>：直接下落</li>
            </ul>
            
            <h2>游戏规则</h2>
            <ul>
                <li>方块从顶部出现，向下移动</li>
                <li>玩家可以旋转和移动方块</li>
                <li>当一行被完全填满时，该行会消失</li>
                <li>游戏结束条件是方块堆到顶部</li>
            </ul>
            
            <h2>高级技巧</h2>
            <div class="warning">
                <p><strong>⚠️ 注意事项：</strong></p>
                <ul>
                    <li>提前规划方块的放置位置</li>
                    <li>避免在场地中留下空隙</li>
                    <li>利用旋转来适应不同的空间</li>
                </ul>
            </div>
        `
    },
    {
        id: 'slither-io',
        title: 'Slither.io 游戏指南',
        game: 'Slither.io',
        difficulty: 'easy',
        content: `
            <h2>游戏介绍</h2>
            <p>Slither.io 是一款多人在线蛇类游戏，玩家控制一条蛇在场地中移动，吃食物成长，并与其他玩家竞争。</p>
            
            <h2>操作说明</h2>
            <ul>
                <li><strong>鼠标移动</strong>：控制蛇的移动方向</li>
                <li><strong>左键点击</strong>：加速移动</li>
                <li><strong>右键点击</strong>：释放光点</li>
            </ul>
            
            <h2>游戏目标</h2>
            <ul>
                <li>吃食物让蛇变长</li>
                <li>避免撞到其他蛇</li>
                <li>成为最长的蛇</li>
            </ul>
            
            <h2>策略建议</h2>
            <div class="tip">
                <p><strong>💡 小贴士：</strong></p>
                <ul>
                    <li>开始时远离其他玩家</li>
                    <li>利用加速来逃脱危险</li>
                    <li>在边缘区域寻找食物</li>
                </ul>
            </div>
        `
    }
];

// @route   GET /api/guides
// @desc    获取所有游戏指南
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { game, difficulty } = req.query;
        
        let filteredGuides = guides;
        
        if (game) {
            filteredGuides = filteredGuides.filter(guide => 
                guide.game.toLowerCase().includes(game.toLowerCase())
            );
        }
        
        if (difficulty) {
            filteredGuides = filteredGuides.filter(guide => 
                guide.difficulty === difficulty
            );
        }

        res.json({
            status: 'success',
            data: { guides: filteredGuides }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取游戏指南失败'
        });
    }
});

// @route   GET /api/guides/:id
// @desc    获取单个游戏指南
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const guide = guides.find(g => g.id === req.params.id);
        
        if (!guide) {
            return res.status(404).json({
                status: 'error',
                message: '游戏指南不存在'
            });
        }

        res.json({
            status: 'success',
            data: { guide }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取游戏指南失败'
        });
    }
});

// @route   POST /api/guides
// @desc    创建游戏指南（管理员）
// @access  Private/Admin
router.post('/', protect, authorize('admin'), [
    body('title')
        .notEmpty()
        .withMessage('指南标题不能为空'),
    body('game')
        .notEmpty()
        .withMessage('游戏名称不能为空'),
    body('content')
        .notEmpty()
        .withMessage('指南内容不能为空'),
    body('difficulty')
        .isIn(['easy', 'medium', 'hard'])
        .withMessage('难度等级无效')
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

        const { title, game, content, difficulty } = req.body;
        
        const newGuide = {
            id: game.toLowerCase().replace(/\s+/g, '-'),
            title,
            game,
            difficulty,
            content
        };

        guides.push(newGuide);

        res.status(201).json({
            status: 'success',
            message: '游戏指南创建成功',
            data: { guide: newGuide }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '创建游戏指南失败'
        });
    }
});

module.exports = router; 