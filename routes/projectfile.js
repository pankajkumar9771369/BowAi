const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const ProjectFile = require('../models/ProjectFile');
const AIController = require('../controllers/ai.controller');
const Project = require('../models/Project');
router.post('/:projectId', auth, async (req, res) => {
  try {
    const file = await ProjectFile.create({
      projectId: req.params.projectId,
      ...req.body
    });
    // 2. Push file._id to the project's files array
    await Project.findByIdAndUpdate(
      req.params.projectId,
      { $push: { files: file._id } },
      { new: true }
    );

    res.status(201).json(file);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:fileId', auth, async (req, res) => {
  try {
    const file = await ProjectFile.findById(req.params.fileId);
    res.json(file);
  } catch (error) {
    res.status(404).json({ error: "File not found" });
  }
});

router.put('/:fileId', auth, async (req, res) => {
  try {
    const file = await ProjectFile.findByIdAndUpdate(
      req.params.fileId,
      req.body,
      { new: true }
    );
    res.json(file);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:fileId/ai-edit', auth, AIController.surgicalEdit);

module.exports = router;