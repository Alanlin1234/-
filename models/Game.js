const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, '游戏标题是必需的'],
        trim: true,
        maxlength: [100, '游戏标题不能超过100个字符']
    },
    description: {
        type: String,
        required: [true, '游戏描述是必需的'],
        maxlength: [1000, '游戏描述不能超过1000个字符']
    },
    shortDescription: {
        type: String,
        maxlength: [200, '简短描述不能超过200个字符']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, '游戏分类是必需的']
    },
    tags: [{
        type: String,
        trim: true
    }],
    gameUrl: {
        type: String,
        required: [true, '游戏URL是必需的'],
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+/.test(v);
            },
            message: '请输入有效的游戏URL'
        }
    },
    thumbnail: {
        type: String,
        default: ''
    },
    screenshots: [{
        type: String
    }],
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        },
        distribution: {
            '1': { type: Number, default: 0 },
            '2': { type: Number, default: 0 },
            '3': { type: Number, default: 0 },
            '4': { type: Number, default: 0 },
            '5': { type: Number, default: 0 }
        }
    },
    stats: {
        playCount: {
            type: Number,
            default: 0
        },
        totalPlayTime: {
            type: Number,
            default: 0
        },
        averagePlayTime: {
            type: Number,
            default: 0
        },
        favoriteCount: {
            type: Number,
            default: 0
        }
    },
    features: {
        multiplayer: {
            type: Boolean,
            default: false
        },
        mobileFriendly: {
            type: Boolean,
            default: true
        },
        fullscreen: {
            type: Boolean,
            default: true
        },
        sound: {
            type: Boolean,
            default: true
        },
        controller: {
            type: Boolean,
            default: false
        }
    },
    instructions: {
        controls: [{
            action: String,
            key: String,
            description: String
        }],
        tips: [String],
        objectives: [String]
    },
    requirements: {
        minAge: {
            type: Number,
            default: 0
        },
        browser: [String],
        plugins: [String]
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active'
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isNew: {
        type: Boolean,
        default: false
    },
    isExternal: {
        type: Boolean,
        default: false
    },
    externalUrl: String,
    developer: {
        name: String,
        website: String,
        contact: String
    },
    releaseDate: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    seo: {
        keywords: [String],
        metaDescription: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 虚拟字段：游戏评分等级
gameSchema.virtual('ratingLevel').get(function() {
    if (this.rating.average >= 4.5) return 'excellent';
    if (this.rating.average >= 4.0) return 'very-good';
    if (this.rating.average >= 3.5) return 'good';
    if (this.rating.average >= 3.0) return 'fair';
    return 'poor';
});

// 虚拟字段：游戏热度
gameSchema.virtual('popularity').get(function() {
    const playScore = this.stats.playCount * 0.4;
    const ratingScore = this.rating.average * this.rating.count * 0.3;
    const favoriteScore = this.stats.favoriteCount * 0.3;
    return playScore + ratingScore + favoriteScore;
});

// 索引
gameSchema.index({ title: 'text', description: 'text', tags: 'text' });
gameSchema.index({ category: 1, status: 1 });
gameSchema.index({ isFeatured: 1, status: 1 });
gameSchema.index({ 'rating.average': -1 });
gameSchema.index({ 'stats.playCount': -1 });

// 更新游戏统计
gameSchema.methods.updateStats = function(playTime = 0) {
    this.stats.playCount += 1;
    this.stats.totalPlayTime += playTime;
    this.stats.averagePlayTime = this.stats.totalPlayTime / this.stats.playCount;
    this.lastUpdated = Date.now();
    return this.save();
};

// 更新评分
gameSchema.methods.updateRating = function(newRating) {
    const oldRating = this.rating.average;
    const oldCount = this.rating.count;
    
    // 更新评分分布
    this.rating.distribution[newRating] += 1;
    
    // 计算新的平均评分
    const totalRating = Object.keys(this.rating.distribution).reduce((sum, rating) => {
        return sum + (parseInt(rating) * this.rating.distribution[rating]);
    }, 0);
    
    this.rating.average = totalRating / (this.rating.count + 1);
    this.rating.count += 1;
    
    return this.save();
};

// 增加收藏数
gameSchema.methods.incrementFavorites = function() {
    this.stats.favoriteCount += 1;
    return this.save();
};

// 减少收藏数
gameSchema.methods.decrementFavorites = function() {
    if (this.stats.favoriteCount > 0) {
        this.stats.favoriteCount -= 1;
    }
    return this.save();
};

// 静态方法：获取热门游戏
gameSchema.statics.getPopularGames = function(limit = 10) {
    return this.find({ status: 'active' })
        .sort({ 'stats.playCount': -1 })
        .limit(limit)
        .populate('category', 'name icon');
};

// 静态方法：获取推荐游戏
gameSchema.statics.getRecommendedGames = function(userId, limit = 10) {
    return this.find({ status: 'active' })
        .sort({ 'rating.average': -1, 'stats.playCount': -1 })
        .limit(limit)
        .populate('category', 'name icon');
};

// 静态方法：搜索游戏
gameSchema.statics.searchGames = function(query, options = {}) {
    const { category, difficulty, status = 'active', limit = 20, skip = 0 } = options;
    
    const searchQuery = {
        $text: { $search: query },
        status: status
    };
    
    if (category) searchQuery.category = category;
    if (difficulty) searchQuery.difficulty = difficulty;
    
    return this.find(searchQuery)
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name icon');
};

module.exports = mongoose.model('Game', gameSchema); 