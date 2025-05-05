// Gmail integration constants
const COMPOSE_BUTTON_SELECTOR = '.T-I.T-I-KE.L3';
const EMAIL_CONTENT_SELECTOR = '.Am.Al.editable, .Am.Al';
const SEND_BUTTON_SELECTOR = '.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3, .gU.Up';
const SUBJECT_SELECTOR = 'input[name="subjectbox"]';
const RECIPIENT_SELECTOR = 'div[role="presentation"] span[email], div[data-tooltip^="To"] span[email], textarea[name="to"], input[name="to"]';

let isTrackingEnabled = true;
let processingEmail = false;
const processedWindows = new WeakSet<Element>();

// Check if extension context is valid
const isExtensionValid = () => {
  try {
    return !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
};

// Load tracking preferences
chrome.storage.sync.get(['trackingEnabled'], (result) => {
  isTrackingEnabled = result.trackingEnabled !== false;
});

// Listen for tracking preference changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.trackingEnabled) {
    isTrackingEnabled = changes.trackingEnabled.newValue;
  }
});

// Generate a unique ID for each email
const generateEmailId = (subject: string, recipient: string): string => {
  const hash = btoa(`${subject}:${recipient}`).replace(/[^a-zA-Z0-9]/g, '');
  return `email_${hash}`;
};

// Function to get email subject
const getEmailSubject = (composeWindow: Element): string => {
  const subjectInput = composeWindow.querySelector(SUBJECT_SELECTOR) as HTMLInputElement;
  return subjectInput?.value || 'No Subject';
};

// Function to get email recipient
const getEmailRecipient = (composeWindow: Element): string => {
  const selectors = [
    'textarea[name="to"]',
    'input[name="to"]',
    'div[role="presentation"] span[email]',
    'div[data-tooltip^="To"] span[email]'
  ];

  for (const selector of selectors) {
    const element = composeWindow.querySelector(selector);
    if (!element) continue;

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      const value = element.value.trim();
      if (value) return value.split(',')[0].trim();
    } else {
      const email = element.getAttribute('email');
      if (email) return email;
    }
  }

  const toField = composeWindow.querySelector('div[aria-label="To"]');
  if (toField && toField.textContent) {
    const email = toField.textContent.trim();
    if (email) return email.split(',')[0].trim();
  }

  return 'Unknown';
};

// Function to check if email exists in Supabase
const checkEmailExists = async (emailId: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://zrmxcyydqobgyakihgzq.supabase.co/rest/v1/emails?id=eq.${emailId}&select=id`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) return false;
    const data = await response.json();
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false;
  }
};

