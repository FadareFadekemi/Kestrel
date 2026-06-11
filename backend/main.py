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

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database import SessionLocal

_scheduler = AsyncIOScheduler()


def _run_monthly_maintenance():
    """Expire subscriptions whose period_end has passed and downgrade User plan."""
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        expired = (
            db.query(models.User)
            .filter(
                models.User.js_plan == "pro",
                models.User.js_plan_expires_at.isnot(None),
                models.User.js_plan_expires_at < now,
                models.User.js_plan_grace_until < now,
            )
            .all()
        )
        for u in expired:
            u.js_plan = "free"
            sub = db.query(models.Subscription).filter(models.Subscription.user_id == u.id).first()
            if sub and sub.status not in ("cancelled",):
                sub.status = "expired"
                sub.plan = "free"
                sub.updated_at = now
        if expired:
            db.commit()
            log.info("Monthly maintenance: downgraded %d expired Pro users", len(expired))


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

    _scheduler.add_job(_run_monthly_maintenance, "cron", day=1, hour=0, minute=5, id="monthly_maintenance", replace_existing=True)
    _scheduler.start()

    yield

    _scheduler.shutdown(wait=False)

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
    account_type: str = "jobseeker"

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

    @field_validator("account_type")
    @classmethod
    def valid_account_type(cls, v):
        if v not in ("company", "jobseeker"):
            raise ValueError("account_type must be 'company' or 'jobseeker'")
        return v

class LoginRequest(BaseModel):
    email: str
    password: str
    account_type: str = ""

    @field_validator("account_type")
    @classmethod
    def valid_login_type(cls, v):
        if v and v not in ("company", "jobseeker"):
            raise ValueError("Invalid account_type")
        return v

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
    # Company accounts must use a work email
    if req.account_type == "company" and _is_personal_domain(req.email):
        raise HTTPException(
            status_code=400,
            detail=(
                "Company accounts require a work email address. "
                "Personal email providers (Gmail, Yahoo, Outlook, Hotmail, etc.) are not allowed. "
                "Please use your company email to sign up."
            ),
        )

    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Registration failed. Try a different email.")
    user = models.User(
        email=        req.email,
        name=         req.name,
        hashed_pw=    hash_password(req.password),
        account_type= req.account_type,
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
    pw_ok = verify_password(req.password, user.hashed_pw if user else dummy_hash)
    if not user or not pw_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    # Account type mismatch — return identical error to wrong password (no information leak)
    if req.account_type and user.account_type and req.account_type != user.account_type:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id, user.email)
    return {"token": token, "user": user.to_dict()}

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def valid_email(cls, v):
        import re
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email")
        return v

class ResetPasswordRequest(BaseModel):
    token:    str
    password: str

    @field_validator("token")
    @classmethod
    def token_not_empty(cls, v):
        v = v.strip()
        if not v or len(v) > 128:
            raise ValueError("Invalid token")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password too long")
        return v


@app.post("/api/auth/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    import secrets, hashlib
    from services.email_sender import send_email

    # Always return the same response — never reveal whether the email exists
    _RESPONSE = {"message": "If that email is registered, a reset link has been sent."}

    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        return _RESPONSE

    # Invalidate any existing unused tokens for this user
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == False,
    ).delete()
    db.commit()

    # Generate a secure random token and store its hash
    raw_token  = secrets.token_hex(32)          # 64-char hex, 256 bits of entropy
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    reset_token = models.PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(reset_token)
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link   = f"{frontend_url}/?reset_token={raw_token}"

    await send_email(
        user.email,
        "Reset your techcori password",
        f"Hi {user.name or 'there'},\n\n"
        f"Someone requested a password reset for your techcori account.\n\n"
        f"Click the link below to set a new password (valid for 1 hour):\n\n"
        f"{reset_link}\n\n"
        f"If you did not request this, you can safely ignore this email.\n\n"
        f"techcori team",
    )

    return _RESPONSE


