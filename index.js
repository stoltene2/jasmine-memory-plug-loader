let recast = require('recast');
let types = require('ast-types');

module.exports = function (source, map) {
  try {
    this.callback(null, insertAfterEach(source), map);
  }
  catch (e) {
    this.callback(e, null, null);
  }

  function insertAfterEach(source) {
    let ast = recast.parse(source);

    types.visit(ast, {
      visitCallExpression: function (path) {
        const node = path.node;

        if (this.isDescribeExpression(node)) {
          let declaredIds = getDeclaredIds(node);

          let afterEachAst = recast.parse(createAfterEach(declaredIds));

          if (declaredIds.length > 0) {
            node.arguments[1].body.body.push(afterEachAst.program.body[0]);
          }
        }

        this.traverse(path);
      },

      isDescribeExpression: function (node) {
        return node.type === 'CallExpression' &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'describe';
      }
    });

    return recast.print(ast).code;
  }

  function getDeclaredIds(node) {
    return node.arguments[1].body.body.reduce((acc, line) => {
      if (line.type === 'VariableDeclaration' && line.kind !== 'const') {
        return [...acc, ...line.declarations.map(declaration => declaration.id.name)];
      }
      return acc;

    }, []);
  }

  function createAfterEach(identifiers) {
    let body = `// generated by jasmine-memory-plug
    afterAll(function() {\n`;

    identifiers.forEach(identifier => {
      body = body + (`      ${identifier} = null;\n`);
    });

    return body + '    });';
  }
};