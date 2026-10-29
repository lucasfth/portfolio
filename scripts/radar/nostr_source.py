"""Anonymous, read-only Nostr news ingestion. Never signs or publishes events."""
import asyncio
import hashlib
import json
import re
import time
from urllib.parse import urlparse

import websockets
from coincurve import PublicKeyXOnly

HEX64 = re.compile(r'^[0-9a-f]{64}$')
EXCLUDED_TAGS = {'bitcoin', 'btc', 'crypto', 'stocks', 'copenhagen', 'nsfw'}


def validated_items(events, *, now, hours, tags, authors, limit):
    allowed_tags = {tag.lower() for tag in tags}
    allowed_authors = set(authors)
    verified = {}
    for value in events:
        try:
            if not isinstance(value, dict):
                continue
            pubkey, event_id = value['pubkey'], value['id']
            timestamp, kind = value['created_at'], value['kind']
            content, event_tags = value['content'], value['tags']
            if not isinstance(pubkey, str) or not HEX64.fullmatch(pubkey):
                continue
            if not isinstance(event_id, str) or not HEX64.fullmatch(event_id):
                continue
            if type(kind) is not int or kind != 1 or type(timestamp) is not int:
                continue
            if not now - hours * 3600 <= timestamp <= now + 300:
                continue
            if not isinstance(content, str) or not 1 <= len(content) <= 12000:
                continue
            if not isinstance(event_tags, list) or len(event_tags) > 100:
                continue
            if any(not isinstance(tag, list) or not tag or any(not isinstance(part, str) for part in tag) for tag in event_tags):
                continue
            topics = {tag[1].lower() for tag in event_tags if len(tag) > 1 and tag[0] == 't'}
            if topics & EXCLUDED_TAGS:
                continue
            if pubkey not in allowed_authors and not topics & allowed_tags:
                continue
            # Broad discovery excludes replies; a curated author's notes remain eligible.
            if pubkey not in allowed_authors and any(tag[0] == 'e' for tag in event_tags):
                continue
            body = [0, pubkey, timestamp, kind, event_tags, content]
            digest = hashlib.sha256(json.dumps(body, ensure_ascii=False, separators=(',', ':')).encode()).digest()
            if digest.hex() != event_id or not PublicKeyXOnly(bytes.fromhex(pubkey)).verify(bytes.fromhex(value['sig']), digest):
                continue
            verified[event_id] = value
        except (KeyError, TypeError, ValueError):
            continue
    rows, seen_urls = [], set()
    for value in sorted(verified.values(), key=lambda event: (-event['created_at'], event['id'])):
        permalink = 'https://njump.me/' + value['id']
        links = re.findall(r'https?://[^\s<>\"\x27]+', value['content'])
        external = next((link.rstrip('.,;!?)') for link in links
                         if urlparse(link).hostname and urlparse(link).hostname not in {'njump.me', 'nostr.com', 'primal.net', 'damus.io'}), None)
        url = external or permalink
        key = url.split('#')[0].rstrip('/')
        if key in seen_urls:
            continue
        seen_urls.add(key)
        content = ' '.join(value['content'].split())
        rows.append(dict(source='Nostr: ' + value['pubkey'][:12], title=content[:200], url=url,
                         text=content[:1000] + '\nOriginal note: ' + permalink,
                         ts=value['created_at'], group='public', signal=0, kind='nostr'))
        if len(rows) >= limit:
            break
    return rows


async def collect_nostr(config, *, now=None, hours=36, log=print):
    if not config.get('enabled', False):
        return []
    now = time.time() if now is None else now
    limit = min(200, max(1, int(config.get('limit', 80))))
    per_relay = min(150, max(1, int(config.get('per_relay_limit', 60))))
    timeout = min(30, max(1, float(config.get('timeout_seconds', 12))))
    tags = [tag.lower() for tag in config.get('tags', []) if isinstance(tag, str)][:20]
    authors = [author for author in config.get('authors', []) if isinstance(author, str) and HEX64.fullmatch(author)][:50]
    filters = []
    base = dict(kinds=[1], since=int(now - hours * 3600), until=int(now), limit=per_relay)
    if authors:
        filters.append(dict(base, authors=authors))
    if tags:
        filters.append(dict(base, **{'#t': tags}))
    if not filters:
        return []

    async def read_relay(url):
        if not isinstance(url, str) or urlparse(url).scheme != 'wss':
            return []
        events = []
        try:
            async with asyncio.timeout(timeout):
                async with websockets.connect(url, open_timeout=timeout, close_timeout=1, max_size=131072, max_queue=16) as ws:
                    await ws.send(json.dumps(['REQ', 'radar-news', *filters]))
                    for _ in range(per_relay * len(filters) + 20):
                        message = json.loads(await ws.recv())
                        if not isinstance(message, list) or not message:
                            continue
                        if message[0] == 'EVENT' and len(message) == 3 and message[1] == 'radar-news':
                            events.append(message[2])
                            if len(events) >= per_relay * len(filters):
                                break
                        elif message[0] == 'EOSE' and len(message) > 1 and message[1] == 'radar-news':
                            break
                        elif message[0] == 'CLOSED':
                            break
                        # AUTH challenges are ignored: no identity/key is available here.
                    await ws.send(json.dumps(['CLOSE', 'radar-news']))
        except Exception as error:
            log('nostr relay unavailable', url, type(error).__name__)
        return events

    batches = await asyncio.gather(*(read_relay(url) for url in config.get('relays', [])[:4]))
    return validated_items([event for batch in batches for event in batch], now=now,
                           hours=hours, tags=tags, authors=authors, limit=limit)
