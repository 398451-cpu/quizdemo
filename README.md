# "Tactical Trivia" — R6 Siege Quiz App

A full-featured Rainbow Six Siege–themed quiz web application built for high school AI-assisted web development.

**Student**: Rhiz Fam  
**Status**: All 5 development phases built and operational  

---

## 1. What was built

- **5 Working Quizzes (10+ Tactical Questions each, 4 choices, exactly 1 correct)**:
  1. *Operators & Gadgets* — defensive denial, intel gadgets, hard breaching, and abilities
  2. *Maps & Callouts* — competitive bomb sites, key rooms, vertical play, and callouts
  3. *Weapons & Attachments* — recoil mitigation, barrel attachments, ADS speeds, and loadouts
  4. *Game Mechanics* — drone phase timings, team reinforcement pool, defuser mechanics, and audio propagation
  5. *History & Esports* — Six Invitational champions, historic clutches, operations, and pro meta
- **Full Authentication & RBAC**:
  - Register, Login, and Logout with `bcrypt` password hashing (passwords never stored as plaintext).
  - Strict role separation: Player vs. Teacher/Admin.
  - Teacher account: `benrud` (pre-seeded with `TeacherSiege2026!`).
  - Student demo account: `recruit_mason` (`Recruit2026!`).
  - Registration always assigns `role = 'player'`.
- **Quiz Engine & Attempt Lifecycle**:
  - Question-by-question flow with 4 choices.
  - Server-side scoring upon completion (answers kept hidden during the quiz to prevent cheating).
  - Attempt row created on quiz start (`is_complete = false, score = null`), updated on submission (`is_complete = true, score, question_count, completed_at`).
  - Unfinished/abandoned attempts are excluded from leaderboards and personal history.
  - End-of-round scoreboard with score, percentage, and "Elimination Cam" review.
- **My History**:
  - Displays logged-in user's completed attempts, dates, percentages, and results.
- **Two Unique Functional Features**:
  1. **Skill Rank System (Copper → Champion)**:
     - Recalculates the player's average score percentage across all completed attempts.
     - Unranked → Copper (0–39%) → Bronze (40–54%) → Silver (55–69%) → Gold (70–79%) → Platinum (80–89%) → Diamond (90–97%) → Champion (98–100%).
     - Displayed as a colored emblem next to the username on leaderboards and the operator profile card.
  2. **Operation Pass & Renown Shop**:
     - Renown currency: `+10` per completed quiz, `+5` extra for beating personal best, `+3` for daily streak increment.
     - Daily streak tracker (`streak_count` & `streak_last_date`).
     - Operation Pass with Free Track and 1,000 Renown Premium Track.
     - Renown Shop: Badges, Titles, and UI Color Themes (Midnight Siege, Black Ice Frost, Pro League Gold).
     - Live cosmetics loadout equip/unequip system.
- **Teacher HQ**:
  - Question Editor: Add, edit, or delete questions and choices; designate correct answers.
  - Standard CSV Template preview & validation: validates 7 columns, non-empty fields, correct answer ∈ {A, B, C, D}, and quiz title existence before committing clean rows to the database.

---

## 2. Tech Stack

- **Frontend**: Plain HTML5, CSS3, and JavaScript (no frameworks)
- **Server**: Node.js + Express 5 serving static files from `public/` and dynamic `/api/*` routes
- **Database**: PostgreSQL (accessed via `pg` with parameterized SQL) with persistent in-memory fallback
- **Security**: `bcryptjs` password hashing, HTTP cookies, server-side permission checks

---

## 3. Running the Application

```bash
# Install dependencies
npm install

# Start the development server (port 3000)
npm run dev

# Run code validation
npm run lint
```
