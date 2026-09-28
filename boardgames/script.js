const state = { games: [], filteredGames: [], dialogOpener: null };
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

const elements = {
  grid: document.getElementById('game-grid'),
  controls: document.getElementById('controls'),
  search: document.getElementById('search'),
  players: document.getElementById('players-filter'),
  type: document.getElementById('type-filter'),
  category: document.getElementById('category-filter'),
  sort: document.getElementById('sort'),
  totalCount: document.getElementById('total-count'),
  gamesCount: document.getElementById('games-count'),
  expansionsCount: document.getElementById('expansions-count'),
  resultCount: document.getElementById('result-count'),
  loading: document.getElementById('loading-state'),
  error: document.getElementById('error-state'),
  errorMessage: document.getElementById('error-message'),
  empty: document.getElementById('empty-state'),
  dialog: document.getElementById('game-dialog'),
  dialogContent: document.getElementById('dialog-content'),
  dialogClose: document.getElementById('dialog-close'),
};

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanList(value) {
  return Array.isArray(value) ? value.map(cleanText).filter(Boolean) : [];
}

function normalizeGame(raw) {
  return {
    titulo: cleanText(raw.titulo ?? raw.title ?? raw['Título']),
    tipo: cleanText(raw.tipo ?? raw.type ?? raw['Tipo']),
    jogoBase: cleanText(raw.jogoBase ?? raw.baseGame ?? raw['Jogo-base']),
    status: cleanText(raw.status ?? raw['Status']),
    jogadores: cleanText(raw.jogadores ?? raw.players ?? raw['Jogadores']),
    duracao: cleanText(raw.duracao ?? raw.duration ?? raw['Duração']),
    complexidade: cleanText(raw.complexidade ?? raw.complexity ?? raw['Complexidade']),
    categorias: cleanList(raw.categorias ?? raw.mechanics ?? raw['Categoria/Mecânicas']),
    editora: cleanText(raw.editora ?? raw.publisher ?? raw['Editora']),
    ano: raw.ano ?? raw.year ?? raw['Ano'] ?? null,
    idioma: cleanText(raw.idioma ?? raw.language ?? raw['Idioma']),
    breveDescricao: cleanText(raw.breveDescricao ?? raw.shortDescription ?? raw['Breve descrição']),
    svg: cleanText(raw.svg ?? raw['SVG']),
    ludopedia: cleanText(raw.ludopedia ?? raw['Ludopedia']),
    bgg: cleanText(raw.bgg ?? raw['BGG']),
    observacoes: cleanText(raw.observacoes ?? raw.notes ?? raw['Observações']),
  };
}

