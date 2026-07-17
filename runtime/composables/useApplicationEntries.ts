import { useApplicationManager } from './useApplicationManager'

/**
 * @deprecated Use useApplicationManager().getSortedEntries() or useDesktop().apps.getSortedEntries() instead
 */
export function useApplicationEntries() {
  const applicationManager = useApplicationManager()

  return {
    sortedAppEntries: applicationManager.getSortedEntries,
  }
}
