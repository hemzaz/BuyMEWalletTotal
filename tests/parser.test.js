const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseBalanceLine, parseBalanceParts, moneyToAgorot, formatAgorot } = require('../parser.js');

test('parses the seven fully available gifts in the screenshot', () => {
  const values = [200, 500, 500, 200, 500, 500, 50];
  const sum = values.map(n => parseBalanceLine(`יתרה למימוש: ₪${n}/₪${n}`))
    .reduce((s, b) => s + b.remaining, 0);
  assert.equal(sum, 245000);
  assert.equal(formatAgorot(sum), '₪2,450');
});

test('partial redemption uses the first number as remaining balance', () => {
  assert.deepEqual(parseBalanceLine('יתרה למימוש: ₪125/₪500'),
    { remaining: 12500, initial: 50000, type: 'pair' });
});

test('handles ILS after number and fractional agorot', () => {
  assert.deepEqual(parseBalanceLine('יתרה למימוש: 72.50₪/200₪'),
    { remaining: 7250, initial: 20000, type: 'pair' });
});

test('rejects an apparently reversed pair rather than silently giving a wrong total', () => {
  assert.equal(parseBalanceLine('יתרה למימוש: ₪500/₪125'), null);
});

test('handles thousands separators', () => {
  assert.equal(moneyToAgorot('1,250.50'), 125050);
  assert.equal(moneyToAgorot('1.250,50'), 125050);
  assert.equal(moneyToAgorot('1,250'), 125000);
  assert.equal(moneyToAgorot('₪200'), 20000);
});

test('does not mistake gift name amounts for the labeled balance', () => {
  assert.equal(parseBalanceLine('BUYME ALL 500 יתירה למימוש: ₪100/₪500'), null);
  assert.deepEqual(parseBalanceLine('BUYME ALL 500 יתרה למימוש: ₪100/₪500').remaining, 10000);
});

test('rejects repeated labels from encompassing multiple cards', () => {
  assert.equal(parseBalanceLine('יתרה למימוש: ₪100/₪100 יתרה למימוש: ₪200/₪200'), null);
});


test('parses the real BUYME HTML text parts, counting bold as remaining', () => {
  assert.deepEqual(parseBalanceParts(' ₪200', '/₪200'),
    { remaining: 20000, initial: 20000, type: 'pair' });
  assert.deepEqual(parseBalanceParts(' ₪73.50', '/₪200'),
    { remaining: 7350, initial: 20000, type: 'pair' });
});

test('uses remaining rather than original across seven HTML rows', () => {
  const amounts = [200, 500, 500, 200, 500, 500, 50];
  const total = amounts.reduce((sum, amount) =>
    sum + parseBalanceParts(` ₪${amount}`, `/₪${amount}`).remaining, 0);
  assert.equal(total, 245000);
});

test('refuses malformed, reversed and ambiguous structured amount fields', () => {
  assert.equal(parseBalanceParts(' ₪500', '/₪200'), null);
  assert.equal(parseBalanceParts(' ₪200', '/₪200 ₪100'), null);
  assert.equal(parseBalanceParts(' ₪200', '₪500'), null);
  assert.equal(parseBalanceParts(' ₪200/₪500', '/₪500'), null);
  assert.equal(parseBalanceParts('200', '/500'), null);
});

test('handles bidi marks and thousands separators in structured amounts', () => {
  assert.deepEqual(parseBalanceParts('\u200f ₪1,234.56', '/₪2,000'),
    { remaining: 123456, initial: 200000, type: 'pair' });
});
