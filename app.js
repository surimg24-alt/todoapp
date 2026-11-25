const tabs = document.querySelectorAll(".tab");
const screens = document.querySelectorAll(".screen");

function showScreen(name) {
  screens.forEach((screen) => {
    screen.hidden = screen.id !== name;
  });
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.screen === name);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => showScreen(tab.dataset.screen));
});

// 기능 1: 습관 추가/삭제 (localStorage 저장)
const STORAGE_KEY = "habits";
const MAX_NAME_LENGTH = 30;
const DEFAULT_HABITS = [
  { id: "default-1", name: "운동" },
  { id: "default-2", name: "물 마시기" },
  { id: "default-3", name: "독서" },
];

const addForm = document.getElementById("add-form");
const habitInput = document.getElementById("habit-input");
const formError = document.getElementById("form-error");
const habitCount = document.getElementById("habit-count");
const habitList = document.getElementById("habit-list");
const emptyMsg = document.getElementById("empty-msg");

function isValidHabit(item) {
  return item !== null && typeof item === "object"
    && typeof item.id === "string" && typeof item.name === "string";
}

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_HABITS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidHabit) : [];
  } catch (error) {
    console.error("저장된 습관을 불러오지 못했어요:", error);
    return [];
  }
}

function saveHabits(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (error) {
    console.error("습관을 저장하지 못했어요:", error);
    return false;
  }
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

let habits = loadHabits();

// 기능 2: 오늘 했는지 체크 (습관별로 체크한 날짜를 localStorage 저장)
const CHECKS_KEY = "checks";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const todaySection = document.getElementById("today");
const todaySummary = document.getElementById("today-summary");
const todayError = document.getElementById("today-error");
const todayList = document.getElementById("today-list");
const todayEmpty = document.getElementById("today-empty");

function isValidChecks(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.values(value).every((dates) => Array.isArray(dates) && dates.every((d) => typeof d === "string"));
}

function loadChecks() {
  try {
    const raw = localStorage.getItem(CHECKS_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    return isValidChecks(parsed) ? parsed : {};
  } catch (error) {
    console.error("체크 기록을 불러오지 못했어요:", error);
    return {};
  }
}

function saveChecks(next) {
  try {
    localStorage.setItem(CHECKS_KEY, JSON.stringify(next));
    return true;
  } catch (error) {
    console.error("체크 기록을 저장하지 못했어요:", error);
    return false;
  }
}

let checks = loadChecks();

function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

function isDoneOn(habitId, dateKey) {
  return (checks[habitId] || []).includes(dateKey);
}

// 기능 3: 연속 일수 (저장된 체크 날짜로 계산)
const WEEK_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

const streakList = document.getElementById("streak-list");
const streakEmpty = document.getElementById("streak-empty");

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function getStreak(habitId, now) {
  const doneDates = new Set(checks[habitId] || []);
  let cursor = doneDates.has(toDateKey(now)) ? now : addDays(now, -1);
  let count = 0;
  while (doneDates.has(toDateKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

// 0일이면 배지를 숨기고, 오늘 체크해서 이어진 기록은 채운 배지로 보여 줌
function createStreakBadge(habitId, now) {
  const count = getStreak(habitId, now);
  if (count === 0) return null;
  const badge = document.createElement("span");
  badge.className = isDoneOn(habitId, toDateKey(now)) ? "streak earned" : "streak";
  badge.textContent = `${count}일 연속`;
  return badge;
}

function createWeekCell(habitId, date, label, todayKey) {
  const key = toDateKey(date);
  const done = isDoneOn(habitId, key);
  const cell = document.createElement("span");
  cell.className = ["day", done ? "on" : "", key === todayKey ? "today" : ""].join(" ").trim();
  const mark = document.createElement("b");
  mark.textContent = done ? "V" : "-";
  cell.append(label, mark);
  cell.setAttribute("aria-label", `${label}요일 ${done ? "함" : "안 함"}`);
  return cell;
}

function createStreakCard(habit, now) {
  const todayKey = toDateKey(now);
  const monday = addDays(now, -((now.getDay() + 6) % 7));

  const card = document.createElement("div");
  card.className = "card";

  const top = document.createElement("div");
  top.className = "card-top";
  const name = document.createElement("strong");
  name.className = "grow";
  name.textContent = habit.name;
  const count = document.createElement("span");
  count.className = "count";
  count.textContent = `${getStreak(habit.id, now)}일 연속`;
  top.append(name, count);

  const week = document.createElement("div");
  week.className = "week";
  week.append(...WEEK_LABELS.map((label, i) => createWeekCell(habit.id, addDays(monday, i), label, todayKey)));

  card.append(top, week);
  return card;
}

function renderStreaks() {
  const now = new Date();
  streakList.replaceChildren(...habits.map((habit) => createStreakCard(habit, now)));
  streakEmpty.hidden = habits.length > 0;
}

function createTodayRow(habit, todayKey) {
  const done = isDoneOn(habit.id, todayKey);
  const item = document.createElement("li");
  item.className = "row";

  const name = document.createElement("strong");
  name.className = "grow";
  name.textContent = habit.name;

  const checkButton = document.createElement("button");
  checkButton.type = "button";
  checkButton.className = done ? "btn done" : "btn light";
  checkButton.dataset.id = habit.id;
  checkButton.textContent = done ? "✓ 완료" : "오늘 체크";
  checkButton.setAttribute("aria-pressed", String(done));
  checkButton.setAttribute("aria-label", `${habit.name} 오늘 체크`);

  const badge = createStreakBadge(habit.id, new Date());
  item.append(...[name, badge, checkButton].filter(Boolean));
  return item;
}

function isAllDoneToday() {
  const todayKey = toDateKey(new Date());
  return habits.length > 0 && habits.every((habit) => isDoneOn(habit.id, todayKey));
}

function celebrateSummary() {
  todaySummary.classList.remove("celebrate");
  void todaySummary.offsetWidth;
  todaySummary.classList.add("celebrate");
}

todaySummary.addEventListener("animationend", () => todaySummary.classList.remove("celebrate"));

function renderToday() {
  const now = new Date();
  const todayKey = toDateKey(now);
  const doneCount = habits.filter((habit) => isDoneOn(habit.id, todayKey)).length;
  todaySection.classList.toggle("all-done", isAllDoneToday());
  todaySummary.textContent = `${formatDate(now)} · ${habits.length}개 중 ${doneCount}개 완료`;
  todayList.replaceChildren(...habits.map((habit) => createTodayRow(habit, todayKey)));
  todayEmpty.hidden = habits.length > 0;
  renderStreaks();
}

function toggleToday(habitId) {
  const todayKey = toDateKey(new Date());
  const dates = checks[habitId] || [];
  const nextDates = dates.includes(todayKey)
    ? dates.filter((d) => d !== todayKey)
    : [...dates, todayKey];
  const nextChecks = { ...checks, [habitId]: nextDates };

  if (!saveChecks(nextChecks)) {
    todayError.textContent = "저장하지 못했어요. 다시 시도해 주세요.";
    todayError.hidden = false;
    return;
  }
  todayError.hidden = true;
  const wasAllDone = isAllDoneToday();
  checks = nextChecks;
  renderToday();
  if (!wasAllDone && isAllDoneToday()) celebrateSummary();
}

todayList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (button) toggleToday(button.dataset.id);
});

function removeChecksFor(habitId) {
  const nextChecks = Object.fromEntries(Object.entries(checks).filter(([id]) => id !== habitId));
  if (saveChecks(nextChecks)) checks = nextChecks;
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = message === "";
}

function createHabitRow(habit) {
  const item = document.createElement("li");
  item.className = "row";

  const name = document.createElement("strong");
  name.className = "grow";
  name.textContent = habit.name;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn small";
  deleteButton.dataset.id = habit.id;
  deleteButton.textContent = "삭제";
  deleteButton.setAttribute("aria-label", `${habit.name} 삭제`);

  item.append(name, deleteButton);
  return item;
}

function renderHabits() {
  habitList.replaceChildren(...habits.map(createHabitRow));
  habitCount.textContent = `등록된 습관 ${habits.length}개`;
  emptyMsg.hidden = habits.length > 0;
  renderToday();
}

function addHabit(rawName) {
  const name = rawName.trim();
  if (name === "") return "습관 이름을 입력해 주세요.";
  if (name.length > MAX_NAME_LENGTH) return `습관 이름은 ${MAX_NAME_LENGTH}자까지 쓸 수 있어요.`;
  if (habits.some((habit) => habit.name === name)) return "이미 있는 습관이에요.";

  const nextHabits = [...habits, { id: makeId(), name }];
  if (!saveHabits(nextHabits)) return "저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.";
  habits = nextHabits;
  return "";
}

function deleteHabit(id) {
  const target = habits.find((habit) => habit.id === id);
  if (!target) return;
  if (!window.confirm(`"${target.name}" 습관을 정말 지울까요?`)) return;

  const nextHabits = habits.filter((habit) => habit.id !== id);
  if (!saveHabits(nextHabits)) {
    showError("지우지 못했어요. 다시 시도해 주세요.");
    return;
  }
  habits = nextHabits;
  removeChecksFor(id);
  renderHabits();
}

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const error = addHabit(habitInput.value);
  showError(error);
  if (error === "") {
    habitInput.value = "";
    renderHabits();
  }
  habitInput.focus();
});

habitList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (button) deleteHabit(button.dataset.id);
});

renderHabits();

// 스켈레톤은 글꼴을 실제로 불러오는 동안만 보여 주고, 아무리 늦어도 1초 뒤에는 화면을 띄움
const MAX_LOADING_MS = 1000;
const main = document.querySelector(".content");

function finishLoading() {
  document.body.classList.remove("loading");
  main.setAttribute("aria-busy", "false");
}

const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
const timeLimit = new Promise((resolve) => setTimeout(resolve, MAX_LOADING_MS));
Promise.race([fontsReady, timeLimit]).then(finishLoading, finishLoading);
