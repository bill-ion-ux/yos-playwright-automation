#!/usr/bin/env bash
#
# run.sh - execution entry point for the YOS Playwright suites.
# (codegen.sh is the authoring entry point; this one runs existing specs.)
#
# Usage:
#   ./run.sh [spec] [options] [-- <extra playwright args>]
#
#   spec                 File-path filter, e.g. YOS-ARS-43 (substring match,
#                        works in any project). Omit to run the whole project.
#
# Options:
#   -p, --project <name> incoming | seed | restructured   (default: restructured)
#   -g, --grep <pattern> Only run tests whose title matches <pattern>
#       --watch          Step through from the terminal: --debug=cli
#                        (headed, 1 worker, no timeout, stop on first failure)
#       --headed         Real browser, but run at full speed
#       --ui             Playwright interactive UI mode
#       --trace[=mode]   Force tracing (default mode: on). e.g. --trace=retain-on-failure
#       --prod           Point YOS_HOST at https://www.yes.my instead of dev
#       --report         Write an HTML report and open it when the run finishes
#   -l, --list           Collect and print matching tests, do not run them
#   -h, --help           Show this help
#
#   Anything after `--` is forwarded verbatim to `playwright test`
#   (e.g. --workers=1, --repeat-each=3, --retries=0, --reporter=line).
#
# Examples:
#   ./run.sh                                  # full restructured suite
#   ./run.sh YOS-ARS-43 --watch               # step through one spec
#   ./run.sh -p incoming YOS-ZFOLD8 --headed
#   ./run.sh -p restructured --report
#   ./run.sh YOS-ARS-47 -- --repeat-each=3 --workers=1

set -euo pipefail

PROJECT="restructured"
SPEC=""
GREP=""
WATCH=0
HEADED=0
UI=0
TRACE=""
PROD=0
REPORT=0
LIST=0
PASSTHRU=()

usage() { sed -n '2,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//; s/^#//; /^set -euo/d'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--project) PROJECT="${2:?--project needs a value}"; shift 2 ;;
    -g|--grep)    GREP="${2:?--grep needs a value}"; shift 2 ;;
    --watch)      WATCH=1; shift ;;
    --headed)     HEADED=1; shift ;;
    --ui)         UI=1; shift ;;
    --trace)      TRACE="on"; shift ;;
    --trace=*)    TRACE="${1#*=}"; shift ;;
    --prod)       PROD=1; shift ;;
    --report)     REPORT=1; shift ;;
    -l|--list)    LIST=1; shift ;;
    -h|--help)    usage; exit 0 ;;
    --)           shift; PASSTHRU+=("$@"); break ;;
    -*)           echo "run.sh: unknown option '$1' (use -- to forward playwright args)" >&2; exit 2 ;;
    *)
      if [[ -n "$SPEC" ]]; then
        echo "run.sh: more than one spec filter ('$SPEC', '$1'); pass extra ones after --" >&2
        exit 2
      fi
      SPEC="$1"; shift ;;
  esac
done

case "$PROJECT" in
  incoming|seed|restructured) ;;
  *) echo "run.sh: --project must be incoming, seed or restructured (got '$PROJECT')" >&2; exit 2 ;;
esac

if [[ $WATCH -eq 1 && $UI -eq 1 ]]; then
  echo "run.sh: --watch and --ui can't be combined" >&2; exit 2
fi

CMD=(npx playwright test "--project=$PROJECT")
[[ -n "$SPEC" ]] && CMD+=("$SPEC")
[[ -n "$GREP" ]] && CMD+=(--grep "$GREP")
[[ $WATCH  -eq 1 ]] && CMD+=(--debug=cli)
[[ $HEADED -eq 1 && $WATCH -eq 0 ]] && CMD+=(--headed)
[[ $UI     -eq 1 ]] && CMD+=(--ui)
[[ $LIST   -eq 1 ]] && CMD+=(--list)
[[ -n "$TRACE" ]] && CMD+=("--trace=$TRACE")
[[ $REPORT -eq 1 ]] && CMD+=(--reporter=html)
[[ ${#PASSTHRU[@]} -gt 0 ]] && CMD+=("${PASSTHRU[@]}")

if [[ $PROD -eq 1 ]]; then
  export YOS_HOST="https://www.yes.my"
  echo "run.sh: YOS_HOST=$YOS_HOST"
fi

echo "run.sh: ${CMD[*]}"
STATUS=0
"${CMD[@]}" || STATUS=$?

if [[ $REPORT -eq 1 && $LIST -eq 0 ]]; then
  npx playwright show-report || true
fi

exit $STATUS
