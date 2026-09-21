const state = {
  books: [],
  filteredBooks: [],
  activeDialogBook: null,
  dialogOpener: null,
};

const elements = {
  grid: document.getElementById('book-grid'),
  controls: document.getElementById('controls'),
  search: document.getElementById('search'),
  status: document.getElementById('status-filter'),
  country: document.getElementById('country-filter'),
  type: document.getElementById('type-filter'),
  sort: document.getElementById('sort'),
  loading: document.getElementById('loading-state'),
  error: document.getElementById('error-state'),
  empty: document.getElementById('empty-state'),
  resultCount: document.getElementById('result-count'),
  dialog: document.getElementById('book-dialog'),
  dialogContent: document.getElementById('dialog-content'),
  dialogClose: document.getElementById('dialog-close'),
};

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanList(value) {
  return Array.isArray(value) ? value.map(cleanText).filter(Boolean) : [];
}

function getBookType(book) {
  return cleanText(book.tipo) || cleanText(book.formato);
}

function getBookYear(book) {
  const value = book.ano ?? book.anoDaLeitura;
  const year = Number(value);
  return Number.isFinite(year) && year > 0 ? year : null;
}

function getBookDescription(book) {
  return cleanText(book.descricao) || cleanText(book.porQueQueroLer) || cleanText(book.observacoes);
}

function validHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createBlogIconLink(url, className = 'blog-link') {
  const link = createElement('a', className);
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.ariaLabel = 'Ler no blog';
  link.title = 'Ler no blog';
  link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4M9 11h6M9 15h6"/></svg>';
  link.addEventListener('click', (event) => event.stopPropagation());
  return link;
}

function appendPill(container, text, status = false) {
  if (!text) return;
  container.append(createElement('span', status ? 'pill pill--status' : 'pill', text));
}

function coverColors(title) {
  const palettes = [
    ['#53613f', '#242d20'],
    ['#7a4d35', '#29211b'],
    ['#3c5956', '#1c2927'],
    ['#665b39', '#27251b'],
    ['#554359', '#251f27'],
  ];
  const index = [...title].reduce((sum, char) => sum + char.codePointAt(0), 0) % palettes.length;
  return palettes[index];
}

function createCover(book) {
  const cover = createElement('div', 'cover');
  const [colorA, colorB] = coverColors(book.titulo);
  cover.style.setProperty('--cover-a', colorA);
  cover.style.setProperty('--cover-b', colorB);
  const coverUrl = validHttpUrl(book.capa);

  if (coverUrl) {
    const image = document.createElement('img');
    image.src = coverUrl;
    image.alt = `Capa de ${book.titulo}`;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      image.remove();
      appendPlaceholder(cover, book.titulo);
    }, { once: true });
    cover.append(image);
  } else {
    appendPlaceholder(cover, book.titulo);
  }
  return cover;
}

function appendPlaceholder(cover, title) {
  if (cover.querySelector('.cover-initial')) return;
  const firstCharacter = [...title.trim()][0] || '?';
  cover.append(
    createElement('span', 'cover-initial', firstCharacter.toLocaleUpperCase('pt-BR')),
    createElement('span', 'cover-title', title),
  );
}

function createBookCard(book) {
  const article = createElement('article', 'book-card');
  const main = createElement('button', 'card-main');
  main.type = 'button';
  main.ariaLabel = `Ver detalhes de ${book.titulo}`;
  main.addEventListener('click', () => openBookDetails(book, main));
  main.append(createCover(book));

  const body = createElement('div', 'card-body');
  body.append(createElement('h3', '', book.titulo));
  const authors = cleanList(book.autores);
  if (authors.length) body.append(createElement('p', 'authors', authors.join(' & ')));

  const facts = createElement('div', 'facts');
  appendPill(facts, cleanText(book.status), true);
  appendPill(facts, cleanText(book.pais));
  appendPill(facts, getBookYear(book));
  appendPill(facts, getBookType(book));
  if (facts.childElementCount) body.append(facts);

  const themes = cleanList(book.temas).slice(0, 3);
  if (themes.length) {
    const tags = createElement('div', 'tags');
    themes.forEach((theme) => tags.append(createElement('span', 'tag', theme)));
    body.append(tags);
  }
  main.append(body);
  article.append(main);

  const blogUrl = validHttpUrl(book.linkBlog);
  if (blogUrl) article.append(createBlogIconLink(blogUrl));
  return article;
}

function renderBooks() {
  const fragment = document.createDocumentFragment();
  state.filteredBooks.forEach((book) => fragment.append(createBookCard(book)));
  elements.grid.replaceChildren(fragment);
  elements.empty.hidden = state.filteredBooks.length !== 0;
  elements.resultCount.textContent = `${state.filteredBooks.length} ${state.filteredBooks.length === 1 ? 'obra' : 'obras'}`;
}

function sortBooks(books, sortKey) {
  const sorted = [...books];
  if (sortKey.startsWith('title')) {
    sorted.sort((a, b) => collator.compare(a.titulo, b.titulo));
    if (sortKey === 'title-desc') sorted.reverse();
    return sorted;
  }

  const direction = sortKey === 'year-asc' ? 1 : -1;
  return sorted.sort((a, b) => {
    const yearA = getBookYear(a);
    const yearB = getBookYear(b);
    if (yearA === null) return yearB === null ? collator.compare(a.titulo, b.titulo) : 1;
    if (yearB === null) return -1;
    return (yearA - yearB) * direction || collator.compare(a.titulo, b.titulo);
  });
}

