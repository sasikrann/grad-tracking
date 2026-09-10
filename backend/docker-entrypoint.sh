#!/bin/sh
set -eu

node src/scripts/bootstrap-admin.js
exec "$@"
