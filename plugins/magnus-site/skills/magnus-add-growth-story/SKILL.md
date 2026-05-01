---
name: magnus-add-growth-story
description: Create a new client growth story (case study) on the Magnus Consulting website. Use when the user says "add a growth story", "publish a case study", "add a client story for [client]", or "create a new story under /impact". Generates a markdown file in src/content/growth-stories/<client>/<slug>.md matching the documented zod schema (the dynamic route at /impact/growth-story/[...slug] renders it automatically) and inserts a matching CsCard at the top of the /impact grid. Enforces double sign-off — one approval for the story, one for the client metric — because growth stories carry real client numbers and named clients. NOT for editing an existing story (use magnus-edit-page) or for adding insights articles or reports (use magnus-add-insight-article / magnus-add-report).
---

# Magnus — Add growth story

You are creating a new client growth story under `/impact/growth-story/<client>/<slug>` and adding the matching `CsCard` to the `/impact` index. Growth stories are firm-published client outcomes — every one carries a real client name and real metrics, so they're double-gated.

## Step 1 — Load the contract

Read `docs/llm-context.md` in full. Then read `src/content.config.ts` — it defines the zod schema for the growth-stories collection, which is the canonical source of truth for what fields a story file must contain.

Also read at least two existing stories from different clients (e.g. `src/content/growth-stories/dhl/strategic-accounts.md` and `src/content/growth-stories/iron-mountain/gtm.md`) to learn the formatting conventions: indentation, where pull quotes go, how stats are written, related-story patterns.

If `docs/llm-context.md` or `src/content.config.ts` are missing, the working directory isn't the magnus repo. Don't proceed. Offer to run **magnus-setup** or stop.

## Step 2 — Read the impact index

Read `src/pages/impact/index.astro`. The CsCard you'll insert goes at the top of the grid (just below the opening `<div class="cs-grid" id="story-grid" ...>`). Note the existing tag-filter values — your new card's `dataTags` need to match one or more of those for filtering to work.

## Step 3 — Gather the story inputs

Ask the user for each of these. One bundled prompt or one per turn — your call. Don't invent any.

### Identity

| Input | Required | Constraint |
|---|---|---|
| `clientName` | yes | The client (e.g. `DHL`, `Iron Mountain`, `Mambu`). Used as the directory name (kebab-cased). |
| `clientSlug` | yes | Kebab-case version of `clientName`. Default: derive (`Iron Mountain` → `iron-mountain`). |
| `slug` | yes | The story-specific kebab-case slug within the client (e.g. `strategic-accounts`, `gtm`, `repositioning`). Multiple stories can exist under one client. |
| `breadcrumbLabel` | yes | Short label for the breadcrumb on the story page (e.g. `DHL. Strategic Accounts`, `Iron Mountain. GTM`). |

### SEO

| Input | Required | Constraint |
|---|---|---|
| `seoTitle` | yes | Format: `[Client]: [Headline outcome]. | Magnus`. Under 100 chars. |
| `seoDescription` | yes | 120–155 chars. Names the client and the outcome. |

### Tags

| Input | Required | Constraint |
|---|---|---|
| `tags` | yes | 2–4 tags. Each: `{ label, variant }`. `variant` is one of `navy`, `coral`, `teal`. Pick from the existing impact filter vocabulary: `PE / Value creation`, `GTM strategy`, `Strategic Accounts`, `Logistics`, `Technology / SaaS`, `AI-embedded`, `Repositioning`, `Marketing`, `Activate`. |

### Hero

| Input | Required | Constraint |
|---|---|---|
| `title` | yes | The headline outcome. One sentence. ≤ 90 chars. May contain `<span class="accent">phrase</span>` for one short coral accent. |
| `sub` | yes | 1–2 sentences. The standfirst — what the engagement was and why it mattered. 200–400 chars. |
| `stats` | yes | 1–3 hero stat blocks. Each: `{ value, label, small? }`. `value` is the headline figure (e.g. `£270M+`, `47%`, `16 weeks`). `label` is one short line, max ~30 chars; supports `\n` for a break. Use `small: true` for non-numeric stats like `Full reposition`. |

### Body sections (all optional but typically all present)

