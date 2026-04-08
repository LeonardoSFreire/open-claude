"""Reports endpoint — auto-discovers HTML/MD reports in workspace/."""

import re
from flask import Blueprint, jsonify, request, Response, abort
from routes._helpers import WORKSPACE, safe_read

bp = Blueprint("reports", __name__)

# Area detection from path
AREA_MAP = {
    "daily-logs": "daily",
    "community": "community",
    "social": "social",
    "finance": "financial",
    "projects": "projects",
    "strategy": "strategy",
    "personal": "personal",
    "meetings": "meetings",
    "courses": "courses",
}


def _detect_area(rel_path: str) -> str:
    """Detect area from the file path."""
    parts = rel_path.lower().split("/")
    for part in parts:
        for key, area in AREA_MAP.items():
            if key in part:
                return area
    return "other"


def _detect_type(name: str) -> str:
    low = name.lower()
    if "weekly" in low:
        return "weekly"
    if "monthly" in low:
        return "monthly"
    return "daily"


def _extract_date(name: str) -> str | None:
    """Try to extract a date from the filename."""
    m = re.search(r"(\d{4}-\d{2}-\d{2})", name)
    if m:
        return m.group(1)
    m = re.search(r"(\d{4}_\d{2}_\d{2})", name)
    if m:
        return m.group(1).replace("_", "-")
    return None


def _list_reports() -> list[dict]:
    """Scan entire workspace/ for HTML and MD report files."""
    reports = []
    workspace_dir = WORKSPACE / "workspace"
    if not workspace_dir.is_dir():
        return reports

    for f in workspace_dir.rglob("*"):
        if not f.is_file():
            continue
        if f.suffix.lower() not in (".html", ".md"):
            continue
        # Skip .gitkeep and hidden files
        if f.name.startswith("."):
            continue

        rel = str(f.relative_to(WORKSPACE))
        reports.append({
            "path": rel,
            "name": f.stem,
            "area": _detect_area(rel),
            "type": _detect_type(f.name),
            "date": _extract_date(f.name),
            "extension": f.suffix,
            "modified": f.stat().st_mtime,
        })

    reports.sort(key=lambda x: x.get("modified", 0), reverse=True)
    return reports


@bp.route("/api/reports")
def list_reports():
    reports = _list_reports()

    area = request.args.get("area")
    rtype = request.args.get("type")
    date = request.args.get("date")

    if area:
        reports = [r for r in reports if r["area"] == area]
    if rtype:
        reports = [r for r in reports if r["type"] == rtype]
    if date:
        reports = [r for r in reports if r.get("date") == date]

    return jsonify(reports)


@bp.route("/api/reports/<path:filepath>")
def get_report(filepath):
    full = WORKSPACE / filepath
    if not full.is_file():
        abort(404, description="Report not found")
    try:
        full.resolve().relative_to(WORKSPACE.resolve())
    except ValueError:
        abort(403, description="Access denied")

    content = safe_read(full)
    if content is None:
        abort(500, description="Could not read file")

    mime = "text/html" if full.suffix.lower() == ".html" else "text/markdown"
    return Response(content, mimetype=mime)
