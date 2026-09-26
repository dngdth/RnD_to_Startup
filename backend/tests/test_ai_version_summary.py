import io
import json
from unittest.mock import patch
from urllib.error import HTTPError

from pydantic import SecretStr

from proofprint.infrastructure import ai_version_summary


def test_fallback_summary_counts_changed_blocks() -> None:
    previous = [
        {"id": "a", "content": {"markdown": "old"}},
        {"id": "removed", "content": {"value": "x"}},
    ]
    current = [
        {"id": "a", "content": {"markdown": "new"}},
        {"id": "added", "content": {"value": "y"}},
    ]
    assert ai_version_summary._fallback_summary(previous, current) == (
        "So với phiên bản trước: thêm 1 hạng mục, xóa 1 hạng mục và cập nhật 1 hạng mục."
    )


def test_gemini_request_uses_generate_content_api() -> None:
    response = io.BytesIO(
        json.dumps(
            {
                "candidates": [
                    {
                        "content": {"parts": [{"text": "Đã đổi màu áo."}]},
                    }
                ]
            }
        ).encode()
    )
    with (
        patch.object(
            ai_version_summary.settings,
            "gemini_summary_model",
            "gemini-3.8-flash",
        ),
        patch.object(ai_version_summary, "urlopen", return_value=response) as request_mock,
    ):
        result = ai_version_summary._request_summary(
            [{"text": "data"}],
            SecretStr("secret").get_secret_value(),
        )

    assert result == "Đã đổi màu áo."
    request = request_mock.call_args.args[0]
    body = json.loads(request.data)
    assert request.full_url.endswith("/gemini-3.8-flash:generateContent")
    assert body["contents"][0]["parts"] == [{"text": "data"}]
    assert request.headers["X-goog-api-key"] == "secret"


def test_gemini_request_retries_temporary_http_errors() -> None:
    response = io.BytesIO(
        json.dumps(
            {"candidates": [{"content": {"parts": [{"text": "Đã tóm tắt."}]}}]}
        ).encode()
    )
    unavailable = HTTPError(
        "https://example.invalid",
        503,
        "Service Unavailable",
        hdrs=None,
        fp=io.BytesIO(b"{}"),
    )
    with (
        patch.object(
            ai_version_summary.settings,
            "gemini_summary_model",
            "gemini-3.1-flash-lite",
        ),
        patch.object(
            ai_version_summary,
            "urlopen",
            side_effect=[unavailable, response],
        ) as request_mock,
        patch.object(ai_version_summary.time, "sleep") as sleep_mock,
    ):
        result = ai_version_summary._request_summary([{"text": "data"}], "secret")

    assert result == "Đã tóm tắt."
    assert request_mock.call_count == 2
    sleep_mock.assert_called_once_with(1)
