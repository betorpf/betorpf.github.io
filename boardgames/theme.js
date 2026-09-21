(() => {
  const key = 'boardgames-theme';
  let theme;
  try { theme = localStorage.getItem(key); } catch { /* storage may be unavailable */ }
  if (!['light', 'dark'].includes(theme)) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
