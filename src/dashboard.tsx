import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import { TrackerProvider } from './context/TrackerContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrackerProvider>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </TrackerProvider>
  </StrictMode>
);