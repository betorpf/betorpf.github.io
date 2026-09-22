(() => {
  const storageKey = 'theme';
  const saved = (() => { try { return localStorage.getItem(storageKey); } catch { return null; } })();
  const theme = ['light', 'dark'].includes(saved) ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
