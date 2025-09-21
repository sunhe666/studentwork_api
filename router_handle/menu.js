const pool = require('../db');

/**
 * 添加菜单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.addMenu = (req, res) => {
  const { menu_name, path, component, icon, parent_id = 0, sort = 0, is_show = 1 } = req.body;

  // 验证参数
  if (!menu_name) {
    return res.status(400).json({
      message: '菜单名称不能为空'
    });
  }

  // 插入数据库
  const sql = 'INSERT INTO sys_menu (menu_name, path, component, icon, parent_id, sort, is_show) VALUES (?, ?, ?, ?, ?, ?, ?)';
  pool.query(sql, [menu_name, path || null, component || null, icon || null, parent_id, sort, is_show], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: '添加菜单失败',
        error: err.message
      });
    }

    res.status(201).json({
      message: '添加菜单成功',
      id: result.insertId
    });
  });
};

/**
 * 获取菜单列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getMenuList = (req, res) => {
  // 查询所有菜单，然后构建树形结构
  const sql = 'SELECT * FROM sys_menu ORDER BY parent_id ASC, sort ASC';
  pool.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({
        message: '获取菜单列表失败',
        error: err.message
      });
    }

    // 构建树形结构
    const tree = buildMenuTree(result);

    res.status(200).json({
      message: '获取菜单列表成功',
      list: tree
    });
  });
};

/**
 * 构建菜单树形结构
 * @param {Array} menus - 菜单列表
 * @param {Number} parentId - 父菜单ID
 * @returns {Array} 树形菜单
 */
function buildMenuTree(menus, parentId = 0) {
  return menus
    .filter(menu => menu.parent_id === parentId)
    .map(menu => ({
      ...menu,
      children: buildMenuTree(menus, menu.id)
    }));
}

