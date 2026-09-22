import {
  defaultData, loadData, saveData, validateBackup, localDateKey, dateFromKey,
  addDays, weekStart, workoutDates, toggleWorkout, countWeek, countMonth,
  countYear, lastWeeks, consistency, elapsedWeeksInYear
} from './core.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const shortMonthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const fullDateFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const smallNumberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const capitalize = value => value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1);
const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
let data;
try { data = loadData(); }
catch (error) {
  data = defaultData();
  queueMicrotask(() => showToast('Os dados salvos não puderam ser lidos. Importe um backup válido para restaurá-los.'));
}
let displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
let activePeriod = 'year';
let pendingAction = null;
let toastTimer;

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4300);
}

function update(next, message) {
  try { saveData(next); }
  catch { showToast('Não foi possível salvar neste navegador. Verifique o armazenamento disponível.'); return false; }
  data = next;
  renderAll();
  if (message) showToast(message);
  return true;
}

function applyTheme() {
  const mode = data.settings.themeMode === 'auto' ? (mediaDark.matches ? 'dark' : 'light') : data.settings.themeMode;
  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.colorTheme = data.settings.colorStyle;
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  $$('[data-theme-mode]').forEach(button => button.setAttribute('aria-pressed', button.dataset.themeMode === data.settings.themeMode));
  $$('[data-color-style]').forEach(button => button.setAttribute('aria-pressed', button.dataset.colorStyle === data.settings.colorStyle));
}

function renderDashboard() {
  const today = new Date();
  const todayKey = localDateKey(today);
  const dates = workoutDates(data);
  const goal = data.settings.weeklyGoal;
  const weekCount = countWeek(dates, today);
  const percent = Math.round(weekCount / goal * 100);
  $('#today-label').textContent = dateFormat.format(today);
  $('#weekly-count').textContent = weekCount;
  $('#weekly-target').textContent = ` de ${goal} ${goal === 1 ? 'treino' : 'treinos'}`;
  $('#weekly-percent').textContent = `${Math.min(percent, 100)}%${weekCount > goal ? '+' : ''}`;
  $('#weekly-progress').setAttribute('aria-valuemax', goal);
  $('#weekly-progress').setAttribute('aria-valuenow', Math.min(weekCount, goal));
  $('#weekly-progress').setAttribute('aria-valuetext', `${weekCount} de ${goal} treinos`);
  $('#weekly-bar').style.width = `${Math.min(percent, 100)}%`;
  $('#weekly-message').textContent = weekCount > goal ? 'Meta superada! Continue no seu ritmo.' : weekCount === goal ? 'Meta da semana atingida! 🎯' : data.workouts.length === 0 ? 'Sua jornada começa aqui.' : 'Cada treino conta. O descanso também faz parte.';
  $('#streak-count').textContent = consistency(dates, goal, today).current;
  $('#month-count').textContent = countMonth(dates, displayedMonth.getFullYear(), displayedMonth.getMonth());
  $('#year-count').textContent = countYear(dates, today.getFullYear());
  $('#year-label').textContent = today.getFullYear();
  const trained = dates.has(todayKey);
  $('#today-button').classList.toggle('is-done', trained);
  $('#today-button-text').textContent = trained ? 'Treino registrado' : 'Treinei hoje';
  $('.today-arrow').textContent = trained ? '×' : '↗';
  $('#today-button').setAttribute('aria-label', trained ? 'Treino de hoje registrado. Toque para remover.' : 'Registrar treino de hoje');
  $('#today-hint').textContent = trained ? 'Registrado hoje. Toque novamente para remover.' : 'Um toque para registrar. O descanso também faz parte.';
}

function renderCalendar() {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const todayKey = localDateKey();
  const dates = workoutDates(data);
  $('#calendar-month').textContent = capitalize(monthFormat.format(displayedMonth));
  $('#next-month').disabled = year === new Date().getFullYear() && month === new Date().getMonth();
  const grid = $('#calendar-grid');
  grid.replaceChildren();
  const offset = displayedMonth.getDay();
  for (let index = 0; index < offset; index++) grid.append(document.createElement('span'));
  const days = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= days; day++) {
    const key = localDateKey(new Date(year, month, day, 12));
    const trained = dates.has(key);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `calendar-day${trained ? ' is-trained' : ''}${key === todayKey ? ' is-today' : ''}`;
    button.disabled = key > todayKey;
    button.dataset.date = key;
    button.innerHTML = `${day}${trained ? '<span class="day-check" aria-hidden="true">✓</span>' : ''}`;
    button.setAttribute('aria-label', `${fullDateFormat.format(dateFromKey(key))}, ${trained ? 'treino registrado' : 'sem registro'}${key === todayKey ? ', hoje' : ''}`);
    button.setAttribute('aria-pressed', trained);
    grid.append(button);
  }
}

