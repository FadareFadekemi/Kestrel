// Uses plain fetch through the /api/openai Vite proxy — no OpenAI SDK (avoids browser issues)

const OPENAI_KEY = () => import.meta.env.VITE_OPENAI_API_KEY;

async function openaiStream(messages, onDelta, opts = {}) {
  if (!OPENAI_KEY()) throw new Error('VITE_OPENAI_API_KEY is not set in .env');

  const res = await fetch('/api/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      stream: true,
      temperature: opts.temperature ?? 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${txt}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') break;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content || '';
        if (delta) { fullText += delta; onDelta(delta); }
      } catch {
        // incomplete JSON chunk — skip
      }
    }
  }

  return fullText;
}

export async function runProfilingAgent(research, onChunk) {
  onChunk({ type: 'status', text: 'GPT-4o synthesizing lead profile...' });

  const prompt = `You are a B2B sales intelligence analyst. Based on the research below, produce a structured lead profile.

Company: ${research.companyName}
Research Summary: ${research.summary}
Recent News: ${research.recentNews}
Detected Tech Stack: ${research.techStack.join(', ') || 'Unknown'}
Detected Competitors in use: ${research.competitors.join(', ') || 'None detected'}
Exa enrichment: ${research.exaEnrichment?.map(e => e.highlight).join(' | ') || ''}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "companyName": "string",
  "industry": "string — specific vertical e.g. 'B2B SaaS / HR Tech'",
  "companySize": "string — headcount range e.g. '51-200'",
  "location": "string — city, country",
  "fundingStage": "string — e.g. 'Series B', 'Bootstrapped', 'Unknown'",
  "contactName": "string — likely decision maker name if findable from research, else 'Unknown'",
  "contactTitle": "string — e.g. 'VP of Sales', 'CEO'",
  "painPoints": ["string x5 — specific, researched pain points relevant to AI sales automation"],
  "growthSignals": ["string x3 — signals the company is actively growing sales/GTM"],
  "techStack": ["string — tools the company uses"],
  "competitors": ["string — competitor tools they use"],
  "usesCompetitor": boolean,
  "competitorName": "string or null",
  "icp_fit": "string — one sentence on why they fit the ICP for an AI outbound sales tool",
  "scores": {
    "overall": number (0-100),
    "techFit": number (0-100),
    "sizeFit": number (0-100),
    "timing": number (0-100),
    "growthIndicators": number (0-100)
  },
  "scoreReasoning": "string — 2-3 sentences explaining the score"
}`;

  let fullText = '';
  const text = await openaiStream(
    [{ role: 'user', content: prompt }],
    delta => { fullText += delta; onChunk({ type: 'stream', text: delta }); },
    { temperature: 0.3 }
  );

  let profile;
  try {
    profile = JSON.parse(text);
    // Merge detected tech stack in case GPT missed items
    if (research.techStack.length > 0) {
      const existing = (profile.techStack || []).map(t => t.toLowerCase());
      const extra = research.techStack.filter(t => !existing.includes(t.toLowerCase()));
      profile.techStack = [...(profile.techStack || []), ...extra].slice(0, 10);
    }
    if (research.competitors.length > 0 && !profile.usesCompetitor) {
      profile.usesCompetitor = true;
      profile.competitors = [...new Set([...(profile.competitors || []), ...research.competitors])];
      profile.competitorName = profile.competitorName || research.competitors[0];
    }
  } catch {
    profile = { error: 'Failed to parse profile', raw: text };
  }

  onChunk({ type: 'result', data: profile });
  return profile;
}
