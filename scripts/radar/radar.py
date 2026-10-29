# /// script
# requires-python = ">=3.11"
# dependencies = ["feedparser>=6", "httpx>=0.27", "websockets>=12", "coincurve>=21,<22"]
# ///
"""Loki Radar: daily personalised news collector.

Collects RSS, Reddit (Redlib), GitHub (starred releases, trending, rising new repos),
HN, Lobsters, HF papers and verified public Nostr notes, ranks with Mimer Qwen
against the vault interest profile, and writes public.json + private.json.
"""
import asyncio, calendar, datetime as dt, gzip, hashlib, html, http.cookiejar, json, os, re
import sys, time, tomllib, urllib.parse, urllib.request
from pathlib import Path
import feedparser, httpx
from nostr_source import collect_nostr
from radar_publication import public_edition, run_publication, write_legacy_outputs

HERE = Path(__file__).parent
OUT = Path(os.environ.get("RADAR_OUT", HERE / "out"))
PROFILE = Path(os.environ.get("RADAR_PROFILE", HERE / "news-interests.md"))
MIMER = os.environ.get("MIMER_URL", "http://100.90.96.28:8080/v1/chat/completions")
MODEL = os.environ.get("MIMER_MODEL", "Qwen3.8-27B-UD-Q6_K_L.gguf")
GH_TOKEN = os.environ.get("GH_TOKEN", "")
CDP = os.environ.get("CDP_URL", "http://127.0.0.1:9222")
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0 Safari/537.36"
HOURS = int(os.environ.get("RADAR_HOURS", "36"))
NOW = time.time()
log = lambda *a: print(*a, file=sys.stderr, flush=True)


def clean(s, n=600):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s or ""))
    return re.sub(r"\s+", " ", s).strip()[:n]


def item(src, title, url, text="", ts=None, group="public", score=0, kind="article"):
    return dict(source=src, title=clean(title, 200), url=url, text=clean(text), ts=ts or NOW,
                group=group, signal=score, kind=kind)


def fresh(ts):
    return ts and NOW - ts < HOURS * 3600


# ---------- sources ----------
def rss(name, url, group):
    try:
        r = httpx.get(url, headers={"User-Agent": UA}, timeout=20, follow_redirects=True)
        f = feedparser.parse(r.content)
    except Exception as e:
        log("rss fail", name, e); return []
    out = []
    for e in f.entries[:40]:
        t = e.get("published_parsed") or e.get("updated_parsed")
        ts = calendar.timegm(t) if t else NOW
        if fresh(ts):
            out.append(item(name, e.get("title", ""), e.get("link", ""), e.get("summary", ""), ts, group))
    return out


def redlib(path):
    base = "https://redlib.privacyredirect.com"
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    raw = op.open(urllib.request.Request(base + path, headers={"User-Agent": UA, "Accept": "text/html"}), timeout=20).read()
    try: h = gzip.decompress(raw).decode()
    except Exception: h = raw.decode("utf-8", "ignore")
    m = re.search(r'<script id="anubis_challenge" type="application/json">(.+?)</script>', h, re.S)
    if m:
        cd = json.loads(m.group(1))["challenge"]
        res = hashlib.sha256(cd["randomData"].encode()).hexdigest()
        time.sleep(cd.get("difficulty", 4) * 0.08)
        u = f"{base}/.within.website/x/cmd/anubis/api/pass-challenge?id={cd['id']}&result={res}&redir={urllib.parse.quote(path, safe='')}"
        raw = op.open(urllib.request.Request(u, headers={"User-Agent": UA, "Accept": "text/html"}), timeout=20).read()
        try: h = gzip.decompress(raw).decode()
        except Exception: h = raw.decode("utf-8", "ignore")
    return h


def reddit(sub, group):
    try:
        h = redlib(f"/r/{sub}/top?t=day")
    except Exception as e:
        log("reddit fail", sub, e); return []
    out = []
    for blk in re.findall(r'<div class="post[ "].*?</div>\s*</div>\s*</div>', h, re.S)[:15] or h.split('class="post_header"')[1:16]:
        t = re.search(r'class="post_title"[^>]*>.*?<a href="(/r/[^"]+)"[^>]*>([^<]+)</a>', blk, re.S)
        if not t: continue
        sc = re.search(r'class="post_score"[^>]*title="(\d+)"', blk)
        body = re.search(r'class="post_body[^"]*"[^>]*>(.*?)</div>', blk, re.S)
        ext = re.search(r'class="post_media_\w+"[^>]*href="(https?://[^"]+)"', blk)
        url = "https://www.reddit.com" + t.group(1)
        out.append(item(f"r/{sub}", t.group(2), url, (body.group(1) if body else "") + (" " + ext.group(1) if ext else ""),
                        NOW, group, int(sc.group(1)) if sc else 0, "reddit"))
    return out


