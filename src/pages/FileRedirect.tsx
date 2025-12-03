import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const FileRedirect = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndRedirect = async () => {
      if (!fileId) {
        setError("File ID not found");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("files")
        .select("url, drive_link")
        .eq("id", fileId)
        .single();

      if (fetchError || !data) {
        setError("File not found");
        return;
      }

      const redirectUrl = data.drive_link || data.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        setError("No valid URL found for this file");
      }
    };

    fetchAndRedirect();
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
        <p className="text-muted-foreground">Redirecting to file...</p>
      </div>
    </div>
  );
};

export default FileRedirect;
