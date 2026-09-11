document.getElementById('ano').textContent = new Date().getFullYear();

const contactDialog = document.getElementById('contato');
let contactOpener = null;

const openContactDialog = (event) => {
  if (contactDialog.open) return;

  contactOpener = event?.currentTarget instanceof HTMLElement
    ? event.currentTarget
    : document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  contactDialog.showModal();
};

document.querySelectorAll('[data-open-contact]').forEach((button) => {
  button.addEventListener('click', openContactDialog);
});

document.querySelector('[data-close-contact]').addEventListener('click', () => {
  contactDialog.close();
});

contactDialog.addEventListener('click', (event) => {
  if (event.target === contactDialog) contactDialog.close();
});

contactDialog.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;

  const focusable = [...contactDialog.querySelectorAll('button, input:not([type="hidden"]):not([tabindex="-1"]), textarea, a[href]')]
    .filter((element) => !element.disabled && element.getClientRects().length > 0);
  const first = focusable[0];
  const last = focusable.at(-1);

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

contactDialog.addEventListener('close', () => {
  if (window.location.hash === '#contato') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  if (contactOpener?.isConnected) contactOpener.focus();
  contactOpener = null;
});

if (window.location.hash === '#contato') openContactDialog();
window.addEventListener('hashchange', () => {
  if (window.location.hash === '#contato') openContactDialog();
});
