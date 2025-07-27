const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: [true, '游戏ID是必需的']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '用户ID是必需的']
    },
    rating: {
        type: Number,
        required: [true, '评分是必需的'],
        min: [1, '评分不能低于1'],
        max: [5, '评分不能高于5']
    },
    title: {
        type: String,
        trim: true,
        maxlength: [100, '评论标题不能超过100个字符']
    },
    content: {
        type: String,
        required: [true, '评论内容是必需的'],
        maxlength: [2000, '评论内容不能超过2000个字符']
    },
    pros: [{
        type: String,
        trim: true,
        maxlength: [100, '优点描述不能超过100个字符']
    }],
    cons: [{
        type: String,
        trim: true,
        maxlength: [100, '缺点描述不能超过100个字符']
    }],
    playTime: {
        type: Number,
        min: [0, '游戏时间不能为负数'],
        default: 0
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    helpful: {
        count: {
            type: Number,
            default: 0
        },
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    reports: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: {
            type: String,
            enum: ['spam', 'inappropriate', 'offensive', 'other'],
            required: true
        },
        description: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['active', 'hidden', 'deleted'],
        default: 'active'
    },
    tags: [{
        type: String,
        trim: true
    }],
    images: [{
        type: String
    }],
    reply: {
        content: String,
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 虚拟字段：评分等级
reviewSchema.virtual('ratingLevel').get(function() {
    if (this.rating >= 4.5) return 'excellent';
    if (this.rating >= 4.0) return 'very-good';
    if (this.rating >= 3.5) return 'good';
    if (this.rating >= 3.0) return 'fair';
    return 'poor';
});

// 虚拟字段：评论长度等级
reviewSchema.virtual('contentLength').get(function() {
    return this.content.length;
});

// 索引
reviewSchema.index({ game: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ 'helpful.count': -1 });
reviewSchema.index({ status: 1 });

// 中间件：保存评论后更新游戏评分
reviewSchema.post('save', async function() {
    if (this.status === 'active') {
        const Game = mongoose.model('Game');
        const game = await Game.findById(this.game);
        if (game) {
            await game.updateRating(this.rating);
        }
    }
});

// 中间件：删除评论后更新游戏评分
reviewSchema.post('findOneAndDelete', async function(doc) {
    if (doc && doc.status === 'active') {
        const Game = mongoose.model('Game');
        const game = await Game.findById(doc.game);
        if (game) {
            // 重新计算游戏评分
            const Review = mongoose.model('Review');
            const reviews = await Review.find({ 
                game: doc.game, 
                status: 'active' 
            });
            
            if (reviews.length > 0) {
                const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                game.rating.average = totalRating / reviews.length;
                game.rating.count = reviews.length;
                
                // 重新计算评分分布
                game.rating.distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
                reviews.forEach(review => {
                    game.rating.distribution[review.rating]++;
                });
                
                await game.save();
            }
        }
    }
});

// 标记评论为有用
reviewSchema.methods.markHelpful = function(userId) {
    if (!this.helpful.users.includes(userId)) {
        this.helpful.users.push(userId);
        this.helpful.count = this.helpful.users.length;
        return this.save();
    }
    return Promise.resolve(this);
};

// 取消标记评论为有用
reviewSchema.methods.unmarkHelpful = function(userId) {
    const index = this.helpful.users.indexOf(userId);
    if (index > -1) {
        this.helpful.users.splice(index, 1);
        this.helpful.count = this.helpful.users.length;
        return this.save();
    }
    return Promise.resolve(this);
};

// 举报评论
reviewSchema.methods.report = function(userId, reason, description = '') {
    const existingReport = this.reports.find(report => 
        report.user.toString() === userId.toString()
    );
    
    if (!existingReport) {
        this.reports.push({
            user: userId,
            reason,
            description
        });
        return this.save();
    }
    return Promise.resolve(this);
};

// 添加回复
reviewSchema.methods.addReply = function(userId, content) {
    this.reply = {
        content,
        user: userId,
        createdAt: Date.now()
    };
    return this.save();
};

// 静态方法：获取游戏评论
reviewSchema.statics.getGameReviews = function(gameId, options = {}) {
    const { 
        page = 1, 
        limit = 10, 
        sort = 'createdAt', 
        order = 'desc',
        rating = null,
        status = 'active'
    } = options;
    
    const query = { game: gameId, status };
    if (rating) query.rating = rating;
    
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;
    
    return this.find(query)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'username avatar')
        .populate('reply.user', 'username avatar');
};

// 静态方法：获取用户评论
reviewSchema.statics.getUserReviews = function(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    
    return this.find({ user: userId, status: 'active' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('game', 'title thumbnail category')
        .populate('game.category', 'name');
};

// 静态方法：获取热门评论
reviewSchema.statics.getPopularReviews = function(limit = 10) {
    return this.find({ status: 'active' })
        .sort({ 'helpful.count': -1, createdAt: -1 })
        .limit(limit)
        .populate('user', 'username avatar')
        .populate('game', 'title thumbnail');
};

module.exports = mongoose.model('Review', reviewSchema); 