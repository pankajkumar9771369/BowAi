const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'ai'], required: true },
  content: { type: String, required: true },
  isCode: Boolean,
  fileRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectFile' },
  codeContext: String,
  timestamp: { type: Date, default: Date.now }
});

const chatHistorySchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [messageSchema]
}, { timestamps: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);