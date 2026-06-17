// Content script: extracts job data and captures form structures

interface ExtractedJobData {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  url: string;
  applyUrl: string;
}

interface FormField {
  name: string;
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder: string;
  options: string[];
  value: string;
}

// ---- Job Page Detection ----

function detectJobPostingPage(): boolean {
  const indicators = [
    'application', 'apply', 'career', 'job', 'position', 'opening',
    'vacancy', 'hiring', 'recruitment',
  ];
  const pageText = (document.title + ' ' + document.body.innerText.substring(0, 5000)).toLowerCase();
  return indicators.some((indicator) => pageText.includes(indicator));
}

// ---- Structured Job Data Extraction ----

function extractJobData(): ExtractedJobData {
  const getText = (selectors: string[]): string => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return '';
  };

  // Try structured data (JSON-LD) first
  const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of ldScripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const jobPosting = data['@type'] === 'JobPosting' ? data :
        Array.isArray(data['@graph']) ? data['@graph'].find((d: any) => d['@type'] === 'JobPosting') : null;

      if (jobPosting) {
        return {
          title: jobPosting.title || '',
          company: jobPosting.hiringOrganization?.name || '',
          location: jobPosting.jobLocation?.address?.addressLocality ||
                    jobPosting.jobLocation?.name || '',
          salary: jobPosting.baseSalary?.value?.value ?
            `${jobPosting.baseSalary.currency || '$'}${jobPosting.baseSalary.value.value}` : '',
          description: jobPosting.description?.substring(0, 2000) || '',
          url: window.location.href,
          applyUrl: jobPosting.directApply ? window.location.href : '',
        };
      }
    } catch { /* ignore parse errors */ }
  }

  // Fallback: extract from DOM selectors
  const title = getText([
    'h1.job-title', 'h1[data-testid*="title"]', '.job-title h1',
    'h1.posting-headline', 'h1', '[class*="jobTitle"] h1',
  ]);

  const company = getText([
    '[data-testid*="company"]', '.company-name', '.employer-name',
    'a[data-testid*="company"]', '.posting-categories .sort-by-team',
  ]);

  const location = getText([
    '[data-testid*="location"]', '.job-location', '.location',
    '.posting-categories .sort-by-location',
  ]);

  const salary = getText([
    '[data-testid*="salary"]', '.salary-snippet', '.compensation',
  ]);

  const description = getText([
    '.job-description', '[data-testid*="description"]', '.posting-page .section-wrapper',
    '#job-description', '.job-details',
  ]);

  const applyButton = document.querySelector<HTMLAnchorElement>(
    'a[href*="apply"], button[class*="apply"], a.apply-button, [data-testid*="apply"]'
  );

  return {
    title,
    company,
    location,
    salary,
    description: description.substring(0, 2000),
    url: window.location.href,
    applyUrl: applyButton?.href || '',
  };
}

// ---- Form Capture ----

function captureFormFields(): { fields: FormField[]; formAction: string } {
  const fields: FormField[] = [];
  const forms = document.querySelectorAll('form');
  let formAction = '';

  // Get the most relevant form (usually the largest one)
  let targetForm: HTMLFormElement | null = null;
  let maxFields = 0;
  for (const form of forms) {
    const fieldCount = form.querySelectorAll('input, select, textarea').length;
    if (fieldCount > maxFields) {
      maxFields = fieldCount;
      targetForm = form;
    }
  }

  if (!targetForm) {
    // Fall back to all inputs on the page
    const allInputs = document.querySelectorAll('input, select, textarea');
    allInputs.forEach(el => processFormElement(el as HTMLElement, fields));
    return { fields, formAction: '' };
  }

  formAction = targetForm.action || '';
  const elements = targetForm.querySelectorAll('input, select, textarea');
  elements.forEach(el => processFormElement(el as HTMLElement, fields));

  return { fields, formAction };
}

