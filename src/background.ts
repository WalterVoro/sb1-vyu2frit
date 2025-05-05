// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Gmail Email Tracker installed');
  
  // Initialize storage with default values
  chrome.storage.sync.set({
    trackingEnabled: true
  });
  
  // Clear tracked emails on install/update
  chrome.storage.local.set({
    trackedEmails: [],
    trackedEmailIds: []
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EMAIL_SENT') {
    // Update badge
    chrome.action.setBadgeText({ text: '1' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    
    // Clear badge after 3 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
  }
  return true;
});

// Listen for extension suspension
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension is being suspended');
  
  // Clear any temporary data
  chrome.storage.local.remove(['trackedEmailIds'], () => {
    if (chrome.runtime.lastError) {
      console.error('Error clearing tracked email IDs:', chrome.runtime.lastError);
    }
  });
});

// Clean up tracked email IDs periodically
setInterval(() => {
  chrome.storage.local.get(['trackedEmailIds'], (result) => {
    if (result.trackedEmailIds && result.trackedEmailIds.length > 100) {
      // Keep only the most recent 100 tracked email IDs
      const recentIds = result.trackedEmailIds.slice(-100);
      chrome.storage.local.set({ trackedEmailIds: recentIds });
    }
  });
}, 60 * 60 * 1000); // Run every hour