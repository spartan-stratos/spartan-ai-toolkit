#!/usr/bin/env node
// Spartan AI Toolkit — Compile YAML manifests to JSON
// Used by prepublish so setup.sh can read packs without Node/js-yaml.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifests, detectCycles, toPacks } from '../lib/resolver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKS_DIR = join(__dirname, '..', 'packs');
const OUTPUT = join(PACKS_DIR, 'packs.compiled.json');

const manifests = loadManifests(PACKS_DIR);
detectCycles(manifests);
const { PACKS, PACK_ORDER } = toPacks(manifests);

const compiled = { PACKS, PACK_ORDER };
writeFileSync(OUTPUT, JSON.stringify(compiled, null, 2) + '\n', 'utf-8');

console.log(`Compiled ${PACK_ORDER.length} packs → ${OUTPUT}`);
