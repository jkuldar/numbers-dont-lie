#!/bin/bash
set -e

# Set proper permissions for SSL certificates
if [ -f /certs/key.pem ]; then
  chmod 600 /certs/key.pem
  chown postgres:postgres /certs/key.pem
  echo "✓ PostgreSQL SSL configured"
fi
