const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('../config/ai.config');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.gemini.model,
      safetySettings: config.gemini.safetySettings
    });
  }

  async generateContent(prompt, context = "") {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
    const result = await this.model.generateContent(fullPrompt);
    return (await result.response).text();
  }
}

module.exports = new GeminiService();