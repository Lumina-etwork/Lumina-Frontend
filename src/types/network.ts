export interface NodePosition {
  id: string
  x: number
  y: number
  z?: number
  r?: number
  label?: string
  color?: string
  metadata?: Record<string, string | number | boolean | null>
}

export interface Edge {
  id: string
  source: string
  target: string
  weight?: number
  color?: string
  dashed?: boolean
  metadata?: Record<string, string | number | boolean | null>
}

export interface TopologyData {
  nodes: NodePosition[]
  edges: Edge[]
}

export interface Viewport {
  x: number
  y: number
  zoom: number
  width: number
  height: number
}

export type RenderMode = 'webgl2' | 'canvas2d' | 'webgpu'

export interface MeshTopologyConfig {
  nodeRadius: number
  edgeWidth: number
  lodDotRadius: number
  lodNodeThreshold: number
  lodEdgeThreshold: number
  colorNodeDefault: string
  colorEdgeDefault: string
  colorSelected: string
  colorBackground: string
  physicsEnabled: boolean
  /** Max GPU frame time in ms before adaptive quality kicks in (default: 14) */
  adaptiveQualityThreshold: number
  /** Fraction of nodes to hide when frame budget is exceeded (default: 0.25) */
  adaptiveQualityReduceFraction: number
  /** Enable adaptive quality degradation (default: true) */
  adaptiveQualityEnabled: boolean
}

export const DEFAULT_MESH_CONFIG: MeshTopologyConfig = {
  nodeRadius: 6,
  edgeWidth: 1.5,
  lodDotRadius: 2,
  lodNodeThreshold: 0.5,
  lodEdgeThreshold: 0.3,
  colorNodeDefault: '#0f766e',
  colorEdgeDefault: '#94a3b8',
  colorSelected: '#f59e0b',
  colorBackground: '#f7f4ee',
  physicsEnabled: true,
  adaptiveQualityThreshold: 14,
  adaptiveQualityReduceFraction: 0.25,
  adaptiveQualityEnabled: true,
}

export interface PickResult {
  nodeId: string | null
  x: number
  y: number
}

export interface AnalyticsDataPoint {
  timestamp: number
  latency: number
  throughput: number
  packetLoss: number
}

export type RollupGranularity = 'hourly' | 'daily' | 'weekly'

export interface AggregationConfig {
  granularity: RollupGranularity
  startTime: number
  endTime: number
}

export interface RollupBucket {
  bucketStart: number
  bucketEnd: number
  count: number
  avgLatency: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  avgThroughput: number
  avgPacketLoss: number
  minLatency: number
  maxLatency: number
}

export interface AggregatedResult {
  buckets: RollupBucket[]
  overall: {
    totalDataPoints: number
    avgLatency: number
    p50Latency: number
    p95Latency: number
    p99Latency: number
    avgThroughput: number
    avgPacketLoss: number
    minLatency: number
    maxLatency: number
  }
}

export interface AnalyticsWorkerRequest {
  type: 'aggregate'
  payload: {
    data: AnalyticsDataPoint[]
    config: AggregationConfig
    correlationId: string
  }
}

export interface AnalyticsWorkerResponse {
  type: 'result'
  payload: {
    result: AggregatedResult
    correlationId: string
  }
}

export type AnalyticsWorkerMessage = AnalyticsWorkerRequest | AnalyticsWorkerResponse

export interface GeoPosition {
  lat: number
  lng: number
}

export interface NetworkActivityMessage {
  timestamp: number
  sourceLat: number
  sourceLng: number
  targetLat: number
  targetLng: number
  messageCount: number
  nodeId: string
}

export interface HeatmapCell {
  lat: number
  lng: number
  count: number
  weight: number
}

export interface TrafficArc {
  id: string
  sourceLat: number
  sourceLng: number
  targetLat: number
  targetLng: number
  messageCount: number
  color: string
}

export type TimeRange = 'realtime' | '1h' | '6h' | '24h'

export interface NetworkActivityData {
  cells: HeatmapCell[]
  arcs: TrafficArc[]
  messageCount: number
  activeNodes: number
  timestamp: number
}

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  realtime: 'Real-Time',
  '1h': 'Last Hour',
  '6h': 'Last 6 Hours',
  '24h': 'Last 24 Hours',
}

export const TIME_RANGE_WINDOWS: Record<TimeRange, number> = {
  realtime: 5 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
}