// Rebuild decorative SVGs using only shapes and drawing attributes. Scripts,
// events, styles, links, foreignObject and external resources never enter the DOM.
function sanitizeSvg(value) {
  const source = cleanText(value);
  if (!source || source.length > 20000 || /<!DOCTYPE|<!ENTITY/i.test(source)) return null;
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = parsed.documentElement;
  const namespace = 'http://www.w3.org/2000/svg';
  if (parsed.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== namespace) return null;
  const tags = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
  const attributes = new Set(['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform', 'd', 'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height']);
  function copyShape(node) {
    if (node.namespaceURI !== namespace || !tags.has(node.localName)) return null;
    const shape = document.createElementNS(namespace, node.localName);
    for (const attribute of node.attributes) {
      if (attribute.namespaceURI || !attributes.has(attribute.name)) continue;
      if (/url\s*\(|javascript:|data:|https?:|[<>]/i.test(attribute.value)) continue;
      if (['fill', 'stroke'].includes(attribute.name) && !/^(none|currentColor)$/i.test(attribute.value)) continue;
      shape.setAttribute(attribute.name, attribute.value);
    }
    for (const child of node.children) {
      const safeChild = copyShape(child);
      if (safeChild) shape.append(safeChild);
    }
    return shape;
  }
  const svg = copyShape(root);
  if (!svg.querySelector('path, circle, ellipse, rect, line, polyline, polygon')) return null;
  if (!svg.hasAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 64 64');
  if (!svg.hasAttribute('fill')) svg.setAttribute('fill', 'none');
  if (!svg.hasAttribute('stroke')) svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

function createGameVisual(game, className) {
  const visual = createElement('span', className);
  visual.setAttribute('aria-hidden', 'true');
  const svg = sanitizeSvg(game.svg);
  if (svg) visual.append(svg);
  else {
    visual.textContent = '🎲';
    visual.classList.add('game-visual--fallback');
  }
  return visual;
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

function createGameCard(game) {
  const article = createElement('article', 'collection-card game-card');
  const main = createElement('button', 'card-main');
  main.type = 'button';
  main.ariaLabel = `Ver detalhes de ${game.titulo}`;
  main.addEventListener('click', () => openGameDetails(game, main));
  const content = createElement('div', 'card-content');
  const badge = getBadgeLabel(game);
  if (badge) content.append(createElement('span', 'type-badge', badge));
  content.append(createElement('h3', '', game.titulo));
  if (game.breveDescricao) content.append(createElement('p', 'game-card__description', game.breveDescricao));
  if (game.jogoBase) content.append(createElement('span', 'game-card__base-game', `Expansão de ${game.jogoBase}`));

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
  content.append(createElement('span', 'game-card__details', 'Mais detalhes →'));
  main.append(createGameVisual(game, 'game-card__visual'), content);
  article.append(main);

  const links = createElement('div', 'card-links');
  const ludopedia = validHttpUrl(game.ludopedia);
  const bgg = validHttpUrl(game.bgg);
  if (ludopedia) links.append(createExternalLink(ludopedia, 'Ludopedia'));
  else if (bgg) links.append(createExternalLink(bgg, 'BGG'));
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
  const valueFor = sortKey.startsWith('year') ? (game) => Number.isFinite(Number(game.ano)) && Number(game.ano) > 0 ? Number(game.ano) : null : (game) => parseDuration(game.duracao);
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
    const searchable = [game.titulo, game.breveDescricao, game.editora, game.tipo, game.jogoBase, ...cleanList(game.categorias)].join(' ');
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
  elements.totalCount.textContent = state.games.length;
  elements.gamesCount.textContent = state.games.filter((game) => gameType(game) === 'Jogo').length;
  elements.expansionsCount.textContent = state.games.filter((game) => gameType(game) !== 'Jogo').length;
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
  const header = createElement('div', 'game-modal__header');
  const heading = createElement('div', 'game-modal__heading');
  const badge = getBadgeLabel(game);
  if (badge) heading.append(createElement('p', 'dialog-kicker', badge));
  const title = createElement('h2', 'dialog-title', game.titulo);
  title.id = 'dialog-title';
  heading.append(title);
  header.append(createGameVisual(game, 'game-modal__visual'), heading);
  fragment.append(header);
  if (game.breveDescricao) fragment.append(createElement('p', 'game-modal__description', game.breveDescricao));

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
  appendDetail(details, 'Status', game.status);
  appendDetail(details, 'Idioma', game.idioma);
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

async function loadGames() {
  try {
    const response = await fetch('./boardgames.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const games = Array.isArray(data) ? data : (data.boardgames ?? data.games ?? data.itens);
    if (!Array.isArray(games)) throw new TypeError('Lista de jogos inválida.');
    state.games = games.filter((game) => game && typeof game === 'object').map(normalizeGame).filter((game) => game.titulo);
    updateCollectionCounter();
    renderCategoryFilters();
    filterGames();
    elements.controls.hidden = false;
    elements.loading.hidden = true;
  } catch (error) {
    console.error('Erro ao carregar a coleção:', error);
    elements.loading.hidden = true;
    elements.error.hidden = false;
    elements.empty.hidden = true;
    elements.grid.replaceChildren();
    if (window.location.protocol === 'file:') {
      elements.errorMessage.textContent = 'Abra esta página por um servidor local ou pelo GitHub Pages; navegadores não permitem carregar o JSON diretamente de um arquivo local.';
    }
  }
}

elements.controls.addEventListener('input', filterGames);
elements.controls.addEventListener('change', (event) => {
  if (event.target !== elements.search) filterGames();
});
elements.dialogClose.addEventListener('click', closeGameDetails);
elements.dialog.addEventListener('click', (event) => { if (event.target === elements.dialog) closeGameDetails(); });
elements.dialog.addEventListener('close', () => { state.dialogOpener?.focus(); state.dialogOpener = null; });
loadGames();
