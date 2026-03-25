
---

## Tech Stack — Frontend

**Frontend:** React / Next.js / TypeScript (App Router) — Vitest + Testing Library, Tailwind CSS

### Frontend Rules

- `FRONTEND_RULES.md` — Build check before commit, cleanup imports, API response null safety
- `NAMING_CONVENTIONS.md` — snake_case DB/JSON, camelCase TypeScript

### Frontend Skills

- `/ui-ux-pro-max` — Design system with 67 styles, 96 palettes, 13 stacks

### Frontend Commands

| Command | Purpose |
|---|---|
| `/spartan:next-app [name]` | Scaffold Next.js app (App Router, Vitest, Docker, CI) |
| `/spartan:next-feature [name]` | Add feature to existing Next.js app |
| `/spartan:fe-review` | PR review with Next.js App Router conventions |
| `/spartan:figma-to-code [url]` | Convert Figma screen to production code via MCP |
| `/spartan:e2e [feature]` | Scaffold Playwright E2E testing |

### TDD — Frontend Specific
- Next.js: Vitest + Testing Library

---

## Next.js Conventions

```typescript
// Server Component by default — 'use client' only for:
// event handlers / useState / browser APIs

// Fetch data directly in Server Components
async function UsersPage() {
  const users = await ApiClient.get<UserDto[]>('/api/v1/users')
  return <UserList users={users} />
}

// Mutations via Server Actions
async function createUser(data: CreateUserInput) {
  'use server'
  await ApiClient.post('/api/v1/users', data)
  revalidatePath('/users')
}

// Types in _types/ must mirror Kotlin DTOs exactly
// TypeScript interface ↔ Kotlin data class (same field names)
```

---

## Figma MCP Workflow

- **Budget:** One Figma screen per Claude Code session (~13k tokens per MCP response)
- **Workflow:** `/spartan:figma-to-code [url]` → extract tokens → generate components (TDD)
- **Config:** `claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp`
- **Auth:** Run `/mcp` inside Claude Code to authenticate
- **Multi-screen features:** Use `/spartan:context-save` between screens
