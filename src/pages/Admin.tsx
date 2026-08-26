import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Folder,
  HardDrive,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPanel } from "@/components/AdminPanel";
import { FilePreview } from "@/components/FilePreview";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { FileItem } from "@/components/FileManager";
import { formatFileSize } from "@/lib/fileUtils";
import { toast } from "sonner";

interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
}

interface AdminFileRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail: string | null;
  drive_link: string | null;
  drive_folder_link: string | null;
  folder_name: string | null;
  created_at: string;
}

const toFileItem = (row: AdminFileRow): FileItem => ({
  id: row.id,
  name: row.name,
  type: row.type,
  size: row.size,
  uploadedAt: new Date(row.created_at).toISOString().split("T")[0],
  url: row.drive_folder_link ?? row.url,
  thumbnail: row.thumbnail ?? undefined,
  drive_link: row.drive_link ?? undefined,
  drive_folder_link: row.drive_folder_link ?? undefined,
  folder_name: row.folder_name ?? undefined,
});

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const Admin = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rows, setRows] = useState<AdminFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showDelete, setShowDelete] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [profilesRes, filesRes] = await Promise.all([
      supabase.from("profiles").select("id, email, username, display_name").order("created_at"),
      supabase
        .from("files")
        .select(
          "id, user_id, name, type, size, url, thumbnail, drive_link, drive_folder_link, folder_name, created_at",
        )
        .order("created_at", { ascending: false }),
    ]);

    if (profilesRes.error) toast.error(profilesRes.error.message);
    if (filesRes.error) toast.error(filesRes.error.message);

    setProfiles((profilesRes.data as Profile[]) ?? []);
    setRows((filesRes.data as AdminFileRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const stats = useMemo(() => {
    const map = new Map<string, { count: number; bytes: number }>();
    rows.forEach((row) => {
      const entry = map.get(row.user_id) ?? { count: 0, bytes: 0 };
      entry.count += 1;
      entry.bytes += Number(row.size) || 0;
      map.set(row.user_id, entry);
    });
    return map;
  }, [rows]);

  const visibleProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      [p.username, p.email, p.display_name].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [profiles, search]);

  const openProfile = profiles.find((p) => p.id === openUserId) ?? null;
  const openFiles = useMemo(
    () => (openUserId ? rows.filter((r) => r.user_id === openUserId) : []),
    [rows, openUserId],
  );

  const totalBytes = rows.reduce((sum, r) => sum + (Number(r.size) || 0), 0);

  const handleDelete = async (fileId: string) => {
    const { error } = await supabase.from("files").delete().eq("id", fileId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("File deleted");
    setSelectedFile((current) => (current?.id === fileId ? null : current));
    load();
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-surface p-4 sm:p-6 space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-6">
        <Card className="p-6 max-w-sm text-center space-y-3">
          <h1 className="text-lg font-semibold text-foreground">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            You need to be signed in with an administrator account to open this dashboard.
          </p>
          <Button asChild className="w-full">
            <Link to="/">Back to files</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-3 sm:px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/" aria-label="Back to files">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">
              Admin dashboard
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              User folders, storage usage and uploads
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </header>

      <main className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {!openProfile ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="p-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Users</p>
                  <p className="text-lg font-semibold">{profiles.length}</p>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <Database className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Files</p>
                  <p className="text-lg font-semibold">{rows.length}</p>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3 col-span-2 lg:col-span-1">
                <HardDrive className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total volume</p>
                  <p className="text-lg font-semibold">{megabytes(totalBytes)}</p>
                </div>
              </Card>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by name or email"
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleProfiles.map((profile) => {
                  const stat = stats.get(profile.id) ?? { count: 0, bytes: 0 };
                  return (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setOpenUserId(profile.id);
                        setSelectedFile(null);
                      }}
                      className="text-left"
                    >
                      <Card className="p-4 hover:shadow-md transition-shadow h-full">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                            <Folder className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {profile.username || profile.display_name || "user"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {profile.email}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="secondary">{stat.count} files</Badge>
                              <Badge variant="outline">{megabytes(stat.bytes)}</Badge>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                      </Card>
                    </button>
                  );
                })}
                {visibleProfiles.length === 0 && (
                  <p className="text-sm text-muted-foreground">No users match that search.</p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpenUserId(null);
                  setSelectedFile(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All users
              </Button>
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground truncate">
                  {openProfile.username || openProfile.display_name || "user"}
                </h2>
                <p className="text-xs text-muted-foreground truncate">{openProfile.email}</p>
              </div>
              <label className="flex items-center gap-2 ml-auto text-sm text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={showDelete}
                  onCheckedChange={(checked) => setShowDelete(Boolean(checked))}
                  aria-label="Show delete icons"
                />
                Show delete
              </label>
              <Badge variant="outline">
                {megabytes(stats.get(openProfile.id)?.bytes ?? 0)} used
              </Badge>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,380px)_1fr] gap-4">
              <div className="space-y-4">
                <Card className="overflow-hidden">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium">Upload to this folder</p>
                  </div>
                  <AdminPanel targetUserId={openProfile.id} onFileUpload={() => load()} />
                </Card>

                <Card className="divide-y divide-border max-h-[60vh] overflow-y-auto">
                  {openFiles.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">
                      This user has no files yet.
                    </p>
                  )}
                  {openFiles.map((row) => (
                    <div
                      key={row.id}
                      className={`flex items-center gap-2 p-3 ${
                        selectedFile?.id === row.id ? "bg-accent" : ""
                      }`}
                    >
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => setSelectedFile(toFileItem(row))}
                      >
                        <p className="text-sm font-medium truncate">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(Number(row.size) || 0)} ·{" "}
                          {new Date(row.created_at).toLocaleDateString()}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${row.name}`}
                        onClick={() => handleDelete(row.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </Card>
              </div>

              <Card className="p-2 sm:p-4 min-h-[50vh]">
                <ErrorBoundary resetKey={selectedFile?.id ?? "none"}>
                  <FilePreview
                    key={selectedFile?.id ?? "none"}
                    file={selectedFile}
                    onDelete={handleDelete}
                    isAdmin
                    isLoading={false}
                  />
                </ErrorBoundary>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
