export interface ProfileLike {
  id: string;
  username?: string | null;
  display_name?: string | null;
  email?: string | null;
}

export const profileLabel = (profile: ProfileLike): string =>
  profile.username?.trim() || profile.display_name?.trim() || profile.email?.trim() || "user";

/**
 * Alphabetical ordering for admin user folders: username first, then display
 * name, then email, case-insensitive; id as a stable tie-breaker.
 */
export const compareProfiles = (a: ProfileLike, b: ProfileLike): number => {
  const byLabel = profileLabel(a).localeCompare(profileLabel(b), undefined, {
    sensitivity: "base",
    numeric: true,
  });
  return byLabel || a.id.localeCompare(b.id);
};

export const sortProfiles = <T extends ProfileLike>(profiles: T[]): T[] =>
  [...profiles].sort(compareProfiles);

export interface FileRowLike {
  id: string;
  name: string;
  size: number;
}

export interface DuplicateGroup<T extends FileRowLike> {
  key: string;
  name: string;
  sizeBytes: number;
  files: T[];
  /** Space wasted by every copy beyond the first one. */
  wastedBytes: number;
}

/**
 * Groups files that share the same name AND size — the reliable client-side
 * signal for "same file uploaded twice" (same name with a different size is
 * just a re-upload/overwrite, which is not a duplicate).
 */
export const groupDuplicateFiles = <T extends FileRowLike>(rows: T[]): DuplicateGroup<T>[] => {
  const map = new Map<string, T[]>();
  rows.forEach((row) => {
    const key = `${row.name.trim().toLowerCase()}|${row.size}`;
    map.set(key, [...(map.get(key) ?? []), row]);
  });

  return Array.from(map.entries())
    .filter(([, files]) => files.length > 1)
    .map(([key, files]) => ({
      key,
      name: files[0].name,
      sizeBytes: files[0].size,
      files,
      wastedBytes: (files.length - 1) * files[0].size,
    }))
    .sort((a, b) => b.wastedBytes - a.wastedBytes || a.name.localeCompare(b.name));
};

export const totalDuplicateWaste = <T extends FileRowLike>(groups: DuplicateGroup<T>[]): number =>
  groups.reduce((sum, group) => sum + group.wastedBytes, 0);

export interface AdminSearchFile {
  name: string;
  type: string;
  user_id: string;
}

/** Every term must match a filename/type or an owner's account detail. */
export const searchAdminFiles = <T extends AdminSearchFile>(
  rows: T[],
  profiles: ProfileLike[],
  query: string,
): T[] => {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return rows;
  const ownerById = new Map(profiles.map((profile) => [profile.id, profile]));

  return rows.filter((row) => {
    const fileText = `${row.name} ${row.type}`.toLocaleLowerCase();
    const owner = ownerById.get(row.user_id);
    const ownerText = `${owner?.username ?? ""} ${owner?.display_name ?? ""} ${owner?.email ?? ""}`.toLocaleLowerCase();
    return terms.every((term) => fileText.includes(term) || ownerText.includes(term));
  });
};

export const sortFilesBySize = <T extends FileRowLike>(rows: T[], direction: "asc" | "desc"): T[] =>
  [...rows].sort((a, b) =>
    (direction === "asc" ? a.size - b.size : b.size - a.size) || a.name.localeCompare(b.name),
  );

export const canReplaceWithCompressedSize = (originalBytes: number, compressedBytes: number): boolean =>
  Number.isFinite(originalBytes) && Number.isFinite(compressedBytes) && compressedBytes > 0 && compressedBytes < originalBytes;
