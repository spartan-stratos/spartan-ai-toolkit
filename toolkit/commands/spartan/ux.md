---
name: spartan:ux
description: "UX design workflow — research, define, ideate, design system, prototype, test, handoff, QA"
argument-hint: "[research|define|ideate|system|prototype|test|handoff|qa|audit]"
---

# UX: {{ args[0] | default: "smart router" }}

You are the **UX design workflow leader** — the full pipeline from user research to developer handoff and design QA.

This command covers the whole UX process. Each sub-command is a phase. You can run them in order, or jump to any phase if you already have the upstream artifacts.

```
FULL UX PIPELINE:

  Research → Define → Ideate → System → Prototype → Test → Handoff → QA
      │          │        │        │          │          │       │       │
   insights   brief    flows   tokens   screens+gate  results  specs  checklist
      │          │        │        │          │          │       │       │
   .planning/design/research/  definition/  ideation/  system/  screens/  test-results.md
```

**Quick paths:**
- New project, starting fresh → run phases in order
- Existing project, need screens → jump to `prototype`
- Design system setup only → run `system`
- Check what's done → run with no args (smart router)
- Check gaps mid-stream → run `audit`

---

{% if args[0] == null or args[0] == "" %}

## Smart Router

Let me check what exists and figure out where you are.

```bash
ls .planning/design/ 2>/dev/null
ls .planning/design/research/ 2>/dev/null
ls .planning/design/definition/ 2>/dev/null
ls .planning/design/ideation/ 2>/dev/null
ls .planning/design/system/ 2>/dev/null
ls .planning/design/screens/ 2>/dev/null
ls .planning/design/test-results.md 2>/dev/null
ls .planning/design-config.md .claude/design-config.md 2>/dev/null
```

### If no `.planning/design/` directory exists

This is a fresh start. Ask the user what size project this is:

> "No design artifacts found. What size is this project?"
>
> - **A) Quick track** — Small feature. Skip research/define, go straight to system + prototype. (1 session)
> - **B) Standard track** — New feature with some UI. Research + define + prototype. (2-3 sessions)
> - **C) Full track** — New product or big redesign. All phases, start to finish. (3-5 sessions)
>
> I'd pick **A** for most single-feature work.

After user picks:
- **Quick** → Run `system` then `prototype`
- **Standard** → Run `research` then `define` then `prototype`
- **Full** → Run all phases in order

### If `.planning/design/` exists

Scan the artifacts and show status:

```markdown
## UX Pipeline Status

| Phase | Status | Artifact |
|-------|--------|----------|
| Research | [done/missing] | .planning/design/research/insights.md |
| Define | [done/missing] | .planning/design/definition/brief.md |
| Ideate | [done/missing] | .planning/design/ideation/flows.md |
| System | [done/missing] | .planning/design/system/tokens.md |
| Prototype | [done/missing] | .planning/design/screens/*.md |
| Test | [done/missing] | .planning/design/test-results.md |
| Handoff | [done/missing] | (notes added to screen files) |
| QA | [done/missing] | .planning/design/qa-checklist.md |
```

Then suggest:
> "Next step: `/spartan:ux [next missing phase]`"

{% elif args[0] == "research" %}

## Phase 1: User Research

Goal: Understand the users, their problems, and the space. Save findings to `.planning/design/research/insights.md`.

```bash
mkdir -p .planning/design/research
```

### Step 1: Pick a research method

> "How do you want to research?"
>
> - **A) Interview script** — I'll write questions you can ask real users (best for early-stage)
> - **B) Data synthesis** — You paste user data (surveys, support tickets, analytics) and I'll find patterns
> - **C) Competitive research** — I'll look at how competitors solve this problem
> - **D) All of the above** — Full research (takes longer, better results)
>
> I'd pick **A** if you have access to users, **C** if you don't.

### Step 2: Interview script (if A or D)

Generate 5-7 open-ended interview questions. Follow the Mom Test rules — ask about their life, not your idea.

**Question format:**
- Start with behavior: "Tell me about the last time you..."
- Ask about frequency: "How often do you..."
- Ask about pain: "What's the hardest part about..."
- Ask about current solutions: "How do you handle... today?"
- Ask about stakes: "What happens when this goes wrong?"

