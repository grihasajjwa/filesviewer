import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const FileRedirect = () => {
  const { token } = useParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndRedirect = async () => {
      if (!token) {
        setError("Invalid share link");
        return;
      }

      // Use the secure function to get file by share token
      const { data, error: fetchError } = await supabase
        .rpc('get_file_by_share_token', { token })
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching file:", fetchError);
        setError("Unable to access this file");
        return;
      }

      if (!data) {
        setError("This share link is invalid or has expired");
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
  }, [token]);

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
