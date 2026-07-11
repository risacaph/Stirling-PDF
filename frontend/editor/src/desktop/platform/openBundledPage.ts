/**
 * Desktop (Tauri) override of the @app/platform/openBundledPage seam.
 *
 * The docs/legal HTML ships inside the app bundle and is served from the app's
 * own tauri:// origin, so a normal browser tab (window.open) can't reach it and
 * the OS browser (shell open) can't load the internal asset URL. Instead we
 * spawn a dedicated in-app webview window pointed at the bundled file, so the
 * page works fully offline with no hosted site required.
 *
 * The "main-" label prefix makes the new window match the "main-*" glob in the
 * capabilities file, so it inherits the app's default capability set.
 */
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { OpenBundledPage } from "@core/platform/openBundledPage";

export type { OpenBundledPage } from "@core/platform/openBundledPage";

export const openBundledPage: OpenBundledPage = async (path) => {
  const relative = path.startsWith("/") ? path.slice(1) : path;
  const label = `main-page-${relative.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;

  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.setFocus();
    return;
  }

  const webview = new WebviewWindow(label, {
    url: relative,
    title: "Papyra",
    width: 1100,
    height: 800,
  });
  webview.once("tauri://error", (event) => {
    console.error("[openBundledPage] failed to open window:", event.payload);
  });
};