// Function to inject tracking pixel
const injectTrackingPixel = async (emailContent: Element, emailId: string): Promise<boolean> => {
  const baseUrl = 'https://zrmxcyydqobgyakihgzq.supabase.co/functions/v1/track-pixel';
  const trackingUrl = `${baseUrl}/${emailId}`;

  const existingPixels = emailContent.querySelectorAll(`img[data-email-id="${emailId}"]`);
  if (existingPixels.length > 0) {
    console.log('Tracking pixel already exists for:', emailId);
    return true;
  }

  try {
    if (!isExtensionValid()) throw new Error('Extension context invalidated');

    const trackingPixel = document.createElement('img');
    trackingPixel.src = trackingUrl;
    trackingPixel.style.cssText = 'width:1px;height:1px;position:fixed;bottom:0;right:0;opacity:0.1;pointer-events:none;';
    trackingPixel.setAttribute('data-email-id', emailId);
    emailContent.appendChild(trackingPixel);

    const backupPixel = document.createElement('img');
    backupPixel.src = trackingUrl;
    backupPixel.style.cssText = 'width:1px;height:1px;display:inline;opacity:0.1;pointer-events:none;';
    backupPixel.setAttribute('data-email-id', emailId);

    const textNodes = Array.from(emailContent.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    if (textNodes.length > 0) {
      const randomNode = textNodes[Math.floor(Math.random() * textNodes.length)];
      randomNode.parentNode?.insertBefore(backupPixel, randomNode);
    } else {
      emailContent.appendChild(backupPixel);
    }

    return true;
  } catch (error) {
    console.error('Error injecting tracking pixel:', error);
    return false;
  }
};

// Function to wrap links with tracking
const wrapLinksWithTracking = async (emailContent: Element, emailId: string) => {
  const baseUrl = 'https://zrmxcyydqobgyakihgzq.supabase.co/functions/v1/track-link';
  const links = emailContent.querySelectorAll('a:not([data-tracked])');

  for (const link of links) {
    try {
      if (!isExtensionValid()) throw new Error('Extension context invalidated');

      const originalHref = link.href;
      if (originalHref && !originalHref.includes('track-link')) {
        const trackingUrl = new URL(baseUrl);
        trackingUrl.searchParams.set('url', originalHref);
        trackingUrl.searchParams.set('emailId', emailId);
        link.href = trackingUrl.toString();
        link.setAttribute('data-original-href', originalHref);
        link.setAttribute('data-tracked', 'true');
      }
    } catch (error) {
      console.error('Error wrapping link:', error);
    }
  }
};

// Function to store email in Supabase
const storeEmailInSupabase = async (emailData: any): Promise<boolean> => {
  try {
    if (!isExtensionValid()) throw new Error('Extension context invalidated');

    // Check if email already exists
    const emailExists = await checkEmailExists(emailData.id);
    if (emailExists) {
      console.log('Email already exists:', emailData.id);
      return true;
    }

    const response = await fetch('https://zrmxcyydqobgyakihgzq.supabase.co/rest/v1/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) throw new Error(`Failed to store email: ${response.statusText}`);
    return true;
  } catch (error) {
    console.error('Error storing email:', error);
    return false;
  }
};

// Debounce function with type safety
const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Function to handle email sending
const handleEmailSend = async (
  composeWindow: Element,
  emailContent: Element,
  emailId: string
) => {
  if (!isExtensionValid() || processingEmail) {
    console.log('Skipping email tracking: Invalid context or already processing');
    return;
  }

  if (processedWindows.has(composeWindow)) {
    console.log('Email already processed for this window');
    return;
  }

  processingEmail = true;

  try {
    const subject = getEmailSubject(composeWindow);
    const recipient = getEmailRecipient(composeWindow);

    if (recipient === 'Unknown') {
      console.warn('Could not detect recipient, skipping tracking');
      processingEmail = false;
      return;
    }

    const emailData = {
      id: emailId,
      subject,
      recipient,
      sent_at: new Date().toISOString(),
      status: 'sent'
    };

    const stored = await storeEmailInSupabase(emailData);
    if (!stored) {
      console.error('Failed to store email in Supabase');
      processingEmail = false;
      return;
    }

    const pixelInjected = await injectTrackingPixel(emailContent, emailId);
    if (!pixelInjected) {
      console.error('Failed to inject tracking pixel');
      processingEmail = false;
      return;
    }

    await wrapLinksWithTracking(emailContent, emailId);
    processedWindows.add(composeWindow);

    chrome.runtime.sendMessage({
      type: 'EMAIL_SENT',
      emailData
    });

  } catch (error) {
    console.error('Error tracking email:', error);
  } finally {
    processingEmail = false;
  }
};

const debouncedHandleEmailSend = debounce(handleEmailSend, 500);

// Observer to watch for Gmail compose window
const observeGmail = () => {
  if (!isExtensionValid()) {
    console.warn('Extension context invalid, skipping observer initialization');
    return;
  }

  const observer = new MutationObserver(() => {
    try {
      // Look for compose windows
      const composeWindows = document.querySelectorAll('[role="dialog"], .M9');
      composeWindows.forEach((composeWindow) => {
        if (!(composeWindow instanceof HTMLElement)) return;

        // Check if emailId already exists
        let emailId = composeWindow.dataset.emailId;
        if (!emailId) {
          const subject = getEmailSubject(composeWindow);
          const recipient = getEmailRecipient(composeWindow);
          emailId = generateEmailId(subject, recipient);
          composeWindow.dataset.emailId = emailId;
        }

        const emailContent = composeWindow.querySelector(EMAIL_CONTENT_SELECTOR);
        const sendButton = composeWindow.querySelector(SEND_BUTTON_SELECTOR);

        if (emailContent && sendButton && isTrackingEnabled && !sendButton.dataset.listenersAdded) {
          // Remove any existing click listeners
          const newSendButton = sendButton.cloneNode(true);
          sendButton.parentNode?.replaceChild(newSendButton, sendButton);

          // Add click listener to send button
          newSendButton.addEventListener('click', () => {
            void debouncedHandleEmailSend(composeWindow, emailContent, emailId!);
          });

          // Handle keyboard shortcuts
          composeWindow.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              void debouncedHandleEmailSend(composeWindow, emailContent, emailId!);
            }
          });

          // Mark listeners as added
          newSendButton.dataset.listenersAdded = 'true';
        }
      });
    } catch (error) {
      console.error('Error in Gmail observer:', error);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['role', 'class']
  });
};

// Initialize tracking
console.log('Gmail Email Tracker: Content script loaded');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeGmail);
} else {
  observeGmail();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_TRACKING_STATUS') {
    sendResponse({ isEnabled: isTrackingEnabled });
  }
  return true;
});

// Handle extension updates or reloads
chrome.runtime.onConnect.addListener((port) => {
  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) {
      console.log('Port disconnected, attempting to reconnect...');
      setTimeout(observeGmail, 1000);
    }
  });
});