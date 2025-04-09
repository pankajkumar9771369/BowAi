const { GoogleGenerativeAI } = require("@google/generative-ai");
const recast = require('recast');
const diff = require('diff');
const fs = require('fs');
const path = require('path');
const config = require('../config/ai.config');
const babelParser = require('@babel/parser');

class AICoderService {
  constructor() {
    // Initialize Google Gemini AI
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.gemini.model,
      safetySettings: config.gemini.safetySettings,
      generationConfig: config.gemini.generationConfig
    });
    
    // Setup file system and parser configurations
    this.backupDir = config.merge.backupDir;
    this.ensureBackupDir();
    
    // Configure parser with proper Babel settings
    this.parserOptions = {
      parser: {
        parse: (code) => babelParser.parse(code, {
          sourceType: 'unambiguous',
          allowImportExportEverywhere: true,
          plugins: [
            'jsx',
            'classProperties',
            'objectRestSpread',
            'decorators-legacy'
          ],
          tokens: true
        })
      },
      tabWidth: 2,
      lineTerminator: '\n',
      reuseWhitespace: false
    };
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async getAIResponse(prompt, context = "") {
    try {
      const fullPrompt = `CONTEXT:\n${context}\n\nINSTRUCTION:\n${prompt}\n\nRespond ONLY with code.`;
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      
      if (!response.text) {
        throw new Error('Empty response from AI model');
      }
      
      return response.text();
    } catch (error) {
      console.error('AI Response Error:', error);
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }

  async surgicalMerge(fileId, original, modified, range = null) {
    // Validate inputs
    if (!original || !modified) {
      throw new Error('Original and modified code must be provided');
    }

    const backupPath = path.join(this.backupDir, `${fileId}-${Date.now()}.bak`);
    
    try {
      fs.writeFileSync(backupPath, original);

      if (!range) {
        return {
          mergedCode: modified,
          diff: diff.diffLines(original, modified),
          backupPath
        };
      }

      // Parse and validate both code versions
      const originalAST = this.parseCode(original);
      const modifiedAST = this.parseCode(modified);
      
      // Perform the merge
      const merged = this.mergeAST(originalAST, modifiedAST, range);
      
      // Validate merge result
      if (merged.length > original.length * 3) {
        throw new Error('Merge resulted in abnormally large output');
      }

      return {
        mergedCode: merged,
        diff: diff.diffLines(original, merged),
        backupPath
      };
    } catch (error) {
      // Clean up backup file if merge failed
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      throw new Error(`Merge failed: ${error.message}`);
    }
  }

  parseCode(code) {
    if (typeof code !== 'string' || code.length === 0) {
      throw new Error('Invalid code input');
    }

    try {
      const ast = recast.parse(code, this.parserOptions);
      this.validateAST(ast);
      return ast;
    } catch (error) {
      throw new Error(`Code parsing failed: ${error.message}`);
    }
  }

  mergeAST(originalAST, modifiedAST, range) {
    this.validateAST(originalAST);
    this.validateAST(modifiedAST);

    const merged = JSON.parse(JSON.stringify(originalAST));
    const modifiedNode = this.getValidModifiedNode(modifiedAST);
    let replacementCount = 0;

    recast.visit(merged, {
      visitNode(path) {
        try {
          if (replacementCount > 0) return false;
          
          const node = path.node;
          if (node.loc && 
              node.loc.start.line >= range.startLine && 
              node.loc.end.line <= range.endLine) {
            
            // Clone node to avoid reference issues
            const newNode = JSON.parse(JSON.stringify(modifiedNode));
            
            // Preserve original formatting and location
            newNode.comments = node.comments || [];
            newNode.loc = node.loc;
            
            path.replace(newNode);
            replacementCount++;
            return false;
          }
          return this.traverse(path);
        } catch (err) {
          throw new Error(`AST traversal error at line ${path?.node?.loc?.start?.line}: ${err.message}`);
        }
      }
    });

    return this.printAST(merged);
  }

  validateAST(ast) {
    if (!ast || typeof ast !== 'object') {
      throw new Error('AST must be an object');
    }
    if (!ast.program || !Array.isArray(ast.program.body)) {
      throw new Error('Invalid AST structure - missing program body');
    }
  }

  getValidModifiedNode(modifiedAST) {
    if (!modifiedAST.program.body[0]) {
      throw new Error('Modified code has no valid body elements');
    }
    
    const node = modifiedAST.program.body[0];
    if (!node.type) {
      throw new Error('Modified node has no type property');
    }
    
    return node;
  }

  printAST(ast) {
    try {
      const result = recast.print(ast, {
        ...this.parserOptions,
        lineTerminator: '\n'
      });
      
      if (typeof result.code !== 'string') {
        throw new Error('Code generation returned invalid output');
      }
      
      return result.code;
    } catch (error) {
      throw new Error(`Code generation failed: ${error.message}`);
    }
  }
}

module.exports = new AICoderService();