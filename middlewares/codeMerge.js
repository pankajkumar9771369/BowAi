module.exports = function(err, req, res, next) {
  if (err.message.includes('AST') || err.message.includes('merge')) {
    return res.status(422).json({
      error: 'Code merge failed',
      details: process.env.NODE_ENV === 'development' ? err.message : null,
      suggestion: 'Try a smaller code section or different modification'
    });
  }
  next(err);
};