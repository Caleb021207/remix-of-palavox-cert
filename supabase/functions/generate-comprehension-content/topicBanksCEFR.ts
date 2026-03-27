export interface TopicBank {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  section: 'reading' | 'listening' | 'writing' | 'speaking';
  topics: string[];
}

export const TOPIC_BANKS: TopicBank[] = [
  // A1 - Concrete, personal, immediate
  { level: 'A1', section: 'reading', topics: [
    'daily routines', 'family members', 'favorite foods', 'simple weather', 
    'basic colors', 'common animals', 'parts of house', 'school objects',
    'days of week', 'telling time', 'personal belongings', 'simple greetings'
  ]},
  { level: 'A1', section: 'listening', topics: [
    'ordering food', 'asking directions', 'shopping basics', 'introducing yourself',
    'making appointments', 'talking about weather', 'describing appearance', 'basic phone calls'
  ]},
  { level: 'A1', section: 'writing', topics: [
    'describe your family', 'your favorite meal', 'your daily schedule', 'your bedroom',
    'your best friend', 'what you wear', 'your morning routine', 'your pet'
  ]},
  { level: 'A1', section: 'speaking', topics: [
    'introduce yourself', 'describe where you live', 'talk about hobbies', 'describe your job',
    'your weekend plans', 'favorite season', 'what you like to eat', 'simple preferences'
  ]},
  
  // A2 - Familiar situations, simple descriptions
  { level: 'A2', section: 'reading', topics: [
    'weekend activities', 'simple travel plans', 'school experiences', 'health and fitness',
    'hobbies and interests', 'shopping habits', 'local transportation', 'simple instructions',
    'neighborhood description', 'past events', 'future plans', 'simple problems'
  ]},
  { level: 'A2', section: 'listening', topics: [
    'booking hotels', 'restaurant reservations', 'asking for help', 'describing problems',
    'making plans with friends', 'doctor appointments', 'phone conversations', 'public announcements'
  ]},
  { level: 'A2', section: 'writing', topics: [
    'weekend plans', 'describe a trip', 'thank you note', 'describe your job',
    'favorite holiday', 'school project', 'describe a problem', 'invitation letter'
  ]},
  { level: 'A2', section: 'speaking', topics: [
    'describe your hometown', 'talk about vacation', 'explain a problem', 'describe an experience',
    'your job duties', 'compare two things', 'make plans', 'give simple advice'
  ]},
  
  // B1 - Familiar topics, abstract ideas, opinions
  { level: 'B1', section: 'reading', topics: [
    'social media impact', 'environmental awareness', 'work-life balance', 'cultural differences',
    'technology in education', 'healthy lifestyles', 'urban development', 'travel experiences',
    'personal achievements', 'career choices', 'community issues', 'consumer rights'
  ]},
  { level: 'B1', section: 'listening', topics: [
    'job interviews', 'customer complaints', 'news reports', 'informal debates',
    'explaining processes', 'giving presentations', 'negotiating', 'problem-solving discussions'
  ]},
  { level: 'B1', section: 'writing', topics: [
    'letter to friend about problem', 'opinion on social issue', 'describe a life event', 'compare two options',
    'explain a disagreement', 'travel blog post', 'recommendation letter', 'explain a decision'
  ]},
  { level: 'B1', section: 'speaking', topics: [
    'tell a story', 'explain a complex process', 'defend an opinion', 'describe a challenge',
    'give detailed directions', 'explain cause and effect', 'compare experiences', 'discuss future plans'
  ]},
  
  // B2 - Complex abstract ideas, specialized topics
  { level: 'B2', section: 'reading', topics: [
    'climate policy debates', 'education reform', 'digital privacy', 'economic inequality',
    'globalization effects', 'healthcare systems', 'renewable energy', 'artificial intelligence ethics',
    'immigration policy', 'workplace automation', 'mental health awareness', 'sustainable development'
  ]},
  { level: 'B2', section: 'listening', topics: [
    'policy debates', 'academic lectures', 'professional meetings', 'technical explanations',
    'research presentations', 'expert interviews', 'panel discussions', 'formal negotiations'
  ]},
  { level: 'B2', section: 'writing', topics: [
    'persuasive essay on policy', 'analyze a social trend', 'formal complaint', 'research proposal',
    'critical review', 'compare theories', 'problem-solution essay', 'argumentative letter'
  ]},
  { level: 'B2', section: 'speaking', topics: [
    'debate controversial topic', 'present research findings', 'analyze complex issue', 'discuss hypothetical scenarios',
    'evaluate pros and cons', 'defend abstract position', 'synthesize multiple viewpoints', 'explain technical concepts'
  ]},
  
  // C1 - Complex, nuanced, specialized domains
  { level: 'C1', section: 'reading', topics: [
    'constitutional law', 'macroeconomic theory', 'neuroscience research', 'political philosophy',
    'quantum physics', 'literary criticism', 'historical analysis', 'ethical frameworks',
    'cognitive psychology', 'international relations', 'public policy analysis', 'scientific methodology'
  ]},
  { level: 'C1', section: 'listening', topics: [
    'academic symposiums', 'legal proceedings', 'philosophical debates', 'scientific conferences',
    'policy round tables', 'expert consultations', 'literary discussions', 'theoretical analyses'
  ]},
  { level: 'C1', section: 'writing', topics: [
    'analyze philosophical argument', 'critique research methodology', 'policy recommendation', 'theoretical framework',
    'comparative analysis', 'synthesize scholarly sources', 'evaluate competing theories', 'defend academic position'
  ]},
  { level: 'C1', section: 'speaking', topics: [
    'present original research', 'defend theoretical position', 'analyze abstract concepts', 'critique methodology',
    'synthesize complex ideas', 'discuss implications', 'evaluate paradigm shift', 'explain nuanced distinctions'
  ]},
  
  // C2 - Abstract, expert-level, cross-disciplinary
  { level: 'C2', section: 'reading', topics: [
    'epistemology', 'postmodern theory', 'bioethics', 'geopolitical strategy',
    'advanced statistics', 'philosophical logic', 'comparative literature', 'systems theory',
    'cultural anthropology', 'theoretical physics', 'political economy', 'semiotics'
  ]},
  { level: 'C2', section: 'listening', topics: [
    'interdisciplinary conferences', 'philosophical colloquia', 'advanced seminars', 'theoretical debates',
    'expert panel discussions', 'specialized workshops', 'academic forums', 'scholarly symposiums'
  ]},
  { level: 'C2', section: 'writing', topics: [
    'develop original theory', 'cross-disciplinary analysis', 'deconstruct assumptions', 'synthesize paradigms',
    'critique epistemology', 'propose framework', 'analyze systemic issues', 'evaluate philosophical positions'
  ]},
  { level: 'C2', section: 'speaking', topics: [
    'defend original thesis', 'synthesize disciplines', 'analyze epistemological foundations', 'critique theoretical frameworks',
    'discuss ontological questions', 'evaluate systemic change', 'deconstruct complex arguments', 'integrate multiple paradigms'
  ]}
];

