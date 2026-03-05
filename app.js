// Жалпы көмекші функциялар
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

const PDD_APP_KEY = "pdd_app_state_v1";
const PDD_USER_QUESTIONS_KEY = "pdd_user_questions_v1";

// -------------------------
// Аккаунт / аутентификация (localStorage)
// -------------------------

function loadAppState() {
  try {
    const raw = localStorage.getItem(PDD_APP_KEY);
    return raw ? JSON.parse(raw) : { users: [], currentUser: null, stats: { tests: [] } };
  } catch {
    return { users: [], currentUser: null, stats: { tests: [] } };
  }
}

function saveAppState(state) {
  localStorage.setItem(PDD_APP_KEY, JSON.stringify(state));
}

let appState = loadAppState();
const authChangedEvent = () => new CustomEvent("auth:changed", { detail: { user: appState.currentUser } });

function updateAuthUI() {
  const authButtons = qs("#authButtons");
  const authUser = qs("#authUser");
  const emailSpan = qs("#authUserEmail");

  if (!authButtons || !authUser || !emailSpan) return;

  if (appState.currentUser) {
    authButtons.classList.add("hidden");
    authUser.classList.remove("hidden");
    emailSpan.textContent = appState.currentUser;
  } else {
    authButtons.classList.remove("hidden");
    authUser.classList.add("hidden");
    emailSpan.textContent = "";
  }
}

function showAuthModal(defaultTab = "login") {
  const modal = qs("#authModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  switchAuthTab(defaultTab);
}

function hideAuthModal() {
  const modal = qs("#authModal");
  if (!modal) return;
  modal.classList.add("hidden");
}

function switchAuthTab(tab) {
  const loginTab = qs("#loginTab");
  const registerTab = qs("#registerTab");
  const tabLogin = qs("#tabLogin");
  const tabRegister = qs("#tabRegister");
  if (!loginTab || !registerTab || !tabLogin || !tabRegister) return;

  if (tab === "login") {
    loginTab.classList.remove("hidden");
    registerTab.classList.add("hidden");
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
  } else {
    registerTab.classList.remove("hidden");
    loginTab.classList.add("hidden");
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
  }
}

function handleRegister(e) {
  e.preventDefault();
  const email = qs("#registerEmail")?.value.trim();
  const password = qs("#registerPassword")?.value;
  if (!email || !password) return;

  // API-ға сұрақ жіберу
  fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        appState.currentUser = email;
        saveAppState(appState);
        updateAuthUI();
        hideAuthModal();
        window.dispatchEvent(authChangedEvent());
        alert("Тіркелу сәтті аяқталды!");
        // Форманы тазалау
        qs("#registerForm").reset();
      } else {
        alert("Қате: " + (data.error || "Тіркелу сәтсіз"));
      }
    })
    .catch((err) => {
      console.error("Тіркелу қатесі:", err);
      alert("Қате: Соргинің жүргізілуі кезінде мәселе болды");
    });
}

function handleLogin(e) {
  e.preventDefault();
  const email = qs("#loginEmail")?.value.trim();
  const password = qs("#loginPassword")?.value;
  if (!email || !password) return;

  // API-ға сұрақ жіберу
  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        appState.currentUser = email;
        saveAppState(appState);
        updateAuthUI();
        hideAuthModal();
        window.dispatchEvent(authChangedEvent());
        // Форманы тазалау
        qs("#loginForm").reset();
      } else {
        alert("Қате: " + (data.error || "Кіру сәтсіз"));
      }
    })
    .catch((err) => {
      console.error("Кіру қатесі:", err);
      alert("Қате: Соргинің жүргізілуі кезінде мәселе болды");
    });
}

function handleLogout() {
  appState.currentUser = null;
  saveAppState(appState);
  updateAuthUI();
  window.dispatchEvent(authChangedEvent());
}

function initAuth() {
  updateAuthUI();

  qs("#openLogin")?.addEventListener("click", () => showAuthModal("login"));
  qs("#openRegister")?.addEventListener("click", () => showAuthModal("register"));
  qs("#closeAuthModal")?.addEventListener("click", hideAuthModal);

  qs("#tabLogin")?.addEventListener("click", () => switchAuthTab("login"));
  qs("#tabRegister")?.addEventListener("click", () => switchAuthTab("register"));

  qs("#registerForm")?.addEventListener("submit", handleRegister);
  qs("#loginForm")?.addEventListener("submit", handleLogin);
  qs("#logoutBtn")?.addEventListener("click", handleLogout);
}

// -------------------------
// Басты бет – статистика
// -------------------------

