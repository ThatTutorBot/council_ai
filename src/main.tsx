import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { clearOnboardingSessionUiCache } from './storage/onboardingPersistence';

/** Fresh welcome flow on every full page load (see `isOnboardingCompleteForSession`). */
clearOnboardingSessionUiCache();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
