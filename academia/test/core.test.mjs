import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLOR_STYLES, defaultData, localDateKey, validDateKey, dateFromKey, weekStart,
  validateBackup, toggleWorkout, workoutDates, countWeek, countMonth,
  countYear, lastWeeks, consistency, saveData, loadData, STORAGE_KEY
} from '../js/core.mjs';

const at = key => dateFromKey(key);
const withDates = (...dates) => ({ ...defaultData(), workouts: dates.map(date => ({ date })) });

test('datas locais, ano bissexto e semanas que cruzam o ano', () => {
  assert.equal(localDateKey(at('2024-02-29')), '2024-02-29');
  assert.equal(validDateKey('2024-02-29'), true);
  assert.equal(validDateKey('2025-02-29'), false);
  assert.equal(localDateKey(weekStart(at('2027-01-01'))), '2026-12-27');
  assert.equal(localDateKey(weekStart(at('2027-01-03'))), '2027-01-03');
  assert.equal(localDateKey(weekStart(at('2027-01-04'))), '2027-01-03');
});

test('registro único por dia, sem datas futuras', () => {
  const today = at('2026-09-22');
  const added = toggleWorkout(defaultData(), '2026-09-22', today);
  assert.deepEqual(added.workouts, [{ date: '2026-09-22' }]);
  assert.deepEqual(toggleWorkout(added, '2026-09-22', today).workouts, []);
  assert.throws(() => toggleWorkout(added, '2026-09-23', today));
});

test('lançamento retroativo atualiza todas as contagens sem duplicar treinos', () => {
  const today = at('2026-09-22');
  const original = withDates('2026-09-20');
  const updated = toggleWorkout(original, '2026-09-21', today);
  const dates = workoutDates(updated);
  assert.equal(original.workouts.length, 1);
  assert.equal(countWeek(dates, today), 2);
  assert.equal(countMonth(dates, 2026, 8), 2);
  assert.equal(countYear(dates, 2026), 2);
  assert.deepEqual(consistency(dates, 2, today), { current: 1, best: 1 });
  assert.deepEqual(lastWeeks(dates, 2, today, 1), [{ start: '2026-09-20', count: 2, reached: true }]);
  assert.deepEqual(toggleWorkout(updated, '2026-09-21', today).workouts, original.workouts);
});

test('contagens semanais, mensais e anuais atravessam períodos corretamente', () => {
  const dates = workoutDates(withDates('2026-12-28', '2026-12-31', '2027-01-01', '2027-01-03'));
  assert.equal(countWeek(dates, at('2027-01-01')), 3);
  assert.equal(countWeek(dates, at('2027-01-03')), 1);
  assert.equal(countMonth(dates, 2026, 11), 2);
  assert.equal(countYear(dates, 2027), 2);
});

test('sequência atual ignora semana em curso incompleta e melhor sequência inclui metas atingidas', () => {
  const dates = workoutDates(withDates('2026-08-31', '2026-09-01', '2026-09-07', '2026-09-08', '2026-09-14'));
  assert.deepEqual(consistency(dates, 2, at('2026-09-16')), { current: 2, best: 2 });
  assert.deepEqual(consistency(dates, 2, at('2026-09-23')), { current: 0, best: 2 });
  dates.add('2026-09-15');
  assert.deepEqual(consistency(dates, 2, at('2026-09-16')), { current: 3, best: 3 });
  const weeks = lastWeeks(dates, 2, at('2026-09-16'));
  assert.equal(weeks.length, 12);
  assert.deepEqual(weeks.at(-1), { start: '2026-09-13', count: 2, reached: true });
  const withGap = workoutDates(withDates('2026-08-31', '2026-09-01', '2026-09-14', '2026-09-15'));
  assert.deepEqual(consistency(withGap, 2, at('2026-09-23')), { current: 1, best: 1 });
});

test('backup inválido não altera dados persistidos', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const original = withDates('2026-09-20');
  saveData(original, storage);
  const invalid = { ...original, workouts: [{ date: '2026-09-20' }, { date: '2026-09-20' }] };
  assert.throws(() => validateBackup(invalid, at('2026-09-22')), /duplicadas/);
  assert.equal(memory.get(STORAGE_KEY), JSON.stringify(original));
  assert.deepEqual(loadData(storage, at('2026-09-22')), original);
  assert.throws(() => validateBackup({ ...original, version: 2 }, at('2026-09-22')));
  assert.throws(() => validateBackup({ ...original, workouts: [{ date: '2026-02-30' }] }, at('2026-09-22')));
  assert.throws(() => validateBackup({ ...original, workouts: [{ date: '2026-09-23' }] }, at('2026-09-22')));
});

test('as oito paletas são válidas no backup sem alterar treinos', () => {
  assert.equal(COLOR_STYLES.length, 8);
  for (const colorStyle of COLOR_STYLES) {
    const source = withDates('2026-09-20');
    source.settings.colorStyle = colorStyle;
    const restored = validateBackup(source, at('2026-09-22'));
    assert.equal(restored.settings.colorStyle, colorStyle);
    assert.deepEqual(restored.workouts, [{ date: '2026-09-20' }]);
  }
  const invalid = withDates('2026-09-20');
  invalid.settings.colorStyle = 'unknown';
  assert.throws(() => validateBackup(invalid, at('2026-09-22')));
});
