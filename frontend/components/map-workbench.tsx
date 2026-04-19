"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Layers, Search, Trees } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";

import { analyzeArea } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGarudaStore } from "@/store/use-garuda-store";
import type { GeoJsonGeometry } from "@/types/api";

type DrawCreatedEvent = {
  layer: { toGeoJSON: () => { geometry: GeoJsonGeometry } };
};

type DrawEditedEvent = {
  layers: {
    eachLayer: (callback: (layer: { toGeoJSON?: () => { geometry: GeoJsonGeometry } }) => void) => void;
  };
};

type EditControlProps = {
  position?: "topleft" | "topright" | "bottomleft" | "bottomright";
  onCreated?: (event: DrawCreatedEvent) => void;
  onEdited?: (event: DrawEditedEvent) => void;
  onDeleted?: () => void;
  draw?: Record<string, boolean | Record<string, unknown>>;
};

type MapContainerProps = {
  center: [number, number];
  zoom: number;
  style?: CSSProperties;
  children?: ReactNode;
  whenReady?: (event: { target: LeafletMap }) => void;
};

const MapContainer = dynamic<MapContainerProps>(
  async () => (await import("react-leaflet")).MapContainer as ComponentType<MapContainerProps>,
  { ssr: false }
);
const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, { ssr: false });
const GeoJSON = dynamic(async () => (await import("react-leaflet")).GeoJSON, { ssr: false });
const FeatureGroup = dynamic(async () => (await import("react-leaflet")).FeatureGroup, { ssr: false });
const EditControl = dynamic<EditControlProps>(
  async () => {
    await import("leaflet-draw");
    const drawModule = await import("react-leaflet-draw");
    return drawModule.EditControl as ComponentType<EditControlProps>;
  },
  { ssr: false }
);

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const defaultCenter: [number, number] = [20.5937, 78.9629];

