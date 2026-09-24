from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from math import isfinite
from typing import Any
from uuid import UUID

from proofprint.domain.exceptions import ValidationFailed


class BlockType(StrEnum):
    TEXT = "text"
    MARKDOWN = "markdown"
    QUANTITY = "quantity"
    COLOR = "color"
    DIMENSION = "dimension"
    MATERIAL = "material"
    IMAGE = "image"
    FILE = "file"
    NOTE = "note"
    PRINT_AREA = "print_area"


class AssetStatus(StrEnum):
    UPLOADING = "UPLOADING"
    READY = "READY"
    REJECTED = "REJECTED"


@dataclass(frozen=True, slots=True)
class SpecificationBlock:
    id: UUID
    workspace_id: UUID
    block_type: BlockType
    label: str
    content: dict[str, Any]
    position: int
    schema_version: int
    created_by: UUID
    updated_by: UUID
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class Asset:
    id: UUID
    workspace_id: UUID
    storage_key: str
    original_filename: str
    content_type: str
    size_bytes: int
    checksum: str
    status: AssetStatus
    uploaded_by: UUID
    created_at: datetime


def validate_block_content(block_type: BlockType, content: dict[str, Any]) -> set[UUID]:
    validators = {
        BlockType.TEXT: _validate_text,
        BlockType.MARKDOWN: _validate_markdown,
        BlockType.QUANTITY: _validate_quantity,
        BlockType.COLOR: _validate_color,
        BlockType.DIMENSION: _validate_dimension,
        BlockType.MATERIAL: _validate_material,
        BlockType.IMAGE: _validate_image,
        BlockType.FILE: _validate_file,
        BlockType.NOTE: _validate_note,
        BlockType.PRINT_AREA: _validate_print_area,
    }
    return validators[block_type](content)


def _keys(content: dict[str, Any], required: set[str], optional: set[str] | None = None) -> None:
    optional = optional or set()
    missing = required - content.keys()
    unknown = content.keys() - required - optional
    if missing:
        raise ValidationFailed(f"Missing block content fields: {', '.join(sorted(missing))}")
    if unknown:
        raise ValidationFailed(f"Unknown block content fields: {', '.join(sorted(unknown))}")


def _string(content: dict[str, Any], field: str) -> str:
    value = content.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValidationFailed(f"{field} must be a non-blank string")
    if len(value) > 100_000:
        raise ValidationFailed(f"{field} must not exceed 100000 characters")
    return value


def _positive_number(content: dict[str, Any], field: str) -> float | int:
    value = content.get(field)
    if (
        isinstance(value, bool)
        or not isinstance(value, int | float)
        or (isinstance(value, float) and not isfinite(value))
        or value <= 0
        or value > 1_000_000_000
    ):
        raise ValidationFailed(f"{field} must be a positive number")
    return value


def _asset_id(content: dict[str, Any], field: str = "asset_id") -> UUID:
    value = content.get(field)
    try:
        return UUID(str(value))
    except (TypeError, ValueError) as exc:
        raise ValidationFailed(f"{field} must be a UUID") from exc


def _optional_string(content: dict[str, Any], field: str) -> None:
    value = content.get(field)
    if value is not None and (not isinstance(value, str) or not value.strip()):
        raise ValidationFailed(f"{field} must be a non-blank string when provided")
    if isinstance(value, str) and len(value) > 100_000:
        raise ValidationFailed(f"{field} must not exceed 100000 characters")


def _validate_text(content: dict[str, Any]) -> set[UUID]:
    _keys(content, {"value"})
    _string(content, "value")
    return set()


def _validate_markdown(content: dict[str, Any]) -> set[UUID]:
    _keys(content, {"markdown"})
    value = _string(content, "markdown")
    if len(value) > 100_000:
        raise ValidationFailed("markdown must not exceed 100000 characters")
    return set()


def _validate_quantity(content: dict[str, Any]) -> set[UUID]:
    _keys(content, {"value", "unit"})
    value = content.get("value")
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValidationFailed("value must be a positive integer")
    if value > 1_000_000_000:
        raise ValidationFailed("value must not exceed 1000000000")
    _string(content, "unit")
    return set()


def _validate_color(content: dict[str, Any]) -> set[UUID]:
    _keys(content, {"name"}, {"hex", "pantone"})
    _string(content, "name")
    _optional_string(content, "hex")
    _optional_string(content, "pantone")
    value = content.get("hex")
    if value is not None and not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        raise ValidationFailed("hex must use #RRGGBB format")
    return set()


def _validate_dimension(content: dict[str, Any]) -> set[UUID]:
    _keys(content, {"width", "height", "unit"})
    _positive_number(content, "width")
    _positive_number(content, "height")
    if content.get("unit") not in {"mm", "cm", "inch"}:
        raise ValidationFailed("unit must be mm, cm or inch")
    return set()


def _validate_material(content: dict[str, Any]) -> set[UUID]:
    _keys(content, {"name"}, {"code", "details"})
    _string(content, "name")
    _optional_string(content, "code")
    _optional_string(content, "details")
    return set()


def _validate_image(content: dict[str, Any]) -> set[UUID]:
    _keys(content, set(), {"asset_id", "asset_ids", "caption"})
    _optional_string(content, "caption")
    if "asset_id" in content and "asset_ids" in content:
        raise ValidationFailed("Use asset_id or asset_ids, not both")
    if "asset_ids" in content:
        ids = content["asset_ids"]
        if not isinstance(ids, list) or not ids or len(ids) > 20:
            raise ValidationFailed("asset_ids must contain 1 to 20 images")
        try:
            parsed = [UUID(str(item)) for item in ids]
        except (TypeError, ValueError) as exc:
            raise ValidationFailed("Every asset_ids item must be a UUID") from exc
        if len(parsed) != len(set(parsed)):
            raise ValidationFailed("asset_ids must not contain duplicates")
        return set(parsed)
    return {_asset_id(content)}


def _validate_file(content: dict[str, Any]) -> set[UUID]:
    _keys(content, {"asset_id"}, {"description"})
    _optional_string(content, "description")
    return {_asset_id(content)}


def _validate_note(content: dict[str, Any]) -> set[UUID]:
    _keys(content, {"text"})
    _string(content, "text")
    return set()


def _validate_print_area(content: dict[str, Any]) -> set[UUID]:
    _keys(content, {"surface", "width", "height", "unit"}, {"asset_id"})
    _string(content, "surface")
    _positive_number(content, "width")
    _positive_number(content, "height")
    if content.get("unit") not in {"mm", "cm", "inch"}:
        raise ValidationFailed("unit must be mm, cm or inch")
    return {_asset_id(content)} if content.get("asset_id") is not None else set()