**Do NOT ask:**
- "Would you use a tool that..." (leading)
- "Do you like..." (yes/no, useless)
- "What features would you want?" (users can't design)

Save the script to `.planning/design/research/interview-script.md`.

### Step 3: Data synthesis (if B or D)

If the user pastes data (survey results, support tickets, analytics, user feedback):

1. Read all the data
2. Group findings into themes (3-5 themes max)
3. For each theme: what users said, how many mentioned it, severity
4. Pull out direct quotes that show the pain
5. Flag anything surprising or contradictory

### Step 4: Competitive research (if C or D)

Use WebSearch to find 3-5 competitors or similar products. For each:

| Competitor | What they do well | What they do poorly | Gap we can fill |
|-----------|------------------|--------------------|--------------------|
| [name] | [strength] | [weakness] | [our angle] |

Look at their UX patterns: navigation, onboarding, key flows, empty states, error handling.

### Step 5: Empathy map

From all research, build an empathy map:

```markdown
## Empathy Map: [User Type]

### Says
- "[direct quote or paraphrase]"

### Thinks
- [what they're worried about]

### Does
- [current behavior and workarounds]

### Feels
- [emotions: frustrated, confused, anxious, etc.]
```

### Step 6: How Might We questions

Generate 5-8 "How Might We" questions from the research:

```markdown
## How Might We...

1. HMW make [pain point] less painful for [user type]?
2. HMW help [user type] when [specific situation]?
3. HMW reduce the time it takes to [task]?
...
```

### Step 7: Save

Save everything to `.planning/design/research/insights.md`. Include:
- Research method(s) used
- Key findings (grouped by theme)
- Empathy map
- HMW questions
- Competitive landscape (if researched)

> "Research saved to `.planning/design/research/insights.md`."
>
> **Next:** `/spartan:ux define {{ args[1] | default: "" }}` to turn insights into a design brief.

{% elif args[0] == "define" %}

## Phase 2: Problem Definition

Goal: Turn research into a clear problem statement, personas, and success metrics. Save to `.planning/design/definition/brief.md`.

```bash
mkdir -p .planning/design/definition
```

### Step 1: Read upstream artifacts

```bash
cat .planning/design/research/insights.md 2>/dev/null
cat .planning/specs/*.md 2>/dev/null
```

If research exists, use it. If not, ask the user to describe the problem and users.

### Step 2: Problem statement

Guide the user to fill this format:

> **[User type] needs [need] because [insight].**

Example: "Sales managers need a way to see which deals are stalling because they currently check 3 different tools and still miss at-risk deals."

Ask:
> "Let's write the problem statement. Fill in:"
>
> - **Who** is the user? (job title, not demographics)
> - **What** do they need to do?
> - **Why** is this hard today?
>
> I'll combine these into a clear problem statement.

### Step 3: Personas (2-3 max)

Build behavior-based personas. NOT demographic profiles. Focus on what they do and what gets in their way.

```markdown
## Persona: [Name] — [Role]

**Goal:** [what they're trying to do]
**Behavior:** [how they work today]
**Frustration:** [what blocks them]
**Trigger:** [when they'd reach for this product]
**Success looks like:** [how they'd know it worked]
```

Keep to 2-3 personas. More than that means the scope is too wide.

### Step 4: User journey map

Map the current experience (before your solution):

```markdown
## Journey: [Main task]

| Stage | Action | Thinking | Feeling | Pain point |
|-------|--------|----------|---------|------------|
| [stage] | [what they do] | [what they wonder] | [emotion] | [what's broken] |
```

Mark the worst pain points with severity: High / Medium / Low.

### Step 5: Success metrics

Define 3-5 measurable outcomes:

```markdown
## Success Metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| [metric] | [baseline or "unknown"] | [goal] | [measurement method] |
```

### Step 6: Scope

Draw a clear line around v1:

```markdown
## Scope

### IN for v1
- [what we'll build]
- [what we'll build]

### OUT for v1 (maybe later)
- [what we won't build yet]
- [what we won't build yet]

### Hard constraints
- [tech limits, timeline, etc.]
```

### Step 7: Save

Save to `.planning/design/definition/brief.md`.

> "Brief saved to `.planning/design/definition/brief.md`."
>
> **Next:** `/spartan:ux ideate {{ args[1] | default: "" }}` to explore solutions.

{% elif args[0] == "ideate" %}

## Phase 3: Solution Exploration

Goal: Generate ideas, pick the best, and sketch user flows. Save to `.planning/design/ideation/flows.md`.

```bash
mkdir -p .planning/design/ideation
```

### Step 1: Read upstream artifacts

```bash
cat .planning/design/definition/brief.md 2>/dev/null
cat .planning/design/research/insights.md 2>/dev/null
```

If brief exists, use the problem statement and personas as input. If not, ask the user to describe what they're solving.

### Step 2: Crazy 8s — generate ideas

Generate 8-12 solution ideas. Each idea gets one line. Mix safe and wild ideas.

```markdown
## Ideas

1. [safe, obvious approach]
2. [variation on #1]
3. [different angle]
4. [what if we removed X?]
5. [what if we automated Y?]
6. [copy what [competitor] does but better]
7. [wild idea — probably too much but interesting]
8. [simplest possible version]
9. [what would [reference app] do?]
10. [combine #3 and #8]
...
```

For each idea, add a one-line gut check: time to build (days), risk (low/med/high), user value (low/med/high).

### Step 3: Pick top 3

> "Here are the ideas ranked by value-to-effort ratio. My top 3:"
>
> 1. **[idea]** — [why it's good]
> 2. **[idea]** — [why it's good]
> 3. **[idea]** — [why it's good]
>
> Which ones do you want to explore? Pick 1-3.
>
> I'd go with **#1** for v1.

### Step 4: User flows for top picks

For each picked idea, sketch the full user flow:

```markdown
## Flow: [Idea name]

**Entry point:** [how user gets here]
**Happy path:**

1. User [action] → sees [result]
2. User [action] → sees [result]
3. User [action] → sees [result]
4. Done → [outcome]

**Error paths:**
- If [condition] → show [error state]
- If [condition] → redirect to [fallback]

**Edge cases:**
- Empty data → [what happens]
- Too much data → [what happens]
- Offline / slow connection → [what happens]
```

### Step 5: Information architecture

Map out where things live:

```markdown
## Information Architecture

### Navigation
- [section 1]
  - [page A]
  - [page B]
- [section 2]
  - [page C]

### Data relationships
- [entity] has many [entity]
- [entity] belongs to [entity]

### Key screens
1. [screen name] — [what it shows]
2. [screen name] — [what it shows]
...
```

### Step 6: Save

Save to `.planning/design/ideation/flows.md`.

> "Flows saved to `.planning/design/ideation/flows.md`."
>
> **Next:** `/spartan:ux system {{ args[1] | default: "" }}` to set up design tokens, or `/spartan:ux prototype {{ args[1] | default: "" }}` if you already have a design system.

{% elif args[0] == "system" %}

## Phase 4: Design System Setup

Goal: Create design tokens and a component inventory. Save to `.planning/design/system/`.

```bash
mkdir -p .planning/design/system
```

### Step 1: Load the design-intelligence skill

Load the `design-intelligence` skill. This has the databases for palettes, typography, and component patterns.

### Step 2: Check for existing config

```bash
cat .planning/design-config.md 2>/dev/null
cat .claude/design-config.md 2>/dev/null
```

If design-config exists, use it as input. If not, ask these questions one at a time:

1. **"What industry is this for?"** (SaaS, fintech, healthcare, ecommerce, social, dev tools, etc.)
2. **"What's the brand personality?"**
   - A) Clean + professional (like Linear, Stripe)
   - B) Warm + friendly (like Notion, Slack)
   - C) Bold + energetic (like Vercel, Figma)
   - D) Minimal + serious (like Bloomberg, Terminal)
   - I'd pick **A** for most B2B tools.
