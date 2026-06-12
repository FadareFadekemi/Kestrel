"""
Job board aggregator: fetches from multiple sources in parallel,
merges, deduplicates, sorts, and caches results for 10 minutes.
"""
import asyncio
import hashlib
import os
import re
import time
import datetime
from typing import Optional

import httpx

JSEARCH_KEY: str = os.getenv("JSEARCH_API_KEY", "")
CACHE_TTL = 600  # 10 minutes

# Simple in-memory cache: key → (timestamp, data)
_cache: dict[str, tuple[float, list]] = {}


def _cache_key(query: str, location: str, page: int) -> str:
    raw = f"{query.lower().strip()}|{location.lower().strip()}|{page}"
    return hashlib.md5(raw.encode()).hexdigest()


def _get_cached(key: str) -> Optional[list]:
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < CACHE_TTL:
        return entry[1]
    return None


def _set_cache(key: str, data: list) -> None:
    _cache[key] = (time.time(), data)


def _strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def _ts_to_iso(ts) -> str:
    if not ts:
        return ""
    try:
        return datetime.datetime.fromtimestamp(
            int(ts), tz=datetime.timezone.utc
        ).isoformat()
    except Exception:
        return str(ts)


def _dedup_key(job: dict) -> str:
    company = (job.get("company") or "").lower().strip()
    title   = (job.get("title")   or "").lower().strip()
    return f"{company}|{title}"


def _title_matches_query(job: dict, query: str) -> bool:
    """True when at least one meaningful query word appears in the job title."""
    words = [w.lower() for w in re.split(r"\s+", query.strip()) if len(w) > 2]
    if not words:
        return True
    title = (job.get("title") or "").lower()
    return any(w in title for w in words)


# ── Individual fetchers ───────────────────────────────────────────────────────

async def _fetch_jsearch(query: str, location: str, page: int) -> tuple[list, Optional[str]]:
    if not JSEARCH_KEY:
        return [], "Job source not configured"
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            r = await client.get(
                "https://jsearch-mega.p.rapidapi.com/search",
                params={
                    "query":     f"{query} {location}",
                    "page":      str(page),
                    "num_pages": "1",
                },
                headers={
                    "X-RapidAPI-Key":  JSEARCH_KEY,
                    "X-RapidAPI-Host": "jsearch-mega.p.rapidapi.com",
                },
            )
            r.raise_for_status()
            jobs = []
            for j in r.json().get("data", []):
                city    = j.get("job_city") or ""
                country = j.get("job_country") or ""
                loc     = ", ".join(filter(None, [city, country])) or "Unknown"
                jobs.append({
                    "id":          f"js_{j.get('job_id', '')}",
                    "title":       (j.get("job_title") or "").strip(),
                    "company":     (j.get("employer_name") or "").strip(),
                    "location":    loc,
                    "description": _strip_html((j.get("job_description") or ""))[:1000],
                    "url":         j.get("job_apply_link") or j.get("job_google_link") or "",
                    "source":      "Featured",
                    "date_posted": _ts_to_iso(j.get("job_posted_at_timestamp")),
                    "is_remote":   bool(j.get("job_is_remote")),
                })
            return jobs, None
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            return [], None  # rate-limited — degrade silently, other sources still run
        return [], "Some featured listings are temporarily unavailable"
    except Exception:
        return [], None  # network error — degrade silently


async def _fetch_arbeitnow(query: str, page: int) -> tuple[list, Optional[str]]:
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            r = await client.get(
                "https://arbeitnow.com/api/job-board-api",
                params={"search": query, "page": str(page)},
            )
            r.raise_for_status()
            jobs = []
            for j in r.json().get("data", []):
                jobs.append({
                    "id":          f"an_{j.get('slug', '')}",
                    "title":       (j.get("title") or "").strip(),
                    "company":     (j.get("company_name") or "").strip(),
                    "location":    (j.get("location") or "Remote").strip(),
                    "description": _strip_html((j.get("description") or ""))[:1000],
                    "url":         j.get("url") or "",
                    "source":      "Global",
                    "date_posted": _ts_to_iso(j.get("created_at")) if isinstance(j.get("created_at"), int) else (j.get("created_at") or ""),
                    "is_remote":   bool(j.get("remote")),
                })
            return jobs, None
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            return [], None
        return [], "Some global listings are temporarily unavailable"
    except Exception:
        return [], None


async def _fetch_remotive(query: str) -> tuple[list, Optional[str]]:
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            r = await client.get(
                "https://remotive.com/api/remote-jobs",
                params={"search": query, "limit": "50"},
            )
            r.raise_for_status()
            jobs = []
            for j in r.json().get("jobs", []):
                loc = (j.get("candidate_required_location") or "Remote").strip()
                jobs.append({
                    "id":          f"rm_{j.get('id', '')}",
                    "title":       (j.get("title") or "").strip(),
                    "company":     (j.get("company_name") or "").strip(),
                    "location":    loc,
                    "description": _strip_html((j.get("description") or ""))[:1000],
                    "url":         j.get("url") or "",
                    "source":      "Remote",
                    "date_posted": j.get("publication_date") or "",
                    "is_remote":   True,
                })
            return jobs, None
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            return [], None
        return [], "Some remote listings are temporarily unavailable"
    except Exception:
        return [], None


# ── Public aggregator ─────────────────────────────────────────────────────────

async def search_jobs(query: str, location: str, page: int) -> dict:
    key    = _cache_key(query, location, page)
    cached = _get_cached(key)
    if cached is not None:
        return {"jobs": cached, "errors": [], "total": len(cached), "cached": True}

    jsearch_task   = _fetch_jsearch(query, location, page)
    arbeitnow_task = _fetch_arbeitnow(query, page)
    remotive_task  = _fetch_remotive(query)

    raw_results = await asyncio.gather(
        jsearch_task, arbeitnow_task, remotive_task,
        return_exceptions=True,
    )

    all_jobs: list[dict] = []
    errors:   list[str]  = []
    for result in raw_results:
        if isinstance(result, Exception):
            errors.append("A job source is temporarily unavailable")
            continue
        jobs, err = result
        if err:
            errors.append(err)
        else:
            all_jobs.extend(jobs)

    # Keyword filter — drop jobs whose title doesn't contain any search word
    # (Arbeitnow returns its full feed regardless of the search param)
    all_jobs = [j for j in all_jobs if _title_matches_query(j, query)]

    # Deduplicate by company + title
    seen:   set[str]  = set()
    unique: list[dict] = []
    for job in all_jobs:
        dk = _dedup_key(job)
        if dk not in seen and job.get("title") and job.get("company"):
            seen.add(dk)
            unique.append(job)

    # Sort newest first; normalise to string so int timestamps (Arbeitnow) don't crash the compare
    unique.sort(key=lambda j: str(j.get("date_posted") or ""), reverse=True)

    # Cap at 50 per page
    unique = unique[:50]

    _set_cache(key, unique)
    return {"jobs": unique, "errors": errors, "total": len(unique), "cached": False}
