import express from "express";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { db, initDatabase } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDirectory = fileURLToPath(new URL("./public/", import.meta.url));

// Simple in-memory session store
const sessions = new Map(); // token -> { userId, expiresAt }

app.disable("x-powered-by");
app.use(express.json({ limit: "500kb" }));
app.use(cookieParser());
app.use(express.static(publicDirectory));
app.use("/src/assets/images", express.static(fileURLToPath(new URL("./src/assets/images/", import.meta.url))));

// Authentication middleware
async function getAuthenticatedUser(req) {
  const token = req.cookies?.tactical_session || req.headers?.authorization?.replace("Bearer ", "");
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  const user = await db.findUserById(session.userId);
  return user;
}

async function requireAuth(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  req.user = user;
  next();
}

async function requireTeacher(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (user.role !== "teacher") {
    return res.status(403).json({ error: "Teacher permissions required. Access denied." });
  }
  req.user = user;
  next();
}

function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  sessions.set(token, { userId, expiresAt });

  res.cookie("tactical_session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

// -------------------------------------------------------------
// Health and Diagnostic Routes
// -------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "Tactical Trivia — R6 Siege Quiz App" });
});

app.get("/api/db/health", async (_req, res) => {
  const health = await db.getHealth();
  res.json(health);
});

app.post("/api/db/echo", (req, res) => {
  const { message } = req.body ?? {};
  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ message: "Provide a non-empty message string." });
  }
  res.json({ message: message.trim() });
});

// -------------------------------------------------------------
// Authentication Routes (Section 7)
// -------------------------------------------------------------

// POST /api/guest-login (Play without password or email, pick callsign + guest pfp)
app.post("/api/guest-login", async (req, res) => {
  const { username, avatar } = req.body ?? {};

  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return res.status(400).json({ error: "Please enter a callsign (at least 2 characters)." });
  }

  const cleanUsername = username.trim().slice(0, 30);
  const selectedAvatar = (typeof avatar === "string" && avatar.trim()) ? avatar.trim() : "🛡️";

  // Check if callsign exists
  let user = await db.findUserByUsernameOrEmail(cleanUsername);

  if (user) {
    // If it's already a guest account, log them in directly and update avatar if requested
    if (user.is_guest || (user.email && user.email.includes("@guest.r6tactical.edu"))) {
      if (selectedAvatar && user.avatar !== selectedAvatar) {
        await db.updateUser(user.id, { avatar: selectedAvatar });
        user = await db.findUserById(user.id);
      }
    } else {
      // Username matches a registered teacher or student; append a tactical number for the guest
      const suffix = Math.floor(100 + Math.random() * 900);
      const guestCallsign = `${cleanUsername}_${suffix}`;
      const guestEmail = `guest_${Date.now()}_${suffix}@guest.r6tactical.edu`;
      const salt = bcrypt.genSaltSync(8);
      const password_hash = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), salt);

      user = await db.createUser({
        username: guestCallsign,
        email: guestEmail,
        password_hash,
        avatar: selectedAvatar,
        is_guest: true,
      });
    }
  } else {
    // Create fresh guest recruit account
    const guestEmail = `guest_${Date.now()}_${Math.floor(100 + Math.random() * 900)}@guest.r6tactical.edu`;
    const salt = bcrypt.genSaltSync(8);
    const password_hash = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), salt);

    user = await db.createUser({
      username: cleanUsername,
      email: guestEmail,
      password_hash,
      avatar: selectedAvatar,
      is_guest: true,
    });
  }

  const token = createSession(user.id, res);

  res.json({
    status: "ok",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar || selectedAvatar,
      renown: user.renown,
      rank: user.rank,
      streak_count: user.streak_count,
      equipped_title: user.equipped_title,
      equipped_badge: user.equipped_badge,
      equipped_theme: user.equipped_theme,
      is_guest: true,
    },
  });
});

