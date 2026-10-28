// "How to play" content, summarised from the Compressed Rules v1.2,
// the Bot Rules card and the Critters print-and-play.

function rulesHTML() {
  const rows = CARD_DEFS.map(d => `
    <tr>
      <td>${d.str}</td>
      <th scope="row">${d.name}</th>
      <td><span class="chip ${d.theatre}">${THEATRE_LABEL[d.theatre]}</span></td>
      <td>${TYPE_LABEL[d.type]}</td>
      <td>${d.text || '—'}</td>
    </tr>`).join('');

  const cmd = (c) => `
    <table>
      <caption>${c.title} — ${c.tie}</caption>
      <thead><tr><th scope="col">Cards left in your hand</th><th scope="col">Points opponent scores if you withdraw</th></tr></thead>
      <tbody>${c.rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody>
    </table>`;

  return `
  <h3>Goal</h3>
  <p>Control at least 2 of the 3 habitats (<span class="chip air">Air</span>, <span class="chip land">Land</span>, <span class="chip sea">Sea</span>) at the end of a battle, or make your opponent withdraw. The first player to 12 points wins (18 in the long game; 3 battle wins in beginner).</p>

  <h3>Each turn</h3>
  <ul>
    <li><strong>Play face up</strong> into the matching habitat on your side. Its ability takes effect.</li>
    <li><strong>Play face down</strong> into any habitat. A face-down animal is strength 2 and has no ability.</li>
    <li><strong>Withdraw</strong> to end the battle early. Your opponent scores fewer points the earlier you withdraw (see the Supreme Commander tables below).</li>
  </ul>
  <p>New cards overlap older ones. Overlapped cards are <em>covered</em>; the top card is <em>uncovered</em>. You don't draw cards during a battle.</p>

  <h3>End of a battle</h3>
  <p>When both hands are empty, the higher total strength on each side controls that habitat. Ties and empty habitats go to the 1st player. Controlling 2 or more habitats scores 6 points. Then the habitats rotate one place, players swap 1st and 2nd player, and all cards are shuffled and dealt again (6 each).</p>

  <h3>Ability key terms</h3>
  <ul>
    <li><strong>Instant</strong> (lightning bolt): happens once, when played or flipped face up.</li>
    <li><strong>Ongoing</strong> (infinity sign): always in effect while face up.</li>
    <li><strong>Flip</strong>: turn a card face up or face down. Mallard, Snake and Fox can only flip uncovered animals.</li>
    <li><strong>Move</strong>: put an animal into a different habitat on the same side, on top. Moving is not playing.</li>
    <li><strong>Discard</strong>: the card goes face down to the bottom of the deck.</li>
    <li>"You" on a card means the player whose side the card is on.</li>
  </ul>

  <h3>The 18 critters</h3>
  <div class="table-scroll" tabindex="0">
  <table>
    <caption>Critter cards</caption>
    <thead><tr><th scope="col">Strength</th><th scope="col">Animal</th><th scope="col">Habitat</th><th scope="col">Type</th><th scope="col">Ability</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  </div>

  <h3>Supreme Commander cards</h3>
  <div class="table-scroll" tabindex="0">${cmd(COMMANDERS.first)}</div>
  <div class="table-scroll" tabindex="0">${cmd(COMMANDERS.second)}</div>

  <h3>Solo play: the Bot</h3>
  <ul>
    <li>The Bot is always the 1st player and wins tied habitats. Its hand is hidden and it always plays the top card of its hand face up into the matching habitat.</li>
    <li>If the Bot would play or move a 4th animal into its side of a habitat, it withdraws instead — unless its Stork (strength 3 or less), Cuckoo, or an Otter with a face-down animal to return lets it avoid that.</li>
    <li>When the Bot has a choice, it picks the habitat to <em>your right</em> of the card causing the effect, then to your left, then that card's own habitat, then the far habitat. In a stack it picks the uncovered card first.</li>
    <li>Bot flip priority: its face-down → face up; your face-up → face down; your face-down → face up; its face-up → face down.</li>
    <li>The Bot treats "may" as "must". If Octopus would discard its animal, the Bot places it face down in an adjacent habitat instead. Returned cards go to the bottom of its hand.</li>
    <li><strong>Difficulty Enhancement</strong>: at the end of a battle, if the Bot lost 3 habitats it plays the top 2 deck cards face up into matching habitats (1 card if it lost 2). Their abilities are ignored.</li>
    <li><strong>Semiautonomous Bot</strong>: plays the same way, but every choice is the best one for the Bot.</li>
  </ul>

  <h3>Playing on this device</h3>
  <ul>
    <li>Tap or press a card in your hand, choose face up or face down, then pick a habitat. Every choice is also listed as a button in the action bar at the bottom.</li>
    <li>Tap any animal on the board to see the full card. Use <strong>Board as text</strong> for a table of every habitat.</li>
    <li>Everything can be done with a keyboard (Tab, Enter, Space, Escape) or a screen reader. Game events are announced.</li>
  </ul>

  <h3>Printable rules and cards</h3>
  <ul>
    <li><a href="assets/docs/compressed-rules.pdf">Compressed Rules and Travel Kit v1.2 (PDF)</a></li>
    <li><a href="assets/docs/bot-rules.pdf">Bot Rules (PDF)</a></li>
    <li><a href="assets/docs/critters-print-and-play.pdf">Critters print-and-play cards (PDF)</a></li>
  </ul>`;
}
