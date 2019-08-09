#!/bin/sh

node ./common/scripts/install-run-rush.js update --bypass-policy
echo "// Hello world at $(date +"%T")!" >> ./libraries/my-controls/src/index.ts
node ./common/scripts/install-run-rush.js build