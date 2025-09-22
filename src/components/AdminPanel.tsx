import { useState } from "react";
import { Upload, Link2, Plus, FolderOpen, FileText } from "lucide-react";
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

export const AdminPanel = ({ onFileUpload }: AdminPanelProps) => {
  const [driveFileLink, setDriveFileLink] = useState("");
  const [driveFolderLink, setDriveFolderLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Form states for each tab
  const [fileUploadForm, setFileUploadForm] = useState({ title: "", description: "" });
  const [driveFileForm, setDriveFileForm] = useState({ title: "", description: "" });
  const [driveFolderForm, setDriveFolderForm] = useState({ title: "", description: "" });
  
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

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

  const handleDriveFolderSubmit = () => {
    if (!driveFolderLink.trim()) return;

    // Simulate Google Drive folder integration
    const mockDriveFiles: FileItem[] = [
      {
        id: `drive-folder-${Date.now()}-1`,
        name: driveFolderForm.title || "Shared_Document.pdf",
        type: "pdf",
        size: 1.5 * 1024 * 1024,
        uploadedAt: new Date().toISOString().split('T')[0],
        url: "/sample.pdf",
      },
      {
        id: `drive-folder-${Date.now()}-2`,
        name: "Team_Photo.jpg",
        type: "image",
        size: 2.1 * 1024 * 1024,
        uploadedAt: new Date().toISOString().split('T')[0],
        url: "/placeholder.svg",
      },
    ];

    onFileUpload(mockDriveFiles);
    setDriveFolderLink("");
    setDriveFolderForm({ title: "", description: "" });
    
    toast({
      title: "Drive Folder Connected",
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

  return (
    <Card className="m-4 p-4 bg-surface border-border shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 bg-gradient-primary rounded flex items-center justify-center">
            <Plus className="w-3 h-3 text-primary-foreground" />
          </div>
          <h3 className="font-medium text-foreground">Admin Panel</h3>
        </div>

        <Tabs defaultValue="files" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="files" className="text-xs">Files Upload</TabsTrigger>
            <TabsTrigger value="drive-file" className="text-xs">Drive File</TabsTrigger>
            <TabsTrigger value="drive-folder" className="text-xs">Drive Folder</TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>
    </Card>
  );
};