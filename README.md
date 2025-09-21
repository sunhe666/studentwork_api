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

导入提供的SQL文件：
- `biyeshejiXM (3).sql` - 主数据库结构
- `recruitment.sql` - 招聘相关表
- `log.sql` - 日志表

## 环境配置

创建 `.env` 文件并配置数据库连接和其他环境变量。

## 部署

本项目已配置Vercel部署，推送到GitHub后可直接在Vercel中导入部署。

## 环境要求

- Node.js >= 16
- MySQL >= 8.0
