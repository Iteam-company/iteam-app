#!/bin/sh
set -e

echo "▶ Running migrations..."
npx prisma migrate deploy

echo "▶ Running seed..."
npm run seed

echo "▶ Starting dev server..."
exec npm run start:dev
