import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Session/identity data doesn't change on its own — refetching on
        // every window focus would just be noise for an internal ERP.
        staleTime: 60 * 1000,
        retry: false,
      },
    },
  })
}
