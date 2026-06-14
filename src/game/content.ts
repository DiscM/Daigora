import type { CardDefinition, CrisisDefinition, ProjectAidDefinition } from './types';

export const actionCards: CardDefinition[] = [
  { id: 'community-workshop', name: 'Community Workshop', type: 'Education', costAp: 1, text: '+2 Trust. Cleanse Apathy or Misinformation.', keywords: ['Cleanse'], effects: [{ kind: 'index', index: 'trust', amount: 2 }, { kind: 'cleanse', amount: 1 }] },
  { id: 'school-green-program', name: 'School Green Program', type: 'Education', costAp: 1, text: '+1 Trust. Draw 1 card.', keywords: ['Draw'], effects: [{ kind: 'index', index: 'trust', amount: 1 }, { kind: 'draw', amount: 1 }] },
  { id: 'youth-organizer-network', name: 'Youth Organizer Network', type: 'Education', costAp: 2, text: '+3 Trust. Gain 1 Policy Point.', effects: [{ kind: 'index', index: 'trust', amount: 3 }, { kind: 'policy', amount: 1 }] },
  { id: 'research-briefing', name: 'Research Briefing', type: 'Education', costAp: 1, text: 'Draw 1 card. Gain 1 Policy Point.', keywords: ['Draw'], effects: [{ kind: 'draw', amount: 1 }, { kind: 'policy', amount: 1 }] },
  { id: 'tree-canopy-program', name: 'Tree Canopy Program', type: 'Environmental Work', costAp: 2, text: '+2 Ecology. Restore 2 Planet Health.', effects: [{ kind: 'index', index: 'ecology', amount: 2 }, { kind: 'health', amount: 2 }] },
  { id: 'river-cleanup', name: 'River Cleanup', type: 'Environmental Work', costAp: 1, text: '+1 Ecology. Cleanse Pollution.', keywords: ['Cleanse'], effects: [{ kind: 'index', index: 'ecology', amount: 1 }, { kind: 'cleanse', status: 'Pollution', amount: 1 }] },
  { id: 'community-compost-hub', name: 'Community Compost Hub', type: 'Environmental Work', costAp: 1, text: 'Cleanse Pollution. +1 Trust.', keywords: ['Cleanse'], effects: [{ kind: 'cleanse', status: 'Pollution', amount: 1 }, { kind: 'index', index: 'trust', amount: 1 }] },
  { id: 'wetland-restoration-crew', name: 'Wetland Restoration', type: 'Environmental Work', costAp: 2, text: '+2 Ecology, +1 Coordination. Prevent 1 damage.', effects: [{ kind: 'index', index: 'ecology', amount: 2 }, { kind: 'index', index: 'coordination', amount: 1 }, { kind: 'preventDamage', amount: 1 }] },
  { id: 'native-seed-bank', name: 'Native Seed Bank', type: 'Environmental Work', costAp: 1, text: '+1 Ecology. Draw 1 card.', keywords: ['Draw'], effects: [{ kind: 'index', index: 'ecology', amount: 1 }, { kind: 'draw', amount: 1 }] },
  { id: 'habitat-corridor-project', name: 'Habitat Corridor Project', type: 'Environmental Work', costAp: 2, text: '+3 Ecology. Ongoing: habitat crises deal -1 damage.', keywords: ['Ongoing'], effects: [{ kind: 'index', index: 'ecology', amount: 3 }, { kind: 'ongoingShield', tag: 'habitat', amount: 1 }] },
  { id: 'renewable-grid-buildout', name: 'Renewable Grid', type: 'Technology', costAp: 3, text: '+3 Economy, +1 Ecology. Ongoing: prevent 1 climate damage.', keywords: ['Ongoing'], effects: [{ kind: 'index', index: 'economy', amount: 3 }, { kind: 'index', index: 'ecology', amount: 1 }, { kind: 'ongoingShield', tag: 'climate', amount: 1 }] },
  { id: 'water-purification-network', name: 'Water Network', type: 'Technology', costAp: 2, text: '+2 Ecology. Prevent 2 damage this turn.', effects: [{ kind: 'index', index: 'ecology', amount: 2 }, { kind: 'preventDamage', amount: 2 }] },
  { id: 'predictive-climate-modeling', name: 'Climate Modeling', type: 'Technology', costAp: 2, text: 'Look at the next 2 crises. Gain 1 Economy.', effects: [{ kind: 'peekCrisis', amount: 2 }, { kind: 'index', index: 'economy', amount: 1 }] },
  { id: 'solar-installation-project', name: 'Solar Installation', type: 'Technology', costAp: 1, text: '+2 Economy.', effects: [{ kind: 'index', index: 'economy', amount: 2 }] },
  { id: 'clean-infrastructure-act', name: 'Clean Infrastructure Act', type: 'Policy', costPp: 2, text: '+2 Coordination, +2 Economy.', keywords: ['Exhaust'], effects: [{ kind: 'index', index: 'coordination', amount: 2 }, { kind: 'index', index: 'economy', amount: 2 }] },
  { id: 'regional-response-pact', name: 'Regional Response Pact', type: 'Policy', costPp: 1, text: '+2 Coordination. Prevent 1 damage.', keywords: ['Exhaust'], effects: [{ kind: 'index', index: 'coordination', amount: 2 }, { kind: 'preventDamage', amount: 1 }] },
  { id: 'interagency-taskforce', name: 'Interagency Taskforce', type: 'Policy', costPp: 2, text: '+3 Coordination. Draw 1 card.', keywords: ['Draw', 'Exhaust'], effects: [{ kind: 'index', index: 'coordination', amount: 3 }, { kind: 'draw', amount: 1 }] },
  { id: 'protected-habitat-law', name: 'Protected Habitat Law', type: 'Policy', costPp: 2, text: '+3 Ecology, +1 Coordination.', keywords: ['Exhaust'], effects: [{ kind: 'index', index: 'ecology', amount: 3 }, { kind: 'index', index: 'coordination', amount: 1 }] },
  { id: 'local-policy-petition', name: 'Local Policy Petition', type: 'Education', costAp: 1, text: '+1 Trust. Gain 1 Policy Point.', effects: [{ kind: 'index', index: 'trust', amount: 1 }, { kind: 'policy', amount: 1 }] },
  { id: 'neighborhood-resilience-council', name: 'Resilience Council', type: 'Education', costAp: 1, text: '+1 Coordination. Gain 1 Policy Point.', effects: [{ kind: 'index', index: 'coordination', amount: 1 }, { kind: 'policy', amount: 1 }] },
  { id: 'repair-reuse-campaign', name: 'Repair & Reuse', type: 'Education', costAp: 1, text: '+1 Trust, +1 Economy.', effects: [{ kind: 'index', index: 'trust', amount: 1 }, { kind: 'index', index: 'economy', amount: 1 }] },
  { id: 'emergency-response-network', name: 'Emergency Network', type: 'Emergency', costAp: 1, text: 'Prevent 3 damage. +1 Trust.', effects: [{ kind: 'preventDamage', amount: 3 }, { kind: 'index', index: 'trust', amount: 1 }] },
  { id: 'mutual-aid-response', name: 'Mutual Aid Response', type: 'Emergency', costAp: 1, text: 'Restore 2 Health. +1 Coordination.', effects: [{ kind: 'health', amount: 2 }, { kind: 'index', index: 'coordination', amount: 1 }] },
];

