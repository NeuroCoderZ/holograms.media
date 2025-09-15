#!/usr/bin/env bash
set -euo pipefail
out="$(pwd)/.scripts/changes_report_2025-08-14_29.txt"
: > "$out"
echo "Changes in origin/main..HEAD from 2025-08-14 to 2025-08-29 (excluding .gitignored and backend/Tria):" >> "$out"
# ensure origin info
git fetch origin --prune >/dev/null 2>&1 || true
commits=$(git rev-list --since="2025-08-14" --until="2025-08-29 23:59" origin/main..HEAD || true)
if [[ -z "$commits" ]]; then
  echo "No commits in range." >> "$out"
  echo "Report saved to: $out"
  exit 0
fi
for c in $commits; do
  git show --name-only --pretty=format:"COMMIT %h %ad %an %s" --date=iso "$c" | awk 'NF' | {
    header=""
    while IFS= read -r line; do
      if [[ $line == COMMIT* ]]; then
        header="$line"
        echo "$header" >> "$out"
        continue
      fi
      if [[ -z "$line" ]]; then
        continue
      fi
      # skip files ignored by git
      if git check-ignore -q -- "$line" 2>/dev/null; then
        continue
      fi
      # skip backend/Tria
      case "$line" in
        backend/Tria/*) continue;;
      esac
      echo -e "\t$line" >> "$out"
    done
  }
done
# summary
echo "=== SUMMARY ===" >> "$out"
echo "total commits: $(git rev-list --since="2025-08-14" --until="2025-08-29 23:59" origin/main..HEAD | wc -l)" >> "$out"
awk '/^\t/ {print substr($0,2)}' "$out" | sort -u > "$(pwd)/.scripts/changes_files_uniq_2025-08-14_29.txt"
echo "unique files: $(wc -l < "$(pwd)/.scripts/changes_files_uniq_2025-08-14_29.txt")" >> "$out"
echo "Report saved to: $out"
echo "Unique files list: $(pwd)/.scripts/changes_files_uniq_2025-08-14_29.txt"
# print brief preview
sed -n '1,200p' "$out"
