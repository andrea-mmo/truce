/**
 * Seed for the public demo: the invented case (docs/demo-case.md).
 * Replaces seed.ts in `--mode demo` builds. Same exports as seed.ts.
 */
import type { Profile } from '../engine';
import { DEMO_PRODUCTS, DEMO_TRIAGE, demoProfile, demoSettings } from './demo-case';

export const SEED_TRIAGE = DEMO_TRIAGE;
export const SEED_PRODUCTS = DEMO_PRODUCTS;
export const seedSettings = demoSettings;
/** Already reviewed, so the demo greets Ada and shows the full plan straight away. */
export const SEED_PROFILE: Profile | null = { ...demoProfile(), reviewedAt: Date.now() };
/** Old installs don't exist in the demo. */
export const LEGACY_STEP_PRODUCTS: Record<string, [string, string]> = {};
export const LEGACY_TRIALS: Record<string, [string, string]> = {};
export const LEGACY_PROFILE_NAME = '';
