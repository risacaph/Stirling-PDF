/**
 * Robust client-side PDF printing.
 *
 * Prints a PDF through a hidden iframe that is positioned OFF-SCREEN rather than
 * hidden with `display:none`. Chromium (and therefore WebView2, the Windows
 * desktop webview) refuses to print a `display:none` frame because it has no
 * layout, which is the main reason the Print button appeared to do nothing.
 * An off-screen-but-laid-out frame prints reliably in browsers and WebView2.
 *
 * macOS (WKWebView) cannot print iframes at all, so the desktop build uses a
 * native print path there instead of this helper.
 */

export interface PrintSource {
  file?: File | Blob;
  url?: string | null;
  fileName?: string;
}

// Keep the iframe/object URL alive long enough for the print dialog + spooling
// to read from it, then clean up. Revoking immediately cancels the print.
const PRINT_CLEANUP_DELAY_MS = 60_000;

async function resolveBlob(source: PrintSource): Promise<Blob | null> {
  if (source.file) {
    return source.file;
  }
  if (!source.url) {
    return null;
  }
  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`Failed to load PDF for printing (${response.status})`);
  }
  return response.blob();
}

export async function printPdfViaIframe(source: PrintSource): Promise<void> {
  if (typeof document === "undefined") {
    throw new Error("Printing is only available in a browser context");
  }

  const blob = await resolveBlob(source);
  if (!blob) {
    throw new Error("No PDF source available to print");
  }

  const objectUrl = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = source.fileName ?? "print";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  const cleanup = () => {
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      iframe.remove();
    }, PRINT_CLEANUP_DELAY_MS);
  };

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => {
        const win = iframe.contentWindow;
        if (!win) {
          reject(new Error("Print frame has no content window"));
          return;
        }
        try {
          win.focus();
          win.print();
          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };
      iframe.onerror = () =>
        reject(new Error("Failed to load the PDF into the print frame"));
      document.body.appendChild(iframe);
      iframe.src = objectUrl;
    });
    cleanup();
  } catch (error) {
    cleanup();
    throw error;
  }
}
