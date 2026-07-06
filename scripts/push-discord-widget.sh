#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

set -a
source .env
set +a

curl -s http://127.0.0.1:${PORT:-3000}/api/discord-widget | curl -sS -f -X PATCH "https://discord.com/api/v9/applications/${DISCORD_APP_ID}/users/${DISCORD_USER_ID}/identities/0/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
  -H "User-Agent: DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)" \
  --data-binary @- >/dev/null

echo "OK: widget Discord mis a jour $(date -Is)"
