import type { ActiveClass, Category, PhaseId } from '../engine';
import type { Messages } from './es';

/** What the plan needs to know about a product to name a phase. */
export interface PhaseProduct {
  name: string;
  category: Category;
  actives: ActiveClass[];
}

/** Name and description of a phase. Trial phases are named after their product. */
export function phaseText(t: Messages, id: PhaseId, product?: PhaseProduct): { name: string; desc: string } {
  if (id === 'reset' || id === 'keep') return t.phase[id];
  const d = t.phase.trial;
  const desc = product?.category === 'oil-cleanser' ? d.oilCleanser
    : product?.category === 'moisturizer' ? d.moisturizer
    : product?.actives.includes('aha') ? d.aha
    : product?.category === 'serum' ? d.serum
    : d.default;
  return { name: product?.name ?? t.common.product, desc };
}
