const { ProjectFile } = require('../models');

class FileController {
  async getFile(req, res) {
    try {
      const file = await ProjectFile.findById(req.params.id);
      res.json(file);
    } catch (error) {
      res.status(404).json({ error: "File not found" });
    }
  }
}

module.exports = new FileController();