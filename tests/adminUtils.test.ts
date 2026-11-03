import { expect, test } from "bun:test";
import {
  groupDuplicateFiles,
  profileLabel,
  sortProfiles,
  totalDuplicateWaste,
} from "../src/lib/adminUtils";

test("Users organize alphabetically by username, case-insensitive", () => {
  const sorted = sortProfiles([
    { id: "3", username: "Guriapar", email: "g@x.com" },
    { id: "1", username: "alice", email: "a@x.com" },
    { id: "2", username: "Mohan", email: "m@x.com" },
  ]);
  expect(sorted.map((p) => p.username)).toEqual(["alice", "Guriapar", "Mohan"]);
});

test("Users without a username fall back to display name then email", () => {
  expect(profileLabel({ id: "1", username: null, display_name: "N. Sutradhar", email: "n@x.com" })).toBe("N. Sutradhar");
  expect(profileLabel({ id: "2", username: null, display_name: null, email: "b@x.com" })).toBe("b@x.com");
  expect(profileLabel({ id: "3" })).toBe("user");
});

test("Duplicate files group by name AND size; same name different size is not a duplicate", () => {
  const rows = [
    { id: "a", name: "NOCA Excel.xlsx", size: 516000, user_id: "u1" },
    { id: "b", name: "noca excel.xlsx", size: 516000, user_id: "u2" },
    { id: "c", name: "report.pdf", size: 200000, user_id: "u1" },
    { id: "d", name: "report.pdf", size: 350000, user_id: "u2" },
  ];
  const groups = groupDuplicateFiles(rows);
  expect(groups).toHaveLength(1);
  expect(groups[0].files.map((f) => f.id)).toEqual(["a", "b"]);
  expect(groups[0].wastedBytes).toBe(516000);
  expect(totalDuplicateWaste(groups)).toBe(516000);
});

test("Unique files produce no duplicate groups", () => {
  const groups = groupDuplicateFiles([
    { id: "a", name: "one.pdf", size: 100 },
    { id: "b", name: "two.pdf", size: 200 },
  ]);
  expect(groups).toHaveLength(0);
});
