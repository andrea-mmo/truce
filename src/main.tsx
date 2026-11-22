import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { applyTheme, loadTheme } from './theme';
import { getLang, setLang, useT } from './i18n';
import './pwa';

applyTheme(loadTheme());
// Sets <html lang> for screen readers and the browser (without saving: the device language is kept until you pick one).
setLang(getLang(), false);

/** Keeps the tab title in the chosen language. Components re-render on their own (useT). */
function Root() {
  const t = useT();
  useEffect(() => { document.title = t.app.title; }, [t]);
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
