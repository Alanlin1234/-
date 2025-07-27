const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: './config.env' });

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gameRoutes = require('./routes/games');
const reviewRoutes = require('./routes/reviews');
const categoryRoutes = require('./routes/categories');
const guideRoutes = require('./routes/guides');

// 导入中间件
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');

const app = express();

// 安全中间件
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:5000'],
    credentials: true
}));

// 速率限制
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX),
    message: {
        error: '请求过于频繁，请稍后再试'
    }
});
app.use('/api/', limiter);

// 日志中间件
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', auth, userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/guides', guideRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'GameHub API 运行正常',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// 错误处理中间件
app.use(errorHandler);

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: '请求的资源不存在'
    });
});

// 数据库连接
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB 连接成功');
})
.catch((err) => {
    console.error('❌ MongoDB 连接失败:', err.message);
    process.exit(1);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 GameHub API 服务器运行在端口 ${PORT}`);
    console.log(`📊 环境: ${process.env.NODE_ENV}`);
    console.log(`🔗 API地址: http://localhost:${PORT}/api`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，正在关闭服务器...');
    mongoose.connection.close(() => {
        console.log('MongoDB 连接已关闭');
        process.exit(0);
    });
});

module.exports = app; 