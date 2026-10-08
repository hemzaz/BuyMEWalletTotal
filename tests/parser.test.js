const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, parseBalanceParts, parseGiftCountHeading, moneyToAgorot, formatAgorot } = require('../parser.js');

test('sums the seven fully available gifts in the screenshot', () => {
  const amounts = [200, 500, 500, 200, 500, 500, 50];
  const total = amounts.reduce((sum, amount) =>
    sum + parseBalanceParts(` ₪${amount}`, `/₪${amount}`).remaining, 0);
  assert.equal(total, 245000);
  assert.equal(formatAgorot(total), '₪2,450');
});

test('parses the real BUYME HTML text parts, counting bold as remaining', () => {
  assert.deepEqual(parseBalanceParts(' ₪200', '/₪200'), { remaining: 20000, initial: 20000 });
  assert.deepEqual(parseBalanceParts(' ₪73.50', '/₪200'), { remaining: 7350, initial: 20000 });
});

test('partial redemption uses the bold value as remaining balance', () => {
  assert.deepEqual(parseBalanceParts(' ₪125', '/₪500'), { remaining: 12500, initial: 50000 });
});

test('accepts the shekel sign after the number', () => {
  assert.deepEqual(parseBalanceParts('72.50₪', '/200₪'), { remaining: 7250, initial: 20000 });
});

test('refuses malformed, reversed and ambiguous structured amount fields', () => {
  assert.equal(parseBalanceParts(' ₪500', '/₪200'), null);
  assert.equal(parseBalanceParts(' ₪200', '/₪200 ₪100'), null);
  assert.equal(parseBalanceParts(' ₪200', '₪500'), null);
  assert.equal(parseBalanceParts(' ₪200/₪500', '/₪500'), null);
  assert.equal(parseBalanceParts('200', '/500'), null);
});

test('rejects other currencies', () => {
  assert.equal(parseBalanceParts(' $200', '/$500'), null);
  assert.equal(parseBalanceParts(' €200', '/₪500'), null);
});

test('handles bidi marks and thousands separators in structured amounts', () => {
  assert.deepEqual(parseBalanceParts('\u200f ₪1,234.56', '/₪2,000'),
    { remaining: 123456, initial: 200000 });
});

test('parses Israeli shekel number format only', () => {
  assert.equal(moneyToAgorot('₪200'), 20000);
  assert.equal(moneyToAgorot('1,250'), 125000);
  assert.equal(moneyToAgorot('1,250.50'), 125050);
  assert.equal(moneyToAgorot('12.5'), 1250);
  assert.equal(moneyToAgorot('1250.05'), 125005);
  // European-style or ambiguous separators are refused rather than guessed.
  assert.equal(moneyToAgorot('1.250,50'), null);
  assert.equal(moneyToAgorot('1.250'), null);
  assert.equal(moneyToAgorot('12,50'), null);
  assert.equal(moneyToAgorot(''), null);
});

test('formats agorot as shekels', () => {
  assert.equal(formatAgorot(0), '₪0');
  assert.equal(formatAgorot(7350), '₪73.50');
  assert.equal(formatAgorot(123456), '₪1,234.56');
});

test('normalize strips bidi controls and non-breaking spaces', () => {
  assert.equal(normalize('\u200f\u00a0יתרה למימוש:\u202c '), 'יתרה למימוש:');
  assert.equal(normalize(null), '');
});

test('refuses non-shekel characters instead of stripping them', () => {
  assert.equal(moneyToAgorot('-5'), null);
  assert.equal(moneyToAgorot('$200'), null);
  assert.equal(moneyToAgorot('1 234'), null);
  assert.equal(moneyToAgorot('₪ 200'), 20000);
});

test('reads the gift count heading', () => {
  assert.equal(parseGiftCountHeading('8 מתנות שאפשר לממש'), 8);
  assert.equal(parseGiftCountHeading('‏ 12  מתנות שאפשר לממש '), 12);
  assert.equal(parseGiftCountHeading('מתנה אחת שאפשר לממש'), 1);
  assert.equal(parseGiftCountHeading('8 מתנות שאפשר לממש סינון מתנות'), null);
  assert.equal(parseGiftCountHeading('מתנות שאפשר לממש'), null);
});
