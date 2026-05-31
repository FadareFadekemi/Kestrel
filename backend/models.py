import json
from datetime import datetime, timezone
from sqlalchemy import Integer, String, Boolean, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


def _now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id:           Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    email:        Mapped[str]      = mapped_column(String(254), nullable=False, unique=True, index=True)
    name:         Mapped[str]      = mapped_column(String(200), default="")
    hashed_pw:    Mapped[str]      = mapped_column(String(200), nullable=False)
    is_active:    Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:   Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # Sender profile — used to personalise outreach emails
    sender_title:        Mapped[str] = mapped_column(String(200), default="")
    company_name:        Mapped[str] = mapped_column(String(200), default="")
    product_description: Mapped[str] = mapped_column(Text, default="")
    value_proposition:   Mapped[str] = mapped_column(String(500), default="")
    website:             Mapped[str] = mapped_column(String(500), default="")

    # Account type — set at signup, permanent
    account_type: Mapped[str] = mapped_column(String(20), default="")  # 'company' | 'jobseeker' | '' (legacy)

    # Theme preference (persisted server-side)
    theme_pref: Mapped[str] = mapped_column(String(10), default="light")

    # Email + domain verification
    email_verified:                  Mapped[bool]     = mapped_column(Boolean, default=False)
    email_verification_token_hash:   Mapped[str]      = mapped_column(String(64), default="")
    email_verification_expires:      Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    company_domain_verified:         Mapped[bool]     = mapped_column(Boolean, default=False)
    company_domain_txt_record:       Mapped[str]      = mapped_column(String(80), default="")

    # Company identity (for trust + verification)
    company_cac_number:    Mapped[str] = mapped_column(String(50), default="")
    company_linkedin_url:  Mapped[str] = mapped_column(String(500), default="")

    # Job seeker subscription
    js_plan:                   Mapped[str]      = mapped_column(String(20), default="free")
    js_plan_expires_at:        Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    js_plan_grace_until:       Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    paystack_customer_code:    Mapped[str]      = mapped_column(String(100), default="")
    paystack_subscription_code:Mapped[str]      = mapped_column(String(100), default="")

    # Usage counters for free-tier limits (reset monthly)
    js_research_this_month:  Mapped[int] = mapped_column(Integer, default=0)
    js_outreach_this_month:  Mapped[int] = mapped_column(Integer, default=0)
    js_usage_month:          Mapped[str] = mapped_column(String(7), default="")  # YYYY-MM

    payment_logs: Mapped[list["PaymentLog"]] = relationship(
        "PaymentLog", back_populates="user", cascade="all, delete-orphan"
    )
    job_listings: Mapped[list["JobListing"]] = relationship(
        "JobListing", back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id":                    self.id,
            "email":                 self.email,
            "name":                  self.name,
            "isActive":              self.is_active,
            "createdAt":             self.created_at.isoformat() if self.created_at else "",
            "senderTitle":           self.sender_title,
            "companyName":           self.company_name,
            "productDescription":    self.product_description,
            "valueProposition":      self.value_proposition,
            "website":               self.website,
            "themePref":             self.theme_pref,
            "jsPlan":                self.js_plan,
            "jsPlanExpiresAt":       self.js_plan_expires_at.isoformat() if self.js_plan_expires_at else None,
            "accountType":           self.account_type,
            "emailVerified":         self.email_verified,
            "companyDomainVerified": self.company_domain_verified,
            "companyCacNumber":      self.company_cac_number,
            "companyLinkedinUrl":    self.company_linkedin_url,
        }

    def profile_complete(self) -> bool:
        return bool(self.company_name and self.product_description)

    def is_pro(self) -> bool:
        if self.js_plan != "pro":
            return False
        now = datetime.now(timezone.utc)
        if self.js_plan_expires_at and self.js_plan_expires_at < now:
            if self.js_plan_grace_until and self.js_plan_grace_until >= now:
                return True
            return False
        return True

    def reset_usage_if_needed(self):
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        if self.js_usage_month != current_month:
            self.js_research_this_month = 0
            self.js_outreach_this_month = 0
            self.js_usage_month = current_month


