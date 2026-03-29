"""
Pipeline step implementations.
Each function is a pure Python function called synchronously from Celery tasks.
"""
import os
import re
import httpx
from bs4 import BeautifulSoup

from app.config import settings


# ─── Step 1: Scrape ───────────────────────────────────────────────────────────

def scrape_website(url: str) -> dict:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; Propy/1.0)"}
    with httpx.Client(timeout=20, follow_redirects=True) as client:
        resp = client.get(url, headers=headers)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")
    return {
        "html": resp.text,
        "title": soup.title.string if soup.title else "",
        "meta_description": _meta(soup, "description"),
        "text": soup.get_text(separator=" ", strip=True)[:5000],
        "links": [a.get("href") for a in soup.find_all("a", href=True)][:50],
        "scripts": [s.get("src") for s in soup.find_all("script", src=True)],
    }


def _meta(soup, name):
    tag = soup.find("meta", attrs={"name": name}) or soup.find("meta", attrs={"property": f"og:{name}"})
    return tag.get("content", "") if tag else ""


# ─── Step 2: Surface Tech Detection ──────────────────────────────────────────

def detect_tech_surface(url: str) -> list[dict]:
    try:
        import builtwith
        result = builtwith.parse(url)
        technologies = []
        for category, techs in result.items():
            for tech in techs:
                technologies.append({"name": tech, "category": category})
        return technologies
    except Exception:
        return []


# ─── Step 3: Deep Tech Detection ─────────────────────────────────────────────

def detect_tech_deep(url: str, scraped: dict) -> list[dict]:
    found = []
    html = scraped.get("html", "")
    scripts = scraped.get("scripts", [])

    fingerprints = [
        (r"wp-content|wp-includes", "WordPress", "CMS"),
        (r"shopify\.com", "Shopify", "E-commerce"),
        (r"squarespace\.com", "Squarespace", "Website Builder"),
        (r"wix\.com", "Wix", "Website Builder"),
        (r"gtag\(|google-analytics\.com", "Google Analytics", "Analytics"),
        (r"fbq\(|connect\.facebook\.net", "Facebook Pixel", "Advertising"),
        (r"intercom\.io|intercomcdn", "Intercom", "Customer Support"),
        (r"hotjar\.com", "Hotjar", "Analytics"),
        (r"hubspot\.com|hs-scripts", "HubSpot", "CRM/Marketing"),
        (r"mailchimp\.com", "Mailchimp", "Email Marketing"),
        (r"klaviyo\.com", "Klaviyo", "Email Marketing"),
        (r"stripe\.com/v3", "Stripe", "Payments"),
        (r"typeform\.com", "Typeform", "Forms"),
        (r"calendly\.com", "Calendly", "Scheduling"),
        (r"zendesk\.com", "Zendesk", "Customer Support"),
        (r"drift\.com", "Drift", "Live Chat"),
        (r"crisp\.chat", "Crisp", "Live Chat"),
        (r"tawk\.to", "Tawk.to", "Live Chat"),
        (r"next\.js|_next/static", "Next.js", "Framework"),
        (r"react\.development|react\.production", "React", "Framework"),
    ]

    for pattern, name, category in fingerprints:
        if re.search(pattern, html, re.IGNORECASE):
            found.append({"name": name, "category": category, "source": "fingerprint"})

    for src in scripts:
        if src:
            for pattern, name, category in fingerprints:
                if re.search(pattern, src, re.IGNORECASE):
                    if not any(t["name"] == name for t in found):
                        found.append({"name": name, "category": category, "source": "script_src"})

    return found


# ─── Step 4: Company Research ─────────────────────────────────────────────────

def research_company(name: str, url: str, industry: str | None) -> str:
    query = f"{name} company overview {industry or ''} site:{url}"
    results = _web_search(query, max_results=3)
    if not results:
        return f"No research data found for {name}."
    return "\n\n".join(r["content"] for r in results if r.get("content"))


# ─── Step 5: Competitor Discovery ────────────────────────────────────────────

def discover_competitors(name: str, industry: str | None) -> list[dict]:
    query = f"top competitors of {name} {industry or ''} company"
    results = _web_search(query, max_results=5)
    competitors = []
    for r in results:
        competitors.append({
            "name": r.get("title", ""),
            "url": r.get("url", ""),
            "notes": r.get("content", "")[:300],
            "source": "auto",
        })
    return competitors


