// Air, Land & Sea: Critters — rules engine.
//
// The whole game lives in one plain, JSON-serialisable state object so it can
// be cloned (structuredClone) for the semiautonomous bot's look-ahead.
//
// Flow: the engine runs until it needs a decision, then sets `s.pending`:
//   { kind: 'turn', player }                     – choose a card to play / withdraw
//   { kind: 'flip' | 'reinforce' | 'transportCard' | 'transportDest' | 'redeploy',
//     player, src, options: [...], optional }    – resolve an ability choice
// The UI (or the bot) answers with playCard / withdraw / resolve.
//
// Rule notes (from the Compressed Rules v1.2, first-edition clarifications,
// which the critter cards are based on):
//  • Flips from Mallard (Maneuver), Snake (Ambush) and Fox (Disrupt) only
//    target uncovered cards.
//  • Octopus (Blockade) applies when ANY player plays into an adjacent habitat.
//  • Vulture (Containment) discards = destroy (bottom of deck, face down).
//  • Containment and Blockade are triggered by Rabbit (Reinforce) plays, but
//    not by flips or moves.
//  • Instant abilities that trigger while another is resolving queue up and
//    resolve in order once the current one has fully resolved.

(function (root) {
  // In the browser cards.js defines CARD_DEFS / THEATRE_LABEL as globals.
  // eslint-disable-next-line no-undef
  const C = (typeof module !== 'undefined') ? require('./cards.js') : { DEFS: CARD_DEFS, LABEL: THEATRE_LABEL };
  const DEFS_ = C.DEFS || C.CARD_DEFS, LABEL_ = C.LABEL || C.THEATRE_LABEL;

  const OFFSET_INSTANT = (id) => DEFS_[id].type === 'instant';

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------------------------------------------------------------- setup
  function newGame(opts) {
    const o = Object.assign({
      mode: 'bot',            // 'bot' | 'hotseat'
      length: 'standard',     // 'standard' (12) | 'long' (18) | 'beginner' (3 battle wins)
      botLevel: 'rules',      // 'rules' | 'enhanced' | 'smart'
      transportUncovered: false,
      names: null
    }, opts || {});
    const names = o.names || (o.mode === 'bot' ? ['You', 'Bot'] : ['Player 1', 'Player 2']);
    const s = {
      opts: o,
      names,
      bot: o.mode === 'bot' ? 1 : -1,
      scores: [0, 0],
      battleWins: [0, 0],
      battle: 0,
      order: shuffle(['air', 'land', 'sea']),
      first: o.mode === 'bot' ? 1 : (Math.random() < 0.5 ? 0 : 1),
      log: [],
      phase: 'play',
      result: null
    };
    startBattle(s);
    return s;
  }

  function startBattle(s) {
    s.battle++;
    s.deck = shuffle(DEFS_.map(c => c.id));
    s.hands = [[], []];
    for (let i = 0; i < 6; i++) {
      s.hands[s.first].push(s.deck.shift());
      s.hands[1 - s.first].push(s.deck.shift());
    }
    s.board = [[[], []], [[], []], [[], []]]; // board[pos][player] = stack bottom→top
    s.airdropArmed = [false, false];
    s.airdropActive = [false, false];
    s.extraTurns = [0, 0];
    s.steps = [];
    s.triggers = [];
    s.pending = null;
    s.current = s.first;
    s.turnActive = false;
    s.turnNo = 0;
    s.phase = 'play';
    s.result = null;
    s.lastPlayed = null;
    s.botOtterPref = null;
    log(s, `Battle ${s.battle} begins. Habitats from left to right: ${s.order.map(t => LABEL_[t]).join(', ')}. ${s.names[s.first]} ${s.names[s.first] === 'You' ? 'are' : 'is'} 1st player and wins tied habitats.`, 'battle');
    beginTurn(s);
  }

  function log(s, text, tag) {
    s.log.push({ n: s.log.length, text, tag: tag || '' });
  }

  // ---------------------------------------------------------------- queries
  const isBot = (s, p) => s.bot === p;
  const other = (p) => 1 - p;
  const def = (id) => DEFS_[id];

  function adjacent(pos) {
    return [pos - 1, pos + 1].filter(q => q >= 0 && q <= 2);
  }

  function find(s, id) {
    for (let pos = 0; pos < 3; pos++) {
      for (let p = 0; p < 2; p++) {
        const st = s.board[pos][p];
        const i = st.findIndex(c => c.id === id);
        if (i >= 0) return { pos, player: p, index: i, card: st[i], covered: i < st.length - 1 };
      }
    }
    return null;
  }

  function allCards(s) {
    const out = [];
    for (let pos = 0; pos < 3; pos++) for (let p = 0; p < 2; p++) {
      s.board[pos][p].forEach((c, i, st) => out.push({ pos, player: p, index: i, card: c, covered: i < st.length - 1 }));
    }
    return out;
  }

  function hasFaceUp(s, p, key) {
    for (let pos = 0; pos < 3; pos++) {
      if (s.board[pos][p].some(c => c.faceUp && def(c.id).key === key)) return true;
    }
    return false;
  }
  const anyFaceUp = (s, key) => hasFaceUp(s, 0, key) || hasFaceUp(s, 1, key);

  // Effective strength of each card in a stack, plus the side total.
  function cardStrengths(s, pos, p) {
    const st = s.board[pos][p];
    const esc = hasFaceUp(s, p, 'escalation');
    return st.map((c, i) => {
      let v = c.faceUp ? def(c.id).str : (esc ? 4 : 2);
      const coveredByBoar = st.slice(i + 1).some(x => x.faceUp && def(x.id).key === 'coverfire');
      if (coveredByBoar) v = 4;
      return v;
    });
  }

  function supportBonus(s, pos, p) {
    let b = 0;
    for (const q of adjacent(pos)) {
      if (s.board[q][p].some(c => c.faceUp && def(c.id).key === 'support')) b += 3;
    }
    return b;
  }

  function strength(s, pos, p) {
    return cardStrengths(s, pos, p).reduce((a, b) => a + b, 0) + supportBonus(s, pos, p);
  }

  function controller(s, pos) {
    const a = strength(s, pos, 0), b = strength(s, pos, 1);
    if (a === b) return s.first;
    return a > b ? 0 : 1;
  }

  function legalPlays(s, p, id) {
    const d = def(id);
    const out = [];
    const anyHabitat = s.airdropActive[p] || (d.str <= 3 && hasFaceUp(s, p, 'aerodrome'));
    for (let pos = 0; pos < 3; pos++) {
      out.push({ pos, faceUp: false });
      if (s.order[pos] === d.theatre || anyHabitat) out.push({ pos, faceUp: true });
    }
    return out;
  }

  function canPlayFaceUp(s, p, id, pos) {
    return legalPlays(s, p, id).some(m => m.pos === pos && m.faceUp);
  }

  function withdrawPoints(s, p) {
    const h = s.hands[p].length;
    if (p === s.first) return h >= 4 ? 2 : h >= 2 ? 3 : h === 1 ? 4 : 6;
    return h >= 5 ? 2 : h >= 3 ? 3 : h === 2 ? 4 : 6;
  }

  function target(s) {
    return s.opts.length === 'long' ? 18 : 12;
  }

  // ---------------------------------------------------------------- turn flow
  function beginTurn(s) {
    if (s.phase !== 'play') return;
    if (s.hands[0].length === 0 && s.hands[1].length === 0) {
      endBattle(s, 'cards');
      return;
    }
    if (s.hands[s.current].length === 0) {
      s.extraTurns[s.current] = 0;
      s.current = other(s.current);
    }
    const p = s.current;
    s.airdropActive[p] = s.airdropArmed[p];
    s.airdropArmed[p] = false;
    s.turnActive = true;
    s.pending = { kind: 'turn', player: p };
  }

  function endTurn(s) {
    const p = s.current;
    s.turnActive = false;
    s.airdropActive[p] = false;
    let next = other(p);
    if (s.extraTurns[p] > 0) {
      s.extraTurns[p]--;
      next = p;
      log(s, `${s.names[p]} take${p === 0 && s.names[0] === 'You' ? '' : 's'} an extra turn.`);
    }
    s.current = next;
    s.turnNo++;
    beginTurn(s);
  }

  function playCard(s, id, pos, faceUp) {
    const p = s.pending && s.pending.kind === 'turn' ? s.pending.player : null;
    if (p === null) throw new Error('Not waiting for a turn');
    const hi = s.hands[p].indexOf(id);
    if (hi < 0) throw new Error('Card not in hand');
    if (faceUp && !canPlayFaceUp(s, p, id, pos)) throw new Error('Illegal face-up play');
    s.hands[p].splice(hi, 1);
    s.pending = null;
    s.steps.push({ t: 'place', id, player: p, pos, faceUp, src: 'hand' });
    run(s);
  }

  function withdraw(s, p, reason) {
    if (s.phase !== 'play') return;
    if (p === undefined) p = s.pending ? s.pending.player : s.current;
    s.pending = null;
    s.steps = [];
    s.triggers = [];
    endBattle(s, 'withdraw', p, reason);
  }

  function resolve(s, value) {
    const pd = s.pending;
    if (!pd || pd.kind === 'turn') throw new Error('No decision pending');
    if (value === null && !pd.optional) throw new Error('Decision is required');
    if (value !== null && !pd.options.includes(value)) throw new Error('Invalid option');
    s.pending = null;
    const R = RESOLVERS[pd.kind];
    R(s, pd, value);
    run(s);
  }

  function run(s) {
    let guard = 0;
    while (!s.pending && s.phase === 'play') {
      if (++guard > 500) throw new Error('Engine loop guard');
      if (s.steps.length) { exec(s, s.steps.shift()); continue; }
      if (s.triggers.length) { expandAbility(s, s.triggers.shift()); continue; }
      if (s.turnActive) { endTurn(s); continue; }
      break;
    }
  }

  // ---------------------------------------------------------------- steps
  function sideName(s, p) { return s.names[p]; }
  function verb(s, p, base) { // "You play" vs "Bot plays"
    return s.names[p] === 'You' ? base : base + 's';
  }

  function destroy(s, id, why) {
    const f = find(s, id);
    if (f) s.board[f.pos][f.player].splice(f.index, 1);
    s.deck.push(id);
    log(s, why);
  }

  function botWithdrawOn(s, id, pos, kind) {
    if (s.opts.length === 'beginner') return false; // beginner variant: no withdrawing
    if (!isBot(s, s.bot)) return false;
    s.hands[s.bot].push(id);
    withdraw(s, s.bot, `The Bot tried to ${kind} a 4th animal into its side of ${LABEL_[s.order[pos]]} and withdraws.`);
    return true;
  }

  function exec(s, st) {
    switch (st.t) {
      case 'place': return execPlace(s, st);
      case 'flip': return execFlip(s, st);
      case 'move': return execMove(s, st);
      case 'decide': return execDecide(s, st);
      default: throw new Error('Unknown step ' + st.t);
    }
  }

  function execPlace(s, st) {
    const { id, player: p, pos, faceUp } = st;
    const stack = s.board[pos][p];
    const hab = LABEL_[s.order[pos]];
    // Bot withdrawal for plays not chosen at turn start (Reinforce, Blockade redirect).
    if (isBot(s, p) && st.src !== 'hand' && stack.length >= 3) {
      if (botWithdrawOn(s, id, pos, 'play')) return;
    }
    const totalBefore = s.board[pos][0].length + s.board[pos][1].length;
    stack.push({ id, faceUp, owner: p });
    s.lastPlayed = id;
    const what = faceUp ? `${def(id).name} (${def(id).str}) face up` : 'an animal face down';
    if (st.src === 'deck') log(s, `${sideName(s, p)} ${verb(s, p, 'play')} the top animal of the deck face down to ${hab}.`);
    else if (st.src === 'redirect') log(s, `Bot rule: instead of discarding it, the Bot places that animal face down in ${hab}.`);
    else log(s, `${sideName(s, p)} ${verb(s, p, 'play')} ${what} to ${hab}.`);

    // Containment (Vulture)
    if (!faceUp && anyFaceUp(s, 'containment')) {
      destroy(s, id, `Vulture discards the face-down animal played to ${hab}.`);
      return;
    }
    // Blockade (Octopus) — adjacent habitat already holding 3+ animals.
    const blockaded = totalBefore >= 3 && adjacent(pos).some(q =>
      s.board[q][0].concat(s.board[q][1]).some(c => c.faceUp && def(c.id).key === 'blockade'));
    if (blockaded) {
      if (isBot(s, p) && st.src !== 'redirect') {
        stack.pop();
        const order = botChoiceOrder(s, pos).filter(q => adjacent(pos).includes(q));
        log(s, `Octopus blocks the play to ${hab}.`);
        s.steps.unshift({ t: 'place', id, player: p, pos: order[0], faceUp: false, src: 'redirect' });
        return;
      }
      destroy(s, id, `Octopus discards the animal played to ${hab} (it already held 3 or more animals) — no effect.`);
      return;
    }
    if (faceUp && OFFSET_INSTANT(id)) s.triggers.push({ id, owner: p });
  }

  function execFlip(s, st) {
    const f = find(s, st.id);
    if (!f) return;
    f.card.faceUp = !f.card.faceUp;
    const hab = LABEL_[s.order[f.pos]];
    const owner = sideName(s, f.player);
    const ownerPoss = owner === 'You' ? 'your' : owner + "'s";
    if (f.card.faceUp) {
      log(s, `${ownerPoss[0].toUpperCase() + ownerPoss.slice(1)} face-down animal in ${hab} is flipped face up: ${def(st.id).name} (${def(st.id).str}).`);
      if (OFFSET_INSTANT(st.id)) s.triggers.push({ id: st.id, owner: f.player });
    } else {
      log(s, `${ownerPoss[0].toUpperCase() + ownerPoss.slice(1)} ${def(st.id).name} in ${hab} is flipped face down.`);
    }
  }

  function execMove(s, st) {
    const f = find(s, st.id);
    if (!f) return;
    const p = f.player;
    if (isBot(s, p) && s.board[st.to][p].length >= 3) {
      s.board[f.pos][p].splice(f.index, 1);
      if (botWithdrawOn(s, st.id, st.to, 'move')) return;
      s.board[f.pos][p].splice(f.index, 0, f.card); // beginner: put back and continue
    }
    s.board[f.pos][p].splice(f.index, 1);
    s.board[st.to][p].push(f.card);
    const name = f.card.faceUp ? def(st.id).name : 'a face-down animal';
    log(s, `${sideName(s, p)} ${verb(s, p, 'move')} ${name} from ${LABEL_[s.order[f.pos]]} to ${LABEL_[s.order[st.to]]}.`);
  }

  function uncoveredIn(s, positions, side) {
    const out = [];
    for (const pos of positions) for (const p of [0, 1]) {
      if (side !== undefined && side !== null && p !== side) continue;
      const st = s.board[pos][p];
      if (st.length) out.push(st[st.length - 1].id);
    }
    return out;
  }

  function execDecide(s, st) {
    let options = [];
    const srcF = find(s, st.src);
    const srcPos = srcF ? srcF.pos : st.srcPos;
    switch (st.kind) {
      case 'flip': {
        const positions = st.scope === 'adjacent' ? adjacent(srcPos) : [0, 1, 2];
        options = uncoveredIn(s, positions, st.side);
        break;
      }
      case 'reinforce':
        if (!s.deck.length) { log(s, 'Rabbit: the deck is empty.'); return; }
        options = adjacent(srcPos);
        break;
      case 'transportCard':
        options = allCards(s).filter(x => x.player === st.player && (!s.opts.transportUncovered || !x.covered)).map(x => x.card.id);
        break;
      case 'transportDest': {
        const f = find(s, st.card);
        if (!f) return;
        options = [0, 1, 2].filter(q => q !== f.pos);
        break;
      }
      case 'redeploy':
        options = allCards(s).filter(x => x.player === st.player && !x.card.faceUp).map(x => x.card.id);
        break;
    }
    if (!options.length) {
      const msgs = {
        flip: `${def(st.src).name}: no animal can be flipped.`,
        transportCard: 'Seahorse: no animal to move.',
        redeploy: 'Otter: no face-down animal to return.'
      };
      if (msgs[st.kind]) log(s, msgs[st.kind]);
      return;
    }
    s.pending = {
      kind: st.kind, player: st.player, src: st.src, srcPos, options,
      optional: !!st.optional, prompt: st.prompt, card: st.card, peek: st.kind === 'reinforce' ? s.deck[0] : undefined
    };
  }

  function expandAbility(s, tr) {
    const { id, owner } = tr;
    const f = find(s, id);
    if (!f) return; // no longer on the board
    const d = def(id);
    const opp = other(owner);
    const S = (o) => Object.assign({ t: 'decide', src: id, srcPos: f.pos }, o);
    switch (d.key) {
      case 'airdrop':
        s.airdropArmed[owner] = true;
        log(s, `Cuckoo: on ${s.names[owner] === 'You' ? 'your' : s.names[owner] + "'s"} next turn, an animal may be played face up to a non-matching habitat.`);
        break;
      case 'maneuver':
        s.steps.unshift(S({ kind: 'flip', player: owner, scope: 'adjacent', side: null,
          prompt: 'Mallard: flip an uncovered animal in an adjacent habitat.' }));
        break;
      case 'ambush':
        s.steps.unshift(S({ kind: 'flip', player: owner, scope: 'any', side: null,
          prompt: 'Snake: flip an uncovered animal in any habitat.' }));
        break;
      case 'disrupt':
        s.steps.unshift(
          S({ kind: 'flip', player: opp, scope: 'any', side: opp,
            prompt: 'Fox: choose and flip 1 of your own uncovered animals.' }),
          S({ kind: 'flip', player: owner, scope: 'any', side: owner,
            prompt: 'Fox: now flip 1 of your own uncovered animals.' })
        );
        break;
      case 'reinforce':
        s.steps.unshift(S({ kind: 'reinforce', player: owner, optional: true,
          prompt: 'Rabbit: you may play the top animal of the deck face down to an adjacent habitat.' }));
        break;
      case 'transport':
        s.steps.unshift(S({ kind: 'transportCard', player: owner, optional: true,
          prompt: 'Seahorse: you may move 1 of your animals to a different habitat. Choose the animal.' }));
        break;
      case 'redeploy':
        s.steps.unshift(S({ kind: 'redeploy', player: owner, optional: !isBot(s, owner),
          prompt: 'Otter: return 1 of your face-down animals to your hand to gain an extra turn.' }));
        break;
    }
  }

  const RESOLVERS = {
    flip(s, pd, v) {
      if (v === null) return;
      s.steps.unshift({ t: 'flip', id: v });
    },
    reinforce(s, pd, v) {
      if (v === null) { log(s, `${s.names[pd.player]} ${verb(s, pd.player, 'leave')} the top animal on the deck.`); return; }
      const id = s.deck.shift();
      s.steps.unshift({ t: 'place', id, player: pd.player, pos: v, faceUp: false, src: 'deck' });
    },
    transportCard(s, pd, v) {
      if (v === null) { log(s, 'Seahorse: no animal moved.'); return; }
      s.steps.unshift({ t: 'decide', kind: 'transportDest', player: pd.player, src: pd.src, srcPos: pd.srcPos, card: v,
        optional: false, prompt: 'Seahorse: choose the habitat to move it to.' });
    },
    transportDest(s, pd, v) {
      s.steps.unshift({ t: 'move', id: pd.card, to: v });
    },
    redeploy(s, pd, v) {
      if (v === null) { log(s, 'Otter: no animal returned.'); return; }
      const f = find(s, v);
      s.board[f.pos][f.player].splice(f.index, 1);
      s.hands[pd.player].push(v); // bot: returned cards go to the bottom of its hand
      s.extraTurns[pd.player]++;
      log(s, `${s.names[pd.player]} ${verb(s, pd.player, 'return')} a face-down animal from ${LABEL_[s.order[f.pos]]} to hand and will get an extra turn.`);
    }
  };

  // Bot "Priority and Choice": adjacent habitat to the human player's right of
  // the reference card, then to the left, then its own habitat, then the
  // non-adjacent habitat. (The human sits at the bottom, so right = pos + 1.)
  function botChoiceOrder(s, refPos) {
    return [refPos + 1, refPos - 1, refPos, refPos + 2, refPos - 2].filter(q => q >= 0 && q <= 2)
      .filter((q, i, a) => a.indexOf(q) === i);
  }

  // ---------------------------------------------------------------- battle end
  function endBattle(s, reason, withdrawer, why) {
    s.pending = null;
    s.turnActive = false;
    const res = { reason, withdrawer, why, enhancement: [] };
    if (reason === 'withdraw') {
      const winner = other(withdrawer);
      const pts = withdrawPoints(s, withdrawer);
      res.winner = winner;
      res.points = pts;
      if (why) log(s, why, 'battle');
      log(s, `${s.names[withdrawer]} ${verb(s, withdrawer, 'withdraw')} with ${s.hands[withdrawer].length} card${s.hands[withdrawer].length === 1 ? '' : 's'} in hand. ${s.names[winner]} ${verb(s, winner, 'score')} ${pts} points.`, 'battle');
    } else {
      // Bot Difficulty Enhancement
      if (s.opts.mode === 'bot' && s.opts.botLevel === 'enhanced') {
        const lost = [0, 1, 2].filter(pos => controller(s, pos) !== s.bot).length;
        const n = lost === 3 ? 2 : lost === 2 ? 1 : 0;
        for (let i = 0; i < n && s.deck.length; i++) {
          const id = s.deck.shift();
          const pos = s.order.indexOf(def(id).theatre);
          s.board[pos][s.bot].push({ id, faceUp: true, owner: s.bot, enhancement: true });
          res.enhancement.push(id);
          log(s, `Difficulty enhancement: the Bot plays ${def(id).name} (${def(id).str}) from the deck face up to ${LABEL_[s.order[pos]]}.`, 'battle');
        }
      }
      const ctrl = [0, 1, 2].map(pos => controller(s, pos));
      const wins0 = ctrl.filter(c => c === 0).length;
      const winner = wins0 >= 2 ? 0 : 1;
      res.winner = winner;
      res.points = 6;
      res.control = ctrl;
      log(s, `All cards played. ${s.names[winner]} control${s.names[winner] === 'You' ? '' : 's'} ${ctrl.filter(c => c === winner).length} habitats and ${verb(s, winner, 'win')} the battle.`, 'battle');
    }
    res.totals = [0, 1, 2].map(pos => [strength(s, pos, 0), strength(s, pos, 1)]);
    res.control = [0, 1, 2].map(pos => controller(s, pos));
    if (s.opts.length === 'beginner') {
      s.battleWins[res.winner]++;
    } else {
      s.scores[res.winner] += res.points;
    }
    s.result = res;
    const over = s.opts.length === 'beginner' ? s.battleWins[res.winner] >= 3 : s.scores[res.winner] >= target(s);
    s.phase = over ? 'gameOver' : 'battleEnd';
    if (over) log(s, `${s.names[res.winner]} ${verb(s, res.winner, 'win')} the game!`, 'battle');
  }

  function nextBattle(s) {
    if (s.phase !== 'battleEnd') return;
    const o = s.order;
    s.order = [o[2], o[0], o[1]];
    if (s.opts.mode !== 'bot') s.first = other(s.first); // players swap Supreme Commander cards
    startBattle(s);
  }

  const API = {
    newGame, nextBattle, playCard, withdraw, resolve, run,
    legalPlays, canPlayFaceUp, strength, cardStrengths, supportBonus, controller, withdrawPoints,
    find, allCards, adjacent, hasFaceUp, anyFaceUp, botChoiceOrder, target, def
  };
  if (typeof module !== 'undefined') module.exports = API;
  else root.ALS = API;
})(typeof window !== 'undefined' ? window : globalThis);
