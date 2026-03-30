---
name: spartan:teardown
description: Deep competitor analysis — pricing, features, strengths, weaknesses, and where they leave gaps
argument-hint: "[competitor name or URL]"
---

# Competitor Teardown: {{ args[0] | default: "competitor" }}

You are running a deep competitor analysis. Be brutally honest — don't downplay their strengths or inflate their weaknesses. The goal is to understand them clearly so we can find real gaps.

If the user gives a URL, use web search to find real data about the company. If they give just a name, search for it.

**Use web search** to find pricing pages, G2/Capterra reviews, traffic data, and social media mentions. Real data beats guessing.

---

## Section 1: Overview

Write one paragraph: What do they do? Who do they serve? When were they founded? How big are they?

Keep it factual. No opinions yet.

---

## Section 2: Pricing

| Plan | Price | Key Features |
|---|---|---|
| Free / Trial | | |
| Starter / Basic | | |
| Pro / Growth | | |
| Enterprise | | |

Note: Do they have a free tier? Free trial length? Annual vs monthly pricing difference?
What's the cheapest way to get started?

---

## Section 3: Feature Breakdown

| Feature | Have It? | How Good? (1-5) | Notes |
|---|---|---|---|
| [core feature 1] | Yes/No | | |
| [core feature 2] | Yes/No | | |
| [core feature 3] | Yes/No | | |
| ... | | | |

List 10-15 features that matter for this market. Score quality honestly.

---

## Section 4: What They Do Well (Top 3)

List their top 3 strengths. For each one:
- What is it?
- Evidence (user reviews, market position, product quality)
- How hard would it be to match this?

Don't skip this. If they're winning, there's a reason.

---

## Section 5: What They Do Poorly (Top 3)

List their top 3 weaknesses. For each one:
- What is it?
- Evidence (user complaints, missing features, bad UX)
- Is this a real gap or just nitpicking?

Only list real problems. "Their logo is ugly" doesn't count.

---

## Section 6: User Reviews

Search G2, Capterra, Reddit, Twitter/X, Product Hunt for real user feedback.

**What users love:**
- [quote or paraphrase + source]
- [quote or paraphrase + source]
- [quote or paraphrase + source]

**What users hate:**
- [quote or paraphrase + source]
- [quote or paraphrase + source]
- [quote or paraphrase + source]

**Common themes:** What shows up over and over in reviews?

---

## Section 7: Traffic & Traction

| Metric | Value | Source |
|---|---|---|
| Monthly visitors (estimate) | | SimilarWeb / search |
| Growth trend | Growing / Flat / Declining | |
| Team size (estimate) | | LinkedIn / Crunchbase |
| Total funding | | Crunchbase |
| Last funding round | | |
| Notable customers | | |

If data isn't available, say so. Don't make up numbers.

---

## Section 8: How They Get Users

Check which channels they use:

| Channel | Active? | Evidence |
|---|---|---|
| SEO / Content marketing | | Blog posts? Ranking for key terms? |
| Paid ads (Google/Meta) | | Found ads? Sponsorships? |
| Social media | | Active accounts? Engagement? |
| Community / Forums | | Discord? Slack? Reddit presence? |
| Partnerships / Integrations | | App stores? Partner pages? |
| Word of mouth / Referrals | | Referral program? Organic mentions? |
| Product Hunt / Launch sites | | Past launches? |

What's their main growth channel? Where do most users come from?

---

## Section 9: Positioning

- **How they describe themselves:** [their tagline / hero text]
- **Target persona:** Who are they really building for?
- **Positioning:** Are they the cheap option? The premium option? The easy option? The powerful option?
- **Brand voice:** Corporate / Casual / Technical / Friendly?

---

## Section 10: Our Opportunity

This is the "so what?" section. Based on everything above:

**Gaps they leave open:**
- [gap 1 — who's underserved?]
- [gap 2 — what feature is missing or weak?]
- [gap 3 — what segment do they ignore?]

**What we'd do differently:**
- [difference 1]
- [difference 2]
- [difference 3]

---

## So What?

Write one paragraph: What does this teardown mean for our strategy? Where should we compete, and where should we avoid competing?

Be specific. "We should differentiate" is useless. Say HOW and WHERE.

---

**Next steps:**
- Want to analyze another competitor? Run `/spartan:teardown [name]` again
- Ready to compare multiple competitors side by side? Ask me to build a comparison matrix
- Want to validate your positioning? Run `/spartan:validate` with your idea
