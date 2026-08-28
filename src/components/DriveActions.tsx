import { useEffect, useState } from "react";
import { HardDrive, Share2, Copy, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FileItem } from "./FileManager";

interface DriveActionsProps {
  file: FileItem;
}

interface DriveState {
  driveFileId: string | null;
  shared: boolean;
  link: string | null;
}

export const DriveActions = ({ file }: DriveActionsProps) => {
  const [state, setState] = useState<DriveState>({ driveFileId: null, shared: false, link: null });
  const [uploading, setUploading] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let active = true;
    setState({ driveFileId: null, shared: false, link: null });
    supabase
      .from("files")
      .select("drive_file_id, drive_shared, drive_share_link")
      .eq("id", file.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setState({
          driveFileId: data.drive_file_id ?? null,
          shared: !!data.drive_shared,
          link: data.drive_share_link ?? null,
        });
      });
    return () => {
      active = false;
    };
  }, [file.id]);

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("drive-sync", { body });
    if (error) {
      const details =
        typeof (error as { context?: { text?: () => Promise<string> } }).context?.text === "function"
          ? await (error as { context: { text: () => Promise<string> } }).context.text()
          : error.message;
      throw new Error(details);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const data = await call({ action: "upload", fileId: file.id });
      setState((s) => ({ ...s, driveFileId: data.driveFileId, link: data.driveLink ?? s.link }));
      toast.success(data.alreadyUploaded ? "Already in Drive" : 'Uploaded to Drive folder "Files Manager"');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Drive upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleToggleShare = async (enabled: boolean) => {
    setToggling(true);
    try {
      const data = await call({ action: "set_share", fileId: file.id, enabled });
      setState((s) => ({ ...s, shared: enabled, link: data.driveLink ?? s.link }));
      toast.success(enabled ? "Sharing link enabled" : "Sharing link disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update sharing");
    } finally {
      setToggling(false);
    }
  };

  const copyLink = async () => {
    if (!state.link) return;
    await navigator.clipboard.writeText(state.link);
    toast.success("Drive link copied");
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleUpload}
        disabled={uploading}
        className="text-xs h-7 px-2 sm:h-8 sm:px-3 sm:text-sm"
        title="Upload to Google Drive"
      >
        {uploading ? (
          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 animate-spin" />
        ) : (
          <HardDrive className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-blue-500" />
        )}
        <span className="hidden xs:inline">{state.driveFileId ? "In Drive" : "Drive"}</span>
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="text-xs h-7 px-2 sm:h-8 sm:px-3 sm:text-sm"
            title="Share options"
          >
            <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden xs:inline">Share</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          {!state.driveFileId ? (
            <p className="text-sm text-muted-foreground">
              Upload this file to Google Drive first, then you can turn on a sharing link.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`share-${file.id}`} className="text-sm">
                  Anyone with the link
                </Label>
                <Switch
                  id={`share-${file.id}`}
                  checked={state.shared}
                  disabled={toggling}
                  onCheckedChange={handleToggleShare}
                />
              </div>
              {state.shared && state.link && (
                <div className="space-y-2">
                  <p className="text-xs break-all text-muted-foreground">{state.link}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={copyLink}>
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => window.open(state.link!, "_blank")}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Open
                    </Button>
                  </div>
                </div>
              )}
              {!state.shared && (
                <p className="text-xs text-muted-foreground">
                  Sharing is off. Turn it on to create a public Drive link.
                </p>
              )}
            </>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
};
