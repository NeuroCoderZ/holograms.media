#!/bin/bash
# Канонический раннер тестов проекта. Совпадает с `npm test` / `npm run test:unit`.
set -e
cd "$(dirname "$0")/.."
exec node ./tests/unit/run_tests.js
