# BUYME Wallet Total v0.2 (prototype)

A Chrome/Edge extension (Manifest V3) that locally sums the **current balances** of the BUYME gift cards already shown on your wallet page.

## Installation

1. Get the extension files, either way:
   - **From source:** `git clone git@github.com:hemzaz/BuyMEWalletTotal.git`
   - **From a release ZIP:** extract `buyme-wallet-total-v<version>.zip` to a folder.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the folder that contains `manifest.json` (the cloned repo or the extracted ZIP folder).
5. Open or refresh `https://buyme.co.il/myAccount/wallet?status=1`.
6. A card with the total amount and a **פירוט** (details) button appears at the bottom of the screen.

After pulling new changes, click the reload icon on the extension's card in `chrome://extensions` and refresh the BUYME tab.

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

## Development

No dependencies or build step are required; Node.js 18+ is only needed for tests and packaging.

| Command | What it does |
|---|---|
| `npm test` | Runs all tests in `tests/` with the built-in Node test runner. |
| `npm run pack` | Runs the tests, then writes `dist/buyme-wallet-total-v<version>.zip` containing only the extension files (`manifest.json`, `parser.js`, `content.js`). |

When bumping the version, update it in both `manifest.json` and `package.json`; a test fails if they differ.
