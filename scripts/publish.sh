#!/usr/bin/env bash

set -e

if [[ $(git branch --show-current) != "main" ]]; then
  echo "Not in main branch"
  exit 1
fi

npm version $1
git add .
version=$(cat package.json | jq -r '.version')
echo $version
git commit -m "release $version"
git push origin main --follow-tags
npm publish --access public
