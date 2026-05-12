---
name: magnus-add-team-member
description: Add a new team member profile to the Magnus Consulting Astro site. Use when the user wants to add a person to /team — a new partner, principal consultant, strategist, analyst, AI team member, advisor, or associate. Appends a typed entry to src/data/team.ts which auto-generates the bio page at /team/<slug> and the matching card on /team. Enforces the documented data shape (group, role, bio paragraphs, related items, related solutions, SEO title and description), the five team groups, and a content sign-off gate. NOT for editing an existing team member's bio (use magnus-edit-page or edit the team.ts entry directly), removing a member, or deleting profiles.
---

# Magnus — Add team member

You are adding a new entry to `src/data/team.ts`. The dynamic route at `src/pages/team/[slug].astro` will render the bio page automatically; the team index will surface the matching card. You don't edit any `.astro` files yourself — the data file is the single source of truth.

## Step 1 — Load the contract

Read `docs/llm-context.md` in full. Pay particular attention to **§4.6 Adding or editing a team member**, which defines the `TeamMember` data shape and the group-to-section mapping.

If `docs/llm-context.md` is missing, the working directory isn't the magnus repo. Don't proceed. Tell the user:

> This folder isn't the magnus repo (no `docs/llm-context.md` found). The toolkit needs `~/Projects/Claude/magnus-website` as the project folder. Want me to:
> 1. Run **magnus-setup** for the install / re-open instructions, or
> 2. Exit so you can re-open this Claude project pointed at `~/Projects/Claude/magnus-website` and try again?

## Step 2 — Read the existing data file

Read `src/data/team.ts` in full. You need:

- The current `members` array — to check the new slug doesn't collide with an existing entry, to see how the existing entries are formatted, and to know where to insert the new one (just before the `];` that closes the array).
- The `TeamGroup` union — confirms the five valid group values.
- The `RelatedItemType` union — confirms the four valid related-item types.

Treat the structure of an existing entry (e.g. Teresa Allan) as the canonical formatting: indentation, single quotes on strings without apostrophes, double quotes on strings that contain apostrophes, trailing commas after every property and every array element.

## Step 3 — Gather the inputs

Ask the user for each of these, unless already supplied. One bundled prompt or one short prompt per turn — your call. **Do not invent any of them.** If the user supplies a draft document or pastes a bio, parse it and confirm the extracted fields before continuing.

| Input | Required | Constraint |
|---|---|---|
| `name` | yes | Display name. Sentence case, e.g. "Teresa Allan". |
| `slug` | yes | Kebab-case. Default: derive from name (`teresa-allan`). Must be lowercase, hyphenated, no spaces or punctuation. Must not collide with an existing entry. |
| `role` | yes | Job title, e.g. "Managing Partner", "Principal Consultant", "Strategist", "Analyst", "Advisor", "Associate Senior Consultant, PR and Communications". Sentence case, no abbreviations. |
| `group` | yes | One of: `partners`, `consultants-strategy`, `ai-team`, `operations`, `advisors-associates`. See Step 4 for which to pick. |
| `aiTeam` | conditional | `true` only when `group: 'ai-team'`. Triggers the coral top-border on the team card and the turquoise hero accent on the bio page. Omit (default `false`) for everyone else. |
| `tagline` | yes | One sentence, ~12–25 words. Reads as a positioning statement under the name. No client names or specific metrics — keep it about what the person *does*. |
| `bio` | yes | Array of 2–3 paragraphs. First paragraph leads with what they do and who they do it for. Bold key differentiating phrases by writing them as plain text (no markdown). Mention specific clients and outcomes where they're public knowledge. |
| `related` | yes | Array of related articles, case studies, reports, and TBCs. At minimum one entry. Each item: `{ type, title, href? }`. If the person has no published content yet, include a single TBC entry with title "Content to be confirmed. Please add articles, case studies or reports authored or contributed to by &lt;FirstName&gt;." |
| `solutions` | yes | Array of `{ label, href? }`. Three to five entries from the Magnus solution / capability vocabulary. Include `href` only for solutions with a documented site route (see Step 4). Ones without an href render as muted placeholders — that's acceptable. |
| `linkedin` | optional | Full URL or omit. |
| `email` | optional | `firstname@magnusconsulting.co.uk` or omit. |
| `pageTitle` | yes | SEO `<title>`. Format: `[Name] | [Role] | [Specialism] | Magnus Consulting`. Specialism is optional but useful, e.g. `B2B Growth Consultancy`, `B2B GTM Strategy`, `Brand and GTM Strategy`. |
| `metaDescription` | yes | 150–300 chars. Starts with `Meet [Name], [Role] at Magnus Consulting.` Then one sentence on what they do. |

## Step 4 — Map known values

### Group → role conventions

