#!/usr/bin/env bash
#
# proxmox-lxc.sh — run this ON THE PROXMOX VE HOST.
#
# Creates a Docker-ready Debian LXC and installs the self-hosted,
# license-unlocked Papyra from this fork inside it (via the embedded
# Docker image, which bundles LibreOffice/unoserver/OCR/etc.). Same
# "one command on the host" experience as the community helper scripts, but it
# deploys THIS fork instead of the upstream release.
#
# Usage (on the PVE host shell):
#   bash <(curl -fsSL https://raw.githubusercontent.com/risacaph/Papyra-PDF/main/deploy/proxmox-lxc.sh)
#
# Tunables (override via environment), with defaults sized for building the
# image from source:
#   CTID, CT_HOSTNAME, CORES, RAM_MB, DISK_GB, BRIDGE, STORAGE,
#   TEMPLATE_STORAGE, OSVER, REPO_URL, BRANCH, STIRLING_ADMIN_PASSWORD
#
# Notes:
#   * The container is unprivileged with nesting+keyctl enabled (needed for
#     Docker inside LXC).
#   * The first run builds the frontend + backend, so give it real resources
#     (defaults: 2 cores / 4 GB RAM / 16 GB disk) and expect several minutes.

set -euo pipefail

CTID="${CTID:-}"
CT_HOSTNAME="${CT_HOSTNAME:-papyra}"
CORES="${CORES:-2}"
RAM_MB="${RAM_MB:-4096}"
DISK_GB="${DISK_GB:-16}"
BRIDGE="${BRIDGE:-vmbr0}"
STORAGE="${STORAGE:-}"
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"
OSVER="${OSVER:-12}"
REPO_URL="${REPO_URL:-https://github.com/risacaph/Papyra-PDF.git}"
BRANCH="${BRANCH:-main}"
STIRLING_ADMIN_PASSWORD="${STIRLING_ADMIN_PASSWORD:-}"
INSTALLER_URL="${INSTALLER_URL:-https://raw.githubusercontent.com/risacaph/Papyra-PDF/${BRANCH}/deploy/proxmox-install.sh}"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

command -v pct >/dev/null 2>&1 || die "This script must run on a Proxmox VE host (pct not found)."
[ "$(id -u)" -eq 0 ] || die "Run as root on the Proxmox host."

# --- Pick a container ID -------------------------------------------------
if [ -z "$CTID" ]; then
    CTID="$(pvesh get /cluster/nextid 2>/dev/null || true)"
    [ -n "$CTID" ] || die "Could not determine a free CTID; set CTID=<id>."
fi
pct status "$CTID" >/dev/null 2>&1 && die "CTID ${CTID} already exists; set CTID=<free-id>."

# --- Pick a rootfs storage (must support container rootdir) --------------
if [ -z "$STORAGE" ]; then
    STORAGE="$(pvesm status --content rootdir 2>/dev/null | awk 'NR>1 && $3=="active"{print $1; exit}')"
    [ -n "$STORAGE" ] || STORAGE="$(pvesm status --content rootdir 2>/dev/null | awk 'NR>1{print $1; exit}')"
    [ -n "$STORAGE" ] || die "No storage supporting container rootfs found; set STORAGE=<name>."
fi
log "Using CTID=${CTID}, rootfs storage=${STORAGE}, template storage=${TEMPLATE_STORAGE}"

# --- Ensure a Debian template is available -------------------------------
log "Resolving Debian ${OSVER} template..."
pveam update >/dev/null 2>&1 || warn "pveam update failed; continuing with cached template list."
TEMPLATE="$(pveam list "$TEMPLATE_STORAGE" 2>/dev/null \
    | awk '{print $1}' | sed 's#.*/##' \
    | grep -E "^debian-${OSVER}-standard" | sort -V | tail -1 || true)"
if [ -z "$TEMPLATE" ]; then
    TEMPLATE="$(pveam available --section system 2>/dev/null \
        | awk '{print $2}' | grep -E "^debian-${OSVER}-standard" | sort -V | tail -1 || true)"
    [ -n "$TEMPLATE" ] || die "No debian-${OSVER}-standard template available; try OSVER=13 or check 'pveam available'."
    log "Downloading template ${TEMPLATE} to ${TEMPLATE_STORAGE}..."
    pveam download "$TEMPLATE_STORAGE" "$TEMPLATE"
fi
TEMPLATE_REF="${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE}"

# --- Create + start the container ----------------------------------------
log "Creating LXC ${CTID} (${CORES} cores, ${RAM_MB} MB RAM, ${DISK_GB} GB disk)..."
pct create "$CTID" "$TEMPLATE_REF" \
    --hostname "$CT_HOSTNAME" \
    --cores "$CORES" \
    --memory "$RAM_MB" \
    --swap 512 \
    --rootfs "${STORAGE}:${DISK_GB}" \
    --net0 "name=eth0,bridge=${BRIDGE},ip=dhcp" \
    --unprivileged 1 \
    --features "nesting=1,keyctl=1" \
    --ostype debian \
    --onboot 1 \
    --description "Papyra (self-hosted, license-unlocked fork)"

log "Starting container..."
pct start "$CTID"

# --- Wait for networking -------------------------------------------------
log "Waiting for network + apt..."
for _ in $(seq 1 30); do
    if pct exec "$CTID" -- bash -c "apt-get update >/dev/null 2>&1"; then
        break
    fi
    sleep 5
done

# --- Install Papyra inside the container ----------------------------------
log "Installing Docker + Papyra inside the container (first build takes several minutes)..."
pct exec "$CTID" -- bash -c "apt-get install -y curl >/dev/null 2>&1"
pct exec "$CTID" -- env \
    REPO_URL="$REPO_URL" \
    BRANCH="$BRANCH" \
    STIRLING_ADMIN_PASSWORD="$STIRLING_ADMIN_PASSWORD" \
    bash -c "curl -fsSL '${INSTALLER_URL}' | bash"

# --- Report --------------------------------------------------------------
IP="$(pct exec "$CTID" -- bash -c "hostname -I 2>/dev/null | awk '{print \$1}'" || true)"
[ -n "$IP" ] || IP="<container-ip>"

echo
log "Papyra LXC ${CTID} is up."
echo "    URL: http://${IP}:8080"
echo "    Credentials were printed above and saved inside the container at:"
echo "      /opt/stirling-pdf/.stirling-selfhosted.env"
echo "    Enter the container:   pct enter ${CTID}"
echo "    Follow startup logs:   pct exec ${CTID} -- bash -c 'cd /opt/stirling-pdf && docker compose -f docker/compose/docker-compose.selfhosted.yml logs -f'"
