
require('dotenv').config(); // Load .env first
module.exports = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-2.0-flash",
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      }
    ],
    generationConfig: {
      maxOutputTokens: 2000,
      temperature: 0.7
    }
  },
  merge: {
    backupDir: "./ai-backups",
    maxBackups: 5,
    allowedFileTypes: ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json']
  }
};