// POST /api/register (public — always creates a player; never accepts a role field)
app.post("/api/register", async (req, res) => {
  const { username, email, password, avatar } = req.body ?? {};

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return res.status(400).json({ error: "Callsign/Username must be at least 3 characters." });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email address required." });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const existing = await db.findUserByUsernameOrEmail(username.trim());
  if (existing) {
    return res.status(409).json({ error: "Callsign or email is already registered." });
  }

  const existingEmail = await db.findUserByUsernameOrEmail(email.trim());
  if (existingEmail) {
    return res.status(409).json({ error: "Email is already registered." });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);

  // Per spec: role is ALWAYS hardcoded as 'player'
  const user = await db.createUser({
    username: username.trim(),
    email: email.trim(),
    password_hash,
    avatar: avatar || "🛡️",
    is_guest: false,
  });

  const token = createSession(user.id, res);

  res.status(201).json({
    status: "ok",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar || "🛡️",
      renown: user.renown,
      rank: user.rank,
      streak_count: user.streak_count,
      equipped_title: user.equipped_title,
      equipped_badge: user.equipped_badge,
      equipped_theme: user.equipped_theme,
    },
  });
});

// POST /api/login
app.post("/api/login", async (req, res) => {
  const { identifier, password } = req.body ?? {};

  if (!identifier || !password) {
    return res.status(400).json({ error: "Provide username/email and password." });
  }

  const user = await db.findUserByUsernameOrEmail(identifier);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials. Callsign or password incorrect." });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials. Callsign or password incorrect." });
  }

  const token = createSession(user.id, res);

  res.json({
    status: "ok",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar || "🛡️",
      renown: user.renown,
      rank: user.rank,
      streak_count: user.streak_count,
      equipped_title: user.equipped_title,
      equipped_badge: user.equipped_badge,
      equipped_theme: user.equipped_theme,
    },
  });
});

// POST /api/logout
app.post("/api/logout", (req, res) => {
  const token = req.cookies?.tactical_session || req.headers?.authorization?.replace("Bearer ", "");
  if (token) {
    sessions.delete(token);
  }
  res.clearCookie("tactical_session");
  res.json({ status: "ok", message: "Logged out successfully." });
});

// GET /api/me
app.get("/api/me", async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }

  const unlocks = await db.getUserUnlocks(user.id);
  const premium = await db.hasPremiumPass(user.id);

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar || "🛡️",
      renown: user.renown,
      rank: user.rank,
      streak_count: user.streak_count,
      streak_last_date: user.streak_last_date,
      equipped_title: user.equipped_title,
      equipped_badge: user.equipped_badge,
      equipped_theme: user.equipped_theme,
      is_guest: Boolean(user.is_guest),
    },
    unlocks: unlocks.map((u) => u.item_id),
    has_premium_pass: premium,
  });
});

// POST /api/me/avatar
app.post("/api/me/avatar", requireAuth, async (req, res) => {
  const { avatar } = req.body ?? {};
  if (!avatar || typeof avatar !== "string") {
    return res.status(400).json({ error: "Invalid avatar." });
  }
  await db.updateUser(req.user.id, { avatar: avatar.trim() });
  const updated = await db.findUserById(req.user.id);
  res.json({ status: "ok", user: updated });
});

// POST /api/me/equip
app.post("/api/me/equip", requireAuth, async (req, res) => {
  const { type, value } = req.body ?? {};
  // type: 'title' | 'badge' | 'theme'
  // value: string name or null to unequip

  const allowedTypes = ["title", "badge", "theme"];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid cosmetic type." });
  }

  const column = `equipped_${type}`;

  if (value === null || value === "") {
    await db.updateUser(req.user.id, { [column]: null });
    const updated = await db.findUserById(req.user.id);
    return res.json({ status: "ok", user: updated });
  }

  // Validate user owns this item in unlocks or item is free
  const shopItems = await db.getShopItems();
  const targetItem = shopItems.find((item) => item.type === type && item.name === value);
  if (!targetItem) {
    return res.status(404).json({ error: "Cosmetic item not found." });
  }

  const unlocks = await db.getUserUnlocks(req.user.id);
  const owns = unlocks.some((u) => u.item_id === targetItem.id);
  if (!owns && targetItem.cost_renown > 0) {
    return res.status(403).json({ error: "You must unlock this item before equipping it." });
  }

  await db.updateUser(req.user.id, { [column]: targetItem.name });
  const updated = await db.findUserById(req.user.id);
  res.json({ status: "ok", user: updated, equipped: { type, item: targetItem.name } });
});

// -------------------------------------------------------------
// Quizzes, Questions & Attempts Routes
// -------------------------------------------------------------

