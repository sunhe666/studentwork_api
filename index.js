const express = require('express');
const app = express();
const port = 3000;

// 测试路由
const testRouter = require('./test_api');
app.use(testRouter);

app.use(express.json());
// 允许所有域名跨域（生产环境建议指定具体域名）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})
// 路由模块
const adminRouter = require('./router/admin');
app.use(adminRouter);
const uploadRouter = require('./router/upload');
app.use(uploadRouter);
const bannerRouter = require('./router/banner');
app.use(bannerRouter);
const contentRouter = require('./router/content');
const categoryRouter = require('./router/category');
const commentRouter = require('./router/comment');
const userRouter = require('./router/user');
const announcementRouter = require('./router/announcement');
const thesisRouter = require('./router/thesis');
const aiRouter = require('./router/ai');
const cooperationRouter = require('./router/cooperation');
const employeeRouter = require('./router/employee');
const roleRouter = require('./router/role');
const menuRouter = require('./router/menu');
const logRouter = require('./router/log');
const dashboardRouter = require('./router/dashboard');
const recruitmentRouter = require('./router/recruitment');

app.use(contentRouter);
app.use('/ai', aiRouter);
app.use('/cooperation', cooperationRouter);
app.use('/employee', employeeRouter);
app.use('/role', roleRouter);
app.use('/menu', menuRouter);
app.use(logRouter);
app.use(dashboardRouter);
app.use('/recruitment', recruitmentRouter);

app.use('/category', categoryRouter);
app.use('/comment', commentRouter);
app.use('/user', userRouter);
app.use('/announcement', announcementRouter);
app.use('/thesis', thesisRouter);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});