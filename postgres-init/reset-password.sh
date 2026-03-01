#!/bin/bash
# This script runs inside the postgres container on every start
# It ensures the postgres user password matches what the backend expects
psql -U "$POSTGRES_USER" -c "ALTER USER postgres PASSWORD '${POSTGRES_PASSWORD}';"
echo "✅ postgres password set to value from POSTGRES_PASSWORD env"

