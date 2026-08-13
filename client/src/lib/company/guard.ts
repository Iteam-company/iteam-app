import type { QueryClient } from '@tanstack/react-query'
import { companyApi } from './api'
import { COMPANY_KEY } from './mutations'
import type { Company } from './types'

/**
 * Resolves the current user's company (or null if they don't have one yet),
 * populating the same react-query cache entry useMyCompany() reads.
 *
 * Meant to run from a route's `beforeLoad` to gate pages that assume a
 * company exists — most redirect to /dashboard/company when this resolves
 * to null, since that's where "create or join a company" lives now that
 * onboarding isn't forced immediately after sign-up.
 */
export async function resolveCompany(queryClient: QueryClient): Promise<Company | null> {
  return queryClient.ensureQueryData({
    queryKey: COMPANY_KEY,
    queryFn: () => companyApi.getMe(),
  })
}
