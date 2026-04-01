---
name: spartan:scan-rules
description: Scan your codebase and auto-generate rules from patterns it finds
argument-hint: "[optional: directory to scan]"
---

# Scan Rules: {{ args[0] | default: "current project" }}

You are a **convention scanner**. You read existing code and generate rule files from patterns you find.

---

## Step 0: Detect Stack

Same as `/spartan:build` Step 0 — look at the project files and figure out the stack:
- Check for `build.gradle.kts`, `pom.xml`, `go.mod`, `package.json`, `requirements.txt`, `Cargo.toml`, etc.
- Note the language, framework, and build tool.

Set the scan directory:
- If the user passed a directory argument: use `{{ args[0] }}`
- Otherwise: use the project root

---

## Step 1: Scan the codebase

Read **15-20 representative files** across the project. Pick files from different layers:

- **Controllers / Handlers / Routes** (3-4 files)
- **Services / Use cases / Managers** (3-4 files)
- **Models / Entities / Domain objects** (3-4 files)
- **Tests** (3-4 files)
- **Config files** (2-3 files)
- **Database migrations** (1-2 files if they exist)

Look for patterns that repeat across multiple files. One file doing something is not a convention — three files doing the same thing is.

---

## Step 2: Identify patterns

For each file you read, track these categories:

### Architecture patterns
- Layer structure (controller → service → repository? handler → use case?)
- Package/module organization
- Dependency direction (which layers import which?)

### Code conventions
- Error handling approach (exceptions? Result types? Either? error values? try/catch everywhere?)
- Naming patterns (camelCase, snake_case, PascalCase — for what types?)
- Import organization (grouped? sorted? specific order?)
- Null/nil handling approach (Optional? nullable types? guard clauses?)

### Database patterns
- Primary key type (UUID, auto-increment, ULID, etc.)
- Column naming (snake_case? camelCase?)
- Soft delete columns? (`deleted_at`, `is_deleted`?)
- Standard columns (`created_at`, `updated_at`, `version`?)
- Migration style (numbered? timestamped? tool used?)

### Testing patterns
- Test framework used
- Test file location (co-located vs separate `test/` directory?)
- Test naming convention (`should_do_x`, `testDoX`, `it does x`?)
- Common test utilities, builders, or fixtures

### API patterns
- URL style (RESTful `/users/{id}`, RPC `/getUser`?)
- Request/response format (JSON? specific wrapper?)
- Auth approach (JWT? API keys? session?)
- Validation approach (annotations? manual? middleware?)

---

## Step 3: Show findings

Present what you found:

```
Found patterns in your codebase:

  1. [pattern name] — [short description]
     Found in: [file1], [file2], [file3]
     Confidence: HIGH

  2. [pattern name] — [short description]
     Found in: [file1], [file2], [file3]
     Confidence: HIGH

  3. [pattern name] — [short description]
     Found in: [file1], [file2]
     Confidence: MEDIUM — check this, only found in 2 files

  ...
```

Then ask:

> Generate rules from these patterns?
> **(A)** All of them
> **(B)** Let me pick which ones
> **(C)** Cancel

Wait for the user's answer before generating anything.

---

## Step 4: Generate rule files

For each selected pattern, create a rule file at `rules/auto-detected/{PATTERN_NAME}.md`.

Each rule file follows this format:

```markdown
# {Pattern Name}

> Auto-detected by /spartan:scan-rules — review and edit as needed.

{One paragraph explaining the convention and why it matters.}

## CORRECT

{Code example pulled from the actual codebase — a real file that follows the pattern.}

## WRONG

{Counter-example showing what NOT to do — the opposite of the pattern.}

## Quick Reference

| Aspect | Convention |
|--------|-----------|
| ... | ... |
```

**File naming:** Use `UPPER_SNAKE_CASE.md` for the filename. Examples:
- `ERROR_HANDLING.md`
- `NAMING_CONVENTIONS.md`
- `TEST_STRUCTURE.md`
- `API_URL_STYLE.md`
- `DATABASE_COLUMNS.md`

After creating all rule files, add them to `.spartan/config.yaml`:
- If the file exists: add paths under the right `rules:` group (backend/frontend/shared)
- If it doesn't exist: create a basic config with the `rules:` section filled in

---

## Step 5: Summary

```
Generated {N} rules:
  - rules/auto-detected/ERROR_HANDLING.md
  - rules/auto-detected/NAMING_CONVENTIONS.md
  - rules/auto-detected/TEST_STRUCTURE.md
  - ...

Added to .spartan/config.yaml.
Review the generated rules and edit them if needed.
```

---

## Rules for this command

- **HIGH confidence only for generation**: Only generate rules for patterns found in 3+ files.
- **Show MEDIUM but flag them**: Patterns found in only 2 files — show them in Step 3 but mark as "check this — found in only 2 files."
- **Skip single-file patterns**: One file doing something is not a convention. Don't even show it.
- **Use real code**: Pull CORRECT examples from actual project files. Don't make up examples.
- **Don't overwrite**: If `rules/auto-detected/` already has files, warn before overwriting.
- **Structured questions**: When asking the user, always give options (A/B/C). Pick a side. One decision per turn.
