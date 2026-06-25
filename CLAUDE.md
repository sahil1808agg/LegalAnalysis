# Claude.md — Project Build Workflow

A structured, stage-gated workflow for building production-ready applications from idea to deployment. Each stage must be completed and approved before the next begins.

---

## Core Rule

**Never advance to the next stage without explicit user approval.** After every stage, stop, present the output, and wait.

---

## Workflow Stages

### Stage 1 — Engineering Plan

**Skill:** `@skills/engineering-planner/SKILL.md`

Produces the master engineering document and implementation specs that all subsequent stages reference.

**Output:** `docs/engineering/engineering-doc.md` · `docs/engineering/implementation-specs.md`

---

### Stage 2 — Frontend Setup

**Skill:** `@skills/frontend-setup/SKILL.md`

Scaffolds the project with the correct framework, folder structure, and tooling configuration.

> Ask the user where to create the project folder before writing any files.

**Output:** Fully scaffolded project ready for feature development

---

### Stage 3 — Feature Implementation

Build features one at a time, in the order defined in the implementation specs.

**Standards**
- Follow the architecture in `docs/engineering/engineering-doc.md`
- Follow the design system in `docs/design-system.md` for all colors, spacing, typography, and components
- TypeScript throughout — no `any`, no untyped values
- Production-ready code only — no TODOs, no placeholder implementations
- Implement loading, error, and empty states for every async operation
- Keep components reusable and logic modular

**Process per feature**
1. Read the relevant section of `docs/engineering/implementation-specs.md`
2. State which feature is being built and list all files that will be created or modified
3. Wait for user confirmation
4. Implement the feature
5. Confirm completion and ask which feature to build next

---

### Stage 4 — Database Schema

Design and generate the complete database schema based on the engineering document and implementation specs.

**Output:** `database.sql`

---

### Stage 5 — Conversation Memory Layer

Implement the memory service and context classification layer on top of the Stage 3 codebase.

**Output:** Memory service + context classification module

---

### Stage 6 — Security Review & Hardening

**Skill:** `@skills/security-fix/SKILL.md`

Scan the codebase for security vulnerabilities and apply fixes automatically.

**Surfaces covered**
- Authentication and session management
- Protected routes and middleware
- API input validation and sanitisation
- Prompt injection protection
- Token and usage limits
- Data ownership and access control
- File upload security
- Environment variable exposure
- Error response leakage

**Output:** Hardened codebase + auto-fix report

---

## Stage Summary

| Stage | Name | Skill / Approach | Key Output |
|---|---|---|---|
| 1 | Engineering Plan | `@skills/engineering-planner/SKILL.md` | Engineering doc + implementation specs |
| 2 | Frontend Setup | `@skills/frontend-setup/SKILL.md` | Scaffolded project |
| 3 | Feature Implementation | Engineering docs + design system | Full application code |
| 4 | Database Schema | Engineering docs + specs | `database.sql` |
| 5 | Conversation Memory Layer | Codebase from Stage 3 | Memory service |
| 6 | Security Review | `@skills/security-fix/SKILL.md` | Hardened codebase |

---

## Non-Negotiable Constraints

| Rule | Detail |
|---|---|
| Never skip a stage | Each stage depends on the output of the previous one |
| Never proceed without approval | Stop and wait after every stage |
| Never assume missing decisions | Ask when anything is unclear |
| Never write code before Stage 1 | Implementation only begins after the engineering plan is approved |
| Always apply the design system | Every UI element must use `docs/design-system.md` — no ad-hoc styles |
