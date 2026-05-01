---
name: magnus-add-section
description: Add a new section into an existing page on the Magnus Consulting website using only components from docs/llm-context.md. Use when the user wants to "add a section", "drop in a testimonial", "insert a stat card grid", "add a CTA block", "add an FAQ", or "put a feature block on /about". Picks the right component for the intent (HeroSection, SectionIntro + cards, FeatureBlock, CtaSection, FaqAccordion, TestimonialWide, LogoCarousel, etc.), composes the markup with only documented props, inserts at the requested position, adds any required imports, and preserves section-background rhythm. Refuses to introduce new components, raw colours, or off-system spacing. NOT for editing copy on an existing section (use magnus-edit-page) or for creating a whole new page (use magnus-add-page or one of the magnus-add-* creation skills).
---

# Magnus — Add section

You are inserting one new section into an existing page. The section uses components and tokens already documented in `docs/llm-context.md`. You don't introduce new components, new CSS classes, or new design tokens.

## Step 1 — Load the contract

Read `docs/llm-context.md` in full. Pay particular attention to:

- **§3.2 Section components** — `HeroSection`, `SectionIntro`, `FeatureBlock`, `CtaSection`, `AccordionSection`, `FaqAccordion`, `LogoCarousel`, `TestimonialCarousel`, `TestimonialWide`.
- **§3.3 UI components** — cards and widgets you'd compose into a section (`ServiceCard`, `StatCard`, `CsCard`, `AiCard`, `NumCard`, `ValueCard`, `Callout`, `TopBorderCard`, `CredentialCard`, etc.).
- **§7 Component Chooser** — the lookup table from intent to component.

If `docs/llm-context.md` is missing, the working directory isn't the magnus repo. Don't proceed. Offer to run **magnus-setup** or stop.

## Step 2 — Identify the target page

Resolve the user's reference to a single file under `src/pages/`:

- Route given (`/about`) → `src/pages/about.astro`
- Page name ("the about page") → match by filename
- Ambiguous ("the solutions page" when there are five) → ask which one
- Cannot resolve → ask, do not guess

Confirm the resolved path with the user in one short line before reading the file.

## Step 3 — Read the target page

Read the page file in full. You need:

- The current import list — to know which components are already imported.
- The current section structure — to find an appropriate insertion point.
- The current section-background pattern — to maintain alternating rhythm.

## Step 4 — Pick the right component

Map the user's intent to a documented component using the Component Chooser table from `docs/llm-context.md` §7. Quick reference:

| User wants… | Component to use |
|---|---|
| Section heading + optional body | `SectionIntro` |
| Section heading + grid of cards | `SectionIntro` + `.grid-3` or `.grid-2` of the right card type |
| Service / capability listing | `SectionIntro` + `ServiceCard` grid |
| Headline numbers / stats | `SectionIntro` + `StatCard` grid |
| AI / intelligence numbered items | `SectionIntro` + `AiCard` grid |
| Numbered process / values | `SectionIntro` + `NumCard` or `ValueCard` grid |
| White cards with coloured top border | `SectionIntro` + `TopBorderCard` grid |
| Certification / credential row | `SectionIntro` + `CredentialCard` grid |
| Split text + visual | `FeatureBlock` |
| Testimonial wide block | `TestimonialWide` |
| Testimonial carousel | `TestimonialCarousel` |
| Quote / inline testimonial | `Testimonial` (often inside another section) |
| Highlight / callout box | `Callout` (usually inside another section) |
| Logo strip | `LogoCarousel` |
| FAQ block | `FaqAccordion` or `AccordionSection` + `AccordionItem` |
| Page-end CTA | `CtaSection` |

If the user's intent doesn't fit any documented component cleanly, refuse. Don't compose a section out of bespoke markup. Tell them:

> The closest documented section type for "X" is `<Y>` — want me to use that? If you genuinely need a new component, this is a developer change, not an admin edit.

## Step 5 — Pick the insertion position

Ask the user (or infer if obvious from the request) where the section goes. Three common patterns:

- **Before a named existing section** ("above the FAQ", "before the CTA")
- **After a named existing section** ("after the hero", "below the team grid")
- **At the end of the page**, just before `<CtaSection>` and `<Footer />` (most common for "add a section to /about")

Resolve the position to a specific line — usually a `<!-- ── SECTION NAME ── -->` comment marker, or the opening tag of an existing section. State the resolution to the user before composing.

## Step 6 — Plan the section background

Look at the page's existing background rhythm — the sequence of `.section-bg-light`, `.section-bg-navy`, `style="background:var(--gray-lighter)"`, etc. The new section's background must:

- **Not duplicate** the immediately adjacent section's background. Two `.section-bg-light` blocks back to back are fine but two `.section-bg-navy` blocks in a row are forbidden (per the contract in `docs/llm-context.md` §2.8).
- **Match the section's purpose.** Default light for most. Navy (`section-bg-navy`) for high-emphasis content (proof points, calls to action). Gray (`section-bg-alt`) for alternating rhythm in long pages.

Tell the user the proposed background and let them override.

## Step 7 — Compose the section

Build the section markup. Follow the patterns of existing sections on the page — same indentation, same wrapping (`<section class="section ...">` → `<div class="container">` → content). Use only documented props from `docs/llm-context.md`.

Section template patterns:

### Pattern A — `SectionIntro` + grid of cards

