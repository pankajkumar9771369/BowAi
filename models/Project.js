const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  framework: { 
    type: String, 
    enum: ['React', 'Vue', 'Angular', 'Node', 'Static'],
    required: true 
  },
  files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProjectFile' }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);