// Auto-detect expense category from description text

export const CATEGORIES = {
  'Food & Dining': {
    color: '#f97316',
    bg: 'bg-orange-500',
    light: 'bg-orange-100 text-orange-700',
    icon: '🍽️',
    keywords: ['restaurant','food','pizza','burger','cafe','coffee','starbucks','dunkin',
      'mcdonald','chipotle','subway','domino','doordash','grubhub','ubereats','sushi',
      'taco','diner','grill','kitchen','eat','dining','wendy','chick-fil','panera',
      'panda','five guys','shake shack','cheesecake','olive garden','applebee'],
  },
  'Groceries': {
    color: '#10b981',
    bg: 'bg-emerald-500',
    light: 'bg-emerald-100 text-emerald-700',
    icon: '🛒',
    keywords: ['grocery','supermarket','walmart','target','kroger','whole foods',
      'trader joe','safeway','costco','aldi','publix','market','wegmans','h-e-b',
      'meijer','stop & shop','food lion','giant','sprouts'],
  },
  'Transportation': {
    color: '#3b82f6',
    bg: 'bg-blue-500',
    light: 'bg-blue-100 text-blue-700',
    icon: '🚗',
    keywords: ['uber','lyft','taxi','gas','fuel','parking','transit','metro','bus',
      'train','amtrak','greyhound','bp','shell','chevron','exxon','marathon',
      'speedway','circle k','caseys'],
  },
  'Travel': {
    color: '#8b5cf6',
    bg: 'bg-violet-500',
    light: 'bg-violet-100 text-violet-700',
    icon: '✈️',
    keywords: ['hotel','airbnb','booking','expedia','vacation','resort','hostel',
      'airline','delta','united','american airlines','southwest','spirit','jetblue',
      'marriott','hilton','hyatt','ihg','hampton inn','holiday inn'],
  },
  'Shopping': {
    color: '#ec4899',
    bg: 'bg-pink-500',
    light: 'bg-pink-100 text-pink-700',
    icon: '🛍️',
    keywords: ['amazon','shop','mall','retail','clothing','apparel','nike','adidas',
      'zara','h&m','best buy','apple store','ikea','home depot','lowes','bed bath',
      'nordstrom','macys','gap','old navy','forever 21','tj maxx','marshalls'],
  },
  'Entertainment': {
    color: '#a855f7',
    bg: 'bg-purple-500',
    light: 'bg-purple-100 text-purple-700',
    icon: '🎬',
    keywords: ['netflix','spotify','hulu','disney','movie','cinema','theater',
      'concert','game','gaming','steam','playstation','xbox','twitch','youtube',
      'apple music','amazon prime','hbo','paramount','peacock'],
  },
  'Bills & Utilities': {
    color: '#eab308',
    bg: 'bg-yellow-500',
    light: 'bg-yellow-100 text-yellow-700',
    icon: '💡',
    keywords: ['electric','water','gas bill','internet','phone','mobile','at&t',
      'verizon','t-mobile','comcast','xfinity','spectrum','cox','frontier',
      'utility','electric','pge','con ed','duke energy','subscription'],
  },
  'Healthcare': {
    color: '#14b8a6',
    bg: 'bg-teal-500',
    light: 'bg-teal-100 text-teal-700',
    icon: '🏥',
    keywords: ['pharmacy','cvs','walgreens','rite aid','doctor','hospital',
      'medical','health','dental','vision','insurance','lab','clinic','urgent care'],
  },
  'Rent & Housing': {
    color: '#6366f1',
    bg: 'bg-indigo-500',
    light: 'bg-indigo-100 text-indigo-700',
    icon: '🏠',
    keywords: ['rent','mortgage','lease','apartment','housing','hoa','property'],
  },
  'Education': {
    color: '#0ea5e9',
    bg: 'bg-sky-500',
    light: 'bg-sky-100 text-sky-700',
    icon: '📚',
    keywords: ['tuition','university','college','course','udemy','coursera','books',
      'textbook','school','education','learning','training'],
  },
  'Personal Care': {
    color: '#f43f5e',
    bg: 'bg-rose-500',
    light: 'bg-rose-100 text-rose-700',
    icon: '💆',
    keywords: ['salon','haircut','spa','massage','beauty','barber','nail',
      'skincare','ulta','sephora','bath & body'],
  },
  'Other': {
    color: '#94a3b8',
    bg: 'bg-slate-500',
    light: 'bg-slate-100 text-slate-700',
    icon: '📦',
    keywords: [],
  },
};

export function detectCategory(description) {
  if (!description) return 'Other';
  const lower = description.toLowerCase();
  for (const [cat, { keywords }] of Object.entries(CATEGORIES)) {
    if (cat === 'Other') continue;
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return 'Other';
}

export function getCategoryColor(cat) {
  return CATEGORIES[cat]?.color ?? CATEGORIES.Other.color;
}

export function getCategoryIcon(cat) {
  return CATEGORIES[cat]?.icon ?? '📦';
}

export function getCategoryLight(cat) {
  return CATEGORIES[cat]?.light ?? CATEGORIES.Other.light;
}

export const ALL_CATEGORIES = Object.keys(CATEGORIES);
