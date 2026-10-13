// =====================================================================
// TACTICAL TRIVIA — CLIENT APPLICATION SCRIPT
// Rainbow Six Siege Quiz Engine: Skill Rank, Pass & Shop, Teacher HQ
// =====================================================================

(function () {
  "use strict";

  // Application State
  const state = {
    user: null,
    quizzes: [],
    activeQuiz: null,
    activeQuestions: [],
    currentQuestionIndex: 0,
    userAnswers: {}, // { [question_id]: choice_id }
    currentAttemptId: null,
    shopData: null,
    leaderboardTab: "overall",
    teacherSelectedQuizId: 1,
    csvPreviewData: null,
    selectedGuestAvatar: "🛡️",
  };

  const TACTICAL_PFPS = [
    { icon: "🛡️", name: "Recruit Shield" },
    { icon: "🪖", name: "Tactical Helmet" },
    { icon: "🎯", name: "Deadeye Sniper" },
    { icon: "💣", name: "Hard Breacher" },
    { icon: "⚡", name: "Volt Specialist" },
    { icon: "🕶️", name: "Night Ops" },
    { icon: "🦅", name: "Spec Ops Falcon" },
    { icon: "🐺", name: "Lone Wolf" },
  ];

  const RANDOM_CALLSIGNS = [
    "Vanguard_42", "Ash_Main", "SmokeScreen", "Echo_Pulse", "FrostBite",
    "Thermite_88", "Kapkan_Trap", "Doc_Heals", "Blitz_Rush", "Jager_ADS",
    "Sledge_Hammer", "Cav_Sneak", "Maverick_Blow", "Mira_Window", "Bandit_Trick",
    "Lion_Scan", "Finka_Surge", "Zero_Camera", "Grim_Hive", "Solis_Visor"
  ];

  // Audio Synth for Tactical Feedback (Web Audio API)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === "win") {
        // R6 Victory Stinger
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === "eliminated") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // DOM Elements
  const el = {
    // Navigation
    navTabs: document.querySelectorAll(".nav-tab"),
    navTeacherTab: document.querySelector("#nav-btn-teacher"),
    userPill: document.querySelector("#user-pill"),
    navUserAvatar: document.querySelector("#nav-user-avatar"),
    navRankBadge: document.querySelector("#nav-rank-badge"),
    navUsername: document.querySelector("#nav-username"),
    navRenownDisplay: document.querySelector("#nav-renown-display"),
    loginOpenBtn: document.querySelector("#login-open-btn"),
    quickPlayNavBtn: document.querySelector("#quick-play-nav-btn"),
    logoutBtn: document.querySelector("#logout-btn"),
    notification: document.querySelector("#tactical-notification"),
    notifMessage: document.querySelector("#notif-message"),
    notifCloseBtn: document.querySelector("#notif-close-btn"),

    // View Panels
    views: {
      home: document.querySelector("#view-home"),
      quizRunner: document.querySelector("#view-quiz-runner"),
      results: document.querySelector("#view-results"),
      leaderboard: document.querySelector("#view-leaderboard"),
      shop: document.querySelector("#view-shop"),
      history: document.querySelector("#view-history"),
      profile: document.querySelector("#view-profile"),
      teacher: document.querySelector("#view-teacher"),
    },

    // Home
    quizzesGrid: document.querySelector("#quizzes-grid"),
    guestQuickPlayBanner: document.querySelector("#guest-quick-play-banner"),
    quickGuestUsername: document.querySelector("#quick-guest-username"),
    quickGuestRandomBtn: document.querySelector("#quick-guest-random-btn"),
    quickGuestPfpPicker: document.querySelector("#quick-guest-pfp-picker"),
    quickGuestSubmitBtn: document.querySelector("#quick-guest-submit-btn"),
    quickLoginStudent: document.querySelector("#quick-login-student"),
    quickLoginTeacher: document.querySelector("#quick-login-teacher"),

    // Quiz Runner
    quitQuizBtn: document.querySelector("#quit-quiz-btn"),
    runnerQuizTitle: document.querySelector("#runner-quiz-title"),
    runnerCounter: document.querySelector("#runner-counter"),
    runnerProgressFill: document.querySelector("#runner-progress-fill"),
    dossierQNum: document.querySelector("#dossier-qnum"),
    runnerQuestionText: document.querySelector("#runner-question-text"),
    runnerChoicesList: document.querySelector("#runner-choices-list"),
    runnerPrevBtn: document.querySelector("#runner-prev-btn"),
    runnerNextBtn: document.querySelector("#runner-next-btn"),
    runnerSubmitBtn: document.querySelector("#runner-submit-btn"),
    runnerJumpIndicators: document.querySelector("#runner-jump-indicators"),

    // Results
    scoreboardStatusText: document.querySelector("#scoreboard-status-text"),
    scoreboardTitle: document.querySelector("#scoreboard-title"),
    scoreboardScoreNumbers: document.querySelector("#scoreboard-score-numbers"),
    scoreboardScorePct: document.querySelector("#scoreboard-score-pct"),
    scoreboardRankBadge: document.querySelector("#scoreboard-rank-badge"),
    scoreboardRankChangeNote: document.querySelector("#scoreboard-rank-change-note"),
    scoreboardRenownEarned: document.querySelector("#scoreboard-renown-earned"),
    scoreboardRenownBreakdown: document.querySelector("#scoreboard-renown-breakdown"),
    scoreboardStreakDisplay: document.querySelector("#scoreboard-streak-display"),
    scoreboardRetryBtn: document.querySelector("#scoreboard-retry-btn"),
    scoreboardBackBtn: document.querySelector("#scoreboard-back-btn"),
    eliminationCamList: document.querySelector("#elimination-cam-list"),

    // Leaderboards
    leaderboardTabs: document.querySelector("#leaderboard-tabs"),
    leaderboardTableBody: document.querySelector("#leaderboard-table-body"),
    lbMetaStrip: document.querySelector("#lb-meta-strip"),
    lbColStat1: document.querySelector("#lb-col-stat1"),
    lbColStat2: document.querySelector("#lb-col-stat2"),

    // Shop & Pass
    shopUserRenown: document.querySelector("#shop-user-renown"),
    premiumPassStatusText: document.querySelector("#premium-pass-status-text"),
    unlockPremiumPassBtn: document.querySelector("#unlock-premium-pass-btn"),
    freeGoalsList: document.querySelector("#free-goals-list"),
    premiumGoalsList: document.querySelector("#premium-goals-list"),
    shopItemsGrid: document.querySelector("#shop-items-grid"),
    shopFilterPills: document.querySelectorAll(".filter-pill"),

    // History
    historyTableBody: document.querySelector("#history-table-body"),
    refreshHistoryBtn: document.querySelector("#refresh-history-btn"),

    // Profile
    profileRoleBadge: document.querySelector("#profile-role-badge"),
    profileUsername: document.querySelector("#profile-username"),
    profileEmail: document.querySelector("#profile-email"),
    profileEquippedTitle: document.querySelector("#profile-equipped-title"),
    profileEquippedBadge: document.querySelector("#profile-equipped-badge"),
    profileRankDisplay: document.querySelector("#profile-rank-display"),
    profileRenownDisplay: document.querySelector("#profile-renown-display"),
    profileStreakDisplay: document.querySelector("#profile-streak-display"),
    profileAttemptsCount: document.querySelector("#profile-attempts-count"),
    equipTitleSelect: document.querySelector("#equip-title-select"),
    equipBadgeSelect: document.querySelector("#equip-badge-select"),
    equipThemeSelect: document.querySelector("#equip-theme-select"),
    saveLoadoutBtn: document.querySelector("#save-loadout-btn"),

    // Teacher HQ
    teacherTabEditor: document.querySelector("#teacher-tab-editor"),
    teacherTabCsv: document.querySelector("#teacher-tab-csv"),
    teacherSubEditor: document.querySelector("#teacher-sub-editor"),
    teacherSubCsv: document.querySelector("#teacher-sub-csv"),
    teacherQuizFilter: document.querySelector("#teacher-quiz-filter"),
    teacherNewQBtn: document.querySelector("#teacher-new-q-btn"),
    teacherQFormCard: document.querySelector("#teacher-q-form-card"),
    teacherFormTitle: document.querySelector("#teacher-form-title"),
    teacherQuestionForm: document.querySelector("#teacher-question-form"),
    teacherQId: document.querySelector("#teacher-q-id"),
    teacherQText: document.querySelector("#teacher-q-text"),
    teacherQQuiz: document.querySelector("#teacher-q-quiz"),
    teacherQPos: document.querySelector("#teacher-q-pos"),
    teacherCancelFormBtn: document.querySelector("#teacher-cancel-form-btn"),
    teacherQuestionsList: document.querySelector("#teacher-questions-list"),

    // CSV
    downloadCsvSampleBtn: document.querySelector("#download-csv-sample-btn"),
    csvFilePicker: document.querySelector("#csv-file-picker"),
    loadSampleCsvBtn: document.querySelector("#load-sample-csv-btn"),
    csvInputText: document.querySelector("#csv-input-text"),
    previewCsvBtn: document.querySelector("#preview-csv-btn"),
    csvPreviewContainer: document.querySelector("#csv-preview-container"),
    previewTotalCount: document.querySelector("#preview-total-count"),
    previewValidCount: document.querySelector("#preview-valid-count"),
    previewInvalidCount: document.querySelector("#preview-invalid-count"),
    commitCsvImportBtn: document.querySelector("#commit-csv-import-btn"),
    csvPreviewTableBody: document.querySelector("#csv-preview-table-body"),

    // Profile avatar & equips
    profileAvatarIcon: document.querySelector("#profile-avatar-icon"),
    equipAvatarSelect: document.querySelector("#equip-avatar-select"),

    // Auth Modal
    authModal: document.querySelector("#auth-modal"),
    authModalClose: document.querySelector("#auth-modal-close"),
    tabGuest: document.querySelector("#tab-guest"),
    tabLogin: document.querySelector("#tab-login"),
    tabRegister: document.querySelector("#tab-register"),
    guestForm: document.querySelector("#guest-form"),
    modalGuestUsername: document.querySelector("#modal-guest-username"),
    modalGuestRandomBtn: document.querySelector("#modal-guest-random-btn"),
    modalGuestPfpGrid: document.querySelector("#modal-guest-pfp-grid"),
    guestErrorMsg: document.querySelector("#guest-error-msg"),
    quickCredentialsBanner: document.querySelector("#quick-credentials-banner"),
    loginForm: document.querySelector("#login-form"),
    registerForm: document.querySelector("#register-form"),
    loginIdentifier: document.querySelector("#login-identifier"),
    loginPassword: document.querySelector("#login-password"),
    regUsername: document.querySelector("#reg-username"),
    regEmail: document.querySelector("#reg-email"),
    regPassword: document.querySelector("#reg-password"),
    loginErrorMsg: document.querySelector("#login-error-msg"),
    regErrorMsg: document.querySelector("#reg-error-msg"),
  };

  // Helper: Notify Banner
  function showNotification(message, isError = false) {
    el.notifMessage.textContent = message;
    el.notification.style.borderColor = isError ? "var(--color-eliminated)" : "var(--accent-primary)";
    el.notification.hidden = false;
    setTimeout(() => {
      el.notification.hidden = true;
    }, 4500);
  }

  el.notifCloseBtn?.addEventListener("click", () => {
    el.notification.hidden = true;
  });

  // Switch Active Navigation View
  function switchView(viewName) {
    playSound("click");
    Object.keys(el.views).forEach((name) => {
      if (el.views[name]) {
        el.views[name].hidden = true;
        el.views[name].classList.remove("active");
      }
    });

    const target = el.views[viewName];
    if (target) {
      target.hidden = false;
      target.classList.add("active");
    }

    el.navTabs.forEach((tab) => {
      if (tab.dataset.view === viewName) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    // Refresh view content dynamically
    if (viewName === "home") loadQuizzes();
    else if (viewName === "leaderboard") loadLeaderboard(state.leaderboardTab);
    else if (viewName === "shop") loadShop();
    else if (viewName === "history") loadHistory();
    else if (viewName === "profile") renderProfile();
    else if (viewName === "teacher") loadTeacherQuestions();
  }

  // Setup Nav Click Listeners
  el.navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.dataset.view;
      if (["shop", "history", "profile"].includes(view) && !state.user) {
        openAuthModal("guest");
        showNotification("Operator clearance required. Enter a callsign to continue.", false);
        return;
      }
      switchView(view);
    });
  });

  // -----------------------------------------------------------------
  // Tactical PFP (Profile Picture) & Callsign Helpers
  // -----------------------------------------------------------------
  function getRandomCallsign() {
    const base = RANDOM_CALLSIGNS[Math.floor(Math.random() * RANDOM_CALLSIGNS.length)];
    const num = Math.floor(10 + Math.random() * 89);
    return `${base}_${num}`;
  }

  function renderPfpPickers() {
    // 1. Render Modal PFP Grid
    if (el.modalGuestPfpGrid) {
      el.modalGuestPfpGrid.innerHTML = TACTICAL_PFPS.map((pfp) => {
        const isSelected = pfp.icon === state.selectedGuestAvatar;
        return `
          <button type="button" class="pfp-option-btn ${isSelected ? "selected" : ""}" data-icon="${pfp.icon}">
            <span>${pfp.icon}</span>
            <span class="pfp-name-tag">${pfp.name}</span>
          </button>
        `;
      }).join("");

      el.modalGuestPfpGrid.querySelectorAll(".pfp-option-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          playSound("click");
          state.selectedGuestAvatar = btn.dataset.icon;
          renderPfpPickers();
        });
      });
    }

    // 2. Render Home Inline PFP Picker
    if (el.quickGuestPfpPicker) {
      el.quickGuestPfpPicker.innerHTML = TACTICAL_PFPS.map((pfp) => {
        const isSelected = pfp.icon === state.selectedGuestAvatar;
        return `
          <button type="button" class="pfp-mini-btn ${isSelected ? "selected" : ""}" data-icon="${pfp.icon}" title="${pfp.name}">
            ${pfp.icon}
          </button>
        `;
      }).join("");

      el.quickGuestPfpPicker.querySelectorAll(".pfp-mini-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          playSound("click");
          state.selectedGuestAvatar = btn.dataset.icon;
          renderPfpPickers();
        });
      });
    }
  }

  // -----------------------------------------------------------------
  // Authentication & Session Management
  // -----------------------------------------------------------------
  function openAuthModal(defaultTab = "guest") {
    // Automatically redirect logged-in users to home page
    if (state.user) {
      closeAuthModal();
      switchView("home");
      showNotification(`Already authenticated as Operator ${state.user.username}.`);
      return;
    }

    el.authModal.hidden = false;
    el.loginErrorMsg.hidden = true;
    el.regErrorMsg.hidden = true;
    if (el.guestErrorMsg) el.guestErrorMsg.hidden = true;

    renderPfpPickers();

    if (defaultTab === "guest") {
      el.tabGuest.classList.add("active");
      el.tabLogin.classList.remove("active");
      el.tabRegister.classList.remove("active");
      el.guestForm.hidden = false;
      el.loginForm.hidden = true;
      el.registerForm.hidden = true;
      if (el.quickCredentialsBanner) el.quickCredentialsBanner.hidden = true;
      if (!el.modalGuestUsername.value) {
        el.modalGuestUsername.value = getRandomCallsign();
      }
      el.modalGuestUsername.focus();
    } else if (defaultTab === "login") {
      el.tabLogin.classList.add("active");
      el.tabGuest.classList.remove("active");
      el.tabRegister.classList.remove("active");
      el.loginForm.hidden = false;
      el.guestForm.hidden = true;
      el.registerForm.hidden = true;
      if (el.quickCredentialsBanner) el.quickCredentialsBanner.hidden = false;
      el.loginIdentifier.focus();
    } else {
      el.tabRegister.classList.add("active");
      el.tabGuest.classList.remove("active");
      el.tabLogin.classList.remove("active");
      el.registerForm.hidden = false;
      el.guestForm.hidden = true;
      el.loginForm.hidden = true;
      if (el.quickCredentialsBanner) el.quickCredentialsBanner.hidden = true;
      el.regUsername.focus();
    }
  }

  function closeAuthModal() {
    el.authModal.hidden = true;
  }

  el.loginOpenBtn.addEventListener("click", () => openAuthModal("login"));
  el.quickPlayNavBtn?.addEventListener("click", () => openAuthModal("guest"));
  el.authModalClose.addEventListener("click", closeAuthModal);

  el.tabGuest?.addEventListener("click", () => {
    openAuthModal("guest");
  });

  el.tabLogin.addEventListener("click", () => {
    openAuthModal("login");
  });

  el.tabRegister.addEventListener("click", () => {
    openAuthModal("register");
  });

  // Random callsign buttons
  el.modalGuestRandomBtn?.addEventListener("click", () => {
    playSound("click");
    el.modalGuestUsername.value = getRandomCallsign();
  });
  el.quickGuestRandomBtn?.addEventListener("click", () => {
    playSound("click");
    el.quickGuestUsername.value = getRandomCallsign();
  });

  // Guest login execution helper
  async function performGuestLogin(username, avatar) {
    const clean = (username || "").trim();
    if (!clean || clean.length < 2) {
      showNotification("Callsign must be at least 2 characters.", true);
      return;
    }

    try {
      const res = await fetch("/api/guest-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: clean,
          avatar: avatar || state.selectedGuestAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (el.guestErrorMsg) {
          el.guestErrorMsg.textContent = data.error || "Failed to log in as guest.";
          el.guestErrorMsg.hidden = false;
        }
        showNotification(data.error || "Failed to join.", true);
        return;
      }

      playSound("win");
      applyUserState(data.user);
      closeAuthModal();
      showNotification(`🎮 Welcome, Operator ${data.user.username}! Ready to deploy.`);
      loadQuizzes();
    } catch {
      showNotification("Server error during guest join.", true);
    }
  }

  // Modal Guest Form Submit
  el.guestForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    performGuestLogin(el.modalGuestUsername.value, state.selectedGuestAvatar);
  });

  // Home Banner Quick Guest Submit
  el.quickGuestSubmitBtn?.addEventListener("click", () => {
    const val = el.quickGuestUsername.value.trim() || getRandomCallsign();
    performGuestLogin(val, state.selectedGuestAvatar);
  });

  async function checkSession() {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          applyUserState(data.user);
        } else {
          clearUserState();
        }
      } else {
        clearUserState();
      }
    } catch {
      clearUserState();
    }
  }

  function applyUserState(user) {
    state.user = user;
    el.userPill.hidden = false;
    el.userPill.style.display = "flex";

    // Hide login and guest buttons in nav when someone is logged in
    el.loginOpenBtn.hidden = true;
    el.loginOpenBtn.style.display = "none";
    if (el.quickPlayNavBtn) {
      el.quickPlayNavBtn.hidden = true;
      el.quickPlayNavBtn.style.display = "none";
    }
    if (el.guestQuickPlayBanner) {
      el.guestQuickPlayBanner.hidden = true;
      el.guestQuickPlayBanner.style.display = "none";
    }

    // Automatically close auth modal if open
    closeAuthModal();

    el.navUsername.textContent = user.username;
    if (el.navUserAvatar) el.navUserAvatar.textContent = user.avatar || "🛡️";
    el.navRenownDisplay.innerHTML = `<span class="currency-symbol">⚡</span> ${user.renown} Renown`;

    // Apply Rank Badge styling
    applyRankBadgeClass(el.navRankBadge, user.rank);
    el.navRankBadge.textContent = user.rank.toUpperCase();

    // Teacher HQ visible only for role === 'teacher'
    if (user.role === "teacher") {
      el.navTeacherTab.hidden = false;
    } else {
      el.navTeacherTab.hidden = true;
    }

    // Apply equipped theme if present
    applyEquippedTheme(user.equipped_theme);
  }

  function clearUserState() {
    state.user = null;
    el.userPill.hidden = true;
    el.userPill.style.display = "none";

    // Show login and quick-play buttons when logged out
    el.loginOpenBtn.hidden = false;
    el.loginOpenBtn.style.display = "";
    if (el.quickPlayNavBtn) {
      el.quickPlayNavBtn.hidden = false;
      el.quickPlayNavBtn.style.display = "";
    }
    if (el.guestQuickPlayBanner) {
      el.guestQuickPlayBanner.hidden = false;
      el.guestQuickPlayBanner.style.display = "";
      if (el.quickGuestUsername && !el.quickGuestUsername.value) {
        el.quickGuestUsername.value = getRandomCallsign();
      }
    }
    el.navTeacherTab.hidden = true;
    document.body.className = "theme-default";
    renderPfpPickers();
  }

  function applyEquippedTheme(themeName) {
    document.body.className = "theme-default";
    if (!themeName) return;
    const lower = themeName.toLowerCase();
    if (lower.includes("midnight")) document.body.className = "theme-midnight";
    else if (lower.includes("black ice")) document.body.className = "theme-black-ice";
    else if (lower.includes("pro league") || lower.includes("gold")) document.body.className = "theme-pro-league";
  }

  function applyRankBadgeClass(element, rankName) {
    element.className = "rank-badge";
    const r = (rankName || "unranked").toLowerCase();
    element.classList.add(`rank-${r}`);
  }

  // Quick Logins
  el.quickLoginStudent?.addEventListener("click", async () => {
    loginWithCredentials("recruit_mason", "Recruit2026!");
  });
  el.quickLoginTeacher?.addEventListener("click", async () => {
    loginWithCredentials("benrud", "TeacherSiege2026!");
  });

  async function loginWithCredentials(identifier, password) {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || "Authentication failed", true);
        return;
      }
      applyUserState(data.user);
      closeAuthModal();
      switchView("home"); // Automatically redirect to home page
      showNotification(`Welcome, Operator ${data.user.username}!`);
      loadQuizzes();
    } catch {
      showNotification("Server error during login", true);
    }
  }

  // Login Form Submit
  el.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    el.loginErrorMsg.hidden = true;
    const identifier = el.loginIdentifier.value.trim();
    const password = el.loginPassword.value;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        el.loginErrorMsg.textContent = data.error || "Authentication failed";
        el.loginErrorMsg.hidden = false;
        return;
      }
      applyUserState(data.user);
      closeAuthModal();
      switchView("home"); // Automatically redirect to home page
      showNotification(`Clearance verified: ${data.user.username}`);
      loadQuizzes();
    } catch {
      el.loginErrorMsg.textContent = "Connection failed. Please retry.";
      el.loginErrorMsg.hidden = false;
    }
  });

  // Register Form Submit
  el.registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    el.regErrorMsg.hidden = true;
    const username = el.regUsername.value.trim();
    const email = el.regEmail.value.trim();
    const password = el.regPassword.value;

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        el.regErrorMsg.textContent = data.error || "Registration failed";
        el.regErrorMsg.hidden = false;
        return;
      }
      applyUserState(data.user);
      closeAuthModal();
      switchView("home"); // Automatically redirect to home page
      showNotification(`Callsign registered: ${data.user.username}`);
      loadQuizzes();
    } catch {
      el.regErrorMsg.textContent = "Registration request failed.";
      el.regErrorMsg.hidden = false;
    }
  });

  // Logout
  el.logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // Continue client cleanup
    }
    clearUserState();
    showNotification("Operator signed out.");
    switchView("home");
  });

  // -----------------------------------------------------------------
  // VIEW 1: Quizzes List
  // -----------------------------------------------------------------
  async function loadQuizzes() {
    try {
      const res = await fetch("/api/quizzes");
      if (!res.ok) {
        if (res.status === 401) {
          renderGuestQuizzes();
          return;
        }
        throw new Error("Failed to load quizzes");
      }
      const quizzes = await res.json();
      state.quizzes = quizzes;
      renderQuizzesGrid(quizzes);
    } catch {
      renderGuestQuizzes();
    }
  }

  function renderGuestQuizzes() {
    // Show preview for unauthenticated users
    const sample = [
      { id: 1, title: "Operators & Gadgets", description: "Who has what ability: defensive denial, intel gadgets, hard breaching, and electronic warfare.", question_count: 11, icon: "🛡️" },
      { id: 2, title: "Maps & Callouts", description: "Name competitive bomb sites, key rooms, vertical soft spots, and iconic tactical angles.", question_count: 11, icon: "🗺️" },
      { id: 3, title: "Weapons & Attachments", description: "Recoil mitigation, barrel attachments, ADS speeds, optics, and signature operator loadouts.", question_count: 11, icon: "🔫" },
      { id: 4, title: "Game Mechanics", description: "Drone phase timings, team reinforcement pool, defuser mechanics, audio propagation, and health/armor.", question_count: 11, icon: "⚙️" },
      { id: 5, title: "History & Esports", description: "Six Invitational champions, legendary pro clutch moments, major DLC operations, and competitive meta.", question_count: 11, icon: "🏆" },
    ];
    renderQuizzesGrid(sample, true);
  }

  function renderQuizzesGrid(quizzes, isGuest = false) {
    const icons = {
      1: "🛡️",
      2: "🗺️",
      3: "🔫",
      4: "⚙️",
      5: "🏆",
    };

    el.quizzesGrid.innerHTML = quizzes
      .map((q) => {
        const icon = icons[q.id] || "🎯";
        const bestBadge =
          q.user_best_score !== null && q.user_best_score !== undefined
            ? `<span class="pb-badge">Personal Best: ${q.user_best_score} / ${q.question_count}</span>`
            : `<span class="pb-badge">Not Deployed Yet</span>`;

        return `
          <div class="quiz-card" data-quiz-id="${q.id}">
            <div>
              <div class="quiz-card-header">
                <span class="quiz-icon">${icon}</span>
                <span class="quiz-qcount-badge">${q.question_count} Tactical Questions</span>
              </div>
              <h3 class="quiz-card-title">${q.title}</h3>
              <p class="quiz-card-desc">${q.description}</p>
            </div>
            <div class="quiz-card-footer">
              ${bestBadge}
              <button class="btn-tactical btn-accent deploy-btn" data-id="${q.id}">
                ${isGuest ? "Authenticate to Deploy" : "Deploy Assessment →"}
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    // Attach click handlers to deploy buttons
    el.quizzesGrid.querySelectorAll(".deploy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const qid = btn.dataset.id;
        if (!state.user) {
          openAuthModal("login");
          showNotification("Operator login required to deploy on tactical assessments.");
          return;
        }
        startQuizAssessment(qid);
      });
    });
  }

  // -----------------------------------------------------------------
  // VIEW 2: Quiz Player / Assessment Runner
  // -----------------------------------------------------------------
  async function startQuizAssessment(quizId) {
    try {
      // 1. Initialize attempt row on server (is_complete = false, score = null)
      const startRes = await fetch(`/api/quizzes/${quizId}/start`, {
        method: "POST",
      });
      if (!startRes.ok) throw new Error("Could not initialize assessment attempt.");
      const startData = await startRes.json();
      state.currentAttemptId = startData.attempt_id;

      // 2. Fetch questions with answer keys hidden
      const qRes = await fetch(`/api/quizzes/${quizId}/questions`);
      if (!qRes.ok) throw new Error("Could not load questions.");
      const qData = await qRes.json();

      state.activeQuiz = qData.quiz;
      state.activeQuestions = qData.questions;
      state.currentQuestionIndex = 0;
      state.userAnswers = {};

      renderQuizRunnerView();
      switchView("quizRunner");
    } catch (err) {
      showNotification(err.message || "Failed to start quiz", true);
    }
  }

  function renderQuizRunnerView() {
    const q = state.activeQuestions[state.currentQuestionIndex];
    const total = state.activeQuestions.length;
    const currentNum = state.currentQuestionIndex + 1;

    el.runnerQuizTitle.textContent = state.activeQuiz.title;
    el.runnerCounter.textContent = `Question ${currentNum} of ${total}`;
    el.dossierQNum.textContent = `ITEM #${String(currentNum).padStart(2, "0")}`;

    const pct = Math.round((currentNum / total) * 100);
    el.runnerProgressFill.style.width = `${pct}%`;

    el.runnerQuestionText.textContent = q.text;

    // Render 4 tactical choices
    const letters = ["A", "B", "C", "D"];
    el.runnerChoicesList.innerHTML = q.choices
      .map((choice, idx) => {
        const isSelected = state.userAnswers[q.id] === choice.id;
        return `
          <button type="button" class="choice-option-btn ${isSelected ? "selected" : ""}" data-choice-id="${choice.id}">
            <span class="choice-letter">${letters[idx]}</span>
            <span class="choice-text">${choice.text}</span>
          </button>
        `;
      })
      .join("");

    // Attach choice listeners
    el.runnerChoicesList.querySelectorAll(".choice-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        playSound("click");
        const choiceId = Number(btn.dataset.choiceId);
        state.userAnswers[q.id] = choiceId;

        // Visual selection
        el.runnerChoicesList.querySelectorAll(".choice-option-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");

        updateJumpIndicators();
      });
    });

    // Prev / Next button states
    el.runnerPrevBtn.disabled = state.currentQuestionIndex === 0;

    if (state.currentQuestionIndex === total - 1) {
      el.runnerNextBtn.hidden = true;
      el.runnerSubmitBtn.hidden = false;
    } else {
      el.runnerNextBtn.hidden = false;
      el.runnerSubmitBtn.hidden = true;
    }

    renderJumpIndicators();
  }

  function renderJumpIndicators() {
    el.runnerJumpIndicators.innerHTML = state.activeQuestions
      .map((q, idx) => {
        const answered = state.userAnswers[q.id] !== undefined;
        const isCurrent = idx === state.currentQuestionIndex;
        return `<div class="jump-dot ${answered ? "answered" : ""} ${isCurrent ? "current" : ""}" data-index="${idx}" title="Question ${idx + 1}"></div>`;
      })
      .join("");

    el.runnerJumpIndicators.querySelectorAll(".jump-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        state.currentQuestionIndex = Number(dot.dataset.index);
        renderQuizRunnerView();
      });
    });
  }

  function updateJumpIndicators() {
    renderJumpIndicators();
  }

  el.runnerPrevBtn.addEventListener("click", () => {
    if (state.currentQuestionIndex > 0) {
      state.currentQuestionIndex -= 1;
      renderQuizRunnerView();
    }
  });

  el.runnerNextBtn.addEventListener("click", () => {
    if (state.currentQuestionIndex < state.activeQuestions.length - 1) {
      state.currentQuestionIndex += 1;
      renderQuizRunnerView();
    }
  });

  el.quitQuizBtn.addEventListener("click", () => {
    if (confirm("Abort assessment? Abandoning a quiz leaves an incomplete attempt on record.")) {
      switchView("home");
    }
  });

  // Submit Final Assessment (Graded all at once server-side per spec)
  el.runnerSubmitBtn.addEventListener("click", async () => {
    const unansweredCount = state.activeQuestions.filter((q) => state.userAnswers[q.id] === undefined).length;
    if (unansweredCount > 0) {
      if (!confirm(`You have ${unansweredCount} unanswered questions. Submit assessment anyway?`)) {
        return;
      }
    }

    el.runnerSubmitBtn.disabled = true;
    el.runnerSubmitBtn.textContent = "Scoring Assessment…";

    try {
      const res = await fetch(`/api/quizzes/${state.activeQuiz.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: state.currentAttemptId,
          answers: state.userAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit assessment.");

      // Refresh current user state from server
      await checkSession();

      // Render End-of-Round Scoreboard
      renderScoreboardResults(data);
      switchView("results");
    } catch (err) {
      showNotification(err.message || "Submission failed", true);
    } finally {
      el.runnerSubmitBtn.disabled = false;
      el.runnerSubmitBtn.textContent = "Submit Final Assessment";
    }
  });

  // -----------------------------------------------------------------
  // VIEW 3: Results (End-of-Round Scoreboard)
  // -----------------------------------------------------------------
  function renderScoreboardResults(result) {
    if (result.percentage >= 60) {
      playSound("win");
      el.scoreboardStatusText.textContent = "MATCH WON";
      el.scoreboardStatusText.style.backgroundColor = "var(--color-win)";
    } else {
      playSound("eliminated");
      el.scoreboardStatusText.textContent = "DEFEAT · ELIMINATED";
      el.scoreboardStatusText.style.backgroundColor = "var(--color-eliminated)";
    }

    el.scoreboardTitle.textContent = `${state.activeQuiz.title} — Debrief`;
    el.scoreboardScoreNumbers.textContent = `${result.score} / ${result.question_count}`;
    el.scoreboardScorePct.textContent = `(${result.percentage}%)`;

    applyRankBadgeClass(el.scoreboardRankBadge, result.rank);
    el.scoreboardRankBadge.textContent = result.rank.toUpperCase();

    if (result.rank_changed) {
      el.scoreboardRankChangeNote.textContent = `Rank changed from ${result.prev_rank} to ${result.rank}!`;
    } else {
      el.scoreboardRankChangeNote.textContent = "";
    }

    el.scoreboardRenownEarned.textContent = `+${result.renown_earned} Renown`;
    const b = result.renown_breakdown;
    el.scoreboardRenownBreakdown.textContent = `+${b.completion} Complete${b.personal_best_bonus ? " · +5 PB Bonus" : ""}${b.streak_bonus ? " · +3 Streak Bonus" : ""}`;
    el.scoreboardStreakDisplay.textContent = `🔥 ${result.streak_count} Days`;

    if (result.unlocked_rewards && result.unlocked_rewards.length) {
      showNotification(`🎉 Operation Pass Reward Unlocked: ${result.unlocked_rewards.join(", ")}!`);
    }

    // Render Elimination Cam Review
    el.eliminationCamList.innerHTML = result.review
      .map((item, idx) => {
        const isWin = item.is_correct;
        const qNum = String(idx + 1).padStart(2, "0");
        return `
          <div class="review-item ${isWin ? "correct" : "incorrect"}">
            <div class="review-item-header">
              <span class="review-q-num">QUERY #${qNum}</span>
              <span class="review-status-pill ${isWin ? "pill-win" : "pill-eliminated"}">
                ${isWin ? "MATCH WON" : "ELIMINATED"}
              </span>
            </div>
            <p class="review-prompt">${item.question_text}</p>
            <div class="review-answers-grid">
              <div>
                <span class="answer-label">YOUR INPUT:</span>
                <p class="answer-val val-user">${item.user_choice}</p>
              </div>
              <div>
                <span class="answer-label">VERIFIED ANSWER:</span>
                <p class="answer-val val-correct">${item.correct_choice}</p>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  el.scoreboardRetryBtn.addEventListener("click", () => {
    if (state.activeQuiz) {
      startQuizAssessment(state.activeQuiz.id);
    } else {
      switchView("home");
    }
  });

  el.scoreboardBackBtn.addEventListener("click", () => {
    switchView("home");
  });

  // -----------------------------------------------------------------
  // VIEW 4: Leaderboards (Operator Selection Screen Styling)
  // -----------------------------------------------------------------
  async function loadLeaderboard(tabKey) {
    state.leaderboardTab = tabKey;
    el.leaderboardTabs.querySelectorAll(".lb-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabKey);
    });

    try {
      if (tabKey === "overall") {
        el.lbMetaStrip.textContent = "Ranking by: Total completed quiz deployments (Tie-breaker: earliest completion date)";
        el.lbColStat1.textContent = "COMPLETIONS";
        el.lbColStat2.textContent = "AVG ACCURACY";

        const res = await fetch("/api/leaderboard");
        const list = await res.json();
        renderOverallLeaderboard(list);
      } else {
        const quizId = tabKey.replace("quiz-", "");
        el.lbMetaStrip.textContent = `Ranking by: Highest score in this module (Tie-breakers: fewer attempts, then earliest completion)`;
        el.lbColStat1.textContent = "BEST SCORE";
        el.lbColStat2.textContent = "ATTEMPTS";

        const res = await fetch(`/api/quizzes/${quizId}/leaderboard`);
        const data = await res.json();
        renderPerQuizLeaderboard(data.leaderboard);
      }
    } catch {
      el.leaderboardTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">Could not retrieve rankings.</td></tr>`;
    }
  }

  function renderOverallLeaderboard(list) {
    if (!list || list.length === 0) {
      el.leaderboardTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No completed attempts recorded yet. Be the first to deploy!</td></tr>`;
      return;
    }

    el.leaderboardTableBody.innerHTML = list
      .map((row, idx) => {
        const place = idx + 1;
        const placeClass = place === 1 ? "top-1" : place === 2 ? "top-2" : place === 3 ? "top-3" : "";
        const titleBadge = row.equipped_title ? `[${row.equipped_title}]` : "";
        const cosmeticBadge = row.equipped_badge ? `🎖️ ${row.equipped_badge}` : "";

        return `
          <tr>
            <td class="rank-placement-col ${placeClass}">#${String(place).padStart(2, "0")}</td>
            <td>
              <div class="operator-user-cell">
                <div class="op-avatar-icon">${row.avatar || "🛡️"}</div>
                <div class="op-name-block">
                  <span class="op-callsign">${row.username}</span>
                  <span class="op-cosmetics">${titleBadge} ${cosmeticBadge}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="rank-badge rank-${(row.rank || "unranked").toLowerCase()}">
                ${(row.rank || "unranked").toUpperCase()}
              </span>
            </td>
            <td><strong>${row.total_attempts}</strong> attempts</td>
            <td>${row.avg_percentage}% accuracy</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderPerQuizLeaderboard(list) {
    if (!list || list.length === 0) {
      el.leaderboardTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No operators have completed this assessment yet.</td></tr>`;
      return;
    }

    el.leaderboardTableBody.innerHTML = list
      .map((row, idx) => {
        const place = idx + 1;
        const placeClass = place === 1 ? "top-1" : place === 2 ? "top-2" : place === 3 ? "top-3" : "";
        const titleBadge = row.equipped_title ? `[${row.equipped_title}]` : "";

        return `
          <tr>
            <td class="rank-placement-col ${placeClass}">#${String(place).padStart(2, "0")}</td>
            <td>
              <div class="operator-user-cell">
                <div class="op-avatar-icon">${row.avatar || "🛡️"}</div>
                <div class="op-name-block">
                  <span class="op-callsign">${row.username}</span>
                  <span class="op-cosmetics">${titleBadge}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="rank-badge rank-${(row.rank || "unranked").toLowerCase()}">
                ${(row.rank || "unranked").toUpperCase()}
              </span>
            </td>
            <td><strong style="color: var(--accent-secondary); font-size: 1.05rem;">${row.best} pts</strong></td>
            <td>${row.attempts} completed tries</td>
          </tr>
        `;
      })
      .join("");
  }

  el.leaderboardTabs.querySelectorAll(".lb-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSound("click");
      loadLeaderboard(btn.dataset.tab);
    });
  });

  // -----------------------------------------------------------------
  // VIEW 5: Operation Pass & Renown Shop
  // -----------------------------------------------------------------
  async function loadShop() {
    try {
      const res = await fetch("/api/shop");
      if (!res.ok) throw new Error("Could not load tactical supply shop");
      const data = await res.json();
      state.shopData = data;

      el.shopUserRenown.textContent = data.renown;

      // Premium Pass Status
      if (data.has_premium_pass) {
        el.premiumPassStatusText.textContent = "PREMIUM ACTIVE";
        el.premiumPassStatusText.className = "pass-badge active-premium";
        el.unlockPremiumPassBtn.hidden = true;
      } else {
        el.premiumPassStatusText.textContent = "PREMIUM LOCKED";
        el.premiumPassStatusText.className = "pass-badge";
        el.unlockPremiumPassBtn.hidden = false;
      }

      renderPassGoals(data.goals, data.has_premium_pass);
      renderShopItems(data.items, "all");
    } catch (err) {
      showNotification(err.message || "Failed to load shop", true);
    }
  }

  function renderPassGoals(goals, hasPremium) {
    const free = goals.filter((g) => g.track === "free");
    const prem = goals.filter((g) => g.track === "premium");

    el.freeGoalsList.innerHTML = free.map((g) => renderGoalCardHtml(g, true)).join("");
    el.premiumGoalsList.innerHTML = prem.map((g) => renderGoalCardHtml(g, hasPremium)).join("");
  }

  function renderGoalCardHtml(g, trackActive) {
    const pct = Math.min(100, Math.round((g.current_progress / g.target) * 100));
    const isDone = g.is_completed;
    const rewardName = g.reward_item ? `${g.reward_item.name} (${g.reward_item.type})` : "Classified Item";

    return `
      <div class="goal-card">
        <div class="goal-top-row">
          <span class="goal-desc">${g.description}</span>
          <span class="goal-target-num">${g.current_progress} / ${g.target}</span>
        </div>
        <div class="goal-prog-bar">
          <div class="goal-prog-fill" style="width: ${pct}%;"></div>
        </div>
        <div class="goal-reward-row">
          <span>Reward: <strong>${rewardName}</strong></span>
          ${
            isDone
              ? '<span class="goal-claimed-tag">✓ UNLOCKED</span>'
              : !trackActive
              ? '<span style="color: var(--text-muted);">Requires Premium Pass</span>'
              : `<span>${pct}% complete</span>`
          }
        </div>
      </div>
    `;
  }

  function renderShopItems(items, filterType) {
    const filtered = filterType === "all" ? items : items.filter((i) => i.type === filterType);

    el.shopItemsGrid.innerHTML = filtered
      .map((item) => {
        const isOwned = item.is_owned;
        const rarityClass = `rarity-${(item.rarity || "common").toLowerCase()}`;

        return `
          <div class="shop-item-card ${rarityClass}">
            <div>
              <div class="item-top">
                <span class="item-type-badge">${item.type}</span>
                <span class="item-rarity-badge">${item.rarity}</span>
              </div>
              <h4 class="item-name">${item.name}</h4>
              <p class="item-desc">${item.description}</p>
            </div>
            <div class="item-bottom">
              <span class="item-cost">⚡ ${item.cost_renown} Renown</span>
              ${
                isOwned
                  ? '<span class="btn-tactical-xs btn-outline" style="cursor: default;">OWNED</span>'
                  : `<button class="btn-tactical-sm btn-accent buy-item-btn" data-id="${item.id}" data-cost="${item.cost_renown}">
                      Unlock
                    </button>`
              }
            </div>
          </div>
        `;
      })
      .join("");

    el.shopItemsGrid.querySelectorAll(".buy-item-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const itemId = btn.dataset.id;
        const cost = btn.dataset.cost;
        if (!confirm(`Unlock cosmetic item for ${cost} Renown?`)) return;

        try {
          btn.disabled = true;
          const res = await fetch("/api/shop/buy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: itemId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Purchase failed");

          playSound("win");
          showNotification(`Unlocked: ${data.item.name}!`);
          await checkSession();
          loadShop();
        } catch (err) {
          showNotification(err.message, true);
          btn.disabled = false;
        }
      });
    });
  }

  el.shopFilterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      el.shopFilterPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      if (state.shopData) {
        renderShopItems(state.shopData.items, pill.dataset.filter);
      }
    });
  });

  el.unlockPremiumPassBtn?.addEventListener("click", async () => {
    if (!confirm("Unlock the Premium Operation Pass track for 1,000 Renown?")) return;

    try {
      const res = await fetch("/api/pass/unlock-premium", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not unlock pass");

      playSound("win");
      showNotification("🎖️ Premium Operation Pass track unlocked!");
      await checkSession();
      loadShop();
    } catch (err) {
      showNotification(err.message, true);
    }
  });

  // -----------------------------------------------------------------
  // VIEW 6: My History (Logged-in User's Own Attempts Only)
  // -----------------------------------------------------------------
  async function loadHistory() {
    try {
      const res = await fetch("/api/me/attempts");
      if (!res.ok) throw new Error("Could not load attempt history");
      const list = await res.json();

      if (!list || list.length === 0) {
        el.historyTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No completed attempts recorded yet. Deploy on a quiz!</td></tr>`;
        return;
      }

      el.historyTableBody.innerHTML = list
        .map((a) => {
          const dateStr = a.completed_at ? new Date(a.completed_at).toLocaleString() : "N/A";
          const pct = Math.round(((a.score ?? 0) / (a.question_count || 1)) * 100);
          const isWin = pct >= 60;

          return `
            <tr>
              <td>${dateStr}</td>
              <td><strong>${a.quiz_title}</strong></td>
              <td>${a.score} / ${a.question_count}</td>
              <td><strong>${pct}%</strong></td>
              <td>
                <span class="review-status-pill ${isWin ? "pill-win" : "pill-eliminated"}">
                  ${isWin ? "MATCH WON" : "ELIMINATED"}
                </span>
              </td>
            </tr>
          `;
        })
        .join("");
    } catch {
      el.historyTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">Failed to load history.</td></tr>`;
    }
  }

  el.refreshHistoryBtn?.addEventListener("click", loadHistory);

  // -----------------------------------------------------------------
  // VIEW 7: Operator Card / Profile
  // -----------------------------------------------------------------
  async function renderProfile() {
    if (!state.user) return;
    const u = state.user;

    el.profileRoleBadge.textContent = u.role === "teacher" ? "FACULTY / TEACHER" : "PLAYER CLEARANCE";
    el.profileRoleBadge.className = `role-badge ${u.role === "teacher" ? "role-teacher" : "role-player"}`;

    el.profileUsername.textContent = u.username;
    el.profileEmail.textContent = u.email;
    if (el.profileAvatarIcon) el.profileAvatarIcon.textContent = u.avatar || "🛡️";
    if (el.equipAvatarSelect) el.equipAvatarSelect.value = u.avatar || "🛡️";
    el.profileEquippedTitle.textContent = u.equipped_title ? `Title: ${u.equipped_title}` : "Title: None";
    el.profileEquippedBadge.textContent = u.equipped_badge ? `Badge: ${u.equipped_badge}` : "Badge: None";

    applyRankBadgeClass(el.profileRankDisplay, u.rank);
    el.profileRankDisplay.textContent = (u.rank || "unranked").toUpperCase();

    el.profileRenownDisplay.textContent = `⚡ ${u.renown}`;
    el.profileStreakDisplay.textContent = `🔥 ${u.streak_count} Days`;

    // Fetch attempts count and user unlocks to populate equip dropdowns
    try {
      const [attRes, shopRes] = await Promise.all([fetch("/api/me/attempts"), fetch("/api/shop")]);
      const attempts = await attRes.json();
      const shop = await shopRes.json();

      el.profileAttemptsCount.textContent = Array.isArray(attempts) ? attempts.length : 0;

      const ownedItems = (shop.items || []).filter((i) => i.is_owned);

      // Populate Title Select
      const titles = ownedItems.filter((i) => i.type === "title");
      el.equipTitleSelect.innerHTML =
        '<option value="">(None equipped)</option>' +
        titles
          .map((t) => `<option value="${t.name}" ${u.equipped_title === t.name ? "selected" : ""}>${t.name}</option>`)
          .join("");

      // Populate Badge Select
      const badges = ownedItems.filter((i) => i.type === "badge");
      el.equipBadgeSelect.innerHTML =
        '<option value="">(None equipped)</option>' +
        badges
          .map((b) => `<option value="${b.name}" ${u.equipped_badge === b.name ? "selected" : ""}>${b.name}</option>`)
          .join("");

      // Populate Theme Select
      const themes = ownedItems.filter((i) => i.type === "theme");
      el.equipThemeSelect.innerHTML =
        '<option value="">Default Siege Amber</option>' +
        themes
          .map((th) => `<option value="${th.name}" ${u.equipped_theme === th.name ? "selected" : ""}>${th.name}</option>`)
          .join("");
    } catch {
      // Fallback
    }
  }

  el.saveLoadoutBtn?.addEventListener("click", async () => {
    const avatarVal = el.equipAvatarSelect ? el.equipAvatarSelect.value : null;
    const titleVal = el.equipTitleSelect.value || null;
    const badgeVal = el.equipBadgeSelect.value || null;
    const themeVal = el.equipThemeSelect.value || null;

    try {
      const calls = [
        fetch("/api/me/equip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "title", value: titleVal }),
        }),
        fetch("/api/me/equip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "badge", value: badgeVal }),
        }),
        fetch("/api/me/equip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "theme", value: themeVal }),
        }),
      ];

      if (avatarVal) {
        calls.push(
          fetch("/api/me/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatar: avatarVal }),
          })
        );
      }

      await Promise.all(calls);

      playSound("click");
      showNotification("Operator cosmetics loadout equipped!");
      await checkSession();
      renderProfile();
    } catch (err) {
      showNotification("Failed to equip loadout", true);
    }
  });

  // -----------------------------------------------------------------
  // VIEW 8: Teacher HQ (Question Editor & CSV Tools)
  // -----------------------------------------------------------------
  el.teacherTabEditor?.addEventListener("click", () => {
    el.teacherTabEditor.classList.add("active");
    el.teacherTabCsv.classList.remove("active");
    el.teacherSubEditor.hidden = false;
    el.teacherSubCsv.hidden = true;
    loadTeacherQuestions();
  });

  el.teacherTabCsv?.addEventListener("click", () => {
    el.teacherTabCsv.classList.add("active");
    el.teacherTabEditor.classList.remove("active");
    el.teacherSubCsv.hidden = false;
    el.teacherSubEditor.hidden = true;
  });

  el.teacherQuizFilter?.addEventListener("change", (e) => {
    state.teacherSelectedQuizId = Number(e.target.value);
    loadTeacherQuestions();
  });

  async function loadTeacherQuestions() {
    const qid = state.teacherSelectedQuizId;
    try {
      const res = await fetch(`/api/questions?quiz_id=${qid}`);
      if (!res.ok) throw new Error("Could not load questions for editor.");
      const list = await res.json();
      renderTeacherQuestionsList(list);
    } catch (err) {
      el.teacherQuestionsList.innerHTML = `<p class="help">${err.message}</p>`;
    }
  }

  function renderTeacherQuestionsList(list) {
    if (!list || list.length === 0) {
      el.teacherQuestionsList.innerHTML = `<p class="help">No questions found in this quiz. Create one above!</p>`;
      return;
    }

    el.teacherQuestionsList.innerHTML = list
      .map((q, idx) => {
        return `
          <div class="teacher-q-card" data-id="${q.id}">
            <div class="teacher-q-header">
              <span class="teacher-q-prompt">#${idx + 1}. ${q.text}</span>
              <div class="teacher-q-actions">
                <button class="btn-tactical-xs btn-outline edit-q-btn" data-id="${q.id}">Edit</button>
                <button class="btn-tactical-xs btn-ghost delete-q-btn" data-id="${q.id}">Delete</button>
              </div>
            </div>
            <div class="teacher-q-choices-grid">
              ${(q.choices || [])
                .map(
                  (c) => `
                <div class="t-choice-item ${c.is_correct ? "correct" : ""}">
                  <span>${c.is_correct ? "✓ (Correct)" : "○"}</span>
                  <span>${c.text}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `;
      })
      .join("");

    // Edit listeners
    el.teacherQuestionsList.querySelectorAll(".edit-q-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const q = list.find((item) => item.id === id);
        if (q) openEditQuestionForm(q);
      });
    });

    // Delete listeners
    el.teacherQuestionsList.querySelectorAll(".delete-q-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Are you sure you want to delete this question?")) return;
        try {
          const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Deletion failed");
          showNotification("Question deleted.");
          loadTeacherQuestions();
        } catch (err) {
          showNotification(err.message, true);
        }
      });
    });
  }

  el.teacherNewQBtn?.addEventListener("click", () => {
    el.teacherQId.value = "";
    el.teacherFormTitle.textContent = "Add Question";
    el.teacherQText.value = "";
    el.teacherQQuiz.value = state.teacherSelectedQuizId;
    el.teacherQPos.value = "1";
    document.querySelector("#choice-text-0").value = "";
    document.querySelector("#choice-text-1").value = "";
    document.querySelector("#choice-text-2").value = "";
    document.querySelector("#choice-text-3").value = "";
    document.querySelector("#radio-choice-0").checked = true;
    el.teacherQFormCard.hidden = false;
    el.teacherQText.focus();
  });

  el.teacherCancelFormBtn?.addEventListener("click", () => {
    el.teacherQFormCard.hidden = true;
  });

  function openEditQuestionForm(q) {
    el.teacherQId.value = q.id;
    el.teacherFormTitle.textContent = `Edit Question #${q.id}`;
    el.teacherQText.value = q.text;
    el.teacherQQuiz.value = q.quiz_id;
    el.teacherQPos.value = q.position || 1;

    (q.choices || []).forEach((c, idx) => {
      const textInput = document.querySelector(`#choice-text-${idx}`);
      const radioInput = document.querySelector(`#radio-choice-${idx}`);
      if (textInput) textInput.value = c.text;
      if (radioInput && c.is_correct) radioInput.checked = true;
    });

    el.teacherQFormCard.hidden = false;
    el.teacherQText.focus();
  }

  el.teacherQuestionForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const qid = el.teacherQId.value;
    const text = el.teacherQText.value.trim();
    const quiz_id = Number(el.teacherQQuiz.value);
    const position = Number(el.teacherQPos.value);

    const selectedRadio = document.querySelector('input[name="correct_choice_radio"]:checked');
    const correctIdx = selectedRadio ? Number(selectedRadio.value) : 0;

    const choices = [0, 1, 2, 3].map((i) => ({
      text: document.querySelector(`#choice-text-${i}`).value.trim(),
      is_correct: i === correctIdx,
    }));

    try {
      let res;
      if (qid) {
        // PUT update
        res = await fetch(`/api/questions/${qid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, position, choices }),
        });
      } else {
        // POST create
        res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quiz_id, text, position, choices }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save question.");

      showNotification("Question saved to database.");
      el.teacherQFormCard.hidden = true;
      loadTeacherQuestions();
    } catch (err) {
      showNotification(err.message, true);
    }
  });

  // -----------------------------------------------------------------
  // CSV Preview & Import (Teacher Only)
  // -----------------------------------------------------------------
  const SAMPLE_CSV = `quiz_title,question_text,choice_a,choice_b,choice_c,choice_d,correct_choice
Operators & Gadgets,Which operator uses the Spec-IO Electro Sensor?,Solis,Pulse,IQ,Valkyrie,A
Maps & Callouts,On Border what is the room above Workshop called?,Armory Lockers,Archives,Offices,Customs,A
Weapons & Attachments,Which muzzle attachment reduces vertical recoil?,Flash Hider,Compensator,Muzzle Brake,Suppressor,A
Game Mechanics,How many wall reinforcements are in the team pool?,10,8,5,12,A
History & Esports,Which team won the 2017 Six Invitational?,Continuum,Penta,G2,Liquid,A`;

  el.loadSampleCsvBtn?.addEventListener("click", () => {
    el.csvInputText.value = SAMPLE_CSV;
  });

  el.downloadCsvSampleBtn?.addEventListener("click", () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "r6_tactical_questions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  el.csvFilePicker?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        el.csvInputText.value = event.target.result;
      };
      reader.readAsText(file);
    }
  });

  // Preview & Validate CSV
  el.previewCsvBtn?.addEventListener("click", async () => {
    const csvContent = el.csvInputText.value.trim();
    if (!csvContent) {
      showNotification("Please paste or upload CSV content.", true);
      return;
    }

    el.previewCsvBtn.disabled = true;
    el.previewCsvBtn.textContent = "Validating Rows…";

    try {
      const res = await fetch("/api/questions/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_content: csvContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "CSV validation failed.");

      state.csvPreviewData = data;
      renderCsvPreview(data);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      el.previewCsvBtn.disabled = false;
      el.previewCsvBtn.textContent = "🔍 Preview & Validate CSV";
    }
  });

  function renderCsvPreview(data) {
    el.csvPreviewContainer.hidden = false;
    el.previewTotalCount.textContent = `Total Rows: ${data.total_rows}`;
    el.previewValidCount.textContent = `Valid: ${data.valid_count}`;
    el.previewInvalidCount.textContent = `Invalid: ${data.invalid_count}`;

    el.commitCsvImportBtn.disabled = data.valid_count === 0;

    el.csvPreviewTableBody.innerHTML = data.rows
      .map((row) => {
        const isValid = row.is_valid;
        const d = row.parsed_data;
        const choices = `${d.choice_a} / ${d.choice_b} / ${d.choice_c} / ${d.choice_d}`;
        const feedback = isValid
          ? '<span class="status-valid-badge">✓ Clean &amp; Valid</span>'
          : `<span class="status-invalid-badge">⚠ ${row.errors.join("; ")}</span>`;

        return `
          <tr class="${isValid ? "" : "row-invalid"}">
            <td>#${row.row_number}</td>
            <td>
              <span class="review-status-pill ${isValid ? "pill-win" : "pill-eliminated"}">
                ${isValid ? "READY" : "INVALID"}
              </span>
            </td>
            <td>${d.quiz_title}</td>
            <td>${d.question_text}</td>
            <td style="font-size: 0.76rem; color: var(--text-secondary);">${choices}</td>
            <td><strong>${d.correct_choice}</strong></td>
            <td>${feedback}</td>
          </tr>
        `;
      })
      .join("");
  }

  // Commit Valid Rows to Database
  el.commitCsvImportBtn?.addEventListener("click", async () => {
    if (!state.csvPreviewData) return;
    const validRows = state.csvPreviewData.rows.filter((r) => r.is_valid);
    if (validRows.length === 0) return;

    if (!confirm(`Import ${validRows.length} validated questions into the database?`)) return;

    el.commitCsvImportBtn.disabled = true;
    el.commitCsvImportBtn.textContent = "Importing…";

    try {
      const res = await fetch("/api/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validated_rows: validRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed.");

      playSound("win");
      showNotification(`Imported ${data.imported_count} tactical questions!`);
      el.csvInputText.value = "";
      el.csvPreviewContainer.hidden = true;
      loadTeacherQuestions();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      el.commitCsvImportBtn.disabled = false;
      el.commitCsvImportBtn.textContent = "Commit Valid Rows to Database";
    }
  });

  // -----------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------
  async function init() {
    await checkSession();
    loadQuizzes();
  }

  init();
})();
