document.getElementById('saveJob')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const statusEl = document.getElementById('status');

  chrome.runtime.sendMessage({ type: 'SAVE_JOB', url: tab.url }, (response) => {
    if (statusEl) {
      statusEl.textContent = response?.success ? 'Job saved!' : 'Failed to save job';
    }
  });
});

document.getElementById('captureForm')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_FORM' });
});

document.getElementById('openDashboard')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5173' });
});
