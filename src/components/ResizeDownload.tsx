import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { bytesToKb, clampTargetKb, downloadResized } from "@/lib/resizeDownload";
import type { FileItem } from "./FileManager";

interface ResizeDownloadProps {
  file: FileItem;
  kind: "image" | "pdf";
}

/**
 * Download section for image and PDF previews: a size input in KB (defaulting to
 * the original size) plus a Download button. A smaller value gets a resized copy.
 */
export const ResizeDownload = ({ file, kind }: ResizeDownloadProps) => {
  const originalKb = file.size > 0 ? bytesToKb(file.size) : null;
  const [kb, setKb] = useState(originalKb ? String(originalKb) : "");
  const [busy, setBusy] = useState(false);

  const parsed = Number(kb);
  const isOriginal =
    originalKb !== null && (!Number.isFinite(parsed) || clampTargetKb(parsed) >= originalKb);

  const handleDownload = async () => {
    if (busy) return;
    const target = Number(kb);
    if (!Number.isFinite(target) || target <= 0) {
      toast.error("Enter a size in KB, e.g. 500.");
      return;
    }
    setBusy(true);
    const used = clampTargetKb(target);
    try {
      await downloadResized(file.url, file.name, used, kind);
      toast.success(
        originalKb !== null && used >= originalKb
          ? "Downloaded original file"
          : `Downloaded at about ${used} KB`,
      );
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
        min={1}
        value={kb}
        onChange={(e) => setKb(e.target.value)}
        aria-label="Download size in KB"
        placeholder={originalKb ? String(originalKb) : "e.g. 500"}
        className="w-20 h-7 text-xs"
      />
      <span className="text-xs text-muted-foreground">KB</span>
      <Button size="sm" variant="secondary" onClick={handleDownload} disabled={busy} className="text-xs h-7 px-2 sm:h-8 sm:px-3">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        <span className="hidden xs:inline">{busy ? "Preparing..." : "Download"}</span>
      </Button>
      <span className="text-xs text-muted-foreground">
        {originalKb !== null
          ? isOriginal
            ? `Original size (${originalKb} KB)`
            : `Resized copy (original: ${originalKb} KB)`
          : "Enter a size in KB"}
      </span>
    </div>
  );
};
