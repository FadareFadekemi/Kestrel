import os
import json
import logging
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from fastapi import FastAPI, HTTPException, Depends, Request, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, field_validator
from typing import Optional
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from contextlib import asynccontextmanager
from database import engine, get_db
import models, crud
from auth import (
    validate_email, validate_password,
    hash_password, verify_password,
    create_access_token, get_current_user,
    SECRET_KEY,
)

log = logging.getLogger("kestrel")

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app):
    # ── Startup security checks ───────────────────────────────────────────────
    weak_defaults = {
        "CHANGE_ME_IN_PRODUCTION_USE_A_LONG_RANDOM_STRING",
        "changeme", "secret", "your-secret-key",
    }
    if SECRET_KEY in weak_defaults or len(SECRET_KEY) < 32:
        log.warning(
            "⚠️  SECURITY: JWT_SECRET_KEY is not set or too weak. "
            "Set a strong random secret (≥32 chars) via the JWT_SECRET_KEY env variable."
        )

    try:
        models.Base.metadata.create_all(bind=engine)
        print("Database tables ready.")
    except Exception as e:
        print(f"DB init warning: {e}")
    yield

app = FastAPI(title="Kestrel API", docs_url=None, redoc_url=None, lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Global error handler — prevents stack traces leaking to clients ──────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data.", "errors": exc.errors()},
    )

# ── TrustedHostMiddleware (applied only when ALLOWED_HOSTS env is set) ────────
_allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "").strip()
if _allowed_hosts_env:
    _allowed_hosts = [h.strip() for h in _allowed_hosts_env.split(",") if h.strip()]
    if _allowed_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)

# ── CORS ──────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
if FRONTEND_URL:
    allowed_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=[],
    max_age=600,
)

# ── Security headers middleware ───────────────────────────────────────────────
_IS_PROD = os.getenv("ENVIRONMENT", "development").lower() == "production"

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    h = response.headers
    h["X-Content-Type-Options"]              = "nosniff"
    h["X-Frame-Options"]                     = "DENY"
    h["X-XSS-Protection"]                   = "1; mode=block"
    h["X-Permitted-Cross-Domain-Policies"]   = "none"
    h["Referrer-Policy"]                     = "strict-origin-when-cross-origin"
    h["Permissions-Policy"]                  = (
        "geolocation=(), microphone=(), camera=(), payment=(), "
        "usb=(), bluetooth=(), interest-cohort=()"
    )
    h["Cache-Control"]                       = "no-store, no-cache, must-revalidate"
    h["Content-Security-Policy"]             = (
        "default-src 'none'; frame-ancestors 'none'; "
        "base-uri 'none'; form-action 'none'; object-src 'none';"
    )
    if _IS_PROD:
        h["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response

# ── Request size limit (1 MB) ─────────────────────────────────────────────────
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    max_size = 1_000_000
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > max_size:
                return JSONResponse(status_code=413, content={"detail": "Request too large"})
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length"})
    return await call_next(request)

# ── Pydantic models ───────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str = ""

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, v):
        import re
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v.strip()):
            raise ValueError("Invalid email")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password too long")
        return v

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v):
        return v.strip()[:100]

class LoginRequest(BaseModel):
    email: str
    password: str

class ResearchRequest(BaseModel):
    input: str

    @field_validator("input")
    @classmethod
    def sanitize_input(cls, v):
        v = v.strip()
        if not v or len(v) > 500:
            raise ValueError("Input must be 1–500 characters")
        return v

class ProfileRequest(BaseModel):
    research: dict

class SenderProfileUpdate(BaseModel):
    name:               Optional[str] = None
    sender_title:       Optional[str] = None
    company_name:       Optional[str] = None
    product_description:Optional[str] = None
    value_proposition:  Optional[str] = None
    website:            Optional[str] = None

