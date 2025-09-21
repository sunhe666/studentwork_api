// 导入express
const express = require('express');
// 创建路由对象
const router = express.Router();
// 导入论文处理函数
const thesisHandle = require('../router_handle/thesis');

// 获取论文列表
router.get('/list', thesisHandle.getList);

// 获取论文详情
router.get('/:id', thesisHandle.getDetail);

// 添加论文
router.post('/add', thesisHandle.add);

// 更新论文
router.put('/edit/:id', thesisHandle.update);

// 删除论文
router.delete('/delete/:id', thesisHandle.delete);

// 增加论文阅读量
router.put('/view/:id', thesisHandle.increaseViews);

// 点赞论文
router.put('/like/:id', thesisHandle.like);

// 取消点赞
router.put('/unlike/:id', thesisHandle.unlike);

// 检查是否点赞
router.post('/check-like/:id', thesisHandle.checkLike);

// 收藏论文
router.put('/favorite/:id', thesisHandle.favorite);

// 取消收藏
router.put('/unfavorite/:id', thesisHandle.unfavorite);

// 检查是否收藏
router.post('/check-favorite/:id', thesisHandle.checkFavorite);

// 获取用户收藏列表
router.get('/favorites/:user_id', thesisHandle.getUserFavorites);

// 导出路由
module.exports = router;