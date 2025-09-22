import { FileItem } from "./FileManager";
import { Download, FileText, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatFileSize } from "@/lib/fileUtils";
import { saveAs } from "file-saver";

interface FilePreviewProps {
  file: FileItem | null;
  onDelete: (id: string) => void;
  isAdmin: boolean; // Add isAdmin prop
}

export const FilePreview = ({ file, onDelete, isAdmin }: FilePreviewProps) => {
  if (!file) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">No File Selected</h3>
          <p>Choose a file from the list to preview it here</p>
        </div>
      </div>
    );
  }

  const extractDriveFileId = (url: string) => {
    const regex = /[-\w]{25,}/;
    const matches = url.match(regex);
    return matches ? matches[0] : null;
  };

  const handleDelete = (id: string) => {
    // Call the onDelete prop function passed from the parent component
    onDelete(id);
  };

  const renderPreview = () => {
    if (file.url.includes("drive.google.com")) {
      return (
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">Google Drive File</span>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => window.open(file.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </Button>
                {isAdmin && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDelete(file.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 bg-muted/10 p-4 overflow-auto">
              {file.url.includes("drive.google.com") ? (
                <iframe
                  src={`https://drive.google.com/file/d/${extractDriveFileId(file.url)}/preview`}
                  title="Google Drive File Preview"
                  className="w-full h-full border-none"
                  style={{ height: '100vh', overflow: 'auto' }}
                  allow="autoplay"
                ></iframe>
              ) : (
                <p className="text-center text-muted-foreground">Preview not available for Google Drive files. Use the Open button to view the file.</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    switch (file.type) {
      case "pdf":
        return (
          <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-destructive" />
                  <span className="font-medium text-sm">PDF Viewer</span>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open
                  </Button>
                  {isAdmin && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(file.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex-1 bg-muted/10 overflow-auto">
                <iframe
                  src={file.url}
                  className="w-full h-full border-0"
                  title={file.name}
                  style={{ height: '100%', width: '100%', minHeight: '842px', minWidth: '595px' }} // A4 dimensions in pixels
                />
              </div>
            </div>
          </div>
        );

      case "image":
        return (
          <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="font-medium text-sm">Image Preview</span>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Open
                  </Button>
                  {isAdmin && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(file.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex-1 bg-muted/10 p-4 overflow-auto">
                <div className="h-full flex items-center justify-center">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg cursor-zoom-in"
                    onClick={() => window.open(file.url, '_blank')}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-medium mb-2">Document Preview</h3>
                <p className="text-muted-foreground mb-6">
                  Preview not available for this file type
                </p>
                <div className="flex justify-center space-x-3">
                  <Button size="sm" className="flex items-center space-x-2">
                    <ExternalLink className="w-4 h-4" />
                    <span>Open External</span>
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="flex items-center space-x-2"
                    onClick={() => {
                      const downloadUrl = file.drive_link || file.url;
                      if (downloadUrl) {
                        saveAs(downloadUrl, file.name || "download");
                      } else {
                        console.error("No valid download URL found for the file.");
                      }
                    }}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full p-6">
      <div className="h-full flex flex-col">
        {/* File Info Header */}
        <Card className="mb-6 p-4 bg-card border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg text-foreground truncate">
                {file.name}
              </h2>
              <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center space-x-2"
              onClick={() => {
                const downloadUrl = file.drive_link || file.url;
                if (downloadUrl) {
                  saveAs(downloadUrl, file.name || "download");
                } else {
                  console.error("No valid download URL found for the file.");
                }
              }}
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
          </div>
        </Card>

        {/* File Preview */}
        <div className="flex-1">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};