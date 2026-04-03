import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type ImportFactory<T extends ComponentType<unknown>> = () => Promise<{ default: T }>;

export type PreloadableComponent<T extends ComponentType<unknown>> = LazyExoticComponent<T> & {
  preload: () => Promise<unknown>;
};

const CHUNK_RETRY_STORAGE_KEY = "lazy-chunk-retry";

const isChunkLoadError = (error: unknown) => {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("loading chunk") ||
    message.includes("chunkloaderror") ||
    message.includes("importing a module script failed")
  );
};

const withChunkRetry = async <T extends ComponentType<unknown>>(factory: ImportFactory<T>) => {
  try {
    const importedModule = await factory();
    sessionStorage.removeItem(CHUNK_RETRY_STORAGE_KEY);
    return importedModule;
  } catch (error) {
    const alreadyRetried = sessionStorage.getItem(CHUNK_RETRY_STORAGE_KEY) === "1";

    if (!alreadyRetried && isChunkLoadError(error)) {
      sessionStorage.setItem(CHUNK_RETRY_STORAGE_KEY, "1");
      window.location.reload();
      return new Promise<never>(() => undefined);
    }

    sessionStorage.removeItem(CHUNK_RETRY_STORAGE_KEY);
    throw error;
  }
};

export const lazyWithRetry = <T extends ComponentType<unknown>>(
  factory: ImportFactory<T>,
): PreloadableComponent<T> => {
  const load = () => withChunkRetry(factory);
  const Component = lazy(load) as PreloadableComponent<T>;
  Component.preload = load;
  return Component;
};
