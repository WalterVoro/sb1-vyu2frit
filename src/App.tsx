import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import Popup from './components/Popup/Popup';
import NotFound from './components/NotFound';
import { TrackerProvider } from './context/TrackerContext';
import './index.css';

function App() {
  // Determine if this is running as a popup or as the dashboard
  const isPopup = window.location.pathname.includes('popup.html');

  return (
    <TrackerProvider>
      <Router>
        <div className="app-container">
          <Routes>
            {isPopup ? (
              <Route path="*" element={<Popup />} />
            ) : (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="*" element={<NotFound />} />
              </>
            )}
          </Routes>
        </div>
      </Router>
    </TrackerProvider>
  );
}

export default App;