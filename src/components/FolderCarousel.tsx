import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { FolderOpen, ExternalLink, FileText, Image, File } from "lucide-react";

interface FolderCarouselProps {
  folderLink: string;
  folderName: string;
  onDelete?: () => void;
  isAdmin?: boolean;
}

export const FolderCarousel = ({ folderLink, folderName, onDelete, isAdmin }: FolderCarouselProps) => {
  const [folderItems, setFolderItems] = useState<Array<{
    id: string;
    name: string;
    type: 'image' | 'document' | 'other';
    embedUrl: string;
    directUrl: string;
  }>>([]);

  const extractFolderId = (url: string) => {
    const regex = /[-\w]{25,}/;
    const matches = url.match(regex);
    return matches ? matches[0] : null;
  };

  useEffect(() => {
    const folderId = extractFolderId(folderLink);
    if (folderId) {
      // Since we don't have Google Drive API access, we'll show the folder 
      // but indicate that individual file previews aren't available
      setFolderItems([]);
    }
  }, [folderLink]);

  const renderFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const renderItemPreview = (item: typeof folderItems[0]) => {
    return (
      <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-2">
            {renderFileIcon(item.type)}
            <span className="font-medium text-sm truncate">{item.name}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.open(item.directUrl, '_blank')}
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
        <div className="h-96 bg-muted/10 p-2">
          <iframe
            src={item.embedUrl}
            title={item.name}
            className="w-full h-full border-none rounded"
            allow="autoplay"
            onError={() => {
              console.log('Google Drive preview failed to load');
            }}
          />
        </div>
      </div>
    );
  };

  if (folderItems.length === 0) {
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
              onClick={() => window.open(folderLink, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open Folder
            </Button>
              {isAdmin && onDelete && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={onDelete}
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
                <h3 className="text-lg font-medium mb-2">Loading Folder Contents...</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Open Folder" to browse files in Google Drive
                </p>
                <p className="text-xs text-muted-foreground">
                  Note: Full folder preview requires Google Drive API setup
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">{folderName || 'Google Drive Folder'}</span>
            <span className="text-xs text-muted-foreground">({folderItems.length} items)</span>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => window.open(folderLink, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open Folder
            </Button>
            {isAdmin && onDelete && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={onDelete}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <Carousel className="w-full h-full">
            <CarouselContent className="h-full">
              {folderItems.map((item, index) => (
                <CarouselItem key={item.id} className="h-full">
                  <div className="h-full p-1">
                    {renderItemPreview(item)}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>
        
        <div className="px-4 pb-2">
          <div className="text-xs text-muted-foreground text-center">
            Use arrow keys or buttons to navigate • {folderItems.length} files in folder
          </div>
        </div>
      </div>
    </div>
  );
};