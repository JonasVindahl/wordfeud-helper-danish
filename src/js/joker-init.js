import { initLanguageSwitcher } from '/src/js/i18n.js';

const init = () => {
  initLanguageSwitcher();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
