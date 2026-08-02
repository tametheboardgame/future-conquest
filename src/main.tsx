import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './command-panel-layout.css';
import './formation-organisation.css';
import './save-load.css';
import './europe-map.css';
import './persistence-feedback';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
