import { useState } from "react";
import { Upload, Link2, Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FileItem } from "./FileManager";
import { useToast } from "@/hooks/use-toast";

interface AdminPanelProps {
  onFileUpload: (files: FileItem[]) => void;
}

export const AdminPanel = ({ onFileUpload }: AdminPanelProps) => {
  const [driveLink, setDriveLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);
    
    // Simulate file upload process
    setTimeout(() => {
      const newFiles: FileItem[] = Array.from(files).map((file, index) => ({
        id: `upload-${Date.now()}-${index}`,
        name: file.name,
        type: getFileType(file.name),
        size: file.size,
        uploadedAt: new Date().toISOString().split('T')[0],
        url: URL.createObjectURL(file),
      }));

      onFileUpload(newFiles);
      setIsUploading(false);
      
      toast({
        title: "Upload Successful",
        description: `${files.length} file(s) uploaded successfully`,
      });
    }, 1500);
  };

  const handleDriveLinkSubmit = () => {
    if (!driveLink.trim()) return;

    // Simulate Google Drive integration
    const mockDriveFiles: FileItem[] = [
      {
        id: `drive-${Date.now()}-1`,
        name: "Shared_Document.pdf",
        type: "pdf",
        size: 1.5 * 1024 * 1024,
        uploadedAt: new Date().toISOString().split('T')[0],
        url: "/sample.pdf",
      },
      {
        id: `drive-${Date.now()}-2`,
        name: "Team_Photo.jpg",
        type: "image",
        size: 2.1 * 1024 * 1024,
        uploadedAt: new Date().toISOString().split('T')[0],
        url: "/placeholder.svg",
      },
    ];

    onFileUpload(mockDriveFiles);
    setDriveLink("");
    
    toast({
      title: "Drive Link Connected",
      description: "Files from Google Drive folder imported successfully",
    });
  };

  const getFileType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      case 'doc':
      case 'docx':
        return 'document';
      case 'xls':
      case 'xlsx':
        return 'spreadsheet';
      case 'ppt':
      case 'pptx':
        return 'presentation';
      default:
        return 'file';
    }
  };

  return (
    <Card className="m-4 p-4 bg-surface border-border shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 bg-gradient-primary rounded flex items-center justify-center">
            <Plus className="w-3 h-3 text-primary-foreground" />
          </div>
          <h3 className="font-medium text-foreground">Admin Panel</h3>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label className="block">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="sr-only"
              disabled={isUploading}
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Files"}
            </Button>
          </label>
          
          <label className="block">
            <input
              type="file"
              multiple
              {...({ webkitdirectory: "" } as any)}
              onChange={handleFileUpload}
              className="sr-only"
              disabled={isUploading}
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              disabled={isUploading}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Folder"}
            </Button>
          </label>
        </div>

        {/* Google Drive Link */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Input
              placeholder="Paste Google Drive folder link..."
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              className="flex-1 text-sm bg-card border-input-border"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDriveLinkSubmit}
              disabled={!driveLink.trim()}
            >
              <Link2 className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center">
            <FolderOpen className="w-3 h-3 mr-1" />
            Connect a Google Drive folder to import files
          </p>
        </div>
      </div>
    </Card>
  );
};