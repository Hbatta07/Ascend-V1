/* ============================================================
   ASCEND — Default Data
   Nothing here is rendered directly. app.js reads this to seed
   a fresh install, then everything moves into localStorage.
   ============================================================ */

const DEFAULT_MISSIONS = [
  {
    id: "m-water",
    icon: "💧",
    title: "Drink 2L Water",
    description: "Stay hydrated through the day.",
    xp: 40,
    difficulty: "easy",
    estimatedMinutes: 5,
    category: "health",
    archived: false,
  },
  {
    id: "m-read",
    icon: "📖",
    title: "Read 10 Pages",
    description: "Feed your mind something worth keeping.",
    xp: 60,
    difficulty: "medium",
    estimatedMinutes: 20,
    category: "mind",
    archived: false,
  },
  {
    id: "m-walk",
    icon: "🚶",
    title: "Walk 30 Minutes",
    description: "Move your body, clear your head.",
    xp: 50,
    difficulty: "easy",
    estimatedMinutes: 30,
    category: "health",
    archived: false,
  },
  {
    id: "m-js",
    icon: "💻",
    title: "Learn JavaScript",
    description: "One focused block of deliberate practice.",
    xp: 80,
    difficulty: "hard",
    estimatedMinutes: 45,
    category: "craft",
    archived: false,
  },
];

/* Each achievement has a `test(stats)` predicate evaluated against
   the running lifetime stats object. Pure data + pure functions —
   no DOM, no hardcoding into HTML. */
const ACHIEVEMENTS = [
  { id: "a-first-mission", icon: "🌱", title: "First Mission", description: "Complete your first mission.", test: (s) => s.totalMissionsCompleted >= 1 },
  { id: "a-developer", icon: "💻", title: "Developer", description: "Complete 10 craft missions.", test: (s) => (s.categoryCompletions.craft || 0) >= 10 },
  { id: "a-reader", icon: "📖", title: "Reader", description: "Complete 10 mind missions.", test: (s) => (s.categoryCompletions.mind || 0) >= 10 },
  { id: "a-hydrated", icon: "💧", title: "Hydrated", description: "Complete 10 health missions.", test: (s) => (s.categoryCompletions.health || 0) >= 10 },
  { id: "a-walker", icon: "🚶", title: "Walker", description: "Complete 20 health missions.", test: (s) => (s.categoryCompletions.health || 0) >= 20 },
  { id: "a-100xp", icon: "✨", title: "100 XP", description: "Earn 100 lifetime XP.", test: (s) => s.lifetimeXP >= 100 },
  { id: "a-1000xp", icon: "🌟", title: "1000 XP", description: "Earn 1000 lifetime XP.", test: (s) => s.lifetimeXP >= 1000 },
  { id: "a-levelup", icon: "⬆️", title: "Level Up", description: "Reach level 2.", test: (s) => s.level >= 2 },
  { id: "a-7days", icon: "🔥", title: "7 Days", description: "Reach a 7-day streak.", test: (s) => s.longestStreak >= 7 },
  { id: "a-30days", icon: "🏔️", title: "30 Days", description: "Reach a 30-day streak.", test: (s) => s.longestStreak >= 30 },
  { id: "a-100missions", icon: "🏆", title: "100 Missions", description: "Complete 100 missions lifetime.", test: (s) => s.totalMissionsCompleted >= 100 },
  { id: "a-nature-lover", icon: "🦋", title: "Nature Lover", description: "Unlock 5 flora & fauna.", test: (s) => s.natureUnlocked >= 5 },
];

/* Flora & fauna the world can grow. Unlocks are driven by lifetime
   XP thresholds for now — simple, legible, easy to extend later. */
const NATURE_CATALOG = [
  { id: "n-oak", icon: "🌳", name: "Oak", meaning: "Strength", xpThreshold: 100 },
  { id: "n-bamboo", icon: "🎋", name: "Bamboo", meaning: "Discipline", xpThreshold: 250 },
  { id: "n-lavender", icon: "💜", name: "Lavender", meaning: "Calm", xpThreshold: 400 },
  { id: "n-fern", icon: "🌿", name: "Fern", meaning: "Resilience", xpThreshold: 600 },
  { id: "n-lotus", icon: "🪷", name: "Lotus", meaning: "Growth", xpThreshold: 800 },
  { id: "n-butterfly", icon: "🦋", name: "Butterfly", meaning: "Transformation", xpThreshold: 1000 },
  { id: "n-owl", icon: "🦉", name: "Owl", meaning: "Wisdom", xpThreshold: 1500 },
  { id: "n-fox", icon: "🦊", name: "Fox", meaning: "Strategy", xpThreshold: 2000 },
  { id: "n-wolf", icon: "🐺", name: "Wolf", meaning: "Leadership", xpThreshold: 2500 },
  { id: "n-deer", icon: "🦌", name: "Deer", meaning: "Grace", xpThreshold: 3000 },
  { id: "n-eagle", icon: "🦅", name: "Eagle", meaning: "Vision", xpThreshold: 4000 },
  { id: "n-firefly", icon: "✨", name: "Firefly", meaning: "Hope", xpThreshold: 5000 },
];

const XP_PER_LEVEL = 1000;