3. **"Primary brand color?"** (give a hex code, or pick from a category and I'll suggest options)
4. **"Light theme, dark theme, or both?"**
5. **"Any reference apps for look and feel?"** (optional)

### Step 3: Generate tokens

Generate design tokens in 3 formats:

#### Token reference doc

```markdown
## Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| --color-primary | #[hex] | CTAs, active states, links |
| --color-primary-hover | #[hex] | Hover state for primary |
| --color-bg | #[hex] | Page background |
| --color-bg-secondary | #[hex] | Card/section background |
| --color-text | #[hex] | Body text |
| --color-text-secondary | #[hex] | Secondary/muted text |
| --color-border | #[hex] | Borders and dividers |
| --color-success | #[hex] | Success states |
| --color-warning | #[hex] | Warning states |
| --color-error | #[hex] | Error states |

### Typography
| Token | Value | Usage |
|-------|-------|-------|
| --font-family | [font] | Body text |
| --font-family-heading | [font] | Headings (if different) |
| --font-size-xs | [size] | Small labels |
| --font-size-sm | [size] | Secondary text |
| --font-size-base | [size] | Body text |
| --font-size-lg | [size] | Subheadings |
| --font-size-xl | [size] | Section headings |
| --font-size-2xl | [size] | Page headings |
| --font-size-3xl | [size] | Hero text |

### Spacing
| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Tight spacing |
| --space-2 | 8px | Between related items |
| --space-3 | 12px | Default gap |
| --space-4 | 16px | Between sections |
| --space-6 | 24px | Section padding |
| --space-8 | 32px | Large spacing |
| --space-12 | 48px | Page sections |
| --space-16 | 64px | Major sections |

### Radius
| Token | Value | Usage |
|-------|-------|-------|
| --radius-sm | [value] | Inputs, small elements |
| --radius-md | [value] | Cards, buttons |
| --radius-lg | [value] | Modals, large containers |
| --radius-full | 9999px | Avatars, pills |

### Shadows
| Token | Value | Usage |
|-------|-------|-------|
| --shadow-sm | [value] | Subtle elevation |
| --shadow-md | [value] | Cards, dropdowns |
| --shadow-lg | [value] | Modals, dialogs |
```

#### Tailwind config snippet

```javascript
// tailwind.config.js — extend section
{
  colors: {
    primary: { DEFAULT: '#[hex]', hover: '#[hex]', ... },
    // ...
  },
  fontFamily: {
    sans: ['[font]', ...defaultTheme.fontFamily.sans],
  },
  // ...
}
```

#### CSS variables

```css
:root {
  --color-primary: #[hex];
  --color-primary-hover: #[hex];
  /* ... all tokens ... */
}
```

### Step 4: Component inventory

Based on the project type and flows (if they exist), list the components needed:

```markdown
## Component Inventory

### Core (every project needs these)
- [ ] Button (primary, secondary, ghost, danger)
- [ ] Input (text, email, password, search)
- [ ] Select / Dropdown
- [ ] Checkbox / Toggle
- [ ] Avatar
- [ ] Badge / Tag
- [ ] Toast / Notification
- [ ] Modal / Dialog
- [ ] Loading spinner / Skeleton

### Navigation
- [ ] Sidebar
- [ ] Top bar / Header
- [ ] Breadcrumbs
- [ ] Tabs

### Data display
- [ ] Table (sortable, filterable)
- [ ] Card
- [ ] List
- [ ] Empty state
- [ ] Error state
- [ ] Stats / Metric card

### Project-specific
- [ ] [component based on flows/ideation]
- [ ] [component based on flows/ideation]
```

### Step 5: Save

Save tokens to `.planning/design/system/tokens.md`.
Save component inventory to `.planning/design/system/components.md`.
If no design-config existed, save it to `.planning/design-config.md` too.

> "Design system saved to `.planning/design/system/`."
>
> **Next:** `/spartan:ux prototype {{ args[1] | default: "" }}` to design the screens.

{% elif args[0] == "prototype" %}

## Phase 5: Screen Design (Prototype)

Goal: Design all screens with states, responsive layouts, and accessibility. Get them approved by the design critic. Save to `.planning/design/screens/`.

This phase handles screen design with dual-agent review. Same quality bar as the original design workflow.

```bash
mkdir -p .planning/design/screens
```

### Step 1: Read upstream artifacts

```bash
cat .planning/design/definition/brief.md 2>/dev/null
cat .planning/design/ideation/flows.md 2>/dev/null
cat .planning/design/system/tokens.md 2>/dev/null
cat .planning/design/system/components.md 2>/dev/null
cat .planning/design-config.md 2>/dev/null
cat .planning/specs/*.md 2>/dev/null
```

Use whatever exists. If nothing exists, ask the user to describe what screens they need.

### Load skills

Load the `design-workflow` skill for anti-AI-generic rules. Apply these throughout.
If the `design-intelligence` skill is available, load it for palette and typography reference.

### Step 1.5: Check for AI asset generation (silent)

```bash
# Check if AI design scripts are available
SCRIPTS_DIR=""
for dir in "$HOME/.claude/scripts/design" ".claude/scripts/design"; do
  [ -d "$dir" ] && SCRIPTS_DIR="$dir" && break
done
echo "AI_SCRIPTS: ${SCRIPTS_DIR:-NOT_FOUND}"

# Check if API key is configured
for env_file in ".spartan/ai.env" ".env" "$HOME/.spartan/ai.env"; do
  [ -f "$env_file" ] && grep -q "GEMINI_API_KEY" "$env_file" 2>/dev/null && echo "AI_KEY: configured" && break
done

# Check if design-config has AI section
grep -q "AI Asset Generation" .planning/design-config.md 2>/dev/null && echo "AI_CONFIG: yes"
```

**If AI scripts + API key are available**, this phase uses two extra capabilities:
- **AI design brainstorming** — calls Gemini CLI for layout/flow/component ideas before you design screens
- **AI asset generation** — generates real images (illustrations, icons, hero images) for prototypes instead of placeholders

**If NOT available**, the phase works the same as before — just without AI-generated assets. This is fine for most projects.

### Step 1.6: AI Design Direction (only if AI scripts available)

If `AI_SCRIPTS` was found, get AI input before designing screens:

```bash
# Layout direction
$SCRIPTS_DIR/ai-design.sh "layout" "Feature: {feature description from spec}. Users: {who}."

# User flows
$SCRIPTS_DIR/ai-design.sh "flow" "Feature: {feature description}. Include: happy path, error, empty, loading."

# Component specs
$SCRIPTS_DIR/ai-design.sh "components" "Feature: {feature description}. Layout context: {summary from layout call}."

# Motion design
$SCRIPTS_DIR/ai-design.sh "motion" "Feature: {feature description}. Key elements: {list from layout}."
```

**Take AI output and OVERRIDE visual choices with design-config.md values:**
- Colors → Use the Color Palette from design-config.md
- Fonts → Use the Fonts from design-config.md
- Style → Use the Design Personality from design-config.md
- Spacing/Radius → Use the Spacing & Radius from design-config.md

AI is good at layout ideas and flow design. It's bad at picking colors and fonts — always use your project values.

### Step 2: Screen inventory

List all screens needed. For each screen, note its states:

```markdown
## Screen Inventory

| # | Screen | States | Priority |
|---|--------|--------|----------|
| 1 | [screen name] | default, loading, empty, error | must-have |
| 2 | [screen name] | default, editing, saving | must-have |
| 3 | [screen name] | default, filtered, empty results | nice-to-have |
```

> "Here are the screens I think we need. Anything to add or remove?"
>
> **Auto mode on?** → Show the list, continue without waiting.

### Step 3: Design each screen

For each screen (in priority order):

#### Wireframe

ASCII wireframe showing the layout:

```
+--------------------------------------------------+
| [header / nav]                                    |
+--------------------------------------------------+
| [sidebar]  | [main content]                       |
|            |                                       |
|            | [section 1]                           |
|            |   [component] [component]             |
|            |                                       |
|            | [section 2]                           |
|            |   [component]                         |
+--------------------------------------------------+
```

#### Layout details

```markdown
### [Screen Name]

**URL:** /[path]
**Layout:** [sidebar + main / full-width / centered / split]

#### Components used
- [component] — [what data it shows]
- [component] — [what it does]

#### States
| State | What the user sees | Trigger |
|-------|-------------------|---------|
| Default | [description] | Page load with data |
| Loading | Skeleton placeholders | Initial fetch |
| Empty | Illustration + message + CTA | No data yet |
| Error | Error message + retry button | API failure |
| Success | Toast + updated data | After save/action |
| [edge case] | [description] | [condition] |
```

#### Responsive behavior

```markdown
#### Responsive

| Breakpoint | Layout change |
|-----------|---------------|
| 375px (mobile) | [what changes — stack columns, hide sidebar, etc.] |
| 768px (tablet) | [what changes] |
| 1440px (desktop) | [full layout as wireframed] |
```

If design tokens exist, use them for colors, spacing, and typography. Don't invent new values.

### Step 4: Motion plan

For the whole feature, define what moves and when:

```markdown
## Motion Plan

| Element | Animation | Trigger | Duration | Easing |
|---------|-----------|---------|----------|--------|
| Page content | Fade in | Route change | 200ms | ease-out |
| Modal | Scale up + fade | Open | 200ms | ease-out |
| Modal backdrop | Fade in | Open | 150ms | ease-out |
| Toast | Slide in from top | Action complete | 300ms | ease-out |
| List items | Stagger fade | Data load | 100ms + 50ms delay | ease-out |
| Skeleton | Pulse | Loading | 1.5s loop | ease-in-out |

**Reduced motion:** All animations replaced with instant show/hide when `prefers-reduced-motion` is set.
```

### Step 5: Accessibility checklist

Before calling the critic, check:

- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 large text)
- [ ] All buttons and links are keyboard accessible
- [ ] Focus order follows visual layout
- [ ] Tab navigation hits every interactive element
- [ ] All images have alt text
- [ ] Form inputs have visible labels (not just placeholders)
- [ ] Error messages are tied to the input (aria-describedby)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Touch targets are at least 44x44px on mobile
- [ ] No info conveyed by color alone (use icons or text too)

