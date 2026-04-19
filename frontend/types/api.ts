export type DateRange = {
  start: string;
  end: string;
};

export type GeoJsonGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export type AreaRequest = {
  aoi: GeoJsonGeometry;
  before: DateRange;
  after: DateRange;
  max_cloud_cover: number;
};

export type ChangeMetrics = {
  total_change: number;
  vegetation_change: number;
  urban_change: number;
  water_change: number;
  change_intensity: number;
  valid_pixels: number;
  ndvi_before_mean: number;
  ndvi_after_mean: number;
  ndwi_before_mean: number;
  ndwi_after_mean: number;
};

export type AnalyzeResponse = {
  metrics: ChangeMetrics;
  before_scene_id: string;
  after_scene_id: string;
  before_preview_url?: string | null;
  after_preview_url?: string | null;
  vegetation_change_mask: number[][];
  water_change_mask: number[][];
  urban_change_mask: number[][];
};

export type FetchSentinelResponse = {
  before_scene_id: string;
  after_scene_id: string;
  before_preview_url?: string | null;
  after_preview_url?: string | null;
  before_acquired: string;
  after_acquired: string;
};

export type AiInsightPayload = {
  NDVI_mean: number;
  vegetation_change: number;
  urban_change: number;
  water_change: number;
  change_intensity: number;
  question?: string;
};
