const mongoose = require('mongoose');

const editHistorySchema = new mongoose.Schema({
  content: String,
  modifiedBy: { type: String, enum: ['user', 'ai'], required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const projectFileSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  content: { type: String, default: '' },
  fileType: { 
    type: String, 
    enum: ['html', 'js', 'css', 'ts', 'json', 'jsx', 'tsx'],
    required: true 
  },
  editHistory: [editHistorySchema]
}, { timestamps: true });

projectFileSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.editHistory.push({
      content: this.content,
      modifiedBy: this._modifiedBy || 'user'
    });
    
    if (this.editHistory.length > 10) {
      this.editHistory.shift();
    }
  }
  next();
});

module.exports = mongoose.model('ProjectFile', projectFileSchema);