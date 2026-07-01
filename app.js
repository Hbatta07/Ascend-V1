/* ============================================================
   ASCEND — App Logic
   Vanilla JS, no framework. State lives in localStorage under
   one namespaced key. Every render reads from state; every
   action mutates state then re-renders. Nothing is hardcoded
   into the HTML — missions, achievements, and nature all come
   from data.js + user state.
   ============================================================ */

const STORAGE_KEY = "ascend_state_v1";

/* ---------- State shape & bootstrap ---------- */

function createFreshState() {
  return {
    profile: {
      username: "Traveler",
      avatar: "🧭",
    },
    xp: 0,               // XP within the current level
    lifetimeXP: 0,        // total XP ever earned
    level: 1,
    streak: {
      current: 0,
      longest: 0,
      lastCompletionDate: null, // YYYY-MM-DD of last day a mission was completed
    },
    missions: JSON.parse(JSON.stringify(DEFAULT_MISSIONS)),
    completionsByDate: {},      // { "YYYY-MM-DD": [missionId, ...] }
    stats: {
      totalMissionsCompleted: 0,
      categoryCompletions: {},  // { health: n, mind: n, craft: n }
    },
    achievementsUnlocked: [],   // [achievementId]
    natureUnlocked: [],         // [natureId]
    settings: {
      animations: true,
      sound: false,
      theme: "dark",
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createFreshState();
    const parsed = JSON.parse(raw);
    // Shallow-merge to survive schema growth across updates.
    return Object.assign(createFreshState(), parsed);
  } catch (e) {
    console.error("Failed to load state, starting fresh.", e);
    return createFreshState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

/* ---------- Date helpers ---------- */

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const msPerDay = 86400000;
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / msPerDay);
}

/* ---------- XP & Level ---------- */

function addXP(amount) {
  state.xp += amount;
  state.lifetimeXP += amount;
  let leveledUp = false;
  while (state.xp >= XP_PER_LEVEL) {
    state.xp -= XP_PER_LEVEL;
    state.level += 1;
    leveledUp = true;
  }
  return leveledUp;
}

/* ---------- Streak ---------- */

function registerCompletionForStreak() {
  const today = todayKey();
  const last = state.streak.lastCompletionDate;

  if (last === today) return; // already counted today

  if (last === null) {
    state.streak.current = 1;
  } else {
    const gap = daysBetween(last, today);
    if (gap === 1) {
      state.streak.current += 1;
    } else if (gap > 1) {
      state.streak.current = 1;
    }
    // gap === 0 already handled above
  }

  state.streak.lastCompletionDate = today;
  state.streak.longest = Math.max(state.streak.longest, state.streak.current);
}

/* ---------- Missions ---------- */

function getActiveMissions() {
  return state.missions.filter((m) => !m.archived);
}

function isMissionCompletedToday(missionId) {
  const list = state.completionsByDate[todayKey()] || [];
  return list.includes(missionId);
}

function completeMission(missionId) {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission || isMissionCompletedToday(missionId)) return null;

  const today = todayKey();
  if (!state.completionsByDate[today]) state.completionsByDate[today] = [];
  state.completionsByDate[today].push(missionId);

  const leveledUp = addXP(mission.xp);
  registerCompletionForStreak();

  state.stats.totalMissionsCompleted += 1;
  const cat = mission.category || "general";
  state.stats.categoryCompletions[cat] = (state.stats.categoryCompletions[cat] || 0) + 1;

  const newAchievements = checkAchievements();
  const newNature = checkNatureUnlocks();

  saveState();
  return { leveledUp, newAchievements, newNature, mission };
}

function createMission({ icon, title, description, xp, difficulty, estimatedMinutes, category }) {
  const mission = {
    id: "m-" + Date.now().toString(36),
    icon: icon || "🌟",
    title: title || "New Mission",
    description: description || "",
    xp: Number(xp) || 20,
    difficulty: difficulty || "easy",
    estimatedMinutes: Number(estimatedMinutes) || 10,
    category: category || "general",
    archived: false,
  };
  state.missions.push(mission);
  saveState();
  return mission;
}

function updateMission(id, patch) {
  const mission = state.missions.find((m) => m.id === id);
  if (!mission) return;
  Object.assign(mission, patch);
  saveState();
}

