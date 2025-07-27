const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, '用户名是必需的'],
        unique: true,
        trim: true,
        minlength: [3, '用户名至少需要3个字符'],
        maxlength: [20, '用户名不能超过20个字符']
    },
    email: {
        type: String,
        required: [true, '邮箱是必需的'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
    },
    password: {
        type: String,
        required: [true, '密码是必需的'],
        minlength: [6, '密码至少需要6个字符'],
        select: false
    },
    avatar: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: {
        type: Date,
        default: Date.now
    },
    preferences: {
        favoriteCategories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        }],
        language: {
            type: String,
            default: 'zh-CN'
        },
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light'
        }
    },
    stats: {
        gamesPlayed: {
            type: Number,
            default: 0
        },
        totalPlayTime: {
            type: Number,
            default: 0
        },
        reviewsPosted: {
            type: Number,
            default: 0
        },
        achievements: [{
            type: String
        }]
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 虚拟字段：用户等级
userSchema.virtual('level').get(function() {
    const totalPoints = this.stats.gamesPlayed * 10 + this.stats.totalPlayTime * 0.1 + this.stats.reviewsPosted * 5;
    return Math.floor(totalPoints / 100) + 1;
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS));
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 验证密码方法
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// 生成JWT令牌
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// 生成验证令牌
userSchema.methods.getVerificationToken = function() {
    const verificationToken = crypto.randomBytes(20).toString('hex');
    this.verificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
    return verificationToken;
};

// 生成密码重置令牌
userSchema.methods.getResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10分钟
    return resetToken;
};

// 更新最后登录时间
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = Date.now();
    return this.save();
};

// 增加游戏统计
userSchema.methods.incrementGameStats = function(playTime = 0) {
    this.stats.gamesPlayed += 1;
    this.stats.totalPlayTime += playTime;
    return this.save();
};

// 增加评论统计
userSchema.methods.incrementReviewStats = function() {
    this.stats.reviewsPosted += 1;
    return this.save();
};

// 添加成就
userSchema.methods.addAchievement = function(achievement) {
    if (!this.stats.achievements.includes(achievement)) {
        this.stats.achievements.push(achievement);
        return this.save();
    }
    return Promise.resolve(this);
};

module.exports = mongoose.model('User', userSchema); 