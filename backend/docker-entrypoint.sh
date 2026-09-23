#!/bin/sh
set -eu

node src/scripts/migrate-database.js
node src/scripts/bootstrap-admin.js
exec "$@"