function deleteMission(id) {
  state.missions = state.missions.filter((m) => m.id !== id);
  saveState();
}

function archiveMission(id, archived = true) {
  updateMission(id, { archived });
}

function duplicateMission(id) {
  const original = state.missions.find((m) => m.id === id);
  if (!original) return;
  const copy = Object.assign({}, original, {
    id: "m-" + Date.now().toString(36),
    title: original.title + " (copy)",
  });
  state.missions.push(copy);
  saveState();
  return copy;
}

function reorderMissions(orderedIds) {
  const byId = Object.fromEntries(state.missions.map((m) => [m.id, m]));
  state.missions = orderedIds.map((id) => byId[id]).filter(Boolean);
  saveState();
}

/* ---------- Achievements ---------- */

function checkAchievements() {
  const statsSnapshot = {
    totalMissionsCompleted: state.stats.totalMissionsCompleted,
    categoryCompletions: state.stats.categoryCompletions,
    lifetimeXP: state.lifetimeXP,
    level: state.level,
    longestStreak: state.streak.longest,
    natureUnlocked: state.natureUnlocked.length,
  };
  const unlocked = [];
  ACHIEVEMENTS.forEach((a) => {
    if (!state.achievementsUnlocked.includes(a.id) && a.test(statsSnapshot)) {
      state.achievementsUnlocked.push(a.id);
      unlocked.push(a);
    }
  });
  return unlocked;
}

/* ---------- Nature ---------- */

function checkNatureUnlocks() {
  const unlocked = [];
  NATURE_CATALOG.forEach((n) => {
    if (!state.natureUnlocked.includes(n.id) && state.lifetimeXP >= n.xpThreshold) {
      state.natureUnlocked.push(n.id);
      unlocked.push(n);
    }
  });
  return unlocked;
}

/* ============================================================
   RENDERING
   ============================================================ */

function greetingForHour(hour) {
  if (hour < 5) return "Still awake";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
}

const MOTIVATIONAL_LINES = [
  "Small actions, repeated daily, become who you are.",
  "The forest grows one quiet morning at a time.",
  "Today's effort is tomorrow's ease.",
  "Discipline is remembering what you want.",
  "You don't need more time — just the next step.",
];

function renderHeader() {
  const now = new Date();
  document.getElementById("greeting").textContent = `${greetingForHour(now.getHours())}, ${state.profile.username}`;
  document.getElementById("motivation").textContent =
    MOTIVATIONAL_LINES[now.getDate() % MOTIVATIONAL_LINES.length];
  document.getElementById("today-date").textContent = now.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
  document.getElementById("today-time").textContent = now.toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
  });
}

function renderXP() {
  document.getElementById("level-value").textContent = state.level;
  const pct = Math.min(100, Math.round((state.xp / XP_PER_LEVEL) * 100));
  const bar = document.getElementById("xp-bar-fill");
  bar.style.width = pct + "%";
  document.getElementById("xp-label").textContent = `${state.xp} / ${XP_PER_LEVEL} XP`;
}

function renderStreak() {
  document.getElementById("streak-current").textContent = state.streak.current;
  document.getElementById("streak-longest").textContent = state.streak.longest;
}

function renderStats() {
  document.getElementById("stat-total-missions").textContent = state.stats.totalMissionsCompleted;
  document.getElementById("stat-lifetime-xp").textContent = state.lifetimeXP;
  document.getElementById("stat-achievements").textContent =
    `${state.achievementsUnlocked.length}/${ACHIEVEMENTS.length}`;
}

function difficultyDotClass(difficulty) {
  return {
    easy: "dot-easy",
    medium: "dot-medium",
    hard: "dot-hard",
  }[difficulty] || "dot-easy";
}

