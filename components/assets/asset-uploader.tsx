"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  recordUploadedAsset,
  addExternalAsset,
} from "@/lib/actions/assets";
import { ASSET_BUCKET, MAX_ASSET_MB, ALLOWED_ASSET_TYPES } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const TYPES = ["logo", "photo", "brand_guide", "ad_copy", "contract", "invoice", "report", "other"];
const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function AssetUploader({
  sponsorId,
  orgId,
}: {
  sponsorId: string;
  orgId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "link">("file");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("logo");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName(""); setFile(null); setUrl(""); setError(null); setAssetType("logo"); setMode("file");
  };

  async function submit() {
    setError(null);
    const displayName = name.trim() || file?.name || "Untitled";

    if (mode === "link") {
      if (!url.trim()) return setError("Enter a URL.");
      setBusy(true);
      const res = await addExternalAsset(sponsorId, {
        name: displayName,
        asset_type: assetType,
        external_url: url.trim(),
      });
      setBusy(false);
      if (!res.ok) return setError(res.error ?? "Failed.");
    } else {
      if (!file) return setError("Choose a file.");
      if (file.size > MAX_ASSET_MB * 1024 * 1024)
        return setError(`File is too large (max ${MAX_ASSET_MB} MB).`);
      if (file.type && !ALLOWED_ASSET_TYPES.includes(file.type))
        return setError("That file type isn't allowed.");

      setBusy(true);
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${orgId}/${sponsorId}/${Date.now()}-${safe}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(ASSET_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) {
        setBusy(false);
        return setError("Upload failed. Check your connection and try again.");
      }
      const res = await recordUploadedAsset(sponsorId, {
        name: displayName,
        asset_type: assetType,
        path,
        size: file.size,
        mime: file.type || "application/octet-stream",
      });
      setBusy(false);
      if (!res.ok) return setError(res.error ?? "Failed.");
    }

    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="size-4" />
          Upload asset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-1 rounded-md border p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setMode("file")}
              className={`flex-1 rounded px-2 py-1 ${mode === "file" ? "bg-secondary font-medium" : ""}`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`flex-1 rounded px-2 py-1 ${mode === "link" ? "bg-secondary font-medium" : ""}`}
            >
              External link
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="a_name">Name</Label>
              <Input
                id="a_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a_type">Type</Label>
              <select
                id="a_type"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className={selectClass}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mode === "file" ? (
            <div className="space-y-2">
              <Label htmlFor="a_file">File</Label>
              <input
                id="a_file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Max {MAX_ASSET_MB} MB. Images, PDF, docs, zip, CSV.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="a_url">URL</Label>
              <Input
                id="a_url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Save asset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