def gh(path, **params):
    hdr = {"Accept": "application/vnd.github+json", "User-Agent": "loki-radar"}
    if GH_TOKEN: hdr["Authorization"] = f"Bearer {GH_TOKEN}"
    r = httpx.get("https://api.github.com" + path, params=params, headers=hdr, timeout=20)
    r.raise_for_status(); return r.json()


def github(cfg):
    out = []
    user = cfg.get("user", "lucasfth")
    try:
        stars = []
        for p in (1, 2, 3):
            page = gh(f"/users/{user}/starred", per_page=100, page=p)
            stars += page
            if len(page) < 100: break
        for repo in stars:
            try:
                rels = gh(f"/repos/{repo['full_name']}/releases", per_page=3)
            except Exception: continue
            for rl in rels:
                ts = dt.datetime.fromisoformat(rl["published_at"].replace("Z", "+00:00")).timestamp() if rl.get("published_at") else 0
                if fresh(ts) and not rl.get("prerelease"):
                    out.append(item(f"GitHub release: {repo['full_name']}", f"{repo['full_name']} {rl.get('name') or rl['tag_name']}",
                                    rl["html_url"], f"{repo.get('description') or ''}. Release notes: {rl.get('body') or ''}", ts,
                                    score=repo.get("stargazers_count", 0), kind="release"))
        log("starred", len(stars))
    except Exception as e:
        log("github stars fail", e)
    try:
        since = (dt.date.today() - dt.timedelta(days=cfg.get("new_repos_days", 7))).isoformat()
        for r in gh("/search/repositories", q=f"created:>{since} stars:>150", sort="stars", per_page=40)["items"]:
            out.append(item("GitHub rising", r["full_name"], r["html_url"],
                            f"{r.get('description') or ''} ({r.get('language')}, {r['stargazers_count']} stars in {cfg.get('new_repos_days', 7)} days)",
                            score=r["stargazers_count"], kind="repo"))
    except Exception as e:
        log("github rising fail", e)
    if cfg.get("trending"):
        try:
            h = httpx.get("https://github.com/trending?since=daily", headers={"User-Agent": UA}, timeout=20).text
            for art in h.split('<article class="Box-row">')[1:26]:
                n = re.search(r'<h2[^>]*>\s*<a[^>]*href="/([^"]+)"', art)
                d = re.search(r'<p class="col-9[^"]*">(.*?)</p>', art, re.S)
                today = re.search(r'([\d,]+) stars today', art)
                if n:
                    out.append(item("GitHub trending", n.group(1), f"https://github.com/{n.group(1)}",
                                    (d.group(1) if d else "") + (f" ({today.group(1)} stars today)" if today else ""),
                                    score=int(today.group(1).replace(",", "")) if today else 0, kind="repo"))
        except Exception as e:
            log("trending fail", e)
    return out


def hn():
    try:
        hits = httpx.get("https://hn.algolia.com/api/v1/search", params={"tags": "front_page", "hitsPerPage": 40}, timeout=20).json()["hits"]
    except Exception as e:
        log("hn fail", e); return []
    return [item("Hacker News", h["title"], h.get("url") or f"https://news.ycombinator.com/item?id={h['objectID']}",
                 f"{h.get('points', 0)} points, {h.get('num_comments', 0)} comments. Discussion: https://news.ycombinator.com/item?id={h['objectID']}",
                 h.get("created_at_i"), score=h.get("points", 0), kind="hn") for h in hits]


def lobsters():
    try:
        js = httpx.get("https://lobste.rs/hottest.json", timeout=20, headers={"User-Agent": UA}).json()
    except Exception as e:
        log("lobsters fail", e); return []
    return [item("Lobsters", s["title"], s.get("url") or s["short_id_url"], s.get("description_plain") or " ".join(s.get("tags", [])),
                 score=s.get("score", 0)) for s in js[:25]]


