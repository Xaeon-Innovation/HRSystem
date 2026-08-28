import { describe, expect, it } from "vitest";
import {
  evaluateEmployeeDraft,
  emptyEmployeeDraft,
  isEmployeeDraftComplete,
  parseEmployeeCsv,
  parseCsvLine,
} from "./employee-import.js";

describe("parseCsvLine", () => {
  it("keeps commas inside quotes", () => {
    expect(parseCsvLine('Amina,"12 Nile St, Cairo",x')).toEqual([
      "Amina",
      "12 Nile St, Cairo",
      "x",
    ]);
  });
});

describe("parseEmployeeCsv", () => {
  it("flags missing required fields and does not treat the row as complete", () => {
    const csv = `name,email,phone,role,jobTitle
Amina Hassan,amina@co.com,,employee,Tech`;
    const preview = parseEmployeeCsv(csv);
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].missing).toEqual(
      expect.arrayContaining([
        "phone",
        "nationalId",
        "dateOfBirth",
        "address",
        "hireDate",
      ]),
    );
    expect(isEmployeeDraftComplete(preview.rows[0].data)).toBe(false);
  });

  it("accepts a complete row with date aliases", () => {
    const csv = `full_name,email,phone,role,job_title,national_id,dob,address,hire_date
Amina Hassan,amina@co.com,+201000000001,employee,Field technician,29001011234567,15/01/1990,"12 Nile St, Cairo",2024-03-01`;
    const preview = parseEmployeeCsv(csv);
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].data.dateOfBirth).toBe("1990-01-15");
    expect(preview.rows[0].missing).toEqual([]);
    expect(preview.rows[0].errors).toEqual([]);
    expect(isEmployeeDraftComplete(preview.rows[0].data)).toBe(true);
  });
});

describe("evaluateEmployeeDraft", () => {
  it("requires personal fields on a blank draft", () => {
    const { missing } = evaluateEmployeeDraft(emptyEmployeeDraft());
    expect(missing).toEqual(
      expect.arrayContaining(["name", "email", "phone", "jobTitle"]),
    );
  });
});
