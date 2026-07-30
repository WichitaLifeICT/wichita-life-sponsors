import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Pencil, Truck, DollarSign, Wallet, Boxes } from "lucide-react";

import { getDistributionData } from "@/lib/data/distribution";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductDialog } from "@/components/distribution/product-dialog";
import { LocationDialog } from "@/components/distribution/location-dialog";
import { formatCurrency, formatCurrencyShort, formatDate, humanize } from "@/lib/format";

export const metadata: Metadata = { title: "Distribution — Wichita Life" };

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function DistributionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = str(sp.tab) ?? "dropoffs";
  const { dropoffs, products, locations, summary } = await getDistributionData();

  const cards = [
    { label: "Wholesale outstanding", value: formatCurrencyShort(summary.wholesaleOutstanding), icon: DollarSign },
    { label: "Wholesale collected", value: formatCurrencyShort(summary.wholesaleCollected), icon: Wallet },
    { label: "Consignment earned", value: formatCurrencyShort(summary.consignmentCutEarned), icon: DollarSign },
    { label: "Units on shelves", value: String(summary.unitsOnShelf), icon: Boxes },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distribution"
        description="Wholesale & consignment drop-offs of puzzles, hats, and other products."
        actions={
          <Button asChild>
            <Link href="/distribution/dropoffs/new">
              <Plus className="size-4" />
              New drop-off
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-xl font-semibold">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="dropoffs">Drop-offs</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        {/* Drop-offs */}
        <TabsContent value="dropoffs">
          {dropoffs.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No drop-offs yet"
              description="Record a wholesale or consignment drop-off to start tracking."
              action={
                <Button asChild>
                  <Link href="/distribution/dropoffs/new">
                    <Plus className="size-4" />
                    New drop-off
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Units</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dropoffs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.locationName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(d.delivered_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.deal_type === "wholesale" ? "secondary" : "outline"}>
                          {humanize(d.deal_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {d.deal_type === "consignment"
                          ? `${d.onShelf}/${d.units}`
                          : d.units}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(d.value)}
                      </TableCell>
                      <TableCell>
                        {d.deal_type === "wholesale" ? (
                          <Badge variant={d.paid ? "success" : "warning"}>
                            {d.paid ? "Paid" : "Unpaid"}
                          </Badge>
                        ) : (
                          <Badge variant={d.settled ? "success" : "secondary"}>
                            {d.settled ? "Settled" : "Active"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/distribution/dropoffs/${d.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Products */}
        <TabsContent value="products">
          <div className="mb-3 flex justify-end">
            <ProductDialog
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  New product
                </Button>
              }
            />
          </div>
          {products.length === 0 ? (
            <EmptyState icon={Boxes} title="No products yet" description="Add the puzzles, hats, and other items you distribute." />
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Retail</TableHead>
                    <TableHead className="text-right">Wholesale</TableHead>
                    <TableHead className="text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {humanize(p.category)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(p.retail_price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(p.wholesale_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ProductDialog
                          product={p}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Edit product">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Locations */}
        <TabsContent value="locations">
          <div className="mb-3 flex justify-end">
            <LocationDialog
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  New location
                </Button>
              }
            />
          </div>
          {locations.length === 0 ? (
            <EmptyState icon={Truck} title="No locations yet" description="Add the shops and places where you drop off product." />
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.contact_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <LocationDialog
                          location={l}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Edit location">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
