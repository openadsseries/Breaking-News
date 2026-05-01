#!/bin/bash
# Breaking News — Local Feed Updater
# Runs via macOS launchd every 1 hour

PROJECT_DIR="$HOME/Downloads/Breaking News"
LOG_FILE="$PROJECT_DIR/scripts/feed-update.log"

cd "$PROJECT_DIR" || exit 1

echo "$(date '+%Y-%m-%d %H:%M:%S') — Starting feed update..." >> "$LOG_FILE"

# Load env
export $(grep -v '^#' .env.local | xargs 2>/dev/null)

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Sync with remote first (avoid conflicts from manual pushes)
git fetch origin >> "$LOG_FILE" 2>&1
git reset --hard origin/main >> "$LOG_FILE" 2>&1

# Fetch news
node scripts/fetch-news.mjs >> "$LOG_FILE" 2>&1

# Git push if changed
if ! git diff --quiet src/data/mock-feed.json 2>/dev/null; then
  git add src/data/mock-feed.json
  git commit -m "chore: auto-update news feed (local)"
  git push >> "$LOG_FILE" 2>&1
  echo "$(date '+%Y-%m-%d %H:%M:%S') — Pushed new articles ✅" >> "$LOG_FILE"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') — No new articles" >> "$LOG_FILE"
fi

# Keep log small (last 200 lines)
tail -200 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
