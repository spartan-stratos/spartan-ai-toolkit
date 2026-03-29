
---

## UX Design Workflow

**Stack:** Platform-agnostic UX research and design — works for web, mobile, or any digital product.

**The full design pipeline:**
```
/spartan:ux                     ← smart router: asks what you need
/spartan:ux research            ← Phase 1: User discovery
/spartan:ux define              ← Phase 2: Problem definition
/spartan:ux ideate              ← Phase 3: Solution exploration
/spartan:ux system              ← Design system setup (tokens + components)
/spartan:ux prototype           ← Phase 4: Screen design + Design Gate
/spartan:ux test                ← Phase 5: Usability testing plan
/spartan:ux handoff             ← Phase 6: Developer handoff spec
/spartan:ux qa                  ← Phase 7: Design QA checklist
/spartan:ux audit               ← Mid-stream: scan what exists, find gaps
```

### 3 Maturity Tracks

| Track | Phases | Time | When to use |
|-------|--------|------|-------------|
| **Quick** | prototype → handoff | 1-2 hours | Small UI change, single component |
| **Standard** | research → define → prototype → test → handoff | 1-3 days | Real feature with users |
| **Full** | All 7 phases | 1-3 weeks | New product, major redesign |

### Design Artifacts Location

```
.planning/design/
├── research/          ← User interviews, competitors, insights
├── definition/        ← Personas, journey map, problem brief
├── ideation/          ← Ideas, user flows
├── system/            ← Design tokens, component inventory
└── screens/           ← Per-feature screen designs
```

### Design Token Enforcement

Once design tokens exist, ALL downstream commands enforce them:
- `/spartan:build` injects tokens into agent prompts
- `/spartan:fe-review` checks token compliance (Stage 8)
- `/spartan:next-feature` scaffolds with project tokens
- `design-critic` agent hard-fails on token mismatches

### Works With Other Workflows

| You're running... | UX integration |
|-------------------|---------------|
| `/spartan:build frontend` | Checks for design tokens, nudges if missing |
| `/spartan:spec` (UI feature) | Checks for user research, suggests if missing |
| `/spartan:fe-review` | Checks code against design tokens |
| `/spartan:figma-to-code` | Merges with existing design tokens if they exist |
