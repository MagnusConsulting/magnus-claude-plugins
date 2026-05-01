---
name: magnus-add-report
description: Create a new downloadable report or whitepaper page on the Magnus Consulting website under /insights/reports/<slug>. Use when the user says "add a report", "publish a whitepaper", "create a new download", or "add the [name] report to /insights/reports". Generates the full report landing page from the canonical template (breadcrumb, hero with tags, key findings, body sections, download CTA, related CTA) and inserts a matching ReportCard on the /insights/reports index. Enforces a content sign-off gate. NOT for editing an existing report (use magnus-edit-page) or for adding a free article (use magnus-add-insight-article).
---

# Magnus — Add report

You are creating a new report landing page under `/insights/reports/<slug>` and adding the matching `ReportCard` to the `/insights/reports` index. Reports are firm-published research artefacts — every new one is gated for content sign-off.

## Step 1 — Load the contract

Read `docs/llm-context.md` in full. Confirm `src/pages/insights/reports/index.astro` exists and read it — it shows the current report cards and the layout you'll be inserting into.

If `docs/llm-context.md` is missing, the working directory isn't the magnus repo. Don't proceed. Offer to run **magnus-setup** or stop.

## Step 2 — Gather the report inputs

Ask the user for each of these unless already supplied. Don't invent any of them.

| Input | Required | Constraint |
|---|---|---|
| `title` | yes | One sentence, ≤ 90 chars. Sentence case. May contain `<span class="accent">phrase</span>` for one short coral accent. |
| `slug` | yes | Kebab-case derived from title. Must not collide with an existing file in `src/pages/insights/reports/`. |
| `category` | yes | One of: `Annual Benchmark`, `Playbook`, `Research`, `Whitepaper`, `Sector Briefing`. Drives the lead tag colour and visual treatment. |
| `gated` | yes | `true` if download requires email capture; `false` for free download. Drives the FREE / Email required badge. |
| `summary` | yes | 1–2 sentences for the hero `sub`. 200–400 chars. |
| `seoDescription` | yes | 120–155 chars. Different from the summary. |
| `byline` | yes | Author or team that produced the report (e.g. `Magnus Consulting Research`, `Teresa Allan`, `Magnus + Ipsos MORI`). |
| `publishedDate` | yes | Format `Month YYYY`, e.g. `March 2026`. |
| `respondentNote` | optional | Free-text byline detail like `600+ respondents`, `12 sector briefings`. Renders as a third pill in the byline strip. |
| `keyFindings` | yes | 3–5 stat cards. Each: `{ value, label }` where `value` is a short headline figure (e.g. `47%`, `3x`, `£2.4M`) and `label` is one sentence describing it. |
| `body` | yes | The body of the report landing page. Multiple `<h2>` sections each with paragraphs and optional lists. Aim for 4–8 sections covering: what the research covers, what's different, key findings narrative, methodology, who it's for. Use only the elements documented in §3 — no new components. |
| `downloadUrl` | yes if `gated: false` | Path to the PDF in `public/reports/<filename>.pdf`. If the file isn't uploaded yet, ask the user to run **magnus-manage-assets** first. |
| `formId` | yes if `gated: true` | The form anchor or external form URL for email capture. If gating is desired but no form exists, mark this `TBC` and the page renders a placeholder. |

If the user pastes a draft research summary, parse it for these fields and confirm what you extracted.

## Step 3 — Validate

- **Slug uniqueness.** Confirm `src/pages/insights/reports/<slug>.astro` doesn't exist.
- **Slug format.** `^[a-z0-9]+(-[a-z0-9]+)*$`.
- **Category.** Must be one of the five. Refuse anything else.
- **Key findings.** 3–5 entries. Each `value` non-empty, `label` 8–25 words.
- **Body.** Each `<h2>` followed by at least one `<p>`. No `<h1>` (the hero is the only h1). No `<img>` (use **magnus-manage-assets** to add cover images, then reference). No inline scripts, raw colours, italic headings.
- **Download asset.** If `gated: false` and `downloadUrl` is provided, verify the PDF exists at `public/reports/<filename>`. If it doesn't, route the user to **magnus-manage-assets** to upload the PDF first, then return.

