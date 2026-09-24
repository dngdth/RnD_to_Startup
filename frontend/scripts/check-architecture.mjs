import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const src = resolve('src');
const rules = {
  domain: new Set(['domain']),
  application: new Set(['application', 'domain']),
  infrastructure: new Set(['infrastructure', 'application', 'domain']),
  presentation: new Set(['presentation', 'application', 'domain', 'components', 'data', 'assets']),
};

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

let violations = 0;
for (const [layer, allowed] of Object.entries(rules)) {
  for (const file of files(join(src, layer))) {
    const code = readFileSync(file, 'utf8');
    const imports = code.matchAll(/\b(?:from|import)\s*['"](\.[^'"]+)['"]/g);
    for (const [, specifier] of imports) {
      const target = resolve(dirname(file), specifier);
      const relativeTarget = relative(src, target);
      const targetLayer = relativeTarget.split(sep)[0];
      if (relativeTarget.startsWith('..') || !allowed.has(targetLayer)) {
        console.error(`${relative(src, file)}: ${layer} cannot import ${specifier}`);
        violations += 1;
      }
    }
  }
}

if (violations) process.exit(1);
console.log('Frontend layer boundaries passed.');
