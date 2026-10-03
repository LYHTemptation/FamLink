const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const standardGlobals = new Set([
  // JS Built-ins
  'console', 'Math', 'Date', 'JSON', 'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet',
  'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'window', 'document', 'navigator', 'fetch', 'FormData', 'Blob', 'File', 'FileReader', 'URL', 'URLSearchParams', 'Headers', 'Request', 'Response',
  'btoa', 'atob', 'escape', 'unescape',
  'process', 'global', 'Buffer', 'alert', 'confirm', 'prompt', 'Intl', 'isNaN', 'isFinite', 'parseInt', 'parseFloat',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'require', 'module', 'exports', '__dirname', '__filename',
  '__DEV__'
]);

function getFiles(dir, exts = ['.js', '.jsx', '.ts', '.tsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.expo' && file !== 'dist') {
        results = results.concat(getFiles(fullPath, exts));
      }
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const filesToCheck = [
  'App.js',
  ...getFiles('components'),
  ...getFiles('lib'),
  ...getFiles('services'),
  ...getFiles('utils')
];

let hasErrors = false;

console.log(`🔍 Checking ${filesToCheck.length} source files for syntax & undefined references...\n`);

for (const filePath of filesToCheck) {
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  } catch (err) {
    console.error(`❌ Syntax error in ${filePath}: ${err.message}`);
    hasErrors = true;
    continue;
  }

  const undeclared = new Map();

  try {
    traverse(ast, {
      ReferencedIdentifier(p) {
        const name = p.node.name;
        if (standardGlobals.has(name)) return;
        
        // Ignore JSX namespace tags (e.g., Svg.Path) or typeof checks
        if (p.parentPath.isTypeQuery?.()) return;

        if (!p.scope.hasBinding(name)) {
          if (!undeclared.has(name)) {
            undeclared.set(name, []);
          }
          undeclared.get(name).push(p.node.loc?.start?.line || 0);
        }
      }
    });
  } catch (err) {
    console.error(`⚠️ Traverse error in ${filePath}: ${err.message}`);
    continue;
  }

  if (undeclared.size > 0) {
    console.error(`🚨 Undefined references in ${filePath}:`);
    for (const [name, lines] of undeclared.entries()) {
      console.error(`   - ${name} (line ${lines.slice(0, 5).join(', ')}${lines.length > 5 ? '...' : ''})`);
    }
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\n❌ Static analysis found potential ReferenceErrors!');
  process.exit(1);
} else {
  console.log('\n✨ All files passed static verification! No undeclared variables or syntax errors found.');
  process.exit(0);
}
