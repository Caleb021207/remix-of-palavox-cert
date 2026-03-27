// 100+ diverse topics for reading comprehension variety
export const READING_TOPIC_POOL = [
  // News & Current Events
  'breaking news reports', 'political elections', 'economic trends', 'scientific breakthroughs', 'technology announcements',
  'environmental policies', 'international relations', 'healthcare reforms', 'education updates', 'social movements',
  
  // Science & Technology
  'space exploration', 'artificial intelligence', 'quantum computing', 'renewable energy', 'biotechnology',
  'nanotechnology', 'robotics', 'climate science', 'medical research', 'genetic engineering',
  
  // Culture & Society
  'cultural festivals', 'traditional customs', 'religious practices', 'social norms', 'generational differences',
  'urban vs rural life', 'immigration stories', 'multiculturalism', 'language preservation', 'folk traditions',
  
  // Arts & Entertainment
  'literature analysis', 'art movements', 'music history', 'film criticism', 'theater productions',
  'poetry interpretation', 'architecture styles', 'photography', 'dance forms', 'sculpture',
  
  // History & Biography
  'historical events', 'famous figures', 'ancient civilizations', 'wars and conflicts', 'revolutions',
  'industrial era', 'colonial period', 'independence movements', 'historical mysteries', 'archaeological discoveries',
  
  // Business & Economics
  'market trends', 'entrepreneurship', 'startup culture', 'corporate strategies', 'financial planning',
  'investment advice', 'global trade', 'economic theories', 'consumer behavior', 'business ethics',
  
  // Environment & Nature
  'wildlife conservation', 'ecosystem balance', 'natural disasters', 'weather patterns', 'ocean life',
  'forest preservation', 'endangered species', 'climate change', 'sustainable living', 'pollution control',
  
  // Psychology & Philosophy
  'cognitive psychology', 'behavioral studies', 'philosophical debates', 'ethical dilemmas', 'consciousness',
  'mental health', 'human behavior', 'moral philosophy', 'existentialism', 'social psychology',
  
  // Travel & Geography
  'destination guides', 'cultural experiences', 'adventure travel', 'city profiles', 'natural wonders',
  'travel tips', 'tourist attractions', 'local customs', 'geographical features', 'exploration stories',
  
  // Health & Wellness
  'nutrition science', 'fitness programs', 'mental wellness', 'disease prevention', 'medical treatments',
  'holistic health', 'sleep science', 'stress management', 'aging research', 'public health',
  
  // Education & Learning
  'teaching methods', 'educational technology', 'learning theories', 'study techniques', 'literacy programs',
  'higher education', 'vocational training', 'lifelong learning', 'educational reform', 'skill development'
];

export function getRandomTopic(): string {
  return READING_TOPIC_POOL[Math.floor(Math.random() * READING_TOPIC_POOL.length)];
}

export function getTextTypeForLevel(level: string): string {
  const textTypes = {
    'A1': ['simple description', 'basic announcement', 'short notice'],
    'A2': ['personal narrative', 'simple article', 'basic instructions'],
    'B1': ['news article', 'opinion piece', 'expository essay'],
    'B2': ['analytical article', 'editorial', 'research summary'],
    'Advanced': ['short story', 'literary essay', 'critical analysis']
  };
  
  const types = textTypes[level as keyof typeof textTypes] || textTypes['B1'];
  return types[Math.floor(Math.random() * types.length)];
}