function renderHeatmap(dates, today) {
  const year = today.getFullYear();
  $('#heatmap-year').textContent = year;
  const first = new Date(year, 0, 1, 12);
  const last = new Date(year, 11, 31, 12);
  const start = weekStart(first);
  const end = addDays(weekStart(last), 6);
  const weeks = Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000 / 7) + 1;
  const grid = $('#heatmap-grid');
  const labels = $('#heatmap-months');
  grid.replaceChildren(); labels.replaceChildren();
  labels.style.gridTemplateColumns = `repeat(${weeks}, 14px)`;
  grid.setAttribute('aria-label', `${countYear(dates, year)} treinos registrados em ${year}. Cada célula representa um dia.`);
  for (let index = 0; index < weeks; index++) {
    const sunday = addDays(start, index * 7);
    for (let offset = 0; offset < 7; offset++) {
      const date = addDays(sunday, offset);
      const key = localDateKey(date);
      const cell = document.createElement('span');
      cell.className = `heatmap-day${date.getFullYear() !== year ? ' is-outside' : ''}${dates.has(key) ? ' is-trained' : ''}${key > localDateKey(today) ? ' is-future' : ''}`;
      cell.title = `${date.toLocaleDateString('pt-BR')}: ${dates.has(key) ? 'treino' : 'sem registro'}`;
      grid.append(cell);
    }
    const monthStart = Array.from({ length: 7 }, (_, offset) => addDays(sunday, offset)).find(date => date.getFullYear() === year && date.getDate() === 1);
    if (monthStart) {
      const label = document.createElement('span');
      label.style.gridColumn = index + 1;
      label.textContent = shortMonthFormat.format(monthStart);
      labels.append(label);
    }
  }
}

function renderRecent(dates, today) {
  const container = $('#recent-weeks');
  container.replaceChildren();
  for (const week of lastWeeks(dates, data.settings.weeklyGoal, today)) {
    const card = document.createElement('div');
    card.className = `recent-week${week.reached ? ' is-reached' : ''}`;
    const label = document.createElement('strong');
    label.textContent = `${week.count}/${data.settings.weeklyGoal}`;
    const date = document.createElement('small');
    date.textContent = `${dateFromKey(week.start).getDate()} ${shortMonthFormat.format(dateFromKey(week.start))}`;
    const track = document.createElement('span');
    track.className = 'mini-track';
    const fill = document.createElement('i');
    fill.style.width = `${Math.min(100, week.count / data.settings.weeklyGoal * 100)}%`;
    track.append(fill);
    card.append(label, date, track);
    container.append(card);
  }
}

function renderStatistics() {
  const today = new Date();
  const dates = workoutDates(data);
  const streak = consistency(dates, data.settings.weeklyGoal, today);
  const weekCount = countWeek(dates, today);
  const monthCount = countMonth(dates, today.getFullYear(), today.getMonth());
  const yearCount = countYear(dates, today.getFullYear());
  const yearlyAverage = yearCount / elapsedWeeksInYear(today);
  const values = {
    week: ['ESTA SEMANA', weekCount, `${weekCount} de ${data.settings.weeklyGoal} treinos para sua meta semanal.`],
    month: [monthFormat.format(today).toLocaleUpperCase('pt-BR'), monthCount, 'Treinos registrados neste mês.'],
    year: [`EM ${today.getFullYear()}`, yearCount, `Média de ${(yearlyAverage > 0 && yearlyAverage < 0.1 ? smallNumberFormat : numberFormat).format(yearlyAverage)} treinos por semana até hoje.`]
  };
  const [title, count, subtitle] = values[activePeriod];
  $('#stats-period-title').textContent = title;
  $('#stats-total').textContent = count;
  $('.stats-big span').textContent = count === 1 ? 'treino' : 'treinos';
  $('#stats-subtitle').textContent = subtitle;
  $('#stats-current').textContent = streak.current;
  $('#stats-best').textContent = streak.best;
  $$('[data-period]').forEach(button => button.setAttribute('aria-pressed', button.dataset.period === activePeriod));
  $('#heatmap-panel').hidden = activePeriod !== 'year';
  if (activePeriod === 'year') renderHeatmap(dates, today);
  renderRecent(dates, today);
}

function renderHistory() {
  const container = $('#history-list');
  container.replaceChildren();
  if (!data.workouts.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<strong>Sua jornada começa aqui.</strong>Quando registrar um treino, ele aparecerá neste histórico.';
    container.append(empty);
    return;
  }
  const groups = new Map();
  for (const { date } of [...data.workouts].reverse()) {
    const groupKey = date.slice(0, 7);
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(date);
  }
  for (const [monthKey, dates] of groups) {
    const section = document.createElement('section');
    section.className = 'history-group';
    const heading = document.createElement('h3');
    heading.textContent = capitalize(monthFormat.format(dateFromKey(`${monthKey}-01`)));
    section.append(heading);
    for (const key of dates) {
      const row = document.createElement('div');
      row.className = 'history-row';
      const check = document.createElement('span'); check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
      const date = document.createElement('time'); date.dateTime = key; date.textContent = dateFromKey(key).toLocaleDateString('pt-BR'); date.setAttribute('aria-label', fullDateFormat.format(dateFromKey(key)));
      const remove = document.createElement('button'); remove.type = 'button'; remove.dataset.removeDate = key; remove.textContent = 'Remover'; remove.setAttribute('aria-label', `Remover treino de ${fullDateFormat.format(dateFromKey(key))}`);
      row.append(check, date, remove);
      section.append(row);
    }
    container.append(section);
  }
}

