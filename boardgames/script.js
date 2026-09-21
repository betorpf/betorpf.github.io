const state = { games: [], filteredGames: [], dialogOpener: null };
const themeStorageKey = 'boardgames-theme';
const themeColors = { light: '#F7F3E8', dark: '#171A1F' };
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

const elements = {
  grid: document.getElementById('game-grid'),
  controls: document.getElementById('controls'),
  search: document.getElementById('search'),
  players: document.getElementById('players-filter'),
  type: document.getElementById('type-filter'),
  category: document.getElementById('category-filter'),
  sort: document.getElementById('sort'),
  collectionCount: document.getElementById('collection-count'),
  resultCount: document.getElementById('result-count'),
  loading: document.getElementById('loading-state'),
  error: document.getElementById('error-state'),
  empty: document.getElementById('empty-state'),
  dialog: document.getElementById('game-dialog'),
  dialogContent: document.getElementById('dialog-content'),
  dialogClose: document.getElementById('dialog-close'),
  themeToggle: document.getElementById('theme-toggle'),
  themeLabel: document.getElementById('theme-label'),
};

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanList(value) {
  return Array.isArray(value) ? value.map(cleanText).filter(Boolean) : [];
}

function normalizeText(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function validHttpUrl(value) {
  try {
    const url = new URL(cleanText(value));
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function localImagePath(value) {
  const path = cleanText(value);
  return path && /^(?:images\/games\/)[a-z0-9][a-z0-9._/-]*$/i.test(path) ? path : null;
}

function parsePlayerRange(value) {
  const numbers = cleanText(value).match(/\d+/g)?.map(Number) || [];
  if (!numbers.length) return null;
  return { min: numbers[0], max: numbers[1] ?? numbers[0] };
}

function parseDuration(value) {
  const match = cleanText(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function gameType(game) {
  return cleanText(game.tipo);
}

function getBadgeLabel(game) {
  if (gameType(game) === 'Expansão') return 'EXPANSÃO';
  if (gameType(game) === 'Jogo + Expansão') return 'JOGO + EXPANSÃO';
  return '';
}

function playerMatches(range, filter) {
  if (!filter) return true;
  const parsed = parsePlayerRange(range);
  if (!parsed) return false;
  if (filter === 'solo') return parsed.min <= 1 && parsed.max >= 1;
  if (filter === 'two') return parsed.min <= 2 && parsed.max >= 2;
  if (filter === 'three-four') return parsed.min <= 4 && parsed.max >= 3;
  return parsed.max >= 5;
}

function createExternalLink(url, label, className = 'game-link') {
  const link = createElement('a', className, `↗ ${label}`);
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function createCover(game) {
  const imagePath = localImagePath(game.imagem);
  if (imagePath) {
    const image = createElement('img', 'game-cover');
    image.src = imagePath;
    image.alt = `Capa do jogo ${game.titulo}`;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      const placeholder = createPlaceholder(game);
      image.replaceWith(placeholder);
    }, { once: true });
    return image;
  }
  return createPlaceholder(game);
}

function createPlaceholder(game) {
  const choices = ['♟', '⚄', '▰', '⬡'];
  const charSum = [...cleanText(game.titulo)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const placeholder = createElement('div', `game-cover placeholder placeholder--${charSum % 4}`);
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.append(createElement('span', 'placeholder-symbol', choices[charSum % choices.length]));
  placeholder.append(createElement('span', 'placeholder-title', cleanText(game.titulo).slice(0, 28)));
  return placeholder;
}

function createGameCard(game) {
  const article = createElement('article', 'game-card');
  const main = createElement('button', 'card-main');
  main.type = 'button';
  main.ariaLabel = `Ver detalhes de ${game.titulo}`;
  main.addEventListener('click', () => openGameDetails(game, main));
  main.append(createCover(game));

  const content = createElement('div', 'card-content');
  const badge = getBadgeLabel(game);
  if (badge) content.append(createElement('span', 'type-badge', badge));
  content.append(createElement('h3', '', game.titulo));

  const facts = createElement('p', 'quick-facts');
  const players = cleanText(game.jogadores);
  const duration = cleanText(game.duracao);
  if (players) facts.append(createElement('span', '', `👥 ${players}`));
  if (duration) facts.append(createElement('span', '', `⏱ ${duration}`));
  if (facts.childElementCount) content.append(facts);

  const categories = cleanList(game.categorias).slice(0, 3);
  if (categories.length) {
    const tags = createElement('div', 'tags');
    categories.forEach((category) => tags.append(createElement('span', 'tag', category)));
    content.append(tags);
  }
  main.append(content);
  article.append(main);

  const links = createElement('div', 'card-links');
  const ludopedia = validHttpUrl(game.ludopedia);
  const bgg = validHttpUrl(game.bgg);
  if (ludopedia) links.append(createExternalLink(ludopedia, 'Ludopedia'));
  if (bgg) links.append(createExternalLink(bgg, 'BGG'));
  if (links.childElementCount) article.append(links);
  return article;
}

function renderGames() {
  const fragment = document.createDocumentFragment();
  state.filteredGames.forEach((game) => fragment.append(createGameCard(game)));
  elements.grid.replaceChildren(fragment);
  elements.empty.hidden = state.filteredGames.length !== 0;
  elements.resultCount.textContent = `${state.filteredGames.length} ${state.filteredGames.length === 1 ? 'jogo' : 'jogos'}`;
}

function sortGames(games, sortKey) {
  const sorted = [...games];
  const compareTitles = (a, b) => collator.compare(a.titulo, b.titulo);
  if (sortKey === 'title-asc' || sortKey === 'title-desc') {
    sorted.sort(compareTitles);
    return sortKey === 'title-desc' ? sorted.reverse() : sorted;
  }
  const valueFor = sortKey.startsWith('year') ? (game) => Number.isFinite(Number(game.ano)) ? Number(game.ano) : null : (game) => parseDuration(game.duracao);
  const direction = sortKey === 'year-desc' ? -1 : 1;
  return sorted.sort((a, b) => {
    const aValue = valueFor(a);
    const bValue = valueFor(b);
    if (aValue === null) return bValue === null ? compareTitles(a, b) : 1;
    if (bValue === null) return -1;
    return (aValue - bValue) * direction || compareTitles(a, b);
  });
}

function filterGames() {
  const query = normalizeText(elements.search.value);
  const selectedType = elements.type.value;
  const selectedCategory = elements.category.value;
  state.filteredGames = sortGames(state.games.filter((game) => {
    const searchable = [game.titulo, game.editora, game.jogoBase, ...cleanList(game.categorias)].join(' ');
    return (!query || normalizeText(searchable).includes(query))
      && playerMatches(game.jogadores, elements.players.value)
      && (!selectedType || gameType(game) === selectedType)
      && (!selectedCategory || cleanList(game.categorias).includes(selectedCategory));
  }), elements.sort.value);
  renderGames();
}

function renderCategoryFilters() {
  const categories = [...new Set(state.games.flatMap((game) => cleanList(game.categorias)))].sort(collator.compare);
  const fragment = document.createDocumentFragment();
  categories.forEach((category) => {
    const option = createElement('option', '', category);
    option.value = category;
    fragment.append(option);
  });
  elements.category.append(fragment);
}

function updateCollectionCounter() {
  const total = state.games.length;
  elements.collectionCount.textContent = `${total} ${total === 1 ? 'item na coleção' : 'itens na coleção'} • Mais do que jogos, são momentos.`;
}

function appendDetail(list, label, value) {
  if (value === null || value === undefined || value === '') return;
  const detail = createElement('div', 'detail');
  detail.append(createElement('dt', '', label), createElement('dd', '', String(value)));
  list.append(detail);
}

function openGameDetails(game, opener) {
  state.dialogOpener = opener;
  const fragment = document.createDocumentFragment();
  const badge = getBadgeLabel(game);
  if (badge) fragment.append(createElement('p', 'dialog-kicker', badge));
  const title = createElement('h2', 'dialog-title', game.titulo);
  title.id = 'dialog-title';
  fragment.append(title);

  const highlights = createElement('p', 'dialog-highlights');
  const players = cleanText(game.jogadores);
  const duration = cleanText(game.duracao);
  const complexity = cleanText(game.complexidade);
  if (players) highlights.append(createElement('span', '', `👥 ${players} jogadores`));
  if (duration) highlights.append(createElement('span', '', `⏱ ${duration}`));
  if (complexity) highlights.append(createElement('span', '', `⚖ ${complexity}`));
  if (highlights.childElementCount) fragment.append(highlights);

  const categories = cleanList(game.categorias);
  if (categories.length) fragment.append(createElement('p', 'dialog-categories', categories.join(' · ')));
  const details = createElement('dl', 'details-list');
  appendDetail(details, 'Ano', game.ano);
  appendDetail(details, 'Editora', cleanText(game.editora));
  appendDetail(details, 'Tipo', gameType(game));
  if (cleanText(game.jogoBase)) appendDetail(details, 'Expansão de', cleanText(game.jogoBase));
  appendDetail(details, 'Observações', cleanText(game.observacoes));
  if (details.childElementCount) fragment.append(details);

  const links = createElement('div', 'dialog-links');
  const ludopedia = validHttpUrl(game.ludopedia);
  const bgg = validHttpUrl(game.bgg);
  if (ludopedia) links.append(createExternalLink(ludopedia, 'Ludopedia', 'dialog-link'));
  if (bgg) links.append(createExternalLink(bgg, 'BoardGameGeek', 'dialog-link'));
  if (links.childElementCount) fragment.append(links);
  elements.dialogContent.replaceChildren(fragment);
  elements.dialog.showModal();
}

function closeGameDetails() {
  if (elements.dialog.open) elements.dialog.close();
}

function getTheme() {
  return document.documentElement.dataset.theme || 'light';
}

function setTheme(theme, persist = false) {
  if (!['light', 'dark'].includes(theme)) return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]').content = themeColors[theme];
  elements.themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  elements.themeLabel.textContent = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
  if (persist) {
    try { localStorage.setItem(themeStorageKey, theme); } catch (error) { console.warn('Não foi possível salvar o tema:', error); }
  }
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark', true);
}

async function loadGames() {
  try {
    const response = await fetch('./boardgames.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const games = Array.isArray(data) ? data : data.boardgames;
    if (!Array.isArray(games)) throw new TypeError('Lista de jogos inválida.');
    state.games = games.filter((game) => game && cleanText(game.titulo)).map((game) => ({ ...game, titulo: cleanText(game.titulo) }));
    updateCollectionCounter();
    renderCategoryFilters();
    filterGames();
    elements.controls.hidden = false;
    elements.loading.hidden = true;
  } catch (error) {
    console.error('Erro ao carregar a coleção:', error);
    elements.loading.hidden = true;
    elements.error.hidden = false;
  }
}

elements.controls.addEventListener('input', filterGames);
elements.controls.addEventListener('change', filterGames);
elements.dialogClose.addEventListener('click', closeGameDetails);
elements.dialog.addEventListener('click', (event) => { if (event.target === elements.dialog) closeGameDetails(); });
elements.dialog.addEventListener('close', () => { state.dialogOpener?.focus(); state.dialogOpener = null; });
elements.themeToggle.addEventListener('click', toggleTheme);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  try { if (!localStorage.getItem(themeStorageKey)) setTheme(event.matches ? 'dark' : 'light'); } catch { setTheme(event.matches ? 'dark' : 'light'); }
});

setTheme(getTheme());
loadGames();
