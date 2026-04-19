import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { AnalyzeResponse, DateRange, FetchSentinelResponse, GeoJsonGeometry } from "@/types/api";

type GarudaState = {
  aoi: GeoJsonGeometry | null;
  searchLabel: string;
  before: DateRange;
  after: DateRange;
  cloudCover: number;
  sentinel: FetchSentinelResponse | null;
  analysis: AnalyzeResponse | null;
  loading: boolean;
  error: string | null;
  ndviOverlayEnabled: boolean;
  changeOverlayEnabled: boolean;
  setAoi: (aoi: GeoJsonGeometry | null) => void;
  setSearchLabel: (value: string) => void;
  setBefore: (value: DateRange) => void;
  setAfter: (value: DateRange) => void;
  setCloudCover: (value: number) => void;
  setSentinel: (value: FetchSentinelResponse | null) => void;
  setAnalysis: (value: AnalyzeResponse | null) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  toggleNdviOverlay: () => void;
  toggleChangeOverlay: () => void;
};

const clearDerivedResults = {
  sentinel: null,
  analysis: null,
  error: null,
};

export const useGarudaStore = create<GarudaState>()(
  persist(
    (set) => ({
      aoi: null,
      searchLabel: "Choose a place and draw an area of interest.",
      before: { start: "2023-01-01", end: "2023-06-30" },
      after: { start: "2024-01-01", end: "2024-06-30" },
      cloudCover: 20,
      sentinel: null,
      analysis: null,
      loading: false,
      error: null,
      ndviOverlayEnabled: true,
      changeOverlayEnabled: true,
      setAoi: (aoi) => set({ aoi, ...clearDerivedResults }),
      setSearchLabel: (searchLabel) => set({ searchLabel }),
      setBefore: (before) => set({ before, ...clearDerivedResults }),
      setAfter: (after) => set({ after, ...clearDerivedResults }),
      setCloudCover: (cloudCover) => set({ cloudCover, ...clearDerivedResults }),
      setSentinel: (sentinel) => set({ sentinel }),
      setAnalysis: (analysis) => set({ analysis }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      toggleNdviOverlay: () => set((state) => ({ ndviOverlayEnabled: !state.ndviOverlayEnabled })),
      toggleChangeOverlay: () => set((state) => ({ changeOverlayEnabled: !state.changeOverlayEnabled })),
    }),
    {
      name: "garuda-lens-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        aoi: state.aoi,
        searchLabel: state.searchLabel,
        before: state.before,
        after: state.after,
        cloudCover: state.cloudCover,
        sentinel: state.sentinel,
        analysis: state.analysis,
        ndviOverlayEnabled: state.ndviOverlayEnabled,
        changeOverlayEnabled: state.changeOverlayEnabled,
      }),
    }
  )
);
