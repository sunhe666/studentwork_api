// 导入数据库连接池
const db = require('../db');
// 导入日志工具
const { recordLog } = require('../utils/log');

// 封装日志记录函数，确保参数正确
const logOperation = (userId, username, operation, status, ip, detail, resourceId = null, resourceName = null) => {
  recordLog({
    user_id: userId,
    username: username || null,
    operation,
    resource_type: '论文',
    resource_id: resourceId,
    resource_name: resourceName,
    ip_address: ip,
    operation_detail: detail,
    status: status === '成功' ? 1 : 0,
    error_message: status === '失败' ? detail : null
  });
}

// 事务处理帮助函数
const withTransaction = (res, callback) => {
  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({
        message: '事务开始失败',
        error: err.message
      });
    }

    callback(
      () => db.commit((err) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({
              message: '事务提交失败',
              error: err.message
            });
          });
        }
      }),
      (errorMessage) => db.rollback(() => {
        res.status(500).json({
          message: errorMessage,
          error: err?.message || '未知错误'
        });
      })
    );
  });
};

// 获取论文列表
exports.getList = (req, res) => {
  try {
    console.log('开始处理thesis/list请求');
    console.log('环境变量DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');
    
    // 获取分页参数和查询条件
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const category_name = req.query.category_name || null;
    const title = req.query.title || null;
    const publisher = req.query.publisher || null;

    // 构建查询条件
    let whereClause = '';
    const params = [];

    if (category_name || title || publisher) {
      whereClause = 'WHERE ';
      const conditions = [];

      if (category_name) {
        conditions.push('category_name = ?');
        params.push(category_name);
      }

      if (title) {
        conditions.push('title LIKE ?');
        params.push(`%${title}%`);
      }

      if (publisher) {
        conditions.push('publisher LIKE ?');
        params.push(`%${publisher}%`);
      }

      whereClause += conditions.join(' AND ');
    }

    console.log('查询SQL:', `SELECT COUNT(*) AS total FROM thesis ${whereClause}`);
    console.log('查询参数:', params);

    // 查询论文总数
    const countSql = `SELECT COUNT(*) AS total FROM thesis ${whereClause}`;
    db.query(countSql, params, (err, countResult) => {
      if (err) {
        console.error('数据库查询错误:', err);
        return res.status(500).json({
          message: '数据库查询失败',
          error: err.message
        });
      }

      const total = countResult[0].total;
      console.log('查询到总数:', total);

      // 查询论文列表
      const listSql = `SELECT * FROM thesis ${whereClause} ORDER BY publish_time DESC LIMIT ? OFFSET ?`;
      console.log('列表查询SQL:', listSql);
      console.log('列表查询参数:', [...params, limit, offset]);
      
      db.query(listSql, [...params, limit, offset], (err, results) => {
        if (err) {
          console.error('数据库查询错误:', err);
          return res.status(500).json({
            message: '数据库查询失败',
            error: err.message
          });
        }

        console.log('查询结果数量:', results.length);
        res.json({
          total,
          list: results
        });
      });
    });
  } catch (error) {
    console.error('getList函数异常:', error);
    res.status(500).json({
      message: '服务器内部错误',
      error: error.message
    });
  }
};

// 获取论文详情
exports.getDetail = (req, res) => {
  const { id } = req.params;

  const sql = 'SELECT * FROM thesis WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: '数据库查询失败',
        error: err.message
      });
    }

    if (results.length === 0) {
        logOperation(userId, null, '获取论文详情', '失败', ip, `未找到该论文`, id);
        return res.status(404).json({
      message: '未找到该论文'
    });
    }

    res.json({
      message: '获取成功',
      data: results[0]
    });
  });
};

