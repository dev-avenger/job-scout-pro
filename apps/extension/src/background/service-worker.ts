chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_JOB') {
    // Forward job data to API
    fetch('http://localhost:3000/api/v1/jobs/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: message.url }),
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));

    return true; // Keep message channel open for async response
  }

  if (message.type === 'CAPTURE_FORM') {
    // Capture form structure from current page
    sendResponse({ success: true });
  }
});