### Step 6: Self-check (before calling critic)

Run through these yourself:

1. **Does it look like a real app, or a generic AI template?**
2. **Is there clear visual hierarchy?** Can you tell what's most important?
3. **Does the accent color draw the eye to CTAs?**
4. **Is there enough whitespace?**
5. **Does the text use specific language, not generic marketing fluff?**
6. **Does it match the design personality from design-config?**
7. **Are ALL states covered?** (not just the happy path)

Fix anything that fails before calling the critic.

### Step 7: Generate Assets (only if AI scripts available)

If AI asset generation is configured, generate real images for the prototype. This runs in **two phases** — assets get approved before the prototype uses them.

**Skip this step** if AI scripts are not available. In that case, use descriptive placeholders in designs and note them for manual creation.

#### Phase A: Generate & Review Assets

1. **List needed assets** from the wireframes: hero images, illustrations, icons, empty state graphics
2. **Write an Asset Brief** for each image:
   ```
   Asset: {filename}
   Purpose: {hero section? card illustration? empty state?}
   Subject: {exactly what's in the image}
   Color palette: {2-3 hex colors from project palette}
   Style: {flat vector / minimal / isometric}
   Mood: {match design-config personality}
   Must NOT have: {things to avoid}
   ```
3. **Generate each asset:**
   ```bash
   $SCRIPTS_DIR/ai-image.sh "prompt from brief" .planning/design/screens/{feature}/assets/filename.png
   # With style hint:
   $SCRIPTS_DIR/ai-image.sh "prompt" ./path.png --style "flat, minimal"
   # Match existing style:
   $SCRIPTS_DIR/ai-image.sh "prompt" ./v2.png --reference ./v1.png
   ```
