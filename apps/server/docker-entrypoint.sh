#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# Wait for PostgreSQL to be ready by retrying migrations
RETRIES=30
until npx prisma migrate deploy || [ $RETRIES -eq 0 ]; do
  echo "Waiting for database... ($RETRIES retries left)"
  RETRIES=$((RETRIES-1))
  sleep 2
done

if [ $RETRIES -eq 0 ]; then
  echo "Failed to connect to database after 60 seconds"
  exit 1
fi

echo "Database is ready and migrations are applied!"

echo "Seeding database..."
# Use compiled seed.js if available, otherwise try prisma db seed
if [ -f "dist/prisma/seed.js" ]; then
  node dist/prisma/seed.js || echo "Seed script failed or already seeded, continuing..."
else
  npx prisma db seed || echo "Seed script failed or already seeded, continuing..."
fi

echo "Starting application..."
exec "$@"

