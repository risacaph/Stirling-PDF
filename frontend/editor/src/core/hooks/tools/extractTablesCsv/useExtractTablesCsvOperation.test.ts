import { describe, expect, test } from "vitest";
import {
  buildExtractTablesCsvFormData,
  extractTablesCsvFromApiParams,
  extractTablesCsvToApiParams,
  extractTablesCsvOperationConfig,
} from "@app/hooks/tools/extractTablesCsv/useExtractTablesCsvOperation";
import {
  ExtractTablesCsvParameters,
  defaultParameters,
} from "@app/hooks/tools/extractTablesCsv/useExtractTablesCsvParameters";

const params = (
  overrides: Partial<ExtractTablesCsvParameters>,
): ExtractTablesCsvParameters => ({
  ...defaultParameters,
  ...overrides,
});

describe("extractTablesCsvOperationConfig", () => {
  test("targets the pdf/csv convert endpoint", () => {
    expect(extractTablesCsvOperationConfig.endpoint).toBe(
      "/api/v1/convert/pdf/csv",
    );
    expect(extractTablesCsvOperationConfig.operationType).toBe(
      "extractTablesCsv",
    );
  });
});

describe("extractTablesCsvToApiParams", () => {
  test("passes the page selection through", () => {
    expect(
      extractTablesCsvToApiParams(params({ pageNumbers: "1,3,5-9" })),
    ).toEqual({ pageNumbers: "1,3,5-9" });
  });

  test("defaults produce pageNumbers 'all'", () => {
    expect(extractTablesCsvToApiParams(defaultParameters)).toEqual({
      pageNumbers: "all",
    });
  });
});

describe("extractTablesCsvFromApiParams", () => {
  test("maps pageNumbers back to parameters", () => {
    expect(extractTablesCsvFromApiParams({ pageNumbers: "2n+1" })).toEqual({
      pageNumbers: "2n+1",
    });
  });

  test("omits pageNumbers when absent", () => {
    expect(extractTablesCsvFromApiParams({})).toEqual({});
  });
});

describe("extractTablesCsv round-trip", () => {
  test.each<Partial<ExtractTablesCsvParameters>>([
    { pageNumbers: "all" },
    { pageNumbers: "1" },
    { pageNumbers: "1,3,5-9" },
  ])("toApiParams(fromApiParams(x)) reproduces x %o", (overrides) => {
    const api = extractTablesCsvToApiParams(params(overrides));
    const roundTripped = extractTablesCsvToApiParams(
      params(extractTablesCsvFromApiParams(api)),
    );
    expect(roundTripped).toEqual(api);
  });
});

describe("buildExtractTablesCsvFormData", () => {
  test("appends the file and serialized page selection", () => {
    const file = new File(["x"], "test.pdf", { type: "application/pdf" });
    const formData = buildExtractTablesCsvFormData(
      params({ pageNumbers: "1,2" }),
      file,
    );

    expect(formData.get("fileInput")).toBe(file);
    expect(formData.get("pageNumbers")).toBe("1,2");
  });
});