```astro
<!-- ── <SECTION_NAME> ── -->
<section class="section section-bg-light">
    <div class="container">
        <div style="margin-bottom:var(--sp-12);">
            <SectionIntro
                eyebrow="<EYEBROW>"
                heading="<HEADING>"
                body="<OPTIONAL_BODY>"
            />
        </div>
        <div class="grid-3" style="gap:var(--sp-5);">
            <CARD_OF_CHOSEN_TYPE ... />
            <CARD_OF_CHOSEN_TYPE ... />
            <CARD_OF_CHOSEN_TYPE ... />
        </div>
    </div>
</section>
```

### Pattern B — `FeatureBlock` (split text + visual)

```astro
<!-- ── <SECTION_NAME> ── -->
<FeatureBlock
    eyebrow="<EYEBROW>"
    heading="<HEADING>"
    body="<BODY>"
    body2="<OPTIONAL_SECOND_PARAGRAPH>"
    href="<OPTIONAL_LINK>"
    linkLabel="<OPTIONAL_LINK_LABEL>"
/>
```

### Pattern C — `CtaSection`

```astro
<!-- ── <SECTION_NAME> ── -->
<CtaSection
    eyebrow="<EYEBROW>"
    heading="<HEADING>"
    body="<BODY>"
    buttons={[
        { label: '<PRIMARY_LABEL>', href: '<PRIMARY_HREF>', variant: 'primary' },
        { label: '<SECONDARY_LABEL>', href: '<SECONDARY_HREF>', variant: 'secondary' },
    ]}
/>
```

Existing pages already wrap each section in a comment marker (`<!-- ── SECTION NAME ── -->`). Keep that pattern — it makes future edits and audits easier.

## Step 8 — Plan imports

Find every component referenced in the new section. For each, check whether it's already imported in the page's frontmatter:

- Already imported → no change needed.
- Not imported → add the import line in the right import-group (sections components grouped together, UI grouped together).

Compute the relative import path from the page's location to the component:

| Page location | Section component path | UI component path |
|---|---|---|
| `src/pages/foo.astro` | `../components/sections/X.astro` | `../components/ui/X.astro` |
| `src/pages/foo/bar.astro` | `../../components/sections/X.astro` | `../../components/ui/X.astro` |
| `src/pages/foo/bar/baz.astro` | `../../../components/sections/X.astro` | `../../../components/ui/X.astro` |

## Step 9 — Approval gate

Adding a section is gated only when:

- The target page is one of the **path-gated** pages (legal pages, homepage hero — the same list as `magnus-edit-page` Step 4).
- The section being added contains a **client name, real-money figure, or percentage tied to a client** (e.g. a `StatCard` with "£270M+ DHL" or a `TestimonialWide` quote attributed to a named client).

If gated, ask for `approved by <name>` in chat and append to `.magnus-changes/pending.log`:

```
<ISO timestamp> | src/pages/<path> | Add section: <component name> with eyebrow "<eyebrow>" | approved by <name>
```

Otherwise — non-gated paths and content-safe sections — proceed without an approval line. The change is auditable in git history regardless.

## Step 10 — Show preview, then confirm

Output, in this order:

1. **Component(s) used** — list the documented components and any imports being added.
2. **Insertion location** — file and line where the new section goes (e.g. "after `<!-- ── TEAM SECTION ── -->`, before `<CtaSection>`").
3. **Background choice** — and how it relates to the surrounding section rhythm.
4. **Composed section markup** — exactly as it will appear, including the comment marker.
5. **Audit log entry** if gated.
6. One sentence asking for go-ahead.

Wait for explicit yes.

## Step 11 — Apply the changes

1. **Add imports** to the page frontmatter via `Edit` if needed. Match the existing import grouping (one group per directory).
2. **Insert the section** via `Edit` at the resolved position. Match the existing indentation exactly.
3. **Append the audit log entry** if Step 9 required one.

Use one `Edit` call per change so the user can review each in the tool log.

## Step 12 — Smoke check

- Re-read the page. Confirm the new section is in place, all needed imports are at the top, and the file still has exactly one `<Layout>`, one `<Nav>`, one `<Footer>`.
- Confirm no two `.section-bg-navy` sections are now adjacent (background rhythm).
- Run `npx astro check 2>&1 | tail -10`. Refuse to declare done on new errors.

## Step 13 — Surface in live preview

Resolve the page's URL (e.g. `src/pages/about.astro` → `/about`, `src/pages/solutions/embed.astro` → `/solutions/embed`).

Cascade:

1. Try `preview_list()`. If success and `magnus-dev` is running — `preview_eval` to navigate. Done.
2. Else try `magnus_dev_status`. If success and running — `magnus_open_url`. Done.
3. Else ask once: "Want to preview the new section live?" If yes, invoke **magnus-preview** with the route.

Astro HMR will keep it in sync if the user wants follow-up tweaks.

## Step 14 — Hand off

End with one short line:

- "New `<component>` section added to `<route>`, showing in the preview pane. Ready to ship? Run **magnus-publish**."
- Or: "New `<component>` section added to `<route>`. Approval recorded for `<name>`. Ready to preview later? Run **magnus-preview**. Ready to ship? Run **magnus-publish**."

Don't commit, push, or build.

## Refusal templates

> The closest documented section type for "<X>" is `<Y>` — want me to use that? If you genuinely need a new component, this is a developer change, not an admin edit.

> That section would put two `.section-bg-navy` blocks back to back, which the design contract forbids. Either change the new section to a light background, or insert it somewhere else in the page rhythm.

> Adding a section to a legal page is gated. Paste `approved by <name>` to proceed.

> The component `<X>` doesn't exist in `docs/llm-context.md` §3. Pick from the documented list, or this becomes a developer change to add a new component first.
