import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Snappy feel: serve cache instantly, refresh in background. 2 min keeps
        // tab-bar hops (feed → inbox → me) completely cache-hit.
        staleTime: 2 * 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload on intent (hover / touchstart) — chunk + data ready before tap lands.
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    defaultPreloadStaleTime: 0, // Query owns freshness
    // If a navigation resolves in <300ms, never flash the pending state.
    defaultPendingMs: 300,
    defaultPendingMinMs: 150,
  });

  return router;
};