## Step 4 — Approval gate

Every new report is gated. Ask the user:

> Reports are gated for content sign-off before publish. Paste **`approved by <name>`** in chat — `<name>` is the partner or designated reviewer who has approved this report (and any client research it draws on) for publication.

Wait for an exact match. On success, append two lines to `.magnus-changes/pending.log` (create directory and `.gitignore` entry if missing):

```
<ISO-8601 UTC> | src/pages/insights/reports/<slug>.astro | New report: "<title>" (<category>) | approved by <name>
<ISO-8601 UTC> | src/pages/insights/reports/index.astro | Add ReportCard for /insights/reports/<slug> | approved by <name>
```

If the report contains client metrics or client names that haven't appeared on the site before, require a second approval line specifically calling out the client and metric.

## Step 5 — Compose the report page

Use this canonical template. Replace each `<ALL_CAPS>` placeholder.

```astro
---
import Layout from '../../../layouts/Layout.astro';
import Nav from '../../../components/Nav.astro';
import Footer from '../../../components/Footer.astro';
import CtaSection from '../../../components/sections/CtaSection.astro';
---

<Layout
    title="<TITLE_PLAIN>: <CATEGORY> | Magnus Consulting"
    description="<SEO_DESCRIPTION>"
>
    <Nav activeLink="insights" />

    <!-- ── BREADCRUMB ── -->
    <div style="background:var(--navy-dark); border-bottom:1px solid rgba(255,255,255,0.07); padding:0.75rem 0;">
        <div class="container">
            <nav style="display:flex; align-items:center; gap:0.5rem; font-size:12px;">
                <a href="/" style="color:rgba(255,255,255,0.4); text-decoration:none;">Magnus</a>
                <span style="color:rgba(255,255,255,0.2);">›</span>
                <a href="/insights" style="color:rgba(255,255,255,0.4); text-decoration:none;">Insights</a>
                <span style="color:rgba(255,255,255,0.2);">›</span>
                <a href="/insights/reports" style="color:rgba(255,255,255,0.4); text-decoration:none;">Reports</a>
                <span style="color:rgba(255,255,255,0.2);">›</span>
                <span style="color:var(--white); font-weight:600;"><TITLE_PLAIN_SHORT></span>
            </nav>
        </div>
    </div>

    <!-- ── HERO ── -->
    <section class="hero" style="padding-bottom:var(--sp-16);">
        <div class="container">
            <div style="display:flex; gap:var(--sp-3); flex-wrap:wrap; margin-bottom:var(--sp-6);">
                <span class="tag" style="background:var(--coral); color:var(--white); font-weight:700;"><GATED_BADGE></span>
                <span class="tag tag-teal"><CATEGORY></span>
            </div>
            <h1 style="max-width:820px;"><TITLE></h1>
            <p class="hero-sub" style="max-width:660px;"><SUMMARY></p>
            <div style="display:flex; gap:var(--sp-2); align-items:center; margin-top:var(--sp-5); flex-wrap:wrap;">
                <span style="font-size:12px; color:rgba(255,255,255,0.5);"><BYLINE></span>
                <span style="font-size:12px; color:rgba(255,255,255,0.25);">•</span>
                <span style="font-size:12px; color:rgba(255,255,255,0.5);">Published <PUBLISHED_DATE></span>
                <!-- if respondentNote -->
                <span style="font-size:12px; color:rgba(255,255,255,0.25);">•</span>
                <span style="font-size:12px; color:rgba(255,255,255,0.5);"><RESPONDENT_NOTE></span>
                <!-- end if -->
            </div>
            <div style="display:flex; gap:var(--sp-4); flex-wrap:wrap; margin-top:var(--sp-8);">
                <a href="<DOWNLOAD_HREF>" class="btn btn-primary btn-lg"><DOWNLOAD_LABEL></a>
                <a href="#findings" class="btn btn-secondary btn-lg">Read key findings ↓</a>
            </div>
        </div>
    </section>

    <!-- ── KEY FINDINGS ── -->
    <section id="findings" class="section section-bg-light">
        <div class="container">
            <div style="margin-bottom:var(--sp-10);">
                <span class="eyebrow">Key findings</span>
                <h2>The headline numbers.</h2>
            </div>
            <div class="grid-3" style="gap:var(--sp-5);">
                <!-- repeat per keyFinding -->
                <div style="background:var(--white); border:1.5px solid var(--gray); border-top:3px solid var(--coral); border-radius:var(--r-xl); padding:var(--sp-7);">
                    <div style="font-family:var(--font-heading); font-size:48px; font-weight:700; color:var(--coral); line-height:1; margin-bottom:var(--sp-3);"><FINDING_VALUE></div>
                    <p style="font-size:14px; color:var(--slate); line-height:1.6; margin:0;"><FINDING_LABEL></p>
                </div>
                <!-- end repeat -->
            </div>
        </div>
    </section>

    <!-- ── BODY ── -->
    <section class="section section-bg-alt">
        <div class="container-narrow">
            <!-- BODY_SECTIONS: one or more <h2>+<p> blocks -->
        </div>
    </section>

    <!-- ── DOWNLOAD CTA ── -->
    <section id="download" class="section" style="background:var(--navy);">
        <div class="container">
            <div style="max-width:720px;">
                <span class="eyebrow" style="color:var(--turquoise);">Get the report</span>
                <h2 style="color:var(--white);">Download the full <TITLE_PLAIN_SHORT>.</h2>
                <p style="color:rgba(255,255,255,0.78);"><DOWNLOAD_BLURB></p>
                <a href="<DOWNLOAD_HREF>" class="btn btn-primary btn-lg" style="margin-top:var(--sp-6);"><DOWNLOAD_LABEL></a>
            </div>
        </div>
    </section>

    <!-- ── RELATED CTA ── -->
    <CtaSection
        eyebrow="Want to apply this to your business?"
        heading="The first conversation is always about your commercial challenge."
        body="Tell us what you're working on. We'll tell you honestly whether and how Magnus can help."
        buttons={[
            { label: 'Start the conversation', href: '/contact', variant: 'primary' },
            { label: 'See growth stories',     href: '/impact',  variant: 'secondary' },
        ]}
    />

    <Footer />
</Layout>
```

