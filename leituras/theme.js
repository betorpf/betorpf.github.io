(() => {
  const storageKey = 'leituras-theme';
  let savedTheme = null;

  try {
    savedTheme = localStorage.getItem(storageKey);
  } catch (error) {
    console.warn('Não foi possível ler a preferência de tema:', error);
  }

  const theme = ['light', 'dark'].includes(savedTheme)
    ? savedTheme
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
