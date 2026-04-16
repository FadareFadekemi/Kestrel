// Tracker Agent — assembles final lead record and assigns outreach status
export function runTrackerAgent(research, profile, email) {
  const lead = {
    id: Date.now(),
    company: profile.companyName || research.companyName,
    website: research.input,
    industry: profile.industry || 'Unknown',
    size: profile.companySize || 'Unknown',
    location: profile.location || 'Unknown',
    fundingStage: profile.fundingStage || 'Unknown',
    contactName:  profile.contactName  || 'Unknown',
    contactTitle: profile.contactTitle || 'Unknown',
    contactEmail: research.contactEmail || '',
    score: profile.scores?.overall || 0,
    techFit: profile.scores?.techFit || 0,
    sizeFit: profile.scores?.sizeFit || 0,
    timing: profile.scores?.timing || 0,
    growthIndicators: profile.scores?.growthIndicators || 0,
    scoreReasoning: profile.scoreReasoning || '',
    status: 'Not Contacted',
    dateAdded: new Date().toISOString().split('T')[0],
    tags: buildTags(profile),
    techStack: profile.techStack || [],
    competitors: profile.competitors || [],
    usesCompetitor: profile.usesCompetitor || false,
    competitorName: profile.competitorName || null,
    painPoints: profile.painPoints || [],
    growthSignals: profile.growthSignals || [],
    icp_fit: profile.icp_fit || '',
    summary: research.summary,
    recentNews: research.recentNews,
    sources: research.sources || [],
    emails: email ? [{
      id: Date.now(),
      subject: email.subject,
      body: email.body,
      tone: email.tone,
      variant: email.variant,
      sentAt: null,
      opened: false,
      clicked: false,
      replied: false,
      createdAt: new Date().toISOString(),
    }] : [],
    sequences: [],
  };

  return lead;
}

function buildTags(profile) {
  const tags = [];
  if (profile.fundingStage && profile.fundingStage !== 'Unknown') tags.push(profile.fundingStage);
  if (profile.industry) tags.push(profile.industry.split('/')[0].trim());
  if (profile.companySize) {
    const [min] = profile.companySize.split('-').map(s => parseInt(s.replace(/[^0-9]/g, '')));
    if (min >= 1000) tags.push('Enterprise');
    else if (min >= 200) tags.push('Mid-Market');
    else if (min >= 50) tags.push('SMB');
    else tags.push('Startup');
  }
  return tags.filter(Boolean).slice(0, 4);
}
