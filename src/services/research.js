// All calls go through Vite dev-server proxy → avoids CORS and Node-only SDK issues
// (Tavily's @tavily/core uses https-proxy-agent which is Node-only and breaks in the browser)

const TAVILY_KEY = () => import.meta.env.VITE_TAVILY_API_KEY;
const EXA_KEY    = () => import.meta.env.VITE_EXA_API_KEY;

async function tavilySearch(query, opts = {}) {
  const res = await fetch('/api/tavily/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_KEY(),
      query,
      search_depth: opts.search_depth ?? 'advanced',
      max_results: opts.max_results ?? 5,
      include_answer: opts.include_answer ?? true,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Tavily error ${res.status}: ${txt}`);
  }
  return res.json();
}

async function exaSearch(query, opts = {}) {
  const res = await fetch('/api/exa/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': EXA_KEY(),
    },
    body: JSON.stringify({
      query,
      type: opts.type ?? 'neural',
      numResults: opts.numResults ?? 3,
      contents: {
        text: { maxCharacters: 1500 },
        highlights: { numSentences: 3, highlightsPerUrl: 2 },
      },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Exa error ${res.status}: ${txt}`);
  }
  return res.json();
}

const TECH_MARKERS = [
  'salesforce', 'hubspot', 'intercom', 'zendesk', 'slack', 'notion',
  'linear', 'figma', 'stripe', 'segment', 'mixpanel', 'amplitude',
  'outreach', 'salesloft', 'apollo', 'clearbit', 'zoominfo', 'gong',
  'marketo', 'pardot', 'drift', 'calendly', 'greenhouse', 'lever',
  'jira', 'confluence', 'asana', 'monday', 'clickup', 'airtable',
  'datadog', 'pagerduty', 'snowflake', 'dbt', 'looker', 'tableau',
  'aws', 'gcp', 'azure', 'vercel', 'netlify', 'heroku',
  'react', 'next.js', 'vue', 'angular', 'typescript',
];

const COMPETITOR_MARKERS = [
  'outreach.io', 'salesloft', 'apollo.io', 'zoominfo', 'seamless.ai',
  'lusha', 'hunter.io', 'lemlist', 'reply.io', 'instantly', 'smartlead',
];

export async function runResearchAgent(input, onChunk) {
  if (!TAVILY_KEY()) throw new Error('VITE_TAVILY_API_KEY is not set in .env');
  if (!EXA_KEY())    throw new Error('VITE_EXA_API_KEY is not set in .env');

  onChunk({ type: 'status', text: 'Querying Tavily for company intelligence...' });

  const isUrl = input.startsWith('http') || input.includes('.');
  const companyQuery = isUrl
    ? `${input} company overview funding team`
    : `${input} company overview funding tech stack B2B`;

  const [tavilyMain, tavilyNews] = await Promise.all([
    tavilySearch(companyQuery, { search_depth: 'advanced', max_results: 5, include_answer: true }),
    tavilySearch(`${input} recent news 2025 2026 funding product hiring`, {
      search_depth: 'advanced', max_results: 4, include_answer: true,
    }),
  ]);

  onChunk({ type: 'status', text: 'Querying Exa for funding signals & technographics...' });

  let exaResults = [];
  try {
    const exaData = await exaSearch(
      `${input} B2B SaaS sales team product company`,
      { type: 'company', numResults: 3 }
    );
    exaResults = exaData.results || [];
  } catch {
    // Exa may 404 on some inputs — gracefully continue
  }

  onChunk({ type: 'status', text: 'Processing results...' });

  // Extract readable company name
  let companyName = input;
  if (isUrl) {
    const domain = input.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
    const base = domain.split('.')[0];
    companyName = base.charAt(0).toUpperCase() + base.slice(1);
  }

  // Scan all content for tech stack / competitor signals
  const allText = [
    tavilyMain.answer || '',
    ...(tavilyMain.results || []).map(r => r.content || ''),
    tavilyNews.answer || '',
    ...(tavilyNews.results || []).map(r => r.content || ''),
    ...exaResults.map(r => (r.text || '') + ' ' + (r.highlights?.map(h => h.highlight).join(' ') || '')),
  ].join(' ').toLowerCase();

  const detectedTech        = TECH_MARKERS.filter(t => allText.includes(t));
  const detectedCompetitors = COMPETITOR_MARKERS.filter(c => allText.includes(c));

  const research = {
    companyName,
    input,
    summary:      tavilyMain.answer  || tavilyMain.results?.[0]?.content?.slice(0, 600) || 'No summary available.',
    recentNews:   tavilyNews.answer  || tavilyNews.results?.[0]?.content?.slice(0, 400) || 'No recent news found.',
    sources: [
      ...(tavilyMain.results || []).map(r => ({ title: r.title, url: r.url })),
      ...(tavilyNews.results || []).map(r => ({ title: r.title, url: r.url })),
    ].slice(0, 6),
    techStack:    detectedTech.slice(0, 8),
    competitors:  detectedCompetitors,
    exaEnrichment: exaResults.slice(0, 2).map(r => ({
      title: r.title,
      url:   r.url,
      highlight: r.highlights?.[0]?.highlight || (r.text || '').slice(0, 200),
    })),
  };

  onChunk({ type: 'result', data: research });
  return research;
}