| Section | Shape |
|---|---|
| `challenge` | `{ heading, body, pullQuote? }`. The commercial situation when the engagement started — what was at stake. |
| `workstreams` | Array of `{ num, title, body }`. The ordered phases of the engagement. Typically 3–5 workstreams. `num` is `01`, `02`, etc. |
| `workstreamsHeading` / `workstreamsSub` | Optional intro for the workstreams section. |
| `outcome` | `{ heading, stats?, quote?, quoteAttribution? }`. The result. Stats: `{ value, label, variant? }` where variant is `default`, `coral`, or `teal`. |

### CTA (required)

| Input | Required | Constraint |
|---|---|---|
| `cta` | yes | `{ eyebrow?, heading, body?, buttons }`. `buttons`: array of `{ label, href, variant? }`. Convention: primary button → `/contact`, secondary → `/impact`. |

### Related stories (optional)

`related`: array of 2–3 other growth-story cards to surface at the bottom. Each: `{ metric?, metricSub?, clientName?, title, body, href, topVariant?, tags? }`. Use existing stories as the source — don't invent ones that don't exist.

### Index card

| Input | Required | Constraint |
|---|---|---|
| `cardMetric` | yes | The headline figure for the `/impact` index card. Usually matches the first hero stat. |
| `cardMetricSub` | yes | Sub-label for the metric (e.g. `weighted pipeline · 16 weeks`, `pipeline · 12 weeks`). |
| `cardTitle` | yes | The card title. Format: `[Client]. [Capability]` (e.g. `DHL. Strategic Account Growth`). |
| `cardBody` | yes | 1–2 sentences. 120–200 chars. Different from the hero `sub`. |
| `cardTopVariant` | yes | One of `navy`, `deep`, `coral`, `teal`. Match the dominant tone of the engagement. |
| `cardDataTags` | yes | Space-separated string of filter values matching the impact-page filter buttons (e.g. `logistics strategic-accounts ai-embedded`). At least one. |

If the user provides a draft document or pastes a structured brief, parse it for these fields and confirm what you extracted.

## Step 4 — Validate

- **Slug uniqueness.** Confirm `src/content/growth-stories/<clientSlug>/<slug>.md` doesn't already exist.
- **Slug format.** Both `clientSlug` and `slug` must match `^[a-z0-9]+(-[a-z0-9]+)*$`.
- **Tags vs filter.** The `cardDataTags` values must each correspond to a filter button on `/impact/index.astro`. If the user wants a tag that isn't a filter value, ask whether to add a new filter (a developer change) or pick from the existing list.
- **Stats format.** Currency uses £/€/$ symbols; percentages use `%`; ranges use `+` (e.g. `£270M+`). No commas in numerals over 1000 unless typographic (`£15M`, not `£15,000,000`).
- **Workstream numbering.** Sequential from `01`.
- **Pull quote.** If `challenge.pullQuote` is provided, it should be ≤ 25 words. Pull quotes are visual punctuation, not paragraphs.
- **Outcome quote attribution.** If `outcome.quote` is provided without `quoteAttribution`, ask whether to add an attribution or remove the quote.

## Step 5 — Double approval gate

Growth stories require **two** approval lines:

1. **Story sign-off.** The partner or designated reviewer confirming the story is approved for publication. Phrase: `approved by <name>`.
2. **Client metric sign-off.** Confirmation that the named client and the specific metrics quoted are approved for public use. Phrase: `approved by <name> for <client> metric` (or list the metric specifically: `approved by <name> for DHL pipeline metric`).

Ask the user, in one prompt:

> Growth stories are double-gated.
>
> 1. Paste **`approved by <name>`** for the story sign-off.
> 2. Paste **`approved by <name> for <client> metric`** confirming the client and the specific numbers quoted are approved for publication.

Wait for both lines. Either may come from the same approver. If the user provides only one, ask for the second before continuing.

On success, append three audit log entries to `.magnus-changes/pending.log` (create directory and `.gitignore` entry if missing):