function renderMissions() {
  const container = document.getElementById("mission-list");
  container.innerHTML = "";
  const missions = getActiveMissions();

  if (missions.length === 0) {
    container.innerHTML = `<div class="empty-state">No missions yet. Add one to begin today.</div>`;
    return;
  }

  missions.forEach((mission) => {
    const done = isMissionCompletedToday(mission.id);
    const card = document.createElement("div");
    card.className = "mission-card" + (done ? " completed" : "");
    card.dataset.id = mission.id;
    card.innerHTML = `
      <div class="mission-icon">${mission.icon}</div>
      <div class="mission-body">
        <div class="mission-title-row">
          <span class="mission-title">${escapeHTML(mission.title)}</span>
          <span class="mission-xp">+${mission.xp} XP</span>
        </div>
        <div class="mission-description">${escapeHTML(mission.description)}</div>
        <div class="mission-meta">
          <span class="dot ${difficultyDotClass(mission.difficulty)}"></span>
          <span class="meta-text">${capitalize(mission.difficulty)}</span>
          <span class="meta-sep">·</span>
          <span class="meta-text">${mission.estimatedMinutes} min</span>
          <span class="meta-sep">·</span>
          <span class="meta-text">${capitalize(mission.category)}</span>
        </div>
      </div>
      <button class="mission-complete-btn" ${done ? "disabled" : ""} aria-label="Complete ${escapeHTML(mission.title)}">
        ${done ? "✓" : ""}
      </button>
    `;
    container.appendChild(card);
  });
}

function renderNature() {
  const container = document.getElementById("nature-grid");
  container.innerHTML = "";
  NATURE_CATALOG.forEach((n) => {
    const unlocked = state.natureUnlocked.includes(n.id);
    const el = document.createElement("div");
    el.className = "nature-item" + (unlocked ? " unlocked" : " locked");
    el.title = unlocked ? `${n.name} — ${n.meaning}` : `Unlocks at ${n.xpThreshold} lifetime XP`;
    el.innerHTML = `<span class="nature-icon">${unlocked ? n.icon : "🔒"}</span>`;
    container.appendChild(el);
  });
}

function renderAll() {
  renderHeader();
  renderXP();
  renderStreak();
  renderStats();
  renderMissions();
  renderNature();
}

/* ---------- Utilities ---------- */

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ============================================================
   EVENTS & FEEDBACK
   ============================================================ */

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function showLevelUpCelebration() {
  const el = document.getElementById("level-up-overlay");
  document.getElementById("level-up-value").textContent = state.level;
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 2200);
}

function handleMissionListClick(e) {
  const btn = e.target.closest(".mission-complete-btn");
  if (!btn) return;
  const card = e.target.closest(".mission-card");
  const id = card.dataset.id;

  const result = completeMission(id);
  if (!result) return;

  card.classList.add("completed", "just-completed");
  setTimeout(() => card.classList.remove("just-completed"), 600);

  renderXP();
  renderStreak();
  renderStats();
  renderNature();
  btn.disabled = true;
  btn.textContent = "✓";

  if (result.leveledUp) {
    showLevelUpCelebration();
  }
  result.newAchievements.forEach((a) => {
    showToast(`Achievement unlocked: ${a.icon} ${a.title}`);
  });
  result.newNature.forEach((n) => {
    showToast(`${n.icon} ${n.name} has grown in your world.`);
  });
}

/* ---------- Add Mission modal ---------- */

function openAddMissionModal() {
  document.getElementById("add-mission-modal").classList.add("visible");
}
function closeAddMissionModal() {
  document.getElementById("add-mission-modal").classList.remove("visible");
  document.getElementById("add-mission-form").reset();
}

function handleAddMissionSubmit(e) {
  e.preventDefault();
  const form = e.target;
  createMission({
    icon: form.icon.value.trim() || "🌟",
    title: form.title.value.trim(),
    description: form.description.value.trim(),
    xp: form.xp.value,
    difficulty: form.difficulty.value,
    estimatedMinutes: form.minutes.value,
    category: form.category.value,
  });
  closeAddMissionModal();
  renderMissions();
  showToast("Mission added.");
}

/* ============================================================
   INIT
   ============================================================ */

function init() {
  renderAll();
  setInterval(() => {
    document.getElementById("today-time").textContent = new Date().toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit",
    });
  }, 30000);

  document.getElementById("mission-list").addEventListener("click", handleMissionListClick);
  document.getElementById("add-mission-btn").addEventListener("click", openAddMissionModal);
  document.getElementById("add-mission-close").addEventListener("click", closeAddMissionModal);
  document.getElementById("add-mission-form").addEventListener("submit", handleAddMissionSubmit);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* PWA install still works without SW registration succeeding in dev */
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
