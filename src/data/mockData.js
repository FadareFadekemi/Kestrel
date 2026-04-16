export const MOCK_LEADS = [
  {
    id: 1,
    company: "Notion",
    website: "notion.so",
    industry: "Productivity SaaS",
    size: "501-1000",
    location: "San Francisco, CA",
    score: 92,
    techFit: 94,
    sizeFit: 88,
    timing: 95,
    status: "Replied",
    dateAdded: "2026-04-01",
    contactName: "Akshay Kothari",
    contactTitle: "COO",
    contactEmail: "akshay@notion.so",
    tags: ["Productivity", "B2B", "Series C"],
    techStack: ["Intercom", "Salesforce", "Segment", "Mixpanel", "Figma"],
    competitors: ["Coda", "Confluence"],
    painPoints: [
      "Scaling enterprise sales motion",
      "Outbound SDR team efficiency",
      "Personalization at scale"
    ],
    summary: "Notion is a productivity and note-taking platform that has recently expanded into enterprise. With 30M+ users and a $10B valuation, they're building out their outbound sales team after historically relying on PLG. Recent job postings show 15+ SDR roles open globally.",
    recentNews: "Notion raised $275M Series C and announced Notion AI in Q1 2026. CEO Ivan Zhao announced plans to triple the sales team.",
    emails: [
      {
        id: 1,
        subject: "Re: Scaling your SDR team at Notion",
        sentAt: "2026-04-02",
        opened: true,
        clicked: true,
        replied: true,
        variant: "A"
      }
    ]
  },
  {
    id: 2,
    company: "Linear",
    website: "linear.app",
    industry: "Project Management SaaS",
    size: "51-200",
    location: "San Francisco, CA",
    score: 87,
    techFit: 91,
    sizeFit: 82,
    timing: 88,
    status: "Contacted",
    dateAdded: "2026-04-03",
    contactName: "Karri Saarinen",
    contactTitle: "CEO",
    contactEmail: "karri@linear.app",
    tags: ["Dev Tools", "B2B", "Series B"],
    techStack: ["HubSpot", "Notion", "Slack", "Figma", "Stripe"],
    competitors: ["Jira", "Asana"],
    painPoints: [
      "Competing against enterprise incumbents",
      "Low brand awareness outside dev circles",
      "Converting PLG users to paid"
    ],
    summary: "Linear is a project management tool beloved by engineers. Growing rapidly in the dev-tools space with a strong bottom-up adoption model. Starting to invest in enterprise sales.",
    recentNews: "Linear raised $35M Series B. Product team doubled in size. New enterprise tier launched Q1 2026.",
    emails: [
      {
        id: 2,
        subject: "Helping Linear win enterprise deals",
        sentAt: "2026-04-04",
        opened: true,
        clicked: false,
        replied: false,
        variant: "B"
      }
    ]
  },
  {
    id: 3,
    company: "Vercel",
    website: "vercel.com",
    industry: "Developer Infrastructure",
    size: "201-500",
    location: "San Francisco, CA",
    score: 79,
    techFit: 85,
    sizeFit: 76,
    timing: 75,
    status: "Not Contacted",
    dateAdded: "2026-04-05",
    contactName: "Guillermo Rauch",
    contactTitle: "CEO",
    contactEmail: "rauchg@vercel.com",
    tags: ["Dev Tools", "Infrastructure", "Series D"],
    techStack: ["Salesforce", "Outreach", "ZoomInfo", "Gong", "Slack"],
    competitors: ["Netlify", "AWS Amplify"],
    painPoints: [
      "Enterprise sales cycle complexity",
      "Technical buyer vs. business buyer disconnect",
      "International expansion"
    ],
    summary: "Vercel is the platform for frontend developers, powering Next.js and enabling rapid deployment. Strong PLG motion transitioning to enterprise with a new sales-led approach.",
    recentNews: "Vercel raised $150M at $3.25B valuation. Launched enterprise security features. Acquired Splitbee analytics.",
    emails: []
  },
  {
    id: 4,
    company: "Figma",
    website: "figma.com",
    industry: "Design SaaS",
    size: "1001-5000",
    location: "San Francisco, CA",
    score: 71,
    techFit: 78,
    sizeFit: 65,
    timing: 70,
    status: "Converted",
    dateAdded: "2026-03-20",
    contactName: "Dylan Field",
    contactTitle: "CEO",
    contactEmail: "dylan@figma.com",
    tags: ["Design Tools", "B2B", "Series F"],
    techStack: ["Salesforce", "Marketo", "Zendesk", "Intercom", "Segment"],
    competitors: ["Sketch", "Adobe XD"],
    painPoints: [
      "Post-acquisition integration complexity",
      "Enterprise procurement friction",
      "Competing with Adobe suite"
    ],
    summary: "Figma is the collaborative design platform used by millions of designers. After the failed Adobe acquisition, they're operating independently with renewed focus on product-led enterprise growth.",
    recentNews: "Figma IPO filing rumored for Q3 2026. New AI design features launched. Partnership with major enterprise firms.",
    emails: [
      {
        id: 3,
        subject: "Enterprise outreach automation for Figma",
        sentAt: "2026-03-21",
        opened: true,
        clicked: true,
        replied: true,
        variant: "A"
      }
    ]
  },
  {
    id: 5,
    company: "Retool",
    website: "retool.com",
    industry: "Low-Code Platform",
    size: "201-500",
    location: "San Francisco, CA",
    score: 85,
    techFit: 89,
    sizeFit: 83,
    timing: 84,
    status: "Not Contacted",
    dateAdded: "2026-04-08",
    contactName: "David Hsu",
    contactTitle: "CEO",
    contactEmail: "david@retool.com",
    tags: ["Low-Code", "B2B", "Series C"],
    techStack: ["HubSpot", "Apollo", "Slack", "Notion", "Intercom"],
    competitors: ["Appsmith", "Bubble"],
    painPoints: [
      "Competing in crowded low-code space",
      "Converting developers vs. business users",
      "Enterprise security concerns"
    ],
    summary: "Retool allows companies to build internal tools rapidly. Strong enterprise traction with a developer-centric approach. Recent focus on AI-powered workflow automation.",
    recentNews: "Retool raised $45M Series C. Launched Retool AI for automated workflow building. 4000+ enterprise customers.",
    emails: []
  }
];

