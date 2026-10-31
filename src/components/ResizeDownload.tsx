import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { downloadResized } from "@/lib/resizeDownload";
import type { FileItem } from "./FileManager";

interface ResizeDownloadProps {
  file: FileItem;
  kind: "image" | "pdf";
}

/**
 * Download section for image and PDF previews: a size input (percent of the
 * original, 100 = original size by default) plus a Download button.
 */
export const ResizeDownload = ({ file, kind }: ResizeDownloadProps) => {
  const [percent, setPercent] = useState("100");
  const [busy, setBusy] = useState(false);

  const parsed = Number(percent);
  const isOriginal = !Number.isFinite(parsed) || parsed === 100;

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadResized(file.url, file.name, parsed, kind);
      toast.success(isOriginal ? "Downloaded original file" : `Downloaded at ${Math.round(parsed)}% size`);
    } catch (error) {
      console.error("Resize download failed:", error);
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Download failed. Try the Open button instead.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap px-2 sm:px-4 py-2 border-b border-border bg-muted/20">
      <span className="text-xs text-muted-foreground">Download size</span>
      <Input
        type="number"
        inputMode="numeric"
        min={5}
        max={200}
        value={percent}
        onChange={(e) => setPercent(e.target.value)}
        aria-label="Download size percent"
        className="w-20 h-7 text-xs"
      />
      <span className="text-xs text-muted-foreground">%</span>
      <Button size="sm" variant="secondary" onClick={handleDownload} disabled={busy} className="text-xs h-7 px-2 sm:h-8 sm:px-3">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        <span className="hidden xs:inline">{busy ? "Preparing..." : "Download"}</span>
      </Button>
      <span className="text-xs text-muted-foreground">
        {isOriginal ? "Original size" : "Resized copy"}
      </span>
    </div>
  );
};