class EmailRequest(BaseModel):
    profile: dict
    tone: str = "Consultative"
    variant: str = "A"
    sender: dict = {}   # sender profile fields forwarded from frontend

    @field_validator("tone")
    @classmethod
    def valid_tone(cls, v):
        if v not in ("Consultative", "Formal", "Casual", "Aggressive"):
            raise ValueError("Invalid tone")
        return v

    @field_validator("variant")
    @classmethod
    def valid_variant(cls, v):
        if v not in ("A", "B"):
            raise ValueError("Invalid variant")
        return v

class SequenceRequest(BaseModel):
    profile: dict
    primary_email: dict

class ABRequest(BaseModel):
    profile: dict
    tone: str = "Consultative"
    sender: dict = {}

class LeadCreate(BaseModel):
    lead: dict

# ── Job seeker Pydantic models ────────────────────────────────────────────────

class JSResearchRequest(BaseModel):
    company:     str
    target_role: str

    @field_validator("company", "target_role")
    @classmethod
    def not_empty(cls, v):
        v = v.strip()
        if not v or len(v) > 200:
            raise ValueError("Must be 1–200 characters")
        return v

class JSProfilingRequest(BaseModel):
    research:    dict
    target_role: str

class JSEmailRequest(BaseModel):
    profile:   dict
    research:  dict
    candidate: dict
    tone:      str = "Professional"

    @field_validator("tone")
    @classmethod
    def valid_tone(cls, v):
        if v not in ("Enthusiastic", "Professional", "Concise"):
            raise ValueError("Invalid tone")
        return v

class JSFollowupRequest(BaseModel):
    company:          str
    role:             str
    days:             int
    original_subject: str

class JSCVAnalysisRequest(BaseModel):
    cv_text: str

    @field_validator("cv_text")
    @classmethod
    def not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("CV text is required")
        return v[:8000]

class JSImproveSummaryRequest(BaseModel):
    summary:     str
    target_role: str

class JSImproveBulletRequest(BaseModel):
    bullet: str
    role:   str

class JSSuggestSkillsRequest(BaseModel):
    target_role:    str
    current_skills: list = []

class JSJDMatchRequest(BaseModel):
    cv_text: str
    jd_text: str

class JSMatchingRequest(BaseModel):
    profile: dict

class JSScamRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Text is required")
        return v[:4000]

class LeadUpdate(BaseModel):
    status:       Optional[str] = None
    contactName:  Optional[str] = None
    contactTitle: Optional[str] = None
    contactEmail: Optional[str] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v):
        if v and v not in ("Not Contacted", "Contacted", "Replied", "Converted"):
            raise ValueError("Invalid status")
        return v

    @field_validator("contactEmail")
    @classmethod
    def valid_email(cls, v):
        import re
        if v and not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v.strip()):
            raise ValueError("Invalid email address")
        return v.strip() if v else v

class SendEmailRequest(BaseModel):
    to_email: str
    subject:  str
    body:     str
    lead_id:  Optional[int] = None

    @field_validator("to_email")
    @classmethod
    def valid_to_email(cls, v):
        import re
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v.strip()):
            raise ValueError("Invalid recipient email")
        return v.strip()

    @field_validator("subject", "body")
    @classmethod
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Must not be empty")
        return v.strip()

# ── Helpers ───────────────────────────────────────────────────────────────────

def sse(event: str, data: dict) -> str:
    return f"data: {json.dumps({'event': event, 'data': data})}\n\n"

# ── Auth routes ───────────────────────────────────────────────────────────────