function renderSettings() {
  $('#goal-value').textContent = data.settings.weeklyGoal;
  $('#goal-minus').disabled = data.settings.weeklyGoal <= 1;
  $('#goal-plus').disabled = data.settings.weeklyGoal >= 7;
  applyTheme();
}

function renderAll() { renderSettings(); renderDashboard(); renderCalendar(); renderStatistics(); renderHistory(); }

function confirmAction(title, message, actionLabel, action) {
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = message;
  $('#confirm-action').textContent = actionLabel;
  pendingAction = action;
  $('#confirm-dialog').showModal();
  $('#confirm-dialog .button-secondary').focus();
}

function setView(view) {
  $$('.view').forEach(section => { section.hidden = section.id !== `view-${view}`; section.classList.toggle('active', !section.hidden); });
  $$('[data-view]').forEach(button => {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const heading = $(`#view-${view} h2`);
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

$('#today-button').addEventListener('click', () => {
  const today = localDateKey();
  if (workoutDates(data).has(today)) confirmAction('Remover o treino de hoje?', 'Esse registro será retirado do seu histórico.', 'Remover', () => update(toggleWorkout(data, today), 'Treino de hoje removido.'));
  else update(toggleWorkout(data, today), 'Treino de hoje registrado!');
});
$('#calendar-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-date]');
  if (!button || button.disabled) return;
  const date = button.dataset.date;
  update(toggleWorkout(data, date), workoutDates(data).has(date) ? 'Treino removido.' : 'Treino registrado!');
  $(`[data-date="${date}"]`)?.focus();
});
$('#previous-month').addEventListener('click', () => { displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1, 12); renderDashboard(); renderCalendar(); });
$('#next-month').addEventListener('click', () => { displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1, 12); renderDashboard(); renderCalendar(); });
$$('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$$('[data-period]').forEach(button => button.addEventListener('click', () => { activePeriod = button.dataset.period; renderStatistics(); }));
$('#history-list').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-date]');
  if (!button) return;
  const key = button.dataset.removeDate;
  confirmAction('Remover este treino?', `Registro de ${dateFromKey(key).toLocaleDateString('pt-BR')}.`, 'Remover', () => update(toggleWorkout(data, key), 'Treino removido.'));
});
$('#open-settings').addEventListener('click', () => { $('#settings-dialog').showModal(); $('#goal-minus').focus(); });
$$('[data-close]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
$('#confirm-action').addEventListener('click', () => { const action = pendingAction; pendingAction = null; $('#confirm-dialog').close(); action?.(); });
$('#confirm-dialog').addEventListener('close', () => { pendingAction = null; });
$('#goal-minus').addEventListener('click', () => changeGoal(-1));
$('#goal-plus').addEventListener('click', () => changeGoal(1));
function changeGoal(change) {
  const goal = data.settings.weeklyGoal + change;
  if (goal < 1 || goal > 7) return;
  update({ ...data, settings: { ...data.settings, weeklyGoal: goal } });
}
$$('[data-theme-mode]').forEach(button => button.addEventListener('click', () => update({ ...data, settings: { ...data.settings, themeMode: button.dataset.themeMode } })));
$$('[data-color-style]').forEach(button => button.addEventListener('click', () => update({ ...data, settings: { ...data.settings, colorStyle: button.dataset.colorStyle } })));
mediaDark.addEventListener('change', () => { if (data.settings.themeMode === 'auto') applyTheme(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { const now = new Date(); if (displayedMonth > new Date(now.getFullYear(), now.getMonth(), 1, 12)) displayedMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12); renderAll(); } });

$('#export-button').addEventListener('click', () => {
  const backup = { ...data, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(backup, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `academia-backup-${localDateKey()}.json`;
  document.body.append(link);
  link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  showToast('Backup pronto para salvar.');
});
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error('O arquivo é grande demais para um backup de treinos.');
    const source = JSON.parse(await file.text());
    const restored = validateBackup(source);
    const exported = source.exportedAt ? `\nExportado em: ${new Date(source.exportedAt).toLocaleDateString('pt-BR')}` : '';
    confirmAction('Backup encontrado', `${restored.workouts.length} ${restored.workouts.length === 1 ? 'treino' : 'treinos'}\nMeta semanal: ${restored.settings.weeklyGoal}${exported}\n\nIsso substituirá todos os dados atuais.`, 'Restaurar', () => {
      if (update(restored, 'Backup restaurado com sucesso.')) {
        displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
        renderAll();
      }
    });
  } catch (error) { showToast(`Não foi possível importar: ${error.message}`); }
});

renderAll();
