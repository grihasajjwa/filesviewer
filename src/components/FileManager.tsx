import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileList } from "./FileList";
import { FilePreview } from "./FilePreview";
import { ErrorBoundary } from "./ErrorBoundary";
import { AdminPanel } from "./AdminPanel";
import { Auth } from "./Auth";
import { Button } from "@/components/ui/button";
import { User, Shield, Menu, LayoutDashboard } from "lucide-react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import DevDebugPanel from "./DevDebugPanel";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  url: string;
  thumbnail?: string;
  drive_link?: string;
  drive_folder_link?: string;
  folder_name?: string;
  folderFiles?: FileItem[];
  sharedByUsername?: string;
}

const mockFiles: FileItem[] = [
  {
    id: "1",
    name: "Project_Proposal.pdf",
    type: "pdf",
    size: 2.5 * 1024 * 1024,
    uploadedAt: "2024-01-15",
    url: "/sample.pdf",
  },
  {
    id: "2", 
    name: "Design_Mockups.png",
    type: "image",
    size: 1.8 * 1024 * 1024,
    uploadedAt: "2024-01-14",
    url: "/placeholder.svg",
  },
  {
    id: "3",
    name: "Technical_Specs.docx",
    type: "document",
    size: 0.9 * 1024 * 1024,
    uploadedAt: "2024-01-13",
    url: "/sample.docx",
  },
  {
    id: "4",
    name: "Budget_Analysis.xlsx",
    type: "spreadsheet", 
    size: 1.2 * 1024 * 1024,
    uploadedAt: "2024-01-12",
    url: "/sample.xlsx",
  },
  {
    id: "5",
    name: "Presentation_Slides.pptx",
    type: "presentation",
    size: 3.1 * 1024 * 1024,
    uploadedAt: "2024-01-11",
    url: "/sample.pptx",
  },
];