export const statusCards: CardDefinition[] = [
  { id: 'status-pollution', name: 'Pollution', type: 'Status', text: 'When drawn, lose 1 AP unless cleansed.', unplayable: true, effects: [] },
  { id: 'status-apathy', name: 'Apathy', type: 'Status', text: 'Cannot be played. Takes up space.', unplayable: true, effects: [] },
  { id: 'status-misinformation', name: 'Misinformation', type: 'Status', text: 'Next Education or Policy costs +1 AP.', unplayable: true, effects: [] },
  { id: 'status-delay', name: 'Delay', type: 'Status', text: 'Next Technology or Policy loses momentum.', unplayable: true, effects: [] },
  { id: 'status-backlash', name: 'Backlash', type: 'Status', text: 'When drawn, lose 1 Trust, then exhaust.', unplayable: true, effects: [] },
];

export const allCards = [...actionCards, ...statusCards];

export const cardById = Object.fromEntries(allCards.map((card) => [card.id, card]));

export const starterDeckIds = [
  'community-workshop',
  'river-cleanup',
  'river-cleanup',
  'tree-canopy-program',
  'community-compost-hub',
  'native-seed-bank',
  'emergency-response-network',
  'mutual-aid-response',
  'repair-reuse-campaign',
  'solar-installation-project',
  'local-policy-petition',
  'neighborhood-resilience-council',
  'research-briefing',
  'clean-infrastructure-act',
  'regional-response-pact',
];

