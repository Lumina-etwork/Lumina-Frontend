export interface ReportData {
  facilitySummary: {
    healthScore: number;
    activeNodes: number;
    totalNodes: number;
    activeAlerts: number;
    uptime: string;
    avgLatency: string;
    avgThroughput: string;
  };
  nodeInventory: Array<{
    id: string;
    label: string;
    location: string;
    ownerName: string;
    ipAddress: string;
    firmwareVersion: string;
    uptime: string;
    status: 'online' | 'offline' | 'degraded';
  }>;
  alerts: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
    nodeId?: string;
  }>;
  bandwidthGraphs: Array<{
    timestamp: number;
    throughput: number;
    latency: number;
  }>;
}

export interface ReportVolume {
  volumeNumber: number;
  title: string;
  facilitySummary?: ReportData['facilitySummary'];
  bandwidthGraphs?: ReportData['bandwidthGraphs'];
  nodeInventory: ReportData['nodeInventory'];
  alerts: ReportData['alerts'];
}

/**
 * Splits report data into volumes to stay within the 50-page boundary per volume.
 *
 * Page allocations:
 * - Summary & graphs are only in Volume 1 (takes 2 pages).
 * - Node Inventory: 25 nodes per page.
 * - Alerts: 30 alerts per page.
 */
export function splitReportIntoVolumes(data: ReportData): ReportVolume[] {
  const volumes: ReportVolume[] = [];
  let currentVolumeNodes: ReportData['nodeInventory'] = [];
  let currentVolumeAlerts: ReportData['alerts'] = [];

  let currentPageCount = 2; // page 1: Summary, page 2: Graphs
  let currentVolumeNumber = 1;

  // 1. Distribute Node Inventory
  for (let i = 0; i < data.nodeInventory.length; i++) {
    const nodeIndexInCurrentVolume = currentVolumeNodes.length;
    const estimatedNewPage = nodeIndexInCurrentVolume > 0 && nodeIndexInCurrentVolume % 25 === 0;

    if (estimatedNewPage && currentPageCount >= 50) {
      // Flush current volume and start a new one
      volumes.push({
        volumeNumber: currentVolumeNumber,
        title: `Audit Report - Volume ${currentVolumeNumber}`,
        facilitySummary: currentVolumeNumber === 1 ? data.facilitySummary : undefined,
        bandwidthGraphs: currentVolumeNumber === 1 ? data.bandwidthGraphs : undefined,
        nodeInventory: currentVolumeNodes,
        alerts: [],
      });
      currentVolumeNumber++;
      currentVolumeNodes = [];
      currentPageCount = 1; // resets for the new volume
    } else if (estimatedNewPage) {
      currentPageCount++;
    }
    currentVolumeNodes.push(data.nodeInventory[i]);
  }

  // 2. Distribute Alerts
  for (let i = 0; i < data.alerts.length; i++) {
    const alertIndexInCurrentVolume = currentVolumeAlerts.length;
    const estimatedNewPage = alertIndexInCurrentVolume > 0 && alertIndexInCurrentVolume % 30 === 0;

    if (estimatedNewPage && currentPageCount >= 50) {
      // Flush current volume
      volumes.push({
        volumeNumber: currentVolumeNumber,
        title: `Audit Report - Volume ${currentVolumeNumber}`,
        facilitySummary: currentVolumeNumber === 1 ? data.facilitySummary : undefined,
        bandwidthGraphs: currentVolumeNumber === 1 ? data.bandwidthGraphs : undefined,
        nodeInventory: currentVolumeNodes,
        alerts: currentVolumeAlerts,
      });
      currentVolumeNumber++;
      currentVolumeNodes = []; // Node inventory already fully distributed
      currentVolumeAlerts = [];
      currentPageCount = 1; // resets for the new volume
    } else if (estimatedNewPage) {
      currentPageCount++;
    }
    currentVolumeAlerts.push(data.alerts[i]);
  }

  // 3. Flush final volume
  if (currentVolumeNodes.length > 0 || currentVolumeAlerts.length > 0 || currentVolumeNumber === 1) {
    volumes.push({
      volumeNumber: currentVolumeNumber,
      title: `Audit Report - Volume ${currentVolumeNumber}`,
      facilitySummary: currentVolumeNumber === 1 ? data.facilitySummary : undefined,
      bandwidthGraphs: currentVolumeNumber === 1 ? data.bandwidthGraphs : undefined,
      nodeInventory: currentVolumeNodes,
      alerts: currentVolumeAlerts,
    });
  }

  return volumes;
}
