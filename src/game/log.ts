import { crises } from './content';
import type { GameLogEntry } from './types';

const crisisNames = new Set(crises.map((crisis) => crisis.name));
const calamityMessages = new Set(crises.map((crisis) => crisis.calamity?.text).filter(Boolean));

export function isCrisisLogEntry(entry: GameLogEntry): boolean {
  if (entry.text.startsWith('Crisis revealed:')) return true;
  if (entry.text.startsWith('Crisis dealt ') || entry.text.startsWith('Averted ') || entry.text.startsWith('Untreated ')) return true;
  if (entry.text.includes('crisis damage') || entry.text.includes('Cascading Disaster')) return true;
  if (entry.text.includes('Plastic Waste Surge')) return true;
  if (calamityMessages.has(entry.text)) return true;
  return crisisNames.has(entry.text.replace(/^Crisis revealed: /, '').replace(/\.$/, ''));
}
