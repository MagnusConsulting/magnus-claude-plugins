---
name: magnus-edit-page
description: Edit copy, headings, CTAs, SEO metadata, or component props on an existing Magnus Consulting Astro page (e.g. /about, /solutions/where-to-play, /impact, /contact, an insights article, a growth story, or a legal page). Use when the user says "update", "tweak", "fix the wording on", "change the headline", "rewrite", "fix a typo", "swap the CTA", or "update the meta description" for a page that already exists. Stays inside the components and tokens documented in docs/llm-context.md and refuses changes that introduce new component types, raw hex colours, off-token spacing, italics in headings, or copy that breaks the Magnus brand voice. Enforces approval gates on legal pages, growth stories, homepage hero, and any client metric. NOT for creating new pages (use magnus-add-page / magnus-add-insight-article / magnus-add-growth-story / magnus-add-report / magnus-add-team-member), adding new sections (use magnus-add-section), or design system changes.
---

# Magnus — Edit existing page

You are editing an existing page on the Magnus Consulting Astro site. The component library and design tokens are fixed. Your job is to make the smallest correct change that satisfies the request without breaking the system.

## Step 1 — Load the contract (non-negotiable)

Read `docs/llm-context.md` in full before doing anything else. It is the source of truth for components, props, tokens, voice, and SEO rules.

If the file is missing, the working directory isn't the magnus repo. Don't try to proceed. Tell the user:

> This folder isn't the magnus repo (no `docs/llm-context.md` found). The toolkit needs `~/Projects/Claude/magnus-website` as the project folder. Want me to:
> 1. Run **magnus-setup** for the install / re-open instructions, or
> 2. Exit so you can re-open this Claude project pointed at `~/Projects/Claude/magnus-website` and try again?

Wait for their direction. If they pick 1, invoke **magnus-setup**. If they pick 2, stop. Don't read or edit anything until you confirm the working directory is correct.

## Step 2 — Identify the target page

Resolve the user's reference to a single file under `src/pages/`:

- Route given (`/solutions/embed`) → `src/pages/solutions/embed.astro`
- Page name ("the about page", "the team page") → match by filename
- Ambiguous ("the solutions page" when there are five) → ask which one
- Cannot resolve → ask, do not guess

Confirm the resolved path with the user in one short line before reading.

## Step 3 — Classify the change

Allowed change types:

| Type | Example | Notes |
|---|---|---|
| Copy edit | headline, eyebrow, body paragraph, link label | Apply brand voice rules below |
| CTA change | swap href, label, or variant on a button | Variants must be one of `primary`, `secondary`, `navy`, `ai` |
| Component prop tweak | change `accent`, `variant`, `topVariant`, `tags`, `metric` | Must be a value listed for that prop in `docs/llm-context.md` §3 |
| Section reorder | move a `<section>` block up/down | No prop changes implied |
| Section removal | delete an existing section block | Confirm explicitly — this is destructive |
| SEO update | `title` and `description` props on `<Layout>` | Title format `"[Page] | Magnus Consulting"`; description 120–155 chars |
| Image/asset swap | replace a `src=` with another file already in `/public` | New uploads → `magnus-manage-assets` |

Out of scope — refuse and redirect:

- Adding a new section, card, or component → **magnus-add-section**
- Adding a new page or route → the relevant `magnus-add-*` skill
- Changing colours, fonts, spacing, or any CSS token → not permitted in admin flow; tell the user this is a design change and direct them to the developer
- Adding inline `style="color:#…"` or raw px values → refuse
- Italics or `<em>` inside `<h1>`–`<h3>` → refuse, point at `<span class="accent">`
- New `<script>` blocks, event handlers, or third-party embeds → refuse

## Step 4 — Approval gate check

Before reading the file, decide whether the change is **gated**. A gated change cannot be applied until the user provides an approval phrase in chat (see Step 5).

### Gated paths (always)

The change is gated if the target file matches any of:

- `src/pages/privacy-policy.astro`
- `src/pages/terms-and-conditions.astro`
- `src/pages/cookie-policy.astro`
- `src/pages/modern-slavery-policy.astro`
- `src/pages/index.astro` **and** the change touches the `<HeroSection>` block
- Any file under `src/pages/impact/growth-story/` (entire growth story tree)

### Gated content (regardless of path)

The change is also gated if the diff touches any of:

- A `metric=` or `metricSub=` prop on a `<CsCard>`
- A `value=` prop on a `<StatCard>` or `<CredentialCard>`
- A real-money value (`£`, `€`, `$` followed by digits) or a percentage attached to a client name
- A client name itself (e.g. "DHL", "Iron Mountain") in a quote, byline, or attribution
- The `quote=` prop on `<Testimonial>` or `<TestimonialWide>`, or quote text inside a `<TestimonialCarousel>` slides array

If you are unsure whether a value is "from a real client story", treat it as gated and ask the user.

### Non-gated changes