```
<ISO> | src/content/growth-stories/<clientSlug>/<slug>.md | New growth story: "<title>" (<clientName>) | approved by <name>
<ISO> | src/content/growth-stories/<clientSlug>/<slug>.md | Client metric for <clientName>: <stats summary> | approved by <name> for <clientName> metric
<ISO> | src/pages/impact/index.astro | Add CsCard for /impact/growth-story/<clientSlug>/<slug> | approved by <name>
```

## Step 6 — Compose the markdown file

Build the file at `src/content/growth-stories/<clientSlug>/<slug>.md`. Match the existing stories' YAML formatting exactly — indentation, where braces appear, where line breaks happen.

Template:

```yaml
---
seoTitle: "<SEO_TITLE>"
seoDescription: "<SEO_DESCRIPTION>"
breadcrumbLabel: "<BREADCRUMB_LABEL>"

tags:
  - { label: "<TAG_LABEL_1>", variant: "<TAG_VARIANT_1>" }
  - { label: "<TAG_LABEL_2>", variant: "<TAG_VARIANT_2>" }

title: "<TITLE>"
sub: "<SUB>"

stats:
  - { value: "<STAT_VALUE_1>", label: "<STAT_LABEL_1>" }
  - { value: "<STAT_VALUE_2>", label: "<STAT_LABEL_2>", small: true }

challenge:
  heading: "<CHALLENGE_HEADING>"
  body: "<CHALLENGE_BODY>"
  pullQuote: "<CHALLENGE_PULL_QUOTE>"

workstreamsHeading: "<WORKSTREAMS_HEADING>"
workstreamsSub: "<WORKSTREAMS_SUB>"
workstreams:
  - num: "01"
    title: "<WS_1_TITLE>"
    body: "<WS_1_BODY>"
  - num: "02"
    title: "<WS_2_TITLE>"
    body: "<WS_2_BODY>"

outcome:
  heading: "<OUTCOME_HEADING>"
  stats:
    - { value: "<OUTCOME_STAT_1_VALUE>", label: "<OUTCOME_STAT_1_LABEL>", variant: "coral" }
  quote: "<OUTCOME_QUOTE>"
  quoteAttribution: "<OUTCOME_QUOTE_ATTRIBUTION>"

cta:
  eyebrow: "<CTA_EYEBROW>"
  heading: "<CTA_HEADING>"
  body: "<CTA_BODY>"
  buttons:
    - { label: "Start the conversation", href: "/contact", variant: "primary" }
    - { label: "All growth stories", href: "/impact", variant: "secondary" }

related:
  - metric: "<RELATED_1_METRIC>"
    metricSub: "<RELATED_1_METRIC_SUB>"
    title: "<RELATED_1_TITLE>"
    body: "<RELATED_1_BODY>"
    href: "<RELATED_1_HREF>"
    topVariant: "<RELATED_1_TOP_VARIANT>"
    tags:
      - { label: "<RELATED_1_TAG_LABEL>", variant: "<RELATED_1_TAG_VARIANT>" }
---
```

YAML formatting rules:

- **Quoting.** Always double-quote string values that may contain colons, hyphens, or special characters. The existing stories use double quotes throughout — match that.
- **Embedded HTML.** The `title` field can contain `<span class="accent">phrase</span>` — keep it inside the YAML string as plain text. Don't escape the angle brackets.
- **Newlines in stat labels.** Use literal `\n` inside double-quoted strings (e.g. `"Raise\nsupported"`). The renderer handles the line break.
- **Optional sections.** If `challenge`, `workstreams`, `outcome`, or `related` aren't supplied, omit the entire block. Don't write empty arrays or stubs.
- **Trailing newline.** End the file with `---` then a single trailing newline.

Body content (after the closing `---`) is currently empty for all stories — the page is built entirely from frontmatter. Don't add a body unless the user explicitly wants one.

## Step 7 — Compose the impact index card

Build the `CsCard` to insert at the **top** of the `<div class="cs-grid" id="story-grid" ...>` grid in `src/pages/impact/index.astro`.

Template:

```astro
<CsCard metric="<CARD_METRIC>" metricSub="<CARD_METRIC_SUB>"
    title="<CARD_TITLE>"
    body="<CARD_BODY>"
    href="/impact/growth-story/<CLIENT_SLUG>/<SLUG>"
    tags={[<TAG_OBJECTS>]}
    topVariant="<CARD_TOP_VARIANT>" dataTags="<CARD_DATA_TAGS>"
    ctaLabel="Read the growth story →"
/>
```

