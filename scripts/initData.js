const mongoose = require('mongoose');
const User = require('../models/User');
const Game = require('../models/Game');
const Category = require('../models/Category');
require('dotenv').config({ path: './config.env' });

// 连接数据库
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// 分类数据
const categories = [
    {
        name: '动作冒险',
        description: '充满刺激和挑战的动作冒险游戏',
        icon: 'fas fa-gamepad',
        color: '#FF6B6B',
        order: 1
    },
    {
        name: '益智解谜',
        description: '考验智力和逻辑思维的益智游戏',
        icon: 'fas fa-puzzle-piece',
        color: '#4ECDC4',
        order: 2
    },
    {
        name: '策略游戏',
        description: '需要战略思考和规划的策略游戏',
        icon: 'fas fa-chess',
        color: '#45B7D1',
        order: 3
    },
    {
        name: '休闲娱乐',
        description: '轻松愉快的休闲娱乐游戏',
        icon: 'fas fa-smile',
        color: '#96CEB4',
        order: 4
    },
    {
        name: '射击游戏',
        description: '紧张刺激的射击类游戏',
        icon: 'fas fa-crosshairs',
        color: '#FF8C42',
        order: 5
    },
    {
        name: '赛车竞速',
        description: '速度与激情的赛车游戏',
        icon: 'fas fa-car',
        color: '#FFD93D',
        order: 6
    },
    {
        name: '角色扮演',
        description: '沉浸式的角色扮演游戏',
        icon: 'fas fa-user-ninja',
        color: '#6C5CE7',
        order: 7
    },
    {
        name: '体育竞技',
        description: '各种体育竞技类游戏',
        icon: 'fas fa-futbol',
        color: '#00B894',
        order: 8
    }
];