// 添加论文
exports.add = (req, res) => {
  const { thesis_file, publisher, title, category_name,create_by } = req.body;
  const userId = create_by || 999;
  const ip = req.ip;

  // 验证参数
    if (!thesis_file || !publisher || !title) {
      logOperation(userId, publisher, '添加论文', '失败', ip, `参数验证失败: 论文文件、发布人和标题不能为空`);
      return res.status(400).json({
        message: '论文文件、发布人和标题不能为空'
      });
  }

  // 插入论文
  const sql = 'INSERT INTO thesis (thesis_file, publisher, title, category_name) VALUES (?, ?, ?, ?)';
  db.query(sql, [thesis_file, publisher, title, category_name || null], (err, results) => {
      if (err) {
        logOperation(userId, publisher, '添加论文', '失败', ip, `数据库插入失败: ${err.message}`);
        return res.status(500).json({
          message: '数据库插入失败',
          error: err.message
        });
    }

    logOperation(userId, publisher, '添加论文', '成功', ip, `添加论文成功: 标题=${title}`, results.insertId, title);
    res.json({
      message: '添加成功',
      id: results.insertId
    });
  });
};

// 更新论文
exports.update = (req, res) => {
  const { id } = req.params;
  const { thesis_file, publisher, title, category_name,update_by,update_name } = req.body;
  const userId = update_by|| 999;
  const ip = req.ip;

  // 验证参数
  if (!thesis_file || !publisher || !title) {
    logOperation(userId, update_name, '更新论文', '失败', ip, `参数验证失败: 论文文件、发布人和标题不能为空`, id);
    return res.status(400).json({
      message: '论文文件、发布人和标题不能为空'
    });
  }

  // 先检查论文是否存在
  const checkSql = 'SELECT * FROM thesis WHERE id = ?';
  db.query(checkSql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: '数据库查询失败',
        error: err.message
      });
    }

    if (results.length === 0) {
      logOperation(userId, update_name, '更新论文', '失败', ip, `未找到该论文`, id);
      return res.status(404).json({
        message: '未找到该论文'
      });
    }

    // 更新论文
    const updateSql = 'UPDATE thesis SET thesis_file = ?, publisher = ?, title = ?, category_name = ? WHERE id = ?';
    db.query(updateSql, [thesis_file, publisher, title, category_name || null, id], (err) => {
        if (err) {
          logOperation(userId, update_name, '更新论文', '失败', ip, `数据库更新失败: ${err.message}`, id);
          return res.status(500).json({
            message: '数据库更新失败',
            error: err.message
          });
      }

      logOperation(userId, update_name, '更新论文', '成功', ip, `更新论文成功: 标题=${title}`, id, title);
    res.json({
      message: '更新成功'
    });
    });
  });
};

// 删除论文
exports.delete = (req, res) => {
  const { id } = req.params;
  const { delete_by, delete_name } = req.body;
  const userId = delete_by || req.user?.id || 999;
  const ip = req.ip;

  // 先检查论文是否存在
  const checkSql = 'SELECT * FROM thesis WHERE id = ?';
  db.query(checkSql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: '数据库查询失败',
        error: err.message
      });
    }

    if (results.length === 0) {
      logOperation(userId, delete_name, '删除论文', '失败', ip, `未找到该论文`, id);
      return res.status(404).json({
        message: '未找到该论文'
      });
    }

    // 删除论文
    const deleteSql = 'DELETE FROM thesis WHERE id = ?';
    db.query(deleteSql, [id], (err) => {
        if (err) {
          logOperation(userId, delete_name, '删除论文', '失败', ip, `数据库删除失败: ${err.message}`, id);
          return res.status(500).json({
            message: '数据库删除失败',
            error: err.message
          });
      }

      logOperation(userId, delete_name, '删除论文', '成功', ip, `删除论文成功`, id);
    res.json({
      message: '删除成功'
    });
    });
  });
};

