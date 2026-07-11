// Centralized download URLs for Papyra. The self-hosted fork is distributed through its GitHub
// releases rather than a dedicated download host, so all download entry points route there.
export const PAPYRA_RELEASES_URL =
  "https://github.com/risacaph/Papyra-PDF/releases";

export const DOWNLOAD_URLS = {
  WINDOWS: PAPYRA_RELEASES_URL,
  MAC: PAPYRA_RELEASES_URL,
  LINUX_DOCS: PAPYRA_RELEASES_URL,
} as const;

export const DOWNLOAD_BASE_URL = `${PAPYRA_RELEASES_URL}/`;
