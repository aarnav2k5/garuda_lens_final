"use client";

import Link from "next/link";

import { AnalyticsCharts } from "@/components/analytics-charts";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";
import { useGarudaStore } from "@/store/use-garuda-store";

export default function AnalyticsPage() {
  const metrics = useGarudaStore((state) => state.analysis?.metrics ?? null);

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>No Analysis Loaded</CardTitle>
            <CardDescription>
              Run an AOI analysis from the map workflow first. The latest metrics will stay available here after navigation.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/map-view">Go To Map View</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-4">
        <MetricCard
          title="Total Change"
          value={formatPercent(metrics?.total_change ?? 0)}
          description="Combined share of AOI pixels with material vegetation, urban, or water change."
        />
        <MetricCard
          title="Vegetation"
          value={formatPercent(metrics?.vegetation_change ?? 0)}
          description="Change derived from NDVI deltas across the selected time windows."
        />
        <MetricCard
          title="Urban"
          value={formatPercent(metrics?.urban_change ?? 0)}
          description="Bright built-up change detected from spectral brightness and white-roof heuristics."
        />
        <MetricCard
          title="Water"
          value={formatPercent(metrics?.water_change ?? 0)}
          description="Difference in surface water signature based on NDWI movement."
        />
      </div>
      <AnalyticsCharts metrics={metrics} />
    </div>
  );
}