function filterBooks() {
  const query = normalizeText(elements.search.value.trim());
  const status = elements.status.value;
  const country = elements.country.value;
  const type = elements.type.value;

  const filtered = state.books.filter((book) => {
    const searchable = [
      book.titulo,
      ...cleanList(book.autores),
      ...cleanList(book.temas),
      book.pais,
      book.editora,
      getBookType(book),
    ].join(' ');
    return (!query || normalizeText(searchable).includes(query))
      && (!status || cleanText(book.status) === status)
      && (!country || cleanText(book.pais) === country)
      && (!type || getBookType(book) === type);
  });

  state.filteredBooks = sortBooks(filtered, elements.sort.value);
  renderBooks();
}

function renderFilter(select, values) {
  const fragment = document.createDocumentFragment();
  [...new Set(values.filter(Boolean))]
    .sort(collator.compare)
    .forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      fragment.append(option);
    });
  select.append(fragment);
}

function renderFilters() {
  renderFilter(elements.status, state.books.map((book) => cleanText(book.status)));
  renderFilter(elements.country, state.books.map((book) => cleanText(book.pais)));
  renderFilter(elements.type, state.books.map(getBookType));
}

function formatUpdateDate(value) {
  const parts = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(cleanText(value));
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : cleanText(value);
}

function renderSummary(metadata = {}) {
  const isRead = (status) => ['lido', 'ja li', 'concluido'].includes(normalizeText(status));
  const isWishlist = (status) => ['backlog', 'quero ler', 'lista de desejos'].includes(normalizeText(status));
  const readCount = state.books.filter((book) => isRead(book.status)).length;
  document.getElementById('total-count').textContent = state.books.length;
  document.getElementById('read-count').textContent = readCount;
  document.getElementById('wishlist-count').textContent = state.books.filter((book) => isWishlist(book.status)).length;

  const updated = formatUpdateDate(metadata.ultimaAtualizacao);
  if (updated) {
    const element = document.getElementById('updated-at');
    element.textContent = `Atualizado em ${updated}`;
    element.hidden = false;
  }
}

function appendDetail(list, label, value) {
  if (!value && value !== 0) return;
  const wrapper = createElement('div', 'detail');
  wrapper.append(createElement('dt', '', label), createElement('dd', '', String(value)));
  list.append(wrapper);
}

function openBookDetails(book, opener) {
  state.activeDialogBook = book;
  state.dialogOpener = opener;
  const content = document.createDocumentFragment();
  content.append(createElement('p', 'dialog-kicker', getBookType(book) || 'Leitura'));
  const title = createElement('h2', 'dialog-title', book.titulo);
  title.id = 'dialog-title';
  content.append(title);

  const authors = cleanList(book.autores);
  if (authors.length) content.append(createElement('p', 'dialog-authors', authors.join(' & ')));
  const description = getBookDescription(book);
  if (description) content.append(createElement('p', 'dialog-description', description));

  const details = document.createElement('dl');
  details.className = 'details-list';
  appendDetail(details, 'Status', cleanText(book.status));
  appendDetail(details, 'Ano', getBookYear(book));
  appendDetail(details, 'País', cleanText(book.pais));
  appendDetail(details, 'Tipo', cleanText(book.tipo));
  appendDetail(details, 'Editora', cleanText(book.editora));
  appendDetail(details, 'Formato', cleanText(book.formato));
  appendDetail(details, 'Volumes', cleanText(book.volumes));
  appendDetail(details, 'Temas', cleanList(book.temas).join(' · '));
  if (details.childElementCount) content.append(details);

  const blogUrl = validHttpUrl(book.linkBlog);
  if (blogUrl) {
    const link = createElement('a', 'dialog-blog', 'Ler publicação no blog ↗');
    link.href = blogUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    content.append(link);
  }

  elements.dialogContent.replaceChildren(content);
  elements.dialog.showModal();
}

function closeBookDetails() {
  elements.dialog.close();
}

async function loadData() {
  try {
    const response = await fetch('./data/leituras.json');
    if (!response.ok) throw new Error(`HTTP ${response.status} ao carregar leituras.json`);
    const data = await response.json();
    if (!Array.isArray(data.leituras)) throw new TypeError('O JSON não contém uma lista "leituras" válida.');

    state.books = data.leituras
      .filter((book) => book && cleanText(book.titulo))
      .map((book) => ({ ...book, titulo: cleanText(book.titulo) }));
    renderSummary(data.metadata);
    renderFilters();
    filterBooks();
    elements.controls.hidden = false;
    elements.loading.hidden = true;
  } catch (error) {
    console.error('Erro ao carregar a biblioteca:', error);
    elements.loading.hidden = true;
    elements.error.hidden = false;
    elements.controls.hidden = true;
  }
}

elements.controls.addEventListener('input', filterBooks);
elements.controls.addEventListener('change', filterBooks);
elements.dialogClose.addEventListener('click', closeBookDetails);
elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) closeBookDetails();
});
elements.dialog.addEventListener('close', () => {
  state.dialogOpener?.focus();
  state.dialogOpener = null;
  state.activeDialogBook = null;
});

loadData();