export const FileManager = () => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isPreviewSwitching, setIsPreviewSwitching] = useState(false);
  const [previewSwitchKey, setPreviewSwitchKey] = useState(0);
  const { isAdmin: canUseAdmin } = useUserRole();
  // Upload mode is available to every signed-in user so they can upload
  // files to their own folder; only real admins get the Dashboard.
  const [adminMode, setAdminMode] = useState(false);
  const isAdmin = adminMode;
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  // Keep a session-change fetch from being lost while another fetch is active.
  const fetchInProgressRef = useRef(false);
  const pendingFetchUserIdRef = useRef<string | null>(null);
  // Ref to ensure we show the network/CORS error only once
  const networkErrorShownRef = useRef(false);

  const filteredFiles = useMemo(() => {
    return files.filter(file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  const handleFileSelect = (file: FileItem | null) => {
    if (!file) {
      setPreviewSwitchKey((prev) => prev + 1);
      setSelectedFile(null);
      setIsPreviewSwitching(false);
      setHasInitializedSelection(false);
      return;
    }

    const matchedFile = files.find((item) => item.id === file.id) ?? file;
    if (selectedFile?.id === matchedFile.id && !isPreviewSwitching) return;

    setPreviewSwitchKey((prev) => prev + 1);
    setIsPreviewSwitching(true);
    setSelectedFile(matchedFile);
    setHasInitializedSelection(true);
  };

  const fetchFiles = async (userId: string, retryAfterRefresh = true) => {
    if (fetchInProgressRef.current) {
      pendingFetchUserIdRef.current = userId;
      return;
    }
    fetchInProgressRef.current = true;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .or('folder_name.is.null,type.eq.folder')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching files:', error);
        if (retryAfterRefresh) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed.session?.user) {
            await fetchFiles(refreshed.session.user.id, false);
            return;
          }
        }
        // Show the error toast only once to avoid spamming the user
        if (!networkErrorShownRef.current) {
          networkErrorShownRef.current = true;
          toast.error(error.message || 'Failed to fetch files (Supabase error)');
        }
        return;
      }

      const formattedFiles: FileItem[] = data.map(file => {
        if (file.drive_link) {
          const fileId = extractDriveFileId(file.drive_link);
          return {
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(file.created_at).toISOString().split('T')[0],
            url: `https://drive.google.com/uc?id=${fileId}&export=download`,
            thumbnail: file.thumbnail,
            drive_link: file.drive_link,
          };
        }
        if (file.drive_folder_link) {
          return {
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(file.created_at).toISOString().split('T')[0],
            url: file.drive_folder_link,
            thumbnail: file.thumbnail,
            drive_folder_link: file.drive_folder_link,
            folder_name: file.folder_name,
          };
        }
        if (file.type === "folder" && file.folder_name) {
          // For local folders, we need to fetch the folder files
          return {
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(file.created_at).toISOString().split('T')[0],
            url: file.url,
            thumbnail: file.thumbnail,
            folder_name: file.folder_name,
            folderFiles: [], // Will be populated later
          };
        }
        return {
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date(file.created_at).toISOString().split('T')[0],
          url: file.url,
          thumbnail: file.thumbnail,
          folder_name: file.folder_name,
        };
      });

      // Fetch all local-folder contents in one request instead of blocking page
      // startup with one network round trip per folder.
      const folders = formattedFiles.filter(file => file.type === "folder" && file.folder_name && !file.drive_folder_link);
      const folderNames = folders
        .map((folder) => folder.folder_name)
        .filter((folderName): folderName is string => Boolean(folderName));

      if (folderNames.length > 0) {
        const { data: folderFiles, error: folderFilesError } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', userId)
            .in('folder_name', folderNames)
            .neq('type', 'folder')
            .order('created_at', { ascending: false });

        if (folderFilesError) {
          console.error('Error fetching folder files:', folderFilesError);
        } else if (folderFiles) {
          const filesByFolder = new Map<string, FileItem[]>();
          folderFiles.forEach((folderFile) => {
            if (!folderFile.folder_name) return;
            const existingFiles = filesByFolder.get(folderFile.folder_name) ?? [];
            existingFiles.push({
              id: folderFile.id,
              name: folderFile.name,
              type: folderFile.type,
              size: folderFile.size,
              uploadedAt: new Date(folderFile.created_at).toISOString().split('T')[0],
              url: folderFile.url,
              thumbnail: folderFile.thumbnail,
              folder_name: folderFile.folder_name,
            });
            filesByFolder.set(folderFile.folder_name, existingFiles);
          });

          folders.forEach((folder) => {
            folder.folderFiles = folder.folder_name
              ? filesByFolder.get(folder.folder_name) ?? []
              : [];
          });
        }
      }

      // Files other users shared with this user
      const { data: incomingShares } = await supabase
        .from('file_user_shares')
        .select('file_id, shared_by_username')
        .eq('shared_with_user_id', userId);

      if (incomingShares && incomingShares.length > 0) {
        const sharedIds = incomingShares.map((s) => s.file_id);
        const { data: sharedRows } = await supabase
          .from('files')
          .select('*')
          .in('id', sharedIds);

        const sharedByMap = new Map(
          incomingShares.map((s) => [s.file_id, s.shared_by_username ?? 'another user']),
        );

        (sharedRows ?? []).forEach((row) => {
          if (formattedFiles.some((f) => f.id === row.id)) return;
          formattedFiles.push({
            id: row.id,
            name: row.name,
            type: row.type,
            size: row.size,
            uploadedAt: new Date(row.created_at).toISOString().split('T')[0],
            url: row.drive_folder_link ?? row.drive_link ?? row.url,
            thumbnail: row.thumbnail ?? undefined,
            drive_link: row.drive_link ?? undefined,
            drive_folder_link: row.drive_folder_link ?? undefined,
            folder_name: row.folder_name ?? undefined,
            sharedByUsername: sharedByMap.get(row.id),
          });
        });
      }

      setFiles(formattedFiles);
    } catch (err: any) {
      console.error('Error fetching files:', err);

      // Detect network/CORS errors that surface as a TypeError: Failed to fetch
      const isNetworkError =
        err instanceof TypeError ||
        (err && typeof err.message === 'string' && err.message.includes('Failed to fetch'));

      if (isNetworkError) {
        // Provide a clear developer hint in console and show a toast with guidance only once
        console.error(
          'Likely a network/CORS issue. Check Supabase project settings: allowed origins (CORS) and redirect URLs.\n' +
            'Ensure your dev origin (eg. http://localhost:5173 or http://127.0.0.1:5173) is added, and that the publishable anon key in client.ts is correct.'
        );
        if (!networkErrorShownRef.current) {
          networkErrorShownRef.current = true;
          toast.error(
            'Network error fetching files — check Supabase CORS/origins and anon key. Using local mock files as a fallback.'
          );
        }

        // Use mock files as a safe development fallback so the UI remains usable
        // Only set mock files if we don't already have files
        setFiles(prev => (prev.length === 0 ? mockFiles : prev));
      } else {
        if (!networkErrorShownRef.current) {
          networkErrorShownRef.current = true;
          toast.error('Failed to fetch files');
        }
      }
    } finally {
      fetchInProgressRef.current = false;
      setLoading(false);
      const pendingUserId = pendingFetchUserIdRef.current;
      pendingFetchUserIdRef.current = null;
      if (pendingUserId) {
        void fetchFiles(pendingUserId);
      }
    }
  };

  const extractDriveFileId = (url: string) => {
    const regex = /(?:https?:\/\/)?(?:www\.)?drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const fetchDriveMetadata = async (fileId) => {
    const apiKey = "YOUR_GOOGLE_DRIVE_API_KEY"; // Replace with your API key
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size&key=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error fetching metadata: ${response.statusText}`);
      }
      const metadata = await response.json();
      return {
        name: metadata.name,
        type: metadata.mimeType,
        size: parseInt(metadata.size, 10),
        url: `https://drive.google.com/uc?id=${fileId}&export=download`,
      };
    } catch (error) {
      console.error("Failed to fetch Google Drive metadata:", error);
      return null;
    }
  };

  const handleFileUpload = (newFiles: FileItem[]) => {
    setFiles((prev) => {
      const updatedFiles = [...newFiles, ...prev];
      if (JSON.stringify(updatedFiles) !== JSON.stringify(prev)) {
        return updatedFiles;
      }
      return prev;
    });

    if (newFiles.length > 0) {
      setSelectedFile(newFiles[0]);
    }
  };

  const handleAuthChange = (newUser: SupabaseUser | null, newSession: Session | null) => {
    setUser(newUser);
    setSession(newSession);
    setAuthReady(true);
    setLoading(false);
    
    // Reset admin status when user changes
    if (!newUser) {
      pendingFetchUserIdRef.current = null;
      setAdminMode(false);
      setFiles([]);
      setSelectedFile(null);
    } else {
      // Fetch files when user logs in
      fetchFiles(newUser.id);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!isAdmin) {
      toast.error('Only admins can delete files.');
      return;
    }

    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (error) {
        console.error('Error deleting file:', error);
        toast.error('Failed to delete file.');
        return;
      }

      toast.success('File deleted successfully.');

      // Refresh the file list and reset the right-side viewer
      if (user) {
        await fetchFiles(user.id);
      }
      setSelectedFile(null); // Clear the selected file to refresh the viewer
    } catch (err) {
      console.error('Unexpected error deleting file:', err);
      toast.error('An unexpected error occurred.');
    }
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
    if (!isAdmin) {
      toast.error('Only admins can rename files.');
      return;
    }

    try {
      const { error } = await supabase
        .from('files')
        .update({ name: newName })
        .eq('id', fileId);

      if (error) {
        console.error('Error renaming file:', error);
        toast.error('Failed to rename file.');
        return;
      }

      toast.success('File renamed successfully.');

      // Refresh the file list
      if (user) {
        await fetchFiles(user.id);
      }
    } catch (err) {
      console.error('Unexpected error renaming file:', err);
      toast.error('An unexpected error occurred.');
    }
  };

  // Keep the selection valid whenever the file list changes
  useEffect(() => {
    if (files.length === 0) {
      setSelectedFile(null);
      setHasInitializedSelection(false);
      return;
    }

    setSelectedFile((current) => {
      if (current && files.some((file) => file.id === current.id)) {
        // refresh reference so metadata stays in sync
        return files.find((file) => file.id === current.id) ?? current;
      }
      return files[0];
    });
    setHasInitializedSelection(true);
  }, [files]);


  // Initial auth check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      handleAuthChange(user, session);
    });

    // Do not treat a slow storage/network read as a signed-out user. Supabase
    // persists the session locally and will refresh it when necessary.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const restoredUser = session?.user || null;
      setUser(restoredUser);
      setSession(session);
      setAuthReady(true);
      if (restoredUser) {
        fetchFiles(restoredUser.id);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Error restoring auth session:', error);
      setAuthReady(true);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isPreviewSwitching) return;
    const timer = setTimeout(() => {
      setIsPreviewSwitching(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [isPreviewSwitching]);

  // Show auth screen if not logged in
  if (!authReady) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
        <Auth user={user} onAuthChange={handleAuthChange} />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-surface flex w-full">
        {import.meta.env.DEV && <DevDebugPanel />}
        
        {/* Collapsible Sidebar */}
        <Sidebar className="border-r border-border" collapsible="icon">
          <SidebarContent>
            <div className="h-full flex flex-col">
              {isAdmin && (
                <div className="border-b border-border">
                  <AdminPanel onFileUpload={handleFileUpload} />
                </div>
              )}
              <FileList
                files={filteredFiles}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isAdmin={isAdmin}
                isLoading={isPreviewSwitching}
                onRenameFile={handleRenameFile}
              />
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="bg-card border-b border-border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-6 py-3 sm:py-4 gap-3 sm:gap-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <SidebarTrigger className="mr-1 sm:mr-2" />
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold text-xs sm:text-sm">FM</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">File Manager</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Organize and preview your files</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-4 justify-end">
                <Auth user={user} onAuthChange={handleAuthChange} />
                <div className="h-6 w-px bg-border hidden sm:block" />
                {canUseAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Link to="/admin" className="flex items-center space-x-1 sm:space-x-2">
                      <LayoutDashboard className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                  </Button>
                )}
                <Button
                  variant={isAdmin ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setAdminMode((prev) => !prev)}
                  className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3"
                >
                  {isAdmin ? <Shield className="w-3 h-3 sm:w-4 sm:h-4" /> : <User className="w-3 h-3 sm:w-4 sm:h-4" />}
                  <span className="hidden xs:inline">{isAdmin ? "Upload" : "View"}</span>
                  <span className="xs:hidden">{isAdmin ? "U" : "V"}</span>
                </Button>
              </div>
            </div>
          </header>

          {/* File Preview */}
          <div className="flex-1 bg-surface overflow-y-auto p-2 sm:p-4">
            <ErrorBoundary
              resetKey={previewSwitchKey}
              onReset={() => {
                // Force remount and clear any error when retrying.
                setPreviewSwitchKey((prev) => prev + 1);
              }}
            >
              <FilePreview
                key={previewSwitchKey}
                file={selectedFile}
                onDelete={handleDelete}
                isAdmin={isAdmin}
                isLoading={isPreviewSwitching}
              />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
