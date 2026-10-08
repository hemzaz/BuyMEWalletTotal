# BUYME Wallet Total v0.2 (prototype)

A Chrome/Edge extension (Manifest V3) that locally sums the **current balances** of the BUYME gift cards already shown on your wallet page.

## Installation

1. Extract the ZIP file to a folder.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the extracted folder (`buyme-wallet-total`).
5. Open or refresh `https://buyme.co.il/myAccount/wallet?status=1`.
6. A card with the total amount and a **פירוט** (details) button appears at the bottom of the screen.

## What gets counted?

- The extension recognizes the exact structure of the `יתרה למימוש` ("balance to redeem") row: the value in `<b>` is the current balance, and the value in `gifts-table__original-text` is the original amount.
- No amounts are collected outside a recognized row, to avoid counting prices, gift names, or duplicate amounts.
- Gifts that have not yet been loaded by scrolling/paging **are not counted**.
- Cards whose row cannot be parsed are reported as a warning instead of being guessed.
- If the list has not loaded yet, `—` is shown.

## Currency

Only Israeli shekels (₪) are supported. Amounts must use the Israeli number format: optional comma thousands separators and a dot decimal point with up to two agorot digits (for example `₪1,234.50`). Anything else is rejected rather than guessed.

## Privacy and permissions

- The extension does not request `cookies`, `storage`, `tabs`, or access to external servers.
- It does not modify BUYME data and makes no network calls.
- Only text already present on the account page is used for the calculation.

## Limitations of v0.2

1. Balance detection is based on real gift-row HTML supplied by the user (`span.gifts-table__text--gray`, `b`, `span.gifts-table__original-text`), but has not yet been tested inside a live BUYME account.
2. A partially redeemed gift still needs to be verified in a live account. Based on the HTML structure, the bold value (`b`) is the current balance, and the `gifts-table__original-text` text is the original value.
3. Summing every gift in the account (including pages that have not loaded) would require scrolling/opening all of them, or a different strategy after examining the site.

## Tests

Run `node --test tests/parser.test.js` inside the extension folder.
