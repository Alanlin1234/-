#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎮 GameHub 游戏站后端启动脚本');
console.log('================================');

// 检查配置文件
const configPath = path.join(__dirname, 'config.env');
if (!fs.existsSync(configPath)) {
    console.error('❌ 错误: 未找到 config.env 配置文件');
    console.log('请复制 config.env.example 为 config.env 并修改配置');
    process.exit(1);
}

// 检查package.json
const packagePath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packagePath)) {
    console.error('❌ 错误: 未找到 package.json 文件');
    process.exit(1);
}

// 检查node_modules
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 正在安装依赖...');
    const install = spawn('npm', ['install'], { stdio: 'inherit' });
    
    install.on('close', (code) => {
        if (code === 0) {
            console.log('✅ 依赖安装完成');
            startServer();
        } else {
            console.error('❌ 依赖安装失败');
            process.exit(1);
        }
    });
} else {
    startServer();
}

function startServer() {
    console.log('🚀 启动 GameHub 服务器...');
    
    // 检查是否为开发模式
    const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
    
    if (isDev) {
        console.log('🔧 开发模式启动');
        const dev = spawn('npm', ['run', 'dev'], { stdio: 'inherit' });
        
        dev.on('close', (code) => {
            console.log(`服务器已停止 (退出码: ${code})`);
        });
    } else {
        console.log('🏭 生产模式启动');
        const start = spawn('npm', ['start'], { stdio: 'inherit' });
        
        start.on('close', (code) => {
            console.log(`服务器已停止 (退出码: ${code})`);
        });
    }
}

// 处理进程退出
process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 正在关闭服务器...');
    process.exit(0);
}); 