# ─── Step 6: AI Proposal ──────────────────────────────────────────────────────

def generate_proposal(client: dict, tech_stack: dict, company_summary: str, competitors: list) -> str:
    from app.llm.adapter import get_llm_adapter

    prompt = _build_proposal_prompt(client, tech_stack, company_summary, competitors)
    adapter = get_llm_adapter()
    return adapter.complete(prompt)


def _build_proposal_prompt(client, tech_stack, company_summary, competitors) -> str:
    surface = ", ".join(t["name"] for t in (tech_stack or {}).get("surface", []))
    deep = ", ".join(t["name"] for t in (tech_stack or {}).get("deep", []))
    comp_list = "\n".join(f"- {c['name']} ({c.get('url','')}): {c.get('notes','')}" for c in (competitors or []))

    return f"""You are an AI automation consultant generating a professional proposal for a client.

## Client Information
- Name: {client['name']}
- Website: {client['website_url']}
- Industry: {client.get('industry') or 'Unknown'}
- Internal Notes: {client.get('notes') or 'None'}

## Current Tech Stack
- Surface tools detected: {surface or 'None detected'}
- Deep scan tools: {deep or 'None detected'}

## Company Research
{company_summary}

## Competitors
{comp_list or 'No competitors found'}

---

Generate a professional proposal following this EXACT structure:

# AI & Automation Proposal for {client['name']}

## 1. Executive Summary
Write 2-3 sentences summarizing the key opportunity, estimated hours/month saved, and estimated annual cost reduction.

## 2. Company & Tech Snapshot
Summarize what the company does and map their current tech stack as gaps — what they have vs. what leading companies in their space use.

## 3. Pain Points Identified
List 3-5 specific, evidence-backed pain points derived from their tech gaps and competitor comparison.

## 4. Recommended Tools & Automations
For each recommendation (3-5 total), use this format:
**[Tool/Automation Name]**
- What it does: ...
- Solves: [which pain point]
- Implementation effort: Low / Medium / High
- Estimated monthly cost: ~$X

## 5. ROI Estimates
For each recommendation provide:
- Hours saved/month: ~X hrs (based on [specific task])
- Hourly cost assumed: $Y/hr (industry average)
- Annual saving: ~$Z
- Industry benchmark: "[stat from known source]"

End with a summary ROI table.

## 6. Next Steps
Provide 3 clear, actionable bullet points as a call to action.

---
Write in a professional but approachable tone. Be specific — avoid generic AI buzzwords. Base all estimates on realistic industry data.
"""


# ─── Step 7: PDF Export ───────────────────────────────────────────────────────

def export_pdf(proposal_markdown: str, run_id: str, client_name: str) -> str:
    import asyncio
    return asyncio.run(_export_pdf_async(proposal_markdown, run_id, client_name))


async def _export_pdf_async(proposal_markdown: str, run_id: str, client_name: str) -> str:
    from playwright.async_api import async_playwright
    import markdown

    html_body = markdown.markdown(proposal_markdown, extensions=["tables", "fenced_code"])
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; line-height: 1.6; }}
  h1 {{ color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }}
  h2 {{ color: #1e40af; margin-top: 32px; }}
  h3 {{ color: #374151; }}
  table {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
  th, td {{ border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }}
  th {{ background: #f1f5f9; font-weight: 600; }}
  strong {{ color: #1e40af; }}
  ul {{ padding-left: 20px; }}
  li {{ margin: 4px 0; }}
</style>
</head>
<body>{html_body}</body>
</html>"""

    reports_dir = os.path.join(settings.storage_path, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    safe_name = re.sub(r"[^\w\-]", "_", client_name)
    pdf_path = os.path.join(reports_dir, f"{safe_name}_{run_id[:8]}.pdf")

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_content(html, wait_until="networkidle")
        await page.pdf(path=pdf_path, format="A4", margin={"top": "40px", "bottom": "40px", "left": "40px", "right": "40px"})
        await browser.close()

    return pdf_path


# ─── Shared: Web Search ───────────────────────────────────────────────────────

def _web_search(query: str, max_results: int = 5) -> list[dict]:
    if settings.tavily_api_key:
        return _tavily_search(query, max_results)
    return []


def _tavily_search(query: str, max_results: int) -> list[dict]:
    from tavily import TavilyClient
    client = TavilyClient(api_key=settings.tavily_api_key)
    response = client.search(query=query, max_results=max_results)
    return response.get("results", [])
