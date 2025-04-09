const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectFile', required: true },
  original: String,
  modified: String,
  diff: Object,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CodeBackup', backupSchema);