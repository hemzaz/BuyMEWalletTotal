/* Pure balance parsing utilities. No network calls, cookies, or storage. */
(function (root) {
  'use strict';

  const LABEL = 'יתרה למימוש';
  const MONEY = '(?:\\d{1,3}(?:[,.]\\d{3})+(?:[,.]\\d{1,2})?|\\d+(?:[,.]\\d{1,2})?)';
  const CURRENCY = '(?:₪|ש[״\"׳\']?ח)';
  const amountWithCurrency = `(?:${CURRENCY}\\s*)?(${MONEY})(?:\\s*${CURRENCY})?`;
  const PAIR_RE = new RegExp(`^\\s*[:：]?\\s*${amountWithCurrency}\\s*[/⁄]\\s*${amountWithCurrency}`, 'u');
  const SINGLE_RE = new RegExp(`^\\s*[:：]?\\s*${amountWithCurrency}(?![\\d.,/⁄])`, 'u');

  function moneyToAgorot(input) {
    let value = String(input ?? '').replace(/[^\d,.]/g, '');
    if (!value) return null;
    const commas = (value.match(/,/g) || []).length;
    const dots = (value.match(/\./g) || []).length;

    if (commas && dots) {
      // Treat the rightmost punctuation as a decimal separator.
      const last = Math.max(value.lastIndexOf(','), value.lastIndexOf('.'));
      value = value.slice(0, last).replace(/[.,]/g, '') + '.' + value.slice(last + 1);
    } else if (commas || dots) {
      const mark = commas ? ',' : '.';
      const segments = value.split(mark);
      if (segments.length > 2 || (segments.length === 2 && segments[1].length === 3)) {
        value = segments.join('');
      } else if (segments.length === 2) {
        value = segments.join('.');
      }
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
    const agorot = Math.round(Number(value) * 100);
    return Number.isSafeInteger(agorot) ? agorot : null;
  }

  function parseBalanceLine(raw) {
    // Ignore bidi controls that can appear in Israeli RTL pages.
    const text = String(raw ?? '').replace(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g, ' ')
      .replace(/\u00a0/g, ' ');
    const labelPos = text.indexOf(LABEL);
    if (labelPos === -1 || text.indexOf(LABEL, labelPos + LABEL.length) !== -1) return null;
    const after = text.slice(labelPos + LABEL.length).trimStart();
    if (after.length > 160) return null;
    const pair = PAIR_RE.exec(after);
    if (pair) {
      const remaining = moneyToAgorot(pair[1]);
      const initial = moneyToAgorot(pair[2]);
      // Never guess if the apparent remaining balance is larger than the initial amount.
      if (remaining === null || initial === null || remaining > initial) return null;
      return { remaining, initial, type: 'pair' };
    }
    const single = SINGLE_RE.exec(after);
    if (single && (after.includes('₪') || /ש[״"׳']?ח/u.test(after))) {
      const remaining = moneyToAgorot(single[1]);
      return remaining === null ? null : { remaining, initial: null, type: 'single' };
    }
    return null;
  }

  // Extract values from the actual wallet row structure:
  // <p><span>יתרה למימוש:</span><b> ₪200</b><span class="gifts-table__original-text">/₪500</span></p>
  // The bold value is the remaining balance; the last span is the original amount.
  function parseBalanceParts(boldText, originalText) {
    const clean = s => String(s ?? '')
      .replace(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g, '')
      .replace(/\u00a0/g, ' ').trim();
    const remainingText = clean(boldText);
    const original = clean(originalText);
    if (!original.startsWith('/')) return null;
    const originalAmountText = original.slice(1).trim();
    const fieldRe = new RegExp(`^(?:₪\\s*)?(${MONEY})(?:\\s*₪)?$`, 'u');
    const remainingMatch = fieldRe.exec(remainingText);
    const originalMatch = fieldRe.exec(originalAmountText);
    if (!remainingMatch || !originalMatch ||
        (!remainingText.includes('₪') && !originalAmountText.includes('₪'))) return null;
    const remaining = moneyToAgorot(remainingMatch[1]);
    const initial = moneyToAgorot(originalMatch[1]);
    if (remaining === null || initial === null || remaining > initial) return null;
    return { remaining, initial, type: 'pair' };
  }

  function formatAgorot(agorot) {
    const whole = Number.isInteger(agorot / 100);
    return `₪${(agorot / 100).toLocaleString('he-IL', {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2
    })}`;
  }

  const api = Object.freeze({ LABEL, moneyToAgorot, parseBalanceLine, parseBalanceParts, formatAgorot });
  root.BuymeWalletParser = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