4. **Read each generated image** to self-check quality
5. **Re-generate** any that look wrong (up to 3 attempts each, then mark SKIP)
6. **Show asset list to user** (or critic) for review

**FORBIDDEN:** Stock icons, placeholder URLs, Unsplash, external image URLs. All assets come from the script.

#### Phase B: Build Prototype HTML (only if assets exist)

If assets were generated, build an HTML prototype:
- Use Tailwind CSS (CDN) with **exact project colors**
- Reference assets with relative paths: `<img src="assets/hero.png" />`
- Add all states (loading, empty, error)
- Make it responsive (375px, 768px, 1440px)
- Add hover/focus transitions and scroll reveal animations

Save to: `.planning/design/screens/{feature-name}/prototype.html`

Generate preview screenshots:
```bash
node $SCRIPTS_DIR/design-preview.mjs .planning/design/screens/{feature-name}/prototype.html
```

### Step 8: Spawn design critic (Design Gate)

Spawn the `design-critic` agent as a subagent. Give it:

1. **The screen designs** you wrote
2. **The design tokens** (if they exist)
3. **The design-config** (if it exists)
4. **The spec** (if it exists)
5. **Generated assets** (if any — critic should read each image)
6. **Prototype screenshots** (if generated)
7. **Your self-check results** from Step 6

**Prompt for the critic:**
> "Review these screen designs for the Design Gate. Screens: [content]. Tokens: [path or 'none']. Design-config: [path or 'none']. Spec: [path or 'none']. {If assets: 'Generated assets at [paths] — read each image and check brand fit.'} Check for: AI-generic patterns, brand compliance, missing states, responsive gaps, accessibility, visual hierarchy. Give your verdict: ACCEPT or NEEDS CHANGES."

### Discussion

- If critic says **ACCEPT** -> Design Gate passed
- If critic says **NEEDS CHANGES** -> fix issues (including re-generating assets if flagged), re-submit
- Max 3 rounds of back-and-forth
- If still stuck after 3 rounds, ask the user to decide

### Step 9: Save & Clean Up

Save each screen to `.planning/design/screens/{{ args[1] | default: "feature-name" }}.md`.

Add metadata at the top:

```markdown
**Date**: [today]
**Status**: approved
**Designer**: Claude (main agent)
**Critic**: design-critic agent
**Verdict**: PASSED
**AI Assets**: [yes/no — list generated assets if any]
```

If screenshots were generated, clean them up:
```bash
$SCRIPTS_DIR/design-cleanup.sh .planning/design/screens/{{ args[1] | default: "feature-name" }}/
```

