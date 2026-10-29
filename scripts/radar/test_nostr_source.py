import hashlib
import json
import unittest
from coincurve import PrivateKey
from nostr_source import validated_items

NOW = 1800000000
KEY = PrivateKey(b'\x01' * 32)

def event(content='New local LLM release https://example.org/release', created_at=NOW-10, kind=1, tags=None):
    value = dict(pubkey=KEY.public_key_xonly.format().hex(), created_at=created_at,
                 kind=kind, tags=tags if tags is not None else [['t', 'llm']], content=content)
    digest = hashlib.sha256(json.dumps([0,value['pubkey'],created_at,kind,value['tags'],content],ensure_ascii=False,separators=(',',':')).encode()).digest()
    return dict(value, id=digest.hex(), sig=KEY.sign_schnorr(digest).hex())

class NostrBehavior(unittest.TestCase):
    def collect(self, values, **kwargs):
        return validated_items(values, now=NOW, hours=36, tags=['llm','agents'], authors=[], limit=20, **kwargs)

    def test_verified_note_preserves_attribution_and_external_link(self):
        row = self.collect([event()])[0]
        self.assertEqual(row['url'], 'https://example.org/release')
        self.assertEqual(row['kind'], 'nostr')
        self.assertEqual(row['group'], 'public')
        self.assertIn('https://njump.me/', row['text'])

    def test_tampered_content_and_signature_are_rejected(self):
        original = event()
        self.assertEqual(self.collect([{**original,'content':'tampered'}, {**original,'sig':'00'*64}]), [])

    def test_stale_future_private_kind_and_unmatched_topics_rejected(self):
        values = [event(created_at=NOW-36*3600-1),event(created_at=NOW+301),event(kind=4),event(tags=[['t','bitcoin']])]
        self.assertEqual(self.collect(values), [])

    def test_cross_relay_events_and_article_urls_deduplicate(self):
        first=event()
        second=event(content='Another discussion https://example.org/release',created_at=NOW-5)
        self.assertEqual(len(self.collect([first,first,second])),1)

    def test_malformed_events_are_isolated(self):
        self.assertEqual(len(self.collect([None,{}, {'id':[]},event()])),1)

    def test_topic_discovery_excludes_reply_spam(self):
        self.assertEqual(self.collect([event(tags=[['t','llm'],['e','ab'*32,'','reply']])]),[])

    def test_exact_author_allowlist_accepts_untagged_public_note(self):
        rows=validated_items([event(tags=[])],now=NOW,hours=36,tags=[],authors=[KEY.public_key_xonly.format().hex()],limit=20)
        self.assertEqual(len(rows),1)

if __name__ == '__main__': unittest.main()
