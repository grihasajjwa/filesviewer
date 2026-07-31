import { useState } from "react";
import { Upload, Link2, Plus, FolderOpen, FileText, Image, Globe, Youtube, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileItem } from "./FileManager";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AdminPanelProps {
  onFileUpload: (files: FileItem[]) => void;
}

// Maximum allowed upload size: 200 MB
export const MAX_UPLOAD_SIZE = 200 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_LABEL = "200 MB";


export const AdminPanel = ({ onFileUpload }: AdminPanelProps) => {
  const [driveFileLink, setDriveFileLink] = useState("");
  const [driveFolderLink, setDriveFolderLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isFolderUploading, setIsFolderUploading] = useState(false);
  
  // Form states for each tab
  const [fileUploadForm, setFileUploadForm] = useState({ title: "", description: "" });
  const [folderUploadForm, setFolderUploadForm] = useState({ title: "", description: "" });
  const [driveFileForm, setDriveFileForm] = useState({ title: "", description: "" });
  const [driveFolderForm, setDriveFolderForm] = useState({ title: "", description: "" });
  const [imageLinksForm, setImageLinksForm] = useState({ title: "", description: "" });
  const [youtubeForm, setYoutubeForm] = useState({ title: "", description: "" });
  const [facebookForm, setFacebookForm] = useState({ title: "", description: "" });
  
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const oversized = Array.from(files).filter((f) => f.size > MAX_UPLOAD_SIZE);
    if (oversized.length > 0) {
      toast({
        title: "File too large",
        description: `Each file must be ${MAX_UPLOAD_SIZE_LABEL} or smaller: ${oversized
          .map((f) => f.name)
          .join(", ")}`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setIsUploading(true);

    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to upload files",
          variant: "destructive",
        });
        return;
      }

      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('files')
          .upload(fileName, file);

        if (error) throw error;

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(fileName);

        // Save file metadata to database
        const { data: dbData, error: dbError } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            name: file.name,
            type: getFileType(file.name),
            size: file.size,
            url: publicUrl,
            bucket_name: 'files',
            file_path: fileName,
            drive_link: null // Ensure drive_link is explicitly set to null for regular uploads
          })
          .select()
          .single();

        if (dbError) throw dbError;

        return {
          id: dbData.id,
          name: dbData.name,
          type: dbData.type,
          size: dbData.size,
          uploadedAt: new Date(dbData.created_at).toISOString().split('T')[0],
          url: dbData.url,
        };
      });

      const newFiles: FileItem[] = await Promise.all(uploadPromises);
      onFileUpload(newFiles);
      
      toast({
        title: "Upload Successful",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsFolderUploading(true);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to upload folders",
          variant: "destructive",
        });
        return;
      }

      // Get folder name from the first file's path
      const firstFile = files[0];
      const folderPath = firstFile.webkitRelativePath;
      const folderName = folderPath.split('/')[0];

      // Create folder entry first
      const { data: folderData, error: folderError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: folderUploadForm.title || folderName,
          type: "folder",
          size: 0,
          url: "Local Folder",
          bucket_name: "folders",
          file_path: `folders/${folderName}`,
          folder_name: folderUploadForm.title || folderName,
        })
        .select()
        .single();

      if (folderError) throw folderError;

      // Upload all files in the folder
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `folders/${folderName}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('files')
          .upload(fileName, file);

        if (error) throw error;

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(fileName);

        // Save file metadata to database with folder reference
        const { data: dbData, error: dbError } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            name: file.name,
            type: getFileType(file.name),
            size: file.size,
            url: publicUrl,
            bucket_name: 'files',
            file_path: fileName,
            folder_name: folderUploadForm.title || folderName,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        return {
          id: dbData.id,
          name: dbData.name,
          type: dbData.type,
          size: dbData.size,
          uploadedAt: new Date(dbData.created_at).toISOString().split('T')[0],
          url: dbData.url,
          folder_name: folderUploadForm.title || folderName,
        };
      });

      const folderFiles: FileItem[] = await Promise.all(uploadPromises);
      
      // Create the folder item to be added to the list
      const folderItem: FileItem = {
        id: folderData.id,
        name: folderData.name,
        type: "folder",
        size: folderFiles.reduce((total, file) => total + file.size, 0),
        uploadedAt: new Date(folderData.created_at).toISOString().split('T')[0],
        url: "Local Folder",
        folder_name: folderUploadForm.title || folderName,
        folderFiles: folderFiles,
      };

      onFileUpload([folderItem]);
      setFolderUploadForm({ title: "", description: "" });
      
      toast({
        title: "Folder Upload Successful",
        description: `Folder "${folderName}" with ${files.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Folder upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload folder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFolderUploading(false);
    }
  };

  const handleDriveFileSubmit = async () => {
    if (!driveFileLink.trim()) return;

    try {
      // Extract file ID from Google Drive link
      const fileId = extractDriveFileId(driveFileLink);
      if (!fileId) throw new Error("Invalid Google Drive link");

      // Fetch metadata from Google Drive API (mocked for now)
      const metadata = {
        name: driveFileForm.title || "Drive_File.pdf",
        size: 1.5 * 1024 * 1024, // Mock size
        type: "pdf", // Mock type
      };

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to add Google Drive links",
          variant: "destructive",
        });
        return;
      }

      // Save Google Drive file metadata to database
      const { data: dbData, error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: metadata.name,
          type: metadata.type,
          size: metadata.size,
          url: "Google Drive Link", // Placeholder value for Google Drive files
          bucket_name: "Google Drive", // Placeholder value for Google Drive files
          file_path: "Google Drive File", // Placeholder value for Google Drive files
          drive_link: driveFileLink,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const newFile: FileItem = {
        id: dbData.id,
        name: dbData.name,
        type: dbData.type,
        size: dbData.size,
        uploadedAt: new Date(dbData.created_at).toISOString().split('T')[0],
        url: null, // No direct URL for Drive files
      };

      onFileUpload([newFile]);
      setDriveFileLink("");
      setDriveFileForm({ title: "", description: "" });

      toast({
        title: "Drive File Connected",
        description: "File from Google Drive imported successfully",
      });
    } catch (error) {
      console.error("Drive file submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to add Google Drive file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDriveFolderSubmit = async () => {
    if (!driveFolderLink.trim()) return;

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to add Google Drive folders",
          variant: "destructive",
        });
        return;
      }

      // Extract folder ID from Google Drive folder link
      const folderId = extractDriveFolderId(driveFolderLink);
      if (!folderId) throw new Error("Invalid Google Drive folder link");

      // Create a folder entry in the database
      const { data: dbData, error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: driveFolderForm.title || "Google Drive Folder",
          type: "folder",
          size: 0, // Folder size is 0
          url: "Google Drive Folder", // Placeholder for folders
          bucket_name: "Google Drive", // Placeholder for Google Drive folders
          file_path: "Google Drive Folder", // Placeholder for Google Drive folders
          drive_folder_link: driveFolderLink,
          folder_name: driveFolderForm.title || "Google Drive Folder",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const newFolder: FileItem = {
        id: dbData.id,
        name: dbData.name,
        type: "folder",
        size: 0,
        uploadedAt: new Date(dbData.created_at).toISOString().split('T')[0],
        url: driveFolderLink, // Use the original link for folders
      };

      onFileUpload([newFolder]);
      setDriveFolderLink("");
      setDriveFolderForm({ title: "", description: "" });

      toast({
        title: "Drive Folder Connected",
        description: "Google Drive folder linked successfully",
      });
    } catch (error) {
      console.error("Drive folder submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to link Google Drive folder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageLinkSubmit = async () => {
    if (!imageUrl.trim()) return;

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to add image links",
          variant: "destructive",
        });
        return;
      }

      // Save internet image to database
      const { data: dbData, error: dbError } = await supabase
        .from('internet_images')
        .insert({
          user_id: user.id,
          title: imageLinksForm.title || "Internet Image",
          url: imageUrl,
          description: imageLinksForm.description,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Also add to files table for unified display
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: imageLinksForm.title || "Internet Image",
          type: "image",
          size: 0, // Unknown size for external images
          url: imageUrl,
          bucket_name: "Internet", // Placeholder for internet images
          file_path: "Internet Image", // Placeholder for internet images
        })
        .select()
        .single();

      if (fileError) throw fileError;

      const newImage: FileItem = {
        id: fileData.id,
        name: fileData.name,
        type: "image",
        size: 0,
        uploadedAt: new Date(fileData.created_at).toISOString().split('T')[0],
        url: imageUrl,
      };

      onFileUpload([newImage]);
      setImageUrl("");
      setImageLinksForm({ title: "", description: "" });

      toast({
        title: "Image Link Added",
        description: "Internet image link saved successfully",
      });
    } catch (error) {
      console.error("Image link submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to add image link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) return;

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to add YouTube videos",
          variant: "destructive",
        });
        return;
      }

      // Extract video ID from YouTube URL
      const videoId = extractYoutubeVideoId(youtubeUrl);
      if (!videoId) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid YouTube video URL",
          variant: "destructive",
        });
        return;
      }

      // Add to files table
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: youtubeForm.title || "YouTube Video",
          type: "video",
          size: 0,
          url: youtubeUrl,
          bucket_name: "YouTube",
          file_path: "YouTube Video",
        })
        .select()
        .single();

      if (fileError) throw fileError;

      const newVideo: FileItem = {
        id: fileData.id,
        name: fileData.name,
        type: "video",
        size: 0,
        uploadedAt: new Date(fileData.created_at).toISOString().split('T')[0],
        url: youtubeUrl,
      };

      onFileUpload([newVideo]);
      setYoutubeUrl("");
      setYoutubeForm({ title: "", description: "" });

      toast({
        title: "YouTube Video Added",
        description: "Video link saved successfully",
      });
    } catch (error) {
      console.error("YouTube submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to add YouTube video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const extractFacebookPostId = (url: string): string | null => {
    const patterns = [
      /facebook\.com\/.*\/videos\/(\d+)/,
      /facebook\.com\/.*\/posts\/(\d+)/,
      /facebook\.com\/watch\/\?v=(\d+)/,
      /facebook\.com\/reel\/(\d+)/,
      /fb\.watch\/([\w]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return url; // Return URL itself as fallback for embedding
  };

  const handleFacebookSubmit = async () => {
    if (!facebookUrl.trim()) return;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to add Facebook posts",
          variant: "destructive",
        });
        return;
      }

      const postId = extractFacebookPostId(facebookUrl);
      if (!postId) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid Facebook post or video URL",
          variant: "destructive",
        });
        return;
      }

      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: facebookForm.title || "Facebook Post",
          type: "facebook",
          size: 0,
          url: facebookUrl,
          bucket_name: "Facebook",
          file_path: "Facebook Post",
        })
        .select()
        .single();

      if (fileError) throw fileError;

      const newPost: FileItem = {
        id: fileData.id,
        name: fileData.name,
        type: "facebook",
        size: 0,
        uploadedAt: new Date(fileData.created_at).toISOString().split('T')[0],
        url: facebookUrl,
      };

      onFileUpload([newPost]);
      setFacebookUrl("");
      setFacebookForm({ title: "", description: "" });

      toast({
        title: "Facebook Post Added",
        description: "Post link saved successfully",
      });
    } catch (error) {
      console.error("Facebook submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to add Facebook post. Please try again.",
        variant: "destructive",
      });
    }
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
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'm4a':
      case 'aac':
      case 'flac':
      case 'wma':
        return 'audio';
      default:
        return 'file';
    }
  };

  // Enhanced utility function to extract Google Drive file ID from a link
  const extractDriveFileId = (link: string): string | null => {
    try {
      const patterns = [
        /https:\/\/drive\.google\.com\/file\/d\/([-\w]{25,})/, // Shared file link
        /https:\/\/drive\.google\.com\/open\?id=([-\w]{25,})/, // Open link
        /https:\/\/drive\.google\.com\/uc\?id=([-\w]{25,})/, // Direct download link
      ];

      for (const pattern of patterns) {
        const match = link.match(pattern);
        if (match) return match[1];
      }

      return null; // No match found
    } catch (error) {
      console.error("Error extracting Drive file ID:", error);
      return null;
    }
  };

  // Enhanced utility function to extract Google Drive folder ID from a link
  const extractDriveFolderId = (link: string): string | null => {
    try {
      const patterns = [
        /https:\/\/drive\.google\.com\/drive\/folders\/([-\w]{25,})/, // Shared folder link
        /https:\/\/drive\.google\.com\/drive\/u\/\d+\/folders\/([-\w]{25,})/, // User-specific folder link
      ];

      for (const pattern of patterns) {
        const match = link.match(pattern);
        if (match) return match[1];
      }

      return null; // No match found
    } catch (error) {
      console.error("Error extracting Drive folder ID:", error);
      return null;
    }
  };

  return (
        <Card className="m-4 p-4 bg-surface border-border shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Admin Panel</h3>
            <p className="text-sm text-muted-foreground">Upload files and manage content</p>
          </div>
        </div>

        <Tabs defaultValue="files" className="w-full">
          <div className="space-y-1 mb-4">
            <TabsList className="grid w-full grid-cols-4 gap-1 h-auto p-1">
              <TabsTrigger value="files" className="text-xs">Files</TabsTrigger>
              <TabsTrigger value="folder" className="text-xs">Folder</TabsTrigger>
              <TabsTrigger value="drive-file" className="text-xs">Drive File</TabsTrigger>
              <TabsTrigger value="drive-folder" className="text-xs">Drive Folder</TabsTrigger>
            </TabsList>
            <TabsList className="grid w-full grid-cols-3 gap-1 h-auto p-1">
              <TabsTrigger value="image-links" className="text-xs">Images</TabsTrigger>
              <TabsTrigger value="youtube" className="text-xs">YouTube</TabsTrigger>
              <TabsTrigger value="facebook" className="text-xs">Facebook</TabsTrigger>
            </TabsList>
          </div>

          {/* Files Upload Tab */}
          <TabsContent value="files" className="space-y-3">
            <div className="space-y-2 hidden">
              <Label htmlFor="file-title">Title</Label>
              <Input
                id="file-title"
                placeholder="Enter file collection title..."
                value={fileUploadForm.title}
                onChange={(e) => setFileUploadForm({ ...fileUploadForm, title: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-2 hidden">
              <Label htmlFor="file-description">Description</Label>
              <Textarea
                id="file-description"
                placeholder="Enter file collection description..."
                value={fileUploadForm.description}
                onChange={(e) => setFileUploadForm({ ...fileUploadForm, description: e.target.value })}
                className="text-sm min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-upload-button">Upload Files</Label>
              <Button
                id="file-upload-button"
                variant="default"
                size="sm"
                className="w-full flex items-center justify-center"
                onClick={() => document.getElementById('file-input')?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload Files"}
              </Button>
              <input
                id="file-input"
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          </TabsContent>

          {/* Folder Upload Tab */}
          <TabsContent value="folder" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="folder-title">Folder Title</Label>
              <Input
                id="folder-title"
                placeholder="Enter folder title..."
                value={folderUploadForm.title}
                onChange={(e) => setFolderUploadForm({ ...folderUploadForm, title: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-description">Description</Label>
              <Textarea
                id="folder-description"
                placeholder="Enter folder description..."
                value={folderUploadForm.description}
                onChange={(e) => setFolderUploadForm({ ...folderUploadForm, description: e.target.value })}
                className="text-sm min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-upload-button">Upload Folder</Label>
              <Button
                id="folder-upload-button"
                variant="default"
                size="sm"
                className="w-full flex items-center justify-center"
                onClick={() => document.getElementById('folder-input')?.click()}
                disabled={isFolderUploading}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                {isFolderUploading ? "Uploading..." : "Upload Folder"}
              </Button>
              <input
                id="folder-input"
                type="file"
                {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                onChange={handleFolderUpload}
                className="hidden"
                disabled={isFolderUploading}
              />
              <p className="text-xs text-muted-foreground flex items-center">
                <FolderOpen className="w-3 h-3 mr-1" />
                Select an entire folder with all its files
              </p>
            </div>
          </TabsContent>

          {/* Drive File Links Tab */}
          <TabsContent value="drive-file" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="drive-file-title">Title</Label>
              <Input
                id="drive-file-title"
                placeholder="Enter file title..."
                value={driveFileForm.title}
                onChange={(e) => setDriveFileForm({ ...driveFileForm, title: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drive-file-description">Description</Label>
              <Textarea
                id="drive-file-description"
                placeholder="Enter file description..."
                value={driveFileForm.description}
                onChange={(e) => setDriveFileForm({ ...driveFileForm, description: e.target.value })}
                className="text-sm min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Paste Google Drive file link..."
                  value={driveFileLink}
                  onChange={(e) => setDriveFileLink(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDriveFileSubmit}
                  disabled={!driveFileLink.trim()}
                >
                  <Link2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                Connect a Google Drive file to import
              </p>
            </div>
          </TabsContent>

          {/* Drive Folder Links Tab */}
          <TabsContent value="drive-folder" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="drive-folder-title">Title</Label>
              <Input
                id="drive-folder-title"
                placeholder="Enter folder title..."
                value={driveFolderForm.title}
                onChange={(e) => setDriveFolderForm({ ...driveFolderForm, title: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drive-folder-description">Description</Label>
              <Textarea
                id="drive-folder-description"
                placeholder="Enter folder description..."
                value={driveFolderForm.description}
                onChange={(e) => setDriveFolderForm({ ...driveFolderForm, description: e.target.value })}
                className="text-sm min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Paste Google Drive folder link..."
                  value={driveFolderLink}
                  onChange={(e) => setDriveFolderLink(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDriveFolderSubmit}
                  disabled={!driveFolderLink.trim()}
                >
                  <Link2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <FolderOpen className="w-3 h-3 mr-1" />
                Connect a Google Drive folder to import files
              </p>
            </div>
          </TabsContent>

          {/* Internet Image Links Tab */}
          <TabsContent value="image-links" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="image-title">Image Title</Label>
              <Input
                id="image-title"
                placeholder="Enter image title..."
                value={imageLinksForm.title}
                onChange={(e) => setImageLinksForm({ ...imageLinksForm, title: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-description">Description</Label>
              <Textarea
                id="image-description"
                placeholder="Enter image description..."
                value={imageLinksForm.description}
                onChange={(e) => setImageLinksForm({ ...imageLinksForm, description: e.target.value })}
                className="text-sm min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Paste image URL from internet..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleImageLinkSubmit}
                  disabled={!imageUrl.trim()}
                >
                  <Globe className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <Image className="w-3 h-3 mr-1" />
                Add images from any website URL
              </p>
            </div>
          </TabsContent>

          {/* YouTube Video Tab */}
          <TabsContent value="youtube" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="youtube-title">Video Title</Label>
              <Input
                id="youtube-title"
                placeholder="Enter video title..."
                value={youtubeForm.title}
                onChange={(e) => setYoutubeForm({ ...youtubeForm, title: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Paste YouTube video URL..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleYoutubeSubmit}
                  disabled={!youtubeUrl.trim()}
                >
                  <Youtube className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <Youtube className="w-3 h-3 mr-1" />
                Add YouTube videos to play in the preview
              </p>
            </div>
          </TabsContent>

          {/* Facebook Post Tab */}
          <TabsContent value="facebook" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="facebook-title">Post Title</Label>
              <Input
                id="facebook-title"
                placeholder="Enter post title..."
                value={facebookForm.title}
                onChange={(e) => setFacebookForm({ ...facebookForm, title: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Paste Facebook post or video URL..."
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleFacebookSubmit}
                  disabled={!facebookUrl.trim()}
                >
                  <Facebook className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <Facebook className="w-3 h-3 mr-1" />
                Add Facebook videos, reels, or posts
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};