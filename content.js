/* Runs only in the authenticated BUYME tab; reads rendered text, not APIs. */
(() => {
  'use strict';
  const parser = globalThis.BuymeWalletParser;
  if (!parser || globalThis.__buymeWalletTotalRunning) return;
  globalThis.__buymeWalletTotalRunning = true;

  const UI_ID = 'buyme-wallet-total-ext';
  const WALLET_PATH = /\/myaccount\/wallet\/?$/i;
  let host = null;
  let shadow = null;
  let scheduled = null;
  let expanded = false;
  let lastSignature = '';

  function onWallet() {
    return WALLET_PATH.test(location.pathname);
  }

  function isVisible(node) {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el || el.closest(`#${UI_ID}`)) return false;
    if (!el.getClientRects().length) return false;
    if (el.closest('[hidden],[aria-hidden="true"],[inert]')) return false;
    return true;
  }

  function scanBalances() {
    const found = [];
    const usedRows = new Set();
    let labels = 0;

    // Uses the concrete BUYME markup, rather than searching arbitrary text
    // or accidentally counting two figures for each gift.
    const nodes = document.querySelectorAll('span.gifts-table__text.gifts-table__text--gray');
    for (const label of nodes) {
      if (!isVisible(label)) continue;
      const name = (label.textContent || '').replace(/[\u200e\u200f\u061c]/g, '').trim().replace(/[:：]$/, '').trim();
      if (name !== parser.LABEL) continue;
      labels++;

      const row = label.parentElement;
      if (!row || row.tagName !== 'P' || usedRows.has(row)) continue;
      usedRows.add(row);
      if (row.querySelectorAll('span.gifts-table__text--gray').length !== 1) continue;

      const current = row.querySelector(':scope > b');
      const original = row.querySelector(':scope > span.gifts-table__original-text');
      if (!current || !original || !isVisible(current) || !isVisible(original)) continue;
      const balance = parser.parseBalanceParts(current.textContent, original.textContent);
      if (balance) found.push({ element: row, ...balance });
    }

    return { balances: found, labels };
  }

  function ensureUI() {
    if (host?.isConnected) return;
    host = document.createElement('div');
    host.id = UI_ID;
    host.setAttribute('aria-label', 'BUYME Wallet Total');
    shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; position: fixed; z-index: 2147483000; bottom: 18px; left: 18px;
          direction: rtl; font: 14px Arial, sans-serif; color: #23252d; }
        *, *::before, *::after { box-sizing: border-box; }
        .panel { width: min(330px, calc(100vw - 32px)); background: #fff; border: 1px solid #dde1e8;
          border-radius: 15px; box-shadow: 0 9px 30px rgba(0,0,0,.17); padding: 14px 16px; }
        .heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .heading strong { font-size: 13px; color: #424653; }
        .money { font-size: 30px; line-height: 1.3; font-weight: 750; font-variant-numeric: tabular-nums;
          direction: ltr; text-align: right; margin-top: 7px; }
        .sub { color: #586071; font-size: 12px; margin-top: 4px; }
        .warning { color: #935a19; font-size: 12px; margin-top: 8px; }
        button { font: inherit; cursor: pointer; color: #374050; border: 1px solid #d9dfe7;
          background: #f8f9fb; border-radius: 8px; padding: 5px 8px; }
        button:hover { background: #e9edf3; }
        button:focus-visible { outline: 2px solid #287ad4; outline-offset: 2px; }
        .actions { display: flex; align-items: center; gap: 5px; }
        .detail { border-top: 1px solid #ebedf0; margin-top: 10px; padding-top: 10px; }
        .detail[hidden] { display: none; }
        .amounts { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
        .amounts span { color: #3b4351; background: #f1f3f7; padding: 3px 7px; border-radius: 7px;
          direction: ltr; unicode-bidi: isolate; }
        .footnote { font-size: 11px; color: #777e8a; margin-top: 8px; }
        @media (max-width: 480px) { :host { left: 12px; right: 12px; bottom: 10px; }
          .panel { width: 100%; } }
      </style>
      <section class="panel" lang="he" dir="rtl" role="status" aria-live="polite">
        <div class="heading"><strong>🎁 סך יתרות BUYME</strong><div class="actions">
          <button id="details" type="button" aria-expanded="false" title="פירוט המתנות">פירוט</button>
          <button id="hide" type="button" title="מזער">−</button>
        </div></div>
        <div id="body"><div class="money" id="total">—</div><div class="sub" id="count">מחשב…</div>
          <div class="warning" id="warning" hidden></div>
          <div class="detail" id="detail" hidden><strong>יתרות לפי כרטיס</strong><div class="amounts" id="amounts"></div></div>
          <div class="footnote">נספרות רק מתנות שנטענו בעמוד זה. אין שליחת נתונים.</div>
        </div>
      </section>`;
    document.body.appendChild(host);
    shadow.querySelector('#details').addEventListener('click', () => {
      expanded = !expanded;
      shadow.querySelector('#detail').hidden = !expanded;
      shadow.querySelector('#details').setAttribute('aria-expanded', String(expanded));
    });
    shadow.querySelector('#hide').addEventListener('click', () => {
      const body = shadow.querySelector('#body');
      body.hidden = !body.hidden;
      shadow.querySelector('#hide').textContent = body.hidden ? '+' : '−';
      shadow.querySelector('#hide').title = body.hidden ? 'הרחב' : 'מזער';
    });
    lastSignature = '';
  }

  function render({ balances, labels }) {
    ensureUI();
    const total = balances.reduce((sum, item) => sum + item.remaining, 0);
    const signature = `${total}/${labels}/${balances.map(b => b.remaining).join(',')}`;
    if (signature === lastSignature) return;
    lastSignature = signature;
    shadow.querySelector('#total').textContent = balances.length ? parser.formatAgorot(total) : '—';
    shadow.querySelector('#count').textContent = balances.length
      ? `${balances.length} מתנות עם יתרה מזוהה`
      : 'טרם נמצאו מתנות עם יתרה כספית';
    const missing = Math.max(0, labels - balances.length);
    const warning = shadow.querySelector('#warning');
    warning.hidden = !missing && !!balances.length;
    warning.textContent = missing
      ? `${missing} שורות יתרה לא פוענחו. הסכום עשוי להיות חלקי.`
      : 'לא זוהו שורות יתרה. ייתכן שהרשימה עדיין נטענת או שהאתר השתנה.';
    const amounts = shadow.querySelector('#amounts');
    amounts.replaceChildren();
    for (const item of balances) {
      const chip = document.createElement('span');
      chip.textContent = parser.formatAgorot(item.remaining);
      amounts.appendChild(chip);
    }
  }

  function update() {
    scheduled = null;
    if (!onWallet()) {
      if (host) host.remove();
      host = shadow = null;
      lastSignature = '';
      return;
    }
    if (document.body) render(scanBalances());
  }

  function schedule() {
    if (scheduled !== null) return;
    scheduled = setTimeout(update, 200);
  }

  function ownMutation(mutation) {
    const target = mutation.target.nodeType === Node.ELEMENT_NODE
      ? mutation.target : mutation.target.parentElement;
    if (target?.closest?.(`#${UI_ID}`)) return true;
    const added = [...(mutation.addedNodes || [])];
    const removed = [...(mutation.removedNodes || [])];
    return added.concat(removed).length > 0 &&
      added.concat(removed).every(n => n === host || n.parentElement?.closest?.(`#${UI_ID}`));
  }

  const observer = new MutationObserver(mutations => {
    if (mutations.some(m => !ownMutation(m))) schedule();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('popstate', schedule);
  window.addEventListener('pageshow', schedule);
  schedule();
})();