// GET /api/quizzes
app.get("/api/quizzes", requireAuth, async (req, res) => {
  const quizzes = await db.getQuizzes();
  const result = [];

  for (const q of quizzes) {
    const questions = await db.getQuestionsForQuiz(q.id, false);
    const bestScore = await db.getUserQuizBestScore(req.user.id, q.id);
    result.push({
      ...q,
      question_count: questions.length,
      user_best_score: bestScore,
    });
  }

  res.json(result);
});

// GET /api/quizzes/:id/questions (logged in, correct answers HIDDEN)
app.get("/api/quizzes/:id/questions", requireAuth, async (req, res) => {
  const quiz = await db.getQuizById(req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: "Quiz not found." });
  }

  const questions = await db.getQuestionsForQuiz(quiz.id, false);
  res.json({
    quiz: { id: quiz.id, title: quiz.title, description: quiz.description },
    questions,
  });
});

// POST /api/quizzes/:id/start
app.post("/api/quizzes/:id/start", requireAuth, async (req, res) => {
  const quiz = await db.getQuizById(req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: "Quiz not found." });
  }

  const questions = await db.getQuestionsForQuiz(quiz.id, false);
  const attemptId = await db.startAttempt({
    user_id: req.user.id,
    quiz_id: quiz.id,
    question_count: questions.length,
  });

  res.json({ status: "ok", attempt_id: attemptId });
});

// POST /api/quizzes/:id/attempts (Scores all answers server-side, saves attempt, returns score)
app.post("/api/quizzes/:id/attempts", requireAuth, async (req, res) => {
  const quizId = Number(req.params.id);
  const { attempt_id, answers } = req.body ?? {};

  const quiz = await db.getQuizById(quizId);
  if (!quiz) {
    return res.status(404).json({ error: "Quiz not found." });
  }

  // Load questions with full answer keys securely on the server
  const questions = await db.getQuestionsForQuiz(quizId, true);
  if (questions.length === 0) {
    return res.status(400).json({ error: "Quiz has no questions configured." });
  }

  let score = 0;
  const review = [];

  for (const q of questions) {
    const correctChoice = q.choices.find((c) => c.is_correct);
    const userChoiceId = answers ? answers[q.id] : null;
    const userChoice = q.choices.find((c) => c.id === userChoiceId);
    const isCorrect = correctChoice && userChoiceId === correctChoice.id;

    if (isCorrect) score += 1;

    review.push({
      question_id: q.id,
      question_text: q.text,
      user_choice: userChoice ? userChoice.text : "(No answer provided)",
      correct_choice: correctChoice ? correctChoice.text : "N/A",
      is_correct: Boolean(isCorrect),
    });
  }

  const questionCount = questions.length;
  const percentage = Math.round((score / questionCount) * 100);

  // If client provided attempt_id, mark that attempt finished; otherwise create a completed attempt
  let attempt;
  if (attempt_id) {
    attempt = await db.finishAttempt(attempt_id, score);
  } else {
    const aid = await db.startAttempt({
      user_id: req.user.id,
      quiz_id: quizId,
      question_count: questionCount,
    });
    attempt = await db.finishAttempt(aid, score);
  }

  // --- Renown & Personal Best Calculation ---
  let renownEarned = 10; // +10 base per completed quiz
  const priorBest = await db.getUserQuizBestScore(req.user.id, quizId);
  let beatPersonalBest = false;

  // Notice: prior best check before this attempt finished
  if (priorBest !== null && score > priorBest) {
    renownEarned += 5; // +5 extra for beating personal best
    beatPersonalBest = true;
  }

  // --- Daily Streak Calculation ---
  // Using user local/UTC date
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let streakCount = req.user.streak_count || 0;
  let streakBonus = 0;

  if (req.user.streak_last_date === yesterday) {
    streakCount += 1;
    streakBonus = 3; // +3 for daily-streak increment
  } else if (req.user.streak_last_date === todayStr) {
    // Already counted today, no change
  } else {
    // Streak reset to 1
    streakCount = 1;
    streakBonus = 3;
  }

  renownEarned += streakBonus;
  const newRenownTotal = (req.user.renown || 0) + renownEarned;

  await db.updateUser(req.user.id, {
    renown: newRenownTotal,
    streak_count: streakCount,
    streak_last_date: todayStr,
  });

  // --- Feature 1: Recalculate Skill Rank ---
  const prevRank = req.user.rank || "Unranked";
  const newRank = await db.recalculateSkillRank(req.user.id);

  // --- Feature 2: Operation Pass Progress Recalculation ---
  const goals = await db.getPassGoals();
  const hasPremium = await db.hasPremiumPass(req.user.id);
  const unlockedRewards = [];

  for (const g of goals) {
    if (g.track === "premium" && !hasPremium) continue;

    let delta = 0;
    if (g.goal_type === "complete_quizzes") delta = 1;
    if (g.goal_type === "score_high" && percentage >= 80) delta = 1;
    if (g.goal_type === "perfect_score" && percentage === 100) delta = 1;
    if (g.goal_type === "daily_streak") delta = streakCount >= g.target ? 1 : 0;
    if (g.goal_type === "earn_renown") delta = renownEarned;

    if (delta > 0) {
      const { newlyAchieved } = await db.updatePassProgress(req.user.id, g.id, delta, g.target);
      if (newlyAchieved) {
        await db.unlockItem(req.user.id, g.item_id);
        const items = await db.getShopItems();
        const rewardedItem = items.find((it) => it.id === g.item_id);
        if (rewardedItem) {
          unlockedRewards.push(rewardedItem.name);
        }
      }
    }
  }

  res.json({
    status: "ok",
    score,
    question_count: questionCount,
    percentage,
    renown_earned: renownEarned,
    renown_breakdown: {
      completion: 10,
      personal_best_bonus: beatPersonalBest ? 5 : 0,
      streak_bonus: streakBonus,
    },
    total_renown: newRenownTotal,
    rank: newRank,
    prev_rank: prevRank,
    rank_changed: newRank !== prevRank,
    streak_count: streakCount,
    unlocked_rewards: unlockedRewards,
    review, // End-of-quiz "elimination cam" review
  });
});

