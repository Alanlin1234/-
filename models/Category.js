const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, '分类名称是必需的'],
        unique: true,
        trim: true,
        maxlength: [50, '分类名称不能超过50个字符']
    },
    description: {
        type: String,
        maxlength: [500, '分类描述不能超过500个字符']
    },
    icon: {
        type: String,
        required: [true, '分类图标是必需的']
    },
    color: {
        type: String,
        default: '#8a2be2'
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    stats: {
        gameCount: {
            type: Number,
            default: 0
        },
        totalPlayCount: {
            type: Number,
            default: 0
        },
        averageRating: {
            type: Number,
            default: 0
        }
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

// 虚拟字段：完整路径
categorySchema.virtual('fullPath').get(function() {
    if (this.parent) {
        return `${this.parent.name} > ${this.name}`;
    }
    return this.name;
});

// 索引
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ isActive: 1 });

// 中间件：生成slug
categorySchema.pre('save', function(next) {
    if (!this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }
    next();
});

// 更新分类统计
categorySchema.methods.updateStats = async function() {
    const Game = mongoose.model('Game');
    
    const stats = await Game.aggregate([
        { $match: { category: this._id, status: 'active' } },
        {
            $group: {
                _id: null,
                gameCount: { $sum: 1 },
                totalPlayCount: { $sum: '$stats.playCount' },
                averageRating: { $avg: '$rating.average' }
            }
        }
    ]);
    
    if (stats.length > 0) {
        this.stats.gameCount = stats[0].gameCount;
        this.stats.totalPlayCount = stats[0].totalPlayCount;
        this.stats.averageRating = Math.round(stats[0].averageRating * 10) / 10;
    } else {
        this.stats.gameCount = 0;
        this.stats.totalPlayCount = 0;
        this.stats.averageRating = 0;
    }
    
    return this.save();
};

// 静态方法：获取所有活跃分类
categorySchema.statics.getActiveCategories = function() {
    return this.find({ isActive: true })
        .sort({ order: 1, name: 1 })
        .populate('parent', 'name');
};

// 静态方法：获取分类树
categorySchema.statics.getCategoryTree = function() {
    return this.find({ isActive: true })
        .sort({ order: 1, name: 1 })
        .populate({
            path: 'children',
            match: { isActive: true },
            options: { sort: { order: 1, name: 1 } }
        });
};

// 静态方法：获取热门分类
categorySchema.statics.getPopularCategories = function(limit = 10) {
    return this.find({ isActive: true })
        .sort({ 'stats.totalPlayCount': -1 })
        .limit(limit);
};

module.exports = mongoose.model('Category', categorySchema); 