#!/usr/bin/env bash
#
# proxmox-install.sh — one-command self-hosted install for Papyra.
#
# Builds the image from THIS fork (so it includes the license-unlock changes)
# and starts it with the full server/enterprise feature set enabled.
#
# Run this INSIDE a Debian/Ubuntu Proxmox guest:
#   * A VM is recommended (most reliable for Docker).
#   * An LXC works too, but the container must have nesting=1 and keyctl=1
#     enabled in its Proxmox options, otherwise Docker will not start.
#
# Quick start:
#   bash <(curl -fsSL https://raw.githubusercontent.com/risacaph/Papyra-PDF/main/deploy/proxmox-install.sh)
# or, from a checkout:
#   ./deploy/proxmox-install.sh
#
# Tunables (override via environment):
#   REPO_URL, BRANCH, INSTALL_DIR, STIRLING_PORT,
#   STIRLING_ADMIN_USERNAME, STIRLING_ADMIN_PASSWORD, STIRLING_APPNAME

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/risacaph/Papyra-PDF.git}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-/opt/stirling-pdf}"
COMPOSE_FILE="docker/compose/docker-compose.selfhosted.yml"
ENV_FILE="${INSTALL_DIR}/.stirling-selfhosted.env"

STIRLING_PORT="${STIRLING_PORT:-8080}"
STIRLING_ADMIN_USERNAME="${STIRLING_ADMIN_USERNAME:-admin}"
STIRLING_APPNAME="${STIRLING_APPNAME:-Papyra}"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
    command -v sudo >/dev/null 2>&1 || die "Run as root or install sudo."
    SUDO="sudo"
fi

install_docker() {
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        log "Docker and the compose plugin are already installed."
        return
    fi
    log "Installing Docker Engine + compose plugin..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y --no-install-recommends curl ca-certificates git
    curl -fsSL https://get.docker.com | $SUDO sh
    $SUDO systemctl enable --now docker 2>/dev/null || true
    docker compose version >/dev/null 2>&1 \
        || die "Docker installed but the compose plugin is missing; install docker-compose-plugin."
}

fetch_repo() {
    $SUDO mkdir -p "$INSTALL_DIR"
    if [ -d "${INSTALL_DIR}/.git" ]; then
        log "Updating existing checkout in ${INSTALL_DIR} (branch ${BRANCH})..."
        $SUDO git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH"
        $SUDO git -C "$INSTALL_DIR" checkout -B "$BRANCH" "origin/${BRANCH}"
    else
        log "Cloning ${REPO_URL} (branch ${BRANCH}) into ${INSTALL_DIR}..."
        $SUDO git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    fi
}

resolve_password() {
    # Reuse a previously generated password so re-runs stay stable; the initial
    # admin is only created on the very first start anyway.
    if [ -n "${STIRLING_ADMIN_PASSWORD:-}" ]; then
        return
    fi
    if [ -f "$ENV_FILE" ] && grep -q '^STIRLING_ADMIN_PASSWORD=' "$ENV_FILE"; then
        STIRLING_ADMIN_PASSWORD="$($SUDO grep '^STIRLING_ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
        GENERATED_PW=0
        return
    fi
    if command -v openssl >/dev/null 2>&1; then
        STIRLING_ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
    else
        STIRLING_ADMIN_PASSWORD="$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
    fi
    GENERATED_PW=1
}

write_env() {
    log "Writing environment to ${ENV_FILE}"
    $SUDO tee "$ENV_FILE" >/dev/null <<EOF
STIRLING_PORT=${STIRLING_PORT}
STIRLING_ADMIN_USERNAME=${STIRLING_ADMIN_USERNAME}
STIRLING_ADMIN_PASSWORD=${STIRLING_ADMIN_PASSWORD}
STIRLING_APPNAME=${STIRLING_APPNAME}
EOF
    $SUDO chmod 600 "$ENV_FILE"
}

deploy() {
    log "Building and starting Papyra (first build compiles the frontend + backend; this can take several minutes)..."
    ( cd "$INSTALL_DIR" \
        && $SUDO env \
            STIRLING_PORT="$STIRLING_PORT" \
            STIRLING_ADMIN_USERNAME="$STIRLING_ADMIN_USERNAME" \
            STIRLING_ADMIN_PASSWORD="$STIRLING_ADMIN_PASSWORD" \
            STIRLING_APPNAME="$STIRLING_APPNAME" \
            docker compose -f "$COMPOSE_FILE" up -d --build )
}

main() {
    install_docker
    fetch_repo
    resolve_password
    write_env
    deploy

    local ip
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
    [ -n "$ip" ] || ip="<host-ip>"

    echo
    log "Papyra is starting."
    echo "    URL:      http://${ip}:${STIRLING_PORT}"
    echo "    Username: ${STIRLING_ADMIN_USERNAME}"
    if [ "${GENERATED_PW:-0}" -eq 1 ]; then
        echo "    Password: ${STIRLING_ADMIN_PASSWORD}   (generated — stored in ${ENV_FILE})"
    else
        echo "    Password: (as configured — see ${ENV_FILE})"
    fi
    echo
    echo "    Follow startup logs:  cd ${INSTALL_DIR} && docker compose -f ${COMPOSE_FILE} logs -f"
    echo "    The initial admin is created only on first start; change the password after logging in."
}

main "$@"
