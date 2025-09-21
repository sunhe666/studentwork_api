const pool = require('../db');

/**
 * 添加角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.addRole = (req, res) => {
  const { role_name, role_desc } = req.body;

  // 验证参数
  if (!role_name) {
    return res.status(400).json({
      message: '角色名称不能为空'
    });
  }

  // 检查角色名称是否已存在
  const checkSql = 'SELECT * FROM sys_role WHERE role_name = ?';
  pool.query(checkSql, [role_name], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(500).json({
        message: '添加角色失败',
        error: checkErr.message
      });
    }

    if (checkResult.length > 0) {
      return res.status(400).json({
        message: '角色名称已存在'
      });
    }

    // 插入数据库
    const sql = 'INSERT INTO sys_role (role_name, role_desc) VALUES (?, ?)';
    pool.query(sql, [role_name, role_desc || null], (err, result) => {
      if (err) {
        return res.status(500).json({
          message: '添加角色失败',
          error: err.message
        });
      }

      res.status(201).json({
        message: '添加角色成功',
        id: result.insertId
      });
    });
  });
};

/**
 * 获取角色列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getRoleList = (req, res) => {
  const { page = 1, limit = 10, role_name } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  // 构建查询条件
  let where = '';
  const params = [];

  if (role_name) {
    where = 'WHERE role_name LIKE ?';
    params.push(`%${role_name}%`);
  }

  // 查询总数
  const countSql = `SELECT COUNT(*) as total FROM sys_role ${where}`;
  pool.query(countSql, params, (countErr, countResult) => {
    if (countErr) {
      return res.status(500).json({
        message: '获取角色列表失败',
        error: countErr.message
      });
    }

    const total = countResult[0].total;

    // 查询列表
    const listSql = `SELECT * FROM sys_role ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`;
    pool.query(listSql, [...params, limitNum, offset], (listErr, listResult) => {
      if (listErr) {
        return res.status(500).json({
          message: '获取角色列表失败',
          error: listErr.message
        });
      }

      res.status(200).json({
        total,
        list: listResult,
        page: pageNum,
        limit: limitNum
      });
    });
  });
};

/**
 * 获取角色详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getRoleDetail = (req, res) => {
  const { id } = req.params;

  const sql = 'SELECT * FROM sys_role WHERE id = ?';
  pool.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: '获取角色详情失败',
        error: err.message
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: '未找到该角色'
      });
    }

    res.status(200).json({
      message: '获取角色详情成功',
      role: result[0]
    });
  });
};

/**
 * 更新角色信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateRole = (req, res) => {
  const { id } = req.params;
  const { role_name, role_desc } = req.body;

  // 验证参数
  if (!role_name) {
    return res.status(400).json({
      message: '角色名称不能为空'
    });
  }

  // 检查角色名称是否已存在（排除当前角色）
  const checkSql = 'SELECT * FROM sys_role WHERE role_name = ? AND id != ?';
  pool.query(checkSql, [role_name, id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(500).json({
        message: '更新角色失败',
        error: checkErr.message
      });
    }

    if (checkResult.length > 0) {
      return res.status(400).json({
        message: '角色名称已存在'
      });
    }

    // 更新数据库
    const sql = 'UPDATE sys_role SET role_name = ?, role_desc = ? WHERE id = ?';
    pool.query(sql, [role_name, role_desc || null, id], (err, result) => {
      if (err) {
        return res.status(500).json({
          message: '更新角色失败',
          error: err.message
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: '未找到该角色'
        });
      }

      res.status(200).json({
        message: '更新角色成功'
      });
    });
  });
};

/**
 * 删除角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.deleteRole = (req, res) => {
  const { id } = req.params;

  // 检查是否有员工关联此角色
  const checkSql = 'SELECT * FROM sys_user WHERE role_id = ?';
  pool.query(checkSql, [id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(500).json({
        message: '删除角色失败',
        error: checkErr.message
      });
    }

    if (checkResult.length > 0) {
      return res.status(400).json({
        message: '该角色下有员工，无法删除'
      });
    }

    // 删除角色
    const deleteRoleSql = 'DELETE FROM sys_role WHERE id = ?';
    pool.query(deleteRoleSql, [id], (roleErr, roleResult) => {
      if (roleErr) {
        return res.status(500).json({
          message: '删除角色失败',
          error: roleErr.message
        });
      }

      // 删除角色菜单关联
      const deleteMenuSql = 'DELETE FROM sys_role_menu WHERE role_id = ?';
      pool.query(deleteMenuSql, [id], (menuErr, menuResult) => {
        if (menuErr) {
          return res.status(500).json({
            message: '删除角色失败',
            error: menuErr.message
          });
        }

        res.status(200).json({
          message: '删除角色成功'
        });
      });
    });
  });
};

/**
 * 分配菜单权限
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.assignMenu = (req, res) => {
  const { role_id, menu_ids } = req.body;

  // 验证参数
  if (!role_id || !menu_ids || !Array.isArray(menu_ids) || menu_ids.length === 0) {
    return res.status(400).json({
      message: '请提供角色ID和菜单ID列表'
    });
  }

  // 开启事务
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({
        message: '分配权限失败',
        error: err.message
      });
    }

    connection.beginTransaction((transErr) => {
      if (transErr) {
        connection.release();
        return res.status(500).json({
          message: '分配权限失败',
          error: transErr.message
        });
      }

      // 删除旧的权限
      const deleteSql = 'DELETE FROM sys_role_menu WHERE role_id = ?';
      connection.query(deleteSql, [role_id], (deleteErr) => {
        if (deleteErr) {
          connection.rollback(() => connection.release());
          return res.status(500).json({
            message: '分配权限失败',
            error: deleteErr.message
          });
        }

        // 插入新的权限
        const insertSql = 'INSERT INTO sys_role_menu (role_id, menu_id) VALUES ?';
        const values = menu_ids.map(menu_id => [role_id, menu_id]);

        connection.query(insertSql, [values], (insertErr) => {
          if (insertErr) {
            connection.rollback(() => connection.release());
            return res.status(500).json({
              message: '分配权限失败',
              error: insertErr.message
            });
          }

          connection.commit((commitErr) => {
            if (commitErr) {
              connection.rollback(() => connection.release());
              return res.status(500).json({
                message: '分配权限失败',
                error: commitErr.message
              });
            }

            connection.release();
            res.status(200).json({
              message: '分配权限成功'
            });
          });
        });
      });
    });
  });
};

/**
 * 获取所有菜单（用于权限分配）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getAllMenus = (req, res) => {
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
    function buildMenuTree(menus, parentId = 0) {
      return menus
        .filter(menu => menu.parent_id === parentId)
        .map(menu => ({
          ...menu,
          children: buildMenuTree(menus, menu.id)
        }));
    }

    const tree = buildMenuTree(result);

    res.status(200).json({
      message: '获取菜单列表成功',
      list: tree
    });
  });
};

/**
 * 获取角色的菜单权限
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getRoleMenus = (req, res) => {
  const { id } = req.params;

  // 先查询角色拥有的菜单ID
  const sql = 'SELECT menu_id FROM sys_role_menu WHERE role_id = ?';
  pool.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: '获取角色菜单权限失败',
        error: err.message
      });
    }

    const menuIds = result.map(item => item.menu_id);

    // 如果没有菜单权限，直接返回空数组
    if (menuIds.length === 0) {
      return res.status(200).json({
        message: '获取角色菜单权限成功',
        menu_ids: [],
        menus: []
      });
    }

    // 查询这些菜单的详细信息
    const menuSql = 'SELECT * FROM sys_menu WHERE id IN (?) ORDER BY parent_id ASC, sort ASC';
    pool.query(menuSql, [menuIds], (menuErr, menuResult) => {
      if (menuErr) {
        return res.status(500).json({
          message: '获取角色菜单权限失败',
          error: menuErr.message
        });
      }

      // 构建树形结构
      function buildMenuTree(menus, parentId = 0) {
        return menus
          .filter(menu => menu.parent_id === parentId)
          .map(menu => ({
            ...menu,
            children: buildMenuTree(menus, menu.id)
          }));
      }

      const tree = buildMenuTree(menuResult);

      res.status(200).json({
        message: '获取角色菜单权限成功',
        menu_ids: menuIds,
        menus: tree
      });
    });
  });
};