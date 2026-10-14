import pg from "pg";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, ".data");
const DATA_FILE = path.join(DATA_DIR, "tactical_trivia.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory data store structure matching the 10 tables
let memoryDb = {
  users: [],
  quizzes: [],
  questions: [],
  choices: [],
  attempts: [],
  shop_items: [],
  unlocks: [],
  pass_goals: [],
  pass_progress: [],
  premium_pass: [],
};

// Seed questions catalog: 5 Quizzes, 10+ questions each, 4 choices, 1 correct
const SEED_QUIZZES = [
  {
    id: 1,
    title: "Operators & Gadgets",
    description: "Who has what ability: defensive denial, intel gadgets, hard breaching, and electronic warfare.",
  },
  {
    id: 2,
    title: "Maps & Callouts",
    description: "Name competitive bomb sites, key rooms, vertical soft spots, and iconic tactical angles.",
  },
  {
    id: 3,
    title: "Weapons & Attachments",
    description: "Recoil mitigation, barrel attachments, ADS speeds, optics, and signature operator loadouts.",
  },
  {
    id: 4,
    title: "Game Mechanics",
    description: "Drone phase timings, team reinforcement pool, defuser mechanics, audio propagation, and health/armor.",
  },
  {
    id: 5,
    title: "History & Esports",
    description: "Six Invitational champions, legendary pro clutch moments, major DLC operations, and competitive meta.",
  },
];

const SEED_QUESTIONS_DATA = [
  // --- Quiz 1: Operators & Gadgets ---
  {
    quiz_id: 1,
    text: "Which defender deploys the 'Mag-NET' system to capture and detonate incoming attacker projectiles?",
    choices: [
      { text: "Wamai", is_correct: true },
      { text: "Jäger", is_correct: false },
      { text: "Aruni", is_correct: false },
      { text: "Bandit", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "What is the name of Hibana's signature remote-detonated hard breaching launcher?",
    choices: [
      { text: "X-KAIROS", is_correct: true },
      { text: "S.E.L.M.A. Aqua Breacher", is_correct: false },
      { text: "Exothermic Charge", is_correct: false },
      { text: "Breaching Torch", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "Which attacker uses the 'EE-ONE-D' global surveillance drone to detect moving defenders across the map?",
    choices: [
      { text: "Lion", is_correct: true },
      { text: "Dokkaebi", is_correct: false },
      { text: "Jackal", is_correct: false },
      { text: "Deimos", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "What tactical device does Mozzie launch to hack and commandeer enemy observation drones?",
    choices: [
      { text: "Pest Launcher", is_correct: true },
      { text: "Gu Mine", is_correct: false },
      { text: "Kludge Drone", is_correct: false },
      { text: "Yokai Drone", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "Which defender places bulletproof 'Evil Eye' cameras capable of rotating and firing high-energy laser darts?",
    choices: [
      { text: "Maestro", is_correct: true },
      { text: "Valkyrie", is_correct: false },
      { text: "Echo", is_correct: false },
      { text: "Melusi", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "Which attacker uses the 'Kawan Hive Launcher' to deploy swarms of tracking nanobots in doorways and choke points?",
    choices: [
      { text: "Grim", is_correct: true },
      { text: "Nomad", is_correct: false },
      { text: "Gridlock", is_correct: false },
      { text: "Capitão", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "Which defender places acoustic Banshee Sonic Defense devices that emit a disorienting hum and slow attackers?",
    choices: [
      { text: "Melusi", is_correct: true },
      { text: "Clash", is_correct: false },
      { text: "Ela", is_correct: false },
      { text: "Thorn", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "What is the name of Solis's tactical visor capable of detecting attacker electronic gadgets through surfaces?",
    choices: [
      { text: "SPEC-IO Electro-Sensor", is_correct: true },
      { text: "Eyenox Model III", is_correct: false },
      { text: "RED MK IV Sensor", is_correct: false },
      { text: "Surtr Electro-Sight", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "Which hard breacher throws hydraulic 'S.E.L.M.A.' sequential explosive cylinders?",
    choices: [
      { text: "Ace", is_correct: true },
      { text: "Thermite", is_correct: false },
      { text: "Maverick", is_correct: false },
      { text: "Ram", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "Which defender drops an armor pack that grants damage resistance and guaranteed DBNO state to teammates?",
    choices: [
      { text: "Rook", is_correct: true },
      { text: "Doc", is_correct: false },
      { text: "Thunderbird", is_correct: false },
      { text: "Castle", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "Which attacker operates the automated BU-GI auto-breacher tank that chews through soft floors and barricades?",
    choices: [
      { text: "Ram", is_correct: true },
      { text: "Sledge", is_correct: false },
      { text: "Buck", is_correct: false },
      { text: "Flores", is_correct: false },
    ],
  },

  // --- Quiz 2: Maps & Callouts ---
  {
    quiz_id: 2,
    text: "On Clubhouse, what are the two primary bomb sites located in the basement?",
    choices: [
      { text: "Church & Arsenal Room", is_correct: true },
      { text: "Bar & Stock Room", is_correct: false },
      { text: "Gym & Bedroom", is_correct: false },
      { text: "Cash Room & CCTV", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "On Oregon, which exterior structure callout contains a high-level ladder sniper vantage point over Meeting Hall?",
    choices: [
      { text: "Big Tower", is_correct: true },
      { text: "Small Tower", is_correct: false },
      { text: "Junkyard Crane", is_correct: false },
      { text: "Dorm Balcony", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "On Kafe Dostoyevsky, what is the competitive top-floor (3F) bomb site?",
    choices: [
      { text: "Bar & Cocktail Lounge", is_correct: true },
      { text: "Reading Room & Dining", is_correct: false },
      { text: "Kitchen Prep & Service", is_correct: false },
      { text: "Bakery & Kitchen", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "On Bank, what is the common callout for the large multi-story glass-ceiling atrium on the ground floor?",
    choices: [
      { text: "Lobby", is_correct: true },
      { text: "Square", is_correct: false },
      { text: "Skylight Stairwell", is_correct: false },
      { text: "Blue Stairs", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "On Chalet, which basement exterior garage door is the primary target for attackers executing a snow-side breach?",
    choices: [
      { text: "Snowmobile Garage", is_correct: true },
      { text: "Wine Cellar", is_correct: false },
      { text: "Trophy Door", is_correct: false },
      { text: "Great Room Entrance", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "On Coastline, what is the central open-air rooftop/courtyard callout surrounded by 1F and 2F interior hallways?",
    choices: [
      { text: "Courtyard", is_correct: true },
      { text: "Ruins", is_correct: false },
      { text: "Pool Table", is_correct: false },
      { text: "Penthouse Balcony", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "On Border, what is the 2F room directly above the 1F Workshop bomb site commonly called?",
    choices: [
      { text: "Armory Lockers", is_correct: true },
      { text: "Archives", is_correct: false },
      { text: "Security Room", is_correct: false },
      { text: "Ventilation", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "On Villa, what universally recognized callout refers to the 90-degree corner hallway connecting Trophy and Aviator?",
    choices: [
      { text: "90 (Ninety)", is_correct: true },
      { text: "Red Stairs", is_correct: false },
      { text: "Astro Hall", is_correct: false },
      { text: "Vault Connector", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "On Theme Park, which bomb site was previously known as 'Haunted Dining' before the competitive rework?",
    choices: [
      { text: "Throne Room & Armory", is_correct: true },
      { text: "Lab & Storage", is_correct: false },
      { text: "Bunk & Day Care", is_correct: false },
      { text: "Dragon & Arcade", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "On Clubhouse, what is the narrow dirt tunnel in the basement called that attackers push from Construction?",
    choices: [
      { text: "Dirt (Tunnel)", is_correct: true },
      { text: "Blue Stairs", is_correct: false },
      { text: "Oil Pit", is_correct: false },
      { text: "Secret Room", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "On Oregon, what is the basement hallway callout leading into Laundry from Construction called?",
    choices: [
      { text: "Blue Bunker / Blue Hall", is_correct: true },
      { text: "White Stairs", is_correct: false },
      { text: "Freezer Corridor", is_correct: false },
      { text: "Meeting Hatch", is_correct: false },
    ],
  },

  // --- Quiz 3: Weapons & Attachments ---
  {
    quiz_id: 3,
    text: "Which defender is famous for wielding the blisteringly fast 1200 RPM Vector .45 ACP submachine gun?",
    choices: [
      { text: "Mira", is_correct: true },
      { text: "Smoke", is_correct: false },
      { text: "Bandit", is_correct: false },
      { text: "Echo", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "What specific recoil benefit does the 'Flash Hider' muzzle attachment provide in Rainbow Six Siege?",
    choices: [
      { text: "Significantly reduces vertical recoil kick", is_correct: true },
      { text: "Eliminates horizontal diamond spread", is_correct: false },
      { text: "Increases rate of fire", is_correct: false },
      { text: "Speeds up reload animation", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "What primary benefit does the 'Laser' attachment grant after the Year 9 weapon mechanics overhaul?",
    choices: [
      { text: "Increases weapon Aim-Down-Sights (ADS) speed", is_correct: true },
      { text: "Blinds enemies in close quarters", is_correct: false },
      { text: "Increases bullet penetration damage", is_correct: false },
      { text: "Automatically tags target pings", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "What unique stat boost does the 'Extended Barrel' attachment provide to compatible weapons?",
    choices: [
      { text: "Increases base bullet damage by approximately 12-15%", is_correct: true },
      { text: "Increases magazine capacity by 10 rounds", is_correct: false },
      { text: "Completely removes bullet drop", is_correct: false },
      { text: "Silences weapon sound completely", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "Which heavy sniper rifle belongs to Kali and penetrates multiple soft walls and bodies with intense velocity?",
    choices: [
      { text: "CSRX 300", is_correct: true },
      { text: "CAMRS", is_correct: false },
      { text: "417 DMR", is_correct: false },
      { text: "OTs-03", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "What is the standard magazine capacity of Ash's signature R4-C assault rifle?",
    choices: [
      { text: "30 + 1 rounds", is_correct: true },
      { text: "25 + 1 rounds", is_correct: false },
      { text: "20 + 1 rounds", is_correct: false },
      { text: "35 rounds", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "Which British pump-action shotgun is regarded as the competitive gold standard for soft wall site preparation?",
    choices: [
      { text: "M590A1", is_correct: true },
      { text: "SG-CQB", is_correct: false },
      { text: "Super 90", is_correct: false },
      { text: "SASG-12", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "What recoil characteristic does the 'Compensator' attachment specifically target during sustained fire?",
    choices: [
      { text: "Reduces horizontal recoil drift and spread", is_correct: true },
      { text: "Reduces initial first-shot vertical kick", is_correct: false },
      { text: "Reduces muzzle flash", is_correct: false },
      { text: "Prevents barrel heating", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "Which secondary weapon option is a single-shot explosive launcher intended to destroy bulletproof gadgets?",
    choices: [
      { text: "GONNE-6", is_correct: true },
      { text: "Bailiff 410", is_correct: false },
      { text: "Super Shorty", is_correct: false },
      { text: "Keratos .357", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "Which magnification sight level was historically referred to by the community as the 'ACOG'?",
    choices: [
      { text: "2.5x Telescopic Scope", is_correct: true },
      { text: "1.5x Scope", is_correct: false },
      { text: "3.5x Scope", is_correct: false },
      { text: "1.0x Reflex Sight", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "Which defender carries the high-capacity ALDA 5.56 Light Machine Gun with an 80-round drum?",
    choices: [
      { text: "Maestro", is_correct: true },
      { text: "Tachanka", is_correct: false },
      { text: "Fenrir", is_correct: false },
      { text: "Echo", is_correct: false },
    ],
  },

  // --- Quiz 4: Game Mechanics ---
  {
    quiz_id: 4,
    text: "How long does the standard Preparation Phase last in competitive Ranked and Esports matches?",
    choices: [
      { text: "45 seconds", is_correct: true },
      { text: "30 seconds", is_correct: false },
      { text: "60 seconds", is_correct: false },
      { text: "40 seconds", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "How many total wall reinforcements does the defending team pool share collectively at the round start?",
    choices: [
      { text: "10 reinforcements", is_correct: true },
      { text: "8 reinforcements", is_correct: false },
      { text: "5 reinforcements", is_correct: false },
      { text: "12 reinforcements", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "Under standard competitive Bomb settings, how long does it take an attacker to plant the defuser?",
    choices: [
      { text: "7 seconds", is_correct: true },
      { text: "5 seconds", is_correct: false },
      { text: "4 seconds", is_correct: false },
      { text: "10 seconds", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "How does Thatcher's EMP Grenade interact with active electrical gadgets like Bandit batteries or Kaid claws?",
    choices: [
      { text: "Temporarily disables them for a set duration (does not destroy)", is_correct: true },
      { text: "Permanently destroys them into debris", is_correct: false },
      { text: "Causes them to detonate dealing lethal friendly fire", is_correct: false },
      { text: "Converts them into attacker-controlled electricity", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "How does audio propagation work in the Rainbow Six Siege physics engine?",
    choices: [
      { text: "Sound travels dynamically through the shortest physical opening or bullet hole before penetrating walls", is_correct: true },
      { text: "Sound radiates in a simple unbroken spherical radius ignoring walls", is_correct: false },
      { text: "Sound only travels along metallic floor conduits", is_correct: false },
      { text: "Sound volume is identical on every floor level", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "What is the maximum number of observation drones available to each attacking operator across a full round?",
    choices: [
      { text: "2 drones (1 prep phase, 1 in reserve)", is_correct: true },
      { text: "1 drone only", is_correct: false },
      { text: "3 drones", is_correct: false },
      { text: "4 drones", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "What damage multiplier applies to headshots with bullet weapons in Rainbow Six Siege?",
    choices: [
      { text: "Instant lethal 1-shot elimination (excluding shotguns)", is_correct: true },
      { text: "2.0x base weapon damage", is_correct: false },
      { text: "1.5x damage multiplier", is_correct: false },
      { text: "3.5x damage multiplier", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "Once the defuser is planted, how long does a defender need to hold the defuse prompt to disable it?",
    choices: [
      { text: "7 seconds", is_correct: true },
      { text: "5 seconds", is_correct: false },
      { text: "8 seconds", is_correct: false },
      { text: "10 seconds", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "Which tactic allows defenders to deny an attacker defuser plant through an unreinforced soft floor from below?",
    choices: [
      { text: "Nitro Cell / C4 or impact detonation from underneath", is_correct: true },
      { text: "Placing a bulletproof barricade on the roof", is_correct: false },
      { text: "Throwing an impact EMP at the sky", is_correct: false },
      { text: "Throwing smoke grenades in the basement", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "What happens if an attacker planting the defuser is struck by an Echo Yokai drone sonic burst?",
    choices: [
      { text: "The defuser planting action is immediately cancelled and interrupted", is_correct: true },
      { text: "The player drops their primary weapon", is_correct: false },
      { text: "The defuser instantly detonates", is_correct: false },
      { text: "The player is permanently blinded for 10 seconds", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "Which operator speed rating has the fastest base sprint and movement speed in the game?",
    choices: [
      { text: "3 Speed (1 Armor)", is_correct: true },
      { text: "1 Speed (3 Armor)", is_correct: false },
      { text: "2 Speed (2 Armor)", is_correct: false },
      { text: "4 Speed (Experimental)", is_correct: false },
    ],
  },

  // --- Quiz 5: History & Esports ---
  {
    quiz_id: 5,
    text: "Which North American roster won the inaugural PC Six Invitational in Montreal in 2017?",
    choices: [
      { text: "Continuum (later Evil Geniuses)", is_correct: true },
      { text: "Penta Sports", is_correct: false },
      { text: "Team Liquid", is_correct: false },
      { text: "G2 Esports", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "Which legendary European roster achieved back-to-back Six Invitational championship titles in 2018 and 2019?",
    choices: [
      { text: "PENTA Sports / G2 Esports", is_correct: true },
      { text: "Evil Geniuses", is_correct: false },
      { text: "Ninjas in Pyjamas", is_correct: false },
      { text: "Team Empire", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "In what year and month did Rainbow Six Siege officially launch worldwide?",
    choices: [
      { text: "December 2015", is_correct: true },
      { text: "March 2016", is_correct: false },
      { text: "November 2014", is_correct: false },
      { text: "June 2017", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "What was the name of Siege's first post-launch seasonal DLC in Year 1, introducing Buck, Frost, and Yacht?",
    choices: [
      { text: "Operation Black Ice", is_correct: true },
      { text: "Operation Dust Line", is_correct: false },
      { text: "Operation Skull Rain", is_correct: false },
      { text: "Operation Red Crow", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "Which famous Year 2 operation cancelled new operator releases to overhaul server tick rates and core engine stability?",
    choices: [
      { text: "Operation Health", is_correct: true },
      { text: "Operation Chimera", is_correct: false },
      { text: "Operation Blood Orchid", is_correct: false },
      { text: "Operation White Noise", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "Which Brazilian team became the first South American squad to lift the Six Invitational Hammer in 2021?",
    choices: [
      { text: "Ninjas in Pyjamas", is_correct: true },
      { text: "Team Liquid", is_correct: false },
      { text: "FaZe Clan", is_correct: false },
      { text: "w7m esports", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "During the Six Invitational 2020 grand finals on Oregon, which player's clutch defense on white stairs became an esports icon?",
    choices: [
      { text: "Canadian (Spacestation Gaming)", is_correct: true },
      { text: "Pengu (G2 Esports)", is_correct: false },
      { text: "Beaulo (TSM)", is_correct: false },
      { text: "Nesk (Team Liquid)", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "Which Brazilian powerhouse won the Six Invitational 2024 grand final in São Paulo after a historic 3-2 series against FaZe Clan?",
    choices: [
      { text: "w7m esports", is_correct: true },
      { text: "G2 Esports", is_correct: false },
      { text: "DarkZero Esports", is_correct: false },
      { text: "BDS Esports", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "Which map from the university setting was removed from the competitive playlist due to balance issues?",
    choices: [
      { text: "Bartlett University", is_correct: true },
      { text: "Favela", is_correct: false },
      { text: "Presidential Plane", is_correct: false },
      { text: "House", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "Which French entry fragger is internationally famous for extreme mechanical precision and the 'Shaiiko lean'?",
    choices: [
      { text: "Shaiiko", is_correct: true },
      { text: "Pengu", is_correct: false },
      { text: "Kanto", is_correct: false },
      { text: "Fabian", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "Which North American roster won the Six Invitational 2020 featuring Rampy, Bosco, ThinkingNade, Fultz, and Canadian?",
    choices: [
      { text: "Spacestation Gaming (SSG)", is_correct: true },
      { text: "TSM", is_correct: false },
      { text: "Evil Geniuses", is_correct: false },
      { text: "DarkZero Esports", is_correct: false },
    ],
  },

  // Current Siege X content: Y11S2 System Override and Y11S3 Split Fire.
  {
    quiz_id: 1,
    text: "Which new Defender uses the Horus Lance Launcher to counter shield pushes in Operation Split Fire?",
    choices: [
      { text: "Denari", is_correct: false },
      { text: "Noor", is_correct: true },
      { text: "Rauora", is_correct: false },
      { text: "Skopós", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "In Dokkaebi's Y11S2 Jegeo Payload rework, what must happen for the upload to complete?",
    choices: [
      { text: "Dokkaebi must stay within 10 meters of the target", is_correct: false },
      { text: "A teammate must scan the target twice", is_correct: false },
      { text: "The payload must maintain a constant connection to its target", is_correct: true },
      { text: "The target must be standing still", is_correct: false },
    ],
  },
  {
    quiz_id: 1,
    text: "Which three Operators received the XK23 assault rifle in the Y11S2 loadout update?",
    choices: [
      { text: "Dokkaebi, Rauora, and Sens", is_correct: true },
      { text: "Dokkaebi, Deimos, and Osa", is_correct: false },
      { text: "Sens, Grim, and Ying", is_correct: false },
      { text: "Rauora, Flores, and Ace", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "Which new map inspired by Rainbow Six: Vegas launched with Operation System Override in June 2026?",
    choices: [
      { text: "Calypso Casino", is_correct: true },
      { text: "Stadium Bravo", is_correct: false },
      { text: "Fortress", is_correct: false },
      { text: "Nighthaven Labs", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "Operation Split Fire's targeted Villa update moved which first-floor areas to the basement?",
    choices: [
      { text: "Kitchen and Dining Room", is_correct: false },
      { text: "Living Room and Library", is_correct: true },
      { text: "Aviator Room and Games Room", is_correct: false },
      { text: "Study and Trophy Room", is_correct: false },
    ],
  },
  {
    quiz_id: 2,
    text: "Which three maps received visual overhauls in Operation Split Fire?",
    choices: [
      { text: "Bank, Kafe Dostoyevsky, and Oregon", is_correct: false },
      { text: "Villa, Coastline, and Clubhouse", is_correct: false },
      { text: "Stadium Alpha, Stadium Bravo, and House", is_correct: true },
      { text: "Border, Consulate, and Chalet", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "How did Ubisoft describe the new XK23 assault rifle introduced in Y11S2?",
    choices: [
      { text: "A high-damage bullpup with a moderate rate of fire", is_correct: true },
      { text: "A low-damage rifle with an extremely high rate of fire", is_correct: false },
      { text: "A semi-automatic marksman rifle with a five-round magazine", is_correct: false },
      { text: "A close-range shotgun with slug ammunition", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "After the Y11S2.3 update, what is Hibana's X-Kairos detonation timer?",
    choices: [
      { text: "2.5 seconds", is_correct: false },
      { text: "3.8 seconds", is_correct: true },
      { text: "5 seconds", is_correct: false },
      { text: "7 seconds", is_correct: false },
    ],
  },
  {
    quiz_id: 3,
    text: "After the Y11S2.3 update, how much total fuel ammunition does Maverick's Breaching Torch carry?",
    choices: [
      { text: "288", is_correct: false },
      { text: "300", is_correct: false },
      { text: "320", is_correct: true },
      { text: "360", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "What does Noor's Horus Lance Launcher do when its projectile hits a shield or destructible surface?",
    choices: [
      { text: "It creates a temporary smoke screen", is_correct: false },
      { text: "It attaches, then erupts into flames", is_correct: true },
      { text: "It electrifies the surface for 10 seconds", is_correct: false },
      { text: "It deploys a bulletproof camera", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "What kind of limited-time mode was Wasteland Circuit, introduced during Operation Split Fire?",
    choices: [
      { text: "A 1v1 operator duel", is_correct: false },
      { text: "A hostage extraction race", is_correct: false },
      { text: "A drone-racing event", is_correct: true },
      { text: "A five-round bomb-defusal tournament", is_correct: false },
    ],
  },
  {
    quiz_id: 4,
    text: "What competitive playlist division was added in Operation Split Fire?",
    choices: [
      { text: "Legend Division", is_correct: true },
      { text: "Champion Division", is_correct: false },
      { text: "Elite Division", is_correct: false },
      { text: "Master Division", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "Which team won the Six Invitational 2026 grand final, defeating Team Secret 3–1?",
    choices: [
      { text: "FaZe Clan", is_correct: true },
      { text: "Team Falcons", is_correct: false },
      { text: "Team Secret", is_correct: false },
      { text: "FURIA", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "Which new Defender headlined Operation Split Fire, released on September 1, 2026?",
    choices: [
      { text: "Denari", is_correct: false },
      { text: "Noor", is_correct: true },
      { text: "Rauora", is_correct: false },
      { text: "Solis", is_correct: false },
    ],
  },
  {
    quiz_id: 5,
    text: "Which team won the Rainbow Six Siege tournament at the Esports World Cup 2026, beating FURIA 3–1?",
    choices: [
      { text: "FURIA", is_correct: false },
      { text: "Team Secret", is_correct: false },
      { text: "FaZe Clan", is_correct: true },
      { text: "G2 Esports", is_correct: false },
    ],
  },
];

const RANKED_SEED_QUESTION_TEXTS = new Set([
  "Which attacker uses the 'Kawan Hive Launcher' to deploy swarms of tracking nanobots in doorways and choke points?",
  "What is the name of Solis's tactical visor capable of detecting attacker electronic gadgets through surfaces?",
  "Which hard breacher throws hydraulic 'S.E.L.M.A.' sequential explosive cylinders?",
  "Which attacker operates the automated BU-GI auto-breacher tank that chews through soft floors and barricades?",
  "Which new Defender uses the Horus Lance Launcher to counter shield pushes in Operation Split Fire?",
  "In Dokkaebi's Y11S2 Jegeo Payload rework, what must happen for the upload to complete?",
  "Which three Operators received the XK23 assault rifle in the Y11S2 loadout update?",
  "Which new map inspired by Rainbow Six: Vegas launched with Operation System Override in June 2026?",
  "Operation Split Fire's targeted Villa update moved which first-floor areas to the basement?",
  "Which three maps received visual overhauls in Operation Split Fire?",
  "On Oregon, which exterior structure callout contains a high-level ladder sniper vantage point over Meeting Hall?",
  "On Villa, what universally recognized callout refers to the 90-degree corner hallway connecting Trophy and Aviator?",
  "On Theme Park, which bomb site was previously known as 'Haunted Dining' before the competitive rework?",
  "On Clubhouse, what is the narrow dirt tunnel in the basement called that attackers push from Construction?",
  "Which defender is famous for wielding the blisteringly fast 1200 RPM Vector .45 ACP submachine gun?",
  "What specific recoil benefit does the 'Flash Hider' muzzle attachment provide in Rainbow Six Siege?",
  "What unique stat boost does the 'Extended Barrel' attachment provide to compatible weapons?",
  "Which heavy sniper rifle belongs to Kali and penetrates multiple soft walls and bodies with intense velocity?",
  "How did Ubisoft describe the new XK23 assault rifle introduced in Y11S2?",
  "After the Y11S2.3 update, what is Hibana's X-Kairos detonation timer?",
  "After the Y11S2.3 update, how much total fuel ammunition does Maverick's Breaching Torch carry?",
  "How long does the standard Preparation Phase last in competitive Ranked and Esports matches?",
  "How many total wall reinforcements does the defending team pool share collectively at the round start?",
  "Under standard competitive Bomb settings, how long does it take an attacker to plant the defuser?",
  "How does Thatcher's EMP Grenade interact with active electrical gadgets like Bandit batteries or Kaid claws?",
  "How does audio propagation work in the Rainbow Six Siege physics engine?",
  "What does Noor's Horus Lance Launcher do when its projectile hits a shield or destructible surface?",
  "What kind of limited-time mode was Wasteland Circuit, introduced during Operation Split Fire?",
  "What competitive playlist division was added in Operation Split Fire?",
  "Which North American roster won the inaugural PC Six Invitational in Montreal in 2017?",
  "Which legendary European roster achieved back-to-back Six Invitational championship titles in 2018 and 2019?",
  "Which famous Year 2 operation cancelled new operator releases to overhaul server tick rates and core engine stability?",
  "Which Brazilian team became the first South American squad to lift the Six Invitational Hammer in 2021?",
  "Which team won the Six Invitational 2026 grand final, defeating Team Secret 3–1?",
  "Which new Defender headlined Operation Split Fire, released on September 1, 2026?",
  "Which team won the Rainbow Six Siege tournament at the Esports World Cup 2026, beating FURIA 3–1?",
]);

const SEED_SHOP_ITEMS = [
  {
    id: 1,
    name: "Tactical Breacher",
    type: "badge",
    cost_renown: 50,
    rarity: "common",
    description: "Reinforced steel breaching hammer insignia.",
  },
  {
    id: 2,
    name: "Defuser Specialist",
    type: "badge",
    cost_renown: 100,
    rarity: "rare",
    description: "Electronic bomb defusal carrier insignia.",
  },
  {
    id: 3,
    name: "Black Ice Crest",
    type: "badge",
    cost_renown: 250,
    rarity: "epic",
    description: "Shimmering glacial camouflage crest.",
  },
  {
    id: 4,
    name: "Six Invitational Star",
    type: "badge",
    cost_renown: 500,
    rarity: "legendary",
    description: "Official Six Invitational tournament champion crest.",
  },
  {
    id: 5,
    name: "Recruit",
    type: "title",
    cost_renown: 30,
    rarity: "common",
    description: "Standard issue operator title.",
  },
  {
    id: 6,
    name: "Clutch Master",
    type: "title",
    cost_renown: 120,
    rarity: "rare",
    description: "Title awarded to players who clutch 1vX situations.",
  },
  {
    id: 7,
    name: "Hard Breacher",
    type: "title",
    cost_renown: 200,
    rarity: "rare",
    description: "Master of reinforced wall entry.",
  },
  {
    id: 8,
    name: "Six Champion",
    type: "title",
    cost_renown: 600,
    rarity: "legendary",
    description: "Elite title for top-tier tactical players.",
  },
  {
    id: 9,
    name: "Midnight Siege",
    type: "theme",
    cost_renown: 150,
    rarity: "rare",
    description: "Deep carbon black UI with high-contrast amber highlights.",
  },
  {
    id: 10,
    name: "Black Ice Frost",
    type: "theme",
    cost_renown: 350,
    rarity: "epic",
    description: "Glacial cyan & arctic tactical palette.",
  },
  {
    id: 11,
    name: "Pro League Gold",
    type: "theme",
    cost_renown: 500,
    rarity: "legendary",
    description: "Prestige championship gold and platinum tactical aesthetic.",
  },
];

const SEED_PASS_GOALS = [
  {
    id: 1,
    track: "free",
    goal_type: "complete_quizzes",
    target: 3,
    item_id: 5, // Recruit title
    description: "Complete 3 tactical quizzes (any category)",
  },
  {
    id: 2,
    track: "free",
    goal_type: "score_high",
    target: 1,
    item_id: 1, // Tactical Breacher badge
    description: "Score 80%+ on any tactical quiz",
  },
  {
    id: 3,
    track: "free",
    goal_type: "daily_streak",
    target: 2,
    item_id: 9, // Midnight Siege theme
    description: "Achieve a 2-day daily streak",
  },
  {
    id: 4,
    track: "premium",
    goal_type: "complete_quizzes",
    target: 10,
    item_id: 4, // Six Invitational Star
    description: "Complete 10 tactical quizzes",
  },
  {
    id: 5,
    track: "premium",
    goal_type: "perfect_score",
    target: 1,
    item_id: 8, // Six Champion title
    description: "Score 100% (Flawless) on any quiz",
  },
  {
    id: 6,
    track: "premium",
    goal_type: "earn_renown",
    target: 200,
    item_id: 10, // Black Ice Frost theme
    description: "Earn 200 total Renown from deployments",
  },
];

// Helper to save memory database to disk for persistence
function persistMemoryDb() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryDb, null, 2), "utf8");
  } catch (err) {
    console.warn("Could not persist memory DB to file:", err.message);
  }
}

// Load persisted memory DB if exists
function loadMemoryDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") {
        memoryDb = { ...memoryDb, ...parsed };
      }
    }
  } catch (err) {
    console.warn("Could not load persisted memory DB, using fresh store:", err.message);
  }
}

let isPgConnected = false;
let pgPool = null;

export async function initDatabase() {
  loadMemoryDb();
  for (const question of memoryDb.questions) {
    if (!question.difficulty) {
      question.difficulty = RANKED_SEED_QUESTION_TEXTS.has(question.text) ? "ranked" : "standard";
    }
  }
  for (const user of memoryDb.users) {
    if (!Number.isFinite(Number(user.lifetime_renown))) {
      user.lifetime_renown = Number(user.renown) || 0;
    }
  }

  // Seed default seed data in memoryDb if empty
  if (memoryDb.quizzes.length === 0) {
    memoryDb.quizzes = [...SEED_QUIZZES];
  }
  if (memoryDb.questions.length === 0) {
    let qId = 1;
    let cId = 1;
    for (const q of SEED_QUESTIONS_DATA) {
      memoryDb.questions.push({
        id: qId,
        quiz_id: q.quiz_id,
        text: q.text,
        position: qId,
        difficulty: RANKED_SEED_QUESTION_TEXTS.has(q.text) ? "ranked" : "standard",
      });
      for (const c of q.choices) {
        memoryDb.choices.push({
          id: cId++,
          question_id: qId,
          text: c.text,
          is_correct: c.is_correct,
        });
      }
      qId++;
    }
  }

  // Add new built-in questions to existing memory stores without replacing
  // questions that have been added or edited by teachers.
  for (const seedQuiz of SEED_QUIZZES) {
    const quiz = memoryDb.quizzes.find((item) => item.title === seedQuiz.title);
    if (!quiz) continue;

    const seedQuestions = SEED_QUESTIONS_DATA.filter(
      (question) => question.quiz_id === seedQuiz.id,
    );
    for (const [index, seedQuestion] of seedQuestions.entries()) {
      if (
        memoryDb.questions.some(
          (question) => question.quiz_id === quiz.id && question.text === seedQuestion.text,
        )
      ) {
        continue;
      }

      const questionId = Math.max(0, ...memoryDb.questions.map((question) => question.id)) + 1;
      const currentQuizQuestions = memoryDb.questions.filter(
        (question) => question.quiz_id === quiz.id,
      );
      memoryDb.questions.push({
        id: questionId,
        quiz_id: quiz.id,
        text: seedQuestion.text,
        position: Math.max(0, ...currentQuizQuestions.map((question) => question.position)) + 1,
        difficulty: RANKED_SEED_QUESTION_TEXTS.has(seedQuestion.text) ? "ranked" : "standard",
      });

      let choiceId = Math.max(0, ...memoryDb.choices.map((choice) => choice.id)) + 1;
      for (const choice of seedQuestion.choices) {
        memoryDb.choices.push({
          id: choiceId++,
          question_id: questionId,
          text: choice.text,
          is_correct: choice.is_correct,
        });
      }
    }
  }

  if (memoryDb.shop_items.length === 0) {
    memoryDb.shop_items = [...SEED_SHOP_ITEMS];
  }
  if (memoryDb.pass_goals.length === 0) {
    memoryDb.pass_goals = [...SEED_PASS_GOALS];
  }

  // Ensure default teacher account 'benrud' exists
  const teacherPassword = process.env.TEACHER_PASSWORD || "TeacherSiege2026!";
  const teacherExists = memoryDb.users.some((u) => u.username === "benrud");
  if (!teacherExists) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(teacherPassword, salt);
    memoryDb.users.push({
      id: 1,
      username: "benrud",
      email: "benrud@r6tactical.edu",
      password_hash: hash,
      role: "teacher",
      renown: 1500,
      rank: "Champion",
      created_at: new Date().toISOString(),
      streak_count: 5,
      streak_last_date: new Date().toISOString().split("T")[0],
      equipped_title: "Six Champion",
      equipped_badge: "Six Invitational Star",
      equipped_theme: "Midnight Siege",
      avatar: "🎖️",
      is_guest: false,
    });
  }

  // Ensure a sample player account exists for quick testing
  const demoExists = memoryDb.users.some((u) => u.username === "recruit_mason");
  if (!demoExists) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync("Recruit2026!", salt);
    memoryDb.users.push({
      id: 2,
      username: "recruit_mason",
      email: "recruit@r6tactical.edu",
      password_hash: hash,
      role: "player",
      renown: 250,
      rank: "Silver",
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      streak_count: 2,
      streak_last_date: new Date().toISOString().split("T")[0],
      equipped_title: "Recruit",
      equipped_badge: "Tactical Breacher",
      equipped_theme: null,
      avatar: "🛡️",
      is_guest: false,
    });
    // Add demo attempts for recruit_mason to demonstrate leaderboards and history immediately
    memoryDb.attempts.push({
      id: 101,
      user_id: 2,
      quiz_id: 1,
      score: 9,
      question_count: 11,
      completed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      is_complete: true,
    });
    memoryDb.attempts.push({
      id: 102,
      user_id: 2,
      quiz_id: 2,
      score: 8,
      question_count: 11,
      completed_at: new Date(Date.now() - 86400000).toISOString(),
      is_complete: true,
    });
    memoryDb.unlocks.push({
      id: 1,
      user_id: 2,
      item_id: 1, // Tactical Breacher
      unlocked_at: new Date().toISOString(),
    });
    memoryDb.unlocks.push({
      id: 2,
      user_id: 2,
      item_id: 5, // Recruit
      unlocked_at: new Date().toISOString(),
    });
  }

  persistMemoryDb();

  // Attempt real PostgreSQL setup if DATABASE_URL is supplied
  if (process.env.DATABASE_URL) {
    try {
      pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
      pgPool.on("error", (err) => {
        console.warn("PostgreSQL idle client error:", err.message);
      });
      const client = await pgPool.connect();
      try {
        const migrationState = await client.query(`
          SELECT
            EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'lifetime_renown'
            ) AS has_lifetime_renown,
            EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema() AND table_name = 'questions' AND column_name = 'difficulty'
            ) AS has_question_difficulty
        `);
        const hasLifetimeRenown = migrationState.rows[0].has_lifetime_renown;
        const hasQuestionDifficulty = migrationState.rows[0].has_question_difficulty;

        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'player',
            renown INT NOT NULL DEFAULT 0,
            lifetime_renown INT NOT NULL DEFAULT 0,
            rank TEXT NOT NULL DEFAULT 'Unranked',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            streak_count INT NOT NULL DEFAULT 0,
            streak_last_date DATE,
            equipped_title TEXT,
            equipped_badge TEXT,
            equipped_theme TEXT,
            avatar TEXT NOT NULL DEFAULT '🛡️',
            is_guest BOOLEAN NOT NULL DEFAULT false
          );

          CREATE TABLE IF NOT EXISTS quizzes (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS questions (
            id SERIAL PRIMARY KEY,
            quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            position INT NOT NULL DEFAULT 1,
            difficulty TEXT NOT NULL DEFAULT 'standard'
          );

          CREATE TABLE IF NOT EXISTS choices (
            id SERIAL PRIMARY KEY,
            question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            is_correct BOOLEAN NOT NULL DEFAULT false
          );

          CREATE TABLE IF NOT EXISTS attempts (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            score INT,
            question_count INT NOT NULL,
            mode TEXT NOT NULL DEFAULT 'practice',
            completed_at TIMESTAMPTZ,
            is_complete BOOLEAN NOT NULL DEFAULT false
          );

          CREATE TABLE IF NOT EXISTS shop_items (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            cost_renown INT NOT NULL,
            rarity TEXT NOT NULL,
            description TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS unlocks (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            item_id INT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
            unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS pass_goals (
            id SERIAL PRIMARY KEY,
            track TEXT NOT NULL,
            goal_type TEXT NOT NULL,
            target INT NOT NULL,
            item_id INT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
            description TEXT
          );

          CREATE TABLE IF NOT EXISTS pass_progress (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            goal_id INT NOT NULL REFERENCES pass_goals(id) ON DELETE CASCADE,
            progress INT NOT NULL DEFAULT 0,
            achieved_at TIMESTAMPTZ
          );

          CREATE TABLE IF NOT EXISTS premium_pass (
            id SERIAL PRIMARY KEY,
            user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_renown INT NOT NULL DEFAULT 0");
        await client.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'standard'");
        await client.query("ALTER TABLE attempts ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'practice'");
        if (!hasLifetimeRenown) {
          await client.query("UPDATE users SET lifetime_renown = renown");
        }
        if (!hasQuestionDifficulty) {
          for (const questionText of RANKED_SEED_QUESTION_TEXTS) {
            await client.query(
              "UPDATE questions SET difficulty = 'ranked' WHERE text = $1",
              [questionText],
            );
          }
        }

        // Keep a fresh PostgreSQL database playable without overwriting any
        // quizzes or questions that have already been added by a teacher.
        await client.query("BEGIN");
        try {
          for (const seedQuiz of SEED_QUIZZES) {
            const quizResult = await client.query(
              "SELECT id FROM quizzes WHERE title = $1 ORDER BY id ASC LIMIT 1",
              [seedQuiz.title],
            );
            let quizId = quizResult.rows[0]?.id;

            if (!quizId) {
              const insertedQuiz = await client.query(
                "INSERT INTO quizzes (title, description) VALUES ($1, $2) RETURNING id",
                [seedQuiz.title, seedQuiz.description],
              );
              quizId = insertedQuiz.rows[0].id;
            }

            const seedQuestions = SEED_QUESTIONS_DATA.filter(
              (question) => question.quiz_id === seedQuiz.id,
            );
            for (const [index, seedQuestion] of seedQuestions.entries()) {
              const existingQuestion = await client.query(
                "SELECT 1 FROM questions WHERE quiz_id = $1 AND text = $2 LIMIT 1",
                [quizId, seedQuestion.text],
              );
              if (existingQuestion.rows.length > 0) continue;

              const insertedQuestion = await client.query(
                "INSERT INTO questions (quiz_id, text, position, difficulty) VALUES ($1, $2, $3, $4) RETURNING id",
                [
                  quizId,
                  seedQuestion.text,
                  index + 1,
                  RANKED_SEED_QUESTION_TEXTS.has(seedQuestion.text) ? "ranked" : "standard",
                ],
              );
              for (const choice of seedQuestion.choices) {
                await client.query(
                  "INSERT INTO choices (question_id, text, is_correct) VALUES ($1, $2, $3)",
                  [insertedQuestion.rows[0].id, choice.text, choice.is_correct],
                );
              }
            }
          }
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }

        isPgConnected = true;
        console.log("PostgreSQL connected and schema verified.");
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn("PostgreSQL connection failed, using persistent in-memory engine:", err.message);
      isPgConnected = false;
    }
  }
}

// Database helper operations supporting both PostgreSQL and the in-memory engine
export const db = {
  isPostgres: () => isPgConnected,

  async getHealth() {
    if (isPgConnected && pgPool) {
      try {
        await pgPool.query("SELECT 1 AS ready");
        return { status: "ok", backend: "postgresql" };
      } catch (err) {
        return { status: "ok", backend: "in-memory-fallback", error: err.message };
      }
    }
    return { status: "ok", backend: "in-memory-storage" };
  },

  // Users
  async findUserByUsernameOrEmail(identifier) {
    const ident = identifier.toLowerCase().trim();
    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query(
          "SELECT * FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1",
          [ident]
        );
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn("PG findUser error, fallback:", err.message);
      }
    }
    return (
      memoryDb.users.find(
        (u) =>
          u.username.toLowerCase() === ident || u.email.toLowerCase() === ident
      ) || null
    );
  },

  async findUserById(id) {
    const numId = Number(id);
    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query("SELECT * FROM users WHERE id = $1", [numId]);
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn("PG findUserById error, fallback:", err.message);
      }
    }
    return memoryDb.users.find((u) => u.id === numId) || null;
  },

  async createUser({ username, email, password_hash, avatar, is_guest }) {
    const userAvatar = avatar || "🛡️";
    const userIsGuest = Boolean(is_guest);

    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query(
          `INSERT INTO users (username, email, password_hash, role, renown, rank, created_at, streak_count, avatar, is_guest)
           VALUES ($1, $2, $3, 'player', 0, 'Unranked', NOW(), 0, $4, $5)
           RETURNING *`,
          [username.trim(), email.trim(), password_hash, userAvatar, userIsGuest]
        );
        return res.rows[0];
      } catch (err) {
        console.warn("PG createUser error, fallback:", err.message);
      }
    }
    const newId = (memoryDb.users.length ? Math.max(...memoryDb.users.map((u) => u.id)) : 0) + 1;
    const newUser = {
      id: newId,
      username: username.trim(),
      email: email.trim(),
      password_hash,
      role: "player",
      renown: 0,
      rank: "Unranked",
      created_at: new Date().toISOString(),
      streak_count: 0,
      streak_last_date: null,
      equipped_title: null,
      equipped_badge: null,
      equipped_theme: null,
      avatar: userAvatar,
      is_guest: userIsGuest,
    };
    memoryDb.users.push(newUser);
    persistMemoryDb();
    return newUser;
  },

  async updateUser(id, fields) {
    const numId = Number(id);
    if (isPgConnected && pgPool) {
      try {
        const keys = Object.keys(fields);
        const setClause = keys.map((k, idx) => `${k} = $${idx + 2}`).join(", ");
        const values = [numId, ...keys.map((k) => fields[k])];
        const res = await pgPool.query(
          `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
          values
        );
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn("PG updateUser error, fallback:", err.message);
      }
    }
    const user = memoryDb.users.find((u) => u.id === numId);
    if (user) {
      Object.assign(user, fields);
      persistMemoryDb();
    }
    return user;
  },

  // Quizzes
  async getQuizzes() {
    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query("SELECT * FROM quizzes ORDER BY id ASC");
        if (res.rows.length) return res.rows;
      } catch (err) {
        console.warn("PG getQuizzes error, fallback:", err.message);
      }
    }
    return [...memoryDb.quizzes];
  },

  async getQuizById(id) {
    const numId = Number(id);
    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query("SELECT * FROM quizzes WHERE id = $1", [numId]);
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn("PG getQuizById error, fallback:", err.message);
      }
    }
    return memoryDb.quizzes.find((q) => q.id === numId) || null;
  },

  // Questions & Choices
  async getQuestionsForQuiz(quizId, includeAnswers = false, difficulty = null) {
    const qid = Number(quizId);
    const rankedOnly = difficulty === "ranked";
    let questions = [];
    if (isPgConnected && pgPool) {
      try {
        const qRes = await pgPool.query(
          rankedOnly
            ? "SELECT id, quiz_id, text, position, difficulty FROM questions WHERE quiz_id = $1 AND difficulty = 'ranked' ORDER BY position ASC, id ASC"
            : "SELECT id, quiz_id, text, position, difficulty FROM questions WHERE quiz_id = $1 ORDER BY position ASC, id ASC",
          [qid],
        );
        questions = qRes.rows;
        for (const q of questions) {
          const cRes = await pgPool.query(
            includeAnswers
              ? "SELECT id, question_id, text, is_correct FROM choices WHERE question_id = $1 ORDER BY id ASC"
              : "SELECT id, question_id, text FROM choices WHERE question_id = $1 ORDER BY id ASC",
            [q.id]
          );
          q.choices = cRes.rows;
        }
        return questions;
      } catch (err) {
        console.warn("PG getQuestionsForQuiz error, fallback:", err.message);
      }
    }

    questions = memoryDb.questions
      .filter((q) => q.quiz_id === qid && (!rankedOnly || q.difficulty === "ranked"))
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map((q) => {
        const choices = memoryDb.choices
          .filter((c) => c.question_id === q.id)
          .map((c) => {
            if (includeAnswers) {
              return { id: c.id, question_id: c.question_id, text: c.text, is_correct: c.is_correct };
            }
            return { id: c.id, question_id: c.question_id, text: c.text };
          });
        return {
          id: q.id,
          quiz_id: q.quiz_id,
          text: q.text,
          position: q.position,
          difficulty: q.difficulty || "standard",
          choices,
        };
      });

    return questions;
  },

  async addQuestion({ quiz_id, text, position, choices, difficulty = "standard" }) {
    const qid = Number(quiz_id);
    const pos = Number(position || 1);
    const questionDifficulty = difficulty === "ranked" ? "ranked" : "standard";
    if (isPgConnected && pgPool) {
      try {
        const qRes = await pgPool.query(
          "INSERT INTO questions (quiz_id, text, position, difficulty) VALUES ($1, $2, $3, $4) RETURNING *",
          [qid, text.trim(), pos, questionDifficulty],
        );
        const question = qRes.rows[0];
        question.choices = [];
        for (const c of choices) {
          const cRes = await pgPool.query(
            "INSERT INTO choices (question_id, text, is_correct) VALUES ($1, $2, $3) RETURNING *",
            [question.id, c.text.trim(), Boolean(c.is_correct)]
          );
          question.choices.push(cRes.rows[0]);
        }
        return question;
      } catch (err) {
        console.warn("PG addQuestion error, fallback:", err.message);
      }
    }

    const newQId = (memoryDb.questions.length ? Math.max(...memoryDb.questions.map((q) => q.id)) : 0) + 1;
    const newQuestion = {
      id: newQId,
      quiz_id: qid,
      text: text.trim(),
      position: pos,
      difficulty: questionDifficulty,
    };
    memoryDb.questions.push(newQuestion);

    const savedChoices = [];
    for (const c of choices) {
      const newCId = (memoryDb.choices.length ? Math.max(...memoryDb.choices.map((ch) => ch.id)) : 0) + 1;
      const newChoice = {
        id: newCId,
        question_id: newQId,
        text: c.text.trim(),
        is_correct: Boolean(c.is_correct),
      };
      memoryDb.choices.push(newChoice);
      savedChoices.push(newChoice);
    }
    persistMemoryDb();
    return { ...newQuestion, choices: savedChoices };
  },

  async updateQuestion(questionId, { text, position, choices, difficulty }) {
    const qid = Number(questionId);
    if (isPgConnected && pgPool) {
      try {
        const fields = [];
        const values = [qid];
        if (text !== undefined) {
          values.push(text.trim());
          fields.push(`text = $${values.length}`);
        }
        if (position !== undefined) {
          values.push(Number(position || 1));
          fields.push(`position = $${values.length}`);
        }
        if (difficulty !== undefined) {
          values.push(difficulty === "ranked" ? "ranked" : "standard");
          fields.push(`difficulty = $${values.length}`);
        }
        if (fields.length) {
          const updated = await pgPool.query(
            `UPDATE questions SET ${fields.join(", ")} WHERE id = $1 RETURNING id`,
            values,
          );
          if (!updated.rows[0]) return { success: false, error: "Question not found" };
        }
        if (Array.isArray(choices) && choices.length) {
          await pgPool.query("DELETE FROM choices WHERE question_id = $1", [qid]);
          for (const c of choices) {
            await pgPool.query(
              "INSERT INTO choices (question_id, text, is_correct) VALUES ($1, $2, $3)",
              [qid, c.text.trim(), Boolean(c.is_correct)]
            );
          }
        }
        return { success: true };
      } catch (err) {
        console.warn("PG updateQuestion error, fallback:", err.message);
      }
    }

    const q = memoryDb.questions.find((item) => item.id === qid);
    if (q) {
      if (text !== undefined) q.text = text.trim();
      if (position !== undefined) q.position = Number(position);
      if (difficulty !== undefined) q.difficulty = difficulty === "ranked" ? "ranked" : "standard";
      if (Array.isArray(choices) && choices.length) {
        memoryDb.choices = memoryDb.choices.filter((c) => c.question_id !== qid);
        for (const c of choices) {
          const newCId = (memoryDb.choices.length ? Math.max(...memoryDb.choices.map((ch) => ch.id)) : 0) + 1;
          memoryDb.choices.push({
            id: newCId,
            question_id: qid,
            text: c.text.trim(),
            is_correct: Boolean(c.is_correct),
          });
        }
      }
      persistMemoryDb();
      return { success: true };
    }
    return { success: false, error: "Question not found" };
  },

  async deleteQuestion(questionId) {
    const qid = Number(questionId);
    if (isPgConnected && pgPool) {
      try {
        await pgPool.query("DELETE FROM questions WHERE id = $1", [qid]);
        return { success: true };
      } catch (err) {
        console.warn("PG deleteQuestion error, fallback:", err.message);
      }
    }
    memoryDb.questions = memoryDb.questions.filter((q) => q.id !== qid);
    memoryDb.choices = memoryDb.choices.filter((c) => c.question_id !== qid);
    persistMemoryDb();
    return { success: true };
  },

  // Attempts
  async startAttempt({ user_id, quiz_id, question_count, mode = "practice" }) {
    const uid = Number(user_id);
    const qid = Number(quiz_id);
    const count = Number(question_count);
    const attemptMode = mode === "ranked" ? "ranked" : "practice";

    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query(
          `INSERT INTO attempts (user_id, quiz_id, score, question_count, mode, completed_at, is_complete)
           VALUES ($1, $2, NULL, $3, $4, NULL, false)
           RETURNING id`,
          [uid, qid, count, attemptMode],
        );
        return res.rows[0].id;
      } catch (err) {
        console.warn("PG startAttempt error, fallback:", err.message);
      }
    }

    const newId = (memoryDb.attempts.length ? Math.max(...memoryDb.attempts.map((a) => a.id)) : 0) + 1;
    const attempt = {
      id: newId,
      user_id: uid,
      quiz_id: qid,
      score: null,
      question_count: count,
      mode: attemptMode,
      completed_at: null,
      is_complete: false,
    };
    memoryDb.attempts.push(attempt);
    persistMemoryDb();
    return newId;
  },

  async getAttemptById(attemptId) {
    const aid = Number(attemptId);
    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query("SELECT * FROM attempts WHERE id = $1", [aid]);
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn("PG getAttemptById error, fallback:", err.message);
      }
    }
    return memoryDb.attempts.find((attempt) => attempt.id === aid) || null;
  },

  async finishAttempt(attemptId, score) {
    const aid = Number(attemptId);
    const sc = Number(score);
    const now = new Date().toISOString();

    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query(
          `UPDATE attempts
           SET score = $1, is_complete = true, completed_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [sc, aid]
        );
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn("PG finishAttempt error, fallback:", err.message);
      }
    }

    const attempt = memoryDb.attempts.find((a) => a.id === aid);
    if (attempt) {
      attempt.score = sc;
      attempt.is_complete = true;
      attempt.completed_at = now;
      persistMemoryDb();
    }
    return attempt;
  },

  async getUserAttempts(userId) {
    const uid = Number(userId);
    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query(
          `SELECT a.*, q.title AS quiz_title
           FROM attempts a
           JOIN quizzes q ON q.id = a.quiz_id
           WHERE a.user_id = $1 AND a.is_complete = true
           ORDER BY a.completed_at DESC`,
          [uid]
        );
        return res.rows;
      } catch (err) {
        console.warn("PG getUserAttempts error, fallback:", err.message);
      }
    }

    return memoryDb.attempts
      .filter((a) => a.user_id === uid && a.is_complete === true)
      .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))
      .map((a) => {
        const quiz = memoryDb.quizzes.find((q) => q.id === a.quiz_id);
        return {
          ...a,
          quiz_title: quiz ? quiz.title : `Quiz #${a.quiz_id}`,
        };
      });
  },

  async getUserQuizBestScore(userId, quizId) {
    const uid = Number(userId);
    const qid = Number(quizId);
    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query(
          "SELECT MAX(score) AS best FROM attempts WHERE user_id = $1 AND quiz_id = $2 AND is_complete = true",
          [uid, qid],
        );
        if (res.rows[0]?.best !== null && res.rows[0]?.best !== undefined) {
          return Number(res.rows[0].best);
        }
      } catch (err) {
        console.warn("PG getUserQuizBestScore error, fallback:", err.message);
      }
    }
    const userAttempts = memoryDb.attempts.filter(
      (a) => a.user_id === uid && a.quiz_id === qid && a.is_complete
    );
    if (userAttempts.length === 0) return null;
    return Math.max(...userAttempts.map((a) => a.score ?? 0));
  },

  // Leaderboards
  async getOverallLeaderboard() {
    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query(
          `SELECT u.id, u.username, u.rank, u.equipped_title, u.equipped_badge, u.avatar,
                  COUNT(a.id) AS total_attempts,
                  AVG(CAST(a.score AS FLOAT) / a.question_count * 100) AS avg_percentage,
                  MIN(a.completed_at) AS first_completion
           FROM users u
           JOIN attempts a ON a.user_id = u.id
           WHERE a.is_complete = true
           GROUP BY u.id, u.username, u.rank, u.equipped_title, u.equipped_badge, u.avatar
           ORDER BY total_attempts DESC, first_completion ASC`
        );
        return res.rows;
      } catch (err) {
        console.warn("PG getOverallLeaderboard error, fallback:", err.message);
      }
    }

    const counts = {};
    for (const a of memoryDb.attempts) {
      if (!a.is_complete) continue;
      if (!counts[a.user_id]) {
        counts[a.user_id] = {
          user_id: a.user_id,
          total_attempts: 0,
          total_score: 0,
          total_max: 0,
          first_completion: a.completed_at,
        };
      }
      counts[a.user_id].total_attempts += 1;
      counts[a.user_id].total_score += a.score || 0;
      counts[a.user_id].total_max += a.question_count || 1;
      if (
        new Date(a.completed_at) < new Date(counts[a.user_id].first_completion)
      ) {
        counts[a.user_id].first_completion = a.completed_at;
      }
    }

    const rows = Object.values(counts)
      .map((entry) => {
        const u = memoryDb.users.find((user) => user.id === entry.user_id);
        if (!u) return null;
        return {
          id: u.id,
          username: u.username,
          rank: u.rank,
          equipped_title: u.equipped_title,
          equipped_badge: u.equipped_badge,
          avatar: u.avatar || "🛡️",
          total_attempts: entry.total_attempts,
          avg_percentage: entry.total_max
            ? Math.round((entry.total_score / entry.total_max) * 100)
            : 0,
          first_completion: entry.first_completion,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.total_attempts !== a.total_attempts) {
          return b.total_attempts - a.total_attempts;
        }
        return new Date(a.first_completion || 0) - new Date(b.first_completion || 0);
      });

    return rows;
  },

  async getPerQuizLeaderboard(quizId) {
    const qid = Number(quizId);
    if (isPgConnected && pgPool) {
      try {
        const res = await pgPool.query(
          `SELECT u.username, u.rank, u.equipped_title, u.equipped_badge, u.avatar,
                  MAX(a.score) AS best,
                  COUNT(*) FILTER (WHERE a.is_complete) AS attempts,
                  MIN(a.completed_at) AS first_best_date
           FROM attempts a
           JOIN users u ON u.id = a.user_id
           WHERE a.quiz_id = $1 AND a.is_complete = true
           GROUP BY u.username, u.rank, u.equipped_title, u.equipped_badge, u.avatar
           ORDER BY best DESC, attempts ASC, first_best_date ASC`,
          [qid]
        );
        return res.rows;
      } catch (err) {
        console.warn("PG getPerQuizLeaderboard error, fallback:", err.message);
      }
    }

    const map = {};
    for (const a of memoryDb.attempts) {
      if (!a.is_complete || a.quiz_id !== qid) continue;
      if (!map[a.user_id]) {
        map[a.user_id] = {
          user_id: a.user_id,
          best: a.score ?? 0,
          attempts: 0,
          first_best_date: a.completed_at,
        };
      }
      map[a.user_id].attempts += 1;
      if ((a.score ?? 0) > map[a.user_id].best) {
        map[a.user_id].best = a.score ?? 0;
        map[a.user_id].first_best_date = a.completed_at;
      }
    }

    const rows = Object.values(map)
      .map((entry) => {
        const u = memoryDb.users.find((user) => user.id === entry.user_id);
        if (!u) return null;
        return {
          username: u.username,
          rank: u.rank,
          equipped_title: u.equipped_title,
          equipped_badge: u.equipped_badge,
          avatar: u.avatar || "🛡️",
          best: entry.best,
          attempts: entry.attempts,
          first_best_date: entry.first_best_date,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.best !== a.best) return b.best - a.best;
        if (a.attempts !== b.attempts) return a.attempts - b.attempts;
        return new Date(a.first_best_date || 0) - new Date(b.first_best_date || 0);
      });

    return rows;
  },

  // Shop & Unlocks
  async getShopItems() {
    return [...memoryDb.shop_items];
  },

  async getUserUnlocks(userId) {
    const uid = Number(userId);
    return memoryDb.unlocks.filter((u) => u.user_id === uid);
  },

  async unlockItem(userId, itemId) {
    const uid = Number(userId);
    const iid = Number(itemId);
    const exists = memoryDb.unlocks.some(
      (u) => u.user_id === uid && u.item_id === iid
    );
    if (!exists) {
      const newId = (memoryDb.unlocks.length ? Math.max(...memoryDb.unlocks.map((u) => u.id)) : 0) + 1;
      memoryDb.unlocks.push({
        id: newId,
        user_id: uid,
        item_id: iid,
        unlocked_at: new Date().toISOString(),
      });
      persistMemoryDb();
    }
  },

  // Operation Pass
  async getPassGoals() {
    return [...memoryDb.pass_goals];
  },

  async hasPremiumPass(userId) {
    const uid = Number(userId);
    return memoryDb.premium_pass.some((p) => p.user_id === uid);
  },

  async unlockPremiumPass(userId) {
    const uid = Number(userId);
    if (!memoryDb.premium_pass.some((p) => p.user_id === uid)) {
      const newId = (memoryDb.premium_pass.length ? Math.max(...memoryDb.premium_pass.map((p) => p.id)) : 0) + 1;
      memoryDb.premium_pass.push({
        id: newId,
        user_id: uid,
        unlocked_at: new Date().toISOString(),
      });
      persistMemoryDb();
    }
  },

  async getPassProgress(userId) {
    const uid = Number(userId);
    return memoryDb.pass_progress.filter((p) => p.user_id === uid);
  },

  async updatePassProgress(userId, goalId, progressDelta, target) {
    const uid = Number(userId);
    const gid = Number(goalId);
    let row = memoryDb.pass_progress.find(
      (p) => p.user_id === uid && p.goal_id === gid
    );
    if (!row) {
      const newId = (memoryDb.pass_progress.length ? Math.max(...memoryDb.pass_progress.map((p) => p.id)) : 0) + 1;
      row = {
        id: newId,
        user_id: uid,
        goal_id: gid,
        progress: 0,
        achieved_at: null,
      };
      memoryDb.pass_progress.push(row);
    }
    row.progress += progressDelta;
    let newlyAchieved = false;
    if (row.progress >= target && !row.achieved_at) {
      row.achieved_at = new Date().toISOString();
      newlyAchieved = true;
    }
    persistMemoryDb();
    return { row, newlyAchieved };
  },

  // Rank calculation combines average score with lifetime Renown unlock gates.
  async recalculateSkillRank(userId) {
    const uid = Number(userId);
    const attempts = await this.getUserAttempts(uid);

    if (attempts.length === 0) {
      await this.updateUser(uid, { rank: "Unranked" });
      return "Unranked";
    }

    const totalScore = attempts.reduce((acc, a) => acc + (a.score ?? 0), 0);
    const totalMax = attempts.reduce((acc, a) => acc + (a.question_count || 1), 0);
    const avgPct = Math.round((totalScore / totalMax) * 100);
    const user = await this.findUserById(uid);
    const lifetimeRenown = Number(user?.lifetime_renown ?? user?.renown ?? 0);
    const rankTiers = [
      { name: "Copper", minScore: 0, minRenown: 0 },
      { name: "Bronze", minScore: 40, minRenown: 50 },
      { name: "Silver", minScore: 55, minRenown: 150 },
      { name: "Gold", minScore: 70, minRenown: 300 },
      { name: "Platinum", minScore: 80, minRenown: 500 },
      { name: "Diamond", minScore: 90, minRenown: 750 },
      { name: "Champion", minScore: 98, minRenown: 1000 },
    ];
    const eligibleTiers = rankTiers.filter(
      (tier) => avgPct >= tier.minScore && lifetimeRenown >= tier.minRenown,
    );
    const rank = eligibleTiers.at(-1)?.name || "Copper";

    await this.updateUser(uid, { rank });
    return rank;
  },
};
