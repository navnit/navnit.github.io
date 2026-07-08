/* Build Mode: Navnit — game content (ES module) */
export const BLOCKS = [
  {
    id: 'foundation', label: 'Foundation', building: 'The Foundation', color: '#8fa1c0',
    hint: 'Who I am',
    boss: {
      id: 'canvas', name: 'THE BLANK CANVAS', epithet: 'Devourer of Vague Projects',
      intro: 'A pale shape rises from the empty plot…',
      taunt: 'No spec. No starting point. No "right answer." I am THE BLANK CANVAS. Build anything you like — it will be the wrong thing.',
      prompt: 'How do you start?',
      choices: [
        { t: 'Start coding immediately. Momentum will reveal the plan.', ok: false, counter: 'The Canvas silently absorbs your 400 lines of code. You built the wrong thing — just faster. TRY AGAIN.' },
        { t: 'Ask first: what problem are we actually solving, and for whom?', ok: true },
        { t: 'Wait until perfect requirements arrive.', ok: false, counter: 'You wait. The Canvas grows three sizes. Perfect requirements are a bedtime story for junior engineers. TRY AGAIN.' }
      ],
      win: 'Clarity is the first architecture.'
    },
    reveal: {
      kicker: 'FOUNDATION UNLOCKED',
      title: 'Navnit — engineer of working systems',
      body: 'Software engineer and system designer. I work at the intersection of backend engineering, AI workflows, product thinking, and communication — and my job, in every one of those, is the same: turn messy problems into working systems.',
      tags: ['Software Engineer', 'System Designer', 'AI Workflow Builder', 'Product Thinker']
    }
  },
  {
    id: 'tower', label: 'System Design', building: 'Architecture Tower', color: '#5b7fb8',
    hint: 'Architecture & backend',
    boss: {
      id: 'beast', name: 'THE LEGACY SYSTEM BEAST', epithet: 'Nine Years of Patches on Patches',
      intro: 'The ground trembles. Something old and tightly coupled awakens…',
      taunt: 'Every module touches every other module. Nobody remembers why. Change one line and I break three teams. Modify me… IF YOU DARE.',
      prompt: 'How do you tame it?',
      choices: [
        { t: 'Rewrite everything from scratch in one heroic weekend.', ok: false, counter: 'The Beast laughs in production incidents. Big-bang rewrites are its favorite food. TRY AGAIN.' },
        { t: 'Add one more patch. What’s the harm.', ok: false, counter: 'The Beast grows a new tentacle. Patch #4,913 accepted. Friction +10. TRY AGAIN.' },
        { t: 'Decouple responsibilities, define clear seams, modernize incrementally.', ok: true }
      ],
      win: 'Good systems reduce future friction.'
    },
    reveal: {
      kicker: 'ARCHITECTURE TOWER UNLOCKED',
      title: 'Systems designed for the next team',
      body: 'Deep experience designing reporting architecture and scalable backends: Temporal-based orchestration, GraphQL APIs, S3-based workflows, CockroachDB/Postgres patterns, and YAML-driven frameworks that other teams build on instead of around.',
      tags: ['Temporal', 'GraphQL', 'S3 workflows', 'CockroachDB / Postgres', 'YAML frameworks']
    }
  },
  {
    id: 'observatory', label: 'Reporting', building: 'Data Observatory', color: '#3aa8a0',
    hint: 'Reporting & insights',
    boss: {
      id: 'oom', name: 'THE OOM MONSTER', epithet: 'It Waits Inside Your Pipeline',
      intro: 'Something bloated squeezes out of the heap…',
      taunt: 'Go on. Load every row. Every KPI. Every report into memory at once. It worked on the demo data. LOAD IT ALL.',
      prompt: 'The dataset is 40 million rows. What’s the move?',
      choices: [
        { t: 'Buy a bigger machine. RAM is cheap.', ok: false, counter: 'The Monster eats the new RAM in one sprint and asks for seconds. Vertical scaling is a snack, not a strategy. TRY AGAIN.' },
        { t: 'Stream, checkpoint, and process in bounded chunks.', ok: true },
        { t: 'Hold it all in one giant list — it worked in the demo.', ok: false, counter: 'Demo data: 100 rows. Production: 40 million. The Monster thanks you for dinner. OOMKilled. TRY AGAIN.' }
      ],
      win: 'Scalability is not magic. It is disciplined flow.'
    },
    reveal: {
      kicker: 'DATA OBSERVATORY UNLOCKED',
      title: 'Reporting that survives production',
      body: 'Built reporting frameworks and insight pipelines — NetPulse among them — that process large KPI volumes without falling over: streaming over loading, S3-based persistence, checkpointed jobs, and memory-conscious PDF and report generation.',
      tags: ['NetPulse', 'KPI pipelines', 'S3 persistence', 'Report generation']
    }
  },
  {
    id: 'lab', label: 'AI Automation', building: 'AI Agent Lab', color: '#8a6cf0',
    hint: 'Agentic workflows',
    boss: {
      id: 'goblin', name: 'THE TOKEN WASTE GOBLIN', epithet: 'Patron Saint of Pasting the Whole Repo',
      intro: 'You hear giggling and the sound of a context window filling…',
      taunt: 'Paste the entire codebase into the prompt! Again! Re-explain the architecture! Every session! Every time! FEED ME TOKENS!',
      prompt: 'How do you make AI actually useful?',
      choices: [
        { t: 'One giant prompt with everything in it, every single time.', ok: false, counter: 'The Goblin backstrokes through your token budget like a dragon through gold. TRY AGAIN.' },
        { t: 'Let the agent freestyle. It’ll figure things out.', ok: false, counter: 'The agent rediscovers your architecture for the 47th time this week. The Goblin giggles. TRY AGAIN.' },
        { t: 'Structured phases + captured tribal knowledge the agent reuses.', ok: true }
      ],
      win: 'AI becomes useful when the workflow is disciplined.'
    },
    reveal: {
      kicker: 'AI AGENT LAB UNLOCKED',
      title: 'AI as an engineering accelerator',
      body: 'I build structured agentic workflows instead of vibes: phased flows like triage → bug filing → codefix → review → verify, Copilot plugin experiments, Jira/Humio/Bitbucket automation, evidence collection, and tribal-knowledge capture so agents stop rediscovering the same facts.',
      tags: ['automatic-pancake', 'Copilot plugins', 'Jira / Humio / Bitbucket', 'Tribal knowledge']
    }
  },
  {
    id: 'garage', label: 'Product', building: 'Innovation Garage', color: '#e8873a',
    hint: 'Ideas & MVPs',
    boss: {
      id: 'dragon', name: 'THE REQUIREMENT FOG DRAGON', epithet: 'Breather of Scope Creep',
      intro: 'A grey fog rolls in. Somewhere inside it, a roadmap grows…',
      taunt: 'The users want… something! Build MORE features! A dashboard! A settings page! Dark mode for the dark mode! MORE!',
      prompt: 'How do you find the real product?',
      choices: [
        { t: 'Ship every feature idea. One of them will stick.', ok: false, counter: 'The Dragon breathes fog on your roadmap. Forty features, zero users. TRY AGAIN.' },
        { t: 'Find the sharpest user pain and ship the smallest thing that solves it.', ok: true },
        { t: 'Schedule six more weeks of stakeholder workshops.', ok: false, counter: 'The fog thickens with every meeting. Alignment is not the same as clarity. TRY AGAIN.' }
      ],
      win: 'A product is not a feature list. It is a solved pain.'
    },
    reveal: {
      kicker: 'INNOVATION GARAGE UNLOCKED',
      title: 'Products grounded in real pain',
      body: 'Product thinking beyond the codebase. The best ideas start from a human being stuck, not a feature list. I build MVPs to test that belief.',
      tags: ['MVP thinking', 'User pain first']
    }
  },
  {
    id: 'library', label: 'Writing', building: 'The Signal Library', color: '#a06a3c',
    hint: 'Communication',
    boss: {
      id: 'kraken', name: 'THE COMPLEXITY KRAKEN', epithet: 'Wrapper of Ideas in Forty Slides',
      intro: 'Tentacles of nested sub-bullets rise from the deep…',
      taunt: 'Your idea is good? EXCELLENT. Bury it in 40 slides! Nest the appendix! Add jargon until leadership’s eyes glaze! No one must ever understand you!',
      prompt: 'The idea must reach engineers AND leadership. How?',
      choices: [
        { t: 'Include every detail. Completeness is clarity.', ok: false, counter: 'Tentacle #12 wraps your audience. They stopped reading at slide 3. TRY AGAIN.' },
        { t: 'More jargon. Sound smarter.', ok: false, counter: '"Synergistic paradigm orchestration." The Kraken purrs. Nobody moves. Nothing ships. TRY AGAIN.' },
        { t: 'One sharp message, structured for the audience.', ok: true }
      ],
      win: 'Clear communication turns ideas into movement.'
    },
    reveal: {
      kicker: 'SIGNAL LIBRARY UNLOCKED',
      title: 'Ideas that actually move',
      body: 'Proposals, presentations, internal idea submissions, and technical writing shaped for the audience in front of me — from deep-dive docs for engineers to one-sharp-message decks for leadership. Complex thing in, clear thing out.',
      tags: ['Proposals', 'Tech writing', 'Presentations', 'Idea shaping']
    }
  },
  {
    id: 'signal', label: 'Contact', building: 'Signal Tower', color: '#d94f4f',
    hint: 'Unlocks at the end',
    boss: {
      id: 'ghost', name: 'THE GHOST OF UNSHIPPED IDEAS', epithet: 'Keeper of Perfect Drafts Nobody Saw',
      intro: 'The air goes cold. Something pale drifts up from the last empty plot…',
      taunt: 'I keep every brilliant thing that was never shared. Polished forever. Shipped never. Your world is almost complete… it would look LOVELY in my collection.',
      prompt: 'One block remains. How does your work reach the world?',
      choices: [
        { t: 'Keep polishing in private until it’s perfect.', ok: false, counter: 'Perfect is the place ideas go to be forgotten. The Ghost files your draft under “Someday.” TRY AGAIN.' },
        { t: 'Wait for someone to discover your work on their own.', ok: false, counter: 'The Ghost whispers: “they never come looking.” Visibility is not vanity. TRY AGAIN.' },
        { t: 'Ship it. Put it in front of people and start the conversation.', ok: true }
      ],
      win: 'Ideas ship when someone sends the signal.'
    },
    reveal: {
      kicker: 'SIGNAL TOWER ONLINE',
      title: 'World complete. Challenges defeated. Systems built.',
      body: 'I build by solving. I solve by thinking clearly. And I turn messy problems into working systems. If you’re building something that needs that — send a signal.',
      tags: []
    }
  }
];

export const CONTACT_LINKS = [
  { label: 'EMAIL ME', href: 'mailto:contact.navnit@gmail.com' },
  { label: 'LINKEDIN', href: 'https://www.linkedin.com/in/padmanavaneethan' },
  { label: 'GITHUB', href: 'https://github.com/navnit' }
];

export const STRINGS = {
  title: 'BUILD MODE',
  subtitle: 'NAVNIT',
  tagline: 'Build the world. Beat the challenges.',
  intro: 'This portfolio starts unfinished. You build it — one block at a time. Every block is guarded by a challenge I’ve actually fought in real engineering work.',
  start: 'PRESS START',
  resume: 'CONTINUE BUILDING',
  hint1: 'PICK A BLOCK FROM THE HOTBAR',
  hint2: 'NOW TAP THE GLOWING PLOT',
  fight: 'FIGHT',
  victory: 'CHALLENGE DEFEATED',
  finalNote: 'You didn’t read this portfolio. You built it.'
};
