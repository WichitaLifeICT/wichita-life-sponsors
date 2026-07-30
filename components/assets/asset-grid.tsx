import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DeleteAssetButton } from "@/components/assets/delete-asset-button";
import { formatDate, formatFileSize, humanize } from "@/lib/format";
import type { AssetRow } from "@/lib/data/assets";

export function AssetGrid({
  assets,
  showSponsor = false,
}: {
  assets: AssetRow[];
  showSponsor?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((a) => (
        <div key={a.id} className="flex flex-col overflow-hidden rounded-lg border bg-card">
          <div className="flex h-36 items-center justify-center bg-muted/40">
            {a.isImage && a.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.url}
                alt={a.name ?? "asset"}
                className="h-full w-full object-contain"
              />
            ) : (
              <FileText className="size-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-medium">{a.name ?? "Untitled"}</p>
              <DeleteAssetButton
                id={a.id}
                path={a.file_url}
                sponsorId={a.sponsor_id}
                name={a.name ?? "this asset"}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{humanize(a.asset_type)}</Badge>
              {a.external_url && <Badge variant="secondary">Link</Badge>}
            </div>
            {showSponsor && (
              <Link
                href={`/sponsors/${a.sponsor_id}`}
                className="truncate text-xs text-muted-foreground hover:underline"
              >
                {a.sponsorName}
              </Link>
            )}
            <p className="text-xs text-muted-foreground">
              {formatFileSize(a.file_size)} · {formatDate(a.created_at)}
            </p>
            {a.url && (
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {a.external_url ? "Open link" : "Download"}
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
