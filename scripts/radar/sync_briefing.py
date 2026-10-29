#!/usr/bin/env python3
"""Pull one complete Freyr generation into Gimle's private briefing store."""
import io
import json
import os
from pathlib import Path
import shlex
import subprocess
import tarfile

from radar_publication import public_edition, publish_generation

ROOT = Path('/Users/gimle/loki-data/live/loki-radar/output')
REMOTE = r'''
import io, pathlib, tarfile, sys
root = pathlib.Path('/home/lucas/loki-radar/output')
generation = (root / 'current').resolve(strict=True)
assert generation.parent == root / 'generations'
with tarfile.open(fileobj=sys.stdout.buffer, mode='w|') as archive:
    for name in ('public.json', 'private.json'):
        path = generation / name
        assert not path.is_symlink()
        data = path.read_bytes()
        assert len(data) <= 1024 * 1024
        info = tarfile.TarInfo(name)
        info.size = len(data)
        archive.addfile(info, io.BytesIO(data))
'''


def activate(payload, root=ROOT):
    if len(payload) > 3 * 1024 * 1024:
        raise ValueError('Radar handoff is too large')
    with tarfile.open(fileobj=io.BytesIO(payload), mode='r:') as archive:
        members = archive.getmembers()
        if sorted(member.name for member in members) != ['private.json', 'public.json']:
            raise ValueError('Unexpected Radar handoff files')
        if any(not member.isfile() or member.size > 1024 * 1024 for member in members):
            raise ValueError('Unsafe Radar handoff member')
        public = json.load(archive.extractfile('public.json'))
        private = json.load(archive.extractfile('private.json'))
    if public_edition(public['generated'], public['count_scanned'], public['items']) != public:
        raise ValueError('Invalid public Radar edition')
    root = Path(root).resolve()
    current = root / 'current'
    if current.is_symlink():
        generation = current.resolve(strict=True)
        if generation.parent != root / 'generations':
            raise ValueError('Unsafe current generation')
        if all(json.loads((generation / name).read_text()) == document
               for name, document in [('public.json', public), ('private.json', private)]):
            return public['generated']
    publish_generation(root, public, private)
    return public['generated']


def main():
    os.umask(0o077)
    volume = Path('/Users/gimle/loki-data')
    if not volume.is_mount() or not ROOT.parent.is_dir():
        raise RuntimeError('Encrypted Radar store is unavailable')
    result = subprocess.run(
        ['/usr/bin/ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', 'freyr',
         'python3 -c ' + shlex.quote(REMOTE)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60, check=False,
    )
    if result.returncode:
        raise RuntimeError('Freyr Radar handoff failed; keeping last-good generation')
    generated = activate(result.stdout)
    print('Radar briefing generation synced:', generated)


if __name__ == '__main__':
    main()