// 增加论文阅读量
exports.increaseViews = (req, res) => {
  const { id } = req.params;

  const sql = 'UPDATE thesis SET views = views + 1 WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: '数据库更新失败',
        error: err.message
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        message: '未找到该论文'
      });
    }

    res.json({
      message: '阅读量更新成功'
    });
  });
};

// 点赞论文
exports.like = (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body; // 假设用户ID从请求体中获取

  if (!user_id) {
    return res.status(400).json({
      message: '用户ID不能为空'
    });
  }

  // 检查是否已点赞
  const checkSql = 'SELECT * FROM thesis_like WHERE thesis_id = ? AND user_id = ?';
  db.query(checkSql, [id, user_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: '数据库查询失败',
        error: err.message
      });
    }

    if (results.length > 0) {
      return res.status(400).json({
        message: '已经点赞过该论文'
      });
    }

    // 从连接池获取连接
    db.getConnection((err, connection) => {
      if (err) {
        return res.status(500).json({
          message: '获取数据库连接失败',
          error: err.message
        });
      }

      // 开始事务
      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return res.status(500).json({
            message: '事务开始失败',
            error: err.message
          });
        }

        // 记录点赞行为
        const insertLikeSql = 'INSERT INTO thesis_like (thesis_id, user_id) VALUES (?, ?)';
        connection.query(insertLikeSql, [id, user_id], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({
                message: '记录点赞行为失败',
                error: err.message
              });
            });
          }

          // 更新论文点赞数
          const updateSql = 'UPDATE thesis SET likes = likes + 1 WHERE id = ?';
          connection.query(updateSql, [id], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({
                  message: '更新点赞数失败',
                  error: err.message
                });
              });
            }

            // 提交事务
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({
                    message: '事务提交失败',
                    error: err.message
                  });
                });
              }

              connection.release();
              res.json({
                message: '点赞成功'
              });
            });
          });
        });
      });
    });
  });
};

// 取消点赞
exports.unlike = (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      message: '用户ID不能为空'
    });
  }

  // 从连接池获取连接
    db.getConnection((err, connection) => {
      if (err) {
        return res.status(500).json({
          message: '获取数据库连接失败',
          error: err.message
        });
      }

      // 开始事务
      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return res.status(500).json({
            message: '事务开始失败',
            error: err.message
          });
        }

        // 删除点赞记录
        const deleteLikeSql = 'DELETE FROM thesis_like WHERE thesis_id = ? AND user_id = ?';
        connection.query(deleteLikeSql, [id, user_id], (err, results) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({
                message: '删除点赞记录失败',
                error: err.message
              });
            });
          }

          if (results.affectedRows === 0) {
            return connection.rollback(() => {
              connection.release();
              res.status(404).json({
                message: '未找到该点赞记录'
              });
            });
          }

          // 更新论文点赞数
          const updateSql = 'UPDATE thesis SET likes = likes - 1 WHERE id = ?';
          connection.query(updateSql, [id], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({
                  message: '更新点赞数失败',
                  error: err.message
                });
              });
            }

            // 提交事务
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({
                    message: '事务提交失败',
                    error: err.message
                  });
                });
              }

              connection.release();
              res.json({
                message: '取消点赞成功'
              });
            });
          });
        });
      });
    });
};

// 检查是否点赞
exports.checkLike = (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      message: '用户ID不能为空'
    });
  }

  const sql = 'SELECT * FROM thesis_like WHERE thesis_id = ? AND user_id = ?';
  db.query(sql, [id, user_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: '数据库查询失败',
        error: err.message
      });
    }

    res.json({
      isLiked: results.length > 0
    });
  });
};

