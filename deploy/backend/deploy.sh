#!/usr/bin/env bash
# Run from /opt/commerceflow-backend. CI exports API_IMAGE and AWS_REGION; run by hand to redeploy the tag in .env.
set -euo pipefail
cd "$(dirname "$0")"

REGION="${AWS_REGION:-ap-south-1}"

# Persist the new tag so a later manual `docker compose up` doesn't roll back.
if [ -n "${API_IMAGE:-}" ]; then
  if grep -q '^API_IMAGE=' .env; then
    sed -i "s|^API_IMAGE=.*|API_IMAGE=${API_IMAGE}|" .env
  else
    echo "API_IMAGE=${API_IMAGE}" >> .env
  fi
fi

IMAGE="$(grep -E '^API_IMAGE=' .env | cut -d= -f2-)"
REGISTRY="${IMAGE%%/*}"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"
docker compose pull
docker compose up -d --remove-orphans
docker image prune -f
docker compose ps