@app.post("/api/auth/reset-password")
@limiter.limit("10/minute")
async def reset_password(request: Request, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    import hashlib
    from auth import hash_password

    token_hash = hashlib.sha256(req.token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    reset = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == token_hash,
        models.PasswordResetToken.used       == False,
        models.PasswordResetToken.expires_at  > now,
    ).first()

    if not reset:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")

    user = db.query(models.User).filter(models.User.id == reset.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Account not found.")

    user.hashed_pw = hash_password(req.password)
    reset.used = True
    db.commit()

    return {"message": "Password updated successfully. You can now sign in."}


@app.get("/api/auth/me")
async def me(current_user: models.User = Depends(get_current_user)):
    return current_user.to_dict()

class AccountTypeRequest(BaseModel):
    account_type: str

    @field_validator("account_type")
    @classmethod
    def valid(cls, v):
        if v not in ("company", "jobseeker"):
            raise ValueError("Must be 'company' or 'jobseeker'")
        return v


@app.patch("/api/auth/account-type")
async def set_account_type(
    req: AccountTypeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.account_type:
        raise HTTPException(status_code=400, detail="Account type is already set and cannot be changed.")
    if req.account_type == "company" and _is_personal_domain(current_user.email):
        raise HTTPException(
            status_code=400,
            detail=(
                "Company accounts require a work email address. "
                "Personal email providers are not allowed. "
                "Please update your email to a company domain first."
            ),
        )
    current_user.account_type = req.account_type
    db.commit()
    db.refresh(current_user)
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
    allowed, payload = _check_and_increment(db, current_user, "company_research")
    if not allowed:
        raise HTTPException(status_code=403, detail=payload)

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
    allowed, payload = _check_and_increment(db, current_user, "outreach_assistant")
    if not allowed:
        raise HTTPException(status_code=403, detail=payload)

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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    allowed, payload = _check_and_increment(db, current_user, "cv_optimiser")
    if not allowed:
        raise HTTPException(status_code=403, detail=payload)

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


# ── Verification constants ────────────────────────────────────────────────────

PERSONAL_EMAIL_DOMAINS = frozenset({
    'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.ng', 'hotmail.com',
    'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com', 'icloud.com',
    'me.com', 'aol.com', 'protonmail.com', 'proton.me', 'ymail.com',
    'googlemail.com', 'mail.com', 'zoho.com', 'gmx.com', 'gmx.net',
    'yandex.com', 'yandex.ru', 'inbox.com', 'fastmail.com', 'tutanota.com',
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com',
    'sharklasers.com', 'trashmail.com', 'dispostable.com',
})

SCAM_PHRASES = [
    'pay to apply', 'registration fee', 'training fee', 'upfront fee',
    'payment before', 'pay before interview', 'send money', 'western union',
    'moneygram', 'recharge card', 'airtime', 'pay for materials',
    'caution fee', 'security deposit', 'processing fee for job',
]

FLAG_SUSPEND_THRESHOLD = 3  # suspend after this many unique user flags


def _is_personal_domain(email: str) -> bool:
    domain = email.split('@')[-1].lower()
    return domain in PERSONAL_EMAIL_DOMAINS


def _quality_check_listing(title: str, description: str, company: str) -> tuple[bool, str]:
    """Returns (ok, error_message). Checks before payment is taken."""
    if len(description.strip()) < 100:
        return False, "Job description must be at least 100 characters. Give candidates enough detail."
    if len(company.strip()) < 2:
        return False, "Company name is required."
    text_lower = (title + ' ' + description).lower()
    for phrase in SCAM_PHRASES:
        if phrase in text_lower:
            return False, (
                f"Listing rejected: contains language that may indicate a pay-to-apply scam ('{phrase}'). "
                "techcori prohibits any listing that requires applicants to pay money."
            )
    return True, ""


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

    # Verify the transaction belongs to the authenticated user — prevents reference theft
    tx_email = tx.get("customer", {}).get("email", "").lower()
    if tx_email and tx_email != current_user.email.lower():
        raise HTTPException(status_code=400, detail="Payment reference does not belong to this account")

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
                # Validate amount before upgrading — must be exactly ₦2,000 (200,000 kobo)
                if amount_kobo >= 200000:
                    log_entry = _log_payment(db, user.id, amount_kobo, str(reference),
                                             "charge.success", "js_pro", "success",
                                             meta={"gateway_response": data.get("gateway_response")})
                    if log_entry:
                        _upgrade_user_to_pro(user, db, amount_kobo, str(reference))
                else:
                    log.warning("Webhook: js_pro charge below minimum: %s kobo ref=%s", amount_kobo, reference)
            elif payment_type == "job_listing":
                listing_id = data.get("metadata", {}).get("listing_id")
                if listing_id:
                    listing = db.query(models.JobListing).filter(models.JobListing.id == int(listing_id)).first()
                    if listing and listing.payment_status == "pending" and amount_kobo >= 200000:
                        listing.payment_status = "paid"
                        listing.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                        from services.listing_screener import screen_listing
                        screen = await screen_listing(
                            listing.title, listing.company, listing.location,
                            listing.description, listing.salary_range,
                        )
                        listing.ai_scam_score = screen["score"]
                        listing.ai_scam_flags = json.dumps(screen["flags"])
                        if screen["verdict"] == "reject":
                            listing.review_status = "rejected"
                            listing.is_active = False
                        elif screen["verdict"] == "review":
                            listing.review_status = "pending_review"
                            listing.is_active = False
                        else:
                            listing.review_status = "ok"
                            listing.is_active = True
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


# ── Usage tracking ───────────────────────────────────────────────────────────

USAGE_FEATURES  = {"cv_optimiser", "company_research", "outreach_assistant"}
FREE_LIMIT      = 5

FEATURE_LABELS = {
    "cv_optimiser":        "CV Optimiser",
    "company_research":    "Company Research",
    "outreach_assistant":  "Outreach Assistant",
}


def _get_or_create_usage(db: Session, user_id: int, feature: str, period: str) -> models.UsageTracking:
    record = (
        db.query(models.UsageTracking)
        .filter(
            models.UsageTracking.user_id     == user_id,
            models.UsageTracking.feature_name == feature,
            models.UsageTracking.period_month == period,
        )
        .first()
    )
    if not record:
        record = models.UsageTracking(
            user_id=user_id, feature_name=feature,
            period_month=period, usage_count=0,
        )
        db.add(record)
        db.flush()
    return record


def _check_and_increment(db: Session, user: models.User, feature: str) -> tuple[bool, dict]:
    """Returns (allowed, response_dict). Increments count if allowed."""
    period = datetime.now(timezone.utc).strftime("%Y-%m")
    record = _get_or_create_usage(db, user.id, feature, period)

    if user.is_pro():
        record.usage_count  += 1
        record.updated_at    = datetime.now(timezone.utc)
        db.commit()
        return True, {"allowed": True, "feature": feature, "used": record.usage_count, "limit": None}

    # DEMO MODE — gate disabled so reviewers can test freely.
    # Re-enable by removing the next two lines when going live.
    record.usage_count += 1
    record.updated_at   = datetime.now(timezone.utc)
    db.commit()
    return True, {"allowed": True, "feature": feature, "used": record.usage_count, "limit": FREE_LIMIT}

    if record.usage_count >= FREE_LIMIT:  # noqa: unreachable
        db.commit()
        return False, {
            "allowed":     False,
            "feature":     feature,
            "feature_label": FEATURE_LABELS.get(feature, feature),
            "used":        record.usage_count,
            "limit":       FREE_LIMIT,
            "upgrade_url": "/pricing",
        }

    record.usage_count  += 1
    record.updated_at    = datetime.now(timezone.utc)
    db.commit()
    return True, {
        "allowed":   True,
        "feature":   feature,
        "used":      record.usage_count,
        "limit":     FREE_LIMIT,
        "remaining": FREE_LIMIT - record.usage_count,
    }


@app.get("/api/usage/status")
async def usage_status(
    db:           Session       = Depends(get_db),
    current_user: models.User   = Depends(get_current_user),
):
    period = datetime.now(timezone.utc).strftime("%Y-%m")
    features = {}
    for feat in USAGE_FEATURES:
        record = _get_or_create_usage(db, current_user.id, feat, period)
        db.commit()
        if current_user.is_pro():
            features[feat] = {"used": record.usage_count, "limit": None, "remaining": None}
        else:
            features[feat] = {
                "used":      record.usage_count,
                "limit":     FREE_LIMIT,
                "remaining": max(0, FREE_LIMIT - record.usage_count),
            }
    return {
        "plan":    current_user.js_plan,
        "is_pro":  current_user.is_pro(),
        "period":  period,
        "features": features,
    }


class UsageIncrementRequest(BaseModel):
    feature: str


@app.post("/api/usage/increment")
async def usage_increment(
    req:          UsageIncrementRequest,
    db:           Session       = Depends(get_db),
    current_user: models.User   = Depends(get_current_user),
):
    if req.feature not in USAGE_FEATURES:
        raise HTTPException(status_code=400, detail=f"Unknown feature: {req.feature}")
    allowed, payload = _check_and_increment(db, current_user, req.feature)
    if not allowed:
        raise HTTPException(status_code=403, detail=payload)
    return payload


# ── Subscription (recurring billing) ─────────────────────────────────────────

def _get_or_create_subscription(db: Session, user: models.User) -> models.Subscription:
    sub = db.query(models.Subscription).filter(models.Subscription.user_id == user.id).first()
    if not sub:
        sub = models.Subscription(
            user_id=user.id,
            plan=user.js_plan,
            paystack_customer_code=user.paystack_customer_code,
        )
        db.add(sub)
        db.flush()
    return sub


@app.post("/api/subscription/create")
@limiter.limit("10/minute")
async def create_subscription(
    request:      Request,
    db:           Session       = Depends(get_db),
    current_user: models.User   = Depends(get_current_user),
):
    if current_user.is_pro():
        raise HTTPException(status_code=400, detail="You are already on the Pro plan")

    # DEMO MODE — payment gateway bypassed for reviewer testing.
    # Swap this block back to the Paystack flow when going live.
    sub = _get_or_create_subscription(db, current_user)
    now = datetime.now(timezone.utc)
    sub.plan                 = "pro"
    sub.status               = "active"
    sub.current_period_start = now
    sub.current_period_end   = now + timedelta(days=365)
    sub.updated_at           = now
    current_user.js_plan     = "pro"
    db.commit()
    return {"success": True, "plan": "pro"}


@app.post("/api/subscription/webhook")
async def subscription_webhook(request: Request, db: Session = Depends(get_db)):
    from services.paystack import verify_webhook_signature

    payload_bytes = await request.body()
    signature     = request.headers.get("x-paystack-signature", "")

    if not verify_webhook_signature(payload_bytes, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        event_data = json.loads(payload_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = event_data.get("event", "")
    data  = event_data.get("data", {})
    now   = datetime.now(timezone.utc)

    if event == "subscription.create":
        email             = data.get("customer", {}).get("email", "")
        subscription_code = data.get("subscription_code", "")
        email_token       = data.get("email_token", "")
        if email and subscription_code:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.js_plan                    = "pro"
                user.js_plan_expires_at         = now + timedelta(days=30)
                user.js_plan_grace_until        = now + timedelta(days=33)
                user.paystack_subscription_code = subscription_code
                sub = _get_or_create_subscription(db, user)
                sub.plan                        = "pro"
                sub.status                      = "active"
                sub.paystack_subscription_code  = subscription_code
                sub.paystack_email_token        = email_token
                sub.current_period_start        = now
                sub.current_period_end          = now + timedelta(days=30)
                sub.updated_at                  = now
                db.commit()

    elif event == "subscription.disable":
        email = data.get("customer", {}).get("email", "")
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.js_plan                    = "free"
                user.paystack_subscription_code = ""
                user.js_plan_expires_at         = None
                sub = db.query(models.Subscription).filter(models.Subscription.user_id == user.id).first()
                if sub:
                    sub.plan                        = "free"
                    sub.status                      = "cancelled"
                    sub.paystack_subscription_code  = ""
                    sub.updated_at                  = now
                db.commit()

    elif event == "charge.success":
        email        = data.get("customer", {}).get("email", "")
        amount_kobo  = data.get("amount", 0)
        reference    = data.get("reference", "")
        payment_type = data.get("metadata", {}).get("payment_type", "")
        if email and payment_type == "js_pro" and amount_kobo >= 200000:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                entry = _log_payment(db, user.id, amount_kobo, reference, "charge.success", "js_pro", "success")
                if entry:
                    user.js_plan             = "pro"
                    user.js_plan_expires_at  = now + timedelta(days=30)
                    user.js_plan_grace_until = now + timedelta(days=33)
                    sub = _get_or_create_subscription(db, user)
                    sub.plan                 = "pro"
                    sub.status               = "active"
                    sub.current_period_start = now
                    sub.current_period_end   = now + timedelta(days=30)
                    sub.updated_at           = now
                    db.commit()

    elif event == "invoice.payment_failed":
        email       = data.get("customer", {}).get("email", "")
        amount_kobo = data.get("amount", 0)
        reference   = data.get("reference") or data.get("id", "")
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user and user.js_plan == "pro":
                user.js_plan_grace_until = now + timedelta(days=3)
                sub = db.query(models.Subscription).filter(models.Subscription.user_id == user.id).first()
                if sub:
                    sub.status     = "past_due"
                    sub.updated_at = now
                db.commit()
                _log_payment(db, user.id, amount_kobo, str(reference or f"fail_{email}"),
                             "invoice.payment_failed", "js_pro", "failed")
                from services.email_sender import send_email
                await send_email(
                    email,
                    "techcori Pro payment failed",
                    f"Hi {user.name or 'there'},\n\n"
                    "We couldn't process your Pro subscription renewal.\n\n"
                    "Your account remains active for 3 more days. Please update your payment method "
                    "or contact support@techcori.com.\n\ntechcori team",
                )

    return {"status": "ok"}


@app.post("/api/subscription/cancel")
async def cancel_subscription_endpoint(
    db:           Session       = Depends(get_db),
    current_user: models.User   = Depends(get_current_user),
):
    if not current_user.is_pro():
        raise HTTPException(status_code=400, detail="No active Pro subscription to cancel")

    sub   = db.query(models.Subscription).filter(models.Subscription.user_id == current_user.id).first()
    code  = (sub.paystack_subscription_code if sub else "") or current_user.paystack_subscription_code
    token = sub.paystack_email_token if sub else ""

    if code:
        from services.paystack import cancel_subscription
        result = await cancel_subscription(code, token)
        if not result["ok"]:
            log.warning("Paystack cancel_subscription failed: %s", result.get("error"))

    if sub:
        sub.status     = "cancelled"
        sub.updated_at = datetime.now(timezone.utc)
    current_user.paystack_subscription_code = ""
    db.commit()

    period_end = (sub.current_period_end if sub and sub.current_period_end else current_user.js_plan_expires_at)
    return {
        "message":      "Subscription cancelled. You keep Pro access until the end of your billing period.",
        "access_until": period_end.isoformat() if period_end else None,
    }


@app.get("/api/subscription/status")
async def subscription_status(
    db:           Session       = Depends(get_db),
    current_user: models.User   = Depends(get_current_user),
):
    sub  = db.query(models.Subscription).filter(models.Subscription.user_id == current_user.id).first()
    logs = (
        db.query(models.PaymentLog)
        .filter(
            models.PaymentLog.user_id      == current_user.id,
            models.PaymentLog.payment_type == "js_pro",
            models.PaymentLog.status       == "success",
        )
        .order_by(models.PaymentLog.created_at.desc())
        .limit(20)
        .all()
    )
    renewal_date = None
    if sub and sub.current_period_end:
        renewal_date = sub.current_period_end.isoformat()
    elif current_user.js_plan_expires_at:
        renewal_date = current_user.js_plan_expires_at.isoformat()

    return {
        "plan":            current_user.js_plan,
        "is_pro":          current_user.is_pro(),
        "status":          sub.status if sub else ("active" if current_user.is_pro() else "free"),
        "renewal_date":    renewal_date,
        "period_start":    sub.current_period_start.isoformat() if sub and sub.current_period_start else None,
        "billing_history": [l.to_dict() for l in logs],
    }


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

    # Layer 1: Block personal email domains
    if _is_personal_domain(current_user.email):
        raise HTTPException(
            status_code=400,
            detail=(
                "Job listings must be posted from a company email address. "
                "Personal email providers (Gmail, Yahoo, Outlook, etc.) are not permitted. "
                "Please update your account email to a company domain in Settings."
            ),
        )

    # Layer 1: Quality gates (before taking payment)
    company_name = req.company or current_user.company_name
    ok, err = _quality_check_listing(req.title, req.description, company_name)
    if not ok:
        raise HTTPException(status_code=400, detail=err)

    listing = models.JobListing(
        user_id=current_user.id,
        title=req.title,
        company=company_name,
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

    # Reference must match what the server generated for this specific listing
    if req.reference != listing.payment_reference:
        raise HTTPException(status_code=400, detail="Reference does not match this listing")

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
    listing.expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    # Layer 1: AI pre-screening
    from services.listing_screener import screen_listing
    screen = await screen_listing(
        listing.title, listing.company, listing.location,
        listing.description, listing.salary_range,
    )
    listing.ai_scam_score = screen["score"]
    listing.ai_scam_flags = json.dumps(screen["flags"])

    if screen["verdict"] == "reject":
        listing.review_status = "rejected"
        listing.is_active     = False
        db.commit()
        from services.email_sender import send_email
        await send_email(
            current_user.email,
            "Job listing not approved — techcori",
            f"Hi {current_user.name or 'there'},\n\n"
            f"Your job listing \"{listing.title}\" was not approved by our AI screening system.\n\n"
            f"Reason: {', '.join(screen['flags']) or 'Listing did not meet our quality standards.'}\n\n"
            f"If you believe this is an error, contact support@techcori.com with your payment reference: {req.reference}\n\n"
            f"techcori team",
        )
        raise HTTPException(status_code=400, detail="Listing was not approved after AI review. A full refund will be processed within 3 business days. Check your email for details.")

    elif screen["verdict"] == "review":
        listing.review_status = "pending_review"
        listing.is_active     = False
    else:
        listing.review_status = "ok"
        listing.is_active     = True

    db.commit()
    db.refresh(listing)

    from services.email_sender import send_email
    if listing.is_active:
        await send_email(
            current_user.email,
            "Job listing is now live — techcori",
            f"Hi {current_user.name or 'there'},\n\nYour job listing \"{listing.title}\" passed our screening and is now live!\n\n"
            f"Amount paid: ₦2,000\nReference: {req.reference}\n"
            f"Listing expires: {listing.expires_at.strftime('%B %d, %Y')}\n\ntechcori team",
        )
    else:
        await send_email(
            current_user.email,
            "Job listing under review — techcori",
            f"Hi {current_user.name or 'there'},\n\nYour job listing \"{listing.title}\" is under human review.\n\n"
            f"Our team will review it within 24 hours. We'll email you when it goes live.\n\n"
            f"Reference: {req.reference}\n\ntechcori team",
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


# ── Email verification ────────────────────────────────────────────────────────

@app.post("/api/auth/send-email-verification")
@limiter.limit("5/minute")
async def send_email_verification(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    import secrets, hashlib
    from services.email_sender import send_email

    if current_user.email_verified:
        return {"message": "Email already verified."}

    raw_token  = secrets.token_hex(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    current_user.email_verification_token_hash = token_hash
    current_user.email_verification_expires    = expires_at
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    verify_link  = f"{frontend_url}/?verify_email={raw_token}"

    await send_email(
        current_user.email,
        "Verify your techcori company email",
        f"Hi {current_user.name or 'there'},\n\n"
        f"Click the link below to verify your email and get the Verified badge on your job listings:\n\n"
        f"{verify_link}\n\n"
        f"This link expires in 24 hours.\n\ntechcori team",
    )
    return {"message": "Verification email sent. Check your inbox."}


@app.get("/api/auth/verify-email")
@limiter.limit("20/minute")
async def verify_email(
    request: Request,
    token: str = Query(..., min_length=1, max_length=128),
    db: Session = Depends(get_db),
):
    import hashlib
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    user = db.query(models.User).filter(
        models.User.email_verification_token_hash == token_hash,
        models.User.email_verification_expires > now,
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="This verification link is invalid or has expired.")

    user.email_verified = True
    user.email_verification_token_hash = ""
    db.commit()
    return {"message": "Email verified successfully. Your listings now show the Verified badge."}


# ── Domain (DNS) verification ─────────────────────────────────────────────────

@app.post("/api/company/domain-verify/initiate")
@limiter.limit("10/minute")
async def initiate_domain_verification(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    import secrets

    if current_user.company_domain_verified:
        return {"message": "Domain already verified.", "verified": True}

    if _is_personal_domain(current_user.email):
        raise HTTPException(
            status_code=400,
            detail="Domain verification requires a company domain email. Personal email addresses (Gmail, Yahoo, etc.) cannot be domain-verified."
        )

    domain = current_user.email.split('@')[1].lower()
    if not current_user.company_domain_txt_record:
        txt_value = f"techcori-verify={secrets.token_hex(16)}"
        current_user.company_domain_txt_record = txt_value
        db.commit()

    return {
        "domain":     domain,
        "txt_record": current_user.company_domain_txt_record,
        "instructions": (
            f"Add the following TXT record to your domain's DNS settings, "
            f"then click 'Check verification'.\n\n"
            f"Type: TXT\nName/Host: @ (or your root domain)\nValue: {current_user.company_domain_txt_record}\n\n"
            f"DNS changes can take up to 48 hours to propagate."
        ),
        "verified": False,
    }


@app.post("/api/company/domain-verify/check")
@limiter.limit("10/minute")
async def check_domain_verification(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.company_domain_verified:
        return {"verified": True, "message": "Domain already verified."}

    if not current_user.company_domain_txt_record:
        raise HTTPException(status_code=400, detail="Initiate domain verification first.")

    domain = current_user.email.split('@')[1].lower()
    expected_txt = current_user.company_domain_txt_record

    # Check via Google DNS-over-HTTPS (no extra packages needed)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://dns.google/resolve",
                params={"name": domain, "type": "TXT"},
            )
        data = resp.json()
        answers = data.get("Answer", [])
        txt_values = [a.get("data", "").strip('"') for a in answers if a.get("type") == 16]
        if expected_txt in txt_values:
            current_user.company_domain_verified = True
            db.commit()
            return {"verified": True, "message": "Domain verified! Your listings now show the Domain Verified badge."}
        return {"verified": False, "message": f"TXT record not found yet for {domain}. DNS changes can take up to 48 hours."}
    except Exception as e:
        log.warning("DNS check failed for %s: %s", domain, e)
        return {"verified": False, "message": "Could not check DNS right now. Try again in a few minutes."}


# ── Company profile (CAC, LinkedIn) ──────────────────────────────────────────

class CompanyProfileUpdate(BaseModel):
    company_cac_number:   Optional[str] = None
    company_linkedin_url: Optional[str] = None

    @field_validator("company_cac_number")
    @classmethod
    def sanitize_cac(cls, v):
        if v:
            v = v.strip()[:50]
        return v

    @field_validator("company_linkedin_url")
    @classmethod
    def valid_linkedin(cls, v):
        if v:
            v = v.strip()[:500]
            if v and 'linkedin.com' not in v.lower():
                raise ValueError("Must be a LinkedIn URL")
        return v


@app.patch("/api/company/profile")
async def update_company_profile(
    req: CompanyProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    for field, value in req.model_dump(exclude_none=True).items():
        setattr(current_user, field, value or "")
    db.commit()
    db.refresh(current_user)
    return current_user.to_dict()


# ── Listing flagging (job seekers) ────────────────────────────────────────────

class FlagRequest(BaseModel):
    reason: str = ""

    @field_validator("reason")
    @classmethod
    def sanitize_reason(cls, v):
        return v.strip()[:200]


@app.post("/api/listings/{listing_id}/flag", status_code=200)
@limiter.limit("20/minute")
async def flag_listing(
    request: Request,
    listing_id: int,
    req: FlagRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    listing = db.query(models.JobListing).filter(
        models.JobListing.id == listing_id,
        models.JobListing.is_active == True,
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Each user can only flag each listing once
    existing = db.query(models.ListingFlag).filter(
        models.ListingFlag.listing_id  == listing_id,
        models.ListingFlag.reporter_id == current_user.id,
    ).first()
    if existing:
        return {"message": "You have already flagged this listing."}

    flag = models.ListingFlag(
        listing_id=listing_id,
        reporter_id=current_user.id,
        reason=req.reason,
    )
    db.add(flag)
    listing.flag_count += 1

    if listing.flag_count >= FLAG_SUSPEND_THRESHOLD:
        listing.is_suspended = True
        listing.is_active    = False
        log.warning("Listing %s suspended after %s flags.", listing_id, listing.flag_count)
        # Notify admin (best-effort)
        admin_email = os.getenv("ADMIN_EMAIL", "")
        if admin_email:
            from services.email_sender import send_email
            await send_email(
                admin_email,
                f"[techcori] Listing #{listing_id} suspended — {listing.flag_count} flags",
                f"Listing '{listing.title}' by company '{listing.company}' has been suspended "
                f"after receiving {listing.flag_count} flags from job seekers.\n\n"
                f"Last flag reason: {req.reason or 'No reason given'}\n\n"
                f"Review and take action in the admin panel.",
            )

    db.commit()
    return {"message": "Thank you for reporting this listing. Our team will review it.", "suspended": listing.is_suspended}


# ── Admin: flagged listings ───────────────────────────────────────────────────

@app.get("/api/admin/listings/flagged")
async def get_flagged_listings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    admin_email = os.getenv("ADMIN_EMAIL", "")
    if current_user.email != admin_email:
        raise HTTPException(status_code=403, detail="Admin only")

    listings = (
        db.query(models.JobListing)
        .filter(models.JobListing.flag_count > 0)
        .order_by(models.JobListing.flag_count.desc())
        .all()
    )
    return [l.to_dict(include_screening=True) for l in listings]


@app.post("/api/admin/listings/{listing_id}/restore")
async def restore_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    admin_email = os.getenv("ADMIN_EMAIL", "")
    if current_user.email != admin_email:
        raise HTTPException(status_code=403, detail="Admin only")

    listing = db.query(models.JobListing).filter(models.JobListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing.is_suspended = False
    listing.is_active    = True
    listing.flag_count   = 0
    db.commit()
    return {"message": "Listing restored."}


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