def hf_papers():
    try:
        js = httpx.get("https://huggingface.co/api/daily_papers", timeout=20).json()
    except Exception as e:
        log("hf fail", e); return []
    return [item("HF daily papers", p["paper"]["title"], f"https://huggingface.co/papers/{p['paper']['id']}",
                 p["paper"].get("summary", ""), score=p["paper"].get("upvotes", 0), kind="paper") for p in js[:25]]


async def x_timeline(limit=80):
    """Read Following timeline from the logged-in CDP Chromium. Empty if logged out."""
    import websockets
    try:
        tab = httpx.put(f"{CDP}/json/new?https://x.com/home", timeout=10).json()
    except Exception as e:
        log("x cdp fail", e); return []
    js = r"""(() => [...document.querySelectorAll('article[data-testid="tweet"]')].map(a => {
      const u = a.querySelector('a[href*="/status/"] time')?.closest('a');
      return {user: a.querySelector('[data-testid="User-Name"]')?.innerText.split('\n').slice(0,2).join(' '),
              text: a.querySelector('[data-testid="tweetText"]')?.innerText || '',
              url: u ? u.href : '', ts: a.querySelector('time')?.dateTime || '',
              card: a.querySelector('[data-testid="card.wrapper"] a')?.href || '',
              likes: a.querySelector('[data-testid="like"]')?.innerText || '0'}}))()"""
    seen, out = {}, []
    try:
        async with websockets.connect(tab["webSocketDebuggerUrl"], max_size=2**24) as ws:
            n = 0
            async def ev(expr):
                nonlocal n; n += 1
                await ws.send(json.dumps({"id": n, "method": "Runtime.evaluate", "params": {"expression": expr, "returnByValue": True}}))
                while True:
                    m = json.loads(await ws.recv())
                    if m.get("id") == n: return m.get("result", {}).get("result", {}).get("value")
            await asyncio.sleep(8)
            if "login" in (await ev("location.href") or "") or not await ev("!!document.querySelector('[data-testid=\"primaryColumn\"]')"):
                log("x: not logged in"); return []
            # prefer the Following tab (chronological)
            await ev("""[...document.querySelectorAll('[role="tab"]')].find(t => /Following|Følger/.test(t.innerText))?.click()""")
            await asyncio.sleep(5)
            for _ in range(25):
                for t in await ev(js) or []:
                    if t["url"] and t["url"] not in seen:
                        seen[t["url"]] = t
                if len(seen) >= limit: break
                await ev("window.scrollBy(0, 2500)"); await asyncio.sleep(2.5)
    finally:
        httpx.get(f"{CDP}/json/close/{tab['id']}", timeout=10)
    for t in seen.values():
        ts = dt.datetime.fromisoformat(t["ts"].replace("Z", "+00:00")).timestamp() if t["ts"] else NOW
        likes = t["likes"].replace(",", "")
        likes = int(float(likes[:-1]) * (1000 if likes.endswith("K") else 1e6)) if likes[-1:] in "KM" else int(likes or 0)
        if fresh(ts):
            out.append(item(f"X: {t['user']}", t["text"][:140], t["url"], t["text"] + (" Link: " + t["card"] if t["card"] else ""),
                            ts, score=likes, kind="x"))
    return out


# ---------- ranking ----------
def llm(prompt, max_tokens=4000):
    r = httpx.post(MIMER, timeout=600, json={
        "model": MODEL, "temperature": 0.2, "max_tokens": max_tokens,
        "chat_template_kwargs": {"enable_thinking": False},
        "messages": [{"role": "user", "content": prompt}]})
    r.raise_for_status()
    s = r.json()["choices"][0]["message"]["content"]
    s = re.sub(r"<think>.*?</think>", "", s, flags=re.S)
    return json.loads(s[s.find("["): s.rfind("]") + 1])