@app.post("/api/auth/signup", status_code=201)
@limiter.limit("10/minute")
async def signup(request: Request, req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        # Intentionally vague — don't confirm whether email exists
        raise HTTPException(status_code=400, detail="Registration failed. Try a different email.")
    user = models.User(
        email=      req.email,
        name=       req.name,
        hashed_pw=  hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.email)
    return {"token": token, "user": user.to_dict()}

@app.post("/api/auth/login")
@limiter.limit("20/minute")
async def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email.strip().lower()).first()
    # Always run verify_password to prevent timing attacks (even if user not found)
    dummy_hash = "$2b$12$KIXzBT3HKpGI2GsIGeTFMOGXS1qiStdIWfFa7i6MFTNk8OxZBLKzm"
    if not user or not verify_password(req.password, user.hashed_pw if user else dummy_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    token = create_access_token(user.id, user.email)
    return {"token": token, "user": user.to_dict()}

@app.get("/api/auth/me")
async def me(current_user: models.User = Depends(get_current_user)):
    return current_user.to_dict()

@app.patch("/api/auth/profile")
async def update_profile(
    req: SenderProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    for field, value in req.model_dump(exclude_none=True).items():
        setattr(current_user, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(current_user)
    return current_user.to_dict()

# ── Agent routes (protected) ──────────────────────────────────────────────────

@app.post("/api/research")
@limiter.limit("30/minute")
async def research_endpoint(
    request: Request,
    req: ResearchRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.research import run_research_agent
        async for chunk in run_research_agent(req.input):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/profile")
@limiter.limit("30/minute")
async def profile_endpoint(
    request: Request,
    req: ProfileRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.profiling import run_profiling_agent
        async for chunk in run_profiling_agent(req.research):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/email")
@limiter.limit("30/minute")
async def email_endpoint(
    request: Request,
    req: EmailRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.email_writer import run_email_writer
        async for chunk in run_email_writer(req.profile, req.tone, req.variant, req.sender):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/sequence")
@limiter.limit("20/minute")
async def sequence_endpoint(
    request: Request,
    req: SequenceRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.email_writer import run_sequence_writer
        async for chunk in run_sequence_writer(req.profile, req.primary_email):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/ab-variants")
@limiter.limit("20/minute")
async def ab_endpoint(
    request: Request,
    req: ABRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.email_writer import run_ab_variants
        async for chunk in run_ab_variants(req.profile, req.tone, req.sender):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

# ── Leads DB routes (protected) ───────────────────────────────────────────────

@app.get("/api/leads")
async def list_leads(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return [l.to_dict() for l in crud.get_leads(db)]

@app.post("/api/leads", status_code=201)
async def create_lead(
    req: LeadCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    lead = crud.create_lead(db, req.lead)
    return lead.to_dict()

@app.patch("/api/leads/{lead_id}")
async def update_lead(
    lead_id: int,
    req: LeadUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    data = req.model_dump(exclude_none=True)
    lead = crud.update_lead(db, lead_id, data)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead.to_dict()

@app.delete("/api/leads/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    if not crud.delete_lead(db, lead_id):
        raise HTTPException(status_code=404, detail="Lead not found")

# ── Email sending (protected) ────────────────────────────────────────────────

@app.post("/api/send-email")
@limiter.limit("20/minute")
async def send_email_endpoint(
    request: Request,
    req: SendEmailRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.email_sender import send_email
    result = await send_email(req.to_email, req.subject, req.body)
    if not result["ok"]:
        raise HTTPException(status_code=502, detail=result["error"])
    if req.lead_id:
        crud.update_lead(db, req.lead_id, {"status": "Contacted"})
    return {"ok": True, "message": f"Email sent to {req.to_email}"}

# ── Job seeker routes (protected) ────────────────────────────────────────────

@app.post("/api/js/research")
@limiter.limit("20/minute")
async def js_research(
    request: Request,
    req: JSResearchRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    current_user.reset_usage_if_needed()
    if not current_user.is_pro() and current_user.js_research_this_month >= 5:
        raise HTTPException(status_code=403, detail="Monthly company research limit reached. Upgrade to Pro for unlimited research.")
    current_user.js_research_this_month += 1
    db.commit()

    async def stream():
        from services.js_outreach import run_js_research
        async for chunk in run_js_research(req.company, req.target_role):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/js/profile")
@limiter.limit("20/minute")
async def js_profile(
    request: Request,
    req: JSProfilingRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.js_outreach import run_js_profiling
        async for chunk in run_js_profiling(req.research, req.target_role):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/js/email")
@limiter.limit("20/minute")
async def js_email(
    request: Request,
    req: JSEmailRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    current_user.reset_usage_if_needed()
    if not current_user.is_pro() and current_user.js_outreach_this_month >= 5:
        raise HTTPException(status_code=403, detail="Monthly outreach email limit reached. Upgrade to Pro for unlimited emails.")
    current_user.js_outreach_this_month += 1
    db.commit()

    async def stream():
        from services.js_outreach import run_js_email
        async for chunk in run_js_email(req.profile, req.research, req.candidate, req.tone):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/js/followup")
@limiter.limit("20/minute")
async def js_followup(
    request: Request,
    req: JSFollowupRequest,
    _: models.User = Depends(get_current_user),
):
    from services.js_outreach import run_js_followup
    result = await run_js_followup(req.company, req.role, req.days, req.original_subject)
    return result

@app.post("/api/js/cv/analyse")
@limiter.limit("15/minute")
async def js_cv_analyse(
    request: Request,
    req: JSCVAnalysisRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.js_cv import run_cv_analysis
        async for chunk in run_cv_analysis(req.cv_text):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/js/cv/improve-summary")
@limiter.limit("20/minute")
async def js_improve_summary(
    request: Request,
    req: JSImproveSummaryRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.js_cv import run_improve_summary
        async for chunk in run_improve_summary(req.summary, req.target_role):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/js/cv/improve-bullet")
@limiter.limit("30/minute")
async def js_improve_bullet(
    request: Request,
    req: JSImproveBulletRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.js_cv import run_improve_bullet
        async for chunk in run_improve_bullet(req.bullet, req.role):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/js/cv/suggest-skills")
@limiter.limit("20/minute")
async def js_suggest_skills(
    request: Request,
    req: JSSuggestSkillsRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.js_cv import run_suggest_skills
        async for chunk in run_suggest_skills(req.target_role, req.current_skills):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/js/cv/jd-match")
@limiter.limit("15/minute")
async def js_jd_match(
    request: Request,
    req: JSJDMatchRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.js_cv import run_jd_match
        async for chunk in run_jd_match(req.cv_text, req.jd_text):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/js/matches")
@limiter.limit("10/minute")
async def js_matches(
    request: Request,
    req: JSMatchingRequest,
    _: models.User = Depends(get_current_user),
):
    async def stream():
        from services.js_matching import run_job_matching
        async for chunk in run_job_matching(req.profile):
            yield sse(chunk["event"], chunk["data"])
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/js/scam-detect")
@limiter.limit("20/minute")
async def js_scam_detect(
    request: Request,
    req: JSScamRequest,
    _: models.User = Depends(get_current_user),
):
    from services.js_matching import run_scam_detection
    result = await run_scam_detection(req.text)
    return result

# ── Job board search (jobseeker, protected) ───────────────────────────────────

@app.get("/api/jobseeker/jobs/search")
@limiter.limit("30/minute")
async def jobseeker_jobs_search(
    request: Request,
    query:    str = Query("developer", min_length=1, max_length=100),
    location: str = Query("Nigeria",   max_length=100),
    page:     int = Query(1, ge=1, le=10),
    _: models.User = Depends(get_current_user),
):
    from services.js_jobs import search_jobs
    return await search_jobs(query.strip(), location.strip(), page)

# ── Public tools (no auth required) ─────────────────────────────────────────

@app.post("/api/public/scam-detect")
@limiter.limit("5/minute")
async def public_scam_detect(request: Request, req: JSScamRequest):
    from services.js_matching import run_scam_detection
    result = await run_scam_detection(req.text)
    return result

# ── Health (public) ───────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    missing = [k for k in ["VITE_TAVILY_API_KEY", "VITE_EXA_API_KEY", "VITE_OPENAI_API_KEY"] if not os.getenv(k)]
    return {"status": "ok", "missing_keys": missing}


# ── Payment Pydantic models ───────────────────────────────────────────────────

class VerifyPaymentRequest(BaseModel):
    reference: str

    @field_validator("reference")
    @classmethod
    def ref_not_empty(cls, v):
        v = v.strip()
        if not v or len(v) > 100:
            raise ValueError("Invalid reference")
        return v

class ListingCreateRequest(BaseModel):
    title:       str
    company:     str = ""
    location:    str = ""
    description: str = ""
    salary_range:str = ""
    job_type:    str = "Full-time"

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        v = v.strip()
        if not v or len(v) > 300:
            raise ValueError("Title must be 1–300 characters")
        return v

    @field_validator("description")
    @classmethod
    def desc_max(cls, v):
        return v.strip()[:5000]

    @field_validator("job_type")
    @classmethod
    def valid_job_type(cls, v):
        valid = ("Full-time", "Part-time", "Contract", "Internship", "Remote")
        if v not in valid:
            raise ValueError("Invalid job type")
        return v

class SenderProfileUpdateV2(BaseModel):
    name:               Optional[str] = None
    sender_title:       Optional[str] = None
    company_name:       Optional[str] = None
    product_description:Optional[str] = None
    value_proposition:  Optional[str] = None
    website:            Optional[str] = None
    theme_pref:         Optional[str] = None

    @field_validator("theme_pref")
    @classmethod
    def valid_theme(cls, v):
        if v and v not in ("light", "dark"):
            raise ValueError("theme_pref must be 'light' or 'dark'")
        return v


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_reference(prefix: str) -> str:
    import uuid
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _upgrade_user_to_pro(user: models.User, db: Session, amount_kobo: int, reference: str):
    """Upgrade a user to Pro for 30 days and log the payment."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    user.js_plan = "pro"
    user.js_plan_expires_at = now + timedelta(days=30)
    user.js_plan_grace_until = now + timedelta(days=33)
    db.commit()


def _log_payment(
    db: Session, user_id: int, amount_kobo: int,
    reference: str, event_type: str, payment_type: str,
    status: str, meta: dict | None = None,
) -> models.PaymentLog | None:
    existing = db.query(models.PaymentLog).filter(models.PaymentLog.reference == reference).first()
    if existing:
        return None  # idempotent — already processed
    log = models.PaymentLog(
        user_id=user_id,
        amount=amount_kobo,
        reference=reference,
        event_type=event_type,
        payment_type=payment_type,
        status=status,
        meta_json=json.dumps(meta or {}),
    )
    db.add(log)
    db.commit()
    return log


# ── User plan endpoint ────────────────────────────────────────────────────────

@app.get("/api/user/plan")
async def get_user_plan(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    current_user.reset_usage_if_needed()
    db.commit()
    return {
        "plan":              current_user.js_plan,
        "is_pro":            current_user.is_pro(),
        "expires_at":        current_user.js_plan_expires_at.isoformat() if current_user.js_plan_expires_at else None,
        "research_used":     current_user.js_research_this_month,
        "outreach_used":     current_user.js_outreach_this_month,
        "research_limit":    5 if not current_user.is_pro() else None,
        "outreach_limit":    5 if not current_user.is_pro() else None,
    }


# ── Updated profile endpoint (supports theme_pref) ────────────────────────────

@app.patch("/api/auth/profile/v2")
async def update_profile_v2(
    req: SenderProfileUpdateV2,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    for field, value in req.model_dump(exclude_none=True).items():
        setattr(current_user, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(current_user)
    return current_user.to_dict()


# ── Job seeker Pro payment ────────────────────────────────────────────────────

@app.post("/api/payments/js/initiate")
@limiter.limit("10/minute")
async def initiate_js_pro_payment(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.is_pro():
        raise HTTPException(status_code=400, detail="You are already on the Pro plan")

    from services.paystack import initialize_transaction, PAYSTACK_PUBLIC_KEY
    reference = _generate_reference("jspro")

    result = await initialize_transaction(
        email=current_user.email,
        amount_ngn=2000,
        reference=reference,
        metadata={"user_id": current_user.id, "payment_type": "js_pro"},
    )
    if not result["ok"]:
        raise HTTPException(status_code=502, detail=result["error"])

    _log_payment(db, current_user.id, 200000, reference, "initiate", "js_pro", "pending")

    return {
        "reference":   reference,
        "public_key":  PAYSTACK_PUBLIC_KEY,
        "email":       current_user.email,
        "amount":      200000,  # kobo
    }


@app.post("/api/payments/js/verify")
@limiter.limit("10/minute")
async def verify_js_pro_payment(
    request: Request,
    req: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.paystack import verify_transaction
    result = await verify_transaction(req.reference)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    tx = result["data"]
    if tx.get("status") != "success":
        raise HTTPException(status_code=400, detail="Payment not yet completed")

    amount_kobo = tx.get("amount", 0)
    if amount_kobo < 200000:
        raise HTTPException(status_code=400, detail="Insufficient payment amount")

    log = _log_payment(db, current_user.id, amount_kobo, req.reference, "charge.success", "js_pro", "success",
                       meta={"channel": tx.get("channel"), "gateway_response": tx.get("gateway_response")})
    if log is None:
        db.refresh(current_user)
        return {"plan": current_user.js_plan, "message": "Already processed"}

    # Store Paystack customer code if present
    customer = tx.get("customer", {})
    if customer.get("customer_code"):
        current_user.paystack_customer_code = customer["customer_code"]

    _upgrade_user_to_pro(current_user, db, amount_kobo, req.reference)
    db.refresh(current_user)

    # Send confirmation email (best-effort)
    from services.email_sender import send_email
    await send_email(
        current_user.email,
        "Welcome to techcori Pro!",
        f"Hi {current_user.name or 'there'},\n\nYour techcori Pro subscription is now active.\n\n"
        f"Amount paid: ₦2,000\nReference: {req.reference}\n\n"
        "Your profile is now visible to hiring companies. Good luck!\n\ntechcori team",
    )

    return {"plan": current_user.js_plan, "message": "Upgraded to Pro"}


@app.get("/api/payments/history")
async def payment_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    logs = (
        db.query(models.PaymentLog)
        .filter(models.PaymentLog.user_id == current_user.id, models.PaymentLog.status == "success")
        .order_by(models.PaymentLog.created_at.desc())
        .all()
    )
    return [l.to_dict() for l in logs]


@app.delete("/api/payments/js/subscription", status_code=200)
async def cancel_js_subscription(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.is_pro():
        raise HTTPException(status_code=400, detail="No active Pro subscription")

    if current_user.paystack_subscription_code:
        from services.paystack import cancel_subscription
        result = await cancel_subscription(current_user.paystack_subscription_code)
        if not result["ok"]:
            log.warning("Paystack subscription cancellation failed: %s", result["error"])

    current_user.paystack_subscription_code = ""
    db.commit()
    return {"message": "Subscription cancelled. Access continues until the end of your billing period."}


# ── Paystack webhook ──────────────────────────────────────────────────────────

@app.post("/api/payments/webhook")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    from services.paystack import verify_webhook_signature
    from datetime import timedelta

    payload_bytes = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    if not verify_webhook_signature(payload_bytes, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        event_data = json.loads(payload_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event   = event_data.get("event", "")
    data    = event_data.get("data", {})
    reference = data.get("reference") or data.get("id", "")

    if event == "charge.success":
        customer_code = data.get("customer", {}).get("customer_code", "")
        email = data.get("customer", {}).get("email", "")
        amount_kobo = data.get("amount", 0)
        payment_type = data.get("metadata", {}).get("payment_type", "")
        user_id = data.get("metadata", {}).get("user_id")

        user = None
        if user_id:
            user = db.query(models.User).filter(models.User.id == int(user_id)).first()
        elif email:
            user = db.query(models.User).filter(models.User.email == email).first()

        if user:
            if customer_code:
                user.paystack_customer_code = customer_code

            if payment_type == "js_pro":
                log_entry = _log_payment(db, user.id, amount_kobo, str(reference),
                                         "charge.success", "js_pro", "success",
                                         meta={"gateway_response": data.get("gateway_response")})
                if log_entry:
                    _upgrade_user_to_pro(user, db, amount_kobo, str(reference))
            elif payment_type == "job_listing":
                listing_id = data.get("metadata", {}).get("listing_id")
                if listing_id:
                    listing = db.query(models.JobListing).filter(models.JobListing.id == int(listing_id)).first()
                    if listing and listing.payment_status == "pending":
                        listing.payment_status = "paid"
                        listing.is_active = True
                        listing.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                        log_entry = _log_payment(db, user.id, amount_kobo, str(reference),
                                                 "charge.success", "job_listing", "success",
                                                 meta={"listing_id": listing_id})
                        db.commit()
                        from services.email_sender import send_email
                        await send_email(
                            user.email,
                            "Job listing payment confirmed — techcori",
                            f"Hi {user.name or 'there'},\n\nYour job listing \"{listing.title}\" is now live!\n\n"
                            f"Amount paid: ₦2,000\nReference: {reference}\n"
                            f"Listing expires: {listing.expires_at.strftime('%B %d, %Y')}\n\ntechcori team",
                        )

    elif event == "subscription.create":
        subscription_code = data.get("subscription_code", "")
        email = data.get("customer", {}).get("email", "")
        if email and subscription_code:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.paystack_subscription_code = subscription_code
                db.commit()

    elif event == "subscription.disable":
        email = data.get("customer", {}).get("email", "")
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.paystack_subscription_code = ""
                db.commit()

    elif event == "invoice.payment_failed":
        from datetime import timedelta
        email = data.get("customer", {}).get("email", "")
        amount_kobo = data.get("amount", 0)
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user and user.js_plan == "pro":
                # Give 3-day grace period
                user.js_plan_grace_until = datetime.now(timezone.utc) + timedelta(days=3)
                db.commit()
                _log_payment(db, user.id, amount_kobo, str(reference or f"fail_{email}"),
                             "invoice.payment_failed", "js_pro", "failed")
                from services.email_sender import send_email
                await send_email(
                    email,
                    "techcori Pro payment failed",
                    f"Hi {user.name or 'there'},\n\nWe could not process your Pro subscription renewal.\n\n"
                    "Your account will remain active for 3 more days. Please update your payment method.\n\n"
                    "If you have questions, contact support@techcori.com\n\ntechcori team",
                )

    return {"status": "ok"}


# ── Job listings (companies) ──────────────────────────────────────────────────

@app.post("/api/listings/initiate", status_code=201)
@limiter.limit("20/minute")
async def initiate_listing_payment(
    request: Request,
    req: ListingCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.paystack import initialize_transaction, PAYSTACK_PUBLIC_KEY
    from datetime import timedelta

    listing = models.JobListing(
        user_id=current_user.id,
        title=req.title,
        company=req.company or current_user.company_name,
        location=req.location,
        description=req.description,
        salary_range=req.salary_range,
        job_type=req.job_type,
        payment_status="pending",
        is_active=False,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)

    reference = _generate_reference("listing")
    listing.payment_reference = reference
    db.commit()

    result = await initialize_transaction(
        email=current_user.email,
        amount_ngn=2000,
        reference=reference,
        metadata={
            "user_id": current_user.id,
            "listing_id": listing.id,
            "payment_type": "job_listing",
        },
    )
    if not result["ok"]:
        db.delete(listing)
        db.commit()
        raise HTTPException(status_code=502, detail=result["error"])

    return {
        "listing_id":  listing.id,
        "reference":   reference,
        "public_key":  PAYSTACK_PUBLIC_KEY,
        "email":       current_user.email,
        "amount":      200000,
    }


@app.post("/api/listings/{listing_id}/verify")
@limiter.limit("10/minute")
async def verify_listing_payment(
    request: Request,
    listing_id: int,
    req: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.paystack import verify_transaction
    from datetime import timedelta

    listing = db.query(models.JobListing).filter(
        models.JobListing.id == listing_id,
        models.JobListing.user_id == current_user.id,
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    result = await verify_transaction(req.reference)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    tx = result["data"]
    if tx.get("status") != "success":
        raise HTTPException(status_code=400, detail="Payment not completed")

    amount_kobo = tx.get("amount", 0)
    if amount_kobo < 200000:
        raise HTTPException(status_code=400, detail="Insufficient payment amount")

    log_entry = _log_payment(db, current_user.id, amount_kobo, req.reference,
                             "charge.success", "job_listing", "success",
                             meta={"listing_id": listing_id})
    if log_entry is None:
        db.refresh(listing)
        return listing.to_dict()

    listing.payment_status = "paid"
    listing.is_active = True
    listing.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    db.commit()
    db.refresh(listing)

    from services.email_sender import send_email
    await send_email(
        current_user.email,
        "Job listing payment confirmed — techcori",
        f"Hi {current_user.name or 'there'},\n\nYour job listing \"{listing.title}\" is now live!\n\n"
        f"Amount paid: ₦2,000\nReference: {req.reference}\n"
        f"Listing expires: {listing.expires_at.strftime('%B %d, %Y')}\n\ntechcori team",
    )

    return listing.to_dict()


@app.get("/api/listings")
async def get_my_listings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    listings = (
        db.query(models.JobListing)
        .filter(models.JobListing.user_id == current_user.id)
        .order_by(models.JobListing.created_at.desc())
        .all()
    )
    return [l.to_dict() for l in listings]


@app.post("/api/listings/{listing_id}/renew", status_code=200)
@limiter.limit("10/minute")
async def renew_listing(
    request: Request,
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.paystack import initialize_transaction, PAYSTACK_PUBLIC_KEY

    listing = db.query(models.JobListing).filter(
        models.JobListing.id == listing_id,
        models.JobListing.user_id == current_user.id,
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    reference = _generate_reference("renew")
    listing.payment_reference = reference
    listing.payment_status = "pending"
    listing.is_active = False
    db.commit()

    result = await initialize_transaction(
        email=current_user.email,
        amount_ngn=2000,
        reference=reference,
        metadata={"user_id": current_user.id, "listing_id": listing_id, "payment_type": "job_listing"},
    )
    if not result["ok"]:
        raise HTTPException(status_code=502, detail=result["error"])

    return {
        "listing_id": listing_id,
        "reference":  reference,
        "public_key": PAYSTACK_PUBLIC_KEY,
        "email":      current_user.email,
        "amount":     200000,
    }


@app.get("/api/listings/public")
@limiter.limit("60/minute")
async def public_listings(
    request: Request,
    query:    str = Query("", max_length=100),
    location: str = Query("", max_length=100),
    page:     int = Query(1, ge=1, le=50),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    q = db.query(models.JobListing).filter(
        models.JobListing.is_active == True,
        models.JobListing.expires_at > now,
    )
    if query:
        q = q.filter(models.JobListing.title.ilike(f"%{query}%"))
    if location:
        q = q.filter(models.JobListing.location.ilike(f"%{location}%"))

    total = q.count()
    listings = q.order_by(models.JobListing.created_at.desc()).offset((page - 1) * 20).limit(20).all()
    return {"total": total, "page": page, "results": [l.to_dict() for l in listings]}