| Group | Typical roles |
|---|---|
| `partners` | Managing Partner, Partner |
| `consultants-strategy` | Principal Consultant, Strategist, Analyst, Research Director |
| `ai-team` | Head of AI Strategy, Lead AI Engineer, AI Strategist, AI Engineer |
| `operations` | Operations Director, Senior Demand Generation Manager, Programme Director |
| `advisors-associates` | Advisor, Strategic Advisor, Associate Senior Consultant, Associate (any specialism) |

If the user's role doesn't fit any group cleanly, ask which group fits best — don't guess.

### Solution label → href mapping

When the user lists Related Solutions, attach `href` only when a documented page exists. Use this lookup:

| Solution label | `href` |
|---|---|
| GTM Strategy / How to Win | `/solutions/how-to-win` |
| Where to Play / Defining Growth Focus | `/solutions/where-to-play` |
| Embed Growth / Embedding Growth / Embedding Growth Experts (M:TALENT) | `/solutions/embed` |
| Activate Growth / Strategic Account Growth (ABM) / AI Innovation Sprints | `/solutions/activate` |
| Insights | `/insights` |
| Reports | `/insights/reports` |
| About Magnus | `/about` |

Anything not on this list — `Commercial Due Diligence`, `Commercial Gap Analysis (Magnify)`, `Brand Strategy`, `Magnitude Platform`, `CCC Intelligence`, `Careers at Magnus`, `Sustainability` — has no documented route yet. Omit `href`. The page renders these as muted dashed-border placeholders.

### Related item types and tag colours

| `type` | Use for |
|---|---|
| `ARTICLE` | Editorial / blog content. Renders with a teal tag. |
| `CASE STUDY` | Client growth story. Renders with a coral tag. Add `href` if a story exists at `/impact/...`. |
| `REPORT` | Whitepaper or research report, e.g. GTM Confidence Index. Renders with a navy tag. Add `href` to `/insights/reports/...` when known. |
| `TBC` | Placeholder when no content exists yet. Renders muted. |

## Step 5 — Validate

Run this checklist before composing the entry:

- **Slug uniqueness.** Search the read content of `team.ts` for `slug: '<slug>'` and `slug: "<slug>"`. If found, ask the user for a different slug, or whether they meant to edit (route them to **magnus-edit-page** or to a direct edit of `team.ts`).
- **Slug format.** `^[a-z0-9]+(-[a-z0-9]+)*$`. Refuse anything else.
- **Group validity.** Must be one of the five values. Refuse anything else.
- **`aiTeam` consistency.** If `aiTeam: true`, group must be `ai-team`. If group is `ai-team`, set `aiTeam: true`. Mismatches → fix or ask.
- **Tagline.** 8–35 words. Doesn't end in a question mark. Doesn't quote the firm.
- **Bio.** 2–3 paragraphs, each at least 25 words. No markdown. No fabricated metrics or clients — if the user supplied a draft, the contents are theirs.
- **`pageTitle`.** Matches the `[Name] | [Role] | [Specialism]? | Magnus Consulting` shape. If the user gave a title that ends with `Magnus Consulting`, accept it; otherwise ask.
- **`metaDescription`.** 150–300 chars, starts with `Meet [Name], [Role] at Magnus Consulting.`
- **Related.** At least one entry. Every entry has a non-empty `title`. `type` is one of the four valid values.
- **Solutions.** 1–5 entries. Every entry has a non-empty `label`. `href`, if present, starts with `/`.

If anything fails, do not insert yet. Report what's blocking and propose a fix. Wait.

## Step 6 — Approval gate

Every new team member is gated. Publishing a person's bio under the firm's name requires explicit content sign-off — typically from the partner who owns the team page and confirms the subject themselves has approved their own bio.

Ask the user:

> New team member profiles are gated for content sign-off. Paste **`approved by <name>`** in chat — `<name>` is the partner or designated reviewer who has confirmed this bio is approved for publication and that the subject themselves has signed off on their own copy.

Wait for an exact match (`approved by ` followed by a non-empty name, case-insensitive). On success, append one line to `.magnus-changes/pending.log` (create directory and `.gitignore` entry if missing):

```
<ISO-8601 UTC> | src/data/team.ts | Add team member: <name> (<role>, <group>) → /team/<slug> | approved by <approver>
```

## Step 7 — Compose the entry

Build the new `TeamMember` object literal as TypeScript source, matching the formatting of existing entries exactly. Use this template:

```typescript
  {
    slug: '<SLUG>',
    name: '<NAME>',
    role: '<ROLE>',
    group: '<GROUP>',
    aiTeam: true,
    tagline: '<TAGLINE>',
    bio: [
      '<PARA 1>',
      '<PARA 2>',
      '<PARA 3>',
    ],
    related: [
      { type: 'ARTICLE', title: '<TITLE>', href: '<HREF>' },
      { type: 'TBC', title: '<TBC TEXT>' },
    ],
    solutions: [
      { label: '<LABEL>', href: '<HREF>' },
      { label: '<LABEL_NO_HREF>' },
    ],
    linkedin: '<URL>',
    email: '<EMAIL>',
    pageTitle: '<TITLE>',
    metaDescription: '<DESCRIPTION>',
  },
```

