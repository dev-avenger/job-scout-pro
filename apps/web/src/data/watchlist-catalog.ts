export type WatchlistAdapter = 'workable' | 'greenhouse' | 'lever' | 'html' | 'successfactors' | 'bamboohr';

export interface WatchlistEntry {
  company: string;
  adapter: WatchlistAdapter;
  ref: string;
  city?: string;
  country?: string;
}

export type IntlTag = 'remote' | 'visa-sponsor';

export interface InternationalCompany extends WatchlistEntry {
  tags: IntlTag[];
}

const PK = 'Pakistan';

/**
 * Pakistani companies with verified public job boards. Workable accounts
 * activate automatically as soon as the company posts.
 */
export const PAKISTANI_COMPANIES: WatchlistEntry[] = [
  { company: 'Systems Ltd', adapter: 'successfactors', ref: 'https://career55.sapsf.eu/career?company=systemvent', city: 'Lahore', country: PK },
  { company: 'Creative Chaos', adapter: 'workable', ref: 'creativechaos', city: 'Karachi', country: PK },
  { company: 'Kwanso', adapter: 'lever', ref: 'kwanso', city: 'Lahore', country: PK },
  { company: 'Remotebase', adapter: 'workable', ref: 'remotebase', city: 'Lahore', country: PK },
  { company: 'Educative', adapter: 'lever', ref: 'educative', city: 'Lahore', country: PK },
  { company: 'Careem', adapter: 'greenhouse', ref: 'careem', city: 'Karachi', country: PK },
  { company: 'Motive', adapter: 'greenhouse', ref: 'gomotive', city: 'Lahore', country: PK },
  { company: 'Arbisoft', adapter: 'workable', ref: 'arbisoft', city: 'Lahore', country: PK },
  { company: 'Tkxel', adapter: 'workable', ref: 'tkxel', city: 'Lahore', country: PK },
  { company: 'Devsinc', adapter: 'workable', ref: 'devsinc', city: 'Lahore', country: PK },
  { company: 'Folio3', adapter: 'workable', ref: 'folio3', city: 'Karachi', country: PK },
  { company: 'VentureDive', adapter: 'workable', ref: 'venturedive', city: 'Karachi', country: PK },
  { company: 'Confiz', adapter: 'workable', ref: 'confiz', city: 'Lahore', country: PK },
  { company: 'Techlogix', adapter: 'workable', ref: 'techlogix', city: 'Lahore', country: PK },
  { company: '10Pearls', adapter: 'workable', ref: '10pearls', city: 'Karachi', country: PK },
  { company: 'Gaditek', adapter: 'workable', ref: 'gaditek', city: 'Karachi', country: PK },
  { company: 'Cubix', adapter: 'workable', ref: 'cubix', city: 'Karachi', country: PK },
  { company: 'Invozone', adapter: 'workable', ref: 'invozone', city: 'Lahore', country: PK },
  { company: 'Xavor', adapter: 'workable', ref: 'xavor', city: 'Lahore', country: PK },
  { company: 'Nextbridge', adapter: 'workable', ref: 'nextbridge', city: 'Lahore', country: PK },
  { company: 'Tintash', adapter: 'workable', ref: 'tintash', city: 'Lahore', country: PK },
  { company: 'eMumba', adapter: 'workable', ref: 'emumba', city: 'Islamabad', country: PK },
  { company: 'Intagleo', adapter: 'workable', ref: 'intagleo', city: 'Lahore', country: PK },
  { company: 'VisionX', adapter: 'workable', ref: 'visionx', city: 'Islamabad', country: PK },
  { company: 'DPL', adapter: 'workable', ref: 'dpl', city: 'Islamabad', country: PK },
  { company: 'EurosHub', adapter: 'workable', ref: 'euroshub', city: 'Lahore', country: PK },
  { company: 'Codup', adapter: 'workable', ref: 'codup', city: 'Karachi', country: PK },
  { company: 'ArhamSoft', adapter: 'workable', ref: 'arhamsoft', city: 'Lahore', country: PK },
  { company: 'Tezeract', adapter: 'workable', ref: 'tezeract', city: 'Karachi', country: PK },
  { company: 'PureLogics', adapter: 'workable', ref: 'purelogics', city: 'Lahore', country: PK },
  { company: 'Rolustech', adapter: 'workable', ref: 'rolustech', city: 'Lahore', country: PK },
  { company: 'DevBatch', adapter: 'workable', ref: 'devbatch', city: 'Lahore', country: PK },
  { company: 'Pikessoft', adapter: 'workable', ref: 'pikessoft', city: 'Islamabad', country: PK },
  { company: 'Sybrid', adapter: 'workable', ref: 'sybrid', city: 'Karachi', country: PK },
  { company: 'Dubizzle Labs', adapter: 'workable', ref: 'dubizzlelabs', city: 'Lahore', country: PK },
  { company: 'Bykea', adapter: 'workable', ref: 'bykea', city: 'Karachi', country: PK },
  { company: 'Geniteam', adapter: 'workable', ref: 'geniteam', city: 'Lahore', country: PK },
  { company: 'CitrusBits', adapter: 'workable', ref: 'citrusbits', city: 'Lahore', country: PK },
  { company: 'Golpik', adapter: 'workable', ref: 'golpik', city: 'Lahore', country: PK },
  { company: 'Kualitatem', adapter: 'workable', ref: 'kualitatem', city: 'Lahore', country: PK },
  { company: 'AppVerticals', adapter: 'workable', ref: 'appverticals', city: 'Karachi', country: PK },
  { company: 'KoderLabs', adapter: 'workable', ref: 'koderlabs', city: 'Karachi', country: PK },
  { company: 'GoSaaS', adapter: 'workable', ref: 'gosaas', city: 'Lahore', country: PK },
  { company: 'KalSoft', adapter: 'workable', ref: 'kalsoft', city: 'Karachi', country: PK },
  { company: 'LMKR', adapter: 'workable', ref: 'lmkr', city: 'Islamabad', country: PK },
  { company: 'Vyro', adapter: 'workable', ref: 'vyro', city: 'Islamabad', country: PK },
  { company: 'Teresol', adapter: 'workable', ref: 'teresol', city: 'Rawalpindi', country: PK },
  { company: 'CareCloud', adapter: 'workable', ref: 'carecloud', city: 'Islamabad', country: PK },
  { company: 'ibex Global', adapter: 'workable', ref: 'ibexglobal', city: 'Karachi', country: PK },
  { company: 'Nisum', adapter: 'workable', ref: 'nisum', city: 'Karachi', country: PK },
  { company: 'Afiniti', adapter: 'workable', ref: 'afiniti', city: 'Islamabad', country: PK },
  { company: 'Royal Cyber', adapter: 'workable', ref: 'royalcyber', city: 'Karachi', country: PK },
  { company: 'CodeNinja', adapter: 'workable', ref: 'codeninja', city: 'Lahore', country: PK },
  { company: 'Enterprise64', adapter: 'workable', ref: 'enterprise64', city: 'Karachi', country: PK },
  { company: 'Inbox Business Technologies', adapter: 'workable', ref: 'inbox-business-technologies', city: 'Karachi', country: PK },
  { company: 'Skylabs AI', adapter: 'workable', ref: 'skylabs-ai', city: 'Islamabad', country: PK },
  { company: 'Staunch', adapter: 'workable', ref: 'staunch', city: 'Lahore', country: PK },
  { company: 'iGATE Technology', adapter: 'workable', ref: 'igate-technology', city: 'Islamabad', country: PK },
  { company: 'Volga Partners', adapter: 'workable', ref: 'volga-partners', city: 'Islamabad', country: PK },
  { company: 'X UP Brands', adapter: 'workable', ref: 'x-up-brands', city: 'Islamabad', country: PK },
  { company: 'UserWise Services', adapter: 'workable', ref: 'userwise-services', city: 'Lahore', country: PK },
  { company: 'TCP Software', adapter: 'workable', ref: 'tcp-software', city: 'Lahore', country: PK },
];

