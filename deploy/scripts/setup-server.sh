#!/usr/bin/env bash
# One-time bootstrap for an Ubuntu 22.04/24.04 EC2 server.
# Usage: sudo bash setup-server.sh <frontend|backend> [vpc_cidr] [deploy_user]
#   frontend: opens 80/443 publicly.
#   backend : opens 3000 only to vpc_cidr (default 10.0.0.0/16). MongoDB is never opened.
set -euo pipefail

ROLE="${1:-}"
VPC_CIDR="${2:-10.0.0.0/16}"
DEPLOY_USER="${3:-${SUDO_USER:-ubuntu}}"

if [ "$(id -u)" -ne 0 ]; then echo "Run as root (sudo)." >&2; exit 1; fi
case "$ROLE" in
  frontend|backend) ;;
  *) echo "Usage: sudo bash setup-server.sh <frontend|backend> [vpc_cidr] [deploy_user]" >&2; exit 1 ;;
esac
DEPLOY_DIR="/opt/commerceflow-$ROLE"

# Docker Engine + Compose plugin from Docker's official apt repository
apt-get update
apt-get install -y ca-certificates curl ufw unzip
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker "$DEPLOY_USER"

# AWS CLI v2 (needed to log in to ECR using the instance role)
if ! command -v aws >/dev/null; then
  ARCH="$(uname -m)"
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${ARCH}.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
  rm -rf /tmp/aws /tmp/awscliv2.zip
fi

# Host firewall (the EC2 security group remains the primary boundary)
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
if [ "$ROLE" = "frontend" ]; then
  ufw allow 80/tcp
  ufw allow 443/tcp
else
  ufw allow from "$VPC_CIDR" to any port 3000 proto tcp
fi
ufw --force enable

mkdir -p "$DEPLOY_DIR"
chown "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_DIR"
chmod 750 "$DEPLOY_DIR"

docker --version
docker compose version
aws --version
echo "Done. Copy deploy/$ROLE/* (incl. .env) into $DEPLOY_DIR, then run: docker compose up -d"
