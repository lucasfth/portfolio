"""Publish the validated public Radar edition through the portfolio endpoint."""
import json
import os
import urllib.error
import urllib.request

from radar_publication import public_edition


def publish_edition(edition: dict) -> None:
    """POST one canonical public edition; private output never leaves the host."""
    public = public_edition(edition["generated"], edition["count_scanned"], edition["items"])
    if public != edition:
        raise ValueError("public edition is not canonical")
    endpoint = os.environ.get("RADAR_PUBLISH_URL", "").rstrip("/")
    token = os.environ.get("RADAR_PUBLISH_TOKEN", "")
    if not endpoint or not token:
        raise RuntimeError("Radar publisher endpoint is not configured")
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(public).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            if response.status != 204:
                raise RuntimeError(f"unexpected Radar publisher status {response.status}")
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Radar publication failed with HTTP {exc.code}") from None


def publish_selected_edition(edition: dict) -> bool:
    """Publish only when Supabase-backed publication is explicitly selected."""
    source = os.environ.get("RADAR_PUBLICATION_SOURCE", "github")
    if source == "github":
        return False
    if source != "supabase":
        raise RuntimeError(f"Unsupported Radar publication source: {source}")
    if not os.environ.get("RADAR_PUBLISH_URL") or not os.environ.get("RADAR_PUBLISH_TOKEN"):
        raise RuntimeError("Supabase Radar selected but publisher endpoint credentials are missing")
    publish_edition(edition)
    return True
