import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useViewer } from "@app/contexts/ViewerContext";
import { useDocumentReady } from "@app/components/viewer/hooks/useDocumentReady";
import { printPdfViaIframe } from "@app/utils/printPdf";
import { alert } from "@app/components/toast";

export interface PrintAPIBridgeProps {
  file?: File | Blob;
  url?: string | null;
  fileName?: string;
}

/**
 * Connects PDF printing to the shared ViewerContext.
 *
 * Prints via an off-screen iframe (see printPdfViaIframe) rather than the
 * viewer plugin's display:none frame, which Chromium/WebView2 will not print.
 */
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
          void printPdfViaIframe({ file, url, fileName }).catch((error) => {
            console.error("[Print] Print failed", error);
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
