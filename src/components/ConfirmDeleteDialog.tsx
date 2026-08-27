import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const SKIP_KEY = "skipDeleteConfirm";

export const isDeleteConfirmSkipped = () => {
  try {
    return localStorage.getItem(SKIP_KEY) === "true";
  } catch {
    return false;
  }
};

export const resetDeleteConfirmSkip = () => {
  try {
    localStorage.removeItem(SKIP_KEY);
  } catch {
    /* ignore */
  }
};

interface UseConfirmDeleteOptions {
  /** Only admins get the "don't ask again" option. */
  allowSkip?: boolean;
}

/**
 * Wraps a delete action with a confirmation dialog.
 * Returns `confirmDelete(fn, name?)` to request confirmation and the dialog element to render.
 */
export const useConfirmDelete = ({ allowSkip = false }: UseConfirmDeleteOptions = {}) => {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [dontAsk, setDontAsk] = useState(false);
  const actionRef = useRef<(() => void) | null>(null);

  const confirmDelete = useCallback(
    (action: () => void, name?: string) => {
      if (allowSkip && isDeleteConfirmSkipped()) {
        action();
        return;
      }
      actionRef.current = action;
      setFileName(name);
      setDontAsk(false);
      setOpen(true);
    },
    [allowSkip],
  );

  const handleConfirm = () => {
    if (allowSkip && dontAsk) {
      try {
        localStorage.setItem(SKIP_KEY, "true");
      } catch {
        /* ignore */
      }
    }
    const action = actionRef.current;
    actionRef.current = null;
    setOpen(false);
    action?.();
  };

  const dialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {fileName ? `"${fileName}"` : "this file"}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the file. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {allowSkip && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="dont-ask-delete"
              checked={dontAsk}
              onCheckedChange={(v) => setDontAsk(v === true)}
            />
            <Label htmlFor="dont-ask-delete" className="text-sm font-normal cursor-pointer">
              Don't ask again on this device
            </Label>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirmDelete, dialog };
};
