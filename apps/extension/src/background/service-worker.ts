const API_BASE = 'http://localhost:3000/api/v1';

interface AuthState {
  token: string | null;
  baseUrl: string;
}

async function getAuthState(): Promise<AuthState> {
  const result = await chrome.storage.local.get(['authToken', 'apiBaseUrl']);
  return {
    token: result.authToken || null,
    baseUrl: result.apiBaseUrl || API_BASE,
  };
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const { token, baseUrl } = await getAuthState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${body}`);
  }

  return response.json().catch(() => ({}));
}

// Store recent captures for popup display
const recentCaptures: Array<{ type: string; title: string; url: string; timestamp: number }> = [];

function addRecentCapture(type: string, title: string, url: string) {
  recentCaptures.unshift({ type, title, url, timestamp: Date.now() });
  if (recentCaptures.length > 20) recentCaptures.pop();
  chrome.storage.local.set({ recentCaptures });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_JOB') {
    apiRequest('/jobs/url', {
      method: 'POST',
      body: JSON.stringify({ url: message.url, metadata: message.metadata }),
    })
      .then((data) => {
        addRecentCapture('job', message.metadata?.title || 'Job', message.url);
        sendResponse({ success: true, data });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'JOB_PAGE_DETECTED') {
    // Store detected job page info
    addRecentCapture('detected', message.data.title, message.data.url);
    // Update badge to show notification
    chrome.action.setBadgeText({ text: '!', tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'CAPTURE_FORM') {
    // Form field capture from content script
    apiRequest('/applications/form-capture', {
      method: 'POST',
      body: JSON.stringify({
        url: message.url,
        fields: message.fields,
        formAction: message.formAction,
      }),
    })
      .then((data) => {
        addRecentCapture('form', `Form: ${message.fields?.length || 0} fields`, message.url);
        sendResponse({ success: true, data });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'SET_AUTH_TOKEN') {
    chrome.storage.local.set({ authToken: message.token }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'SET_API_URL') {
    chrome.storage.local.set({ apiBaseUrl: message.url }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_AUTH_STATE') {
    getAuthState().then((state) => sendResponse(state));
    return true;
  }

  if (message.type === 'GET_RECENT_CAPTURES') {
    chrome.storage.local.get('recentCaptures', (result) => {
      sendResponse(result.recentCaptures || []);
    });
    return true;
  }

  if (message.type === 'MANUAL_APPLICATION_OBSERVED') {
    apiRequest('/applications', {
      method: 'POST',
      body: JSON.stringify({
        jobId: message.jobId,
        observedUrl: message.url,
        manuallyApplied: true,
      }),
    })
      .then((data) => {
        addRecentCapture('applied', 'Manual application', message.url);
        sendResponse({ success: true, data });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
