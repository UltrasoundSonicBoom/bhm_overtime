"""Backend security helpers."""
import hmac
import os

from fastapi import Header, HTTPException, status


def _configured_admin_token() -> str | None:
    token = os.environ.get("SNUHMATE_ADMIN_TOKEN", "").strip()
    return token or None


def require_admin_token(authorization: str | None = Header(default=None)) -> None:
    expected = _configured_admin_token()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="admin auth not configured",
        )

    prefix = "Bearer "
    if not authorization or not authorization.startswith(prefix):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="admin token required",
        )

    provided = authorization[len(prefix) :].strip()
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="admin token invalid",
        )
