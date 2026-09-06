import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './contexts/ThemeContext';
import { initializeStorage } from './lib/storage';
import './index.css';

// Remove overlays órfãos de sessões anteriores (ex.: animações de modal interrompidas)
document.querySelectorAll('body > .neu-modal-root').forEach((el) => el.remove());
document.body.style.overflow = '';

// Migrate localStorage -> IndexedDB on startup
initializeStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