Notes on placeholders:

- `<TITLE>` keeps any `<span class="accent">` from input. `<TITLE_PLAIN>` strips them.
- `<TITLE_PLAIN_SHORT>` is the breadcrumb / inline label — if the plain title is over ~50 chars, ask the user for a short version.
- `<GATED_BADGE>` is `FREE DOWNLOAD` if `gated: false`, else `EMAIL REQUIRED`.
- `<DOWNLOAD_HREF>` is `/reports/<filename>.pdf` for free downloads, or `#download-form` (or external form URL) for gated.
- `<DOWNLOAD_LABEL>` is `Download free` or `Get access (email required)` accordingly.
- `<DOWNLOAD_BLURB>` is one sentence — for free reports something like "Free PDF, no email required." For gated: "Submit your email and we'll send you the full PDF straight away."
- `<RESPONDENT_NOTE>` line is included only if `respondentNote` was provided; otherwise drop the two lines (separator + value).
- The key-findings grid loops over the user's array. Use `.grid-3` if 3 findings, `.grid-2` if 2 or 4 (centred at narrower max-width), otherwise `.grid-3` and let it wrap.

## Step 6 — Compose the index card

Build the `ReportCard` to insert at the **top** of the `<div class="grid-3" style="max-width:960px;">` grid in `src/pages/insights/reports/index.astro`. Import `ReportCard` if it isn't already imported.

Template:

