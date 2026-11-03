"""Portable regression for the Supabase publisher's observed authorization failure."""
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

from radar_publication import public_edition, run_publication


class PublisherAuthTests(unittest.TestCase):
    def test_unauthorized_write_preserves_last_good_generation_without_retry_or_leak(self):
        old = public_edition("2026-10-29T16:04:00Z", 1, [])
        new = public_edition("2026-11-03T04:11:00Z", 1, [])
        private = {"generated": new["generated"], "items": [{"private": "never-upload"}]}
        endpoint = "https://example.test/api/radar/publish"
        token = "test-token-not-for-output"
        calls = []

        def unauthorized(request, **kwargs):
            calls.append(request)
            self.assertEqual(request.full_url, endpoint)
            self.assertEqual(request.method, "POST")
            self.assertEqual(request.get_header("Authorization"), f"Bearer {token}")
            self.assertEqual(json.loads(request.data), new)
            raise HTTPError(endpoint, 401, "Unauthorized", {}, io.BytesIO(b"sensitive diagnostic"))

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "output"
            run_publication(old, {"generated": old["generated"], "items": []}, root, before_activate=lambda _: None)
            previous = (root / "current").resolve()
            with patch.dict("os.environ", {"RADAR_PUBLICATION_SOURCE": "supabase", "RADAR_PUBLISH_URL": endpoint, "RADAR_PUBLISH_TOKEN": token}, clear=True), patch("publish_supabase.urllib.request.urlopen", side_effect=unauthorized):
                with self.assertRaisesRegex(RuntimeError, "^Radar publication failed with HTTP 401$"):
                    run_publication(new, private, root)
            self.assertEqual(len(calls), 1)
            self.assertEqual((root / "current").resolve(), previous)
            self.assertEqual(json.loads((root / "current/public.json").read_text()), old)
            self.assertEqual([p.resolve() for p in (root / "generations").iterdir()], [previous])


if __name__ == "__main__":
    unittest.main()
