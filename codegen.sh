#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ID="${1:?Usage: ./codegen.sh <script-id> [url]}"

set -a
source .env
set +a

URL="${2:-https://${DEV_SITE_USER}:${DEV_SITE_PASS}@yesmy-dev.azurewebsites.net/devices/}"
URL1="https://yes.my/"
npx playwright codegen --output "incoming-scripts/${SCRIPT_ID}.spec.ts" "$URL"