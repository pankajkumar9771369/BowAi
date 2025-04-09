const diff = require('diff');

module.exports = {
  generateDiff(original, modified) {
    return diff.diffLines(original, modified);
  },

  verifyChanges(original, modified) {
    const changes = this.generateDiff(original, modified);
    const added = changes.filter(c => c.added).length;
    const removed = changes.filter(c => c.removed).length;
    
    return {
      isSafe: (added + removed) / changes.length < 0.5,
      changesCount: changes.length
    };
  }
};