// GET /api/me/attempts (Logged-in user's own completed history only)
app.get("/api/me/attempts", requireAuth, async (req, res) => {
  const attempts = await db.getUserAttempts(req.user.id);
  res.json(attempts);
});

// -------------------------------------------------------------
// Leaderboards (Section 7)
// -------------------------------------------------------------

// GET /api/leaderboard (Overall leaderboard)
app.get("/api/leaderboard", requireAuth, async (_req, res) => {
  const leaderboard = await db.getOverallLeaderboard();
  res.json(leaderboard);
});

// GET /api/quizzes/:id/leaderboard (Per-quiz leaderboard)
app.get("/api/quizzes/:id/leaderboard", requireAuth, async (req, res) => {
  const quizId = Number(req.params.id);
  const quiz = await db.getQuizById(quizId);
  if (!quiz) {
    return res.status(404).json({ error: "Quiz not found." });
  }

  const leaderboard = await db.getPerQuizLeaderboard(quizId);
  res.json({ quiz, leaderboard });
});

// -------------------------------------------------------------
// Shop & Operation Pass Routes
// -------------------------------------------------------------

// GET /api/shop
app.get("/api/shop", requireAuth, async (req, res) => {
  const shopItems = await db.getShopItems();
  const passGoals = await db.getPassGoals();
  const unlocks = await db.getUserUnlocks(req.user.id);
  const progressList = await db.getPassProgress(req.user.id);
  const hasPremium = await db.hasPremiumPass(req.user.id);

  const ownedItemIds = new Set(unlocks.map((u) => u.item_id));

  const items = shopItems.map((item) => ({
    ...item,
    is_owned: ownedItemIds.has(item.id),
  }));

  const goals = passGoals.map((g) => {
    const progRow = progressList.find((p) => p.goal_id === g.id);
    const rewardItem = shopItems.find((it) => it.id === g.item_id);
    return {
      ...g,
      current_progress: progRow ? progRow.progress : 0,
      is_completed: progRow && progRow.progress >= g.target,
      reward_item: rewardItem || null,
    };
  });

  res.json({
    renown: req.user.renown,
    items,
    goals,
    has_premium_pass: hasPremium,
  });
});