> "Screens saved to `.planning/design/screens/` — Design Gate passed."
>
> {If AI assets were generated:}
> "Generated assets at `.planning/design/screens/{feature}/assets/` — [N] images, [M] skipped."
>
> {If prototype HTML was built:}
> "Prototype at `.planning/design/screens/{feature}/prototype.html`"
>
> **Next steps:**
> - Ready to build? -> `/spartan:plan {{ args[1] | default: "" }}` then `/spartan:build frontend {{ args[1] | default: "" }}`
> - Want to test with users first? -> `/spartan:ux test {{ args[1] | default: "" }}`
> - Need developer handoff details? -> `/spartan:ux handoff {{ args[1] | default: "" }}`

{% elif args[0] == "test" %}

## Phase 6: Usability Testing

Goal: Create a test plan, and if results come in, analyze them. Save to `.planning/design/test-results.md`.

```bash
mkdir -p .planning/design
```

### Step 1: Read upstream artifacts

```bash
cat .planning/design/screens/*.md 2>/dev/null
cat .planning/design/ideation/flows.md 2>/dev/null
cat .planning/design/definition/brief.md 2>/dev/null
```

If screens exist, build tasks from them. If not, ask the user what flows to test.

### Step 2: Generate test script

Create a usability test script with 5-7 tasks. Each task tests a main flow.

```markdown
## Usability Test Script

**Product:** [name]
**Date:** [today]
**Duration:** 30-45 minutes per session
**Participants:** [target: 5 users matching personas]

### Intro (2 min)
"Thanks for helping us test this. There are no wrong answers — we're testing the design, not you. Think out loud as you go. If something confuses you, say so."

### Warm-up (3 min)
- "Tell me about your role and what you do day-to-day."
- "How do you currently handle [relevant task]?"

### Tasks

#### Task 1: [Name] — [what flow it tests]
**Scenario:** "Imagine you just [context]. You want to [goal]."
**Success criteria:** User completes [action] within [time/clicks].
**Watch for:** [specific behaviors or confusion points]

#### Task 2: [Name]
...

#### Task 3: [Name]
...

(5-7 tasks total, covering the main flows)

### Wrap-up (5 min)
- "What was the easiest part?"
- "What was the hardest part?"
- "Anything you expected to find but couldn't?"
- "On a scale of 1-5, how confident were you while using this?"
```

### Step 3: Define pass/fail criteria

```markdown
## Pass/Fail Criteria

| Task | Pass | Partial | Fail |
|------|------|---------|------|
| Task 1 | Completes in < 30s, no help | Completes with 1 hint | Can't complete or > 2 min |
| Task 2 | ... | ... | ... |

**Overall pass rate target:** 80% of users pass each task.
**Red flag:** If 3+ users fail the same task, that flow needs a redesign.
```

### Step 4: Analyze results (if user provides them)

If the user pastes or describes test results:

1. **Rate each finding by severity:**

| Severity | Meaning | Action |
|----------|---------|--------|
| Critical | Blocks the task. User can't complete it. | Must fix before launch. |
| Major | User completes but with big confusion or frustration. | Fix before launch if possible. |
| Minor | Small annoyance. User still completes fine. | Fix later. |

2. **Group findings by screen/flow**
3. **For each finding:**
   - What happened
   - How many users hit it
   - Severity
   - Suggested design change
4. **Summary:** overall pass rate, biggest wins, biggest problems

### Step 5: Save

Save to `.planning/design/test-results.md`.

> "Test plan saved to `.planning/design/test-results.md`."
>
> If results were analyzed:
> "Found [N] issues: [X] critical, [Y] major, [Z] minor. Update screens with `/spartan:ux prototype {{ args[1] | default: "" }}` to fix the critical/major ones."
>
> **Next:** `/spartan:ux handoff {{ args[1] | default: "" }}` when designs are final.

{% elif args[0] == "handoff" %}

## Phase 7: Developer Handoff

Goal: Compile all design decisions into a format developers can build from. Update screen files with handoff notes.

### Step 1: Read all design artifacts

```bash
cat .planning/design/system/tokens.md 2>/dev/null
cat .planning/design/system/components.md 2>/dev/null
cat .planning/design/screens/*.md 2>/dev/null
cat .planning/design/ideation/flows.md 2>/dev/null
cat .planning/design/definition/brief.md 2>/dev/null
cat .planning/design-config.md 2>/dev/null
```

If tokens or screens don't exist, warn:
> "No design tokens or screen designs found. Run `/spartan:ux system` and `/spartan:ux prototype` first."

### Step 2: Implementation checklist per screen

For each screen in `.planning/design/screens/`:

```markdown
## Handoff: [Screen Name]

### Files to create/edit
- [ ] `src/app/[path]/page.tsx` — page component
- [ ] `src/components/[name].tsx` — [component]
- [ ] `src/components/[name].tsx` — [component]
- [ ] `src/api/[name].ts` — API client (if new endpoints)
- [ ] `src/types/[name].ts` — TypeScript types

### Token reference
| Design element | Token | Value |
|---------------|-------|-------|
| Page background | --color-bg | [value] |
| Card background | --color-bg-secondary | [value] |
| Primary button | --color-primary | [value] |
| Body text | --font-size-base / --color-text | [values] |
| Card spacing | --space-4 | [value] |
| Card radius | --radius-md | [value] |
```

### Step 3: State matrix

For each component that has multiple states:

