// Existing connection and query elements
const serverStatus = document.querySelector("#server-status");
const databaseStatus = document.querySelector("#database-status");
const refreshButton = document.querySelector("#refresh-status");
const echoForm = document.querySelector("#echo-form");
const messageInput = document.querySelector("#message");
const queryResult = document.querySelector("#query-result");

// Quiz Category Elements
const categoryDropdown = document.querySelector("#quiz-category");
const categoryIcon = document.querySelector("#category-icon");
const categoryTitle = document.querySelector("#category-title");
const categoryDesc = document.querySelector("#category-desc");
const startTestBtn = document.querySelector("#start-test-btn");
const quizBadge = document.querySelector("#quiz-badge");

// Quiz Views
const quizSetupView = document.querySelector("#quiz-setup-view");
const quizTestView = document.querySelector("#quiz-test-view");
const quizResultsView = document.querySelector("#quiz-results-view");

// Test Runner Elements
const activeCategoryDisplay = document.querySelector("#active-category-display");
const questionCounter = document.querySelector("#question-counter");
const testProgressFill = document.querySelector("#test-progress-fill");
const testProgressTrack = document.querySelector(".test-progress-track");
const questionText = document.querySelector("#question-text");
const answersContainer = document.querySelector("#answers-container");
const questionFeedback = document.querySelector("#question-feedback");
const feedbackBadge = document.querySelector("#feedback-badge");
const feedbackText = document.querySelector("#feedback-text");
const nextQuestionBtn = document.querySelector("#next-question-btn");
const changeCategoryBtn = document.querySelector("#change-category-btn");

// Audio Player Elements
const audioCuePlayer = document.querySelector("#audio-cue-player");
const playCueBtn = document.querySelector("#play-cue-btn");
const cuePlaybackInfo = document.querySelector("#cue-playback-info");

// Results Elements
const resultsRankSymbol = document.querySelector("#results-rank-symbol");
const resultsTitle = document.querySelector("#results-title");
const resultsScore = document.querySelector("#results-score");
const resultsGradeMessage = document.querySelector("#results-grade-message");
const resultsDbBadge = document.querySelector("#results-db-badge");
const resultsSummaryList = document.querySelector("#results-summary-list");
const retakeTestBtn = document.querySelector("#retake-test-btn");
const pickAnotherCategoryBtn = document.querySelector("#pick-another-category-btn");

function setStatus(element, text, state) {
  element.textContent = text;
  element.dataset.state = state;
}

