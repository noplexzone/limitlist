#!/bin/sh
set -e

# Fix ownership of bind-mounted /data so the non-root app user can write the
# SQLite database without requiring the host operator to pre-chown the directory.
chown -R nextjs:nodejs /data

exec gosu nextjs sh -c "node node_modules/prisma/build/index.js migrate deploy && node server.js"
