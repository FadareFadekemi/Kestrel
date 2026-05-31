import os
import hmac
import hashlib
import httpx

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY", "")
BASE_URL = "https://api.paystack.co"

_HEADERS = lambda: {
    "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
    "Content-Type": "application/json",
}


async def initialize_transaction(
    email: str,
    amount_ngn: int,
    reference: str,
    callback_url: str = "",
    plan: str = "",
    metadata: dict | None = None,
) -> dict:
    """Initialize a Paystack transaction. amount_ngn is Naira; converted to kobo internally."""
    payload = {
        "email": email,
        "amount": amount_ngn * 100,  # kobo
        "reference": reference,
    }
    if callback_url:
        payload["callback_url"] = callback_url
    if plan:
        payload["plan"] = plan
    if metadata:
        payload["metadata"] = metadata

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{BASE_URL}/transaction/initialize",
                headers=_HEADERS(),
                json=payload,
            )
        data = r.json()
        if r.status_code == 200 and data.get("status"):
            return {"ok": True, "data": data["data"]}
        return {"ok": False, "error": data.get("message", "Failed to initialize")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def verify_transaction(reference: str) -> dict:
    """Verify a Paystack transaction server-side."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{BASE_URL}/transaction/verify/{reference}",
                headers=_HEADERS(),
            )
        data = r.json()
        if r.status_code == 200 and data.get("status"):
            return {"ok": True, "data": data["data"]}
        return {"ok": False, "error": data.get("message", "Verification failed")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def cancel_subscription(subscription_code: str) -> dict:
    """Disable a Paystack subscription."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{BASE_URL}/subscription/disable",
                headers=_HEADERS(),
                json={"code": subscription_code, "token": ""},
            )
        data = r.json()
        if r.status_code == 200 and data.get("status"):
            return {"ok": True}
        return {"ok": False, "error": data.get("message", "Cancellation failed")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def create_customer(email: str, name: str = "") -> dict:
    """Create or fetch a Paystack customer."""
    payload: dict = {"email": email}
    if name:
        parts = name.strip().split()
        payload["first_name"] = parts[0]
        if len(parts) > 1:
            payload["last_name"] = " ".join(parts[1:])
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{BASE_URL}/customer",
                headers=_HEADERS(),
                json=payload,
            )
        data = r.json()
        if r.status_code in (200, 201) and data.get("status"):
            return {"ok": True, "data": data["data"]}
        return {"ok": False, "error": data.get("message", "Customer creation failed")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def verify_webhook_signature(payload_bytes: bytes, signature: str) -> bool:
    """Verify Paystack webhook HMAC-SHA512 signature."""
    if not PAYSTACK_SECRET_KEY:
        return False
    computed = hmac.new(
        PAYSTACK_SECRET_KEY.encode("utf-8"),
        payload_bytes,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(computed, signature)
