"""Public Radar edition validation and atomic local-generation publication."""
from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

PUBLIC_TAGS = frozenset({
    "local-llm", "agents", "models", "devtools", "security", "selfhosting",
    "danish-tech", "web", "research", "other",
})
ITEM_KEYS = ("title", "url", "source", "summary", "tag", "score", "kind", "ts")
LIMITS = {"title": 200, "url": 2048, "source": 200, "summary": 600, "kind": 40}


def public_item(result: dict) -> dict | None:
    """Project a rank result onto the exact public schema; discard unsafe URLs."""
    url = result.get("url")
    if not isinstance(url, str) or len(url) > LIMITS["url"] or not re.fullmatch(r"https?://[^\s]+", url):
        return None
    item = {
        "title": str(result.get("title", ""))[:LIMITS["title"]],
        "url": url,
        "source": str(result.get("source", ""))[:LIMITS["source"]],
        "summary": str(result.get("summary", ""))[:LIMITS["summary"]],
        "tag": result.get("tag") if isinstance(result.get("tag"), str) and result.get("tag") in PUBLIC_TAGS else "other",
        "score": result.get("score"),
        "kind": str(result.get("kind", ""))[:LIMITS["kind"]],
        "ts": result.get("ts"),
    }
    if not item["title"] or not item["source"] or not item["summary"] or not item["kind"]:
        return None
    if isinstance(item["score"], bool) or not isinstance(item["score"], (int, float)) or not 0 <= item["score"] <= 10:
        return None
    if isinstance(item["ts"], bool) or not isinstance(item["ts"], (int, float)) or item["ts"] < 0:
        return None
    return item


def public_edition(generated: str, count_scanned: int, ranked: list[dict]) -> dict:
    """Build the strict public-only JSON document without any internal fields."""
    try:
        stamp = datetime.fromisoformat(generated.replace("Z", "+00:00"))
    except (TypeError, ValueError) as exc:
        raise ValueError("generated must be an ISO timestamp") from exc
    if stamp.tzinfo is None or stamp.utcoffset() is None:
        raise ValueError("generated must include a timezone")
    if isinstance(count_scanned, bool) or not isinstance(count_scanned, int) or count_scanned < 0:
        raise ValueError("count_scanned must be a non-negative integer")
    items = [item for row in ranked if (item := public_item(row)) is not None]
    return {"generated": generated, "count_scanned": count_scanned, "items": items[:40]}


def publish_generation(root: Path, public: dict, private: dict, before_activate=None) -> Path:
    """Write a complete private generation, then atomically replace current."""
    root = Path(root)
    generations = root / "generations"
    generations.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(root, 0o700)
    os.chmod(generations, 0o700)
    stamp = public["generated"]
    datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    if private.get("generated") != stamp or not isinstance(private.get("items"), list):
        raise ValueError("public/private generation mismatch")
    name = re.sub(r"[^0-9TZ+_.-]", "_", stamp)
    final = generations / name
    if final.exists():
        raise FileExistsError(f"generation already exists: {name}")
    temp = Path(tempfile.mkdtemp(prefix=".pending-", dir=generations))
    final_created = False
    try:
        for filename, document in (("public.json", public), ("private.json", private)):
            path = temp / filename
            path.write_text(json.dumps(document, ensure_ascii=False, indent=1) + "\n")
            os.chmod(path, 0o600)
        os.rename(temp, final)
        final_created = True
        if before_activate is not None:
            before_activate(public)
        link_tmp = root / f".current-{os.getpid()}"
        try:
            link_tmp.symlink_to(Path("generations") / name)
            os.replace(link_tmp, root / "current")
        finally:
            link_tmp.unlink(missing_ok=True)
        return final
    except BaseException:
        if temp.exists():
            for path in temp.iterdir():
                path.unlink()
            temp.rmdir()
        if final_created:
            for path in final.iterdir():
                path.unlink()
            final.rmdir()
        raise


def run_publication(public: dict, private: dict, output_root: Path, before_activate=None) -> Path:
    """Publish selected remote edition before atomically activating local generation."""
    if before_activate is None:
        from publish_supabase import publish_selected_edition
        before_activate = publish_selected_edition
    return publish_generation(output_root, public, private, before_activate=before_activate)


def write_legacy_outputs(output_dir: Path, public: dict, private: dict) -> None:
    """Atomically preserve the old out/ consumer files without exposing private JSON."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(output_dir, 0o700)
    for filename, document in (("public.json", public), ("private.json", private)):
        fd, temporary = tempfile.mkstemp(prefix=f".{filename}.", dir=output_dir)
        try:
            with os.fdopen(fd, "w") as stream:
                stream.write(json.dumps(document, ensure_ascii=False, indent=1) + "\n")
                stream.flush()
                os.fsync(stream.fileno())
            os.chmod(temporary, 0o600)
            os.replace(temporary, output_dir / filename)
        except BaseException:
            Path(temporary).unlink(missing_ok=True)
            raise
