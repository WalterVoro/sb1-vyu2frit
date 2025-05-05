import React, { useState, useEffect } from 'react';
import { useTracker } from '../../context/TrackerContext';
import { Eye, Link, FileText, Bell, Settings, BarChart2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './Popup.css';

const Popup: React.FC = () => {
  const { trackingData, isLoading, refreshData, isTrackingEnabled, toggleTracking } = useTracker();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  useEffect(() => {
    // Refresh data when popup opens
    void refreshData();

    // Set up polling for updates
    const pollInterval = setInterval(() => {
      void refreshData();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [refreshData]);

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };

  if (isLoading) {
    return (
      <div className="popup-container">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const today = new Date();
  const todayOpens = trackingData.emails.reduce((count, email) => {
    return count + email.opens.filter(open => 
      new Date(open.timestamp).toDateString() === today.toDateString()
    ).length;
  }, 0);

  const todayClicks = trackingData.emails.reduce((count, email) => {
    return count + email.linkClicks.filter(click => 
      new Date(click.timestamp).toDateString() === today.toDateString()
    ).length;
  }, 0);
  
  const renderOverview = () => (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-gray-800">Email Tracker</h1>
        <div className="flex items-center">
          <div className="mr-2 text-sm text-gray-600">Tracking</div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={isTrackingEnabled} 
              onChange={(e) => toggleTracking(e.target.checked)}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center mb-1">
            <Eye className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-sm text-gray-600">Opens</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-semibold text-gray-800">{trackingData.totalOpens}</span>
            <span className="text-xs text-gray-500">Today: {todayOpens}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center mb-1">
            <Link className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-gray-600">Clicks</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-semibold text-gray-800">{trackingData.totalLinkClicks}</span>
            <span className="text-xs text-gray-500">Today: {todayClicks}</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h2>
        {trackingData.emails.slice(0, 3).map(email => (
          <div key={email.id} className="bg-white rounded-lg p-3 mb-2 shadow-sm border border-gray-100">
            <div className="text-sm font-medium text-gray-800 truncate">{email.subject}</div>
            <div className="text-xs text-gray-500 mb-1">{email.recipient}</div>
            <div className="flex items-center justify-between text-xs">
              <span className={`flex items-center ${
                email.status === 'opened' ? 'text-green-500' :
                email.status === 'clicked' ? 'text-blue-500' :
                'text-gray-400'
              }`}>
                <Eye className="h-3 w-3 mr-1" />
                {email.opens.length > 0 
                  ? `Opened ${formatDistanceToNow(new Date(email.opens[0].timestamp), { addSuffix: true })}` 
                  : 'Not opened'}
              </span>
              {email.linkClicks.length > 0 && (
                <span className="text-blue-500 flex items-center">
                  <Link className="h-3 w-3 mr-1" />
                  {email.linkClicks.length} clicks
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={openDashboard}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Open Dashboard
      </button>
    </div>
  );

  const renderSettings = () => (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Settings</h1>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Eye className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm text-gray-700">Track email opens</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm text-gray-700">Track link clicks</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm text-gray-700">Track attachments</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm text-gray-700">Show notifications</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="popup-container">
      <div className="flex flex-col h-full">
        <div className="flex-1">
          {activeTab === 'overview' ? renderOverview() : renderSettings()}
        </div>
        
        <div className="border-t border-gray-200">
          <div className="flex justify-around">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-3 flex flex-col items-center ${activeTab === 'overview' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BarChart2 className="h-5 w-5 mb-1" />
              <span className="text-xs">Overview</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 flex flex-col items-center ${activeTab === 'settings' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Settings className="h-5 w-5 mb-1" />
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Popup;