```markdown
### State Matrix: [Component Name]

| State | Visual | Data | Interaction |
|-------|--------|------|-------------|
| Default | [description] | [what data shows] | [what user can do] |
| Hover | [change] | same | click triggers [action] |
| Active/Selected | [change] | same | [action] |
| Disabled | [change] | same | no interaction |
| Loading | skeleton | none | no interaction |
| Empty | illustration + message | none | CTA to [action] |
| Error | error banner | none | retry button |
```

### Step 4: Animation specs

From the motion plan:

```markdown
### Animations

| Element | Property | From | To | Duration | Easing | Trigger |
|---------|----------|------|-----|----------|--------|---------|
| Modal | opacity | 0 | 1 | 200ms | ease-out | open |
| Modal | transform | scale(0.95) | scale(1) | 200ms | ease-out | open |
| Toast | transform | translateY(-100%) | translateY(0) | 300ms | ease-out | show |

**CSS implementation:**
```css
.modal-enter { opacity: 0; transform: scale(0.95); }
.modal-enter-active { opacity: 1; transform: scale(1); transition: all 200ms ease-out; }

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active { transition: none; }
}
```
```

### Step 5: Tailwind config

If tokens exist but Tailwind config wasn't generated yet:

```javascript
// tailwind.config.js — paste this into the extend section
module.exports = {
  theme: {
    extend: {
      colors: {
        // from tokens.md
      },
      fontFamily: {
        // from tokens.md
      },
      spacing: {
        // from tokens.md
      },
      borderRadius: {
        // from tokens.md
      },
    },
  },
}
```

### Step 6: Platform-specific notes

Add any notes that matter for the frontend stack:

```markdown
### Implementation notes

- **Framework:** [Next.js App Router / React / etc.]
- **Styling:** [Tailwind + CSS variables / styled-components / etc.]
- **State management:** [React Query / Zustand / context / etc.]
- **API pattern:** [how to fetch data — server components, client fetch, etc.]
- **Image handling:** [Next/Image, lazy loading, responsive sizes]
- **Fonts:** [how to load — next/font, self-hosted, Google Fonts]
```

### Step 7: Update screen files

Append the handoff notes to each screen file in `.planning/design/screens/`.

> "Handoff notes added to screen files in `.planning/design/screens/`."
>
> **Next:** `/spartan:plan {{ args[1] | default: "" }}` then `/spartan:build frontend {{ args[1] | default: "" }}` to start building.
>
> After building, run `/spartan:ux qa {{ args[1] | default: "" }}` to check the build matches the design.

{% elif args[0] == "qa" %}

## Phase 8: Design QA

Goal: Check that the built UI matches the design specs. Generate a QA checklist.

### Step 1: Read design artifacts

```bash
cat .planning/design/system/tokens.md 2>/dev/null
cat .planning/design/screens/*.md 2>/dev/null
```

If no design files exist:
> "No design specs found. Can't do design QA without specs to compare against. Run `/spartan:ux prototype` first."

### Step 2: Generate QA checklist

From the screen designs and tokens, generate a checklist:

```markdown
## Design QA Checklist

### Typography
- [ ] Font family matches tokens (--font-family)
- [ ] Font sizes match scale (check each heading level, body, labels)
- [ ] Font weights match spec (bold for headings, regular for body)
- [ ] Line heights look right (not too tight, not too loose)

### Colors
- [ ] Primary color used for CTAs and active states only (not overused)
- [ ] Background colors match tokens (--color-bg, --color-bg-secondary)
- [ ] Text colors match tokens (--color-text, --color-text-secondary)
- [ ] Success/warning/error colors match tokens
- [ ] No hardcoded color values (all from tokens or Tailwind)

### Spacing
- [ ] Component spacing matches scale (--space-*)
- [ ] Card padding is consistent
- [ ] Section margins are consistent
- [ ] No pixel-pushing (spacing should come from tokens)

### Layout
- [ ] Layout matches wireframes at 1440px (desktop)
- [ ] Layout adapts properly at 768px (tablet)
- [ ] Layout adapts properly at 375px (mobile)
- [ ] Sidebar collapses/hides on mobile (if applicable)
- [ ] No horizontal scroll at any breakpoint

### Components
- [ ] Buttons match spec (size, color, radius, hover state)
- [ ] Inputs match spec (border, focus ring, error state)
- [ ] Cards match spec (background, shadow, radius, padding)
- [ ] Tables match spec (headers, rows, alignment)
- [ ] Modals match spec (size, backdrop, animation)

### States
- [ ] Loading state shows skeleton/spinner (not blank)
- [ ] Empty state shows illustration + message + CTA
- [ ] Error state shows message + retry
- [ ] Success feedback (toast/animation) works
- [ ] Hover states on interactive elements
- [ ] Focus states visible for keyboard nav

### Animations
- [ ] Page transitions match motion plan
- [ ] Modal open/close animation matches spec
- [ ] Toast animation matches spec
- [ ] `prefers-reduced-motion` disables animations

### Accessibility
- [ ] Tab order matches visual order
- [ ] All buttons/links reachable by keyboard
- [ ] Focus ring visible on interactive elements
- [ ] Screen reader can navigate the page
- [ ] Form errors announced to screen readers
- [ ] Images have alt text
- [ ] Contrast ratio passes WCAG AA
```

### Step 3: Run browser QA (optional)

> "Want me to run browser QA with Playwright to check the live app?"
>
> - **A) Yes** — I'll open the app and check the design visually (uses `/spartan:qa`)
> - **B) No** — I'll just give you the checklist to check manually
>
> I'd pick **A** if the app is running locally.

