const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试数据
const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123456'
};

let authToken = '';

// 测试函数
async function testAPI() {
    console.log('🧪 开始测试 GameHub API...\n');

    try {
        // 1. 测试健康检查
        console.log('1. 测试健康检查...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ 健康检查通过:', healthResponse.data.message);

        // 2. 测试用户注册
        console.log('\n2. 测试用户注册...');
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
        console.log('✅ 用户注册成功:', registerResponse.data.message);

        // 3. 测试用户登录
        console.log('\n3. 测试用户登录...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        authToken = loginResponse.data.data.token;
        console.log('✅ 用户登录成功');

        // 4. 测试获取游戏列表
        console.log('\n4. 测试获取游戏列表...');
        const gamesResponse = await axios.get(`${BASE_URL}/games`);
        console.log(`✅ 获取游戏列表成功，共 ${gamesResponse.data.data.games.length} 个游戏`);

        // 5. 测试获取分类列表
        console.log('\n5. 测试获取分类列表...');
        const categoriesResponse = await axios.get(`${BASE_URL}/categories`);
        console.log(`✅ 获取分类列表成功，共 ${categoriesResponse.data.data.categories.length} 个分类`);

        // 6. 测试获取热门游戏
        console.log('\n6. 测试获取热门游戏...');
        const popularResponse = await axios.get(`${BASE_URL}/games/popular`);
        console.log(`✅ 获取热门游戏成功，共 ${popularResponse.data.data.games.length} 个游戏`);

        // 7. 测试搜索游戏
        console.log('\n7. 测试搜索游戏...');
        const searchResponse = await axios.get(`${BASE_URL}/games/search?q=tetris`);
        console.log(`✅ 搜索游戏成功，找到 ${searchResponse.data.data.games.length} 个结果`);

        // 8. 测试获取用户信息
        console.log('\n8. 测试获取用户信息...');
        const userResponse = await axios.get(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ 获取用户信息成功:', userResponse.data.data.user.username);

        // 9. 测试获取游戏指南
        console.log('\n9. 测试获取游戏指南...');
        const guidesResponse = await axios.get(`${BASE_URL}/guides`);
        console.log(`✅ 获取游戏指南成功，共 ${guidesResponse.data.data.guides.length} 个指南`);

        console.log('\n🎉 所有API测试通过！');
        console.log('\n📊 测试总结:');
        console.log('- ✅ 健康检查');
        console.log('- ✅ 用户注册');
        console.log('- ✅ 用户登录');
        console.log('- ✅ 游戏列表');
        console.log('- ✅ 分类列表');
        console.log('- ✅ 热门游戏');
        console.log('- ✅ 游戏搜索');
        console.log('- ✅ 用户信息');
        console.log('- ✅ 游戏指南');

    } catch (error) {
        console.error('❌ API测试失败:', error.response?.data?.message || error.message);
        
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    }
}

// 检查服务器是否运行
async function checkServer() {
    try {
        await axios.get(`${BASE_URL}/health`);
        return true;
    } catch (error) {
        return false;
    }
}

// 主函数
async function main() {
    console.log('🔍 检查服务器状态...');
    
    const isRunning = await checkServer();
    if (!isRunning) {
        console.error('❌ 服务器未运行，请先启动服务器:');
        console.log('   npm run dev');
        console.log('   或者');
        console.log('   node start.js --dev');
        return;
    }

    console.log('✅ 服务器正在运行');
    await testAPI();
}

// 运行测试
main().catch(console.error); 