function initHomeStats() {
  const lastScoreEl = qs("#lastScore");
  const totalCompletedEl = qs("#totalCompleted");
  const avgProgress = qs("#avgProgress");
  const avgPercent = qs("#avgPercent");
  const year = qs("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (!lastScoreEl || !totalCompletedEl || !avgProgress || !avgPercent) return;

  const tests = appState.stats?.tests || [];
  if (!tests.length) {
    lastScoreEl.textContent = "–";
    totalCompletedEl.textContent = "0";
    avgPercent.textContent = "0%";
    avgProgress.style.width = "0%";
    return;
  }

  const last = tests[tests.length - 1];
  lastScoreEl.textContent = `${last.correct} / ${last.total}`;
  totalCompletedEl.textContent = String(tests.length);
  const avg =
    tests.reduce((sum, t) => sum + (t.total ? (t.correct / t.total) * 100 : 0), 0) / tests.length;
  const rounded = Math.round(avg);
  avgPercent.textContent = `${rounded}%`;
  avgProgress.style.width = `${rounded}%`;
}

// -------------------------
// Тест сұрақтары (100 сұрақтық массив)
// -------------------------

const QUESTIONS = (() => {
  const baseQuestions = [
    {
      id: 1,
      theme: "Жол белгілері",
      text: "Қызыл түсті дөңгелек шеңбер ішінде ақ сызық (кіруге тыйым салынады) белгісі нені білдіреді?",
      options: [
        "Тек жаяу жүргіншілерге арналған жол",
        "Барлық көлік құралдарына кіруге тыйым салынады",
        "Тұраққа қоюға тыйым салынады",
        "Жылдамдықты шектеу",
      ],
      correctIndex: 1,
    },
    {
      id: 2,
      theme: "Жол шамдары",
      text: "Жасыл шам жанып тұр, бірақ жол өткелінде жаяу жүргінші әлі өтіп бара жатыр. Сіз не істеуіңіз керек?",
      options: [
        "Жылдамдықты арттырып, жаяу жүргіншіні айналып өту",
        "Дыбыс белгісін беріп, жаяу жүргіншінің тез өтуін талап ету",
        "Жаяу жүргінші толық өтіп болғанша күту",
        "Жасыл жанды – дереу жүру керек",
      ],
      correctIndex: 2,
    },
    {
      id: 3,
      theme: "Жылдамдық режимі",
      text: "Қала ішінде жеңіл көлік үшін ең жоғары рұқсат етілген жылдамдық (егер жол белгілерімен басқаша көрсетілмесе) қанша?",
      options: ["40 км/сағ", "50 км/сағ", "60 км/сағ", "80 км/сағ"],
      correctIndex: 2,
    },
    {
      id: 4,
      theme: "Бұрылыстар",
      text: "Жол қиылысына жақындағанда бұрылғыңыз келсе, бұрылу көрсеткішін (поворотник) қашан қосу керек?",
      options: [
        "Тікелей бұрылар алдында, 2–3 метр қалғанда",
        "Қиылыстан 50–100 метр бұрын",
        "Тек артқы көлік жақын болса ғана",
        "Тек түнде немесе жауын кезінде",
      ],
      correctIndex: 1,
    },
    {
      id: 5,
      theme: "Жаяу жүргіншілер өткелі",
      text: "Жаяу жүргіншілер өткелінде жаяу жүргінші жолға қадам басты. Сіз не істеуіңіз керек?",
      options: [
        "Жылдамдықты аздап азайтып, бірақ тоқтамай өту",
        "Тоқтап, жаяу жүргіншінің қауіпсіз өтуін күту",
        "Тек сол жақ жолағы бос болса ғана тоқтау",
        "Дыбыс белгісін беріп, өтіп кету",
      ],
      correctIndex: 1,
    },
  ];

  const extra = [];
  let id = baseQuestions.length + 1;
  // Қалған сұрақтарды үлгі бойынша толтырамыз (оқу мақсатында)
  const templates = [
    {
      theme: "Қауіпсіз қашықтық",
      text: "Алдыңыздағы көлікпен қауіпсіз қашықтықты қалай сақтау керек?",
      options: [
        "Көліктер бір-біріне барынша жақын болуы тиіс",
        "Жылдамдыққа байланысты жеткілікті бос арақашықтық қалдыру",
        "Тек қала сыртында ғана арақашықтық сақтау керек",
        "Қашықтық маңызды емес, бастысы – жылдамдық",
      ],
      correctIndex: 1,
    },
    {
      theme: "Алдын орау",
      text: "Алдын орауға (обгон) қай жағдайда тыйым салынады?",
      options: [
        "Түзу, көрінуі жақсы жолда",
        "Жол қиылыстарында және жаяу жүргіншілер өткелдерінде",
        "Көріну қашықтығы 1 км-ден асқанда",
        "Жол толық бос болса",
      ],
      correctIndex: 1,
    },
    {
      theme: "Белгілер",
      text: "Үшбұрышты қызыл жиекті, ішінде қара көлік немесе басқа белгі бар жол белгісі нені білдіреді?",
      options: [
        "Ақпараттық белгі",
        "Тыйым салушы белгі",
        "Ескерту белгісі",
        "Нұсқаушы (міндетті) белгі",
      ],
      correctIndex: 2,
    },
    {
      theme: "Тоқтау",
      text: "Қызыл шам жанып тұрғанда қандай жағдайларда жүруге рұқсат етіледі?",
      options: [
        "Егер айналада көлік болмаса",
        "Егер жаяу жүргіншілер болмаса",
        "Ешқашан – қызыл шамда жүруге болмайды",
        "Егер полиция қызметкері ыммен рұқсат етсе",
      ],
      correctIndex: 3,
    },
    {
      theme: "Қауіпсіздік белдігі",
      text: "Қауіпсіздік белдігін тағу кімге міндетті?",
      options: [
        "Тек жүргізушіге",
        "Тек алдыңғы орындықтағы жолаушыға",
        "Барлық алдыңғы қатардағы жолаушыларға ғана",
        "Барлық отырғандарға (заңда көрсетілген ерекшеліктерден басқа)",
      ],
      correctIndex: 3,
    },
  ];

  while (extra.length + baseQuestions.length < 100) {
    const t = templates[(extra.length) % templates.length];
    extra.push({
      id: id,
      theme: t.theme,
      text: t.text + ` (${id}-сұрақ, жаттығу нұсқасы)`,
      options: [...t.options],
      correctIndex: t.correctIndex,
    });
    id += 1;
  }

  return baseQuestions.concat(extra);
})();

// -------------------------
// Тест логикасы
// -------------------------

let shuffledQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let currentAnswered = false;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initTestPage() {
  const totalEl = qs("#totalQuestions");
  const currentEl = qs("#currentIndex");
  const correctEl = qs("#correctCount");
  const wrongEl = qs("#wrongCount");
  const progressFill = qs("#testProgress");
  const progressPercent = qs("#testPercent");
  const restartBtn = qs("#restartTest");
  const againBtn = qs("#againTest");
  const goToAsk = qs("#goToAsk");

  if (!totalEl || !currentEl || !correctEl || !wrongEl || !progressFill || !progressPercent) {
    return;
  }

  const loginRequiredCard = qs("#loginRequiredCard");
  const loginToStart = qs("#loginToStart");
  const registerToStart = qs("#registerToStart");

  function startTestFlow() {
    if (loginRequiredCard) loginRequiredCard.classList.add("hidden");
    showQuestionCard();
    hideResultCard();

    shuffledQuestions = shuffleArray(QUESTIONS);
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    currentAnswered = false;

    totalEl.textContent = String(shuffledQuestions.length);
    correctEl.textContent = "0";
    wrongEl.textContent = "0";
    updateTestProgress();
    renderCurrentQuestion();
  }

  function showLoginRequired() {
    const qCard = qs("#questionCard");
    const rCard = qs("#resultCard");
    qCard?.classList.add("hidden");
    rCard?.classList.add("hidden");
    loginRequiredCard?.classList.remove("hidden");
  }

  // Тестті тек тіркелген/кірген қолданушы ғана тапсырады
  if (!appState.currentUser) {
    showLoginRequired();
  } else {
    startTestFlow();
  }

  loginToStart?.addEventListener("click", () => showAuthModal("login"));
  registerToStart?.addEventListener("click", () => showAuthModal("register"));

  window.addEventListener("auth:changed", () => {
    if (appState.currentUser) {
      startTestFlow();
    } else {
      showLoginRequired();
    }
  });

  qs("#nextQuestion")?.addEventListener("click", handleNextQuestion);

  restartBtn?.addEventListener("click", () => {
    if (!appState.currentUser) return showLoginRequired();
    startTestFlow();
  });

  againBtn?.addEventListener("click", () => {
    if (!appState.currentUser) return showLoginRequired();
    startTestFlow();
  });

  goToAsk?.addEventListener("click", () => {
    window.location.href = "ask.html";
  });
}

function updateTestProgress() {
  const total = shuffledQuestions.length || 1;
  const progressFill = qs("#testProgress");
  const progressPercent = qs("#testPercent");
  const currentEl = qs("#currentIndex");
  const totalEl = qs("#totalQuestions");
  const correctEl = qs("#correctCount");
  const wrongEl = qs("#wrongCount");

  const answered = correctCount + wrongCount;
  const ratio = Math.round((answered / total) * 100);
  if (progressFill) progressFill.style.width = `${ratio}%`;
  if (progressPercent) progressPercent.textContent = `${ratio}%`;
  if (currentEl) currentEl.textContent = String(Math.min(currentIndex + 1, total));
  if (totalEl) totalEl.textContent = String(total);
  if (correctEl) correctEl.textContent = String(correctCount);
  if (wrongEl) wrongEl.textContent = String(wrongCount);
}

function renderCurrentQuestion() {
  const questionCard = qs("#questionCard");
  const resultCard = qs("#resultCard");
  if (!questionCard || !resultCard) return;

  if (currentIndex >= shuffledQuestions.length) {
    showResult();
    return;
  }

  showQuestionCard();

  const q = shuffledQuestions[currentIndex];
  const badge = qs("#questionBadge");
  const theme = qs("#questionTheme");
  const textEl = qs("#questionText");
  const answersList = qs("#answersList");
  const feedback = qs("#questionFeedback");
  const nextBtn = qs("#nextQuestion");

  if (!badge || !theme || !textEl || !answersList || !feedback || !nextBtn) return;

  badge.textContent = `Сұрақ ${currentIndex + 1}`;
  theme.textContent = `Тақырыбы: ${q.theme}`;
  textEl.textContent = q.text;
  answersList.innerHTML = "";
  feedback.textContent = "";
  feedback.className = "question-feedback";
  nextBtn.disabled = true;
  currentAnswered = false;

  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer-option";
    btn.dataset.index = String(idx);

    const textSpan = document.createElement("span");
    textSpan.className = "answer-text";
    textSpan.textContent = opt;

    const letterSpan = document.createElement("span");
    letterSpan.className = "answer-letter";
    letterSpan.textContent = String.fromCharCode(65 + idx);

    btn.appendChild(textSpan);
    btn.appendChild(letterSpan);
    btn.addEventListener("click", () => handleAnswerClick(idx));
    answersList.appendChild(btn);
  });
}

