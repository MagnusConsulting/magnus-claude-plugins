---
name: magnus-add-insight-article
description: Create a new insights article on the Magnus Consulting Astro site. Use when the user wants to add an article, blog post, thought-leadership piece, or insight under /insights. Generates the full article page (HeroSection + breadcrumb + author meta + body + CtaSection) using only documented components and tokens, then inserts a matching ArticleCard at the top of the grid in src/pages/insights/index.astro with the correct category, dataTags, author colour, and topStyle. Enforces the four documented categories (GTM Strategy, AI in GTM, Private Equity, Sectors), the four known authors (TA, DP, JR, CD), Magnus brand voice, and SEO rules. Every new article is gated for content sign-off via the standard approval flow. NOT for editing an existing article (use magnus-edit-page), creating a downloadable report (use magnus-add-report), or adding a growth story (use magnus-add-growth-story).
---

# Magnus — Add insights article

You are creating a new article under `/insights/<slug>` on the Magnus Consulting Astro site. The article uses a fixed template. You are also responsible for inserting a matching `<ArticleCard>` on the `/insights` index page so the article is discoverable and filterable.

## Step 1 — Load the contract

Read `docs/llm-context.md` in full. Confirm `src/pages/insights/index.astro` exists and read it — it is the source of truth for the current category filter values, author colour conventions, and existing card layout.

## Step 2 — Gather the article inputs

Ask the user for each of these unless already supplied. One short prompt per turn or one bundled prompt — your call. Do not invent any of them.

| Input | Required | Constraint |
|---|---|---|
| `title` | yes | One sentence, ≤ 80 chars. Sentence case. May contain `<span class="accent">phrase</span>` for coral emphasis on one short phrase. No italics, no `<em>`, no inline colour. |
| `slug` | yes | Kebab-case, derived from the title; confirm with the user before using. Must not collide with an existing file in `src/pages/insights/`. |
| `category` | yes | One of: `GTM Strategy`, `AI in GTM`, `Private Equity`, `Sectors`. Must match the filter buttons on `/insights` — if the user proposes anything else, refuse and list the four. |
| `author` | yes | One of the documented authors (see Step 3 table). If the user names an author not in the table, stop and ask whether to add them as a developer task. |
| `readTime` | yes | Format `"N min read"` — integer minutes, lowercase. Estimate from word count if user doesn't provide: ~200 wpm, round to nearest minute, minimum `3 min read`. |
| `lede` | yes | 1–2 sentences for the hero `sub`. 150–300 chars. Reads as a standfirst — sets up the argument. |
| `seoDescription` | yes | 120–155 chars. Includes the article's primary topic. Different from the lede. |
| `body` | yes | The article body. Headings (`<h2>`, optional `<h3>`), paragraphs, optional lists, optional pull quote, optional `<Callout>`. See Step 5 for what's allowed. |

If the user hands you a draft document, parse it for these fields and confirm what you extracted before proceeding.

## Step 3 — Validate inputs against the documented mappings

### Category → card props

| `category` | `categoryVariant` | `dataTags` | `topStyle` (on `<ArticleCard>`) | Hero `eyebrowColor` |
|---|---|---|---|---|
| GTM Strategy | `"coral"` | `"gtm-strategy"` | omit (use default) | omit (default coral) |
| AI in GTM | `"teal"` | `"ai-in-gtm"` | `"background:linear-gradient(135deg, var(--navy-dark) 0%, #0a2535 100%)"` | `var(--turquoise)` |
| Private Equity | `"teal"` | `"private-equity"` | `"background:linear-gradient(135deg, #0d1f2d 0%, var(--navy) 100%)"` | `var(--turquoise)` |
| Sectors | `"teal"` | `"sectors"` | omit | `var(--turquoise)` |

### Author → initials and colour

| Name | `authorInitials` | `authorColor` |
|---|---|---|
| Teresa Allan | `"TA"` | omit (default `var(--navy)`) |
| Danny Philamond | `"DP"` | omit (default `var(--navy)`) |
| Jason Ryan | `"JR"` | `"var(--coral)"` |
| Charlotte Davis | `"CD"` | `"var(--turquoise)"` |

If the user gives a different author, stop. Adding a new author is a developer change (the card colour conventions need to be updated in `docs/llm-context.md` first).

### Slug uniqueness

Check `src/pages/insights/<slug>.astro` does not already exist. If it does, ask the user for a different slug or whether they meant to edit (route them to `magnus-edit-page`).

## Step 4 — Approval gate

Every new article is gated. Articles ship under the firm's voice and represent the firm publicly — they need explicit content sign-off.

Ask the user:

> Articles are gated for content sign-off before publish. Paste **`approved by <name>`** in chat — `<name>` is the partner or designated reviewer who has approved this article for publication.

Wait for an exact match (`approved by ` followed by a non-empty name, case-insensitive). On success, append two lines to `.magnus-changes/pending.log` (create directory and `.gitignore` entry if missing):

