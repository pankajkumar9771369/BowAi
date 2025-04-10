const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const ChatHistory = require('../models/ChatHistory');
const AICoderService = require('../services/AICoderService');

router.post('/:projectId', auth, async (req, res) => {
  try {
    const { message, fileId, selectedCode } = req.body;
    const chatHistory = await ChatHistory.findOneAndUpdate(
      { projectId: req.params.projectId, userId: req.user._id },
      { $push: { messages: { role: 'user', content: message, fileRef: fileId, codeContext: selectedCode } } },
      { new: true, upsert: true }
    );

    const context = fileId ? (await ProjectFile.findById(fileId))?.content || '' : '';
    const aiResponse = await AICoderService.getAIResponse(
      selectedCode ? `Modify:\n${selectedCode}\n\nRequest: ${message}` : message,
      context
    );

    chatHistory.messages.push({
      role: 'ai',
      content: aiResponse,
      isCode: /(```|function|class|=>|{)/.test(aiResponse)
    });
    await chatHistory.save();

    res.json(chatHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:projectId",auth,async(req,res)=>{
    try {
      const chatHistory = await ChatHistory.findOneAndUpdate(
        { projectId: req.params.projectId, userId: req.user._id },
        
      );
      res.json(chatHistory);
  
        
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
})
module.exports = router;