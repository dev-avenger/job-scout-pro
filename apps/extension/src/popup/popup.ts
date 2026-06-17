// ---- State ----
let isConnected = false;
let authToken: string | null = null;

// ---- Initialization ----
async function init() {
  await checkConnection();
  await loadRecentCaptures();
  setupEventListeners();
}

async function checkConnection() {
  const statusEl = document.getElementById('connectionStatus')!;
  const statusDot = document.getElementById('statusDot')!;
  const statusText = document.getElementById('statusText')!;

  try {
    const state = await sendMessage({ type: 'GET_AUTH_STATE' });
    authToken = state.token;

    if (authToken) {
      // Verify token is valid
      const response = await fetch(`${state.baseUrl}/health`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      isConnected = response.ok;
    } else {
      isConnected = false;
    }
  } catch {
    isConnected = false;
  }

  statusDot.className = `status-dot ${isConnected ? 'connected' : 'disconnected'}`;
  statusText.textContent = isConnected ? 'Connected' : 'Not connected';

  // Show/hide auth section
  const authSection = document.getElementById('authSection')!;
  const actionsSection = document.getElementById('actionsSection')!;
  authSection.style.display = isConnected ? 'none' : 'block';
  actionsSection.style.display = isConnected ? 'block' : 'none';
}

async function loadRecentCaptures() {
  const captures = await sendMessage({ type: 'GET_RECENT_CAPTURES' });
  const container = document.getElementById('recentCaptures')!;

  if (!captures || captures.length === 0) {
    container.innerHTML = '<div class="empty">No recent captures</div>';
    return;
  }

  container.innerHTML = captures.slice(0, 5).map((c: any) => {
    const timeAgo = getTimeAgo(c.timestamp);
    const icon = c.type === 'job' ? 'briefcase' : c.type === 'form' ? 'form' : 'page';
    return `
      <div class="capture-item">
        <span class="capture-icon ${icon}">${getIcon(c.type)}</span>
        <div class="capture-info">
          <div class="capture-title">${escapeHtml(c.title)}</div>
          <div class="capture-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Event Listeners ----
function setupEventListeners() {
  document.getElementById('autofillForm')?.addEventListener('click', handleAutofill);
  document.getElementById('saveJob')?.addEventListener('click', handleSaveJob);
  document.getElementById('captureForm')?.addEventListener('click', handleCaptureForm);
  document.getElementById('openDashboard')?.addEventListener('click', handleOpenDashboard);
  document.getElementById('connectBtn')?.addEventListener('click', handleConnect);
  document.getElementById('disconnectBtn')?.addEventListener('click', handleDisconnect);
}

async function handleSaveJob() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab?.id) return;

  const statusEl = document.getElementById('status')!;
  statusEl.textContent = 'Extracting job data...';
  statusEl.className = 'status info';

  // Extract structured data from page
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB_DATA' });
  const metadata = response?.data || {};

  statusEl.textContent = 'Saving job...';

  chrome.runtime.sendMessage(
    { type: 'SAVE_JOB', url: tab.url, metadata },
    (res) => {
      if (res?.success) {
        statusEl.textContent = 'Job saved!';
        statusEl.className = 'status success';
        loadRecentCaptures();
      } else {
        statusEl.textContent = res?.error || 'Failed to save';
        statusEl.className = 'status error';
      }
      setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'status'; }, 3000);
    },
  );
}

async function handleCaptureForm() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const statusEl = document.getElementById('status')!;
  statusEl.textContent = 'Capturing form...';
  statusEl.className = 'status info';

  chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_FORM' }, (res) => {
    if (res?.success) {
      statusEl.textContent = `Captured ${res.fieldCount} fields`;
      statusEl.className = 'status success';
    } else {
      statusEl.textContent = 'No form found';
      statusEl.className = 'status error';
    }
    setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'status'; }, 3000);
  });
}

async function handleAutofill() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return;

  const statusEl = document.getElementById('status')!;
  statusEl.textContent = 'Fetching your prepared answers…';
  statusEl.className = 'status info';

  // 1) Get the matching application's answers from the API.
  const res = await sendMessage({ type: 'FETCH_AUTOFILL', url: tab.url });
  if (!res?.success || !res.data) {
    statusEl.textContent = 'No matching prepared application for this page.';
    statusEl.className = 'status error';
    setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'status'; }, 4000);
    return;
  }

  // 2) Tell the content script to fill the form in THIS (the user's) browser.
  chrome.tabs.sendMessage(tab.id, { type: 'AUTOFILL', answers: res.data.answers }, (fill) => {
    if (fill?.success) {
      statusEl.innerHTML = `Filled ${fill.filled} fields. <b>Attach your resume, solve the human check, and submit.</b>`;
      statusEl.className = 'status success';
    } else {
      statusEl.textContent = fill?.error || 'Could not fill the form on this page.';
      statusEl.className = 'status error';
    }
    setTimeout(() => { statusEl.className = 'status'; }, 8000);
  });
}

function handleOpenDashboard() {
  chrome.tabs.create({ url: 'http://localhost:5173' });
}

async function handleConnect() {
  const tokenInput = document.getElementById('tokenInput') as HTMLInputElement;
  const token = tokenInput.value.trim();
  if (!token) return;

  await sendMessage({ type: 'SET_AUTH_TOKEN', token });
  await checkConnection();
  await loadRecentCaptures();
}

async function handleDisconnect() {
  await sendMessage({ type: 'SET_AUTH_TOKEN', token: null });
  authToken = null;
  isConnected = false;
  await checkConnection();
}

// ---- Helpers ----
function sendMessage(msg: any): Promise<any> {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getIcon(type: string): string {
  switch (type) {
    case 'job': return '\u{1F4BC}';
    case 'form': return '\u{1F4CB}';
    case 'applied': return '\u2705';
    case 'detected': return '\u{1F50D}';
    default: return '\u{1F4C4}';
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', init);