function processFormElement(el: HTMLElement, fields: FormField[]) {
  const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  // Skip hidden, submit, and button types
  if (input instanceof HTMLInputElement && ['hidden', 'submit', 'button', 'image'].includes(input.type)) {
    return;
  }

  // Find label
  let label = '';
  if (input.id) {
    const labelEl = document.querySelector(`label[for="${input.id}"]`);
    if (labelEl) label = labelEl.textContent?.trim() || '';
  }
  if (!label) {
    const parentLabel = input.closest('label');
    if (parentLabel) label = parentLabel.textContent?.trim().replace(input.value, '').trim() || '';
  }
  if (!label) {
    label = input.getAttribute('aria-label') || input.getAttribute('placeholder') || input.name || '';
  }

  // Extract options for select elements
  const options: string[] = [];
  if (input instanceof HTMLSelectElement) {
    for (const opt of input.options) {
      if (opt.value) options.push(opt.text || opt.value);
    }
  }

  fields.push({
    name: input.name || '',
    id: input.id || '',
    type: input instanceof HTMLSelectElement ? 'select' :
          input instanceof HTMLTextAreaElement ? 'textarea' :
          (input as HTMLInputElement).type || 'text',
    label,
    required: input.required || input.getAttribute('aria-required') === 'true',
    placeholder: input.getAttribute('placeholder') || '',
    options,
    value: input.value || '',
  });
}

// ---- Autofill (runs in the user's own browser, so anti-bot checks pass) ----

/** Set a value on a React-controlled input so the framework registers it. */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface AutofillAnswer {
  fieldId: string;
  value: unknown;
  type?: string;
}

async function autofillForm(answers: AutofillAnswer[]): Promise<{ filled: number; skipped: string[] }> {
  let filled = 0;
  const skipped: string[] = [];

  for (const a of answers) {
    if (a.value == null || a.value === '' || a.type === 'file') continue;
    const id = a.fieldId;
    const value = String(a.value);
    const esc = (window as any).CSS?.escape ? CSS.escape(id) : id;

    // 1) Workable custom combobox: an input[role=combobox] opening a listbox.
    const combo = document.querySelector<HTMLElement>(
      `#input_${esc}_input, [data-ui="${id}"] input[role="combobox"]`,
    );
    if (combo) {
      combo.scrollIntoView({ block: 'center' });
      combo.click();
      await sleep(400);
      const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
      const opt =
        options.find((o) => o.textContent?.trim().toLowerCase() === value.toLowerCase()) ??
        options.find((o) => o.textContent?.toLowerCase().includes(value.toLowerCase()));
      if (opt) {
        opt.click();
        filled++;
        await sleep(150);
        continue;
      }
      combo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      skipped.push(id);
      continue;
    }

    // 2) Native <select>
    const sel = document.querySelector<HTMLSelectElement>(`select[name="${id}"], select#${esc}`);
    if (sel) {
      const o = Array.from(sel.options).find(
        (x) => x.text.toLowerCase() === value.toLowerCase() || x.value.toLowerCase() === value.toLowerCase(),
      );
      if (o) {
        sel.value = o.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
        continue;
      }
      skipped.push(id);
      continue;
    }

    // 3) Plain text / email / tel input or textarea
    const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `input[name="${id}"]:not([role="combobox"]), textarea[name="${id}"], #${esc}:not([role="combobox"]), [data-ui="${id}"] input:not([role="combobox"]), [data-ui="${id}"] textarea`,
    );
    if (input && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
      if ((input as HTMLInputElement).type === 'file') continue;
      setNativeValue(input, value);
      filled++;
    } else {
      skipped.push(id);
    }
  }

  return { filled, skipped };
}

// ---- Message Handlers ----

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'AUTOFILL') {
    autofillForm(message.answers || [])
      .then((res) => sendResponse({ success: true, ...res }))
      .catch((err) => sendResponse({ success: false, error: String(err?.message ?? err) }));
    return true;
  }

  if (message.type === 'CAPTURE_FORM') {
    const result = captureFormFields();
    chrome.runtime.sendMessage({
      type: 'CAPTURE_FORM',
      url: window.location.href,
      fields: result.fields,
      formAction: result.formAction,
    });
    sendResponse({ success: true, fieldCount: result.fields.length });
    return true;
  }

  if (message.type === 'EXTRACT_JOB_DATA') {
    const data = extractJobData();
    sendResponse({ success: true, data });
    return true;
  }
});

// ---- Auto-detect job pages ----

if (detectJobPostingPage()) {
  const jobData = extractJobData();
  chrome.runtime.sendMessage({
    type: 'JOB_PAGE_DETECTED',
    data: {
      url: window.location.href,
      title: jobData.title || document.title,
      company: jobData.company,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    },
  });
}

// ---- Auto-sync auth token from the web app (so the extension is connected) ----

if (/localhost:5173|127\.0\.0\.1:5173/.test(location.host)) {
  try {
    const raw = localStorage.getItem('auth-storage');
    const token = raw ? JSON.parse(raw)?.state?.accessToken : null;
    if (token) chrome.runtime.sendMessage({ type: 'SET_AUTH_TOKEN', token });
  } catch {
    /* ignore */
  }
}