// POST /api/shop/buy
app.post("/api/shop/buy", requireAuth, async (req, res) => {
  const { item_id } = req.body ?? {};
  const itemId = Number(item_id);

  const shopItems = await db.getShopItems();
  const item = shopItems.find((i) => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: "Item not found in tactical supply depot." });
  }

  const unlocks = await db.getUserUnlocks(req.user.id);
  if (unlocks.some((u) => u.item_id === itemId)) {
    return res.status(400).json({ error: "You already own this cosmetic item." });
  }

  if ((req.user.renown || 0) < item.cost_renown) {
    return res.status(400).json({
      error: `Insufficient Renown. Need ${item.cost_renown} Renown, but you have ${req.user.renown || 0}.`,
    });
  }

  const remaining = req.user.renown - item.cost_renown;
  await db.updateUser(req.user.id, { renown: remaining });
  await db.unlockItem(req.user.id, item.id);

  res.json({
    status: "ok",
    message: `Unlocked ${item.name}!`,
    renown: remaining,
    item,
  });
});

// POST /api/pass/unlock-premium
app.post("/api/pass/unlock-premium", requireAuth, async (req, res) => {
  const hasPremium = await db.hasPremiumPass(req.user.id);
  if (hasPremium) {
    return res.status(400).json({ error: "Operation Premium Pass already active." });
  }

  const COST = 1000;
  if ((req.user.renown || 0) < COST) {
    return res.status(400).json({
      error: `Unlocking Premium Operation Pass requires 1,000 Renown (you currently have ${req.user.renown || 0}).`,
    });
  }

  const remaining = req.user.renown - COST;
  await db.updateUser(req.user.id, { renown: remaining });
  await db.unlockPremiumPass(req.user.id);

  res.json({
    status: "ok",
    message: "Premium Operation Pass unlocked! Premium goal rewards are now active.",
    renown: remaining,
  });
});

// -------------------------------------------------------------
// Teacher Command Center: Question Editor & CSV Tools
// -------------------------------------------------------------

// GET /api/questions (Teacher only)
app.get("/api/questions", requireTeacher, async (req, res) => {
  const quizId = req.query.quiz_id;
  if (!quizId) {
    return res.status(400).json({ error: "Specify quiz_id query parameter." });
  }
  const questions = await db.getQuestionsForQuiz(quizId, true);
  res.json(questions);
});

// POST /api/questions (Teacher only)
app.post("/api/questions", requireTeacher, async (req, res) => {
  const { quiz_id, text, position, choices } = req.body ?? {};

  if (!quiz_id || !text || !Array.isArray(choices) || choices.length !== 4) {
    return res.status(400).json({
      error: "Question must have a quiz_id, prompt text, and exactly 4 choices.",
    });
  }

  const correctCount = choices.filter((c) => Boolean(c.is_correct)).length;
  if (correctCount !== 1) {
    return res.status(400).json({
      error: "Exactly one choice must be designated as correct.",
    });
  }

  const question = await db.addQuestion({
    quiz_id,
    text,
    position: position || 1,
    choices,
  });

  res.status(201).json({ status: "ok", question });
});

// PUT /api/questions/:id (Teacher only)
app.put("/api/questions/:id", requireTeacher, async (req, res) => {
  const qid = Number(req.params.id);
  const { text, position, choices } = req.body ?? {};

  if (Array.isArray(choices)) {
    if (choices.length !== 4) {
      return res.status(400).json({ error: "Questions must have exactly 4 choices." });
    }
    const correctCount = choices.filter((c) => Boolean(c.is_correct)).length;
    if (correctCount !== 1) {
      return res.status(400).json({ error: "Exactly one choice must be designated as correct." });
    }
  }

  const result = await db.updateQuestion(qid, { text, position, choices });
  if (!result.success) {
    return res.status(404).json({ error: result.error || "Question update failed." });
  }

  res.json({ status: "ok", message: "Question updated successfully." });
});

// DELETE /api/questions/:id (Teacher only)
app.delete("/api/questions/:id", requireTeacher, async (req, res) => {
  const qid = Number(req.params.id);
  await db.deleteQuestion(qid);
  res.json({ status: "ok", message: "Question deleted." });
});

