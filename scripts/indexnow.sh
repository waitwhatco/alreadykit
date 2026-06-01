#!/usr/bin/env bash
# indexnow.sh — push URL changes to IndexNow.
# Run after every deploy. Free, no auth, no quota.

set -euo pipefail

HOST="alreadykit.com"
KEY="ccc70a7697cbcb29b67b415b485aa979"
KEY_LOCATION="https://${HOST}/${KEY}.txt"

if [ $# -gt 0 ]; then
  URL_LIST=("https://${HOST}$1")
else
  URL_LIST=(
    # Global
    "https://${HOST}/"
    "https://${HOST}/docs"
    "https://${HOST}/guide"
    "https://${HOST}/checklist"
    "https://${HOST}/calculator"
    "https://${HOST}/student"
    "https://${HOST}/vs/t3-stack"
    "https://${HOST}/vs/shipfast"
    "https://${HOST}/vs/supastarter"
    "https://${HOST}/vs/makerkit"
    "https://${HOST}/vs/nextjs-saas-starter"
    "https://${HOST}/migrate/lovable"
    "https://${HOST}/migrate/base44"
    "https://${HOST}/migrate/bolt"
    "https://${HOST}/migrate/v0"
    "https://${HOST}/legal/privacy"
    "https://${HOST}/legal/terms"
    # EU
    "https://${HOST}/eu/"
    "https://${HOST}/eu/docs"
    "https://${HOST}/eu/guide"
    "https://${HOST}/eu/checklist"
    "https://${HOST}/eu/calculator"
    "https://${HOST}/eu/student"
    "https://${HOST}/eu/legal/privacy"
    "https://${HOST}/eu/legal/terms"
    # CH
    "https://${HOST}/ch/"
    "https://${HOST}/ch/docs"
    "https://${HOST}/ch/guide"
    "https://${HOST}/ch/checklist"
    "https://${HOST}/ch/calculator"
    "https://${HOST}/ch/student"
    "https://${HOST}/ch/migrate/lovable"
    "https://${HOST}/ch/migrate/base44"
    "https://${HOST}/ch/migrate/bolt"
    "https://${HOST}/ch/migrate/v0"
    "https://${HOST}/ch/legal/privacy"
    "https://${HOST}/ch/legal/terms"
  )
fi

URLS_JSON=$(printf '"%s",' "${URL_LIST[@]}" | sed 's/,$//')

PAYLOAD=$(cat <<EOF
{
  "host": "${HOST}",
  "key": "${KEY}",
  "keyLocation": "${KEY_LOCATION}",
  "urlList": [${URLS_JSON}]
}
EOF
)

echo "→ Pushing ${#URL_LIST[@]} URL(s) to IndexNow…"

HTTP_CODE=$(curl -sS -o /tmp/indexnow-response -w "%{http_code}" \
  -X POST "https://api.indexnow.org/IndexNow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "${PAYLOAD}")

case "${HTTP_CODE}" in
  200|202)
    echo "✓ Submitted (HTTP ${HTTP_CODE}) — Bing/Yandex will crawl within hours."
    ;;
  400) echo "✗ Bad request"; cat /tmp/indexnow-response; exit 1 ;;
  403) echo "✗ Key not valid or key file not reachable at ${KEY_LOCATION}"; exit 1 ;;
  422) echo "✗ Unprocessable"; cat /tmp/indexnow-response; exit 1 ;;
  429) echo "✗ Rate-limited — wait and retry"; exit 1 ;;
  *)   echo "? HTTP ${HTTP_CODE}"; cat /tmp/indexnow-response; exit 1 ;;
esac
