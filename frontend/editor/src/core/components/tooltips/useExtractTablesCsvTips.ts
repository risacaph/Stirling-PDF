import { useTranslation } from "react-i18next";
import { TooltipContent } from "@app/types/tips";

export const useExtractTablesCsvTips = (): TooltipContent => {
  const { t } = useTranslation();

  return {
    header: {
      title: t(
        "extractTablesCsv.tooltip.header.title",
        "Extract Tables to CSV Overview",
      ),
    },
    tips: [
      {
        title: t("extractTablesCsv.tooltip.description.title", "Description"),
        description: t(
          "extractTablesCsv.tooltip.description.text",
          "Detects tables in a PDF and exports their contents as CSV. Useful for pulling structured data out of reports, invoices and statements for use in a spreadsheet.",
        ),
      },
      {
        title: t("extractTablesCsv.tooltip.output.title", "Single file or ZIP"),
        description: t(
          "extractTablesCsv.tooltip.output.text",
          "When one table is found you get a single CSV file. When several tables (or pages) are detected you get a ZIP containing one CSV per table.",
        ),
      },
      {
        title: t("extractTablesCsv.tooltip.pages.title", "Page selection"),
        description: t(
          "extractTablesCsv.tooltip.pages.text",
          "Limit the scan to specific pages with a list or ranges (e.g. 1,3,5-9), or leave it as 'all' to scan the whole document.",
        ),
      },
    ],
  };
};