export const crises: CrisisDefinition[] = [
  { id: 'heat-dome', name: 'Heat Dome', text: 'Deal 3 damage. -2 Ecology.', effects: [{ kind: 'health', amount: -3 }, { kind: 'index', index: 'ecology', amount: -2 }], calamity: { index: 'coordination', threshold: 3, text: 'Low Coordination adds 3 damage.', effects: [{ kind: 'health', amount: -3 }] } },
  { id: 'aging-water-infrastructure', name: 'Aging Water Infrastructure', text: '-2 Trust, -3 Ecology.', effects: [{ kind: 'index', index: 'trust', amount: -2 }, { kind: 'index', index: 'ecology', amount: -3 }], calamity: { index: 'trust', threshold: 3, text: 'Public confidence fails: add Apathy.', effects: [] } },
  { id: 'industrial-pollution-corridor', name: 'Industrial Pollution Corridor', text: 'Add 3 Pollution. -2 Ecology.', effects: [{ kind: 'index', index: 'ecology', amount: -2 }], calamity: { index: 'ecology', threshold: 3, text: 'Ecosystem Collapse.', effects: [{ kind: 'health', amount: -5 }] } },
  { id: 'plastic-waste-surge', name: 'Plastic Waste Surge', text: 'Add 2 Pollution. Deal 3 damage.', effects: [{ kind: 'health', amount: -3 }] },
  { id: 'public-burnout', name: 'Public Burnout', text: '-3 Trust. Draw 1 fewer next turn.', effects: [{ kind: 'index', index: 'trust', amount: -3 }] },
  { id: 'deforestation-surge', name: 'Deforestation Surge', text: '-3 Ecology, deal 1 damage. If untreated, lose 3 more Health.', effects: [{ kind: 'index', index: 'ecology', amount: -3 }, { kind: 'health', amount: -1 }] },
  { id: 'supply-chain-shock', name: 'Supply Chain Shock', text: '-3 Economy. Technology costs +1 this turn.', effects: [{ kind: 'index', index: 'economy', amount: -3 }] },
  { id: 'diplomatic-gridlock', name: 'Diplomatic Gridlock', text: '-3 Coordination. Policy costs +1 PP this turn.', effects: [{ kind: 'index', index: 'coordination', amount: -3 }] },
  { id: 'extreme-weather-season', name: 'Extreme Weather Season', text: '-2 Ecology, -1 Economy, deal 3 damage.', effects: [{ kind: 'index', index: 'ecology', amount: -2 }, { kind: 'index', index: 'economy', amount: -1 }, { kind: 'health', amount: -3 }] },
  { id: 'misleading-campaign', name: 'Misleading Campaign', text: 'Add Misinformation and Backlash. -2 Trust.', effects: [{ kind: 'index', index: 'trust', amount: -2 }] },
];

export const crisisById = Object.fromEntries(crises.map((crisis) => [crisis.id, crisis]));

export const projectAids: ProjectAidDefinition[] = [
  { id: 'educator', name: 'The Educator', role: 'Community learning specialist', passive: 'First Education card each turn gives +1 Trust.', drawback: 'Technology costs +1 if Trust is below 4.' },
  { id: 'ecologist', name: 'The Ecologist', role: 'Habitat and wildlife specialist', passive: 'When Ecology is restored, restore +1 more once per turn.', drawback: 'Economy starts 1 point lower.' },
  { id: 'engineer', name: 'The Engineer', role: 'Clean systems designer', passive: 'First Technology card each turn costs 1 less.', drawback: 'Trust gains reduced if no Education is played.' },
  { id: 'policy-advocate', name: 'The Policy Advocate', role: 'Institutional strategist', passive: 'Gain +1 Policy Point whenever a Policy card is played.', drawback: 'If Coordination drops below 3, lose 1 Trust.' },
  { id: 'disaster-responder', name: 'The Disaster Responder', role: 'Emergency planner', passive: 'First crisis damage each turn is reduced by 1.', drawback: 'Long-term solution cards do not gain bonus effects.' },
];
