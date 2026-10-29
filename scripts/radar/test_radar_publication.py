import importlib.util
import io
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

from radar_publication import PUBLIC_TAGS, public_edition, public_item, publish_generation, run_publication, write_legacy_outputs
from publish_supabase import publish_edition, publish_selected_edition

CRON_NATIVE = Path("/Users/gimle/loki-data/live/hermes/scripts/cron_native.py")
spec = importlib.util.spec_from_file_location("cron_native", CRON_NATIVE)
cron_native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cron_native)


class PublisherModeTests(unittest.TestCase):
    def test_run_publication_github_default_keeps_github_path_and_skips_supabase(self):
        edition = {"generated": "2026-10-28T07:11:24+00:00", "count_scanned": 0, "items": []}
        private = {"generated": edition["generated"], "items": []}
        with tempfile.TemporaryDirectory() as tmp, patch.dict("os.environ", {
            "RADAR_PUBLISH_URL": "https://example.test/api/radar/publish",
            "RADAR_PUBLISH_TOKEN": "unit-test-publisher-token-00000000",
        }, clear=True), patch("publish_supabase.publish_edition") as post:
            run_publication(edition, private, Path(tmp) / "output")
            post.assert_not_called()
            self.assertTrue((Path(tmp) / "output/current").is_symlink())
        run_sh = Path(__file__).with_name("run.sh").read_text()
        self.assertIn('legacy_publish="${RADAR_LEGACY_GITHUB_PUBLISH:-1}"', run_sh)
        self.assertIn('if [[ "$source" == "github" ]]; then', run_sh)
        self.assertIn("git push -q", run_sh)

    def test_publisher_env_loads_only_url_and_token(self):
        run_sh = Path(__file__).with_name("run.sh").read_text()
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            (home / "loki-radar").mkdir()
            config = home / ".config/loki-radar"
            config.mkdir(parents=True)
            env_file = config / "radar-publisher.env"
            env_file.write_text(
                "RADAR_PUBLISH_URL=https://lucashanson.dk/api/radar/publish\n"
                "RADAR_PUBLISH_TOKEN=" + "t" * 64 + "\n"
            )
            stub_bin = home / "bin"
            stub_bin.mkdir()
            uv = stub_bin / "uv"
            uv.write_text('#!/bin/sh\nprintf "uv-stub\\n"\n')
            uv.chmod(0o755)
            env = {
                **os.environ, "HOME": str(home), "PATH": f"{stub_bin}:/usr/bin:/bin",
                "RADAR_PUBLICATION_SOURCE": "supabase", "RADAR_LEGACY_GITHUB_PUBLISH": "0",
            }
            result = subprocess.run(["bash", "-c", run_sh], env=env, text=True, capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("uv-stub", result.stdout)
            self.assertNotIn("test-publisher-token", result.stdout + result.stderr)


    def test_publisher_env_rejects_duplicate_or_malformed_entries(self):
        run_sh = Path(__file__).with_name("run.sh").read_text()
        token = "t" * 64
        bad_files = (
            ("duplicate url", "Duplicate Radar publisher env key", "\n".join(["RADAR_PUBLISH_URL=https://lucashanson.dk/api/radar/publish", "RADAR_PUBLISH_URL=https://evil.test", f"RADAR_PUBLISH_TOKEN={token}"]) + "\n"),
            ("duplicate token", "Duplicate Radar publisher env key", "\n".join(["RADAR_PUBLISH_URL=https://lucashanson.dk/api/radar/publish", f"RADAR_PUBLISH_TOKEN={token}", f"RADAR_PUBLISH_TOKEN={'x' * 64}"]) + "\n"),
            ("empty url", "Invalid Radar publisher env file", "\n".join(["RADAR_PUBLISH_URL=", f"RADAR_PUBLISH_TOKEN={token}"]) + "\n"),
            ("short token", "Invalid Radar publisher token", "\n".join(["RADAR_PUBLISH_URL=https://lucashanson.dk/api/radar/publish", "RADAR_PUBLISH_TOKEN=short"]) + "\n"),
            ("quoted url", "Invalid Radar publisher URL", "\n".join(['RADAR_PUBLISH_URL=\"https://example.test/api/radar/publish\"', f"RADAR_PUBLISH_TOKEN={token}"]) + "\n"),
            ("unexpected key", "Invalid Radar publisher env file", "\n".join(["UNEXPECTED=value", "RADAR_PUBLISH_URL=https://lucashanson.dk/api/radar/publish", f"RADAR_PUBLISH_TOKEN={token}"]) + "\n"),
        )
        for label, message, contents in bad_files:
            with self.subTest(case=label), tempfile.TemporaryDirectory() as tmp:
                home = Path(tmp)
                (home / "loki-radar").mkdir()
                config = home / ".config/loki-radar"
                config.mkdir(parents=True)
                (config / "radar-publisher.env").write_text(contents)
                stub_bin = home / "bin"
                stub_bin.mkdir()
                uv = stub_bin / "uv"
                uv.write_text('#!/bin/sh\necho should-not-run >&2\nexit 8\n')
                uv.chmod(0o755)
                env = {
                    **os.environ, "HOME": str(home), "PATH": f"{stub_bin}:/usr/bin:/bin",
                    "RADAR_PUBLICATION_SOURCE": "supabase", "RADAR_LEGACY_GITHUB_PUBLISH": "0",
                }
                result = subprocess.run(["bash", "-c", run_sh], env=env, text=True, capture_output=True, timeout=10)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(message, result.stderr)
                self.assertNotIn("should-not-run", result.stderr)
    def test_publisher_env_missing_file_keeps_supabase_guard(self):
        run_sh = Path(__file__).with_name("run.sh").read_text()
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            (home / "loki-radar").mkdir()
            stub_bin = home / "bin"
            stub_bin.mkdir()
            uv = stub_bin / "uv"
            uv.write_text('#!/bin/sh\necho should-not-run >&2\nexit 8\n')
            uv.chmod(0o755)
            env = {
                **os.environ, "HOME": str(home), "PATH": f"{stub_bin}:/usr/bin:/bin",
                "RADAR_PUBLICATION_SOURCE": "supabase", "RADAR_LEGACY_GITHUB_PUBLISH": "0",
            }
            result = subprocess.run(["bash", "-c", run_sh], env=env, text=True, capture_output=True, timeout=10)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Radar publisher env file is missing", result.stderr)
            self.assertNotIn("should-not-run", result.stderr)

    def test_supabase_missing_env_file_rejects_valid_inherited_credentials(self):
        run_sh = Path(__file__).with_name("run.sh").read_text()
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            (home / "loki-radar").mkdir()
            stub_bin = home / "bin"
            stub_bin.mkdir()
            uv = stub_bin / "uv"
            uv.write_text('#!/bin/sh\necho should-not-run >&2\nexit 0\n')
            uv.chmod(0o755)
            token = "t" * 64
            env = {
                "HOME": str(home), "PATH": f"{stub_bin}:/usr/bin:/bin",
                "RADAR_PUBLICATION_SOURCE": "supabase", "RADAR_LEGACY_GITHUB_PUBLISH": "0",
                "RADAR_PUBLISH_URL": "https://lucashanson.dk/api/radar/publish",
                "RADAR_PUBLISH_TOKEN": token,
            }
            result = subprocess.run(["bash", "-c", run_sh], env=env, text=True, capture_output=True, timeout=10)
            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn("should-not-run", result.stdout + result.stderr)
            self.assertNotIn(token, result.stdout + result.stderr)

    def test_default_github_without_publisher_credentials_reaches_publish_path(self):
        run_sh = Path(__file__).with_name("run.sh").read_text()
        for inherited in (False, True):
            with self.subTest(inherited=inherited), tempfile.TemporaryDirectory() as tmp:
                home = Path(tmp)
                radar = home / "loki-radar"
                (radar / "repo/.git").mkdir(parents=True)
                (radar / "out").mkdir()
                (radar / "out/public.json").write_text('{}')
                (radar / "README.md").write_text('Radar')
                config = home / ".config/loki-radar"
                config.mkdir(parents=True)
                (config / "gh_token").write_text('github-test-token')
                stub_bin = home / "bin"
                stub_bin.mkdir()
                uv = stub_bin / "uv"
                uv.write_text(
                    '#!/bin/sh\n'
                    '[ "${RADAR_PUBLICATION_SOURCE:-github}" = github ] || exit 8\n'
                    '[ "${RADAR_PUBLISH_URL+x}" != x ] || exit 9\n'
                    '[ "${RADAR_PUBLISH_TOKEN+x}" != x ] || exit 10\n'
                    '[ "$GH_TOKEN" = github-test-token ] || exit 11\n'
                    '[ "$*" = "run -q radar.py" ] || exit 12\n'
                    'echo uv-github\n'
                )
                uv.chmod(0o755)
                git = stub_bin / "git"
                git.write_text('#!/bin/sh\n[ "$1" != push ] || echo github-publish\nexit 0\n')
                git.chmod(0o755)
                env = {"HOME": str(home), "PATH": f"{stub_bin}:/usr/bin:/bin"}
                if inherited:
                    env.update(RADAR_PUBLISH_URL="https://evil.test", RADAR_PUBLISH_TOKEN="t" * 64)
                    (config / "radar-publisher.env").write_text('malformed-must-not-load\n')
                result = subprocess.run(["bash", "-c", run_sh], env=env, text=True, capture_output=True, timeout=10)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("uv-github", result.stdout)
                self.assertIn("github-publish", result.stdout)
                self.assertNotIn("t" * 64, result.stdout + result.stderr)

    def test_inherited_wrong_url_rejected_without_env_file(self):
        run_sh = Path(__file__).with_name("run.sh").read_text()
        for has_file in (False, True):
            with self.subTest(has_file=has_file), tempfile.TemporaryDirectory() as tmp:
                home = Path(tmp)
                (home / "loki-radar").mkdir()
                if has_file:
                    config = home / ".config/loki-radar"
                    config.mkdir(parents=True)
                    (config / "radar-publisher.env").write_text(
                        "RADAR_PUBLISH_URL=https://lucashanson.dk/api/radar/publish\n"
                        "RADAR_PUBLISH_TOKEN=" + "t" * 64 + "\n"
                    )
                stub_bin = home / "bin"
                stub_bin.mkdir()
                uv = stub_bin / "uv"
                uv.write_text('#!/bin/sh\necho should-not-run >&2\nexit 8\n')
                uv.chmod(0o755)
                env = {
                    "HOME": str(home), "PATH": f"{stub_bin}:/usr/bin:/bin",
                    "RADAR_PUBLICATION_SOURCE": "supabase", "RADAR_LEGACY_GITHUB_PUBLISH": "0",
                    "RADAR_PUBLISH_URL": "https://evil.test", "RADAR_PUBLISH_TOKEN": "t" * 64,
                }
                result = subprocess.run(["bash", "-c", run_sh], env=env, text=True, capture_output=True, timeout=10)
                self.assertNotEqual(result.returncode, 0)
                message = "Invalid Radar publisher URL" if has_file else "Radar publisher env file is missing"
                self.assertIn(message, result.stderr)
                self.assertNotIn("should-not-run", result.stderr)
    def test_github_mode_reads_token_before_uv(self):
        run_sh = Path(__file__).with_name("run.sh").read_text()
        self.assertIn('export GH_TOKEN="$(cat "$HOME/.config/loki-radar/gh_token")"', run_sh)
        self.assertLess(run_sh.index('export GH_TOKEN='), run_sh.index('uv run -q radar.py'))
        self.assertEqual(run_sh.count('cat "$HOME/.config/loki-radar/gh_token"'), 1)
    def test_supabase_mode_passes_without_github_token_file(self):
        run_sh = Path(__file__).with_name("run.sh").read_text()
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            (home / "loki-radar").mkdir()
            config = home / ".config/loki-radar"
            config.mkdir(parents=True)
            (config / "radar-publisher.env").write_text(
                "RADAR_PUBLISH_URL=https://lucashanson.dk/api/radar/publish\n"
                "RADAR_PUBLISH_TOKEN=" + "t" * 64 + "\n"
            )
            stub_bin = home / "bin"
            stub_bin.mkdir()
            uv = stub_bin / "uv"
            uv.write_text('#!/bin/sh\nprintf "uv-stub\\n"\n')
            uv.chmod(0o755)
            env = {
                **os.environ, "HOME": str(home), "PATH": f"{stub_bin}:/usr/bin:/bin",
                "RADAR_PUBLICATION_SOURCE": "supabase", "RADAR_LEGACY_GITHUB_PUBLISH": "0",
                "RADAR_PUBLISH_URL": "https://lucashanson.dk/api/radar/publish",
                "RADAR_PUBLISH_TOKEN": "t" * 64,
            }
            result = subprocess.run(["bash", "-c", run_sh], env=env, text=True, capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("uv-stub", result.stdout)
            self.assertFalse((home / ".config/loki-radar/gh_token").exists())

    def test_invalid_mode_fails_before_uv(self):
        run_sh = Path(__file__).with_name("run.sh").read_text()
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            (home / "loki-radar").mkdir()
            stub_bin = home / "bin"
            stub_bin.mkdir()
            uv = stub_bin / "uv"
            uv.write_text('#!/bin/sh\necho should-not-run >&2\nexit 8\n')
            uv.chmod(0o755)
            env = {**os.environ, "HOME": str(home), "PATH": f"{stub_bin}:/usr/bin:/bin", "RADAR_PUBLICATION_SOURCE": "invalid", "RADAR_LEGACY_GITHUB_PUBLISH": "1"}
            result = subprocess.run(["bash", "-c", run_sh], env=env, text=True, capture_output=True, timeout=10)
            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn("should-not-run", result.stderr)

    def test_run_publication_supabase_missing_credentials_keeps_current(self):
        edition = {"generated": "2026-10-28T08:11:24+00:00", "count_scanned": 0, "items": []}
        private = {"generated": edition["generated"], "items": []}
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "output"
            with patch.dict("os.environ", {"RADAR_PUBLICATION_SOURCE": "supabase"}, clear=True):
                with self.assertRaisesRegex(RuntimeError, "endpoint credentials are missing"):
                    run_publication(edition, private, output)
            self.assertFalse((output / "current").exists())
            self.assertEqual(list((output / "generations").iterdir()), [])

    def test_supabase_selected_with_credentials_posts_once(self):
        edition = {"generated": "2026-10-28T09:11:24+00:00", "count_scanned": 0, "items": []}
        response = type("Response", (), {"status": 204, "__enter__": lambda self: self, "__exit__": lambda self, *args: None})()
        with patch.dict("os.environ", {
            "RADAR_PUBLICATION_SOURCE": "supabase",
            "RADAR_PUBLISH_URL": "https://example.test/api/radar/publish",
            "RADAR_PUBLISH_TOKEN": "unit-test-publisher-token-00000000",
        }, clear=True), patch("urllib.request.urlopen", return_value=response) as post:
            self.assertTrue(publish_selected_edition(edition))
            self.assertEqual(post.call_count, 1)
            request = post.call_args.args[0]
            self.assertEqual(request.full_url, "https://example.test/api/radar/publish")
            self.assertEqual(request.get_header("Authorization"), "Bearer unit-test-publisher-token-00000000")
            self.assertEqual(json.loads(request.data), edition)
            self.assertEqual(list(json.loads(request.data)), list(edition))


class RadarPublicationTests(unittest.TestCase):
    def test_unknown_rank_tag_is_normalized_and_public_json_is_valid(self):
        generated = "2026-10-28T04:11:24+00:00"
        ranked = [{
            "title": "T" * 240, "url": "https://example.com/item", "source": "S" * 240,
            "summary": "M" * 700, "tag": "hallucinated-tag", "score": 7,
            "kind": "K" * 50, "ts": 1793160684, "group": "public", "internal": "must not escape",
        }]
        public = public_edition(generated, 1, ranked)
        self.assertEqual(public["items"][0]["tag"], "other")
        self.assertEqual(set(public["items"][0]), {"title", "url", "source", "summary", "tag", "score", "kind", "ts"})
        self.assertEqual(len(public["items"][0]["title"]), 200)
        self.assertEqual(len(public["items"][0]["source"]), 200)
        self.assertEqual(len(public["items"][0]["summary"]), 600)
        self.assertEqual(len(public["items"][0]["kind"]), 40)
        self.assertIn(public["items"][0]["tag"], PUBLIC_TAGS)
        self.assertIsNone(public_item({**ranked[0], "url": "javascript:alert(1)"}))

    def test_generation_is_readable_by_morning_briefing_reader(self):
        generated = "2026-10-28T04:11:24+00:00"
        public = public_edition(generated, 1, [{
            "title": "Public example", "url": "https://example.com/public", "source": "Example",
            "summary": "A useful public item.", "tag": "agents", "score": 7, "kind": "article", "ts": 1,
        }])
        private = {"generated": generated, "items": [{
            "title": "Private example", "url": "https://example.com/private", "summary": "A private briefing item.",
        }]}
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "output"
            generation = publish_generation(output, public, private)
            lines = cron_native.radar_lines(output, now=__import__("datetime").datetime.fromisoformat(generated))
            self.assertTrue(lines)
            self.assertEqual(len(lines), 2)
            self.assertIn("Public example", lines[0])
            self.assertIn("Private example", lines[1])
            self.assertEqual(json.loads((generation / "public.json").read_text()), public)
            self.assertEqual(json.loads((generation / "private.json").read_text()), private)
            self.assertEqual((generation / "public.json").stat().st_mode & 0o777, 0o600)
            self.assertEqual((generation / "private.json").stat().st_mode & 0o777, 0o600)

    def test_legacy_out_files_are_json_and_private(self):
        generated = "2026-10-28T04:11:24+00:00"
        public = public_edition(generated, 1, [{
            "title": "Public example", "url": "https://example.com/public", "source": "Example",
            "summary": "A public summary.", "tag": "agents", "score": 7, "kind": "article", "ts": 1,
        }])
        private = {"generated": generated, "items": [{
            "title": "Private example", "url": "https://example.com/private", "summary": "Private only.",
        }]}
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "out"
            write_legacy_outputs(output, public, private)
            self.assertEqual(json.loads((output / "public.json").read_text()), public)
            self.assertEqual(json.loads((output / "private.json").read_text()), private)
            self.assertEqual((output / "public.json").stat().st_mode & 0o777, 0o600)
            self.assertEqual((output / "private.json").stat().st_mode & 0o777, 0o600)
            self.assertEqual(output.stat().st_mode & 0o777, 0o700)
            self.assertEqual(list(output.glob(".*.tmp")), [])
            self.assertEqual(list(output.glob(".*.json.*")), [])

    def test_failed_generation_keeps_current_pointer(self):
        generated = "2026-10-28T04:11:24+00:00"
        public = public_edition(generated, 1, [{
            "title": "Last good", "url": "https://example.com/ok", "source": "Example",
            "summary": "Known good.", "tag": "agents", "score": 7, "kind": "article", "ts": 1,
        }])
        private = {"generated": generated, "items": []}
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "output"
            publish_generation(output, public, private)
            current_before = (output / "current").resolve()
            with self.assertRaises(ValueError):
                publish_generation(output, public, {"generated": "not-matching", "items": []})
            self.assertEqual((output / "current").resolve(), current_before)

    def test_supabase_http_503_keeps_current_and_cleans_candidate(self):
        generated = "2026-10-28T05:11:24+00:00"
        public = public_edition(generated, 1, [{
            "title": "Last good", "url": "https://example.com/ok", "source": "Example",
            "summary": "Known good.", "tag": "agents", "score": 7, "kind": "article", "ts": 1,
        }])
        private = {"generated": generated, "items": []}
        candidate = public_edition("2026-10-28T06:11:24+00:00", 1, [{
            "title": "Candidate", "url": "https://example.com/candidate", "source": "Example",
            "summary": "A candidate edition.", "tag": "invented", "score": 8, "kind": "article", "ts": 2,
        }])
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "output"
            publish_generation(output, public, private)
            previous = (output / "current").resolve()
            with patch.dict("os.environ", {
                "RADAR_PUBLICATION_SOURCE": "supabase",
                "RADAR_PUBLISH_URL": "https://example.test/api/radar/publish",
                "RADAR_PUBLISH_TOKEN": "unit-test-publisher-token-00000000",
            }, clear=True), patch("urllib.request.urlopen", side_effect=lambda request, timeout: (_ for _ in ()).throw(HTTPError(request.full_url, 503, "unavailable", {}, io.BytesIO()))) as post:
                with self.assertRaisesRegex(RuntimeError, "HTTP 503"):
                    publish_generation(
                        output, candidate, {"generated": candidate["generated"], "items": []},
                        before_activate=publish_selected_edition,
                    )
            self.assertEqual(post.call_count, 1)
            self.assertEqual((output / "current").resolve(), previous)
            self.assertFalse(any(path.name.startswith("2026-10-28T06_11_24") for path in (output / "generations").iterdir()))


if __name__ == "__main__":
    unittest.main()
