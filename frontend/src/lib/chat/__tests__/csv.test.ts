import { describe, it, expect } from "vitest";
import { toCsv, tableToCsv, buildResultsFilename, CSV_BOM } from "../csv";

describe("CSV export", () => {
  it("1. يحفظ رؤوس الأعمدة والصفوف بترتيبها", () => {
    const csv = toCsv(["الكلية", "عدد الطلاب"], [["كلية الهندسة", 1250], ["كلية العلوم", 980]]);
    expect(csv.split("\r\n")).toEqual([
      "الكلية,عدد الطلاب",
      "كلية الهندسة,1250",
      "كلية العلوم,980",
    ]);
  });

  it("2. يهرّب الفواصل وعلامات التنصيص والأسطر الجديدة", () => {
    const csv = toCsv(["البند"], [["هندسة, علوم"], ['خط "خاص"'], ["سطر\nجديد"]]);
    expect(csv.split("\r\n")).toEqual([
      "البند",
      '"هندسة, علوم"',
      '"خط ""خاص"""',
      '"سطر\nجديد"',
    ]);
  });

  it("3. يحوّل القيم الفارغة والممنوعة إلى خلايا صالحة", () => {
    const csv = toCsv(["أ", "ب", "ج", "د"], [[null, undefined, true, false]]);
    expect(csv.split("\r\n")[1]).toBe(",,نعم,لا");
  });

  it("4. يعيد نصاً فارغاً عند غياب الجدول", () => {
    expect(tableToCsv(null)).toBe("");
    expect(tableToCsv(undefined)).toBe("");
    expect(toCsv([], [])).toBe("");
  });

  it("5. يبني اسم ملف بصيغة ثابتة قابلة للفرز", () => {
    const filename = buildResultsFilename(new Date(2026, 0, 22, 9, 5));
    expect(filename).toBe("bayan-results-20260122-0905.csv");
  });

  it("6. يحتفظ بعلامة BOM لترميز UTF-8", () => {
    expect(CSV_BOM).toBe("\uFEFF");
  });
});
