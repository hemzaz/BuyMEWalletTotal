const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

test('package.json and manifest.json versions match', () => {
  assert.equal(read('package.json').version, read('manifest.json').version);
});

test('every content script listed in the manifest exists', () => {
  for (const script of read('manifest.json').content_scripts.flatMap(cs => cs.js)) {
    assert.ok(fs.existsSync(path.join(root, script)), `${script} is missing`);
  }
});