`<TAG_OBJECTS>` is the same tag array as the markdown's `tags` field, written as inline JS: `{ label: 'Logistics', variant: 'navy' }, { label: 'Strategic Accounts', variant: 'coral' }`.

Match the indentation of existing cards (16 spaces of indent on the inner lines).

## Step 8 — Show preview, then confirm

Output:

1. **File to be created:** `src/content/growth-stories/<clientSlug>/<slug>.md` — show the full markdown file.
2. **File to be edited:** `src/pages/impact/index.astro` — show the new `<CsCard>` exactly as it will appear and the line where it'll be inserted.
3. **Audit log entries** (three of them).
4. One sentence asking for go-ahead.

Wait for explicit yes.

## Step 9 — Apply the changes

1. **Create the client directory** if needed: `mkdir -p src/content/growth-stories/<clientSlug>`.
2. **Write** the markdown file at `src/content/growth-stories/<clientSlug>/<slug>.md`.
3. **Edit** `src/pages/impact/index.astro` to insert the new `<CsCard>` at the top of the grid.
4. **Append** the three audit lines to `.magnus-changes/pending.log`.

## Step 10 — Smoke check

- Re-read the markdown file. Confirm YAML parses (look for matched quoting, balanced braces, no stray placeholders).
- Re-read the index. Confirm exactly one CsCard now points at the new slug, the grid is intact.
- Run `npx astro check 2>&1 | tail -20`. Refuse to declare done on new errors — the zod schema check happens during `astro check`, so a malformed frontmatter shows up here.
- If `astro check` errors mention the new file, walk the user through the validation message and offer to fix.

## Step 11 — Surface in live preview

Target route: `/impact/growth-story/<clientSlug>/<slug>`. Cascade:

1. Try `preview_list()`. If success and `magnus-dev` server is in the list — `preview_eval` to navigate. Done.
2. Else try `magnus_dev_status`. If success and running — `magnus_open_url` for `http://localhost:4321/impact/growth-story/<clientSlug>/<slug>`. Done.
3. Else ask once: "Want to preview the new growth story live? I can spin up the dev server and open `/impact/growth-story/<clientSlug>/<slug>`." If yes, invoke **magnus-preview** with that route.

## Step 12 — Hand off

End with one line:

- Preview running: "New growth story scaffolded at `/impact/growth-story/<clientSlug>/<slug>` and listed on `/impact`. Showing in the preview. Two approvals recorded for `<approver>`. Ready to ship? Run **magnus-publish**."
- Preview declined: "New growth story at `/impact/growth-story/<clientSlug>/<slug>`. Two approvals recorded. Ready to preview later? Run **magnus-preview**. Ready to ship? Run **magnus-publish**."

## Refusal templates

> The slug `<clientSlug>/<slug>` already exists at `src/content/growth-stories/<clientSlug>/<slug>.md`. Pick a different slug, or use **magnus-edit-page** if you meant to update the existing story.

> The tag `<X>` isn't in the documented tag vocabulary. Pick from: `PE / Value creation`, `GTM strategy`, `Strategic Accounts`, `Logistics`, `Technology / SaaS`, `AI-embedded`, `Repositioning`, `Marketing`, `Activate`. Adding a new tag is a developer change to add a filter button on `/impact`.

> The `dataTags` value `<X>` doesn't match any filter button on `/impact/index.astro`. Pick from the existing filter values, or this card won't show up in any filter view.

> Growth stories need two approval lines — one for the story, one for the client metric. You only provided one. Paste the second line: `approved by <name> for <client> metric`.

> The metric format `<X>` is non-standard. Use the magnus convention — currency with £/€/$ prefix, no commas under millions, suffix with `+` for "or more" (e.g. `£270M+`). Adjust to: `<suggestion>`.

> The frontmatter failed `astro check` validation. The schema error was:
>
> `<paste tail>`
>
> The most common cause is missing required fields, wrong types, or unquoted strings. Want me to walk through and fix?