/**
 * 获取菜单详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getMenuDetail = (req, res) => {
  const { id } = req.params;

  const sql = 'SELECT * FROM sys_menu WHERE id = ?';
  pool.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: '获取菜单详情失败',
        error: err.message
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: '未找到该菜单'
      });
    }

    res.status(200).json({
      message: '获取菜单详情成功',
      menu: result[0]
    });
  });
};

/**
 * 更新菜单信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateMenu = (req, res) => {
  const { id } = req.params;
  const { menu_name, path, component, icon, parent_id, sort, is_show } = req.body;

  // 验证参数
  if (!menu_name) {
    return res.status(400).json({
      message: '菜单名称不能为空'
    });
  }

  // 检查是否有子菜单（如果修改父菜单ID）
  if (parent_id !== undefined && parent_id !== null) {
    // 不能将自己设为父菜单
    if (id == parent_id) {
      return res.status(400).json({
        message: '不能将菜单设置为自己的子菜单'
      });
    }

    // 检查是否将菜单设置为其子菜单的子菜单
    function checkChildMenu(childId, targetParentId, callback) {
      const sql = 'SELECT id FROM sys_menu WHERE parent_id = ?';
      pool.query(sql, [childId], (err, result) => {
        if (err) {
          return res.status(500).json({
            message: '更新菜单失败',
            error: err.message
          });
        }

        if (result.length === 0) {
          // 没有子菜单，检查通过
          return callback(false);
        }

        // 检查是否有子菜单的ID等于目标父菜单ID
        for (let i = 0; i < result.length; i++) {
          if (result[i].id === targetParentId) {
            return callback(true);
          }
        }

        // 递归检查所有子菜单
        let checkedCount = 0;
        let hasInvalidChild = false;

        result.forEach(child => {
          checkChildMenu(child.id, targetParentId, (invalid) => {
            checkedCount++;
            if (invalid) {
              hasInvalidChild = true;
            }

            if (checkedCount === result.length) {
              callback(hasInvalidChild);
            }
          });
        });
      });
    }

    checkChildMenu(id, parent_id, (hasInvalidChild) => {
      if (hasInvalidChild) {
        return res.status(400).json({
          message: '不能将菜单设置为自己或子菜单的子菜单'
        });
      }

      updateMenuData();
    });
  } else {
    updateMenuData();
  }

  function updateMenuData() {
    // 构建更新字段
    let fields = [];
    const params = [];

    fields.push('menu_name = ?');
    params.push(menu_name);

    fields.push('path = ?');
    params.push(path || null);

    fields.push('component = ?');
    params.push(component || null);

    fields.push('icon = ?');
    params.push(icon || null);

    fields.push('parent_id = ?');
    params.push(parent_id);

    fields.push('sort = ?');
    params.push(sort);

    fields.push('is_show = ?');
    params.push(is_show);

    params.push(id);

    const sql = `UPDATE sys_menu SET ${fields.join(', ')} WHERE id = ?`;
    pool.query(sql, params, (err, result) => {
      if (err) {
        return res.status(500).json({
          message: '更新菜单失败',
          error: err.message
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: '未找到该菜单'
        });
      }

      res.status(200).json({
        message: '更新菜单成功'
      });
    });
  }
};

/**
 * 删除菜单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.deleteMenu = (req, res) => {
  const { id } = req.params;

  // 检查是否有子菜单
  const checkChildSql = 'SELECT * FROM sys_menu WHERE parent_id = ?';
  pool.query(checkChildSql, [id], (childErr, childResult) => {
    if (childErr) {
      return res.status(500).json({
        message: '删除菜单失败',
        error: childErr.message
      });
    }

    if (childResult.length > 0) {
      return res.status(400).json({
        message: '该菜单下有子菜单，无法删除'
      });
    }

    // 检查是否有角色关联此菜单
    const checkRoleSql = 'SELECT * FROM sys_role_menu WHERE menu_id = ?';
    pool.query(checkRoleSql, [id], (roleErr, roleResult) => {
      if (roleErr) {
        return res.status(500).json({
          message: '删除菜单失败',
          error: roleErr.message
        });
      }

      // 开启事务
      pool.getConnection((err, connection) => {
        if (err) {
          return res.status(500).json({
            message: '删除菜单失败',
            error: err.message
          });
        }

        connection.beginTransaction((transErr) => {
          if (transErr) {
            connection.release();
            return res.status(500).json({
              message: '删除菜单失败',
              error: transErr.message
            });
          }

          // 删除角色菜单关联
          const deleteRoleMenuSql = 'DELETE FROM sys_role_menu WHERE menu_id = ?';
          connection.query(deleteRoleMenuSql, [id], (roleMenuErr) => {
            if (roleMenuErr) {
              connection.rollback(() => connection.release());
              return res.status(500).json({
                message: '删除菜单失败',
                error: roleMenuErr.message
              });
            }

            // 删除菜单
            const deleteMenuSql = 'DELETE FROM sys_menu WHERE id = ?';
            connection.query(deleteMenuSql, [id], (menuErr, menuResult) => {
              if (menuErr) {
                connection.rollback(() => connection.release());
                return res.status(500).json({
                  message: '删除菜单失败',
                  error: menuErr.message
                });
              }

              connection.commit((commitErr) => {
                if (commitErr) {
                  connection.rollback(() => connection.release());
                  return res.status(500).json({
                    message: '删除菜单失败',
                    error: commitErr.message
                  });
                }

                connection.release();
                res.status(200).json({
                  message: '删除菜单成功'
                });
              });
            });
          });
        });
      });
    });
  });
};

/**
 * 更新菜单排序
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateMenuSort = (req, res) => {
  const { sortList } = req.body;

  // 验证参数
  if (!sortList || !Array.isArray(sortList) || sortList.length === 0) {
    return res.status(400).json({
      message: '请提供排序列表'
    });
  }

  // 开启事务
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({
        message: '更新菜单排序失败',
        error: err.message
      });
    }

    connection.beginTransaction((transErr) => {
      if (transErr) {
        connection.release();
        return res.status(500).json({
          message: '更新菜单排序失败',
          error: transErr.message
        });
      }

      // 准备所有更新语句
      const promises = sortList.map(item => {
        return new Promise((resolve, reject) => {
          const sql = 'UPDATE sys_menu SET sort = ? WHERE id = ?';
          connection.query(sql, [item.sort, item.id], (updateErr) => {
            if (updateErr) {
              reject(updateErr);
            } else {
              resolve();
            }
          });
        });
      });

      // 执行所有更新
      Promise.all(promises)
        .then(() => {
          connection.commit((commitErr) => {
            if (commitErr) {
              connection.rollback(() => connection.release());
              return res.status(500).json({
                message: '更新菜单排序失败',
                error: commitErr.message
              });
            }

            connection.release();
            res.status(200).json({
              message: '更新菜单排序成功'
            });
          });
        })
        .catch((updateErr) => {
          connection.rollback(() => connection.release());
          return res.status(500).json({
            message: '更新菜单排序失败',
            error: updateErr.message
          });
        });
    });
  });
};

/**
 * 更新菜单显示状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateMenuShow = (req, res) => {
  const { id } = req.params;
  const { is_show } = req.body;

  // 验证参数
  if (is_show === undefined) {
    return res.status(400).json({
      message: '请提供显示状态'
    });
  }

  const sql = 'UPDATE sys_menu SET is_show = ? WHERE id = ?';
  pool.query(sql, [is_show, id], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: '更新菜单显示状态失败',
        error: err.message
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: '未找到该菜单'
      });
    }

    res.status(200).json({
      message: '更新菜单显示状态成功'
    });
  });
};