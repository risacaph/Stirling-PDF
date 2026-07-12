import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useViewer } from "@app/contexts/ViewerContext";
import { useDocumentReady } from "@app/components/viewer/hooks/useDocumentReady";
import { printPdfNatively } from "@app/services/nativePrintService";
import { printPdfViaIframe } from "@app/utils/printPdf";
import { alert } from "@app/components/toast";
import { DesktopOs, getDesktopOs } from "@app/services/platformService";
import { PrintAPIBridgeProps } from "@core/components/viewer/PrintAPIBridge";

export function PrintAPIBridge({ file, url, fileName }: PrintAPIBridgeProps) {
  const { registerBridge } = useViewer();
  const documentReady = useDocumentReady();
  const { t } = useTranslation();

  useEffect(() => {
    if (!documentReady) {
      return;
    }

    registerBridge("print", {
      state: {},
      api: {
        print: () => {
          void (async () => {
            // macOS (WKWebView) and Linux (WebKitGTK) can't reliably print a PDF
            // through an iframe, so they print natively (PDFKit / CUPS `lp`).
            // Windows (WebView2/Chromium) prints the off-screen iframe like the web build.
            const os = await getDesktopOs();
            if (os === DesktopOs.Mac || os === DesktopOs.Linux) {
              await printPdfNatively(file, url, fileName);
              return;
            }
            await printPdfViaIframe({ file, url, fileName });
          })().catch((error) => {
            console.error("[Desktop Print] Print failed", error);
            alert({
              alertType: "warning",
              title: t("print.failedTitle", "Couldn't open the print dialog"),
              body: t(
                "print.failedBody",
                "Your browser blocked printing, or this PDF can't be printed here. Try downloading it and printing from your PDF viewer.",
              ),
            });
          });
        },
      },
    });

    return () => {
      registerBridge("print", null);
    };
  }, [documentReady, file, url, fileName, registerBridge, t]);

  return null;
}
