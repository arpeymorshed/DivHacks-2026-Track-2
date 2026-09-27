#!/bin/bash
# Aartee demo reset: clears the bot's sent list, resets the backend, starts the bot.
cd "$(dirname "$0")"
rm -f .outbox-sent.json
echo "Resetting backend..."
curl -s -X POST https://div-hacks-2026-track-2-pied.vercel.app/api/demo/reset
echo
echo "Starting bot..."
caffeinate -i bun start
