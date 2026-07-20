import axios from 'axios'
import { useWorkspaceStore } from '../../store/workspaceStore'

export const apiClient = axios.create({
  baseURL: '/api',
})

apiClient.interceptors.request.use((config) => {
  const activeOrg = useWorkspaceStore.getState().activeOrg
  const orgId = config.params?.orgId || config.headers?.['X-Org-Id'] || activeOrg?.id
  if (orgId) {
    config.headers['X-Org-Id'] = orgId
  }
  return config
})

export async function streamExport(
  url: string,
  data: { format: 'csv' | 'json'; startDate: string; endDate: string },
  onProgress?: (bytesReceived: number) => void
): Promise<Response> {
  const activeOrg = useWorkspaceStore.getState().activeOrg
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Stream-Export': 'true',
  }
  if (activeOrg?.id) {
    headers['X-Org-Id'] = activeOrg.id
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`)
  }

  return response
}
