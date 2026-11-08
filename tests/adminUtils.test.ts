import { expect, test } from "bun:test";
import {
  canReplaceWithCompressedSize,
  groupDuplicateFiles,
  profileLabel,
  searchAdminFiles,
  sortFilesBySize,
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

test("All-files search matches filename keywords and the owner's username", () => {
  const rows = [
    { id: "a", name: "Quarterly report.pdf", type: "pdf", user_id: "u1", size: 200 },
    { id: "b", name: "Vacation.jpg", type: "image", user_id: "u2", size: 500 },
  ];
  const profiles = [
    { id: "u1", username: "mira", email: "mira@example.com" },
    { id: "u2", username: "alex", email: "alex@example.com" },
  ];
  expect(searchAdminFiles(rows, profiles, "quarterly pdf").map((row) => row.id)).toEqual(["a"]);
  expect(searchAdminFiles(rows, profiles, "alex").map((row) => row.id)).toEqual(["b"]);
});

test("All-files size sorting supports smallest-first and largest-first", () => {
  const rows = [
    { id: "large", name: "large.pdf", size: 900 },
    { id: "small", name: "small.pdf", size: 100 },
    { id: "medium", name: "medium.pdf", size: 500 },
  ];
  expect(sortFilesBySize(rows, "asc").map((row) => row.id)).toEqual(["small", "medium", "large"]);
  expect(sortFilesBySize(rows, "desc").map((row) => row.id)).toEqual(["large", "medium", "small"]);
});

test("Compression replacement is allowed only when the new file is smaller", () => {
  expect(canReplaceWithCompressedSize(516_000, 200_000)).toBe(true);
  expect(canReplaceWithCompressedSize(516_000, 516_000)).toBe(false);
  expect(canReplaceWithCompressedSize(516_000, 600_000)).toBe(false);
});
