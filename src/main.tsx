import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StartupExperience } from './components/StartupExperience';
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
import './enemy-strategy.css';
import './operational-clarity.css';
import './desktop-command-fit.css';
import './supply-network.css';
import './persistence-feedback';
import './engineering.css';
import './interdiction.css';
import './infrastructure-command.css';
import './logistics-priorities.css';
import './defence.css';
import './combat-reports.css';
import './map-readability.css';
import './r2-tactical-map.css';
import './r3-strategic-map.css';
import './r3-map-hierarchy.css';
import './responsive-command-fit.css';
import { installMapTrackpadGuard } from './map-trackpad-guard';

installMapTrackpadGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartupExperience>
      <App />
    </StartupExperience>
  </StrictMode>
);
