// Tweak these numbers to change difficulty and feel.

export const CONFIG = {
  targetKm: 300, // distance from KL to kampung
  pxPerKm: 130, // higher = longer game
  lives: 3,
  pickupChance: 0.6, // chance a pickup appears with each obstacle
  worldPerPx: 0.09, // how fast the road rushes at you (higher = things arrive sooner)
  curviness: 0.0018, // how much the highway bends (0 = dead straight)
  invincibleTime: 1.5, // after getting hit
  shieldTime: 4, // teh tarik power
  callMin: 14, // seconds between Mak's phone calls
  callMax: 24,
  callDuration: 4,
  honkCooldown: 1.5, // seconds between honks
  honkRange: 45, // how far ahead the horn reaches (lane widths)
  wobbleTime: 0.7, // how long a vehicle wobbles after driving over a pothole
};

// vehicles that wobble (with a "DUSH!") when they drive over a pothole in their lane
export const BUMPY = ['kancil', 'car2', 'lorry', 'bus', 'kapcai'];

// The trip gets harder stage by stage. Within a stage, speed and traffic ramp smoothly
// from the first number to the second.
//   speed: how fast you drive (abstract units; ~230 feels like 90 km/j on the speedometer)
//   gap:   seconds between obstacles (bigger = fewer obstacles)
//   obstacles: which hazards can appear in this stage (keys from OBSTACLES below)
export const STAGES = [
  {
    fromKm: 0,
    title: 'Peringkat 1: Keluar KL',
    speed: [230, 290],
    gap: [2.8, 1.9],
    obstacles: ['pothole', 'cow', 'kancil'],
  },
  {
    fromKm: 100,
    title: 'Peringkat 2: Lebuhraya Pantai Timur. Lebih banyak kereta!',
    speed: [300, 380],
    gap: [1.7, 1.2],
    obstacles: ['pothole', 'cow', 'kancil', 'car2', 'kapcai'],
  },
  {
    fromKm: 200,
    title: 'Peringkat 3: Semua orang balik raya! Hati-hati!',
    speed: [390, 470],
    gap: [1.15, 0.85],
    obstacles: ['pothole', 'cow', 'kancil', 'car2', 'kapcai', 'lorry', 'bus'],
  },
];

// weight = how often it appears; w = width in lane widths (height follows the art's shape)
// honk = what happens when you hon at it: moves aside to a free lane (slow = takes its time), or ignores you
// speedMul < 1 means it's also moving forward (you slowly catch up to it)
export const OBSTACLES = [
  { key: 'pothole', weight: 3, w: 0.95, speedMul: 1, hit: 'Lubang lagi! JKR mana?' },
  { key: 'cow', weight: 2, w: 0.46, speedMul: 1, hit: 'Alamak, lembu!', honk: { moves: true, slow: true, text: 'Lembu jalan slow-slow ke tepi...' } },
  { key: 'kancil', weight: 2, w: 0.8, speedMul: 0.55, hit: 'Kancil 60km/j lane kanan!', honk: { moves: true, text: 'Kancil ke tepi!' } },
  { key: 'car2', weight: 1.5, w: 0.8, speedMul: 0.5, hit: 'Brake mengejut! Signal pun tak bagi!', honk: { moves: true, text: 'Ok ok, bagi laluan!' } },
  { key: 'lorry', weight: 1.5, w: 0.95, speedMul: 0.7, hit: 'Lorry hog lane!', honk: { moves: false, text: 'Lorry buat tak tahu je...' } },
  { key: 'bus', weight: 1, w: 1.0, speedMul: 0.75, hit: 'Bas ekspres masuk lane!', honk: { moves: false, text: 'Bas: "Hon la banyak-banyak"' } },
  { key: 'kapcai', weight: 1.5, w: 0.34, speedMul: 0.6, hit: 'Kapcai cilok depan!', honk: { moves: true, text: 'Kapcai cilok ke tepi!' } },
];

