const OPENAI_KEY = () => import.meta.env.VITE_OPENAI_API_KEY;

const TONE_INSTRUCTIONS = {
  Formal:       'Write in a formal, professional tone. Use complete sentences, no contractions. Reference business outcomes and ROI. Address the contact by full name.',
  Consultative: 'Write in a warm, consultative tone. Lead with insight about their business, not your product. Ask a thoughtful question. Sound like a trusted advisor.',
  Casual:       'Write in a casual, peer-to-peer tone. Keep it short (< 5 sentences). Sound like a colleague, not a vendor. Use first names. No jargon.',
  Aggressive:   'Write in a direct, urgency-driven tone. Lead with a bold claim or result. Create FOMO. Use social proof. Push for a meeting immediately.',
};

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
      temperature: opts.temperature ?? 0.7,
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
      } catch { /* partial chunk */ }
    }
  }
  return fullText;
}

export async function runEmailWriterAgent(profile, tone = 'Consultative', variant = 'A', onChunk) {
  onChunk({ type: 'status', text: `Drafting ${tone} email (Variant ${variant})...` });

  const techMention     = profile.techStack?.slice(0, 3).join(', ') || 'your current stack';
  const competitorNote  = profile.usesCompetitor && profile.competitorName
    ? `Important: They currently use ${profile.competitorName} — a direct competitor to techcori. Reference this tactfully to create a displacement angle.`
    : '';

  const prompt = `You are an elite B2B SDR writing a cold outreach email for techcori, an AI-powered Sales Development platform that automates lead research, profiling, and personalized outreach at scale.

Target: ${profile.companyName}
Contact: ${profile.contactName || 'the decision maker'}, ${profile.contactTitle || 'Sales Leader'}
Industry: ${profile.industry}
Company size: ${profile.companySize}
Pain points: ${profile.painPoints?.slice(0, 3).join('; ')}
Growth signals: ${profile.growthSignals?.slice(0, 2).join('; ')}
Tech stack: ${techMention}
Tone: ${tone}
Tone guidance: ${TONE_INSTRUCTIONS[tone]}
${competitorNote}
Variant: ${variant === 'A' ? 'Lead with their biggest pain point' : 'Lead with a growth signal or recent news to show you did research'}

Requirements:
- Subject line (compelling, < 8 words)
- Body: 100-160 words max
- Soft CTA: 15-min call, not "schedule a demo"
- Use {{firstName}} for contact first name
- Use {{senderName}} for sender name placeholder

Return ONLY valid JSON:
{
  "subject": "string",
  "body": "string — full email body, line breaks as \\n",
  "tone": "${tone}",
  "variant": "${variant}",
  "wordCount": number
}`;

  const text = await openaiStream(
    [{ role: 'user', content: prompt }],
    delta => onChunk({ type: 'stream', text: delta }),
    { temperature: 0.7 }
  );

  let email;
  try { email = JSON.parse(text); }
  catch { email = { error: 'Parse failed', raw: text, subject: '', body: text, tone, variant }; }

  onChunk({ type: 'result', data: email });
  return email;
}

export async function generateFollowUpSequence(profile, primaryEmail, onChunk) {
  onChunk({ type: 'status', text: 'Generating 3-touch follow-up sequence...' });

  const prompt = `You are an elite B2B SDR building a follow-up sequence for a non-responder.

Company: ${profile.companyName}
Contact: ${profile.contactName}, ${profile.contactTitle}
Initial email subject: "${primaryEmail.subject}"
Initial tone: ${primaryEmail.tone}

Build a 3-touch follow-up sequence. Rules:
- Each email gets shorter than the last
- Add new value each time (new angle, stat, or question) — never just "following up"
- Day 7 is a short breakup email that gives them an easy out
- Use {{firstName}} and {{senderName}} placeholders

Return ONLY valid JSON:
{
  "sequence": [
    { "day": 0, "subject": "string", "body": "string", "tone": "string", "note": "strategy note" },
    { "day": 3, "subject": "string", "body": "string", "tone": "string", "note": "strategy note" },
    { "day": 7, "subject": "string", "body": "string", "tone": "string", "note": "strategy note" }
  ]
}`;

  const text = await openaiStream(
    [{ role: 'user', content: prompt }],
    delta => onChunk({ type: 'stream', text: delta }),
    { temperature: 0.65 }
  );

  let result;
  try {
    result = JSON.parse(text);
    if (result.sequence?.[0]) {
      result.sequence[0].subject = primaryEmail.subject;
      result.sequence[0].body    = primaryEmail.body;
      result.sequence[0].tone    = primaryEmail.tone;
    }
  } catch {
    result = { error: 'Parse failed', raw: text };
  }

  onChunk({ type: 'result', data: result });
  return result;
}

export async function generateABVariants(profile, tone, onChunk) {
  const [emailA, emailB] = await Promise.all([
    runEmailWriterAgent(profile, tone, 'A', onChunk),
    runEmailWriterAgent(profile, tone, 'B', onChunk),
  ]);
  return { A: emailA, B: emailB };
}
