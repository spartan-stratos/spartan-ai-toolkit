# Skill Authoring Rules

Rules for creating and modifying skills in the Spartan AI Toolkit. Follow these when writing new skills or improving existing ones.

## Frontmatter (REQUIRED)

Every SKILL.md must have these fields:

```yaml
---
name: skill-name
description: "What it does. Use when [trigger conditions]."
allowed_tools:
  - Read
  - Write
  # ... tools the skill needs
---
```

### Description Must Be a Trigger

The description tells the model WHEN to activate the skill, not WHAT the skill is.

| Bad (summary) | Good (trigger) |
|----------------|----------------|
| "Database design patterns including schemas and migrations" | "Database design patterns. Use when creating tables, writing migrations, or implementing repositories." |
| "The full startup pipeline from brainstorm to outreach" | "Coordinates the full startup pipeline. Use when the user starts a new idea project or references stages/gates." |

**Rule:** Every description must contain "Use when" followed by specific trigger conditions.

### allowed_tools Must Match the Skill's Needs

| Skill type | Typical tools |
|------------|--------------|
| Code/backend (writes files) | Read, Write, Edit, Glob, Grep, Bash |
| Research/analysis (web searches) | WebSearch, WebFetch, Read |
| Content/writing (creates + researches) | Read, Write, WebSearch |
| Review/audit (reads only) | Read, Glob, Grep |

---

## Folder Structure (Skills Are Folders, Not Files)

A skill is a directory, not just a markdown file. Use the file system for progressive disclosure.

```
toolkit/skills/my-skill/
  SKILL.md              # Main definition — short, high-level (required)
  code-patterns.md      # Code examples (if code-heavy skill)
  examples.md           # Good/bad examples (if teaching a style)
  checklists.md         # Review checklists (if audit/review skill)
  workflows.md          # Ready-to-use templates (if scaffolding skill)
```

### When to Split Into Multiple Files

| SKILL.md is... | Action |
|-----------------|--------|
| Under 100 lines | One file is fine |
| 100-150 lines with code blocks | Split code into a reference file |
| 150+ lines | Must split — too much for one read |

### SKILL.md Should Be the Summary

Keep SKILL.md short (60-120 lines). It should have:
- Frontmatter
- "When to Use" section
- Key rules and principles (without detailed code)
- Gotchas section
- References to supporting files

Move into supporting files:
- Detailed code templates and examples
- Long checklists
- Good/bad comparisons
- Ready-to-use templates

Reference with: `> See code-patterns.md for complete implementation templates.`

---

## Gotchas Section (REQUIRED)

Every skill must have a `## Gotchas` section. This is the highest-value content in any skill.

### Format

```markdown
## Gotchas

- **Bold lead-in sentence.** Explanation of why this matters and what to do instead.
- **Another gotcha.** Details.
```

### What Makes a Good Gotcha

- Specific failure patterns Claude hits when using this skill
- Things that look right but are wrong
- Common mistakes users make in this domain
- Counter-intuitive rules that violate defaults

### What is NOT a Gotcha

- General best practices (put those in Rules)
- Obvious things Claude already knows
- Restating the instructions in negative form

**Minimum 3 gotchas per skill. Build this section over time as you find new failure patterns.**

---

## Content Rules

### Don't State the Obvious

Claude already knows how to code, research, and write. Focus on information that pushes Claude OUT of its normal patterns.

| Bad (obvious) | Good (non-obvious) |
|----------------|---------------------|
| "Use proper error handling" | "`!!` is banned — use `?.`, `?:`, or null check" |
| "Write clean code" | "Don't add docstrings to code you didn't change" |
| "Research thoroughly" | "Press releases aren't research — cross-check with third-party sources" |

### Give Claude Flexibility

Tell Claude WHAT to check and WHY, not exact steps for every situation. Skills are reused across many contexts — being too specific makes them brittle.

| Bad (railroading) | Good (flexible) |
|---------------------|------------------|
| "Step 1: Open file X. Step 2: Find line Y. Step 3: Change to Z." | "Check the controller for @ExecuteOn annotation. If missing, add it." |

### Use Examples Over Instructions

A good/bad example teaches more than a paragraph of rules. When possible, show rather than tell.

---

## Config Pattern (for Stateful Skills)

Skills that run repeatedly for the same user should store preferences:

```json
// content-config.json in the project root
{
  "defaultPlatforms": ["x", "linkedin"],
  "brandVoice": "direct and technical",
  "audience": "developers"
}
```

Read config at skill start. Skip setup questions for configured fields.

---

## Naming

| Type | Convention | Example |
|------|-----------|---------|
| Skill directory | `kebab-case` | `ci-cd-patterns/` |
| Main file | `SKILL.md` (always) | `SKILL.md` |
| Supporting files | `kebab-case.md` | `code-patterns.md` |

---

## Checklist: Before Shipping a Skill

- [ ] Frontmatter has `name`, `description` (with trigger), and `allowed_tools`
- [ ] Description says "Use when..." with specific conditions
- [ ] SKILL.md is under 120 lines (split if longer)
- [ ] Has a `## Gotchas` section with 3+ items
- [ ] Code-heavy content is in supporting files, not inline
- [ ] Examples show good AND bad patterns where applicable
- [ ] Doesn't restate things Claude already knows
- [ ] Gives Claude flexibility — principles over exact steps