If user picks A, suggest running `/spartan:qa` with the URL.

### Step 4: Save

Save to `.planning/design/qa-checklist.md`.

> "QA checklist saved to `.planning/design/qa-checklist.md`."
>
> Check each item. If anything doesn't match, fix it and run the checklist again.

{% elif args[0] == "audit" %}

## Audit: Gap Analysis

Goal: Scan what exists and report what's done, what's missing, and what to do next.

### Step 1: Scan design artifacts

```bash
ls -la .planning/design/ 2>/dev/null
ls -la .planning/design/research/ 2>/dev/null
ls -la .planning/design/definition/ 2>/dev/null
ls -la .planning/design/ideation/ 2>/dev/null
ls -la .planning/design/system/ 2>/dev/null
ls -la .planning/design/screens/ 2>/dev/null
ls .planning/design/test-results.md 2>/dev/null
ls .planning/design/qa-checklist.md 2>/dev/null
ls .planning/design-config.md .claude/design-config.md 2>/dev/null
ls .planning/specs/*.md 2>/dev/null
ls .planning/designs/*.md 2>/dev/null
```

### Step 2: Scan codebase for existing design system

```bash
# Check for Tailwind config
cat tailwind.config.js 2>/dev/null || cat tailwind.config.ts 2>/dev/null

# Check for CSS variables
ls src/styles/globals.css 2>/dev/null || ls src/app/globals.css 2>/dev/null

# Check for component library
ls src/components/ui/ 2>/dev/null
ls src/components/ 2>/dev/null | head -20

# Check for design tokens file
ls src/styles/tokens.* 2>/dev/null || ls src/lib/tokens.* 2>/dev/null
```

### Step 3: Report

```markdown
## UX Audit Report

### Design artifacts
| Artifact | Status | Path | Notes |
|----------|--------|------|-------|
| Design config | [found/missing] | [path] | [notes] |
| Research insights | [found/missing] | [path] | [notes] |
| Problem brief | [found/missing] | [path] | [notes] |
| User flows | [found/missing] | [path] | [notes] |
| Design tokens | [found/missing] | [path] | [notes] |
| Component inventory | [found/missing] | [path] | [notes] |
| Screen designs | [found/missing] | [path] | [notes] |
| Test results | [found/missing] | [path] | [notes] |
| QA checklist | [found/missing] | [path] | [notes] |

### Codebase design system
| Item | Status | Details |
|------|--------|---------|
| Tailwind config | [found/missing] | [custom colors? fonts? spacing?] |
| CSS variables | [found/missing] | [how many tokens defined?] |
| Component library | [found/missing] | [which components exist?] |
| Design tokens file | [found/missing] | [format?] |

### Gaps
[List what's missing and why it matters]

### Recommendations
1. **[Most important]** — run `/spartan:ux [phase]` because [reason]
2. **[Second]** — ...
3. **[Third]** — ...
```

{% else %}

## Unknown action: {{ args[0] }}

Available actions:

| Action | What it does |
|--------|-------------|
| `/spartan:ux` | Smart router — check status, suggest next step |
| `/spartan:ux research` | User research — interviews, competitive analysis, empathy maps |
| `/spartan:ux define` | Problem definition — statement, personas, journey, metrics |
| `/spartan:ux ideate` | Solution exploration — ideas, user flows, IA |
| `/spartan:ux system` | Design system — tokens, Tailwind config, component inventory |
| `/spartan:ux prototype` | Screen design — wireframes, states, responsive, Design Gate |
| `/spartan:ux test` | Usability testing — test scripts, result analysis |
| `/spartan:ux handoff` | Developer handoff — specs, state matrix, animation details |
| `/spartan:ux qa` | Design QA — checklist to verify build matches design |
| `/spartan:ux audit` | Gap analysis — scan what exists, find what's missing |

**Example:** `/spartan:ux prototype "dashboard"` designs the dashboard screens.

**Quick start:** Just run `/spartan:ux` and I'll figure out where you are.

{% endif %}

---

## Rules

- **Read upstream artifacts first.** Every phase checks for artifacts from earlier phases. Use them if they exist. Don't ask the user to repeat info.
- **Save everything to `.planning/design/`.** Each phase has its own subfolder. This is the source of truth for the design.
- **Design tokens are the law.** If tokens exist, every color, font, spacing, and radius must come from them. Don't invent values.
- **Anti-AI-generic is the top priority.** If the design looks like every other AI-generated page, it fails. Load the `design-workflow` skill and follow its rules.
- **All states must be covered.** Loading, empty, error, success, edge cases. Not just the happy path. This is the most common miss.
- **Responsive is not optional.** Every screen must work at 375px, 768px, and 1440px. Show what changes at each breakpoint.
- **The critic must accept.** The `prototype` phase spawns the `design-critic` agent. Both agents must agree before the design is approved. Single-agent design is not enough.
- **Accessibility is built in, not bolted on.** Check contrast, keyboard nav, focus order, reduced motion, and screen readers during design, not after build.
- **Auto mode on?** Skip confirmations, but still run the full design critic review in the `prototype` phase. Never skip the Design Gate.
- **Keep language simple.** Short sentences. Simple words. Don't use jargon unless the user did first.
- **Always suggest the next step.** After each phase, tell the user what comes next and give the command.
- **Questions always have options.** When you ask the user something, give A/B/C options. Always pick a side ("I'd pick A because...").