function handleAnswerClick(selectedIndex) {
  if (currentAnswered) return;
  currentAnswered = true;

  const q = shuffledQuestions[currentIndex];
  const answersList = qs("#answersList");
  const feedback = qs("#questionFeedback");
  const nextBtn = qs("#nextQuestion");

  if (!answersList || !feedback || !nextBtn) return;

  const buttons = qsa(".answer-option");
  buttons.forEach((btn, idx) => {
    btn.classList.add("disabled");
    if (idx === q.correctIndex) {
      btn.classList.add("correct");
    }
    if (idx === selectedIndex && idx !== q.correctIndex) {
      btn.classList.add("wrong");
    }
  });

  if (selectedIndex === q.correctIndex) {
    correctCount += 1;
    feedback.textContent = "Дұрыс! Жарайсыз.";
    feedback.classList.add("correct");
  } else {
    wrongCount += 1;
    feedback.textContent = "Қате. Дұрыс нұсқа жасыл түспен көрсетілді.";
    feedback.classList.add("wrong");
  }

  updateTestProgress();
  nextBtn.disabled = false;
}

function handleNextQuestion() {
  if (!currentAnswered) return;
  currentIndex += 1;
  renderCurrentQuestion();
}

function showResult() {
  const questionCard = qs("#questionCard");
  const resultCard = qs("#resultCard");
  if (!questionCard || !resultCard) return;

  questionCard.classList.add("hidden");
  resultCard.classList.remove("hidden");

  const finalCorrect = qs("#finalCorrect");
  const finalTotal = qs("#finalTotal");
  const finalPercent = qs("#finalPercent");
  const comment = qs("#resultComment");

  const total = shuffledQuestions.length || 1;
  const percent = Math.round((correctCount / total) * 100);

  if (finalCorrect) finalCorrect.textContent = String(correctCount);
  if (finalTotal) finalTotal.textContent = String(total);
  if (finalPercent) finalPercent.textContent = `${percent}%`;

  if (comment) {
    if (percent >= 90) {
      comment.textContent = "Өте жақсы нәтиже! Сіз емтиханға жақсы дайынсыз.";
    } else if (percent >= 75) {
      comment.textContent = "Жақсы! Бірақ тағы да бірнеше рет қайталап көріңіз.";
    } else if (percent >= 50) {
      comment.textContent = "Орташа нәтиже. Ережелерді тағы бір қарап шыққаныңыз дұрыс.";
    } else {
      comment.textContent =
        "Әзірге нәтиже төмен. PDD ережелерін мұқият оқып шығып, тестті қайта тапсырыңыз.";
    }
  }

  // Статистиканы сақтау
  if (!appState.stats) appState.stats = { tests: [] };
  appState.stats.tests.push({
    date: new Date().toISOString(),
    correct: correctCount,
    total,
  });
  saveAppState(appState);
}

