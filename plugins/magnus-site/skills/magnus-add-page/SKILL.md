---
name: magnus-add-page
description: Create a generic standard content page on the Magnus Consulting site that doesn't fit one of the specific creation templates — a legal notice, a landing page, an "About [topic]" page, a careers page, a press kit. Use when the user says "create a new page", "add a /careers page", "make a privacy notice for [sub-product]", or "add a landing page for [campaign]". Assembles the page only from documented components (HeroSection, SectionIntro, FeatureBlock, Callout, CtaSection, etc.) and refuses to introduce new components or off-system styling. NOT for insights articles (use magnus-add-insight-article), reports (use magnus-add-report), team profiles (use magnus-add-team-member), growth stories (use magnus-add-growth-story), or new solution discipline pages (developer-only).
---

# Magnus — Add page

You are creating a one-off standard content page that doesn't fit one of the specific creation templates. The skill is the catch-all for legal notices, landing pages, "About [topic]" pages, careers pages, press kits, and similar. The skill is deliberately generic — it leans on the user to specify the page's structure rather than imposing a template.

## Step 1 — Load the contract

Read `docs/llm-context.md` in full. Focus on §3 (the component library) and §4 (page templates). The skill composes the new page entirely from documented components.

If `docs/llm-context.md` is missing, the working directory isn't the magnus repo. Offer to run **magnus-setup** or stop.

## Step 2 — Confirm this is the right skill

Before going further, confirm the user's request doesn't fit a more specific creation skill. Route them appropriately:

- Article on `/insights` → **magnus-add-insight-article**
- Report on `/insights/reports` → **magnus-add-report**
- Team member profile → **magnus-add-team-member**
- Client growth story → **magnus-add-growth-story**
- New solution discipline (5th capability) → developer change, refuse
- Adding a section to an existing page → **magnus-add-section**

If the user's intent fits one of those, route them and stop. **magnus-add-page** is for everything else — typically:

- Legal notices (cookie sub-policies, GDPR addenda)
- Sub-brand or product landing pages (e.g. `/about/m-talent`)
- Marketing campaign landings
- Careers / "Work with us"
- Press / Media kit
- Sustainability statement
- Generic "About X" pages

## Step 3 — Gather the page inputs

Ask the user, unless already supplied:

| Input | Required | Constraint |
|---|---|---|
| `route` | yes | The URL path. Must start with `/`, must not collide with an existing route. Kebab-case where possible (`/work-with-us`, not `/workWithUs`). |
| `pageType` | yes | One of: `legal`, `landing`, `about`, `careers`, `press`, `sustainability`, `other`. Drives the suggested section sequence and the gate level. |
| `title` | yes | The page's H1, sentence case. ≤ 90 chars. May contain `<span class="accent">phrase</span>`. |
| `eyebrow` | yes | Short uppercase label (e.g. `Legal`, `Careers at Magnus`, `Press`, `Sustainability`). |
| `sub` | yes | The hero standfirst. 1–2 sentences. 200–400 chars. |
| `seoTitle` | yes | `[Page] | Magnus Consulting`. Under 100 chars. |
| `seoDescription` | yes | 120–155 chars. |
| `sectionPlan` | yes | Ordered list of sections to include in the page body. Each entry: `{ component, intent, copy }`. See Step 4. |
| `cta` | optional | Whether to include a `CtaSection` at the end. Default yes. If yes: `{ eyebrow?, heading, body?, primaryLabel, primaryHref, secondaryLabel?, secondaryHref? }`. |

## Step 4 — Plan the section sequence

For each section in the body, the user specifies (or you propose, then confirm):

- **Component** — which documented component (`SectionIntro` + cards, `FeatureBlock`, `Callout`, `FaqAccordion`, `LogoCarousel`, etc.). Refuse anything not in `docs/llm-context.md` §3.
- **Intent** — what the section is communicating ("the four values", "process steps", "FAQs", "split text + visual").
- **Copy** — the actual content the section needs.

Suggested defaults per `pageType`:

