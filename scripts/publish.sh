#!/usr/bin/env bash

# Usage:
# ./scripts/publish.sh <major|minor|patch>

set -e

if [[ $(git branch --show-current) != "main" ]]; then
  echo "Not in main branch"
  exit 1
fi

npm version $1
git push origin main --follow-tags
npm publish --access public