// 收藏论文
exports.favorite = (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      message: '用户ID不能为空'
    });
  }

  // 检查是否已收藏
  const checkSql = 'SELECT * FROM thesis_favorite WHERE thesis_id = ? AND user_id = ?';
  db.query(checkSql, [id, user_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: '数据库查询失败',
        error: err.message
      });
    }

    if (results.length > 0) {
      return res.status(400).json({
        message: '已经收藏过该论文'
      });
    }

    // 从连接池获取连接
    db.getConnection((err, connection) => {
      if (err) {
        return res.status(500).json({
          message: '获取数据库连接失败',
          error: err.message
        });
      }

      // 开始事务
      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return res.status(500).json({
            message: '事务开始失败',
            error: err.message
          });
        }

        // 记录收藏行为
        const insertFavoriteSql = 'INSERT INTO thesis_favorite (thesis_id, user_id) VALUES (?, ?)';
        connection.query(insertFavoriteSql, [id, user_id], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({
                message: '记录收藏行为失败',
                error: err.message
              });
            });
          }

          // 更新论文收藏数
          const updateSql = 'UPDATE thesis SET favorites = favorites + 1 WHERE id = ?';
          connection.query(updateSql, [id], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({
                  message: '更新收藏数失败',
                  error: err.message
                });
              });
            }

            // 提交事务
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({
                    message: '事务提交失败',
                    error: err.message
                  });
                });
              }

              connection.release();
              res.json({
                message: '收藏成功'
              });
            });
          });
        });
      });
    });
  });
};

// 取消收藏
exports.unfavorite = (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      message: '用户ID不能为空'
    });
  }

  // 从连接池获取连接
    db.getConnection((err, connection) => {
      if (err) {
        return res.status(500).json({
          message: '获取数据库连接失败',
          error: err.message
        });
      }

      // 开始事务
      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return res.status(500).json({
            message: '事务开始失败',
            error: err.message
          });
        }

        // 删除收藏记录
        const deleteFavoriteSql = 'DELETE FROM thesis_favorite WHERE thesis_id = ? AND user_id = ?';
        connection.query(deleteFavoriteSql, [id, user_id], (err, results) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({
                message: '删除收藏记录失败',
                error: err.message
              });
            });
          }

          if (results.affectedRows === 0) {
            return connection.rollback(() => {
              connection.release();
              res.status(404).json({
                message: '未找到该收藏记录'
              });
            });
          }

          // 更新论文收藏数
          const updateSql = 'UPDATE thesis SET favorites = favorites - 1 WHERE id = ?';
          connection.query(updateSql, [id], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({
                  message: '更新收藏数失败',
                  error: err.message
                });
              });
            }

            // 提交事务
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({
                    message: '事务提交失败',
                    error: err.message
                  });
                });
              }

              connection.release();
              res.json({
                message: '取消收藏成功'
              });
            });
          });
        });
      });
    });
};

// 检查是否收藏
exports.checkFavorite = (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      message: '用户ID不能为空'
    });
  }

  const sql = 'SELECT * FROM thesis_favorite WHERE thesis_id = ? AND user_id = ?';
  db.query(sql, [id, user_id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: '数据库查询失败',
        error: err.message
      });
    }

    res.json({
      isFavorited: results.length > 0
    });
  });
};

// 获取用户收藏列表
exports.getUserFavorites = (req, res) => {
  const { user_id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // 查询收藏总数
  const countSql = 'SELECT COUNT(*) AS total FROM thesis_favorite WHERE user_id = ?';
  db.query(countSql, [user_id], (err, countResult) => {
    if (err) {
      return res.status(500).json({
        message: '数据库查询失败',
        error: err.message
      });
    }

    const total = countResult[0].total;

    // 查询收藏列表
    const listSql = `
      SELECT t.* FROM thesis t
      INNER JOIN thesis_favorite tf ON t.id = tf.thesis_id
      WHERE tf.user_id = ?
      ORDER BY tf.created_at DESC
      LIMIT ? OFFSET ?
    `;
    db.query(listSql, [user_id, limit, offset], (err, results) => {
      if (err) {
        return res.status(500).json({
          message: '数据库查询失败',
          error: err.message
        });
      }

      res.json({
        total,
        list: results
      });
    });
  });
};