// Helper function: Get topics for a given level and section
export function getTopicsForLevelAndSection(level: string, section: string): string[] {
  const bank = TOPIC_BANKS.find(b => b.level === level && b.section === section);
  return bank?.topics || [];
}

// Helper function: Select a topic excluding recently used ones
export function selectFreshTopic(
  level: string, 
  section: string, 
  excludeTopics: string[] = []
): string {
  const availableTopics = getTopicsForLevelAndSection(level, section);
  const freshTopics = availableTopics.filter(t => !excludeTopics.includes(t));
  
  if (freshTopics.length === 0) {
    console.warn(`⚠️ All topics exhausted for ${level}/${section}, resetting exclusion list`);
    return availableTopics[Math.floor(Math.random() * availableTopics.length)];
  }
  
  return freshTopics[Math.floor(Math.random() * freshTopics.length)];
}

// Helper function: Generate topic hash for tracking
export function hashTopic(level: string, section: string, topic: string): string {
  const combined = `${level}-${section}-${topic}`;
  // Simple hash function for Deno edge functions (no Node crypto)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 16);
}

// Helper function: Decode topic hash back to topic name
export function decodeTopicHash(hash: string, level: string, section: string): string | null {
  const topics = getTopicsForLevelAndSection(level, section);
  for (const topic of topics) {
    if (hashTopic(level, section, topic) === hash) {
      return topic;
    }
  }
  return null;
}
