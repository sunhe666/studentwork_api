module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    message: '测试接口工作正常',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};
