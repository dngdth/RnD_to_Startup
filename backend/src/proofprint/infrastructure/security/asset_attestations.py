"""Verify a short-lived assertion issued by the trusted upload and scan service."""

import hashlib
import hmac
import json
import time
from uuid import UUID


class HmacAssetAttestationVerifier:
    def __init__(self, secret_key: str, allowed_content_types: set[str]) -> None:
        self.secret = secret_key.encode("utf-8")
        self.allowed_content_types = allowed_content_types

    def verify(
        self, *, workspace_id: UUID, storage_key: str, content_type: str,
        size_bytes: int, checksum: str, attestation: str,
    ) -> bool:
        if content_type not in self.allowed_content_types:
            return False
        try:
            timestamp_text, supplied_signature = attestation.split(":", maxsplit=1)
            timestamp = int(timestamp_text)
        except (TypeError, ValueError):
            return False
        if abs(time.time() - timestamp) > 900:
            return False
        message = self._message(
            timestamp, workspace_id, storage_key, content_type, size_bytes, checksum
        )
        expected = hmac.new(self.secret, message, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, supplied_signature)

    def issue_after_scan(
        self, *, workspace_id: UUID, storage_key: str, content_type: str,
        size_bytes: int, checksum: str, timestamp: int | None = None,
    ) -> str:
        """Called only by a trusted upload service after upload and malware scan pass."""
        issued_at = timestamp if timestamp is not None else int(time.time())
        message = self._message(
            issued_at, workspace_id, storage_key, content_type, size_bytes, checksum
        )
        signature = hmac.new(self.secret, message, hashlib.sha256).hexdigest()
        return f"{issued_at}:{signature}"

    @staticmethod
    def _message(
        timestamp: int, workspace_id: UUID, storage_key: str, content_type: str,
        size_bytes: int, checksum: str,
    ) -> bytes:
        return json.dumps(
            {
                "verified_at": timestamp,
                "workspace_id": str(workspace_id),
                "storage_key": storage_key,
                "content_type": content_type,
                "size_bytes": size_bytes,
                "checksum": checksum,
                "result": "CLEAN",
            },
            sort_keys=True, separators=(",", ":"),
        ).encode("utf-8")
