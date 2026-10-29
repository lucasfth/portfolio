import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

from sync_briefing import activate


def bundle(public, private):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w') as archive:
        for name, document in [('public.json', public), ('private.json', private)]:
            data = json.dumps(document).encode()
            member = tarfile.TarInfo(name)
            member.size = len(data)
            archive.addfile(member, io.BytesIO(data))
    return output.getvalue()


class BriefingSyncTests(unittest.TestCase):
    def test_complete_generation_is_private_and_idempotent(self):
        public = {'generated': '2026-10-29T16:04:06+00:00', 'count_scanned': 1, 'items': []}
        private = {'generated': public['generated'], 'items': []}
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'output'
            self.assertEqual(activate(bundle(public, private), root), public['generated'])
            before = (root / 'current').readlink()
            activate(bundle(public, private), root)
            self.assertEqual((root / 'current').readlink(), before)
            self.assertEqual(root.stat().st_mode & 0o777, 0o700)
            self.assertEqual((root / 'current/private.json').stat().st_mode & 0o777, 0o600)
            invalid = {**private, 'generated': '2026-10-29T16:04:07+00:00'}
            with self.assertRaises(ValueError):
                activate(bundle(public, invalid), root)
            self.assertEqual((root / 'current').readlink(), before)

    def test_rejects_unexpected_members(self):
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode='w') as archive:
            member = tarfile.TarInfo('../private.json')
            archive.addfile(member, io.BytesIO())
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(ValueError):
                activate(output.getvalue(), Path(temporary) / 'output')


if __name__ == '__main__':
    unittest.main()
