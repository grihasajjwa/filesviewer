import { FileItem } from "./FileManager";
import { Download, FileText, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatFileSize } from "@/lib/fileUtils";

interface FilePreviewProps {
  file: FileItem | null;
}

export const FilePreview = ({ file }: FilePreviewProps) => {
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

  const renderPreview = () => {
    switch (file.type) {
      case "pdf":
        return (
          <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-medium mb-2">PDF Document</h3>
                <p className="text-muted-foreground mb-6">
                  PDF viewer would be integrated here
                </p>
                <div className="flex justify-center space-x-3">
                  <Button size="sm" className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>Open PDF</span>
                  </Button>
                  <Button variant="secondary" size="sm" className="flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case "image":
        return (
          <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
            <div className="h-full flex items-center justify-center p-6">
              <div className="max-w-full max-h-full">
                <img
                  src={file.url}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
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
                  <Button variant="secondary" size="sm" className="flex items-center space-x-2">
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