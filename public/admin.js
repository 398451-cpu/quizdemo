(() => {
  const el = {
    loginPanel: document.querySelector("#admin-login-panel"),
    loginForm: document.querySelector("#admin-login-form"),
    password: document.querySelector("#admin-password"),
    loginMessage: document.querySelector("#admin-login-message"),
    dashboard: document.querySelector("#admin-dashboard"),
    logout: document.querySelector("#admin-logout"),
    quizSelect: document.querySelector("#admin-quiz-select"),
    newQuestion: document.querySelector("#admin-new-question"),
    questionForm: document.querySelector("#admin-question-form"),
    formTitle: document.querySelector("#admin-form-title"),
    questionText: document.querySelector("#admin-question-text"),
    questionRanked: document.querySelector("#admin-question-ranked"),
    position: document.querySelector("#admin-question-position"),
    choiceFields: document.querySelector("#admin-choice-fields"),
    formMessage: document.querySelector("#admin-form-message"),
    cancelEdit: document.querySelector("#admin-cancel-edit"),
    questionList: document.querySelector("#admin-question-list"),
    status: document.querySelector("#admin-status"),
    userLookupForm: document.querySelector("#admin-user-lookup-form"),
    userCallsign: document.querySelector("#admin-user-callsign"),
    userMessage: document.querySelector("#admin-user-message"),
    playerUnlocks: document.querySelector("#admin-player-unlocks"),
    playerName: document.querySelector("#admin-player-name"),
    playerRenown: document.querySelector("#admin-player-renown"),
    unlockEverything: document.querySelector("#admin-unlock-everything"),
    unlockPremium: document.querySelector("#admin-unlock-premium"),
    shopItemList: document.querySelector("#admin-shop-item-list"),
  };
  let questions = [];
  let editingQuestion = null;
  let shopItems = [];
  let selectedAdminUser = null;

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  function showLogin(message = "") {
    el.loginPanel.hidden = false;
    el.dashboard.hidden = true;
    el.loginMessage.textContent = message;
    el.password.value = "";
  }

  async function showDashboard() {
    el.loginPanel.hidden = true;
    el.dashboard.hidden = false;
    const [quizzes, items] = await Promise.all([
      request("/api/admin/quizzes"),
      request("/api/admin/shop-items"),
    ]);
    shopItems = items;
    el.quizSelect.replaceChildren(
      ...quizzes.map((quiz) => {
        const option = document.createElement("option");
        option.value = quiz.id;
        option.textContent = `${quiz.title} (${quiz.question_count} total · ${quiz.ranked_question_count} ranked)`;
        return option;
      }),
    );
    if (quizzes.length) await loadQuestions();
  }

  async function loadQuestions() {
    const quizId = Number(el.quizSelect.value);
    if (!quizId) return;
    el.status.textContent = "Loading questions…";
    el.questionList.replaceChildren();
    try {
      questions = await request(`/api/questions?quiz_id=${quizId}`);
      renderQuestions();
      el.status.textContent = `${questions.length} questions in this module.`;
    } catch (error) {
      el.status.textContent = error.message;
    }
  }

  function renderQuestions() {
    el.questionList.replaceChildren();
    if (!questions.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "No questions in this module yet.";
      el.questionList.append(empty);
      return;
    }

    for (const [index, question] of questions.entries()) {
      const card = document.createElement("article");
      card.className = "admin-question-card";
      const heading = document.createElement("div");
      heading.className = "admin-question-heading";
      const prompt = document.createElement("h3");
      prompt.textContent = `${index + 1}. ${question.text}`;
      const difficulty = document.createElement("span");
      difficulty.className = question.difficulty === "ranked" ? "admin-difficulty-badge ranked" : "admin-difficulty-badge";
      difficulty.textContent = question.difficulty === "ranked" ? "RANKED" : "PRACTICE";
      const actions = document.createElement("div");
      actions.className = "admin-question-actions";
      const edit = document.createElement("button");
      edit.className = "btn-tactical-xs btn-outline";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => openEditor(question));
      const remove = document.createElement("button");
      remove.className = "btn-tactical-xs btn-ghost";
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteQuestion(question));
      actions.append(edit, remove);
      const promptGroup = document.createElement("div");
      promptGroup.className = "admin-question-prompt-group";
      promptGroup.append(prompt, difficulty);
      heading.append(promptGroup, actions);

      const choices = document.createElement("div");
      choices.className = "admin-answer-list";
      for (const [choiceIndex, choice] of (question.choices || []).entries()) {
        const answer = document.createElement("div");
        answer.className = choice.is_correct ? "admin-answer correct" : "admin-answer";
        answer.textContent = `${String.fromCharCode(65 + choiceIndex)} · ${choice.text}${choice.is_correct ? " — Correct" : ""}`;
        choices.append(answer);
      }
      card.append(heading, choices);
      el.questionList.append(card);
    }
  }

  function buildChoiceFields(values = [], correctIndex = 0) {
    el.choiceFields.replaceChildren();
    for (let index = 0; index < 4; index += 1) {
      const row = document.createElement("label");
      row.className = "admin-choice-row";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "admin-correct-choice";
      radio.value = index;
      radio.required = index === 0;
      radio.checked = index === correctIndex;
      const input = document.createElement("input");
      input.className = "tactical-input";
      input.type = "text";
      input.name = "admin-choice";
      input.placeholder = `Choice ${String.fromCharCode(65 + index)}`;
      input.value = values[index] || "";
      input.required = true;
      row.append(radio, input);
      el.choiceFields.append(row);
    }
  }

  function openEditor(question = null) {
    editingQuestion = question;
    el.formTitle.textContent = question ? "Edit question" : "Add question";
    el.questionText.value = question?.text || "";
    el.questionRanked.checked = question?.difficulty === "ranked";
    el.position.value = question?.position || questions.length + 1;
    const choices = question?.choices || [];
    const correctIndex = choices.findIndex((choice) => choice.is_correct);
    buildChoiceFields(
      choices.map((choice) => choice.text),
      correctIndex >= 0 ? correctIndex : 0,
    );
    el.formMessage.textContent = "";
    el.questionForm.hidden = false;
    el.questionForm.scrollIntoView({ behavior: "smooth", block: "start" });
    el.questionText.focus();
  }

  function closeEditor() {
    editingQuestion = null;
    el.questionForm.hidden = true;
  }

  async function deleteQuestion(question) {
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    try {
      await request(`/api/questions/${question.id}`, { method: "DELETE" });
      el.status.textContent = "Question deleted.";
      await loadQuestions();
    } catch (error) {
      el.status.textContent = error.message;
    }
  }

  el.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    el.loginMessage.textContent = "Checking access…";
    try {
      await request("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password: el.password.value }),
      });
      el.password.value = "";
      await showDashboard();
    } catch (error) {
      el.loginMessage.textContent = error.message;
    }
  });

  el.logout.addEventListener("click", async () => {
    await request("/api/admin/logout", { method: "POST" }).catch(() => {});
    closeEditor();
    showLogin("Admin access locked.");
  });

  el.quizSelect.addEventListener("change", () => {
    closeEditor();
    loadQuestions();
  });

  el.newQuestion.addEventListener("click", () => openEditor());
  el.cancelEdit.addEventListener("click", closeEditor);

  function renderShopItems() {
    el.shopItemList.replaceChildren();
    for (const item of shopItems) {
      const row = document.createElement("div");
      row.className = "admin-shop-item";
      const description = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = item.name;
      const details = document.createElement("span");
      details.textContent = `${item.type} · ${item.cost_renown} Renown`;
      description.append(name, details);

      const grant = document.createElement("button");
      grant.className = "btn-tactical-xs btn-outline";
      grant.type = "button";
      grant.textContent = "Grant";
      grant.disabled = !selectedAdminUser;
      grant.addEventListener("click", () => grantUnlock({ item_id: item.id }));
      row.append(description, grant);
      el.shopItemList.append(row);
    }
  }

  async function grantUnlock(payload) {
    if (!selectedAdminUser) return;
    try {
      const result = await request(`/api/admin/users/${selectedAdminUser.id}/unlocks`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const granted = result.granted?.length
        ? ` Granted ${result.granted.length} item${result.granted.length === 1 ? "" : "s"}.`
        : "";
      el.userMessage.textContent = `Unlocks updated for ${result.username}.${granted}${result.premium_pass_unlocked ? " Premium Pass active." : ""}`;
    } catch (error) {
      el.userMessage.textContent = error.message;
    }
  }

  el.userLookupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    selectedAdminUser = null;
    el.playerUnlocks.hidden = true;
    el.userMessage.textContent = "Finding player…";
    try {
      const result = await request("/api/admin/users/lookup", {
        method: "POST",
        body: JSON.stringify({ username: el.userCallsign.value.trim() }),
      });
      selectedAdminUser = result.user;
      el.playerName.textContent = selectedAdminUser.username;
      el.playerRenown.textContent = `${selectedAdminUser.renown} Renown · ${selectedAdminUser.rank}`;
      el.playerUnlocks.hidden = false;
      el.userMessage.textContent = "Choose an item to grant it for free.";
      renderShopItems();
    } catch (error) {
      el.userMessage.textContent = error.message;
    }
  });

  el.unlockEverything.addEventListener("click", () => {
    if (!selectedAdminUser || !window.confirm(`Grant every shop item and the Premium Pass to ${selectedAdminUser.username}?`)) return;
    grantUnlock({ unlock_all: true });
  });

  el.unlockPremium.addEventListener("click", () => {
    grantUnlock({ premium_pass: true });
  });

  el.questionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const radios = [...el.choiceFields.querySelectorAll('input[type="radio"]')];
    const selected = radios.find((radio) => radio.checked);
    const choiceInputs = [...el.choiceFields.querySelectorAll('input[name="admin-choice"]')];
    if (!selected || choiceInputs.some((input) => !input.value.trim())) {
      el.formMessage.textContent = "Enter all four choices and select the correct one.";
      return;
    }

    const payload = {
      text: el.questionText.value.trim(),
      position: Number(el.position.value) || 1,
      difficulty: el.questionRanked.checked ? "ranked" : "standard",
      choices: choiceInputs.map((input, index) => ({
        text: input.value.trim(),
        is_correct: index === Number(selected.value),
      })),
    };
    const isEditing = Boolean(editingQuestion);
    const url = isEditing ? `/api/questions/${editingQuestion.id}` : "/api/questions";
    const body = isEditing
      ? payload
      : { ...payload, quiz_id: Number(el.quizSelect.value) };

    try {
      await request(url, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      closeEditor();
      el.status.textContent = isEditing ? "Question updated." : "Question added.";
      await loadQuestions();
    } catch (error) {
      el.formMessage.textContent = error.message;
    }
  });

  async function init() {
    try {
      const session = await request("/api/admin/session");
      if (!session.authenticated) {
        showLogin();
        return;
      }
      await showDashboard();
    } catch {
      showLogin();
    }
  }

  init();
})();