function hideResultCard() {
  const resultCard = qs("#resultCard");
  if (resultCard) resultCard.classList.add("hidden");
}

function showQuestionCard() {
  const questionCard = qs("#questionCard");
  if (questionCard) questionCard.classList.remove("hidden");
}

// -------------------------
// Пайдаланушы сұрақтары (ask.html)
// -------------------------

function loadUserQuestions() {
  try {
    const raw = localStorage.getItem(PDD_USER_QUESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUserQuestions(list) {
  localStorage.setItem(PDD_USER_QUESTIONS_KEY, JSON.stringify(list));
}

let userQuestions = loadUserQuestions();

function renderUserQuestions() {
  const listEl = qs("#savedQuestions");
  if (!listEl) return;
  listEl.innerHTML = "";
  if (!userQuestions.length) {
    const empty = document.createElement("li");
    empty.textContent = "Әзірге сақталған сұрақтар жоқ.";
    empty.className = "question-list-item";
    listEl.appendChild(empty);
    return;
  }

  userQuestions
    .slice()
    .reverse()
    .forEach((q) => {
      const li = document.createElement("li");
      li.className = "question-list-item";
      const text = document.createElement("div");
      text.textContent = q.text;
      const meta = document.createElement("small");
      const d = new Date(q.date);
      meta.textContent = d.toLocaleString();
      li.appendChild(text);
      li.appendChild(meta);
      listEl.appendChild(li);
    });
}

function initAskPage() {
  const form = qs("#userQuestionForm");
  const textarea = qs("#userQuestionText");
  const clearBtn = qs("#clearQuestions");

  if (form && textarea) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text) return;
      userQuestions.push({ text, date: new Date().toISOString() });
      saveUserQuestions(userQuestions);
      textarea.value = "";
      renderUserQuestions();
    });
  }

  clearBtn?.addEventListener("click", () => {
    if (confirm("Барлық сақталған сұрақтарды өшіруге сенімдісіз бе?")) {
      userQuestions = [];
      saveUserQuestions(userQuestions);
      renderUserQuestions();
    }
  });

  renderUserQuestions();
  initChat();
}

