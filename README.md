# Air, Land & Sea: Critters (p5.js)

A mobile-friendly, accessible p5.js version of *Air, Land & Sea: Critters* using the print-and-play card art.


[Production url](https://chaoaj.github.io/airlandsea/)

## Modes
- **1 player vs. the Bot** — follows the official *Bot Rules* card (Bot is always 1st player, plays the top card of its hand face up, withdraws on a 4th card, Priority & Choice order, flip priority, Blockade redirect).
  - *Bot Rules + Difficulty Enhancement* — Bot adds 1–2 deck cards when it loses 2–3 habitats.
  - *Semiautonomous Bot* — same play rules, but it makes its best choice for every ability.
- **2 players on one device** — pass-and-play with optional hidden-hand screens.
- Game length: standard (12 pts), long (18 pts), beginner (first to 3 battles, no withdrawing).
- Variant: Seahorse moves only uncovered animals (designer suggested).

## Accessibility (WCAG 2.2 AA / Section 508)
- The canvas is decorative to assistive tech; every card, habitat and target has a real `<button>` positioned over it with a full text label (name, side, face, strength, covered/uncovered, ability).
- Every choice is also offered as a large button in the action bar (44 px targets).
- Full keyboard play (Tab / Enter / Space / Escape), visible focus rings, native modal dialogs.
- Game events announced through an `aria-live` region; full game log; "Text view" table of the board.
- Bot speed setting including a "wait for Continue" mode (no time pressure).
- Legal targets use dashed outlines + labels, never colour alone. Card images are drawn unmodified so colours match the printed cards.
- Respects `prefers-reduced-motion`; forced-colors support. Checked with axe-core (0 violations).

## Files
- `index.html`, `style.css`, `sketch.js` — p5.js UI
- `js/cards.js` — card data (text transcribed from the cards)
- `js/engine.js` — rules engine (serialisable state)
- `js/bot.js` — solo Bot
- `js/rules-text.js` — in-game rules
- `assets/cards/` — card images from the print-and-play; `assets/docs/` — rules PDFs
