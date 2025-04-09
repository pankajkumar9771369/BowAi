const recast = require('recast');
const types = recast.types;

module.exports = {
  parse(code) {
    return recast.parse(code, {
      parser: require('recast/parsers/typescript')
    });
  },

  findNode(ast, predicate) {
    let result = null;
    types.visit(ast, {
      visitNode(path) {
        if (predicate(path.node)) {
          result = path.node;
          return false;
        }
        this.traverse(path);
      }
    });
    return result;
  }
};