```astro
<ReportCard
    tag="<CATEGORY>"
    title="<TITLE_PLAIN>"
    body="<CARD_BODY>"
    href="/insights/reports/<SLUG>"
    linkLabel="<DOWNLOAD_LABEL>"
    gated={<GATED>}
    topStyle="<TOP_STYLE>"
/>
```

Where:

- `<CARD_BODY>` is a 1–2 sentence summary distinct from the hero `summary` — sits in the card and previews the report. 120–200 chars. If not supplied, draft from the summary and confirm.
- `<TOP_STYLE>` is a CSS background. Suggested values per category:
  - `Annual Benchmark` — `"background:linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%); height:160px;"`
  - `Playbook` — `"background:linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%); height:160px;"`
  - `Research` — `"background:var(--gray-light); height:160px;"`
  - `Whitepaper` — `"background:var(--gray-lighter); height:160px;"`
  - `Sector Briefing` — `"background:linear-gradient(135deg, var(--turquoise-dark) 0%, var(--navy) 100%); height:160px;"`

If the existing index doesn't import `ReportCard`, add the import to the frontmatter. The existing inline-anchor pattern can stay alongside; the new card uses the documented component.

## Step 7 — Show preview, then confirm

Output:

1. **File to be created:** `src/pages/insights/reports/<slug>.astro` — show the header, the hero block, the first body section, the download CTA. Compact summary, not the full file.
2. **File to be edited:** `src/pages/insights/reports/index.astro` — show the ReportCard exactly as it will appear and the line where it'll be inserted (at the top of the grid).
3. **Audit log entries** that will be appended.
4. One sentence asking for go-ahead.

Wait for explicit yes.

## Step 8 — Apply the changes

1. **Write** the new file at `src/pages/insights/reports/<slug>.astro`.
2. **Edit** `src/pages/insights/reports/index.astro` to insert the new `<ReportCard>` at the top of the report grid. Add the import if not present.
3. **Append** the two audit lines to `.magnus-changes/pending.log`.

Order: new file first, then index edit (so the link target exists before the index references it).

## Step 9 — Smoke check

- Re-read the new file. Confirm imports resolve, all placeholders are replaced (no remaining `<UPPER_CASE>`).
- Re-read the index. Confirm exactly one ReportCard now points at the new slug, the grid still has its closing `</div>`.
- Confirm `.magnus-changes/pending.log` has the two new lines.
- Run `npx astro check 2>&1 | tail -10`. Refuse to declare done on new errors.

## Step 10 — Surface in live preview

Target route: `/insights/reports/<slug>`. Cascade:

1. Try `preview_list()`. If success and `magnus-dev` server is in the list — `preview_eval` to navigate. Done.
2. Else try `magnus_dev_status`. If success and running — `magnus_open_url('http://localhost:4321/insights/reports/<slug>')`. Done.
3. Else ask once: "Want to preview the new report live? I can spin up the dev server and open `/insights/reports/<slug>`." If yes, invoke **magnus-preview** with that route.

## Step 11 — Hand off

End with one line:

- Preview running: "New report scaffolded at `/insights/reports/<slug>` and listed on `/insights/reports`. Showing in the preview. Approval recorded for `<name>`. Ready to ship? Run **magnus-publish**."
- Preview declined: "New report at `/insights/reports/<slug>`. Approval recorded for `<name>`. Ready to preview later? Run **magnus-preview**. Ready to ship? Run **magnus-publish**."

Don't commit, push, or run a build.

## Refusal templates

> The category `<X>` isn't one of the five documented (`Annual Benchmark`, `Playbook`, `Research`, `Whitepaper`, `Sector Briefing`). Pick one — or this becomes a developer change to add a new category.

> The download PDF doesn't exist at `public/reports/<filename>`. Run **magnus-manage-assets** first to upload it, then re-run this skill.

> The slug `<slug>` already exists. Pick a different slug, or use **magnus-edit-page** if you meant to update the existing report.

> The body uses `<h1>` / `<img>` / inline raw colours / italic headings. Reports can't ship with that — here's a compliant rewrite: …