const US = 'United States';

/**
 * International companies with verified boards. Tags are reputation-based:
 * 'remote' = remote-first hiring across regions; 'visa-sponsor' =
 * historically sponsors work visas — always verify on the specific role.
 */
export const INTERNATIONAL_COMPANIES: InternationalCompany[] = [
  { company: 'Canonical', adapter: 'greenhouse', ref: 'canonical', city: 'London', country: 'United Kingdom', tags: ['remote'] },
  { company: 'GitLab', adapter: 'greenhouse', ref: 'gitlab', city: 'Remote', country: US, tags: ['remote'] },
  { company: 'Turing', adapter: 'greenhouse', ref: 'turing', city: 'Palo Alto', country: US, tags: ['remote'] },
  { company: 'Remote.com', adapter: 'greenhouse', ref: 'remotecom', city: 'Remote', country: US, tags: ['remote'] },
  { company: 'Grafana Labs', adapter: 'greenhouse', ref: 'grafanalabs', city: 'Remote', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Wikimedia', adapter: 'greenhouse', ref: 'wikimedia', city: 'Remote', country: US, tags: ['remote'] },
  { company: 'Vercel', adapter: 'greenhouse', ref: 'vercel', city: 'San Francisco', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Netlify', adapter: 'greenhouse', ref: 'netlify', city: 'Remote', country: US, tags: ['remote'] },
  { company: 'Buildkite', adapter: 'greenhouse', ref: 'buildkite', city: 'Remote', country: 'Australia', tags: ['remote'] },
  { company: 'Hotjar', adapter: 'workable', ref: 'hotjar', city: 'Remote', country: 'Malta', tags: ['remote'] },
  { company: 'Temporal', adapter: 'greenhouse', ref: 'temporaltechnologies', city: 'Seattle', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Postman', adapter: 'greenhouse', ref: 'postman', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Anthropic', adapter: 'greenhouse', ref: 'anthropic', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Databricks', adapter: 'greenhouse', ref: 'databricks', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Datadog', adapter: 'greenhouse', ref: 'datadog', city: 'New York', country: US, tags: ['visa-sponsor'] },
  { company: 'MongoDB', adapter: 'greenhouse', ref: 'mongodb', city: 'New York', country: US, tags: ['visa-sponsor'] },
  { company: 'Cloudflare', adapter: 'greenhouse', ref: 'cloudflare', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Elastic', adapter: 'greenhouse', ref: 'elastic', city: 'Remote', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Okta', adapter: 'greenhouse', ref: 'okta', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Zscaler', adapter: 'greenhouse', ref: 'zscaler', city: 'San Jose', country: US, tags: ['visa-sponsor'] },
  { company: 'Samsara', adapter: 'greenhouse', ref: 'samsara', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Roblox', adapter: 'greenhouse', ref: 'roblox', city: 'San Mateo', country: US, tags: ['visa-sponsor'] },
  { company: 'Reddit', adapter: 'greenhouse', ref: 'reddit', city: 'Remote', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Discord', adapter: 'greenhouse', ref: 'discord', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Figma', adapter: 'greenhouse', ref: 'figma', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Dropbox', adapter: 'greenhouse', ref: 'dropbox', city: 'Remote', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Pinterest', adapter: 'greenhouse', ref: 'pinterest', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Twilio', adapter: 'greenhouse', ref: 'twilio', city: 'Remote', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Coinbase', adapter: 'greenhouse', ref: 'coinbase', city: 'Remote', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Duolingo', adapter: 'greenhouse', ref: 'duolingo', city: 'Pittsburgh', country: US, tags: ['visa-sponsor'] },
  { company: 'Instacart', adapter: 'greenhouse', ref: 'instacart', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Lyft', adapter: 'greenhouse', ref: 'lyft', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Affirm', adapter: 'greenhouse', ref: 'affirm', city: 'Remote', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Chime', adapter: 'greenhouse', ref: 'chime', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Asana', adapter: 'greenhouse', ref: 'asana', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Airtable', adapter: 'greenhouse', ref: 'airtable', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Amplitude', adapter: 'greenhouse', ref: 'amplitude', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'LaunchDarkly', adapter: 'greenhouse', ref: 'launchdarkly', city: 'Oakland', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Gusto', adapter: 'greenhouse', ref: 'gusto', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Checkr', adapter: 'greenhouse', ref: 'checkr', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'PagerDuty', adapter: 'greenhouse', ref: 'pagerduty', city: 'San Francisco', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Cockroach Labs', adapter: 'greenhouse', ref: 'cockroachlabs', city: 'New York', country: US, tags: ['visa-sponsor'] },
  { company: 'CircleCI', adapter: 'greenhouse', ref: 'circleci', city: 'Remote', country: US, tags: ['remote'] },
  { company: 'Webflow', adapter: 'greenhouse', ref: 'webflow', city: 'Remote', country: US, tags: ['remote', 'visa-sponsor'] },
  { company: 'Calendly', adapter: 'greenhouse', ref: 'calendly', city: 'Atlanta', country: US, tags: ['remote'] },
  { company: 'Squarespace', adapter: 'greenhouse', ref: 'squarespace', city: 'New York', country: US, tags: ['visa-sponsor'] },
  { company: 'Klaviyo', adapter: 'greenhouse', ref: 'klaviyo', city: 'Boston', country: US, tags: ['visa-sponsor'] },
  { company: 'Braze', adapter: 'greenhouse', ref: 'braze', city: 'New York', country: US, tags: ['visa-sponsor'] },
  { company: 'Contentful', adapter: 'greenhouse', ref: 'contentful', city: 'Berlin', country: 'Germany', tags: ['visa-sponsor'] },
  { company: 'Algolia', adapter: 'greenhouse', ref: 'algolia', city: 'Paris', country: 'France', tags: ['remote', 'visa-sponsor'] },
  { company: 'Monzo', adapter: 'greenhouse', ref: 'monzo', city: 'London', country: 'United Kingdom', tags: ['remote', 'visa-sponsor'] },
  { company: 'Plaid', adapter: 'lever', ref: 'plaid', city: 'San Francisco', country: US, tags: ['visa-sponsor'] },
  { company: 'Articulate', adapter: 'lever', ref: 'articulate', city: 'Remote', country: US, tags: ['remote'] },
];
