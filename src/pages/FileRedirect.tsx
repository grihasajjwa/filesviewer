import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SUPABASE_URL } from "@/integrations/supabase/client";

const FileRedirect = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectToFile = async () => {
      if (!fileId) {
        setError("File ID not found");
        return;
      }

      // Redirect to the edge function proxy URL
      const proxyUrl = `${SUPABASE_URL}/functions/v1/file-proxy?fileId=${fileId}`;
      window.location.href = proxyUrl;
    };

    redirectToFile();
  }, [fileId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading file...</p>
      </div>
    </div>
  );
};

export default FileRedirect;
