import { FileItem } from "./FileManager";
import { Download, FileText, Eye, ExternalLink, FolderOpen, Presentation, Maximize, Share2, Loader2, Music, Play, Youtube, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatFileSize, isPowerPointFile, isWordFile, isExcelFile, isAudioFile, isYouTubeUrl, extractYouTubeVideoId } from "@/lib/fileUtils";
import { saveAs } from "file-saver";
import { FolderCarousel } from "./FolderCarousel";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
interface FilePreviewProps {
  file: FileItem | null;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

// Reusable responsive header component (module scope to avoid remounting previews)
const PreviewToolbar = ({
  icon: Icon,
  iconClass,
  title,
  children,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col xs:flex-row xs:items-center justify-between p-2 sm:p-4 border-b border-border bg-muted/30 gap-2 xs:gap-0">
    <div className="flex items-center space-x-2">
      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconClass}`} />
      <span className="font-medium text-xs sm:text-sm">{title}</span>
    </div>
    <div className="flex flex-wrap gap-1.5 sm:gap-2">{children}</div>
  </div>
);

// Reusable responsive button (module scope)
const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  variant = "secondary",
  className = "",
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "destructive";
  className?: string;
}) => (
  <Button
    variant={variant}
    size="sm"
    onClick={onClick}
    className={`text-xs h-7 px-2 sm:h-8 sm:px-3 sm:text-sm ${className}`}
  >
    <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
    <span className="hidden xs:inline">{label}</span>
  </Button>
);


export const FilePreview = ({ file, onDelete, isAdmin }: FilePreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    }
  };

  const openPresentationMode = (url: string) => {
    const presentUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
    window.open(presentUrl, '_blank', 'width=1920,height=1080,fullscreen=yes');
  };

  const shareToWhatsApp = async (fileId: string, fileName: string) => {
    setIsSharing(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to share files");
        return;
      }

      // Create a share token for this file
      const { data: shareData, error: shareError } = await supabase
        .from('file_shares')
        .insert({
          file_id: fileId,
          created_by: user.id
        })
        .select('share_token')
        .single();

      if (shareError) {
        console.error("Error creating share link:", shareError);
        toast.error("Failed to create share link");
        return;
      }

      // Use share token in the URL
      const shareUrl = `${window.location.origin}/share/${shareData.share_token}`;
      const message = `Check out this document: ${fileName}\n${shareUrl}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error("Error sharing file:", error);
      toast.error("Failed to share file");
    } finally {
      setIsSharing(false);
    }
  };

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-30" />
          <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">No File Selected</h3>
          <p className="text-sm sm:text-base">Choose a file from the list to preview it here</p>
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
            <PreviewToolbar icon={FolderOpen} iconClass="text-primary" title="Local Folder">
              {isAdmin && (
                <ActionButton 
                  icon={ExternalLink}
                  label="Delete" 
                  onClick={() => handleDelete(file.id)}
                  variant="destructive"
                />
              )}
            </PreviewToolbar>
            <div className="flex-1 bg-muted/10 p-2 sm:p-4 overflow-auto">
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
            <PreviewToolbar icon={FolderOpen} iconClass="text-primary" title="Google Drive Folder">
              <ActionButton 
                icon={ExternalLink}
                label="Open Folder" 
                onClick={() => window.open(file.drive_folder_link, '_blank')}
              />
              {isAdmin && (
                <ActionButton 
                  icon={ExternalLink}
                  label="Delete" 
                  onClick={() => handleDelete(file.id)}
                  variant="destructive"
                />
              )}
            </PreviewToolbar>
            <div className="flex-1 bg-muted/10 p-2 sm:p-4 overflow-auto">
              <div className="h-full flex items-center justify-center">
                <div className="text-center px-4">
                  <FolderOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-primary" />
                  <h3 className="text-base sm:text-lg font-medium mb-2">Google Drive Folder</h3>
                  <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
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
            <PreviewToolbar icon={FileText} iconClass="text-primary" title="Google Drive File">
              <ActionButton 
                icon={ExternalLink}
                label="Open" 
                onClick={() => window.open(file.url, '_blank')}
              />
              {isAdmin && (
                <ActionButton 
                  icon={ExternalLink}
                  label="Delete" 
                  onClick={() => handleDelete(file.id)}
                  variant="destructive"
                />
              )}
            </PreviewToolbar>
            <div className="flex-1 bg-muted/10 p-2 sm:p-4 overflow-auto">
              <div className="h-full w-full">
                <iframe
                  src={`https://drive.google.com/file/d/${extractDriveFileId(file.url)}/preview`}
                  title="Google Drive File Preview"
                  className="w-full h-full border-none rounded-lg"
                  style={{ height: '100%', minHeight: '400px' }}
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
            <PreviewToolbar icon={FileText} iconClass="text-blue-500" title="Word Document">
              <ActionButton 
                icon={ExternalLink}
                label="Download" 
                onClick={() => window.open(file.url, '_blank')}
              />
              {isAdmin && (
                <ActionButton 
                  icon={ExternalLink}
                  label="Delete" 
                  onClick={() => handleDelete(file.id)}
                  variant="destructive"
                />
              )}
            </PreviewToolbar>
            <div className="flex-1 bg-muted/10 overflow-auto">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
                className="w-full h-full border-0"
                title={file.name}
                style={{ height: '100%', width: '100%', minHeight: '400px' }}
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
            <PreviewToolbar icon={FileText} iconClass="text-green-500" title="Excel Viewer">
              <ActionButton 
                icon={ExternalLink}
                label="Download" 
                onClick={() => window.open(file.url, '_blank')}
              />
              {isAdmin && (
                <ActionButton 
                  icon={ExternalLink}
                  label="Delete" 
                  onClick={() => handleDelete(file.id)}
                  variant="destructive"
                />
              )}
            </PreviewToolbar>
            <div className="flex-1 bg-muted/10 overflow-auto">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
                className="w-full h-full border-0"
                title={file.name}
                style={{ height: '100%', width: '100%', minHeight: '400px' }}
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
            <PreviewToolbar icon={FileText} iconClass="text-orange-500" title="PowerPoint">
              <Button 
                variant="default" 
                size="sm"
                onClick={() => openPresentationMode(file.url)}
                className="bg-orange-500 hover:bg-orange-600 text-xs h-7 px-2 sm:h-8 sm:px-3 sm:text-sm"
              >
                <Presentation className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden xs:inline">Present</span>
              </Button>
              <ActionButton 
                icon={Maximize}
                label="Fullscreen" 
                onClick={handleFullscreen}
              />
              <ActionButton 
                icon={ExternalLink}
                label="Download" 
                onClick={() => window.open(file.url, '_blank')}
              />
              {isAdmin && (
                <ActionButton 
                  icon={ExternalLink}
                  label="Delete" 
                  onClick={() => handleDelete(file.id)}
                  variant="destructive"
                />
              )}
            </PreviewToolbar>
            <div className="flex-1 bg-muted/10 overflow-auto">
              <iframe
                ref={iframeRef}
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
                className="w-full h-full border-0"
                title={file.name}
                style={{ height: '100%', width: '100%', minHeight: '400px' }}
                allowFullScreen
              />
            </div>
          </div>
        </div>
      );
    }

    // Check if it's an audio file by extension (fallback for files with generic type)
    if (isAudioFile(file.name)) {
      return (
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          <div className="h-full flex flex-col">
            <PreviewToolbar icon={Music} iconClass="text-purple-500" title="Audio Player">
              <ActionButton 
                icon={ExternalLink}
                label="Open" 
                onClick={() => window.open(file.url, '_blank')}
              />
              {isAdmin && (
                <ActionButton 
                  icon={ExternalLink}
                  label="Delete" 
                  onClick={() => handleDelete(file.id)}
                  variant="destructive"
                />
              )}
            </PreviewToolbar>
            <div className="flex-1 bg-muted/10 p-4 sm:p-8 overflow-auto">
              <div className="h-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
                  <Music className="w-10 h-10 sm:w-16 sm:h-16 text-white" />
                </div>
                <h3 className="text-sm sm:text-lg font-medium mb-3 sm:mb-4 text-center px-2 truncate max-w-full">{file.name}</h3>
                <audio
                  controls
                  className="w-full max-w-md"
                  src={file.url}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
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
              <PreviewToolbar icon={FileText} iconClass="text-destructive" title="PDF Viewer">
                <ActionButton 
                  icon={ExternalLink}
                  label="Open" 
                  onClick={() => window.open(file.url, '_blank')}
                />
                {isAdmin && (
                  <ActionButton 
                    icon={ExternalLink}
                    label="Delete" 
                    onClick={() => handleDelete(file.id)}
                    variant="destructive"
                  />
                )}
              </PreviewToolbar>
              <div className="flex-1 bg-muted/10 overflow-auto">
                <iframe
                  src={file.url}
                  className="w-full h-full border-0"
                  title={file.name}
                  style={{ height: '100%', width: '100%', minHeight: '400px' }}
                />
              </div>
            </div>
          </div>
        );

      case "image":
        return (
          <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
            <div className="h-full flex flex-col">
              <PreviewToolbar icon={Eye} iconClass="text-primary" title="Image Preview">
                <ActionButton 
                  icon={ExternalLink}
                  label="Open" 
                  onClick={() => window.open(file.url, '_blank')}
                />
                {isAdmin && (
                  <ActionButton 
                    icon={ExternalLink}
                    label="Delete" 
                    onClick={() => handleDelete(file.id)}
                    variant="destructive"
                  />
                )}
              </PreviewToolbar>
              <div className="flex-1 bg-muted/10 p-2 sm:p-4 overflow-auto">
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

      case "audio":
        return (
          <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Music className="w-5 h-5 text-purple-500" />
                  <span className="font-medium text-sm">Audio Player</span>
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
              <div className="flex-1 bg-muted/10 p-8 overflow-auto">
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <Music className="w-16 h-16 text-white" />
                  </div>
                  <h3 className="text-lg font-medium mb-4 text-center">{file.name}</h3>
                  <audio
                    controls
                    className="w-full max-w-md"
                    src={file.url}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            </div>
          </div>
        );

      case "video":
        const youtubeId = file.url ? extractYouTubeVideoId(file.url) : null;
        if (youtubeId) {
          return (
            <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center space-x-2">
                    <Youtube className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-sm">YouTube Video</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open on YouTube
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
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title={file.name}
                      className="w-full h-full border-none rounded-lg"
                      style={{ height: '100%', minHeight: '400px' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;

      case "facebook":
        // Facebook URL is stored directly in file.url
        const handleOpenFacebook = () => {
          const fbUrl = file.url;
          console.log("Opening Facebook URL:", fbUrl);
          if (fbUrl) {
            window.open(fbUrl, '_blank');
          }
        };
        return (
          <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
            <div className="h-full flex flex-col">
              <PreviewToolbar icon={Facebook} iconClass="text-blue-600" title="Facebook Post">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleOpenFacebook}
                  className="text-xs h-7 px-2 sm:h-8 sm:px-3 sm:text-sm"
                >
                  <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden xs:inline">Open on Facebook</span>
                </Button>
                {isAdmin && (
                  <ActionButton 
                    icon={ExternalLink}
                    label="Delete" 
                    onClick={() => handleDelete(file.id)}
                    variant="destructive"
                  />
                )}
              </PreviewToolbar>
              <div className="flex-1 bg-muted/10 p-2 sm:p-4 overflow-auto">
                <div className="h-full flex items-center justify-center">
                  <div className="w-full max-w-2xl">
                    <iframe
                      src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(file.url)}&show_text=true&width=500`}
                      width="500"
                      height="600"
                      className="w-full border-none rounded-lg"
                      style={{ minHeight: '400px', maxWidth: '100%' }}
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
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
    <div className="h-full p-2 sm:p-4 md:p-6">
      <div className="h-full flex flex-col">
        {/* File Info Header */}
        <Card className="mb-3 sm:mb-6 p-3 sm:p-4 bg-card border-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="min-w-0">
              <h2 className="font-semibold text-sm sm:text-lg text-foreground truncate">
                {file.name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-0.5 mt-1 text-xs sm:text-sm text-muted-foreground">
                <span>{formatFileSize(file.size)}</span>
                <span className="hidden xs:inline">•</span>
                <span>Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex items-center gap-1.5 text-xs sm:text-sm h-8 px-2 sm:px-3"
                onClick={() => shareToWhatsApp(file.id, file.name)}
                disabled={isSharing}
              >
                {isSharing ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />}
                <span className="hidden xs:inline">{isSharing ? 'Sharing...' : 'WhatsApp'}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex items-center gap-1.5 text-xs sm:text-sm h-8 px-2 sm:px-3"
                onClick={() => {
                  const downloadUrl = file.drive_link || file.url;
                  if (downloadUrl) {
                    saveAs(downloadUrl, file.name || "download");
                  } else {
                    console.error("No valid download URL found for the file.");
                  }
                }}
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Download</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* File Preview */}
        <div className="flex-1 min-h-0">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};