class Lead(Base):
    __tablename__ = "leads"

    id:                Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    company:           Mapped[str]  = mapped_column(String(200))
    website:           Mapped[str]  = mapped_column(String(500), default="")
    industry:          Mapped[str]  = mapped_column(String(200), default="")
    size:              Mapped[str]  = mapped_column(String(100), default="")
    location:          Mapped[str]  = mapped_column(String(200), default="")
    funding_stage:     Mapped[str]  = mapped_column(String(100), default="")
    contact_name:      Mapped[str]  = mapped_column(String(200), default="")
    contact_title:     Mapped[str]  = mapped_column(String(200), default="")
    contact_email:     Mapped[str]  = mapped_column(String(254), default="")

    # Scores
    score:             Mapped[int]  = mapped_column(Integer, default=0)
    tech_fit:          Mapped[int]  = mapped_column(Integer, default=0)
    size_fit:          Mapped[int]  = mapped_column(Integer, default=0)
    timing:            Mapped[int]  = mapped_column(Integer, default=0)
    growth_indicators: Mapped[int]  = mapped_column(Integer, default=0)
    score_reasoning:   Mapped[str]  = mapped_column(Text, default="")

    status:            Mapped[str]  = mapped_column(String(50), default="Not Contacted")
    date_added:        Mapped[str]  = mapped_column(String(20), default="")

    icp_fit:           Mapped[str]  = mapped_column(Text, default="")
    summary:           Mapped[str]  = mapped_column(Text, default="")
    recent_news:       Mapped[str]  = mapped_column(Text, default="")

    uses_competitor:   Mapped[bool] = mapped_column(Boolean, default=False)
    competitor_name:   Mapped[str]  = mapped_column(String(200), default="")

    tech_stack:        Mapped[str]  = mapped_column(Text, default="[]")
    competitors:       Mapped[str]  = mapped_column(Text, default="[]")
    pain_points:       Mapped[str]  = mapped_column(Text, default="[]")
    growth_signals:    Mapped[str]  = mapped_column(Text, default="[]")
    tags:              Mapped[str]  = mapped_column(Text, default="[]")
    sources:           Mapped[str]  = mapped_column(Text, default="[]")

    created_at:        Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    emails: Mapped[list["Email"]] = relationship(
        "Email", back_populates="lead", cascade="all, delete-orphan", order_by="Email.created_at"
    )

    def to_dict(self):
        return {
            "id":               self.id,
            "company":          self.company,
            "website":          self.website,
            "industry":         self.industry,
            "size":             self.size,
            "location":         self.location,
            "fundingStage":     self.funding_stage,
            "contactName":      self.contact_name,
            "contactTitle":     self.contact_title,
            "contactEmail":     self.contact_email,
            "score":            self.score,
            "techFit":          self.tech_fit,
            "sizeFit":          self.size_fit,
            "timing":           self.timing,
            "growthIndicators": self.growth_indicators,
            "scoreReasoning":   self.score_reasoning,
            "status":           self.status,
            "dateAdded":        self.date_added,
            "icpFit":           self.icp_fit,
            "summary":          self.summary,
            "recentNews":       self.recent_news,
            "usesCompetitor":   self.uses_competitor,
            "competitorName":   self.competitor_name,
            "techStack":        json.loads(self.tech_stack  or "[]"),
            "competitors":      json.loads(self.competitors or "[]"),
            "painPoints":       json.loads(self.pain_points or "[]"),
            "growthSignals":    json.loads(self.growth_signals or "[]"),
            "tags":             json.loads(self.tags    or "[]"),
            "sources":          json.loads(self.sources or "[]"),
            "emails":           [e.to_dict() for e in self.emails],
        }


class Email(Base):
    __tablename__ = "emails"

    id:         Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id:    Mapped[int]  = mapped_column(Integer, ForeignKey("leads.id", ondelete="CASCADE"))
    subject:    Mapped[str]  = mapped_column(String(500), default="")
    body:       Mapped[str]  = mapped_column(Text, default="")
    tone:       Mapped[str]  = mapped_column(String(50), default="")
    variant:    Mapped[str]  = mapped_column(String(5), default="A")
    sent_at:    Mapped[str]  = mapped_column(String(30), default="")
    opened:     Mapped[bool] = mapped_column(Boolean, default=False)
    clicked:    Mapped[bool] = mapped_column(Boolean, default=False)
    replied:    Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="emails")

    def to_dict(self):
        return {
            "id":        self.id,
            "leadId":    self.lead_id,
            "subject":   self.subject,
            "body":      self.body,
            "tone":      self.tone,
            "variant":   self.variant,
            "sentAt":    self.sent_at,
            "opened":    self.opened,
            "clicked":   self.clicked,
            "replied":   self.replied,
            "createdAt": self.created_at.isoformat() if self.created_at else "",
        }


