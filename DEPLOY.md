# GameHub 部署指南

## 🚀 快速部署

### 1. 本地开发环境

```bash
# 克隆项目
git clone <repository-url>
cd gamehub

# 安装依赖
npm install

# 配置环境变量
cp config.env.example config.env
# 编辑 config.env 文件

# 启动MongoDB
# Windows: net start MongoDB
# macOS/Linux: sudo systemctl start mongod

# 初始化数据
npm run init-data

# 启动开发服务器
npm run dev
```

### 2. 生产环境部署

#### 使用Docker部署

```bash
# 创建Dockerfile
cat > Dockerfile << EOF
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF

# 创建docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/gamehub
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
EOF

# 启动服务
docker-compose up -d
```

#### 使用PM2部署

```bash
# 安装PM2
npm install -g pm2

# 创建ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'gamehub',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# 启动应用
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save
pm2 startup
```

#### 使用Nginx反向代理

```nginx
# /etc/nginx/sites-available/gamehub
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 云服务器部署

#### 阿里云ECS

```bash
# 连接服务器
ssh root@your-server-ip

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# 部署应用
git clone <repository-url>
cd gamehub
npm install
npm run init-data
npm start
```

#### 腾讯云CVM

```bash
# 类似阿里云部署步骤
# 注意配置安全组开放3000端口
```

### 4. 容器化部署

#### Kubernetes部署

```yaml
# gamehub-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gamehub
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gamehub
  template:
    metadata:
      labels:
        app: gamehub
    spec:
      containers:
      - name: gamehub
        image: your-registry/gamehub:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          value: "mongodb://mongo:27017/gamehub"
---
apiVersion: v1
kind: Service
metadata:
  name: gamehub-service
spec:
  selector:
    app: gamehub
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 🔧 环境配置

### 生产环境变量

```env
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
MONGODB_URI=mongodb://username:password@host:port/gamehub

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### SSL证书配置

```bash
# 使用Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📊 监控和维护

### 日志管理

```bash
# 查看应用日志
pm2 logs gamehub

# 查看错误日志
pm2 logs gamehub --err

# 查看MongoDB日志
sudo tail -f /var/log/mongodb/mongod.log
```

### 数据库备份

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb"
mkdir -p $BACKUP_DIR
mongodump --db gamehub --out $BACKUP_DIR/gamehub_$DATE
tar -czf $BACKUP_DIR/gamehub_$DATE.tar.gz $BACKUP_DIR/gamehub_$DATE
rm -rf $BACKUP_DIR/gamehub_$DATE
echo "Backup completed: gamehub_$DATE.tar.gz"
EOF

chmod +x backup.sh

# 添加到crontab
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### 性能监控

```bash
# 安装监控工具
npm install -g clinic

# 性能分析
clinic doctor -- node server.js
clinic flame -- node server.js
clinic heap -- node server.js
```

## 🔒 安全配置

### 防火墙设置

```bash
# Ubuntu/Debian
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### MongoDB安全配置

```bash
# 创建管理员用户
mongo
use admin
db.createUser({
  user: "admin",
  pwd: "secure-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

# 启用认证
sudo nano /etc/mongod.conf
# 添加以下配置：
# security:
#   authorization: enabled

sudo systemctl restart mongod
```

## 🚨 故障排除

### 常见问题

1. **端口被占用**
```bash
# 查看端口占用
sudo netstat -tlnp | grep :3000
# 杀死进程
sudo kill -9 <PID>
```

2. **MongoDB连接失败**
```bash
# 检查MongoDB状态
sudo systemctl status mongod
# 重启MongoDB
sudo systemctl restart mongod
```

3. **内存不足**
```bash
# 查看内存使用
free -h
# 增加swap空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 性能优化

1. **启用Gzip压缩**
```javascript
// 在server.js中添加
const compression = require('compression');
app.use(compression());
```

2. **启用缓存**
```javascript
// 添加缓存中间件
app.use(express.static('public', { maxAge: '1d' }));
```

3. **数据库索引优化**
```javascript
// 在模型中添加索引
gameSchema.index({ title: 'text', description: 'text' });
```

## 📞 技术支持

如遇到部署问题，请：

1. 查看日志文件
2. 检查环境变量配置
3. 确认数据库连接
4. 验证网络端口
5. 联系技术支持

---

**注意**: 生产环境部署前请务必：
- 修改默认密码
- 配置SSL证书
- 设置防火墙规则
- 定期备份数据
- 监控系统资源 