```
<ISO-8601 UTC> | src/pages/insights/<slug>.astro | New article: "<title>" by <author> (<category>) | approved by <name>
<ISO-8601 UTC> | src/pages/insights/index.astro | Add ArticleCard for /insights/<slug> | approved by <name>
```

If the body contains a real client name, real-money figure, or percentage tied to a client (see `magnus-edit-page` Step 4 for the full content-gate rules), require a second approval line specifically calling out the metric or client name. Do not let client metrics ship without a separate explicit ack.

## Step 5 — Compose the article page

Use this canonical template. Replace each `<ALL_CAPS>` placeholder with the validated input. Drop the `eyebrowColor` line entirely if `category` is `GTM Strategy`.

```astro
---
import Layout from '../../layouts/Layout.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import HeroSection from '../../components/sections/HeroSection.astro';
import CtaSection from '../../components/sections/CtaSection.astro';
import Breadcrumb from '../../components/ui/Breadcrumb.astro';
---

<Layout
    title="<TITLE_PLAIN> | Magnus Consulting"
    description="<SEO_DESCRIPTION>"
>
    <Nav activeLink="insights" />

    <HeroSection
        eyebrow="<CATEGORY>"
        eyebrowColor="<EYEBROW_COLOR>"
        title="<TITLE>"
        sub="<LEDE>"
        actions={[]}
        fullWidth
        maxWidth="760px"
    />

    <section class="section section-bg-light">
        <div class="container-narrow">
            <Breadcrumb crumbs={[
                { label: 'Insights', href: '/insights' },
                { label: '<TITLE_PLAIN_SHORT>' },
            ]} />

            <div style="display:flex; gap:var(--sp-4); align-items:center; margin:var(--sp-6) 0 var(--sp-10); color:var(--slate-light); font-size:13px; font-weight:600;">
                <span>By <strong style="color:var(--navy);"><AUTHOR_NAME></strong></span>
                <span aria-hidden="true">·</span>
                <span><READ_TIME></span>
            </div>

            <!-- BODY -->

        </div>
    </section>

    <CtaSection
        eyebrow="Ready to move from thinking to doing?"
        heading="The first conversation is always about your commercial challenge."
        body="Tell us what you're working on. We'll tell you honestly whether Magnus can help — and what that would look like."
        buttons={[
            { label: 'Start the conversation', href: '/contact', variant: 'primary' },
            { label: 'See growth stories',     href: '/impact',  variant: 'secondary' },
        ]}
    />

    <Footer />
</Layout>
```

Notes:

- `<TITLE>` keeps any `<span class="accent">…</span>` from the user's input; `<TITLE_PLAIN>` (used in `<Layout title>` and breadcrumb) is the same string with the `<span>` tags stripped.
- `<TITLE_PLAIN_SHORT>` is the breadcrumb label — if the plain title is over ~50 chars, ask the user for a short version; otherwise reuse the plain title.
- The `<CATEGORY>` matches the `category` input verbatim.
- The CtaSection copy is fixed across articles — do not reword it without the user's explicit override.

### Body — what's allowed

Inside the article body (the `<!-- BODY -->` slot), only:

- `<h2>` — section heading. Sentence case. No accent span; reserve coral accent for the hero title.
- `<h3>` — sub-section heading. Optional, sparingly.
- `<p>` — paragraph. Multiple paragraphs per section.
- `<ul>` / `<ol>` with `<li>` — short lists only. If a list is longer than ~6 items, ask whether to split into sections.
- `<blockquote>` — pull quote. Plain text inside a `<p>`. No attribution markup; if the quote needs an attributed source, use `<Testimonial>` instead.
- `<strong>` — inline emphasis.
- `<em>` — inline emphasis (allowed in body, **never** in headings).
- `<a href="...">` — internal or external links.
- `<Callout variant="light">` — boxed highlight for a key point. One per article max. Import `Callout` if used.
- `<Testimonial>` — attributed pull quote with name + role. Use for client voice in the body. Import `Testimonial` if used.

### Body — refused

- `<h1>` anywhere in the body (the hero is the only h1).
- `<img>`, `<video>`, `<iframe>` — media goes through `magnus-manage-assets`.
- `<script>`, event handlers (`onclick=`, `onload=`, etc.).
- `<style>` blocks or `class="..."` attributes that aren't documented utility classes.
- Inline `style="…"` containing raw hex values, raw px outside `font-size`, or any colour value not expressed as a `var(--token)`.
- Italics inside any heading.
- Fabricated client names, metrics, or quotes. If the user wants to cite a client outcome, the data must come from them (and triggers the second approval line in Step 4).

If the body breaks any of these rules, do not write yet. Quote the offending line back to the user, propose a compliant rewrite, and wait.

## Step 6 — Compose the ArticleCard for the index

Build the card to insert at the **top** of `<div class="grid-3" id="insight-grid">` in `src/pages/insights/index.astro`. Use the category mapping from Step 3.

Template:

