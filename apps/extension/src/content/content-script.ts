// Content script: detects job posting pages and offers to save them

function detectJobPostingPage(): boolean {
  const indicators = [
    'application', 'apply', 'career', 'job', 'position', 'opening',
    'vacancy', 'hiring', 'recruitment',
  ];

  const pageText = (document.title + ' ' + document.body.innerText.substring(0, 5000)).toLowerCase();
  return indicators.some((indicator) => pageText.includes(indicator));
}

function getPageMetadata() {
  return {
    url: window.location.href,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
  };
}

// Notify background script if this looks like a job page
if (detectJobPostingPage()) {
  chrome.runtime.sendMessage({
    type: 'JOB_PAGE_DETECTED',
    data: getPageMetadata(),
  });
}
