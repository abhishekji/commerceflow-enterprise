#!/usr/bin/env bash
# Run from /opt/commerceflow-frontend. CI exports WEB_IMAGE and AWS_REGION; run by hand to redeploy the tag in .env.
set -euo pipefail
cd "$(dirname "$0")"

REGION="${AWS_REGION:-ap-south-1}"

# Persist the new tag so a later manual `docker compose up` doesn't roll back.
if [ -n "${WEB_IMAGE:-}" ]; then
  if grep -q '^WEB_IMAGE=' .env; then
    sed -i "s|^WEB_IMAGE=.*|WEB_IMAGE=${WEB_IMAGE}|" .env
  else
    echo "WEB_IMAGE=${WEB_IMAGE}" >> .env
  fi
fi

IMAGE="$(grep -E '^WEB_IMAGE=' .env | cut -d= -f2-)"
REGISTRY="${IMAGE%%/*}"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"
docker compose pull
docker compose up -d --remove-orphans
docker image prune -f
docker compose ps
