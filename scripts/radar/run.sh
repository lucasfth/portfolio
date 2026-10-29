#!/usr/bin/env bash
# Loki Radar: collect, rank, publish public.json to the configured publication endpoint.
# private.json stays local on Freyr (pulled by the morning briefing over ssh).
set -euo pipefail
cd "$HOME/loki-radar"
if [[ -f "$HOME/.config/loki-radar/radar-publisher.env" ]]; then
  publisher_url= publisher_token= seen_url=0 seen_token=0
  while IFS= read -r entry || [[ -n "$entry" ]]; do
    [[ "$entry" =~ ^(RADAR_PUBLISH_URL|RADAR_PUBLISH_TOKEN)=([^[:space:]#]+)$ ]] || { echo "Invalid Radar publisher env file" >&2; exit 1; }
    value="${BASH_REMATCH[2]}"
    case "${BASH_REMATCH[1]}" in
      RADAR_PUBLISH_URL)
        [[ "$seen_url" == 0 ]] || { echo "Duplicate Radar publisher env key" >&2; exit 1; }
        publisher_url="$value"; seen_url=1
        ;;
      RADAR_PUBLISH_TOKEN)
        [[ "$seen_token" == 0 ]] || { echo "Duplicate Radar publisher env key" >&2; exit 1; }
        publisher_token="$value"; seen_token=1
        ;;
    esac
  done < "$HOME/.config/loki-radar/radar-publisher.env"
fi
publisher_url="${RADAR_PUBLISH_URL:-${publisher_url:-}}"
publisher_token="${RADAR_PUBLISH_TOKEN:-${publisher_token:-}}"
[[ "$publisher_url" == "https://lucashanson.dk/api/radar/publish" ]] || { echo "Invalid Radar publisher URL" >&2; exit 1; }
[[ ${#publisher_token} -ge 32 && ${#publisher_token} -le 256 && "$publisher_token" != *[^[:graph:]]* ]] || { echo "Invalid Radar publisher token" >&2; exit 1; }
RADAR_PUBLISH_URL="$publisher_url"
RADAR_PUBLISH_TOKEN="$publisher_token"
export RADAR_PUBLISH_URL RADAR_PUBLISH_TOKEN
source="${RADAR_PUBLICATION_SOURCE:-github}"
legacy_publish="${RADAR_LEGACY_GITHUB_PUBLISH:-1}"
case "$source:$legacy_publish" in
  github:1) ;;
  github:0) echo "GitHub source selected but legacy publication is disabled" >&2; exit 1 ;;
  supabase:0)
    : "${RADAR_PUBLISH_URL:?Supabase source selected but RADAR_PUBLISH_URL is missing}"
    : "${RADAR_PUBLISH_TOKEN:?Supabase source selected but RADAR_PUBLISH_TOKEN is missing}"
    ;;
  supabase:1) echo "Supabase source requires RADAR_LEGACY_GITHUB_PUBLISH=0" >&2; exit 1 ;;
  *) echo "Unsupported Radar source/publish mode: $source:$legacy_publish" >&2; exit 1 ;;
esac
if [[ "$source" == "github" ]]; then
  export GH_TOKEN="$(cat "$HOME/.config/loki-radar/gh_token")"
fi
uv run -q radar.py
if [[ "$source" == "github" ]]; then
  [ -d repo/.git ] || git clone -q "https://x-access-token:$GH_TOKEN@github.com/lucasfth/loki-radar.git" repo
  cd repo
  git pull -q --rebase || true
  cp ../out/public.json public.json
  cp ../README.md .
  git add public.json README.md
  git -c commit.gpgsign=false -c user.name="Loki Radar" -c user.email=online@lucashanson.dk \
    commit -qm "radar: $(date -u +%FT%H:%MZ)" || exit 0
  git push -q "https://x-access-token:$GH_TOKEN@github.com/lucasfth/loki-radar.git" HEAD:main
fi