export const MOCK_SEQUENCES = [
  {
    id: 1,
    name: "Enterprise SaaS Outbound",
    leadCount: 24,
    activeLeads: 18,
    replyRate: 12,
    steps: [
      {
        day: 0,
        subject: "Quick question about {{company}}'s outbound motion",
        preview: "Hi {{firstName}}, noticed {{company}} recently expanded its sales team...",
        tone: "Consultative",
        type: "email"
      },
      {
        day: 3,
        subject: "Following up — {{company}} + Kestrel",
        preview: "Wanted to resurface this — saw you're using {{tech_stack}} which is exactly...",
        tone: "Consultative",
        type: "email"
      },
      {
        day: 7,
        subject: "Last note — specific idea for {{company}}",
        preview: "I'll keep this short. One concrete thing Kestrel does for teams like {{company}}...",
        tone: "Casual",
        type: "email"
      }
    ]
  },
  {
    id: 2,
    name: "Dev Tools Founders",
    leadCount: 12,
    activeLeads: 9,
    replyRate: 18,
    steps: [
      {
        day: 0,
        subject: "{{company}}'s PLG → Enterprise transition",
        preview: "{{firstName}}, your bottom-up motion is impressive. Most teams at {{company}}'s stage...",
        tone: "Formal",
        type: "email"
      },
      {
        day: 4,
        subject: "Concrete ROI numbers for {{company}}",
        preview: "Teams like {{company}} typically see 3x more pipeline in 60 days. Here's how...",
        tone: "Aggressive",
        type: "email"
      },
      {
        day: 9,
        subject: "One last thought",
        preview: "If now isn't the right time, I get it. But when {{company}} is ready to scale...",
        tone: "Casual",
        type: "email"
      }
    ]
  }
];

export const DASHBOARD_STATS = {
  totalLeads: 247,
  emailsSent: 1842,
  replyRate: 14.2,
  conversionRate: 3.8
};

export const ACTIVITY_DATA = [
  { date: "Mar 17", emails: 42, replies: 6 },
  { date: "Mar 18", emails: 38, replies: 4 },
  { date: "Mar 19", emails: 55, replies: 8 },
  { date: "Mar 20", emails: 61, replies: 9 },
  { date: "Mar 21", emails: 48, replies: 7 },
  { date: "Mar 22", emails: 29, replies: 3 },
  { date: "Mar 23", emails: 22, replies: 2 },
  { date: "Mar 24", emails: 67, replies: 11 },
  { date: "Mar 25", emails: 71, replies: 10 },
  { date: "Mar 26", emails: 58, replies: 8 },
  { date: "Mar 27", emails: 63, replies: 9 },
  { date: "Mar 28", emails: 45, replies: 6 },
  { date: "Mar 29", emails: 52, replies: 7 },
  { date: "Mar 30", emails: 34, replies: 4 },
  { date: "Mar 31", emails: 28, replies: 3 },
  { date: "Apr 1", emails: 75, replies: 12 },
  { date: "Apr 2", emails: 82, replies: 13 },
  { date: "Apr 3", emails: 69, replies: 10 },
  { date: "Apr 4", emails: 77, replies: 11 },
  { date: "Apr 5", emails: 44, replies: 6 },
  { date: "Apr 6", emails: 31, replies: 4 },
  { date: "Apr 7", emails: 88, replies: 14 },
  { date: "Apr 8", emails: 93, replies: 15 },
  { date: "Apr 9", emails: 79, replies: 12 },
  { date: "Apr 10", emails: 86, replies: 13 },
  { date: "Apr 11", emails: 64, replies: 9 },
  { date: "Apr 12", emails: 51, replies: 7 },
  { date: "Apr 13", emails: 39, replies: 5 },
  { date: "Apr 14", emails: 97, replies: 16 },
  { date: "Apr 15", emails: 102, replies: 17 },
];

