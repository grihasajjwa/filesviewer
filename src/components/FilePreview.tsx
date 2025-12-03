import { FileItem } from "./FileManager";
import { Download, FileText, Eye, ExternalLink, FolderOpen, Presentation, Maximize, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatFileSize, isPowerPointFile, isWordFile, isExcelFile } from "@/lib/fileUtils";
import { saveAs } from "file-saver";
import { FolderCarousel } from "./FolderCarousel";
import { useState, useRef } from "react";

interface FilePreviewProps {
  file: FileItem | null;
  onDelete: (id: string) => void;
  isAdmin: boolean; // Add isAdmin prop
}

export const FilePreview = ({ file, onDelete, isAdmin }: FilePreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    }
  };

  const openPresentationMode = (url: string) => {
    // Open PowerPoint in presentation mode using Office Online
    const presentUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
    window.open(presentUrl, '_blank', 'width=1920,height=1080,fullscreen=yes');
  };

  const shareToWhatsApp = (fileId: string, fileName: string) => {
    // Use frontend URL to hide backend Supabase URL
    const frontendUrl = `${window.location.origin}/file/${fileId}`;
    const message = `Check out this document: ${fileName}\n${frontendUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

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
    if (file.type === "folder" && file.folderFiles) {
      return (
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">Local Folder</span>
              </div>
              <div className="flex space-x-2">
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
              <FolderCarousel files={file.folderFiles} />
            </div>
          </div>
        </div>
      );
    }

    if (file.type === "folder" && file.drive_folder_link) {
      return (
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                <span className="font-medium text-sm">Google Drive Folder</span>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => window.open(file.drive_folder_link, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open Folder
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
                <div className="text-center">
                  <FolderOpen className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-medium mb-2">Google Drive Folder</h3>
                  <p className="text-muted-foreground mb-6">
                    Click "Open Folder" to browse files in Google Drive
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

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
              <div className="h-full w-full">
                <iframe
                  src={`https://drive.google.com/file/d/${extractDriveFileId(file.url)}/preview`}
                  title="Google Drive File Preview"
                  className="w-full h-full border-none rounded-lg"
                  style={{ height: '100%', minHeight: '600px' }}
                  allow="autoplay"
                  onError={() => {
                    console.log('Google Drive preview failed to load due to CSP restrictions');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Check if it's a Word file
    if (isWordFile(file.name)) {
      return (
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-sm">Word Document Viewer</span>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => window.open(file.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Download
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
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
                className="w-full h-full border-0"
                title={file.name}
                style={{ height: '100%', width: '100%', minHeight: '600px' }}
                allowFullScreen
              />
            </div>
          </div>
        </div>
      );
    }

    // Check if it's an Excel file
    if (isExcelFile(file.name)) {
      return (
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-green-500" />
                <span className="font-medium text-sm">Excel Viewer</span>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => window.open(file.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Download
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
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
                className="w-full h-full border-0"
                title={file.name}
                style={{ height: '100%', width: '100%', minHeight: '600px' }}
                allowFullScreen
              />
            </div>
          </div>
        </div>
      );
    }

    // Check if it's a PowerPoint file
    if (isPowerPointFile(file.name)) {
      return (
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-sm">PowerPoint Viewer</span>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => openPresentationMode(file.url)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Presentation className="w-4 h-4 mr-1" />
                  Present
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleFullscreen}
                >
                  <Maximize className="w-4 h-4 mr-1" />
                  Fullscreen
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => window.open(file.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Download
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
                ref={iframeRef}
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
                className="w-full h-full border-0"
                title={file.name}
                style={{ height: '100%', width: '100%', minHeight: '600px' }}
                allowFullScreen
              />
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
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex items-center space-x-2"
                onClick={() => shareToWhatsApp(file.id, file.name)}
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp</span>
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
        </Card>

        {/* File Preview */}
        <div className="flex-1">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};