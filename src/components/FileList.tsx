import { Search, File, FileText, Image, FileSpreadsheet, Presentation, Folder, Globe, Music, Play, Youtube, MoreVertical, Pencil, Facebook } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileItem } from "./FileManager";
import { formatFileSize } from "@/lib/fileUtils";
import { StatusBadge } from "./StatusBadge";
import { useSidebar } from "@/components/ui/sidebar";
import { useState, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FileListProps {
  files: FileItem[];
  selectedFile: FileItem | null;
  onFileSelect: (file: FileItem) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isAdmin?: boolean;
  onRenameFile?: (fileId: string, newName: string) => void;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="w-5 h-5 text-destructive" />;
    case "image":
      return <Image className="w-5 h-5 text-success" />;
    case "document":
      return <FileText className="w-5 h-5 text-primary" />;
    case "spreadsheet":
      return <FileSpreadsheet className="w-5 h-5 text-success" />;
    case "presentation":
      return <Presentation className="w-5 h-5 text-warning" />;
    case "folder":
      return <Folder className="w-5 h-5 text-blue-500" />;
    case "audio":
      return <Music className="w-5 h-5 text-purple-500" />;
    case "video":
      return <Youtube className="w-5 h-5 text-red-500" />;
    case "facebook":
      return <Facebook className="w-5 h-5 text-blue-600" />;
    default:
      return <File className="w-5 h-5 text-muted-foreground" />;
  }
};

const getBadgeType = (file: FileItem) => {
  if (file.type === 'facebook') return 'facebook';
  if (file.drive_link) return 'drive';
  if (file.drive_folder_link) return 'folder';
  if (file.url && file.url.startsWith('http') && !file.url.includes('supabase')) return 'internet';
  return 'uploaded';
};

export const FileList = ({
  files,
  selectedFile,
  onFileSelect,
  searchQuery,
  onSearchChange,
  isAdmin = false,
  onRenameFile,
}: FileListProps) => {
  const { isMobile, setOpenMobile } = useSidebar();
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
  const [newFileName, setNewFileName] = useState("");

  const handleSelect = (file: FileItem) => {
    onFileSelect(file);
    if (isMobile) setOpenMobile(false);
  };


  const handleRenameClick = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    setRenamingFile(file);
    setNewFileName(file.name);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (renamingFile && newFileName.trim() && onRenameFile) {
      onRenameFile(renamingFile.id, newFileName.trim());
    }
    setRenameDialogOpen(false);
    setRenamingFile(null);
    setNewFileName("");
  };

  const handlePlayAudio = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    
    if (playingAudioId === file.id) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudioId(null);
    } else {
      // Stop previous audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Play new audio
      const audio = new Audio(file.url);
      audio.onended = () => setPlayingAudioId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingAudioId(file.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-surface border-input-border focus:border-ring"
          />
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No files found</p>
              {searchQuery && (
                <p className="text-sm mt-1">Try adjusting your search</p>
              )}
            </div>
          ) : (
            files.map((file) => (
              <div key={file.id} className="relative group">
                <Button
                  variant="ghost"
                  onClick={() => handleSelect(file)}
                  className={`w-full p-3 h-auto justify-start rounded-lg transition-all duration-200 ${
                    selectedFile?.id === file.id
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-surface-hover"
                  } ${isAdmin ? 'pr-10' : ''}`}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <div className="flex-shrink-0 mt-1">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {file.name}
                        </p>
                        <StatusBadge type={getBadgeType(file)} />
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {file.type === 'folder' ? 'Folder' : formatFileSize(file.size)}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </span>
                        {file.type === 'audio' && (
                          <button
                            onClick={(e) => handlePlayAudio(e, file)}
                            className={`ml-2 p-1 rounded-full transition-colors ${
                              playingAudioId === file.id 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                            }`}
                            title={playingAudioId === file.id ? "Stop" : "Play"}
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {file.drive_link && (
                        <a
                          href={file.drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline mt-1 block hover:text-primary/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open in Google Drive
                        </a>
                      )}
                      {file.drive_folder_link && (
                        <a
                          href={file.drive_folder_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline mt-1 block hover:text-primary/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open Folder in Google Drive
                        </a>
                      )}
                    </div>
                  </div>
                </Button>
                
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
                      <DropdownMenuItem onClick={(e) => handleRenameClick(e as any, file)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter new file name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!newFileName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