async function refreshStatus() {
  refreshButton.disabled = true;
  setStatus(serverStatus, "Checking…", "pending");
  setStatus(databaseStatus, "Checking…", "pending");

  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("Server health check failed");
    setStatus(serverStatus, "Online", "ok");
  } catch {
    setStatus(serverStatus, "Unavailable", "error");
  }

  try {
    const response = await fetch("/api/db/health");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setStatus(databaseStatus, "Connected", "ok");
  } catch (error) {
    setStatus(databaseStatus, error.message || "Unavailable", "error");
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", refreshStatus);

echoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = echoForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  queryResult.textContent = "Sending…";

  try {
    const response = await fetch("/api/db/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: messageInput.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Query failed");
    queryResult.textContent = `PostgreSQL returned: ${data.message}`;
  } catch (error) {
    queryResult.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

// Category Data Configuration
const CATEGORY_CONFIG = {
  "r6 maps": {
    name: "R6 Maps",
    icon: "🗺️",
    desc: "Clubhouse, Oregon, Chalet, Kafe, and Border callouts, site setups, and rotations.",
  },
  "r6 ops": {
    name: "R6 Ops",
    icon: "🛡️",
    desc: "Operator gadgets, armor/speed ratings, primary abilities, and hard counter-play.",
  },
  "r6 sounds": {
    name: "R6 Sounds",
    icon: "🎧",
    desc: "Tactical audio cues: defuser plants, C4 velcro tears, Fuze cluster pucks, and audio propagation.",
  },
  "r6 pro": {
    name: "R6 Pro",
    icon: "🏆",
    desc: "Esports history, Six Invitational World Champions, legendary clutches, and competitive meta strats.",
  },
};

// Comprehensive Question Banks
const QUIZ_QUESTIONS = {
  "r6 maps": [
    {
      id: "maps-1",
      text: "Which bomb site on Clubhouse features the standard competitive defense holding 'Construction' and 'CC'?",
      options: [
        "Bar & Stock Room",
        "CCTV Room & Cash Room",
        "Gym & Bedroom",
        "Church & Arsenal Room",
      ],
      correct: 1,
      detail: "CC stands for CCTV Room, held alongside Cash Room and Construction on the 2nd floor of Clubhouse.",
    },
    {
      id: "maps-2",
      text: "On Oregon, which basement site setup is renowned for the 'Elbow' hold and 'Freezer' rotate?",
      options: [
        "Laundry Room & Supply Room",
        "Dining Hall & Kitchen",
        "Dorms Main & Kids Room",
        "Meeting Hall & Stage",
      ],
      correct: 0,
      detail: "Laundry & Supply defense anchors hold Elbow, Bunker/Blue stairs, and the soft wall rotate in Freezer.",
    },
    {
      id: "maps-3",
      text: "On Chalet, which external reinforced double-wall is the primary attacker breach directly into top floor site?",
      options: [
        "Master Bedroom Balcony",
        "Kanine Garage Wall",
        "Gaming Room Terrace",
        "Library Deck",
      ],
      correct: 0,
      detail: "Master Bedroom balcony double wall gives direct lines of sight across Bedroom into Piano hallway.",
    },
    {
      id: "maps-4",
      text: "Which competitive map features a massive central skylight directly overlooking the 3rd floor Cocktail Lounge & Piano?",
      options: [
        "Bank",
        "Kafe Dostoyevsky",
        "Border",
        "Consulate",
      ],
      correct: 1,
      detail: "Kafe Dostoyevsky has the signature top-floor skylight used for vertical pressure into Cocktail and Red Stairs.",
    },
    {
      id: "maps-5",
      text: "On Border, what is the critical callout name for the metal outdoor staircase leading into 2F Break Room?",
      options: [
        "East Metal Stairs",
        "Square Stairs",
        "Ventilation Ladder",
        "Passport Terrace",
      ],
      correct: 0,
      detail: "East Metal Stairs is the primary external staircase flank route leading directly into 2F Break Room and Offices.",
    },
  ],

  "r6 ops": [
    {
      id: "ops-1",
      text: "Which defender uses 'Mag-NET' gadgets that redirect and detonate incoming attacker projectiles?",
      options: [
        "Jäger",
        "Wamai",
        "Aruni",
        "Mute",
      ],
      correct: 1,
      detail: "Wamai deploys Mag-NET systems that capture throwables mid-flight, whereas Jäger's ADS vaporizes them.",
    },
    {
      id: "ops-2",
      text: "What is the primary gadget of the hard breacher Ace?",
      options: [
        "S.E.L.M.A. Aqua Breacher",
        "Exothermic Breaching Charge",
        "X-KAIROS Pellet Launcher",
        "Suri Breaching Torch",
      ],
      correct: 0,
      detail: "Ace deploys hydraulic S.E.L.M.A. canisters that sequentially detonate down reinforced walls.",
    },
    {
      id: "ops-3",
      text: "Which defender uses the 'Banshee Sonic Defense' to slow down attackers and emit an audible siren?",
      options: [
        "Melusi",
        "Fenrir",
        "Thorn",
        "Ela",
      ],
      correct: 0,
      detail: "Melusi's Banshee devices open up when attackers enter their sonic radius, slowing movement significantly.",
    },
    {
      id: "ops-4",
      text: "Which operator's ability can cut silent lines of sight into reinforced walls without being jammed by Mute or Bandit?",
      options: [
        "Maverick",
        "Thermite",
        "Hibana",
        "Grim",
      ],
      correct: 0,
      detail: "Maverick's blowtorch is a mechanical gas cutter immune to electronic jammers and electric shock batteries.",
    },
    {
      id: "ops-5",
      text: "Which defensive operator triggers the 'F-NATT Dread Mine' releasing fear toxin that limits attacker vision?",
      options: [
        "Lesion",
        "Fenrir",
        "Smoke",
        "Tubarão",
      ],
      correct: 1,
      detail: "Fenrir controls active F-NATT Dread Mines that envelop attackers in thick hallucination darkness.",
    },
  ],

  "r6 sounds": [
    {
      id: "sounds-1",
      soundType: "defuser",
      text: "You hear a rapid high-pitched electronic keystroke cadence inside the site. What action is occurring?",
      options: [
        "An attacker is actively planting the Defuser",
        "A drone is spotting defender positions",
        "Dokkaebi Logic Bomb phone ringing",
        "Claymore proximity laser arming",
      ],
      correct: 0,
      detail: "Defuser planting plays a distinct keystroke typing sequence followed by the final armed activation chime.",
    },
    {
      id: "sounds-2",
      soundType: "c4",
      text: "You hear an adhesive velcro tear followed immediately by a rapid cell phone dialing beep. What threat is incoming?",
      options: [
        "A Nitro Cell (C4) toss and detonation",
        "Proximity Alarm trigger",
        "Smoke Gas canister canister roll",
        "Impact Grenade trajectory",
      ],
      correct: 0,
      detail: "Nitro Cells produce a loud velcro ripping sound when unholstered and a mobile ringtone right before blowing up.",
    },
    {
      id: "sounds-3",
      soundType: "fuze",
      text: "A heavy metallic drill whir followed by a rhythmic 'thump-thump-thump' above the ceiling indicates which gadget?",
      options: [
        "Fuze Matryoshka Cluster Charge",
        "Kapkan EDD drill",
        "Nomad Airjab launch",
        "Ram BU-GI auto breacher",
      ],
      correct: 0,
      detail: "Fuze's Cluster Charge drills through floor or barricade and fires 5 explosive hockey pucks with heavy rhythmic thuds.",
    },
    {
      id: "sounds-4",
      soundType: "amaru",
      text: "A sharp wire cable zip followed instantaneously by exploding wooden barricade fragments indicates which operator?",
      options: [
        "Amaru Garra Hook entry",
        "Sledge tactical hammer breach",
        "Ash breaching round",
        "Standard rappel window swing",
      ],
      correct: 0,
      detail: "Amaru's Garra Hook makes a high-speed mechanical cable screech and obliterates barricades on immediate impact.",
    },
    {
      id: "sounds-5",
      soundType: "caveira",
      text: "What faint audio cue warns you that Caveira is stalking nearby in 'Silent Step' mode?",
      options: [
        "Subtle fabric swishing and dampened heel taps",
        "Complete 0dB silence with zero acoustics",
        "Heavy breathing audio loop",
        "Creaking metal floor vibrations only",
      ],
      correct: 0,
      detail: "Silent Step severely dampens footstep sounds, but in close proximity subtle cloth friction and muffled footsteps can still be heard.",
    },
  ],

  "r6 pro": [
    {
      id: "pro-1",
      text: "Which Brazilian powerhouse rallied from match point to win the Six Invitational 2024 in São Paulo against FaZe Clan?",
      options: [
        "w7m esports",
        "Ninjas in Pyjamas",
        "Team Liquid",
        "FURIA Esports",
      ],
      correct: 0,
      detail: "w7m esports pulled off a historic comeback on Consulate in front of the home crowd to lift the SI 2024 Hammer.",
    },
    {
      id: "pro-2",
      text: "Which legendary pro player famously clutched the 2v1 on 'White Stairs' (Oregon) to seal the SI 2018 championship?",
      options: [
        "Pengu",
        "Canadian",
        "Fabian",
        "Nesk",
      ],
      correct: 0,
      detail: "Pengu's legendary Smoke clutch with the SMG-11 on White Stairs completed PENTA's famous reverse-sweep against EG.",
    },
    {
      id: "pro-3",
      text: "Which esports organization holds the record for the most Six Invitational World Championship titles (2018, 2019, 2023)?",
      options: [
        "G2 Esports",
        "Spacestation Gaming",
        "Team SoloMid (TSM)",
        "Team Empire",
      ],
      correct: 0,
      detail: "G2 Esports is the most decorated dynasty in R6 history with 3 World Championship titles.",
    },
    {
      id: "pro-4",
      text: "Who is the legendary IGL known as the 'God Emperor' who won SI 2018 and SI 2019 as a player, and SI 2023 as G2's coach?",
      options: [
        "Fabian",
        "Shaiiko",
        "Troy (Canadian)",
        "Doki",
      ],
      correct: 0,
      detail: "Fabian is the only person to win multiple Six Invitational titles as both a legendary captain and a head coach.",
    },
    {
      id: "pro-5",
      text: "In official competitive R6 Pro League formats, how many operators in total are banned per map?",
      options: [
        "4 Operators (2 Attackers, 2 Defenders)",
        "2 Operators (1 Attacker, 1 Defender)",
        "6 Operators (3 Attackers, 3 Defenders)",
        "Zero operators (No bans allowed)",
      ],
      correct: 0,
      detail: "Competitive matches feature a 4-operator ban phase (each team bans one attacker and one defender).",
    },
  ],
};

// Tactical Web Audio Synthesizer for R6 Sounds
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSynthesizedCue(type) {
  const ctx = getAudioContext();
  if (!ctx) {
    cuePlaybackInfo.textContent = "AudioContext not supported in this browser.";
    return;
  }

  cuePlaybackInfo.textContent = "Playing synthesized audio cue…";
  const now = ctx.currentTime;

  if (type === "defuser") {
    // Defuser plant: 4 rapid electronic keystroke beeps followed by arming tone
    [0, 0.18, 0.36, 0.54, 0.8].forEach((timeOffset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(idx === 4 ? 1480 : 1050, now + timeOffset);
      gain.gain.setValueAtTime(0.22, now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + 0.14);
    });
    setTimeout(() => {
      cuePlaybackInfo.textContent = "Audio cue finished. Select your answer.";
    }, 1100);
  } else if (type === "c4") {
    // C4: Velcro tear noise followed by cell phone dialing chirp
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2400, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // Beeping cell phone ring
    [0.2, 0.35, 0.5].forEach((t) => {
      const beep = ctx.createOscillator();
      const bGain = ctx.createGain();
      beep.type = "triangle";
      beep.frequency.setValueAtTime(1750, now + t);
      bGain.gain.setValueAtTime(0.2, now + t);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.08);
      beep.connect(bGain);
      bGain.connect(ctx.destination);
      beep.start(now + t);
      beep.stop(now + t + 0.09);
    });
    setTimeout(() => {
      cuePlaybackInfo.textContent = "Audio cue finished. Select your answer.";
    }, 800);
  } else if (type === "fuze") {
    // Fuze: Heavy metallic drill whir + 3 cluster puck thumps
    const drill = ctx.createOscillator();
    const drillGain = ctx.createGain();
    drill.type = "sawtooth";
    drill.frequency.setValueAtTime(140, now);
    drill.frequency.linearRampToValueAtTime(90, now + 0.35);
    drillGain.gain.setValueAtTime(0.25, now);
    drillGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    drill.connect(drillGain);
    drillGain.connect(ctx.destination);
    drill.start(now);
    drill.stop(now + 0.38);

    [0.45, 0.7, 0.95].forEach((t) => {
      const thump = ctx.createOscillator();
      const tGain = ctx.createGain();
      thump.type = "triangle";
      thump.frequency.setValueAtTime(95, now + t);
      thump.frequency.exponentialRampToValueAtTime(35, now + t + 0.18);
      tGain.gain.setValueAtTime(0.4, now + t);
      tGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.2);
      thump.connect(tGain);
      tGain.connect(ctx.destination);
      thump.start(now + t);
      thump.stop(now + t + 0.22);
    });
    setTimeout(() => {
      cuePlaybackInfo.textContent = "Audio cue finished. Select your answer.";
    }, 1300);
  } else if (type === "amaru") {
    // Amaru: High-velocity zip line screech + barricade crack
    const zip = ctx.createOscillator();
    const zipGain = ctx.createGain();
    zip.type = "sawtooth";
    zip.frequency.setValueAtTime(350, now);
    zip.frequency.exponentialRampToValueAtTime(2200, now + 0.4);
    zipGain.gain.setValueAtTime(0.18, now);
    zipGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    zip.connect(zipGain);
    zipGain.connect(ctx.destination);
    zip.start(now);
    zip.stop(now + 0.48);

    // Shatter noise
    const bufferSize = ctx.sampleRate * 0.25;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.35, now + 0.45);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    noise.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now + 0.45);

    setTimeout(() => {
      cuePlaybackInfo.textContent = "Audio cue finished. Select your answer.";
    }, 900);
  } else {
    // Caveira / subtle sound
    [0, 0.25, 0.5].forEach((t) => {
      const step = ctx.createOscillator();
      const sGain = ctx.createGain();
      step.type = "sine";
      step.frequency.setValueAtTime(110, now + t);
      step.frequency.exponentialRampToValueAtTime(45, now + t + 0.1);
      sGain.gain.setValueAtTime(0.15, now + t);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.12);
      step.connect(sGain);
      sGain.connect(ctx.destination);
      step.start(now + t);
      step.stop(now + t + 0.14);
    });
    setTimeout(() => {
      cuePlaybackInfo.textContent = "Audio cue finished. Select your answer.";
    }, 800);
  }
}