Routine edits to non-gated paths and non-gated content (typos, eyebrow tweaks, sub-headings, CTA labels that don't change targets, SEO descriptions, link labels) proceed straight from Step 5 to Step 6.

## Step 5 — Request approval (gated changes only)

If Step 4 flagged the change as gated, **stop before any edit** and respond with this template, filled in:

> This change touches **[path or content type]**, which is gated for sign-off.
>
> To proceed, paste the line **`approved by <name>`** in chat, where `<name>` is the partner or designated approver who has signed off on this change. The approval will be recorded in `.magnus-changes/pending.log` and travel with the change to publish.
>
> If you don't have approval yet, stop here and get it before continuing.

Wait for the user's reply. Accept only a message that contains `approved by ` (case-insensitive) followed by a non-empty name. Anything else is a refusal — explain and wait again.

Once approval is given, append a single line to `.magnus-changes/pending.log` (create the file and directory if missing) in this exact format:

```
<ISO-8601 timestamp> | <relative path> | <one-line summary> | approved by <name>
```

Example:

```
2026-04-29T10:31:00Z | src/pages/impact/growth-story/dhl/strategic-accounts.astro | Update DHL pipeline metric from £270M to £290M | approved by Teresa Allan
```

This log is consumed by `magnus-publish` to compose the commit message and PR description, then truncated. Make sure `.magnus-changes/` is in `.gitignore`; if not, add it before writing the log.

## Step 6 — Read the file and any components it uses

Read the page file. If the change touches a component prop, also confirm the prop exists in `docs/llm-context.md` §3. Do not read the component source unless the doc is silent on the prop — the doc is authoritative.

## Step 7 — Apply guardrails before drafting

Run this checklist against the proposed change:

- **Tokens only.** No raw hex, no raw px outside font-size in inline styles. Use `var(--coral)`, `var(--sp-8)`, etc.
- **Component vocabulary.** Only props/values documented in §3 of `docs/llm-context.md`.
- **Title accent.** Coral emphasis = `<span class="accent">phrase</span>`. Never `<em>`, never italics, never inline colour.
- **Primary CTA convention.** Primary CTA on a page should point to `/contact` unless the user explicitly overrides — flag if they're changing it elsewhere.
- **Brand voice (§6 of the doc).** Direct, evidence-led, short sentences, active voice. No "synergies", "value-add", "solutions landscape", soft-sell phrasing. Numbers must come from the user, not be invented.
- **SEO.** Every `<Layout>` keeps a unique title and 120–155 char description. If the user's new copy makes the description stale, propose an updated description and ask.
- **Eyebrow style.** Short uppercase descriptor. Don't let it drift into a sentence.
- **Section background rhythm.** If reordering or removing sections, never leave two `.section-bg-navy` blocks adjacent.

If any check fails, do not write yet. Tell the user what's blocking, propose a compliant alternative, and wait.

## Step 8 — Show a preview, then confirm

Output the proposed edit as a unified diff or before/after block, no longer than ~40 lines. End with one sentence asking for go-ahead. Do not edit until the user replies with an explicit yes.

For multi-edit requests, list every change as a numbered punch list first, get approval on the list, then apply.

## Step 9 — Apply the edit

Use the `Edit` tool. One change per `Edit` call where practical so the user can review each in their tool log. Preserve indentation and surrounding whitespace exactly.

## Step 10 — Smoke check

After writing:

1. Re-read the changed file.
2. Confirm imports still resolve (no removed component imports left behind, no new imports needed for this scope of edit — if there are, you've drifted into add-section territory and should stop).
3. Confirm the page still has exactly one `<Nav>`, one `<Footer>`, and `<Layout>` wrapping the body.
4. Run `npx astro check` if the user wants type validation; otherwise skip.

If anything is off, tell the user before declaring done.

## Step 11 — Surface the change in the live preview

After saving, get the change in front of the admin in real time. Resolve the URL of the page just edited (e.g. `src/pages/about.astro` → `/about`, `src/pages/solutions/embed.astro` → `/solutions/embed`, `src/pages/index.astro` → `/`).

Cascade:

1. **Try `preview_list()`.** If success and a `magnus-dev` server is in the list — capture its `serverId` and navigate the pane:
   ```
   preview_eval({ serverId, expression: "window.location.assign('<route>')" })
   ```
   Tell the user the preview pane is now showing the changed page. Done.
2. **Otherwise try `magnus_dev_status`.** If success and `running: true` — the helper-managed dev server is already up. Just open the URL:
   ```
   magnus_open_url({ url: "http://localhost:4321<route>" })
   ```
   Tell the user the changed page is now open in their browser. Done.
3. **Otherwise** (no preview running anywhere, or both MCPs unavailable) — ask the user once:
   > Want to preview this live? I can spin up the dev server and open `<route>`.
   - If yes → invoke the **magnus-preview** skill, passing `<route>` as the target. It will pick the right mechanism for the current context.
   - If no → continue to Step 12.

Astro HMR keeps the preview in sync with subsequent edits regardless of which path was used. Don't screenshot the preview unless the user asks.

## Step 12 — Hand off

Finish with a one-line summary of what changed and one suggested next step:

- If the preview is showing the page: "Change is live at `<route>` in the preview pane. Ready to ship? Run **magnus-publish**."
- If the user declined the preview: "Ready to preview later? Run **magnus-preview**. Ready to ship? Run **magnus-publish**."

For gated changes, remind the user the approval is already recorded in `.magnus-changes/pending.log` and will travel with the commit.

Do not push, commit, or build yourself — that is `magnus-publish`'s job.

## Refusal templates

Use these verbatim when the situation matches:

> That change would introduce a new component (`X`) that isn't in the documented library. The closest documented component is `Y` — want to use that instead? If you genuinely need a new component, this is a developer change rather than an admin edit.

> I can't add raw colour values or italics to a heading on this site. Coral emphasis is done with `<span class="accent">phrase</span>`. Want me to apply that instead?

> That meta description is N characters — the rule is 120–155. Here's a tightened version: …

> The primary CTA on Magnus pages conventionally points to `/contact`. You're pointing it at `Z` — was that intentional?

> This change touches a client metric (`£270M → £290M` on DHL). I need an approval line in chat — paste `approved by <name>` to proceed, or stop here and get sign-off first.