// The driver's face in the rear-view mirror. Faces: normal, shock, sweat, hairUp, dizzy, sleepy
// (art/sprites/face_<name>.png). Each reaction: which face, for how many seconds, and how
// important it is (a reaction only replaces a less important one that is still showing).
export const REACTIONS = {
  hitSmall: { face: 'dizzy', time: 1.8, prio: 3 }, // pothole, lembu
  hitBig: { face: 'hairUp', time: 1.6, prio: 3 }, // any vehicle
  nearMiss: { face: 'shock', time: 1.0, prio: 2 }, // changed lane just before a crash
  makCalls: { face: 'shock', time: 0.8, prio: 1 },
  makMissed: { face: 'sweat', time: 1.8, prio: 2 }, // didn't angkat
  honkIgnored: { face: 'sweat', time: 1.2, prio: 1 }, // lorry/bus won't move
  busyStage: { face: 'sweat', time: 2.0, prio: 1 }, // new peringkat starts
  nearMissTime: 0.45, // seconds before impact that still counts as a near miss
  lastLifeFace: 'sweat', // resting face on the last life
};
export const SMALL_HITS = ['pothole', 'cow'];

// roadside scenery: h = height in lane widths
export const SCENERY = {
  palm: { h: 3.4 },
  tree: { h: 2.6 },
  house: { h: 1.6 },
  pelita: { h: 0.9 },
};

export const CAR_COLORS = ['#e03131', '#f08c00', '#1971c2', '#f1f3f5', '#2f9e44', '#862e9c', '#495057'];

export const PICKUPS = [
  { key: 'duit', weight: 5, w: 0.3, score: 10, text: '+RM10' },
  { key: 'rendang', weight: 1.5, w: 0.5, score: 25, text: 'Rendang! +25' },
  { key: 'teh', weight: 0, w: 0.38, score: 5, shield: true, text: 'Teh tarik power! 💪' }, // only from R&R
];

// sign = text on the overhead gantry that drives past
export const MILESTONES = [
  { km: 20, text: '🚧 Jem di Tol Gombak... sabar je', sign: 'TOL GOMBAK' },
  { km: 70, text: '☕ R&R Temerloh! Grab the teh tarik', sign: 'R&R TEMERLOH', teh: true },
  { km: 130, text: '🌧️ Hujan lebat! Drive carefully', sign: 'MARAN ↑' },
  { km: 180, text: '⛽ Isi minyak, beli keropok lekor', sign: 'STESEN MINYAK 2 km' },
  { km: 230, text: '☕ R&R Gambang! Teh tarik ahead', sign: 'R&R GAMBANG', teh: true },
  { km: 280, text: '🌴 Masuk jalan kampung! Almost there', sign: 'KE KAMPUNG ←' },
];

export const CALL_LINES = [
  'Dah sampai mana?',
  'Jangan lupa beli kuih!',
  'Nenek tanya bila sampai',
  'Drive slow slow ok!',
  'Dah makan belum?',
  'Cousin dah sampai tau!',
];

// What Mak says after the call (shown on the phone for showTime seconds, with her face).
export const MAK_REPLIES = {
  answered: ['Ok, drive safe!', 'Sayang anak Mak!', 'Hati-hati ya!', 'Mak masak rendang tau!'],
  missed: ['Kenapa tak angkat?!', 'Amboi, sibuk sangat!', 'Mak call pun tak angkat!'],
  showTime: 1.8,
};

// Kampung scene after you arrive: the anak buah ask for duit raya.
export const KAMPUNG = {
  kids: 3, // how many anak buah are waiting
  gifts: [5, 10, 20], // RM per kid you can choose to give
  welcome: 'Sampai pun anak Mak! Selamat Hari Raya!',
  ask: 'Duit raya untuk anak-anak buah?',
  thanks: { 5: 'Alhamdulillah, terima kasih!', 10: 'Anak Mak memang baik hati!', 20: 'MasyaAllah, murah rezeki!' },
  stingy: 'Amboi... kedekut!',
  hearts: { 0: 0, 5: 1, 10: 2, 20: 3 }, // Mak's happiness for each choice
};