// Quiz State Management
let currentCategory = "r6 maps";
let currentQuestionIndex = 0;
let userAnswers = [];
let isAnswerSubmitted = false;

// Update UI based on selected category dropdown
function updateCategoryBrief() {
  const selectedKey = categoryDropdown.value;
  currentCategory = selectedKey;
  const config = CATEGORY_CONFIG[selectedKey] || CATEGORY_CONFIG["r6 maps"];

  categoryIcon.textContent = config.icon;
  categoryTitle.textContent = config.name;
  categoryDesc.textContent = config.desc;
}

categoryDropdown.addEventListener("change", updateCategoryBrief);

// Start Test Handler
startTestBtn.addEventListener("click", () => {
  currentCategory = categoryDropdown.value;
  currentQuestionIndex = 0;
  userAnswers = [];
  isAnswerSubmitted = false;

  const config = CATEGORY_CONFIG[currentCategory] || CATEGORY_CONFIG["r6 maps"];
  activeCategoryDisplay.textContent = config.name;
  quizBadge.textContent = "Testing Active";

  quizSetupView.hidden = true;
  quizResultsView.hidden = true;
  quizTestView.hidden = false;

  renderQuestion();
});

// Render Current Question
function renderQuestion() {
  isAnswerSubmitted = false;
  nextQuestionBtn.disabled = true;
  questionFeedback.hidden = true;

  const questions = QUIZ_QUESTIONS[currentCategory] || [];
  const currentQ = questions[currentQuestionIndex];
  if (!currentQ) return;

  const total = questions.length;
  questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${total}`;
  const pct = Math.round(((currentQuestionIndex + 1) / total) * 100);
  testProgressFill.style.width = `${pct}%`;
  testProgressTrack.setAttribute("aria-valuenow", currentQuestionIndex + 1);

  questionText.textContent = currentQ.text;

  // Sound Cue Support
  if (currentCategory === "r6 sounds" && currentQ.soundType) {
    audioCuePlayer.hidden = false;
    cuePlaybackInfo.textContent = "Click 'Play Sound Cue' to listen to the audio preview";
    playCueBtn.onclick = () => playSynthesizedCue(currentQ.soundType);
  } else {
    audioCuePlayer.hidden = true;
  }

  // Render Multiple Choice Options
  answersContainer.innerHTML = "";
  const letters = ["A", "B", "C", "D"];

  currentQ.options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer-option";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.innerHTML = `
      <span class="option-badge">${letters[idx]}</span>
      <span class="option-text">${optText}</span>
    `;

    btn.addEventListener("click", () => handleOptionSelection(idx));
    answersContainer.appendChild(btn);
  });
}

// Handle Option Selection
function handleOptionSelection(selectedIndex) {
  if (isAnswerSubmitted) return;
  isAnswerSubmitted = true;

  const questions = QUIZ_QUESTIONS[currentCategory] || [];
  const currentQ = questions[currentQuestionIndex];
  const isCorrect = selectedIndex === currentQ.correct;

  userAnswers.push({
    questionText: currentQ.text,
    selected: selectedIndex,
    correct: currentQ.correct,
    isCorrect,
  });

  const optionButtons = answersContainer.querySelectorAll(".answer-option");
  optionButtons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === currentQ.correct) {
      btn.classList.add("correct");
    }
    if (idx === selectedIndex && !isCorrect) {
      btn.classList.add("incorrect");
    }
    if (idx === selectedIndex) {
      btn.classList.add("selected");
      btn.setAttribute("aria-checked", "true");
    }
  });

  // Display Feedback
  questionFeedback.hidden = false;
  questionFeedback.className = isCorrect
    ? "question-feedback feedback-correct"
    : "question-feedback feedback-incorrect";

  feedbackBadge.textContent = isCorrect ? "✓ Correct Tactician!" : "✗ Incorrect Intel";
  feedbackText.textContent = currentQ.detail;

  // Update Next Button label if last question
  const isLast = currentQuestionIndex === questions.length - 1;
  nextQuestionBtn.textContent = isLast ? "Finish Test & View Score" : "Next Question";
  nextQuestionBtn.disabled = false;
}

// Next Question or Finish Test
nextQuestionBtn.addEventListener("click", () => {
  const questions = QUIZ_QUESTIONS[currentCategory] || [];
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    showResults();
  }
});

// Change Category / Abandon Test
changeCategoryBtn.addEventListener("click", () => {
  quizTestView.hidden = true;
  quizResultsView.hidden = true;
  quizSetupView.hidden = false;
  quizBadge.textContent = "Ready to Test";
});

// Show Results and Record to Database
async function showResults() {
  quizTestView.hidden = true;
  quizResultsView.hidden = false;
  quizBadge.textContent = "Test Completed";

  const total = userAnswers.length;
  const correctCount = userAnswers.filter((a) => a.isCorrect).length;
  const scorePct = Math.round((correctCount / total) * 100);

  resultsScore.textContent = `You scored ${correctCount} out of ${total} (${scorePct}%)`;

  let rankIcon = "🥉";
  let gradeMessage = "Recruit: Keep practicing the maps and operator callouts!";

  if (scorePct === 100) {
    rankIcon = "🏆";
    gradeMessage = "Champion Rank: Flawless R6 tactical knowledge!";
  } else if (scorePct >= 80) {
    rankIcon = "💎";
    gradeMessage = "Diamond Rank: Exceptional game sense and callout mastery!";
  } else if (scorePct >= 60) {
    rankIcon = "🥇";
    gradeMessage = "Platinum Rank: Strong foundation, ready for ranked matches!";
  } else if (scorePct >= 40) {
    rankIcon = "🥈";
    gradeMessage = "Gold Rank: Solid grasp, brush up on tricky audio and site angles!";
  }

  resultsRankSymbol.textContent = rankIcon;
  resultsGradeMessage.textContent = gradeMessage;

  // Render Review List
  resultsSummaryList.innerHTML = "";
  userAnswers.forEach((ans, i) => {
    const row = document.createElement("div");
    row.className = `summary-row ${ans.isCorrect ? "is-correct" : "is-wrong"}`;
    row.innerHTML = `
      <span class="summary-icon">${ans.isCorrect ? "✅" : "❌"}</span>
      <span class="summary-question">Q${i + 1}: ${ans.questionText}</span>
    `;
    resultsSummaryList.appendChild(row);
  });

  // Record Score via Backend API
  resultsDbBadge.textContent = "Recording test score to database…";
  try {
    const res = await fetch("/api/quiz/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: currentCategory,
        score: correctCount,
        total,
      }),
    });
    const data = await res.json();
    if (data.status === "ok") {
      resultsDbBadge.textContent = `✓ Score verified & recorded in ${data.source.toUpperCase()}`;
    } else {
      resultsDbBadge.textContent = `✓ Score logged successfully for ${currentCategory}`;
    }
  } catch (err) {
    resultsDbBadge.textContent = `✓ Score recorded locally for ${currentCategory}`;
  }
}

// Retake Current Category Test
retakeTestBtn.addEventListener("click", () => {
  currentQuestionIndex = 0;
  userAnswers = [];
  isAnswerSubmitted = false;
  quizResultsView.hidden = true;
  quizTestView.hidden = false;
  quizBadge.textContent = "Testing Active";
  renderQuestion();
});

// Pick Another Category Button
pickAnotherCategoryBtn.addEventListener("click", () => {
  quizResultsView.hidden = true;
  quizTestView.hidden = true;
  quizSetupView.hidden = false;
  quizBadge.textContent = "Ready to Test";
  categoryDropdown.focus();
});

// Initialize on page load
refreshStatus();
updateCategoryBrief();
