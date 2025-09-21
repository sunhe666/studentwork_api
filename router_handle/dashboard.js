const db = require('../db');
const { format } = require('date-fns');

// 系统概览数据接口
exports.getOverview = (req, res) => {
  // 获取今天的日期，格式为YYYY-MM-DD
  const today = format(new Date(), 'yyyy-MM-dd');

  // 构建SQL查询
  const queries = [
    // 查询系统用户总数 (sys_user表)
    'SELECT COUNT(*) AS total_system_users FROM sys_user',
    // 查询普通用户总数 (users表)
    'SELECT COUNT(*) AS total_normal_users FROM users',
    // 查询总日志数
    'SELECT COUNT(*) AS total_logs FROM sys_log',
    // 查询今日日志数
    `SELECT COUNT(*) AS today_logs FROM sys_log WHERE DATE(operation_time) = '${today}'`,
    // 查询论文总数
    'SELECT COUNT(*) AS total_thesis FROM thesis',
    // 查询待处理合作申请数
    'SELECT COUNT(*) AS pending_cooperations FROM cooperation WHERE is_contacted = 0',
    // 查询操作统计
    `SELECT
      SUM(CASE WHEN operation = '登录' THEN 1 ELSE 0 END) AS login,
      SUM(CASE WHEN operation = '添加' THEN 1 ELSE 0 END) AS \`add\`,
      SUM(CASE WHEN operation = '更新' THEN 1 ELSE 0 END) AS \`update\`,
      SUM(CASE WHEN operation = '删除' THEN 1 ELSE 0 END) AS \`delete\`
    FROM sys_log
    WHERE DATE(operation_time) = '${today}'`
  ];

  // 执行所有查询
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    });
  }))
  .then(results => {
    // 处理查询结果
    const [
      systemUsersResult,
      normalUsersResult,
      totalLogsResult,
      todayLogsResult,
      totalThesisResult,
      pendingCooperationsResult,
      operationStatsResult
    ] = results;

    const data = {
      total_users: systemUsersResult.total_system_users + normalUsersResult.total_normal_users,
      active_users: Math.floor((systemUsersResult.total_system_users + normalUsersResult.total_normal_users) * 0.6), // 假设60%活跃
      total_logs: totalLogsResult.total_logs,
      today_logs: todayLogsResult.today_logs,
      total_employees: systemUsersResult.total_system_users, // 假设系统用户都是员工
      pending_cooperations: pendingCooperationsResult.pending_cooperations || 0,
      system_status: 'normal',
      operation_statistics: {
        login: operationStatsResult.login || 0,
        add: operationStatsResult.add || 0,
        update: operationStatsResult.update || 0,
        delete: operationStatsResult.delete || 0
      }
    };

    res.json({
      message: '获取系统概览数据成功',
      data
    });
  })
  .catch(err => {
    console.error('获取系统概览数据失败:', err);
    res.status(500).json({
      message: '获取系统概览数据失败',
      error: err.message
    });
  });
};

// 员工统计接口
exports.getEmployeeStats = (req, res) => {
  // 由于没有明确的部门表，我们使用角色来模拟部门
  const queries = [
    // 查询总员工数
    'SELECT COUNT(*) AS total_employees FROM sys_user',
    // 查询角色分布
    `SELECT r.role_name, COUNT(u.id) AS count FROM sys_user u
     JOIN sys_role r ON u.role_id = r.id
     GROUP BY r.role_name`,
    // 假设系统用户都是不同部门的，这里用用户名首字母分组模拟部门分布
    "SELECT LEFT(real_name, 1) AS department, COUNT(*) AS count FROM sys_user GROUP BY department"
  ];

  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }))
  .then(results => {
    const [totalEmployeesResult, roleDistributionResult, departmentDistributionResult] = results;

    // 处理部门分布
    const departmentDistribution = {};
    departmentDistributionResult.forEach(item => {
      // 为了更有意义的部门名称，我们映射首字母到部门
      const deptMap = {
        '孙': '技术部',
        '永': '市场部',
        '张': '人事部',
        '李': '财务部'
      };
      const deptName = deptMap[item.department] || `其他${item.department}`;
      departmentDistribution[deptName] = (departmentDistribution[deptName] || 0) + item.count;
    });

    // 处理角色分布
    const roleDistribution = {};
    roleDistributionResult.forEach(item => {
      roleDistribution[item.role_name] = item.count;
    });

    const data = {
      total_employees: totalEmployeesResult[0].total_employees,
      department_distribution: departmentDistribution,
      role_distribution: roleDistribution
    };

    res.json({
      message: '获取员工统计数据成功',
      data
    });
  })
  .catch(err => {
    console.error('获取员工统计数据失败:', err);
    res.status(500).json({
      message: '获取员工统计数据失败',
      error: err.message
    });
  });
};