// -------------------------
// ИИ чат (frontend бөлігі)
// -------------------------

function addChatMessage(role, text) {
  const win = qs("#chatWindow");
  if (!win) return;
  const div = document.createElement("div");
  div.className = `chat-message ${role}`;
  div.textContent = text;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function initChat() {
  const form = qs("#chatForm");
  const input = qs("#chatInput");
  const sendBtn = qs("#sendChatBtn");
  const win = qs("#chatWindow");

  if (!form || !input || !sendBtn || !win) return;

  if (!win.dataset.initialized) {
    addChatMessage(
      "system",
      "ИИ чатқа қош келдіңіз! PDD, белгілер, жолдағы жағдайлар туралы кез келген сұрақ қойыңыз."
    );
    win.dataset.initialized = "1";
  }

  let sending = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;

    const text = input.value.trim();
    if (!text) return;

    addChatMessage("user", text);
    input.value = "";

    sending = true;
    sendBtn.disabled = true;

    addChatMessage("system", "Жауап дайындалуда...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error("Сервер қате қайтарды");
      }

      const data = await res.json();
      addChatMessage("ai", data.reply || "Жауапты оқу кезінде қате пайда болды.");
    } catch (err) {
      console.error(err);
      addChatMessage(
        "ai",
        "Қазір ИИ серверіне қосылу мүмкін болмады. Backend бөлігін дұрыс баптағаныңызды тексеріңіз."
      );
    } finally {
      sending = false;
      sendBtn.disabled = false;
    }
  });
}

// -------------------------
// Инициализация
// -------------------------

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initHomeStats();

  const path = window.location.pathname.toLowerCase();
  if (path.endsWith("test.html")) {
    document.body.classList.add("test-light");
    initTestPage();
  } else if (path.endsWith("ask.html")) {
    initAskPage();
  }
});

