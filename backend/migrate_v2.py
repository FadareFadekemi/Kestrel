"""
Migration v2: add subscription, payment, and listing columns/tables.
Run once after deploying the new models:

    cd backend
    python migrate_v2.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import engine
from sqlalchemy import text

SQLITE_COLUMNS = [
    ("users", "theme_pref",                    "TEXT NOT NULL DEFAULT 'light'"),
    ("users", "js_plan",                       "TEXT NOT NULL DEFAULT 'free'"),
    ("users", "js_plan_expires_at",            "DATETIME"),
    ("users", "js_plan_grace_until",           "DATETIME"),
    ("users", "paystack_customer_code",        "TEXT NOT NULL DEFAULT ''"),
    ("users", "paystack_subscription_code",    "TEXT NOT NULL DEFAULT ''"),
    ("users", "js_research_this_month",        "INTEGER NOT NULL DEFAULT 0"),
    ("users", "js_outreach_this_month",        "INTEGER NOT NULL DEFAULT 0"),
    ("users", "js_usage_month",                "TEXT NOT NULL DEFAULT ''"),
]

POSTGRES_COLUMNS = [
    ("users", "theme_pref",                    "VARCHAR(10) NOT NULL DEFAULT 'light'"),
    ("users", "js_plan",                       "VARCHAR(20) NOT NULL DEFAULT 'free'"),
    ("users", "js_plan_expires_at",            "TIMESTAMP WITH TIME ZONE"),
    ("users", "js_plan_grace_until",           "TIMESTAMP WITH TIME ZONE"),
    ("users", "paystack_customer_code",        "VARCHAR(100) NOT NULL DEFAULT ''"),
    ("users", "paystack_subscription_code",    "VARCHAR(100) NOT NULL DEFAULT ''"),
    ("users", "js_research_this_month",        "INTEGER NOT NULL DEFAULT 0"),
    ("users", "js_outreach_this_month",        "INTEGER NOT NULL DEFAULT 0"),
    ("users", "js_usage_month",                "VARCHAR(7) NOT NULL DEFAULT ''"),
]

CREATE_PAYMENT_LOGS = """
CREATE TABLE IF NOT EXISTS payment_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount        INTEGER NOT NULL DEFAULT 0,
    reference     TEXT    NOT NULL UNIQUE,
    event_type    TEXT    NOT NULL DEFAULT '',
    payment_type  TEXT    NOT NULL DEFAULT '',
    status        TEXT    NOT NULL DEFAULT 'pending',
    meta_json     TEXT    NOT NULL DEFAULT '{}',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_payment_logs_user_id  ON payment_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_payment_logs_reference ON payment_logs(reference);
"""

CREATE_JOB_LISTINGS = """
CREATE TABLE IF NOT EXISTS job_listings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             TEXT    NOT NULL,
    company           TEXT    NOT NULL DEFAULT '',
    location          TEXT    NOT NULL DEFAULT '',
    description       TEXT    NOT NULL DEFAULT '',
    salary_range      TEXT    NOT NULL DEFAULT '',
    job_type          TEXT    NOT NULL DEFAULT 'Full-time',
    payment_reference TEXT    NOT NULL DEFAULT '',
    payment_status    TEXT    NOT NULL DEFAULT 'pending',
    is_active         INTEGER NOT NULL DEFAULT 0,
    expires_at        DATETIME,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_job_listings_user_id           ON job_listings(user_id);
CREATE INDEX IF NOT EXISTS ix_job_listings_payment_reference ON job_listings(payment_reference);
"""


def is_sqlite():
    url = str(engine.url)
    return "sqlite" in url


def column_exists(conn, table, column):
    if is_sqlite():
        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
        return any(r[1] == column for r in rows)
    else:
        r = conn.execute(text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name=:t AND column_name=:c"
        ), {"t": table, "c": column}).fetchone()
        return r is not None


def run():
    cols = SQLITE_COLUMNS if is_sqlite() else POSTGRES_COLUMNS
    with engine.connect() as conn:
        # Add new user columns
        for table, col, col_def in cols:
            if not column_exists(conn, table, col):
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
                print(f"  + {table}.{col}")
            else:
                print(f"  ✓ {table}.{col} already exists")

        # Create new tables
        for stmt in CREATE_PAYMENT_LOGS.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                conn.execute(text(stmt + ";"))

        for stmt in CREATE_JOB_LISTINGS.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                conn.execute(text(stmt + ";"))

        conn.commit()
        print("Migration v2 complete.")


if __name__ == "__main__":
    run()
