"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Copy, Power, PowerOff } from "lucide-react";

import { duplicatePackage, setPackageActive } from "@/lib/actions/packages";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PackageActions({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const duplicate = duplicatePackage.bind(null, id);
  const toggle = setPackageActive.bind(null, id, !active);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Package actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/packages/${id}/edit`}>
            <Pencil className="size-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <form action={duplicate}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <Copy className="size-4" />
              Duplicate
            </button>
          </DropdownMenuItem>
        </form>
        <DropdownMenuSeparator />
        <form action={toggle}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              {active ? (
                <>
                  <PowerOff className="size-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <Power className="size-4" />
                  Activate
                </>
              )}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