| `pageType` | Suggested section sequence |
|---|---|
| `legal` | `HeroSection` → body in `.container-narrow` (rich text only, no decorative components) → `CtaSection` (or no CTA for pure legal pages) |
| `landing` | `HeroSection` → `FeatureBlock` × 1–2 → `SectionIntro` + card grid → `Callout`s on navy bg → `CtaSection` |
| `about` | `HeroSection` → `FeatureBlock` → `SectionIntro` + card grid → `CtaSection` |
| `careers` | `HeroSection` → `FeatureBlock` (why us) → `SectionIntro` + `ValueCard` grid → `Callout` x 2 → `CtaSection` |
| `press` | `HeroSection` → `SectionIntro` + assets list → `Callout` (contact) → `CtaSection` |
| `sustainability` | `HeroSection` → `FeatureBlock` → `SectionIntro` + `StatCard` grid → `Callout`s → `CtaSection` |
| `other` | Ask the user; propose a structure based on their request |

For long-text sections (legal copy, policy text), use `<div class="container-narrow">` with raw `<h2>` / `<p>` / `<ul>` — same pattern as the article body in `magnus-add-insight-article`. Keep the markup minimal.

## Step 5 — Validate

- **Route uniqueness.** Resolve `route` to a file path under `src/pages/` (e.g. `/work-with-us` → `src/pages/work-with-us.astro`, `/about/m-talent` → `src/pages/about/m-talent.astro`). Confirm the file doesn't exist. If it does, ask whether to use **magnus-edit-page** instead.
- **Route format.** Must start with `/`, must be kebab-case, no trailing slash.
- **Section components.** Every entry in `sectionPlan` must reference a component documented in `docs/llm-context.md` §3. Refuse anything else.
- **Background rhythm.** No two `.section-bg-navy` blocks adjacent in the proposed sequence (per §2.8).
- **Copy length.** Hero `sub` 200–400 chars; SEO description 120–155.

## Step 6 — Approval gate

Approval depends on `pageType`:

- **`legal`** — always gated. Legal copy is high-stakes. Require `approved by <name>` from a partner or legal contact.
- **`landing`, `about`, `careers`, `press`, `sustainability`, `other`** — gated only if the page contains client metrics, named clients in quotes, or testimonials with attribution. Otherwise no gate beyond user confirmation.

If gated, append to `.magnus-changes/pending.log`:

```
<ISO> | src/pages/<path> | New <pageType> page: "<title>" at <route> | approved by <name>
```

## Step 7 — Compose the page

Use the standard page skeleton from `docs/llm-context.md` §4.1, then assemble the body from the `sectionPlan`.

Skeleton:

```astro
---
import Layout from '<RELATIVE>/layouts/Layout.astro';
import Nav from '<RELATIVE>/components/Nav.astro';
import Footer from '<RELATIVE>/components/Footer.astro';
import HeroSection from '<RELATIVE>/components/sections/HeroSection.astro';
import CtaSection from '<RELATIVE>/components/sections/CtaSection.astro';
// + any other section / UI imports needed by the sectionPlan
---

<Layout
    title="<SEO_TITLE>"
    description="<SEO_DESCRIPTION>"
>
    <Nav activeLink="<ACTIVE_LINK_VALUE_OR_EMPTY>" />

    <HeroSection
        eyebrow="<EYEBROW>"
        title="<TITLE>"
        sub="<SUB>"
        actions={[<HERO_ACTIONS>]}
        fullWidth
        maxWidth="760px"
    />

    <!-- BODY SECTIONS BUILT FROM sectionPlan -->

    <CtaSection
        eyebrow="<CTA_EYEBROW>"
        heading="<CTA_HEADING>"
        body="<CTA_BODY>"
        buttons={[
            { label: '<PRIMARY_LABEL>', href: '<PRIMARY_HREF>', variant: 'primary' },
            { label: '<SECONDARY_LABEL>', href: '<SECONDARY_HREF>', variant: 'secondary' },
        ]}
    />

    <Footer />
</Layout>
```

