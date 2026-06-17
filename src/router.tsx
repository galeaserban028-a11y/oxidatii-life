import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Snappy feel: serve cache instantly, refresh in background
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload-ul "intent" declanșa erori interne în router (_nonReactive) la atingerea taburilor,
    // care flash-uiau ErrorComponent-ul. "viewport" e mai blând și nu se mai întâmplă.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    // Keep the previous page on screen while the next route's loader runs,
    // so we never flash an empty/loading page during navigation.
    defaultPendingMs: 2000,
    defaultPendingMinMs: 0,
  });

  return router;
};
