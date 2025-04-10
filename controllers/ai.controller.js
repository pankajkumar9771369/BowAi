const AICoderService = require('../services/AICoderService');
const ProjectFile = require("../models/ProjectFile");
const CodeBackup = require("../models/CodeBackup");

class AIController {
  constructor() {
    this.surgicalEdit = this.surgicalEdit.bind(this);
  }

  async surgicalEdit(req, res) {
    try {
      const { fileId } = req.params;  // Extract fileId from URL params
      const { prompt, selectedCode } = req.body;

      if (selectedCode?.length > 5000) {
        return res.status(400).json({ error: "Selected code too large (max 5000 chars)" });
      }

      const file = await ProjectFile.findById(fileId);  // Use fileId from the URL
      if (!file) return res.status(404).json({ error: "File not found" });

      const context = selectedCode || file.content;
      const aiResponse = await AICoderService.getAIResponse(prompt, context);

      const lineRange = selectedCode ? 
        this.getLineRange(file.content, selectedCode) : 
        null;

      const { mergedCode, diff } = await AICoderService.surgicalMerge(
        fileId,
        file.content,
        aiResponse,
        lineRange
      );

      // Add merge validation
      if (mergedCode.length > file.content.length * 2) {
        throw new Error("Merge resulted in abnormally large file");
      }

      await CodeBackup.create({
        fileId,
        original: file.content,
        modified: mergedCode,
        diff
      });

      file.content = mergedCode;
      file._modifiedBy = 'ai';
      await file.save();

      res.json({
        success: true,
        file,
        changes: diff
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  getLineRange(fullCode, snippet) {
    const lines = fullCode.split('\n');
    const startLine = lines.findIndex(line => line.includes(snippet.split('\n')[0]));
    const endLine = startLine + snippet.split('\n').length - 1;
    return { startLine: startLine + 1, endLine: endLine + 1 }; // +1 for 1-based line numbers
  }
}

module.exports = new AIController();
