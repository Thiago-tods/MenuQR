"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createStorageStore } from "@/lib/storage-store";

export type BoundTable = { code: string; name: string };

function parseTable(raw: string | null): BoundTable | null {
  try {
    const v = raw ? (JSON.parse(raw) as BoundTable) : null;
    return v && typeof v.code === "string" && typeof v.name === "string" ? v : null;
  } catch {
    return null;
  }
}

const store = createStorageStore<BoundTable | null>(
  () => sessionStorage,
  "menuqr.table.v1",
  parseTable,
  null,
);

export function useBoundTable(): BoundTable | null {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

/** Guarda a mesa já validada pelo servidor (ver app/(public)/page.tsx). */
export function TableBinding({ table }: { table: BoundTable | null }) {
  useEffect(() => {
    if (table) store.write(table);
  }, [table]);
  const bound = useBoundTable();
  if (!bound) return null;
  return (
    <p className="bg-olive/10 text-olive rounded-lg px-3 py-2 text-sm font-medium">
      Você está na {bound.name}.
    </p>
  );
}
