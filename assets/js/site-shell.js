(() => {
  const key = 'theme';
  const toggle = document.querySelector('[data-theme-toggle]');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const setTheme = (theme, persist = false) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (themeColor) themeColor.content = theme === 'dark' ? '#151917' : '#F7F6F2';
    if (toggle) { toggle.setAttribute('aria-pressed', String(theme === 'dark')); toggle.title = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'; }
    if (persist) { try { localStorage.setItem(key, theme); } catch { /* storage unavailable */ } }
  };
  setTheme(document.documentElement.dataset.theme || 'light');
  toggle?.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true));
  const menu = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('.site-nav');
  menu?.addEventListener('click', () => { const open = nav?.dataset.open === 'true'; if (nav) nav.dataset.open = String(!open); menu.setAttribute('aria-expanded', String(!open)); });
  nav?.querySelectorAll('a, button').forEach((item) => item.addEventListener('click', () => { if (nav) nav.dataset.open = 'false'; menu?.setAttribute('aria-expanded', 'false'); }));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => { try { if (!localStorage.getItem(key)) setTheme(event.matches ? 'dark' : 'light'); } catch { setTheme(event.matches ? 'dark' : 'light'); } });
})();
