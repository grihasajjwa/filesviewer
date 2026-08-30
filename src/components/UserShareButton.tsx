import { useCallback, useEffect, useState } from "react";
import { UserPlus, Loader2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import type { FileItem } from "./FileManager";

interface UserShareButtonProps {
  file: FileItem;
}

interface ShareRow {
  id: string;
  shared_with_user_id: string;
  shared_with_username: string | null;
}

interface ProfileOption {
  id: string;
  username: string | null;
  email: string | null;
}

export const UserShareButton = ({ file }: UserShareButtonProps) => {
  const { isAdmin } = useUserRole();
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [username, setUsername] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [busy, setBusy] = useState(false);

  const loadShares = useCallback(async () => {
    const { data } = await supabase
      .from("file_user_shares")
      .select("id, shared_with_user_id, shared_with_username")
      .eq("file_id", file.id);
    setShares((data as ShareRow[]) ?? []);
  }, [file.id]);

  useEffect(() => {
    if (!open) return;
    loadShares();
    if (isAdmin) {
      supabase
        .from("profiles")
        .select("id, username, email")
        .order("username")
        .then(({ data }) => setProfiles((data as ProfileOption[]) ?? []));
    }
  }, [open, isAdmin, loadShares]);

  const share = async (targetId: string, targetName: string) => {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth?.user;
      if (!me) {
        toast.error("You must be signed in to share");
        return;
      }
      if (targetId === me.id) {
        toast.error("That is your own account");
        return;
      }

      const { data: fileRow } = await supabase
        .from("files")
        .select("user_id")
        .eq("id", file.id)
        .maybeSingle();

      const { error } = await supabase.from("file_user_shares").insert({
        file_id: file.id,
        owner_id: fileRow?.user_id ?? me.id,
        shared_with_user_id: targetId,
        shared_with_username: targetName,
        shared_by_username: me.email ?? null,
      });

      if (error) {
        toast.error(
          error.code === "23505" ? "Already shared with this user" : error.message,
        );
        return;
      }

      toast.success(`Shared with ${targetName}`);
      setUsername("");
      setSelectedProfile("");
      loadShares();
    } finally {
      setBusy(false);
    }
  };

  const handleUsernameShare = async () => {
    const value = username.trim();
    if (!value) {
      toast.error("Enter a username or email");
      return;
    }
    setBusy(true);
    const { data: targetId, error } = await supabase.rpc("get_user_id_by_username", {
      _username: value,
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (!targetId) {
      toast.error(`No user found with username "${value}"`);
      return;
    }
    await share(targetId as string, value);
  };

  const handleRemove = async (shareId: string) => {
    const { error } = await supabase.from("file_user_shares").delete().eq("id", shareId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sharing removed");
    loadShares();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="text-xs h-7 px-2 sm:h-8 sm:px-3 sm:text-sm"
          title="Share with another user"
        >
          <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span className="hidden xs:inline">Share with user</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">Share this file with another user</Label>
          <p className="text-xs text-muted-foreground">
            The file will appear in their file list.
          </p>
        </div>

        {isAdmin ? (
          <div className="space-y-2">
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger>
                <SelectValue placeholder="Select a username" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.username || p.email || p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full"
              disabled={busy || !selectedProfile}
              onClick={() => {
                const p = profiles.find((x) => x.id === selectedProfile);
                if (p) share(p.id, p.username || p.email || "user");
              }}
            >
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Share
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username or email"
              onKeyDown={(e) => e.key === "Enter" && handleUsernameShare()}
            />
            <Button size="sm" disabled={busy} onClick={handleUsernameShare}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Shared with</p>
          {shares.length === 0 ? (
            <p className="text-xs text-muted-foreground">Not shared with anyone yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {shares.map((s) => (
                <Badge key={s.id} variant="secondary" className="gap-1">
                  {s.shared_with_username || "user"}
                  <button
                    aria-label="Remove sharing"
                    onClick={() => handleRemove(s.id)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
