import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Eye, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileItem } from "./FileManager";
import { formatFileSize, isPowerPointFile, isWordFile, isExcelFile } from "@/lib/fileUtils";
import { saveAs } from "file-saver";

interface FolderCarouselProps {
  files: FileItem[];
}

export const FolderCarousel = ({ files }: FolderCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!files || files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">Empty Folder</h3>
          <p>This folder contains no files</p>
        </div>
      </div>
    );
  }

  const currentFile = files[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < files.length - 1;

  const goToPrevious = () => {
    if (canGoPrev) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const extractDriveFileId = (url: string) => {
    const regex = /[-\w]{25,}/;
    const matches = url.match(regex);
    return matches ? matches[0] : null;
  };

  const renderFilePreview = () => {
    if (!currentFile) return null;

    // Check if it's a Word file
    if (isWordFile(currentFile.name)) {
      return (
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(currentFile.url)}`}
            className="w-full h-full border-0"
            title={currentFile.name}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
            allowFullScreen
          />
        </div>
      );
    }

    // Check if it's an Excel file
    if (isExcelFile(currentFile.name)) {
      return (
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(currentFile.url)}`}
            className="w-full h-full border-0"
            title={currentFile.name}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
            allowFullScreen
          />
        </div>
      );
    }

    // Check if it's a PowerPoint file
    if (isPowerPointFile(currentFile.name)) {
      return (
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(currentFile.url)}`}
            className="w-full h-full border-0"
            title={currentFile.name}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
            allowFullScreen
          />
        </div>
      );
    }

    switch (currentFile.type) {
      case "pdf":
        return (
          <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
            <iframe
              src={currentFile.url}
              className="w-full h-full border-0"
              title={currentFile.name}
              style={{ height: '100%', width: '100%', minHeight: '400px' }}
            />
          </div>
        );

      case "image":
        return (
          <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
            <div className="h-full flex items-center justify-center p-4">
              <img
                src={currentFile.url}
                alt={currentFile.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg cursor-zoom-in"
                onClick={() => window.open(currentFile.url, '_blank')}
              />
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
                      if (currentFile.url) {
                        saveAs(currentFile.url, currentFile.name);
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
    <div className="h-full space-y-4">
      {/* File Navigation Header */}
      <Card className="p-4 bg-card border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h3 className="font-semibold text-lg text-foreground truncate">
                {currentFile.name}
              </h3>
              <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                <span>{formatFileSize(currentFile.size)}</span>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">
                  {currentFile.type.toUpperCase()}
                </Badge>
                <span>•</span>
                <span>File {currentIndex + 1} of {files.length}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline" 
              size="sm"
              onClick={goToPrevious}
              disabled={!canGoPrev}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline" 
              size="sm"
              onClick={goToNext}
              disabled={!canGoNext}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center space-x-2"
              onClick={() => {
                if (currentFile.url) {
                  saveAs(currentFile.url, currentFile.name);
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
      <div className="flex-1" style={{ height: 'calc(100% - 120px)' }}>
        {renderFilePreview()}
      </div>
    </div>
  );
};