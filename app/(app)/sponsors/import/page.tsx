import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SponsorImportForm } from "@/components/import/sponsor-import-form";

export const metadata: Metadata = { title: "Import sponsors — Wichita Life" };

export default function ImportSponsorsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/sponsors">
            <ArrowLeft className="size-4" />
            Sponsors
          </Link>
        </Button>
        <PageHeader
          title="Import sponsors"
          description="Bring in your real sponsors from a spreadsheet."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-inside list-decimal space-y-1">
            <li>Download the template and fill in one sponsor per row.</li>
            <li>Only <code>company_name</code> is required; everything else is optional.</li>
            <li>
              Duplicates are skipped automatically (matched by company name or
              primary contact email).
            </li>
            <li>
              Add a <code>package</code> column with an exact package name to
              auto-assign it, or assign packages later.
            </li>
          </ol>
          <Button asChild variant="outline" size="sm">
            <a href="/sponsor-import-template.csv" download>
              <Download className="size-4" />
              Download template
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <SponsorImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
