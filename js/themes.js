// Themes: card names, ability text, art descriptions and vocabulary.
//
// The game rules are identical in every theme (revised-edition rules).
//  • critters    – the print-and-play photo cards (image files in assets/cards)
//  • critterswar – Critters at War names with original cartoon critter art drawn in p5
//  • war         – classic military names with original vehicle art drawn in p5
// The official Arcane Wonders artwork is not reproduced; the two drawn
// themes use original illustrations created in js/art.js.

/* global CARD_DEFS, THEATRE_LABEL */

const WAR_TEXT = {
  support: 'You gain +3 strength in each adjacent theater.',
  airdrop: 'On your next turn, you may play a card to a non-matching theater.',
  maneuver: 'Flip a card in an adjacent theater.',
  aerodrome: 'You may play cards of strength 3 or less to non-matching theaters.',
  containment: 'If either player plays a card face down, destroy that card.',
  reinforce: 'Look at the top card of the deck. You may play it face down to an adjacent theater.',
  ambush: 'Flip a card in any theater.',
  coverfire: 'All cards covered by this card are strength 4.',
  disrupt: 'Your opponent chooses and flips 1 of their cards. Then you flip 1 of yours.',
  transport: 'You may move 1 of your cards to a different theater.',
  escalation: 'All your face-down cards are strength 4.',
  redeploy: 'You may return 1 of your face-down cards to your hand. If you do, gain an extra turn.',
  blockade: 'If a card is played in an adjacent theater with 3 or more cards already in it, destroy that card.'
};

// Names by card id (0–17: Air 1–6, Land 1–6, Sea 1–6)
const WAR_NAMES = [
  'Support', 'Air Drop', 'Maneuver', 'Aerodrome', 'Containment', 'Heavy Bombers',
  'Reinforce', 'Ambush', 'Maneuver', 'Cover Fire', 'Disrupt', 'Heavy Tanks',
  'Transport', 'Escalation', 'Maneuver', 'Redeploy', 'Blockade', 'Super Battleship'
];

const WAR_ART = [
  'A formation of three fighter planes seen from above against a blue sky.',
  'A transport plane dropping two parachutes with supply crates.',
  'A fighter plane banking through the clouds, with curved motion lines.',
  'An airfield control tower with a windsock beside a runway.',
  'Two searchlights sweeping the night sky from the ground.',
  'A large four-engine bomber seen from above.',
  'Three helmeted soldiers marching forward in a line.',
  'Helmeted soldiers peeking out from behind green bushes.',
  'An army jeep driving fast across olive ground.',
  'A field artillery gun on two wheels with its barrel raised.',
  'A field radio with a tall antenna sending out signal waves.',
  'A heavy tank with a long gun barrel on its tracks.',
  'A cargo transport ship loaded with crates.',
  'Two signal rockets rising into the sky over the water.',
  'A fast destroyer cutting through the waves.',
  'A submarine surfacing with its periscope up.',
  'Spiked naval mines floating in the water on chains.',
  'A huge battleship with three gun turrets.'
];

const CW_ART = [
  'A squad of three cartoon bees wearing tiny green helmets.',
  'A cartoon flying squirrel floating down under a parachute.',
  'A cartoon sparrow in a helmet swooping through the clouds.',
  'A wide-eyed cartoon owl in a helmet watching from a lookout.',
  'A cartoon bat in a helmet with its wings spread.',
  'A big cartoon pelican in a helmet flying with a full beak pouch.',
  'Two cartoon mice in helmets running in to help.',
  'A cartoon hedgehog in a helmet hiding in a bush.',
  'A cartoon rabbit in a helmet hopping sideways.',
  'A cartoon raccoon with a striped tail standing guard in a helmet.',
  'A cartoon skunk in a helmet with its fluffy tail raised.',
  'A big grey cartoon rhino in a helmet charging forward.',
  'A cartoon crab in a helmet carrying a crate with its claws.',
  'A puffed-up spiky cartoon pufferfish wearing a helmet.',
  'A cartoon dolphin in a helmet leaping out of the waves.',
  'A cartoon seal in a helmet popping up through the water.',
  'A cartoon jellyfish in a helmet with long trailing tentacles.',
  'A giant blue cartoon whale in a helmet spouting water.'
];

const THEMES = {
  critters: {
    key: 'critters',
    label: 'Critters (print-and-play photo cards)',
    title: 'Air, Land & Sea: Critters',
    titleAccent: 'Critters',
    art: 'images',
    terms: null // uses the card text's own words: animal / habitat
  },
  critterswar: {
    key: 'critterswar',
    label: 'Critters at War (cartoon critters)',
    title: 'Air, Land & Sea: Critters at War',
    titleAccent: 'Critters at War',
    art: 'drawn',
    names: WAR_NAMES,
    text: WAR_TEXT,
    alt: CW_ART,
    theatreLabel: { air: 'Air', land: 'Land', sea: 'Sea' },
    terms: { animal: 'card', habitat: 'theater' }
  },
  war: {
    key: 'war',
    label: 'War (classic military)',
    title: 'Air, Land & Sea',
    titleAccent: 'War',
    art: 'drawn',
    names: WAR_NAMES,
    text: WAR_TEXT,
    alt: WAR_ART,
    theatreLabel: { air: 'Air', land: 'Land', sea: 'Sea' },
    terms: { animal: 'card', habitat: 'theater' }
  }
};

// Keep the original critter data so we can switch back.
const CRITTER_ORIG = CARD_DEFS.map(d => ({ name: d.name, text: d.text, photo: d.photo }));

let CURRENT_THEME = THEMES.critters;

function applyTheme(key) {
  const th = THEMES[key] || THEMES.critters;
  CURRENT_THEME = th;
  CARD_DEFS.forEach((d, i) => {
    if (th.art === 'images') {
      Object.assign(d, CRITTER_ORIG[i]);
    } else {
      d.name = th.names[i];
      d.text = d.key ? th.text[d.key] : '';
      d.photo = th.alt[i];
    }
  });
  return th;
}

// Swap the critter words "animal"/"habitat" for the theme's words in any
// player-facing string (log, prompts, labels, dialogs).
function vocab(str) {
  const t = CURRENT_THEME.terms;
  if (!t || typeof str !== 'string') return str;
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  return str
    .replace(/\bAnimals\b/g, cap(t.animal) + 's')
    .replace(/\banimals\b/g, t.animal + 's')
    .replace(/\bAnimal\b/g, cap(t.animal))
    .replace(/\ban animal\b/g, 'a ' + t.animal)
    .replace(/\bAn animal\b/g, 'A ' + t.animal)
    .replace(/\banimal\b/g, t.animal)
    .replace(/\bHabitats\b/g, cap(t.habitat) + 's')
    .replace(/\bhabitats\b/g, t.habitat + 's')
    .replace(/\bHabitat\b/g, cap(t.habitat))
    .replace(/\bhabitat\b/g, t.habitat);
}
