// Spartan AI Toolkit — Pack Definitions
// Loads from YAML manifests in toolkit/packs/. Single source of truth.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifests, detectCycles, toPacks } from './resolver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKS_DIR = join(__dirname, '..', 'packs');

const manifests = loadManifests(PACKS_DIR);
detectCycles(manifests);

const { PACKS, PACK_ORDER } = toPacks(manifests);

export { PACKS, PACK_ORDER };