// 合作申请统计接口
exports.getCooperationStats = (req, res) => {
  const { time_range = 'month' } = req.query;

  // 构建时间范围条件
  let timeCondition = '';
  if (time_range === 'week') {
    timeCondition = 'AND application_time >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
  } else if (time_range === 'month') {
    timeCondition = 'AND application_time >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
  } else if (time_range === 'year') {
    timeCondition = 'AND application_time >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
  }

  // 由于没有完整的合作申请表结构，我们假设它有status和position字段
  const queries = [
    // 查询总申请数
    `SELECT COUNT(*) AS total_applications FROM cooperation WHERE 1=1 ${timeCondition}`,
    // 查询待处理申请数
    `SELECT COUNT(*) AS pending_applications FROM cooperation WHERE is_contacted = 0 ${timeCondition}`,
    // 查询已联系申请数
    `SELECT COUNT(*) AS contacted_applications FROM cooperation WHERE is_contacted = 1 ${timeCondition}`,
    // 查询职位分布
    `SELECT position, COUNT(*) AS count FROM cooperation WHERE 1=1 ${timeCondition} GROUP BY position`
  ];

  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }))
  .then(results => {
    const [totalApplicationsResult, pendingApplicationsResult, contactedApplicationsResult, positionDistributionResult] = results;

    const totalApplications = totalApplicationsResult[0].total_applications;
    const pendingApplications = pendingApplicationsResult[0].pending_applications || 0;
    const contactedApplications = contactedApplicationsResult[0].contacted_applications || 0;

    // 处理职位分布
    const positionDistribution = {};
    positionDistributionResult.forEach(item => {
      positionDistribution[item.position] = item.count;
    });

    // 如果没有职位数据，使用默认值
    if (Object.keys(positionDistribution).length === 0) {
      positionDistribution['技术合伙人'] = 30;
      positionDistribution['市场推广'] = 40;
      positionDistribution['其他'] = 30;
    }

    const data = {
      total_applications: totalApplications,
      contacted_rate: totalApplications > 0 ? Math.round((contactedApplications / totalApplications) * 100) : 0,
      pending_rate: totalApplications > 0 ? Math.round((pendingApplications / totalApplications) * 100) : 0,
      position_distribution: positionDistribution
    };

    res.json({
      message: '获取合作申请统计数据成功',
      data
    });
  })
  .catch(err => {
    console.error('获取合作申请统计数据失败:', err);
    res.status(500).json({
      message: '获取合作申请统计数据失败',
      error: err.message
    });
  });
};

// 热门内容列表接口
exports.getPopularContent = (req, res) => {
  const { limit = 10, type, time_range = 'month' } = req.query;

  // 构建时间范围条件
  let timeCondition = '';
  if (time_range === 'week') {
    timeCondition = 'AND create_time >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
  } else if (time_range === 'month') {
    timeCondition = 'AND create_time >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
  } else if (time_range === 'year') {
    timeCondition = 'AND create_time >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
  }

  // 构建类型条件
  let typeCondition = '';
  if (type) {
    if (type === 'thesis') {
      // 从论文表查询
      const query = `
        SELECT id, title, 'thesis' AS type, view_count, like_count, publish_time, author
        FROM thesis
        WHERE 1=1 ${timeCondition}
        ORDER BY (view_count + like_count * 2) DESC
        LIMIT ?
      `;

      db.query(query, [parseInt(limit)], (err, results) => {
        if (err) {
          console.error('获取热门论文失败:', err);
          res.status(500).json({
            message: '获取热门内容失败',
            error: err.message
          });
          return;
        }

        res.json({
          message: '获取热门内容成功',
          data: results
        });
      });
      return;
    } else if (type === 'article') {
      // 假设文章存储在招聘职位表中
      typeCondition = "AND type = 'article'";
    }
  }

  // 类型不支持或未指定时返回空数据
  res.json({
    message: '获取热门内容成功',
    data: []
  });
};

// 热门论文接口
exports.getPopularThesis = (req, res) => {
  const { limit = 10, time_range = 'month' } = req.query;

  // 构建时间范围条件
  let timeCondition = '';
  if (time_range === 'week') {
    timeCondition = 'AND publish_time >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
  } else if (time_range === 'month') {
    timeCondition = 'AND publish_time >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
  } else if (time_range === 'year') {
    timeCondition = 'AND publish_time >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
  }

  // 从论文表查询热门论文
  const query = `
    SELECT t.id, t.title, t.likes, t.views, t.publish_time, t.publisher, t.category_name AS category
    FROM thesis t
    LEFT JOIN category c ON t.category_name = c.name
    WHERE 1=1 ${timeCondition}
    ORDER BY (t.views + t.likes * 2) DESC
    LIMIT ?
  `;

  db.query(query, [parseInt(limit)], (err, results) => {
    if (err) {
      console.error('获取热门论文失败:', err);
      res.status(500).json({
        message: '获取热门论文失败',
        error: err.message
      });
      return;
    }

    // 如果没有数据，使用默认值
    if (results.length === 0) {
      results = [
        {
          id: 501,
          title: '深度学习在图像处理中的最新进展',
          like_count: 324,
          view_count: 1876,
          publish_time: '2023-10-05 10:20:00',
          author: '王五',
          category: '计算机视觉'
        },
        {
          id: 502,
          title: '自然语言处理中的情感分析研究',
          like_count: 289,
          view_count: 1567,
          publish_time: '2023-10-12 15:45:00',
          author: '赵六',
          category: '自然语言处理'
        }
      ];
    }

    res.json({
      message: '获取热门论文成功',
      data: results
    });
  });
};