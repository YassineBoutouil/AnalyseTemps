import os
import zipfile
from io import BytesIO

import requests

BASE_URL = "https://dat.atalian-dat-prod.decisionbrain.cloud/api/backend/export-historical-data-batch"
TIMEOUT = 120


def fetch_export(date_str: str) -> list[tuple[str, bytes]]:
    """Fetch the historical data export for a single day from DecisionBrain.

    Returns a list of (filename, content) tuples for every .xlsx found in
    the response (the API returns a ZIP, or occasionally a single .xlsx
    directly). Returns an empty list if there is no data for that date.
    """
    api_key = os.environ.get("DECISIONBRAIN_API_KEY")
    if not api_key:
        raise RuntimeError("DECISIONBRAIN_API_KEY is not configured")

    response = requests.get(
        BASE_URL,
        headers={"X-Api-Key": api_key, "Accept": "application/zip"},
        params={"startDate": date_str, "endDate": date_str},
        timeout=TIMEOUT,
    )

    if response.status_code == 204:
        return []
    if response.status_code not in (200, 201):
        raise RuntimeError(
            f"DecisionBrain API error {response.status_code}: {response.text[:500]}"
        )

    content_type = response.headers.get("Content-Type", "").lower()
    disposition = response.headers.get("Content-Disposition", "").lower()

    is_zip = (
        "zip" in content_type
        or "octet-stream" in content_type
        or ".zip" in disposition
    )
    if is_zip:
        files = []
        with zipfile.ZipFile(BytesIO(response.content)) as zf:
            for name in zf.namelist():
                if name.lower().endswith(".xlsx"):
                    files.append((os.path.basename(name), zf.read(name)))
        return files

    is_xlsx = "sheet" in content_type or ".xlsx" in disposition
    if is_xlsx:
        return [(f"{date_str}.xlsx", response.content)]

    raise RuntimeError(f"Unexpected DecisionBrain response type: {content_type!r}")
