/* Pure balance parsing utilities. No network calls, cookies, or storage. */
(function (root) {
  'use strict';

  const LABEL = 'יתרה למימוש';
  // Israeli shekel format: optional comma thousands separators, dot decimal point, up to 2 agorot digits.
  const MONEY = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?';
  const MONEY_RE = new RegExp(`^${MONEY}$`);
  const FIELD_RE = new RegExp(`^(?:₪\\s*)?(${MONEY})(?:\\s*₪)?$`, 'u');
  const BIDI_RE = /[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g;

  // Strips bidi controls that appear in Israeli RTL pages and normalizes non-breaking spaces.
  function normalize(input) {
    return String(input ?? '').replace(BIDI_RE, '').replace(/\u00a0/g, ' ').trim();
  }

  function moneyToAgorot(input) {
    const value = String(input ?? '').replace(/₪/g, '').trim();
    if (!MONEY_RE.test(value)) return null;
    const agorot = Math.round(Number(value.replace(/,/g, '')) * 100);
    return Number.isSafeInteger(agorot) ? agorot : null;
  }

  // Extract values from the actual wallet row structure:
  // <p><span>יתרה למימוש:</span><b> ₪200</b><span class="gifts-table__original-text">/₪500</span></p>
  // The bold value is the remaining balance; the last span is the original amount.
  function parseBalanceParts(boldText, originalText) {
    const remainingText = normalize(boldText);
    const original = normalize(originalText);
    if (!original.startsWith('/')) return null;
    const originalAmountText = original.slice(1).trim();
    const remainingMatch = FIELD_RE.exec(remainingText);
    const originalMatch = FIELD_RE.exec(originalAmountText);
    if (!remainingMatch || !originalMatch ||
        (!remainingText.includes('₪') && !originalAmountText.includes('₪'))) return null;
    const remaining = moneyToAgorot(remainingMatch[1]);
    const initial = moneyToAgorot(originalMatch[1]);
    // Never guess if the apparent remaining balance is larger than the initial amount.
    if (remaining === null || initial === null || remaining > initial) return null;
    return { remaining, initial };
  }

  // Reads the wallet heading, e.g. "8 מתנות שאפשר לממש" or "מתנה אחת שאפשר לממש".
  function parseGiftCountHeading(text) {
    const t = normalize(text).replace(/\s+/g, ' ');
    if (t === 'מתנה אחת שאפשר לממש') return 1;
    const m = /^(\d{1,4}) מתנות שאפשר לממש$/u.exec(t);
    return m ? Number(m[1]) : null;
  }

  function formatAgorot(agorot) {
    const whole = agorot % 100 === 0;
    return `₪${(agorot / 100).toLocaleString('he-IL', {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2
    })}`;
  }

  const api = Object.freeze({
    LABEL, normalize, moneyToAgorot, parseBalanceParts, parseGiftCountHeading, formatAgorot
  });
  root.BuymeWalletParser = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
