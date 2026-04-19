from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class DateRange(BaseModel):
    start: date
    end: date

    @model_validator(mode="after")
    def validate_order(self) -> "DateRange":
        if self.start > self.end:
            raise ValueError("Date range start must be earlier than or equal to end.")
        return self


class AreaRequest(BaseModel):
    aoi: dict[str, Any] = Field(..., description="GeoJSON polygon or multipolygon geometry.")
    before: DateRange
    after: DateRange
    max_cloud_cover: float = Field(default=20.0, ge=0.0, le=100.0)

    @field_validator("aoi")
    @classmethod
    def validate_aoi(cls, value: dict[str, Any]) -> dict[str, Any]:
        geometry_type = value.get("type")
        if geometry_type not in {"Polygon", "MultiPolygon"}:
            raise ValueError("AOI must be a GeoJSON Polygon or MultiPolygon geometry.")
        if not value.get("coordinates"):
            raise ValueError("AOI geometry must include coordinates.")
        return value


class FetchSentinelResponse(BaseModel):
    before_scene_id: str
    after_scene_id: str
    before_preview_url: str | None = None
    after_preview_url: str | None = None
    before_acquired: str
    after_acquired: str


class ChangeMetrics(BaseModel):
    total_change: float
    vegetation_change: float
    urban_change: float
    water_change: float
    change_intensity: float
    valid_pixels: int
    ndvi_before_mean: float
    ndvi_after_mean: float
    ndwi_before_mean: float
    ndwi_after_mean: float


class AnalyzeAreaResponse(BaseModel):
    metrics: ChangeMetrics
    before_scene_id: str
    after_scene_id: str
    before_preview_url: str | None = None
    after_preview_url: str | None = None
    vegetation_change_mask: list[list[float]]
    water_change_mask: list[list[float]]
    urban_change_mask: list[list[float]]


class AiInsightInput(BaseModel):
    NDVI_mean: float
    vegetation_change: float
    urban_change: float
    water_change: float
    change_intensity: float
    question: str | None = None


class AiInsightResponse(BaseModel):
    answer: str
