export const STORAGE_KEY = 'academiaTrackerData';
export const COLOR_STYLES = ['soft-sage', 'cloudy-sky', 'lemon-chiffon', 'cyprus', 'vulcanico'];
export const THEME_MODES = ['auto', 'light', 'dark'];

export function defaultData() {
  return { version: 1, settings: { weeklyGoal: 4, themeMode: 'auto', colorStyle: 'soft-sage' }, workouts: [] };
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function validDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const date = dateFromKey(key);
  return Number.isFinite(date.getTime()) && localDateKey(date) === key;
}

export function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  next.setDate(next.getDate() + days);
  return next;
}

export function weekStart(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

export function validateBackup(value, today = new Date()) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) throw new Error('Versão de backup não suportada.');
  const settings = value.settings;
  if (!settings || typeof settings !== 'object' || !Number.isInteger(settings.weeklyGoal) || settings.weeklyGoal < 1 || settings.weeklyGoal > 7 || !THEME_MODES.includes(settings.themeMode) || !COLOR_STYLES.includes(settings.colorStyle)) {
    throw new Error('As configurações do backup são inválidas.');
  }
  if (!Array.isArray(value.workouts)) throw new Error('A lista de treinos do backup é inválida.');
  const dates = new Set();
  for (const workout of value.workouts) {
    if (!workout || typeof workout !== 'object' || !validDateKey(workout.date) || workout.date > localDateKey(today) || dates.has(workout.date)) {
      throw new Error('O backup contém datas inválidas, futuras ou duplicadas.');
    }
    dates.add(workout.date);
  }
  if (value.exportedAt !== undefined && (typeof value.exportedAt !== 'string' || Number.isNaN(Date.parse(value.exportedAt)))) {
    throw new Error('A data de exportação do backup é inválida.');
  }
  return {
    version: 1,
    settings: { weeklyGoal: settings.weeklyGoal, themeMode: settings.themeMode, colorStyle: settings.colorStyle },
    workouts: [...dates].sort().map(date => ({ date }))
  };
}

export function loadData(storage = localStorage, today = new Date()) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return defaultData();
  return validateBackup(JSON.parse(raw), today);
}

export function saveData(data, storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function workoutDates(data) {
  return new Set(data.workouts.map(workout => workout.date));
}

export function toggleWorkout(data, key, today = new Date()) {
  if (!validDateKey(key) || key > localDateKey(today)) throw new Error('Escolha uma data até hoje.');
  const dates = workoutDates(data);
  if (dates.has(key)) dates.delete(key);
  else dates.add(key);
  return { ...data, workouts: [...dates].sort().map(date => ({ date })) };
}

export function countWeek(dates, date) {
  const start = localDateKey(weekStart(date));
  const end = localDateKey(addDays(weekStart(date), 6));
  return [...dates].filter(key => key >= start && key <= end).length;
}

export function countMonth(dates, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  return [...dates].filter(key => key.startsWith(prefix)).length;
}

export function countYear(dates, year) {
  return [...dates].filter(key => key.startsWith(`${year}-`)).length;
}

export function lastWeeks(dates, goal, today = new Date(), quantity = 12) {
  const first = weekStart(today);
  return Array.from({ length: quantity }, (_, index) => {
    const startDate = addDays(first, -7 * (quantity - index - 1));
    const count = countWeek(dates, startDate);
    return { start: localDateKey(startDate), count, reached: count >= goal };
  });
}

export function consistency(dates, goal, today = new Date()) {
  const counts = new Map();
  for (const key of dates) {
    const start = localDateKey(weekStart(dateFromKey(key)));
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  const reachedWeeks = [...counts].filter(([, count]) => count >= goal).map(([start]) => start).sort();
  let best = 0;
  let run = 0;
  let previous = null;
  const runs = new Map();
  for (const start of reachedWeeks) {
    run = previous && localDateKey(addDays(dateFromKey(previous), 7)) === start ? run + 1 : 1;
    best = Math.max(best, run);
    runs.set(start, run);
    previous = start;
  }
  const thisWeek = localDateKey(weekStart(today));
  // A semana em curso ainda incompleta não interrompe a sequência anterior.
  const endingWeek = counts.get(thisWeek) >= goal ? thisWeek : localDateKey(addDays(weekStart(today), -7));
  const current = runs.get(endingWeek) ?? 0;
  return { current, best };
}

export function elapsedWeeksInYear(today = new Date()) {
  const start = new Date(today.getFullYear(), 0, 1, 12);
  const elapsedDays = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(start.getFullYear(), 0, 1)) / 86400000) + 1;
  return Math.max(1, elapsedDays / 7);
}