function clampCloudCover(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export function MapWorkbench() {
  const {
    aoi,
    before,
    after,
    cloudCover,
    analysis,
    searchLabel,
    ndviOverlayEnabled,
    changeOverlayEnabled,
    loading,
    error,
    setAoi,
    setBefore,
    setAfter,
    setCloudCover,
    setSentinel,
    setAnalysis,
    setLoading,
    setError,
    setSearchLabel,
    toggleNdviOverlay,
    toggleChangeOverlay,
  } = useGarudaStore();

  const [query, setQuery] = useState("");
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [drawReady, setDrawReady] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);

  useEffect(() => {
    const setupLeafletDraw = async () => {
      const leafletModule = await import("leaflet");
      await import("leaflet-draw/dist/leaflet.draw.css");
      if (typeof window !== "undefined") {
        (window as Window & { L?: typeof leafletModule.default }).L = leafletModule.default;
      }
      setDrawReady(true);
    };

    void setupLeafletDraw();
  }, []);

  useEffect(() => {
    if (!map) {
      return;
    }
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  const handleCreated = (event: DrawCreatedEvent) => {
    const layer = event.layer;
    const geometry = layer.toGeoJSON().geometry as GeoJsonGeometry;
    setAoi(geometry);
  };

  const handleEdited = (event: DrawEditedEvent) => {
    event.layers.eachLayer((layer) => {
      if ("toGeoJSON" in layer) {
        const geometry = layer.toGeoJSON?.().geometry as GeoJsonGeometry;
        setAoi(geometry);
      }
    });
  };

  const handleDeleted = () => setAoi(null);

  const searchPlace = async () => {
    if (!query.trim()) {
      return;
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}.`);
      }
      const results = (await response.json()) as NominatimResult[];
      if (results.length > 0) {
        const first = results[0];
        setCenter([Number(first.lat), Number(first.lon)]);
        setSearchLabel(first.display_name);
        setError(null);
      } else {
        setError("No matching place found.");
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
    }
  };

  const payload = useMemo(
    () =>
      aoi
        ? {
            aoi,
            before,
            after,
            max_cloud_cover: cloudCover,
          }
        : null,
    [aoi, before, after, cloudCover]
  );

  const runAnalysis = async () => {
    if (!payload) {
      setError("Draw an AOI polygon before running analysis.");
      return;
    }
    if (before.start > before.end || after.start > after.end) {
      setError("Start dates must be earlier than end dates.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const analysisResult = await analyzeArea(payload);
      setSentinel({
        before_scene_id: analysisResult.before_scene_id,
        after_scene_id: analysisResult.after_scene_id,
        before_preview_url: analysisResult.before_preview_url ?? null,
        after_preview_url: analysisResult.after_preview_url ?? null,
        before_acquired: "",
        after_acquired: "",
      });
      setAnalysis(analysisResult);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const vegetationRows = analysis?.vegetation_change_mask.length ?? 0;
  const urbanRows = analysis?.urban_change_mask.length ?? 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <CardTitle>AOI Mapping Studio</CardTitle>
            <CardDescription>Search, zoom, and draw a polygon to compare land cover across two periods.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant={ndviOverlayEnabled ? "default" : "secondary"} onClick={toggleNdviOverlay}>
              <Trees className="mr-2 h-4 w-4" />
              NDVI Overlay
            </Button>
            <Button variant={changeOverlayEnabled ? "default" : "secondary"} onClick={toggleChangeOverlay}>
              <Layers className="mr-2 h-4 w-4" />
              Change Overlay
            </Button>
          </div>
        </div>
        <div className="h-[720px]">
          <MapContainer
            center={defaultCenter}
            zoom={6}
            style={{ height: "100%", width: "100%" }}
            whenReady={(event) => setMap(event.target)}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FeatureGroup>
              {drawReady ? (
                <EditControl
                  position="topright"
                  onCreated={handleCreated}
                  onEdited={handleEdited}
                  onDeleted={handleDeleted}
                  draw={{
                    rectangle: false,
                    circle: false,
                    circlemarker: false,
                    marker: false,
                    polyline: false,
                  }}
                />
              ) : null}
              {aoi ? <GeoJSON data={aoi} /> : null}
            </FeatureGroup>
          </MapContainer>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Search And Date Ranges</CardTitle>
              <CardDescription>Public OSM geocoding plus AOI dates to fetch clean Sentinel-2 scenes.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search location" />
              <Button variant="secondary" onClick={searchPlace}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
            <p className="text-sm text-muted">{searchLabel}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Before Start</Label>
                <Input type="date" value={before.start} onChange={(event) => setBefore({ ...before, start: event.target.value })} />
              </div>
              <div>
                <Label>Before End</Label>
                <Input type="date" value={before.end} onChange={(event) => setBefore({ ...before, end: event.target.value })} />
              </div>
              <div>
                <Label>After Start</Label>
                <Input type="date" value={after.start} onChange={(event) => setAfter({ ...after, start: event.target.value })} />
              </div>
              <div>
                <Label>After End</Label>
                <Input type="date" value={after.end} onChange={(event) => setAfter({ ...after, end: event.target.value })} />
              </div>
            </div>
            <div>
              <Label>Max Cloud Cover (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={cloudCover}
                onChange={(event) => setCloudCover(clampCloudCover(event.target.valueAsNumber))}
              />
            </div>
            <Button className="w-full" size="lg" onClick={runAnalysis} disabled={loading}>
              {loading ? "Processing imagery..." : "Analyze Area"}
            </Button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Overlay Summary</CardTitle>
              <CardDescription>Quick readout from the most recent analysis in the shared app state.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            <div className="rounded-3xl bg-secondary/70 p-4">
              <p className="font-medium">Vegetation layer</p>
              <p className="mt-1 text-muted">
                {ndviOverlayEnabled ? "Enabled" : "Disabled"} | {vegetationRows ? `${vegetationRows} rows loaded` : "No raster summary yet"}
              </p>
            </div>
            <div className="rounded-3xl bg-secondary/70 p-4">
              <p className="font-medium">Urban change layer</p>
              <p className="mt-1 text-muted">
                {changeOverlayEnabled ? "Enabled" : "Disabled"} | {urbanRows ? `${urbanRows} rows loaded` : "No raster summary yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