// CSV parser helper
function parseCSVLines(csvContent) {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Parse each line respecting quotes if present
  const rows = [];
  for (const line of lines) {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && (i === 0 || line[i - 1] !== "\\")) {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

// POST /api/questions/preview (Teacher only — Validate CSV)
// Spec: quiz_title,question_text,choice_a,choice_b,choice_c,choice_d,correct_choice
app.post("/api/questions/preview", requireTeacher, async (req, res) => {
  const { csv_content } = req.body ?? {};
  if (!csv_content || typeof csv_content !== "string") {
    return res.status(400).json({ error: "CSV content required." });
  }

  const rows = parseCSVLines(csv_content);
  if (rows.length === 0) {
    return res.status(400).json({ error: "CSV file is empty." });
  }

  // Check header row
  let startIndex = 0;
  const firstRow = rows[0].map((c) => c.toLowerCase().replace(/[\s_]+/g, ""));
  if (firstRow[0].includes("quiz") && firstRow[1]?.includes("question")) {
    startIndex = 1; // Skip header
  }

  const quizzes = await db.getQuizzes();
  const quizTitleMap = new Map();
  for (const q of quizzes) {
    quizTitleMap.set(q.title.toLowerCase().trim(), q);
  }

  const validationResults = [];

  for (let idx = startIndex; idx < rows.length; idx++) {
    const cells = rows[idx];
    const rowNum = idx + 1;
    const errors = [];

    // Rule: exactly 7 columns
    if (cells.length !== 7) {
      errors.push(`Row has ${cells.length} columns instead of expected 7`);
    }

    const [quizTitle, questionText, choiceA, choiceB, choiceC, choiceD, correctChoice] = cells;

    // Rule: no empty fields
    if (!quizTitle) errors.push("Missing quiz_title");
    if (!questionText) errors.push("Missing question_text");
    if (!choiceA) errors.push("Missing choice_a");
    if (!choiceB) errors.push("Missing choice_b");
    if (!choiceC) errors.push("Missing choice_c");
    if (!choiceD) errors.push("Missing choice_d");
    if (!correctChoice) errors.push("Missing correct_choice");

    // Rule: quiz title exists
    const matchingQuiz = quizTitle ? quizTitleMap.get(quizTitle.toLowerCase().trim()) : null;
    if (quizTitle && !matchingQuiz) {
      errors.push(`Quiz "${quizTitle}" does not exist in the database`);
    }

    // Rule: correct_choice in {A, B, C, D}
    const cleanCorrect = correctChoice ? correctChoice.trim().toUpperCase() : "";
    if (correctChoice && !["A", "B", "C", "D"].includes(cleanCorrect)) {
      errors.push(`correct_choice must be A, B, C, or D (received "${correctChoice}")`);
    }

    validationResults.push({
      row_number: rowNum,
      is_valid: errors.length === 0,
      errors,
      parsed_data: {
        quiz_id: matchingQuiz ? matchingQuiz.id : null,
        quiz_title: quizTitle || "",
        question_text: questionText || "",
        choice_a: choiceA || "",
        choice_b: choiceB || "",
        choice_c: choiceC || "",
        choice_d: choiceD || "",
        correct_choice: cleanCorrect,
      },
    });
  }

  const validCount = validationResults.filter((r) => r.is_valid).length;
  const invalidCount = validationResults.filter((r) => !r.is_valid).length;

  res.json({
    total_rows: validationResults.length,
    valid_count: validCount,
    invalid_count: invalidCount,
    rows: validationResults,
  });
});

// POST /api/questions/import (Teacher only — Import validated rows)
app.post("/api/questions/import", requireTeacher, async (req, res) => {
  const { validated_rows } = req.body ?? {};
  if (!Array.isArray(validated_rows) || validated_rows.length === 0) {
    return res.status(400).json({ error: "No validated rows provided for import." });
  }

  let importedCount = 0;

  for (const item of validated_rows) {
    if (!item.is_valid) continue;
    const d = item.parsed_data;
    if (!d || !d.quiz_id) continue;

    const choices = [
      { text: d.choice_a, is_correct: d.correct_choice === "A" },
      { text: d.choice_b, is_correct: d.correct_choice === "B" },
      { text: d.choice_c, is_correct: d.correct_choice === "C" },
      { text: d.choice_d, is_correct: d.correct_choice === "D" },
    ];

    await db.addQuestion({
      quiz_id: d.quiz_id,
      text: d.question_text,
      position: 99,
      choices,
    });
    importedCount += 1;
  }

  res.json({
    status: "ok",
    imported_count: importedCount,
    message: `Successfully imported ${importedCount} tactical questions into the database.`,
  });
});

// -------------------------------------------------------------
// Boot sequence & Error handling
// -------------------------------------------------------------
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON in request payload." });
  }
  console.error("Server error:", error);
  res.status(500).json({ error: "Internal Tactical Server Error." });
});

await initDatabase();

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Tactical Trivia Server listening on 0.0.0.0:${port}`);
});

async function shutDown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
