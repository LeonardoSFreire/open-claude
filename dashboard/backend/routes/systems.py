"""Systems CRUD — manage registered applications/services."""

import subprocess
from flask import Blueprint, request, jsonify, abort
from flask_login import login_required
from models import db, System

bp = Blueprint("systems", __name__)


def _get_docker_status(container_name: str) -> dict:
    """Check if a Docker container is running."""
    try:
        result = subprocess.run(
            f'docker ps --filter "name={container_name}" --format "{{{{.Status}}}}\\t{{{{.Ports}}}}"',
            shell=True, capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            parts = result.stdout.strip().split('\t')
            status = parts[0] if parts else ""
            return {"running": "Up" in status, "detail": status}
    except Exception:
        pass
    return {"running": False, "detail": ""}


@bp.route("/api/systems")
@login_required
def list_systems():
    systems = System.query.order_by(System.name).all()
    result = []
    for s in systems:
        data = s.to_dict()
        # Enrich with live Docker status if container is set
        if s.container:
            status = _get_docker_status(s.container)
            data["running"] = status["running"]
            data["status_detail"] = status["detail"]
        else:
            data["running"] = None
            data["status_detail"] = ""
        result.append(data)
    return jsonify(result)


@bp.route("/api/systems", methods=["POST"])
@login_required
def create_system():
    data = request.get_json()
    if not data or not data.get("name"):
        abort(400, description="Name is required")

    system = System(
        name=data["name"].strip(),
        description=data.get("description", "").strip(),
        url=data.get("url", "").strip(),
        container=data.get("container", "").strip() or None,
        icon=data.get("icon", "📦").strip(),
        type=data.get("type", "docker").strip(),
    )
    db.session.add(system)
    db.session.commit()
    return jsonify(system.to_dict()), 201


@bp.route("/api/systems/<int:system_id>", methods=["PUT"])
@login_required
def update_system(system_id):
    system = System.query.get_or_404(system_id)
    data = request.get_json()

    if "name" in data:
        system.name = data["name"].strip()
    if "description" in data:
        system.description = data["description"].strip()
    if "url" in data:
        system.url = data["url"].strip()
    if "container" in data:
        system.container = data["container"].strip() or None
    if "icon" in data:
        system.icon = data["icon"].strip()
    if "type" in data:
        system.type = data["type"].strip()

    db.session.commit()
    return jsonify(system.to_dict())


@bp.route("/api/systems/<int:system_id>", methods=["DELETE"])
@login_required
def delete_system(system_id):
    system = System.query.get_or_404(system_id)
    db.session.delete(system)
    db.session.commit()
    return jsonify({"message": "System deleted"})


@bp.route("/api/systems/<int:system_id>/start", methods=["POST"])
@login_required
def start_system(system_id):
    system = System.query.get_or_404(system_id)
    if not system.container:
        abort(400, description="No container configured")
    try:
        subprocess.run(f"docker start {system.container}", shell=True, timeout=10)
        return jsonify({"status": "started", "container": system.container})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/api/systems/<int:system_id>/stop", methods=["POST"])
@login_required
def stop_system(system_id):
    system = System.query.get_or_404(system_id)
    if not system.container:
        abort(400, description="No container configured")
    try:
        subprocess.run(f"docker stop {system.container}", shell=True, timeout=15)
        return jsonify({"status": "stopped", "container": system.container})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/api/systems/<int:system_id>/update", methods=["POST"])
@login_required
def update_container(system_id):
    """Stop, pull latest image, and restart a container."""
    system = System.query.get_or_404(system_id)
    if not system.container:
        abort(400, description="No container configured")
    try:
        # Get image name
        result = subprocess.run(
            f'docker inspect --format="{{{{.Config.Image}}}}" {system.container}',
            shell=True, capture_output=True, text=True, timeout=5
        )
        image = result.stdout.strip().strip('"') if result.returncode == 0 else None

        subprocess.run(f"docker stop {system.container}", shell=True, timeout=15)
        if image:
            subprocess.run(f"docker pull {image}", shell=True, timeout=120)
        subprocess.run(f"docker start {system.container}", shell=True, timeout=10)
        return jsonify({"status": "updated", "container": system.container, "image": image})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
