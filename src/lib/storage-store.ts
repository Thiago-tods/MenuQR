"use client";

/**
 * Store mínimo sobre Web Storage para useSyncExternalStore. O snapshot só muda
 * quando o texto salvo muda, mantendo a referência estável entre renders.
 */
export function createStorageStore<T>(
  area: () => Storage,
  key: string,
  parse: (raw: string | null) => T,
  empty: T,
) {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | null = null;

  const read = (): string | null => {
    try {
      return area().getItem(key);
    } catch {
      return null;
    }
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    getSnapshot(): T {
      const raw = read();
      if (!cache || cache.raw !== raw) cache = { raw, value: parse(raw) };
      return cache.value;
    },
    getServerSnapshot: (): T => empty,
    write(value: T | null) {
      try {
        if (value === null) area().removeItem(key);
        else area().setItem(key, JSON.stringify(value));
      } catch {
        /* storage cheio ou bloqueado */
      }
      listeners.forEach((l) => l());
    },
  };
}