class ListingFlag(Base):
    __tablename__ = "listing_flags"
    __table_args__ = (UniqueConstraint("listing_id", "reporter_id", name="uq_listing_flag"),)

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    listing_id:  Mapped[int]      = mapped_column(Integer, ForeignKey("job_listings.id", ondelete="CASCADE"), index=True)
    reporter_id: Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    reason:      Mapped[str]      = mapped_column(String(200), default="")
    created_at:  Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    listing: Mapped["JobListing"] = relationship("JobListing", back_populates="flags")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:    Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str]      = mapped_column(String(64), unique=True, index=True)  # SHA-256 hex
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used:       Mapped[bool]     = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PaymentLog(Base):
    __tablename__ = "payment_logs"

    id:           Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:      Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount:       Mapped[int]      = mapped_column(Integer, default=0)   # in kobo
    reference:    Mapped[str]      = mapped_column(String(100), unique=True, index=True)
    event_type:   Mapped[str]      = mapped_column(String(50), default="")
    payment_type: Mapped[str]      = mapped_column(String(50), default="")  # 'js_pro' | 'job_listing'
    status:       Mapped[str]      = mapped_column(String(20), default="pending")
    meta_json:    Mapped[str]      = mapped_column(Text, default="{}")
    created_at:   Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship("User", back_populates="payment_logs")

    def to_dict(self):
        return {
            "id":          self.id,
            "amount":      self.amount,
            "amountNgn":   self.amount // 100,
            "reference":   self.reference,
            "eventType":   self.event_type,
            "paymentType": self.payment_type,
            "status":      self.status,
            "createdAt":   self.created_at.isoformat() if self.created_at else "",
        }


class JobListing(Base):
    __tablename__ = "job_listings"

    id:                Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:           Mapped[int]      = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title:             Mapped[str]      = mapped_column(String(300))
    company:           Mapped[str]      = mapped_column(String(200), default="")
    location:          Mapped[str]      = mapped_column(String(200), default="")
    description:       Mapped[str]      = mapped_column(Text, default="")
    salary_range:      Mapped[str]      = mapped_column(String(200), default="")
    job_type:          Mapped[str]      = mapped_column(String(50), default="Full-time")
    payment_reference: Mapped[str]      = mapped_column(String(100), default="", index=True)
    payment_status:    Mapped[str]      = mapped_column(String(20), default="pending")
    is_active:         Mapped[bool]     = mapped_column(Boolean, default=False)
    expires_at:        Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at:        Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # AI screening
    ai_scam_score:  Mapped[int] = mapped_column(Integer, default=0)
    ai_scam_flags:  Mapped[str] = mapped_column(Text, default="[]")
    review_status:  Mapped[str] = mapped_column(String(20), default="ok")  # ok | pending_review | rejected
    flag_count:     Mapped[int] = mapped_column(Integer, default=0)
    is_suspended:   Mapped[bool] = mapped_column(Boolean, default=False)

    user:  Mapped["User"]           = relationship("User", back_populates="job_listings")
    flags: Mapped[list["ListingFlag"]] = relationship("ListingFlag", back_populates="listing", cascade="all, delete-orphan")

    def to_dict(self, include_screening=False):
        d = {
            "id":               self.id,
            "userId":           self.user_id,
            "title":            self.title,
            "company":          self.company,
            "location":         self.location,
            "description":      self.description,
            "salaryRange":      self.salary_range,
            "jobType":          self.job_type,
            "paymentStatus":    self.payment_status,
            "isActive":         self.is_active,
            "reviewStatus":     self.review_status,
            "isSuspended":      self.is_suspended,
            "flagCount":        self.flag_count,
            "aiScamScore":      self.ai_scam_score,
            "expiresAt":        self.expires_at.isoformat() if self.expires_at else None,
            "createdAt":        self.created_at.isoformat() if self.created_at else "",
        }
        if include_screening:
            d["aiScamFlags"] = json.loads(self.ai_scam_flags or "[]")
        return d