// 游戏数据
const games = [
    // 原创游戏
    {
        title: 'Poor Bunny',
        description: '经典平台跳跃游戏，控制小兔子收集胡萝卜并避开障碍物。',
        shortDescription: '可爱的兔子冒险之旅',
        category: '动作冒险',
        tags: ['平台跳跃', '冒险', '可爱'],
        gameUrl: 'https://example.com/poor-bunny',
        thumbnail: 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Poor+Bunny',
        difficulty: 'medium',
        isFeatured: true,
        isNew: false,
        isExternal: false,
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '移动', key: '方向键', description: '控制兔子左右移动' },
                { action: '跳跃', key: '空格键', description: '跳跃避开障碍物' },
                { action: '重新开始', key: 'R键', description: '重新开始游戏' }
            ],
            tips: [
                '利用跳跃来避开障碍物',
                '注意观察敌人的移动模式',
                '收集胡萝卜可以增加分数'
            ],
            objectives: [
                '收集所有胡萝卜',
                '避开尖刺和敌人',
                '到达终点'
            ]
        }
    },
    {
        title: 'Color Match',
        description: '考验反应速度的益智游戏，快速匹配相同颜色的方块。',
        shortDescription: '快速匹配颜色方块',
        category: '益智解谜',
        tags: ['益智', '反应', '颜色'],
        gameUrl: 'https://example.com/color-match',
        thumbnail: 'https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=Color+Match',
        difficulty: 'easy',
        isFeatured: false,
        isNew: true,
        isExternal: false,
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '选择', key: '鼠标点击', description: '点击相同颜色的方块' },
                { action: '重置', key: 'R键', description: '重新开始游戏' }
            ],
            tips: [
                '快速识别相同颜色',
                '注意时间限制',
                '连续匹配可以获得更高分数'
            ],
            objectives: [
                '匹配所有相同颜色的方块',
                '在限定时间内完成',
                '获得最高分数'
            ]
        }
    },
    {
        title: 'Snake Classic',
        description: '经典贪吃蛇游戏，控制蛇吃食物成长，避免撞到自己。',
        shortDescription: '经典贪吃蛇游戏',
        category: '休闲娱乐',
        tags: ['经典', '贪吃蛇', '休闲'],
        gameUrl: 'https://example.com/snake-classic',
        thumbnail: 'https://via.placeholder.com/300x200/96CEB4/FFFFFF?text=Snake+Classic',
        difficulty: 'medium',
        isFeatured: false,
        isNew: false,
        isExternal: false,
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '移动', key: '方向键', description: '控制蛇的移动方向' },
                { action: '暂停', key: '空格键', description: '暂停/继续游戏' }
            ],
            tips: [
                '避免撞到自己的身体',
                '在边缘区域要特别小心',
                '长蛇更容易撞到自己'
            ],
            objectives: [
                '吃食物让蛇变长',
                '避免撞到自己',
                '获得最高分数'
            ]
        }
    },
    {
        title: 'Memory Cards',
        description: '记忆翻牌游戏，考验记忆力和观察力。',
        shortDescription: '考验记忆力的翻牌游戏',
        category: '益智解谜',
        tags: ['记忆', '益智', '翻牌'],
        gameUrl: 'https://example.com/memory-cards',
        thumbnail: 'https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=Memory+Cards',
        difficulty: 'easy',
        isFeatured: false,
        isNew: true,
        isExternal: false,
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '翻牌', key: '鼠标点击', description: '点击卡片翻开' },
                { action: '重置', key: 'R键', description: '重新开始游戏' }
            ],
            tips: [
                '记住每张卡片的位置',
                '先翻开所有卡片熟悉布局',
                '注意时间限制'
            ],
            objectives: [
                '找到所有相同的卡片对',
                '在限定时间内完成',
                '使用最少的步数'
            ]
        }
    },
    {
        title: 'Bubble Shooter',
        description: '经典泡泡射击游戏，射击相同颜色的泡泡使其消除。',
        shortDescription: '射击泡泡消除游戏',
        category: '休闲娱乐',
        tags: ['射击', '泡泡', '消除'],
        gameUrl: 'https://example.com/bubble-shooter',
        thumbnail: 'https://via.placeholder.com/300x200/96CEB4/FFFFFF?text=Bubble+Shooter',
        difficulty: 'medium',
        isFeatured: false,
        isNew: false,
        isExternal: false,
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '瞄准', key: '鼠标移动', description: '移动鼠标瞄准' },
                { action: '射击', key: '鼠标点击', description: '点击射击泡泡' }
            ],
            tips: [
                '瞄准相同颜色的泡泡',
                '利用墙壁反弹',
                '消除大量泡泡可以获得连击奖励'
            ],
            objectives: [
                '射击相同颜色的泡泡',
                '消除所有泡泡',
                '获得最高分数'
            ]
        }
    },
    {
        title: '2048',
        description: '经典数字益智游戏，通过滑动合并相同数字，达到2048。',
        shortDescription: '数字合并益智游戏',
        category: '益智解谜',
        tags: ['数字', '益智', '合并'],
        gameUrl: 'https://example.com/2048',
        thumbnail: 'https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=2048',
        difficulty: 'hard',
        isFeatured: true,
        isNew: false,
        isExternal: false,
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '移动', key: '方向键', description: '滑动数字方块' },
                { action: '重置', key: 'R键', description: '重新开始游戏' }
            ],
            tips: [
                '保持大数字在角落',
                '避免小数字分散',
                '规划移动路径'
            ],
            objectives: [
                '合并相同数字',
                '达到2048',
                '获得更高分数'
            ]
        }
    },
    
    // iframe嵌入游戏
    {
        title: 'Tetris',
        description: '经典俄罗斯方块游戏，旋转和移动方块填满水平行。',
        shortDescription: '经典俄罗斯方块',
        category: '益智解谜',
        tags: ['俄罗斯方块', '经典', '益智'],
        gameUrl: 'https://tetris.com/play-tetris',
        thumbnail: 'https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=Tetris',
        difficulty: 'hard',
        isFeatured: true,
        isNew: false,
        isExternal: true,
        externalUrl: 'https://tetris.com/play-tetris',
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '移动', key: '方向键左右', description: '左右移动方块' },
                { action: '加速下落', key: '方向键下', description: '加速方块下落' },
                { action: '旋转', key: '方向键上', description: '旋转方块' },
                { action: '直接下落', key: '空格键', description: '方块直接落到底部' }
            ],
            tips: [
                '提前规划方块放置位置',
                '避免在场地中留下空隙',
                '利用旋转来适应不同空间'
            ],
            objectives: [
                '填满水平行消除',
                '避免方块堆到顶部',
                '获得更高分数'
            ]
        }
    },
    {
        title: 'Slither.io',
        description: '多人在线蛇类游戏，控制蛇吃食物成长，与其他玩家竞争。',
        shortDescription: '多人在线蛇类游戏',
        category: '休闲娱乐',
        tags: ['多人', '蛇类', '在线'],
        gameUrl: 'https://slither.io',
        thumbnail: 'https://via.placeholder.com/300x200/96CEB4/FFFFFF?text=Slither.io',
        difficulty: 'easy',
        isFeatured: false,
        isNew: false,
        isExternal: true,
        externalUrl: 'https://slither.io',
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '移动', key: '鼠标移动', description: '控制蛇的移动方向' },
                { action: '加速', key: '左键点击', description: '加速移动' },
                { action: '释放光点', key: '右键点击', description: '释放光点' }
            ],
            tips: [
                '开始时远离其他玩家',
                '利用加速来逃脱危险',
                '在边缘区域寻找食物'
            ],
            objectives: [
                '吃食物让蛇变长',
                '避免撞到其他蛇',
                '成为最长的蛇'
            ]
        }
    },
    {
        title: 'Agar.io',
        description: '经典细胞吞噬游戏，控制细胞吃小球成长，吞噬其他玩家。',
        shortDescription: '细胞吞噬游戏',
        category: '休闲娱乐',
        tags: ['细胞', '吞噬', '多人'],
        gameUrl: 'https://agar.io',
        thumbnail: 'https://via.placeholder.com/300x200/96CEB4/FFFFFF?text=Agar.io',
        difficulty: 'medium',
        isFeatured: false,
        isNew: false,
        isExternal: true,
        externalUrl: 'https://agar.io',
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '移动', key: '鼠标移动', description: '控制细胞移动' },
                { action: '分裂', key: '空格键', description: '分裂细胞' },
                { action: '喷射', key: 'W键', description: '喷射质量' }
            ],
            tips: [
                '吃小球快速成长',
                '分裂可以快速移动',
                '注意避免被大细胞吞噬'
            ],
            objectives: [
                '吃小球成长',
                '吞噬其他玩家',
                '成为最大的细胞'
            ]
        }
    },
    {
        title: 'Diep.io',
        description: '坦克射击游戏，升级坦克属性，与其他玩家战斗。',
        shortDescription: '坦克射击游戏',
        category: '射击游戏',
        tags: ['坦克', '射击', '升级'],
        gameUrl: 'https://diep.io',
        thumbnail: 'https://via.placeholder.com/300x200/FF8C42/FFFFFF?text=Diep.io',
        difficulty: 'medium',
        isFeatured: false,
        isNew: false,
        isExternal: true,
        externalUrl: 'https://diep.io',
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '移动', key: 'WASD', description: '控制坦克移动' },
                { action: '射击', key: '鼠标点击', description: '发射子弹' },
                { action: '升级', key: '数字键', description: '升级不同属性' }
            ],
            tips: [
                '合理分配升级点数',
                '利用地形躲避攻击',
                '团队合作更容易获胜'
            ],
            objectives: [
                '升级坦克属性',
                '击败其他玩家',
                '生存到最后'
            ]
        }
    },
    {
        title: 'Krunker.io',
        description: '3D第一人称射击游戏，多种武器和模式选择。',
        shortDescription: '3D射击游戏',
        category: '射击游戏',
        tags: ['3D', '射击', '多人'],
        gameUrl: 'https://krunker.io',
        thumbnail: 'https://via.placeholder.com/300x200/FF8C42/FFFFFF?text=Krunker.io',
        difficulty: 'hard',
        isFeatured: false,
        isNew: false,
        isExternal: true,
        externalUrl: 'https://krunker.io',
        features: {
            mobileFriendly: false,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '移动', key: 'WASD', description: '角色移动' },
                { action: '瞄准', key: '鼠标移动', description: '瞄准敌人' },
                { action: '射击', key: '鼠标左键', description: '射击' },
                { action: '跳跃', key: '空格键', description: '跳跃' }
            ],
            tips: [
                '熟悉地图布局',
                '利用掩体躲避攻击',
                '选择适合的武器'
            ],
            objectives: [
                '击败敌人',
                '占领目标点',
                '获得最高分数'
            ]
        }
    },
    {
        title: 'Surviv.io',
        description: '2D生存射击游戏，收集武器和装备，成为最后的幸存者。',
        shortDescription: '2D生存射击游戏',
        category: '射击游戏',
        tags: ['生存', '射击', '2D'],
        gameUrl: 'https://surviv.io',
        thumbnail: 'https://via.placeholder.com/300x200/FF8C42/FFFFFF?text=Surviv.io',
        difficulty: 'hard',
        isFeatured: false,
        isNew: false,
        isExternal: true,
        externalUrl: 'https://surviv.io',
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '移动', key: 'WASD', description: '角色移动' },
                { action: '瞄准', key: '鼠标移动', description: '瞄准敌人' },
                { action: '射击', key: '鼠标左键', description: '射击' },
                { action: '拾取', key: 'E键', description: '拾取物品' }
            ],
            tips: [
                '快速收集武器和装备',
                '注意安全区域缩小',
                '利用地形优势'
            ],
            objectives: [
                '收集武器和装备',
                '击败其他玩家',
                '成为最后的幸存者'
            ]
        }
    },
    {
        title: 'Racing Games',
        description: '经典赛车游戏，体验速度与激情的竞速乐趣。',
        shortDescription: '经典赛车游戏',
        category: '赛车竞速',
        tags: ['赛车', '竞速', '经典'],
        gameUrl: 'https://example.com/racing-games',
        thumbnail: 'https://via.placeholder.com/300x200/FFD93D/FFFFFF?text=Racing+Games',
        difficulty: 'medium',
        isFeatured: false,
        isNew: false,
        isExternal: true,
        externalUrl: 'https://example.com/racing-games',
        features: {
            mobileFriendly: true,
            fullscreen: true,
            sound: true
        },
        instructions: {
            controls: [
                { action: '加速', key: '上方向键', description: '加速前进' },
                { action: '刹车', key: '下方向键', description: '刹车减速' },
                { action: '转向', key: '左右方向键', description: '左右转向' }
            ],
            tips: [
                '掌握最佳过弯时机',
                '利用氮气加速',
                '注意赛道障碍物'
            ],
            objectives: [
                '完成比赛',
                '获得最快时间',
                '解锁更多车辆'
            ]
        }
    }
];

// 初始化数据
async function initData() {
    try {
        console.log('开始初始化数据...');

        // 清空现有数据
        await Category.deleteMany({});
        await Game.deleteMany({});

        // 创建分类
        console.log('创建分类...');
        const createdCategories = await Category.insertMany(categories);
        console.log(`已创建 ${createdCategories.length} 个分类`);

        // 创建游戏
        console.log('创建游戏...');
        for (const gameData of games) {
            // 查找对应的分类
            const category = createdCategories.find(cat => cat.name === gameData.category);
            if (!category) {
                console.log(`未找到分类: ${gameData.category}`);
                continue;
            }

            // 创建游戏
            const game = new Game({
                ...gameData,
                category: category._id
            });
            await game.save();
            console.log(`已创建游戏: ${gameData.title}`);
        }

        console.log('数据初始化完成！');
        process.exit(0);
    } catch (error) {
        console.error('数据初始化失败:', error);
        process.exit(1);
    }
}

// 运行初始化
initData(); 