RANK = """You curate a daily news radar for Lucas, a Copenhagen software engineer and startup CTO.
His interest profile:
<profile>
{profile}
</profile>

Score each item 0-10 for how much Lucas would want to know about it TODAY.
10 = directly about a tool/model he uses or a major release in his high-interest areas.
0 = off-profile, excluded topic, spam, low-effort, or pure opinion with no news.
Nix/Zig/Bun only score above 5 for genuinely major news.
For every item scoring 6 or more write a "what it is" summary: 1-2 plain sentences that explain what the thing actually is
and what changed or why it is notable. Write for a public reader: never mention Lucas, his profile or "his interests".
No hype, no emoji, no em dashes. If it is a repo or tool, say what it does.
Also give a short topic tag from: local-llm, agents, models, devtools, security, selfhosting, danish-tech, web, research, stocks, bitcoin, copenhagen, other.

Return ONLY a JSON array: [{{"i": <index>, "score": <0-10>, "tag": "...", "summary": "..."}}] covering every index.

Items:
{items}"""


def rank(items, profile):
    out, failed = [], 0
    for k in range(0, len(items), 25):
        batch = items[k:k + 25]
        lines = "\n".join(f"[{i}] ({it['source']}) {it['title']} :: {it['text'][:350]}" for i, it in enumerate(batch))
        res = {}
        for attempt in range(3):
            try:
                res = {r["i"]: r for r in llm(RANK.format(profile=profile, items=lines))}
                break
            except Exception as e:
                log("rank retry", k, e); res = {}; time.sleep(5)
        else:
            failed += 1
        for i, it in enumerate(batch):
            r = res.get(i, {})
            out.append({**it, "score": float(r.get("score", 0)), "tag": r.get("tag", "other"), "summary": r.get("summary", "")})
        log(f"ranked {min(k + 25, len(items))}/{len(items)}")
    batches = -(-len(items) // 25)
    if batches and failed * 2 > batches:
        sys.exit(f"ranking failed for {failed}/{batches} batches (LLM down?), keeping previous output")
    return out


def dedupe(items):
    seen, out = set(), []
    for it in sorted(items, key=lambda x: -x["signal"]):
        key = re.sub(r"[^a-z0-9]", "", it["url"].lower().split("?")[0].removeprefix("https").removeprefix("http"))
        tkey = re.sub(r"[^a-z0-9]", "", (it["source"] if it["kind"] == "release" else it["title"]).lower())[:60]
        if key in seen or tkey in seen: continue
        seen |= {key, tkey}; out.append(it)
    return out




def main():
    cfg = tomllib.loads((HERE / "sources.toml").read_text())
    profile = PROFILE.read_text()
    items = []
    for block in cfg["rss"]:
        for name, url in block["feeds"]:
            items += rss(name, url, block["group"])
    log("rss", len(items))
    for group in ("public", "private"):
        for sub in cfg["reddit"][group]:
            items += reddit(sub, group); time.sleep(1)
    log("+reddit", len(items))
    items += github(cfg["github"]); log("+github", len(items))
    items += hn() + lobsters() + hf_papers(); log("+hn/lobsters/hf", len(items))
    items += asyncio.run(collect_nostr(cfg.get("nostr", {}), now=NOW, hours=HOURS, log=log))
    log("+nostr", len(items))
    if os.environ.get("RADAR_X", "0") == "1":
        try:
            items += asyncio.run(x_timeline()); log("+x", len(items))
        except Exception as e:
            log("x fail", e)
    items = dedupe(items)
    if os.environ.get("RADAR_LIMIT"):
        items = items[: int(os.environ["RADAR_LIMIT"])]
    ranked = rank(items, profile)
    keep = sorted([r for r in ranked if r["score"] >= 6 and r["summary"]], key=lambda r: (-r["score"], -r["signal"]))
    OUT.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    strip = lambda r: {k: r[k] for k in ("title", "url", "source", "summary", "tag", "score", "kind", "ts")}
    pub, per_src = [], {}
    for r in keep:
        if r["group"] != "public" or r["tag"] in ("stocks", "bitcoin", "copenhagen"): continue
        if per_src.get(r["source"], 0) >= 6: continue
        per_src[r["source"]] = per_src.get(r["source"], 0) + 1
        pub.append(strip(r))
    pub = pub[:40]
    priv = [strip(r) for r in keep if r["group"] == "private" or r["tag"] in ("stocks", "bitcoin", "copenhagen")][:30]
    public = public_edition(stamp, len(items), pub)
    private = {"generated": stamp, "items": priv}
    run_publication(public, private, OUT.parent / "output")
    write_legacy_outputs(OUT, public, private)
    log(f"done: scanned {len(items)}, kept {len(keep)}, public {len(pub)}")


if __name__ == "__main__":
    main()
