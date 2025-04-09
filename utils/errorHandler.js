module.exports = {
    handleAIError(error, req, res, next) {
      if (error.message.includes('AI') || error.message.includes('Gemini')) {
        return res.status(503).json({
          error: 'AI Service Error',
          details: process.env.NODE_ENV === 'development' ? error.message : null
        });
      }
      next(error);
    },
  
    handleCodeError(error, req, res, next) {
      if (error.message.includes('AST') || error.message.includes('merge')) {
        return res.status(422).json({
          error: 'Code Processing Error',
          details: process.env.NODE_ENV === 'development' ? error.message : null
        });
      }
      next(error);
    },
  
    genericError(error, req, res, next) {
      console.error('Server Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error.stack 
        })
      });
    }
  };