/**
 * Opens an app-owned page (docs, legal) that ships bundled inside the app.
 *
 * core/web: the page is served by the app at its own origin, so open it in a
 * new browser tab. The desktop (Tauri) build shadows this module to open the
 * bundled copy in an in-app window instead, so it works fully offline without
 * depending on a hosted site.
 *
 * @param path app-relative path to the bundled HTML file, e.g. "docs/index.html".
 */
import { withBasePath } from "@app/constants/app";

export type OpenBundledPage = (path: string) => Promise<void>;

export const openBundledPage: OpenBundledPage = async (path) => {
  const clean = path.startsWith("/") ? path : `/${path}`;
  window.open(withBasePath(clean), "_blank", "noopener,noreferrer");
};