Formatting rules:

- **Quoting.** Strings without apostrophes use single quotes. Strings containing apostrophes (`it's`, `Magnus's`) use double quotes — switch the entire string, don't backslash-escape mid-quote.
- **Trailing commas everywhere** — after every property, every array element, every nested object property.
- **Indentation.** Two spaces per level. The opening `{` of the entry is at four spaces (since the entry sits inside the `members` array which is inside `export const`).
- **Optional fields.** Omit `aiTeam` when false (don't write `aiTeam: false`). Omit `linkedin`, `email`, `image` if not provided. Omit `href` on `solutions[]` and `related[]` when not provided.
- **No markdown** in any string. The page renders bios as plain `<p>` blocks; markdown formatting will appear literally.

## Step 8 — Show preview, then confirm

Output, in this order:

1. **Summary** — name, role, group, slug, paragraph count, related count, solutions count.
2. **Insertion target** — `src/data/team.ts`, position: just before the closing `];` of the `members` array, after the last existing entry.
3. **Composed entry** — the full TypeScript object literal as it will be inserted, exactly.
4. **Audit log entry** — the line that will be appended to `.magnus-changes/pending.log`.
5. **One sentence asking for go-ahead.**

Wait for explicit yes. Do not edit before that.

## Step 9 — Apply the edit

Use the `Edit` tool on `src/data/team.ts` to insert the new entry. The cleanest target is the closing `];` of the array, prefixed by the last entry's trailing comma and newline.

Search for the literal:

```
];

export function getMembersByGroup
```

Replace with:

```
  <NEW ENTRY>,
];

export function getMembersByGroup
```

Where `<NEW ENTRY>` is the composed object literal from Step 7, **without** the trailing comma (the comma is on the replacement line). Preserve the blank line between `];` and `export function`.

If the file structure has changed (e.g. the helpers have been refactored elsewhere), fall back to inserting before the `];` that immediately follows the last entry — but only after re-reading the file to confirm.

Append the audit log entry to `.magnus-changes/pending.log`.

## Step 10 — Smoke check

After writing:

1. **Re-read** `src/data/team.ts`. Confirm the new entry is in the array and the array still parses (look for matched braces, trailing comma after the new entry, the closing `];` still present).
2. **Type-check.** Run `npx astro check 2>&1 | tail -20` from the magnus repo root. Refuse to declare done if there are new errors. Pre-existing warnings/hints are fine.
3. **Build path check.** Confirm `src/pages/team/[slug].astro` is unchanged (you should not have touched it). The dynamic route picks up the new slug automatically.

If any check fails, tell the user and offer to revert the insert by undoing the edit. Don't keep going.

## Step 11 — Surface the new bio in the live preview

Target route: `/team/<slug>`. Cascade:

1. **Try `preview_list()`.** If success and a `magnus-dev` server is in the list — `preview_eval({ serverId, expression: "window.location.assign('/team/<slug>')" })`. The new bio appears in the preview pane. Done.
2. **Otherwise try `magnus_dev_status`.** If success and `running: true` — `magnus_open_url({ url: "http://localhost:4321/team/<slug>" })`. Done.
3. **Otherwise** — ask once:
   > Want to preview the new bio live? I can spin up the dev server and open `/team/<slug>`.
   - If yes → invoke **magnus-preview** with `/team/<slug>` as the target.
   - If no → continue.

The team index card should appear automatically too once the user navigates back to `/team` — it reads from the same data file.

## Step 12 — Hand off

End with one line summarising what changed and one suggested next step:

- Preview running: "Added `<name>` to `src/data/team.ts`. Bio now showing at `/team/<slug>` in the preview. Approval recorded for `<approver>`. Ready to ship? Run **magnus-publish**."
- Preview declined: "Added `<name>` to `src/data/team.ts`. Bio is at `/team/<slug>`. Approval recorded for `<approver>`. Ready to preview later? Run **magnus-preview**. Ready to ship? Run **magnus-publish**."

Don't commit, push, or build. That's `magnus-publish`'s job.

## Refusal templates

> The slug `<slug>` already exists in `src/data/team.ts` (it's `<existing-name>`). Pick a different slug, or use **magnus-edit-page** if you meant to update the existing entry.

> Group `<X>` isn't one of the five documented groups (`partners`, `consultants-strategy`, `ai-team`, `operations`, `advisors-associates`). Pick one, or this becomes a developer change to add a new group.

> `aiTeam: true` only goes with `group: 'ai-team'`. Either switch the group, or unset `aiTeam`.

> The bio you gave references a client metric (`£X for <client>`) I can't verify. Either remove the metric, or supply a published source — and either way I'll need a second approval line specifically calling out the client metric before this ships.

> The role `<role>` doesn't fit any of the documented group buckets. Which group should I file this person under? Adding a new group is a developer change to `src/data/team.ts` and `docs/llm-context.md`.
