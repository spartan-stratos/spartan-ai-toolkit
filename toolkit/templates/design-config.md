# Design Config: [Project Name]

Per-project design system config. All design work reads this file first.

**Location:** Save this to `.planning/design-config.md` in your project root.

---

## Brand Identity

- **App name**: [your app or product name]
- **Type**: [what kind of app — dashboard, SaaS, marketplace, etc.]
- **Users**: [who uses it — roles, personas]
- **Identity**: [3-5 words — e.g., "clean, professional, data-focused"]
- **Theme**: [Light / Dark / Both]

---

## Color Palette

Use ONLY these colors. Don't invent new ones. Don't use Tailwind defaults.

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Background | `--color-bg` | [hex] | Page background |
| Surface | `--color-surface` | [hex or rgba] | Card backgrounds |
| Primary | `--color-primary` | [hex] | Buttons, active nav, links |
| Primary Hover | `--color-primary-hover` | [hex] | Hover states |
| Accent | `--color-accent` | [hex] | Highlights, badges (use sparingly) |
| Text | `--color-text` | [hex] | Headlines, body text |
| Text Secondary | `--color-text-secondary` | [hex] | Subtitles, descriptions |
| Text Muted | `--color-text-muted` | [hex] | Labels, captions |
| Border | `--color-border` | [hex or rgba] | Dividers, card edges |
| Success | `--color-success` | [hex] | Positive states |
| Warning | `--color-warning` | [hex] | Alert states |
| Error | `--color-error` | [hex] | Error states |

---

## Typography

- **Font**: [font name — e.g., "Inter", "Plus Jakarta Sans"]
- **Headings weight**: [e.g., 600-700]
- **Body weight**: [e.g., 400-500]
- **Numbers**: [e.g., "tabular-nums" for data-heavy apps]

---

## Spacing & Radius

- **Card radius**: [e.g., 12px]
- **Button radius**: [e.g., 8px]
- **Badge radius**: [e.g., 9999px (full round)]
- **Shadows**: [e.g., "subtle slate-tinted: rgba(15, 23, 42, 0.04-0.10)" or "none — use glow effects"]

---

## Theme Files

Where the actual CSS tokens live in the codebase:

- **CSS Tokens**: [e.g., `src/styles/tokens.css` or `src/index.css`]
- **Token prefix**: [e.g., `--color-` or `--color-brand-`]

---

## Design Personality

[2-3 sentences. What feeling should the app give? Examples:]
- "Dark, vibrant, premium. Glassmorphism cards, gradient orbs, glow effects."
- "Warm, professional, data-focused. Clean tables, colorful stat cards, amber accents."
- "Minimal, fast, developer-friendly. Monospace accents, high contrast, no decoration."

---

## Reference Apps

Apps that have the quality level we want:

| Reference | Why |
|-----------|-----|
| [app name] | [what to take from it — e.g., "clean data tables, good whitespace"] |
| [app name] | [e.g., "sidebar nav, dark theme done right"] |

---

## Anti-References (What to NEVER Do)

Things that would make our app look wrong:

- [e.g., "NEVER light theme — this app is dark only"]
- [e.g., "No playful/gamified aesthetic — we're B2B"]
- [e.g., "No gradient blobs or decorative noise"]
- [e.g., "No generic AI aesthetics"]

---

## Quick Reference

| Question | Answer |
|----------|--------|
| What theme? | [Light / Dark / Both] |
| Primary color? | [hex] |
| Font? | [name] |
| Token file? | [path] |
