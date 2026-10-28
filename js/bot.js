// Air, Land & Sea — solo Bot.
//
// "rules" / "enhanced": follows the official Bot Rules card exactly where it is
// specific, using its Priority and Choice order everywhere else.
// "smart" (Semiautonomous Bot Rules): the Bot still plays the top card of its
// hand face up, but every "may" / choice is made in the Bot's best interest
// (one-step look-ahead with a simple board evaluation).

(function (root) {
  const E = (typeof module !== 'undefined') ? require('./engine.js') : root.ALS;
  const { def } = E;

  // ------------------------------------------------------------ turn
  function takeTurn(s) {
    const p = s.bot;
    const id = s.hands[p][0];
    const d = def(id);
    const pos = s.order.indexOf(d.theatre);
    const full = s.board[pos][p].length >= 3;
    if (!full || s.opts.length === 'beginner') {
      E.playCard(s, id, pos, true);
      return;
    }
    // Would be a 4th card: try to avert withdrawal.
    const altOK = s.airdropActive[p] || (d.str <= 3 && E.hasFaceUp(s, p, 'aerodrome'));
    if (altOK) {
      const alt = E.botChoiceOrder(s, pos).filter(q => q !== pos && s.board[q][p].length < 3);
      if (alt.length) {
        E.playCard(s, id, alt[0], true);
        return;
      }
    }
    if (d.key === 'redeploy' && s.board[pos][p].some(c => !c.faceUp)) {
      s.botOtterPref = pos;
      E.playCard(s, id, pos, true);
      return;
    }
    E.withdraw(s, p, `The Bot's next animal, ${d.name}, would be a 4th animal on its side of ${s.order[pos][0].toUpperCase() + s.order[pos].slice(1)}, so the Bot withdraws.`);
  }

  // ------------------------------------------------------------ choices (rules bot)
  function rulesChoice(s) {
    const pd = s.pending;
    const p = pd.player;
    const order = E.botChoiceOrder(s, pd.srcPos);
    const loc = (id) => E.find(s, id);

    if (pd.kind === 'flip') {
      // Flip priority: Bot face-down→up, your face-up→down, your face-down→up, Bot face-up→down.
      const cats = [
        c => c.player === p && !c.card.faceUp,
        c => c.player !== p && c.card.faceUp,
        c => c.player !== p && !c.card.faceUp,
        c => c.player === p && c.card.faceUp
      ];
      const cands = pd.options.map(loc);
      for (const cat of cats) {
        for (const pos of order) {
          const hit = cands.find(c => c.pos === pos && cat(c));
          if (hit) return hit.card.id;
        }
      }
      return pd.options[0];
    }
    if (pd.kind === 'reinforce') {
      return order.find(q => pd.options.includes(q));
    }
    if (pd.kind === 'transportCard') {
      for (const pos of order) {
        const st = s.board[pos][p];
        for (let i = st.length - 1; i >= 0; i--) if (pd.options.includes(st[i].id)) return st[i].id;
      }
      return pd.options[0];
    }
    if (pd.kind === 'transportDest') {
      return order.find(q => pd.options.includes(q));
    }
    if (pd.kind === 'redeploy') {
      const pref = s.botOtterPref;
      s.botOtterPref = null;
      const posOrder = pref !== null && pref !== undefined ? [pref].concat(order.filter(q => q !== pref)) : order;
      for (const pos of posOrder) {
        const st = s.board[pos][p];
        for (let i = st.length - 1; i >= 0; i--) if (pd.options.includes(st[i].id)) return st[i].id;
      }
      return pd.options[0];
    }
    return pd.options[0];
  }

  // ------------------------------------------------------------ choices (smart bot)
  function evaluate(s, p) {
    if (s.phase !== 'play' && s.result) {
      const w = s.result.winner === p;
      const pts = s.result.points;
      return (w ? 1000 : -1000) + (w ? pts : -pts) * 10;
    }
    let score = 0;
    for (let pos = 0; pos < 3; pos++) {
      const mine = E.strength(s, pos, p), theirs = E.strength(s, pos, 1 - p);
      const diff = mine - theirs;
      const ctrl = diff > 0 || (diff === 0 && s.first === p);
      score += ctrl ? 12 : -12;
      score += Math.max(-8, Math.min(8, diff));
    }
    score += s.extraTurns[p] * 6 - s.extraTurns[1 - p] * 6;
    return score;
  }

  function settle(c, p) {
    // Let the rules bot answer any follow-up bot choices, stop at the human.
    let guard = 0;
    while (c.phase === 'play' && c.pending && c.pending.kind !== 'turn' && c.pending.player === p && guard++ < 30) {
      E.resolve(c, rulesChoice(c));
    }
  }

  function smartChoice(s) {
    const pd = s.pending;
    const p = s.bot;
    const opts = pd.options.slice();
    if (pd.optional) opts.push(null);
    let best = opts[0], bestScore = -Infinity;
    for (const v of opts) {
      const c = structuredClone(s);
      try {
        E.resolve(c, v);
        settle(c, p);
      } catch (e) { continue; }
      const sc = evaluate(c, p);
      if (sc > bestScore) { bestScore = sc; best = v; }
    }
    return best;
  }

  function choose(s) {
    if (s.opts.botLevel === 'smart') return smartChoice(s);
    return rulesChoice(s);
  }

  // One Bot action: a turn or a decision.
  function step(s) {
    const pd = s.pending;
    if (!pd || pd.player !== s.bot) return false;
    if (pd.kind === 'turn') takeTurn(s);
    else E.resolve(s, choose(s));
    return true;
  }

  const API = { step, takeTurn, choose, rulesChoice, smartChoice, evaluate };
  if (typeof module !== 'undefined') module.exports = API;
  else root.BOT = API;
})(typeof window !== 'undefined' ? window : globalThis);
