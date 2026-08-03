import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './command-panel-layout.css';
import './formation-organisation.css';
import './save-load.css';
import './europe-map.css';
import './command-interface.css';
import './map-interface-refinements.css';
import './mobile-map-corrections.css';
import './map-label-hierarchy.css';
import './strategic-network.css';
import './strategic-response.css';
import './desktop-command-fit.css';
import './supply-network.css';
import './persistence-feedback';
import { installMapTrackpadGuard } from './map-trackpad-guard';

installMapTrackpadGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