```astro
<ArticleCard dataTags="<DATA_TAGS>" category="<CATEGORY>" categoryVariant="<CATEGORY_VARIANT>" readTime="<READ_TIME>"
    href="/insights/<SLUG>"
    title="<TITLE_PLAIN>"
    body="<CARD_BODY>"
    authorInitials="<AUTHOR_INITIALS>" authorName="<AUTHOR_NAME>" />
```

Add `topStyle="…"` and `authorColor="…"` only if the mapping in Step 3 specifies them.

`<CARD_BODY>` is a 1–2 sentence summary distinct from the lede — it sits in the card and previews the article. 120–200 chars. If the user hasn't supplied one, draft it from the lede and ask for confirmation before inserting.

`<TITLE_PLAIN>` here strips any `<span class="accent">` wrapping — the card title doesn't render the accent.

## Step 7 — Show preview, then confirm

Output, in this order:

1. **File to be created:** `src/pages/insights/<slug>.astro` — show the full file body (compact: hero + body opening + body closing + cta).
2. **File to be edited:** `src/pages/insights/index.astro` — show the ArticleCard exactly as it will appear and the line number where it will be inserted (just below the opening `<div class="grid-3" id="insight-grid">`).
3. **Audit log entries** that will be appended.
4. One sentence asking for go-ahead.

Wait for an explicit yes. Do not write before that.

## Step 8 — Apply the changes

1. **Write** the new file at `src/pages/insights/<slug>.astro` using the `Write` tool.
2. **Edit** `src/pages/insights/index.astro` using the `Edit` tool to insert the new `<ArticleCard>` directly under the `<div class="grid-3" id="insight-grid">` line, preserving indentation (match the existing cards — 16 spaces of indent on the card lines).
3. **Append** the two audit lines to `.magnus-changes/pending.log`.

Order matters: write the new article first so the link target exists before the index references it.

## Step 9 — Smoke check

After writing:

1. Re-read the new file. Confirm imports resolve (Layout, Nav, Footer, HeroSection, CtaSection, Breadcrumb at minimum; Callout / Testimonial only if used in the body).
2. Re-read `insights/index.astro`. Confirm exactly one ArticleCard now points to the new slug, the grid still has the closing `</div>`, and the page parses (no broken JSX/Astro syntax).
3. Confirm `.magnus-changes/pending.log` has the two new lines.
4. Confirm `<title>` and `<description>` on the new file fit the SEO rules (title format `"[Plain title] | Magnus Consulting"`, description 120–155 chars).

If anything fails, tell the user before declaring done. Roll back by deleting the new file and reverting the index edit if the user asks.

## Step 10 — Surface the new article in the live preview

The target route is `/insights/<slug>`. Get the admin looking at the new page in real time:

1. Try `preview_list()`.
2. **If it succeeds and a `magnus-dev` server is in the list** — capture its `serverId` and navigate the pane:
   ```
   preview_eval({ serverId, expression: "window.location.assign('/insights/<slug>')" })
   ```
   The preview pane now shows the new article. HMR keeps it in sync if the user asks for follow-up tweaks via `magnus-edit-page`. Done.
3. **Otherwise** (preview_list errors with tool-not-available, OR succeeds but no `magnus-dev` server is running) — ask the user once:
   > Want to preview the new article live? I can spin up the dev server and open `/insights/<slug>`.
   - If yes → invoke the **magnus-preview** skill, passing `/insights/<slug>` as the target route. It will pick the right mechanism (preview pane or system browser) for the current context.
   - If no → continue to Step 11.

Don't screenshot unless the user asks.

## Step 11 — Hand off

End with a one-line summary and one suggested next step:

- If the preview is showing the article: "New article scaffolded at `/insights/<slug>` and listed on `/insights`. Now showing in the preview pane. Approval for <name> is recorded. Ready to ship? Run **magnus-publish**."
- If the user declined the preview: "New article scaffolded at `/insights/<slug>` and listed on `/insights`. Approval for <name> is recorded. Ready to preview later? Run **magnus-preview**. Ready to ship? Run **magnus-publish**."

Do not commit, push, or run a build yourself.

## Refusal templates

> The category `<X>` isn't one of the four documented categories on the /insights filter (`GTM Strategy`, `AI in GTM`, `Private Equity`, `Sectors`). Pick one of those, or this becomes a developer change to add a new category.

> Author `<X>` isn't in the documented author list (TA, DP, JR, CD). Adding a new author needs a developer to update colour conventions in `docs/llm-context.md` first — I can't add them through this skill.

> The slug `<slug>` already exists at `src/pages/insights/<slug>.astro`. Pick a different slug, or if you meant to edit the existing article, use **magnus-edit-page** instead.

> That body uses `<h1>` / `<img>` / inline raw colours / italics in a heading [pick the relevant one]. Articles can't ship with that — here's a compliant rewrite: …

> The body cites a client metric (`£X` for `<client>`). I need a second approval line in chat naming the metric and confirming the client has signed off — paste `approved by <name> for <client> metric` to proceed.