`<RELATIVE>` is the relative path from the new page to the components directory:

| Page location | `<RELATIVE>` |
|---|---|
| `src/pages/foo.astro` | `..` |
| `src/pages/foo/bar.astro` | `../..` |
| `src/pages/foo/bar/baz.astro` | `../../..` |

`<ACTIVE_LINK_VALUE_OR_EMPTY>` matches an existing top-level nav value (`home`, `solutions`, `challenges`, `impact`, `insights`, `team`, `about`, `contact`) if the page belongs to one of those sections. Use empty string `""` for legal pages and other off-nav pages.

For body sections, follow the patterns in **magnus-add-section** Step 7 — `SectionIntro` + grid, `FeatureBlock`, `Callout` blocks, etc. Match the existing site's indentation and comment markers.

## Step 8 — Plan the nav update (if applicable)

If the new page should be reachable from the global nav (most landing / about / careers pages), the user almost certainly wants a corresponding menu item too. Ask:

> Should this page appear in the main nav? Common choices:
> 1. Yes — add a menu item via **magnus-update-nav**.
> 2. No — page lives at `<route>` but is reached only via direct link or footer.

If yes, finish this skill first (page lands), then route to **magnus-update-nav** to add the menu item.

For legal / sub-product pages, the answer is usually no — they live in the footer or are linked from specific contexts.

## Step 9 — Show preview, then confirm

Output:

1. **File to be created:** `src/pages/<path>.astro` — show the full skeleton with first body section, last body section, and the CTA. Compact, not the full file body.
2. **Section plan summary** — bullet list of the components and their intent.
3. **Background rhythm check** — confirm no two `.section-bg-navy` blocks adjacent.
4. **Audit log entry** if gated.
5. **Nav update suggestion** — yes / no, with the next-step routing.
6. One sentence asking for go-ahead.

Wait for explicit yes.

## Step 10 — Apply the changes

1. **Create the parent directory** if needed: `mkdir -p src/pages/<dir>`.
2. **Write** the new file at `src/pages/<path>.astro` via the `Write` tool.
3. **Append** the audit log entry if Step 6 required one.

## Step 11 — Smoke check

- Re-read the new file. Confirm imports resolve, `<Layout>` wraps the body, `<Nav>` and `<Footer>` are both present, no `<UPPERCASE>` placeholders remain.
- Run `npx astro check 2>&1 | tail -10`. Refuse to declare done on new errors.

## Step 12 — Surface in live preview

Target route: `<route>`. Cascade:

1. Try `preview_list()`. If success and `magnus-dev` running — `preview_eval` to navigate. Done.
2. Else try `magnus_dev_status`. If running — `magnus_open_url('http://localhost:4321<route>')`. Done.
3. Else ask once whether to start a preview.

## Step 13 — Hand off

End with one or two lines:

- Page only: "New page scaffolded at `<route>`. Showing in the preview. Ready to ship? Run **magnus-publish**."
- Page + nav update needed: "New page at `<route>`. Now run **magnus-update-nav** to add the menu item, then **magnus-publish** when both changes are ready."
- Page + approval recorded: "New page at `<route>`. Approval recorded for `<name>`. Ready to ship? Run **magnus-publish**."

Don't commit, push, or build.

## Refusal templates

> The route `<X>` already exists at `src/pages/<path>`. Pick a different route, or use **magnus-edit-page** if you meant to update the existing page.

> Adding a fifth solution discipline page is a strategic move, not an admin task. The four disciplines (Where to Play, How to Win, Embed, Activate) are the firm's core model — adding a fifth is a developer change with input from the partners.

> The section `<component>` you mentioned isn't in `docs/llm-context.md` §3. Pick from the documented components, or this becomes a developer change to add a new component.

> That page sequence puts two `.section-bg-navy` blocks adjacent. Reorder, or change one to a light background.

> Legal pages are always gated. Paste `approved by <name>` to proceed — typically the partner with legal sign-off responsibility.
