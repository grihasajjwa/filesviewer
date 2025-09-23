import { Search, File, FileText, Image, FileSpreadsheet, Presentation, Folder, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileItem } from "./FileManager";
import { formatFileSize } from "@/lib/fileUtils";
import { StatusBadge } from "./StatusBadge";

interface FileListProps {
  files: FileItem[];
  selectedFile: FileItem | null;
  onFileSelect: (file: FileItem) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
    default:
      return <File className="w-5 h-5 text-muted-foreground" />;
  }
};

const getBadgeType = (file: FileItem) => {
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
}: FileListProps) => {
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
              <Button
                key={file.id}
                variant="ghost"
                onClick={() => onFileSelect(file)}
                className={`w-full p-3 h-auto justify-start rounded-lg transition-all duration-200 ${
                  selectedFile?.id === file.id
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "hover:bg-surface-hover"
                }`}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};