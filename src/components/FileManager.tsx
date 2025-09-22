import { useState } from "react";
import { FileList } from "./FileList";
import { FilePreview } from "./FilePreview";
import { AdminPanel } from "./AdminPanel";
import { Button } from "@/components/ui/button";
import { User, Shield } from "lucide-react";

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  url: string;
  thumbnail?: string;
}

const mockFiles: FileItem[] = [
  {
    id: "1",
    name: "Project_Proposal.pdf",
    type: "pdf",
    size: 2.5 * 1024 * 1024,
    uploadedAt: "2024-01-15",
    url: "/sample.pdf",
  },
  {
    id: "2", 
    name: "Design_Mockups.png",
    type: "image",
    size: 1.8 * 1024 * 1024,
    uploadedAt: "2024-01-14",
    url: "/placeholder.svg",
  },
  {
    id: "3",
    name: "Technical_Specs.docx",
    type: "document",
    size: 0.9 * 1024 * 1024,
    uploadedAt: "2024-01-13",
    url: "/sample.docx",
  },
  {
    id: "4",
    name: "Budget_Analysis.xlsx",
    type: "spreadsheet", 
    size: 1.2 * 1024 * 1024,
    uploadedAt: "2024-01-12",
    url: "/sample.xlsx",
  },
  {
    id: "5",
    name: "Presentation_Slides.pptx",
    type: "presentation",
    size: 3.1 * 1024 * 1024,
    uploadedAt: "2024-01-11",
    url: "/sample.pptx",
  },
];

export const FileManager = () => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [files, setFiles] = useState<FileItem[]>(mockFiles);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = (newFiles: FileItem[]) => {
    setFiles(prev => [...newFiles, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">FM</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">File Manager</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant={isAdmin ? "default" : "secondary"}
              size="sm"
              onClick={() => setIsAdmin(!isAdmin)}
              className="flex items-center space-x-2"
            >
              {isAdmin ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
              <span>{isAdmin ? "Admin" : "User"}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - File List */}
        <div className="w-1/3 border-r border-border bg-card">
          <div className="h-full flex flex-col">
            {isAdmin && (
              <div className="border-b border-border">
                <AdminPanel onFileUpload={handleFileUpload} />
              </div>
            )}
            
            <FileList
              files={filteredFiles}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        </div>

        {/* Right Panel - File Preview */}
        <div className="flex-1 bg-surface">
          <FilePreview file={selectedFile} />
        </div>
      </div>
    </div>
  );
};