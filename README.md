# 毕业设计项目 - API后端

基于Express.js + MySQL构建的毕业设计项目后端API服务。

## 功能特性

- 用户认证与授权
- 论文管理系统
- 公告管理
- 员工管理
- 招聘管理
- 合作申请管理
- 文件上传与处理
- 阿里云OSS集成
- JWT身份验证
- 日志记录系统

## 技术栈

- Node.js
- Express.js
- MySQL2
- JWT (jsonwebtoken)
- bcryptjs (密码加密)
- multer (文件上传)
- Ali-OSS (阿里云对象存储)
- archiver (文件压缩)

## API模块

- `/admin` - 管理员相关接口
- `/user` - 用户管理
- `/thesis` - 论文管理
- `/announcement` - 公告管理
- `/employee` - 员工管理
- `/recruitment` - 招聘管理
- `/cooperation` - 合作申请
- `/upload` - 文件上传
- `/ai` - AI相关功能

## 开发环境设置

```bash
# 安装依赖
npm install

# 启动开发服务器（使用nodemon）
npm run dev

# 启动生产服务器
npm start
```

## 数据库配置

### 1. 导入SQL文件到你的MySQL数据库：
- `biyeshejiXM (3).sql` - 主数据库结构
- `recruitment.sql` - 招聘相关表
- `log.sql` - 日志表
- `m.sql` - 其他表结构

### 2. 腾讯云MySQL数据库配置：
本项目已支持腾讯云CynosDB MySQL数据库。

## 环境配置

创建 `.env` 文件并配置环境变量：

### 方式一：使用DATABASE_URL（推荐）
```env
# 腾讯云MySQL连接字符串
DATABASE_URL=mysql://username:password@host:port/database

# 其他配置
OSS_REGION=oss-cn-beijing
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=your_bucket_name
JWT_SECRET=your_jwt_secret_key
PORT=3000
NODE_ENV=production
```

### 方式二：分别配置数据库参数
```env
DB_HOST=your_host
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
```

参考 `env.example` 文件获取完整的环境变量配置示例。

## 部署

### Vercel部署步骤：

1. 推送代码到GitHub
2. 在Vercel中导入GitHub仓库
3. 在Vercel项目设置中配置环境变量：
   - `DATABASE_URL`: 你的腾讯云MySQL连接字符串
   - `OSS_ACCESS_KEY_ID`: 阿里云OSS访问密钥ID
   - `OSS_ACCESS_KEY_SECRET`: 阿里云OSS访问密钥Secret
   - `OSS_BUCKET`: OSS存储桶名称
   - `JWT_SECRET`: JWT密钥
4. 部署完成

本项目已配置`vercel.json`文件，支持自动部署。

## 环境要求

- Node.js >= 16
- MySQL >= 8.0