export const TONE_BREAKDOWN = [
  { tone: "Consultative", rate: 18.4, emails: 720 },
  { tone: "Casual", rate: 15.2, emails: 480 },
  { tone: "Formal", rate: 11.8, emails: 390 },
  { tone: "Aggressive", rate: 9.1, emails: 252 },
];

export function generateAgentData(input) {
  const companyName = input.trim().replace(/https?:\/\/(www\.)?/, '').split('/')[0].split('.')[0];
  const cap = companyName.charAt(0).toUpperCase() + companyName.slice(1);

  const techStacks = [
    ["HubSpot", "Intercom", "Segment", "Mixpanel", "Figma"],
    ["Salesforce", "Outreach", "ZoomInfo", "Gong", "Slack"],
    ["Notion", "Linear", "Stripe", "Figma", "Vercel"],
    ["HubSpot", "Apollo", "Clearbit", "Slack", "Notion"],
  ];
  const stack = techStacks[Math.floor(Math.random() * techStacks.length)];
  const score = Math.floor(Math.random() * 30) + 65;
  const hasCompetitor = Math.random() > 0.5;

  return {
    research: {
      company: cap,
      website: input.includes('.') ? input : `${companyName.toLowerCase()}.com`,
      industry: ["B2B SaaS", "Fintech", "Dev Tools", "HR Tech", "MarTech"][Math.floor(Math.random() * 5)],
      size: ["11-50", "51-200", "201-500", "501-1000"][Math.floor(Math.random() * 4)],
      location: ["San Francisco, CA", "New York, NY", "Austin, TX", "Remote"][Math.floor(Math.random() * 4)],
      summary: `${cap} is a rapidly growing B2B SaaS company with strong product-market fit. Recent signals indicate they are scaling their go-to-market motion, with multiple SDR and AE roles posted in the last 30 days. The team recently secured funding and is investing heavily in outbound sales infrastructure. Their tech stack suggests a modern RevOps setup.`,
      recentNews: `${cap} closed a $24M Series B last quarter. The CEO recently published a post on LinkedIn about scaling enterprise sales. Three new VP-level hires joined the sales org in the last 60 days.`,
      techStack: stack,
      competitor: hasCompetitor ? ["Outreach.io", "Salesloft", "Apollo.io"][Math.floor(Math.random() * 3)] : null
    },
    profile: {
      contactName: ["Sarah Chen", "Marcus Rodriguez", "Priya Nair", "James O'Brien", "Aisha Williams"][Math.floor(Math.random() * 5)],
      contactTitle: ["VP of Sales", "Head of Growth", "CEO", "CRO", "Director of Sales"][Math.floor(Math.random() * 5)],
      painPoints: [
        "SDR team spending 4+ hours/day on manual research",
        "Personalization doesn't scale beyond 50 leads/week",
        "Low reply rates on outbound sequences (< 8%)",
        `Currently using ${stack[0]} but missing enrichment layer`,
        "No systematic competitor displacement playbook"
      ],
      score,
      techFit: score + Math.floor(Math.random() * 8) - 4,
      sizeFit: score + Math.floor(Math.random() * 8) - 4,
      timing: score + Math.floor(Math.random() * 10) - 5,
    },
    email: {
      subject: `${cap}'s outbound motion — a quick thought`,
      body: `Hi {{firstName}},

Noticed ${cap} recently ${hasCompetitor ? `is running outbound on top of ${stack[0]}` : `opened 3 SDR roles`} — timing felt right to reach out.

We help teams like yours run AI-powered outbound that references the exact tools your prospects use (${stack.slice(0, 3).join(', ')}, etc.) and auto-personalizes at scale.

Most teams we work with see reply rates jump from ~6% to ~18% within 45 days.

Would a 15-min call this week make sense?

Best,
{{senderName}}`,
      tone: "Consultative"
    }
  };
}
