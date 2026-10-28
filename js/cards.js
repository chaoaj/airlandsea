// Card data for Air, Land & Sea: Critters (print-and-play edition).
// Text is transcribed exactly from the print-and-play cards so screen
// readers announce what sighted players see printed on the card.

const THEATRES = ['air', 'land', 'sea'];

// Player-facing names. The critter edition calls theatres "habitats".
const THEATRE_LABEL = { air: 'Air', land: 'Land', sea: 'Sea' };

const TYPE_LABEL = {
  instant: 'Instant',
  ongoing: 'Ongoing',
  none: 'No ability'
};

const CARD_DEFS = [
  // ---------- AIR ----------
  { id: 0, slug: 'bee', name: 'Bee', theatre: 'air', str: 1, type: 'ongoing', key: 'support',
    text: 'You gain +3 strength in each adjacent habitat.',
    photo: 'A swarm of bees flying across a pale sky.' },
  { id: 1, slug: 'cuckoo', name: 'Cuckoo', theatre: 'air', str: 2, type: 'instant', key: 'airdrop',
    text: 'On your next turn, you may play an animal to a non-matching habitat.',
    photo: 'A grass nest holding one large speckled blue cuckoo egg among smaller brown eggs.' },
  { id: 2, slug: 'mallard-air', name: 'Mallard', theatre: 'air', str: 3, type: 'instant', key: 'maneuver',
    text: 'Flip an animal in an adjacent habitat.',
    photo: 'A green-headed mallard duck in flight with wings spread.' },
  { id: 3, slug: 'stork', name: 'Stork', theatre: 'air', str: 4, type: 'ongoing', key: 'aerodrome',
    text: 'You may play animals of strength 3 or less to non-matching habitats.',
    photo: 'A white stork with black wing feathers and a red beak standing in green grass.' },
  { id: 4, slug: 'vulture', name: 'Vulture', theatre: 'air', str: 5, type: 'ongoing', key: 'containment',
    text: 'If either player plays an animal face-down, immediately discard that card.',
    photo: 'A vulture with a bald grey head and shaggy brown and white feathers.' },
  { id: 5, slug: 'eagle', name: 'Eagle', theatre: 'air', str: 6, type: 'none', key: null,
    text: '',
    photo: 'A brown eagle soaring with wings fully extended.' },

  // ---------- LAND ----------
  { id: 6, slug: 'rabbit', name: 'Rabbit', theatre: 'land', str: 1, type: 'instant', key: 'reinforce',
    text: 'Look at the top animal from the deck. You may play it face-down to an adjacent habitat.',
    photo: 'Three brown rabbits sitting together in a grassy field.' },
  { id: 7, slug: 'snake', name: 'Snake', theatre: 'land', str: 2, type: 'instant', key: 'ambush',
    text: 'Flip an animal in any habitat.',
    photo: 'A coiled rattlesnake on green ground cover with its rattle raised.' },
  { id: 8, slug: 'mallard-land', name: 'Mallard', theatre: 'land', str: 3, type: 'instant', key: 'maneuver',
    text: 'Flip an animal in an adjacent habitat.',
    photo: 'A mallard duck standing on dirt, facing the camera.' },
  { id: 9, slug: 'boar', name: 'Boar', theatre: 'land', str: 4, type: 'ongoing', key: 'coverfire',
    text: 'All animals covered by Boar are strength 4.',
    photo: 'A dark wild boar walking with three striped piglets.' },
  { id: 10, slug: 'fox', name: 'Fox', theatre: 'land', str: 5, type: 'instant', key: 'disrupt',
    text: 'Your opponent chooses and flips 1 of their animals. Then you flip 1 of yours.',
    photo: 'A red fox crouching low in the grass, staring forward.' },
  { id: 11, slug: 'tiger', name: 'Tiger', theatre: 'land', str: 6, type: 'none', key: null,
    text: '',
    photo: 'An orange and black striped tiger standing on rocks.' },

  // ---------- SEA ----------
  { id: 12, slug: 'seahorse', name: 'Seahorse', theatre: 'sea', str: 1, type: 'instant', key: 'transport',
    text: 'You may move 1 of your animals to a different habitat.',
    photo: 'A yellow-brown seahorse floating in front of blurred blue lights.' },
  { id: 13, slug: 'turtle', name: 'Turtle', theatre: 'sea', str: 2, type: 'ongoing', key: 'escalation',
    text: 'All your face-down animals are strength 4.',
    photo: 'A sea turtle swimming over a turquoise reef.' },
  { id: 14, slug: 'mallard-sea', name: 'Mallard', theatre: 'sea', str: 3, type: 'instant', key: 'maneuver',
    text: 'Flip an animal in an adjacent habitat.',
    photo: 'A mallard duck swimming on water dotted with floating leaves.' },
  { id: 15, slug: 'otter', name: 'Otter', theatre: 'sea', str: 4, type: 'instant', key: 'redeploy',
    text: 'Return 1 of your face-down animals to your hand. If you do, gain an extra turn.',
    photo: 'A brown otter swimming underwater, belly up.' },
  { id: 16, slug: 'octopus', name: 'Octopus', theatre: 'sea', str: 5, type: 'ongoing', key: 'blockade',
    text: 'If an animal is played in an adjacent habitat with 3 or more total animals, discard it with no effect.',
    photo: 'An orange octopus spreading its tentacles in blue water.' },
  { id: 17, slug: 'shark', name: 'Shark', theatre: 'sea', str: 6, type: 'none', key: null,
    text: '',
    photo: 'A great white shark swimming in deep blue water.' }
];

// Supreme Commander cards (withdrawal tables), from the print-and-play.
const COMMANDERS = {
  first: {
    title: '1st Player', tie: 'Wins tied habitats',
    rows: [['4–6', 2], ['2–3', 3], ['1', 4], ['0', 6]]
  },
  second: {
    title: '2nd Player', tie: 'Loses tied habitats',
    rows: [['5–6', 2], ['3–4', 3], ['2', 4], ['0–1', 6]]
  }
};

function cardAccessibleText(def) {
  let s = `${def.name}, ${THEATRE_LABEL[def.theatre]} habitat, strength ${def.str}`;
  if (def.type === 'none') s += ', no ability.';
  else s += `, ${TYPE_LABEL[def.type]}: ${def.text}`;
  return s;
}

if (typeof module !== 'undefined') {
  module.exports = { THEATRES, THEATRE_LABEL, TYPE_LABEL, CARD_DEFS, COMMANDERS, cardAccessibleText };
}
