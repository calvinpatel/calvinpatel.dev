#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=1.26"]
# ///
"""Convert SWC neuron reconstructions into small 2D JSON files for the website.

Usage:
    uv run scripts/swc_to_web.py data/swc public/cells --sources data/swc/sources.csv
    python scripts/swc_to_web.py data/swc/one-cell.swc public/cells --sources data/swc/sources.csv

Add --preview <folder> to also write an SVG of each converted cell for a quick visual check.

Five steps per file:
    1. Parse and clean: read the SWC rows, merge a multi-point soma into one point,
       re-root the tree at the soma, and drop pieces that aren't connected to it.
    2. Flatten to 2D: project onto the plane where the arbor spreads out most (PCA),
       then turn the cell so its apical dendrite points up (or, failing that, its axon down).
    3. Center and normalize: soma at (0, 0), farthest point at distance 1, y pointing down.
    4. Simplify: thin out points along unbranched stretches, keeping the soma, every
       branch point, every tip, and every change of point type.
    5. Path distances: distance from the soma along the branches, measured in the
       flattened 2D shape (for animation timing, not for science).

Output format: cell-web/1 (see docs/cell-web-v1.md). This script is scaffolding:
Dendrometer's export replaces it later, and its outputs become fixtures for that export's tests.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

FORMAT = "cell-web/1"
INDEX_FORMAT = "cell-web-index/1"
SOMA, AXON, BASAL, APICAL = 1, 2, 3, 4
DEFAULT_EPSILON = 0.002
DEFAULT_LICENSE = "CC BY 4.0"
DEFAULT_REPOSITORY = "NeuroMorpho.Org"
REQUIRED_SOURCE_COLUMNS = ("file", "name", "cell_type", "archive", "url")


class ConversionError(Exception):
    """A problem that stops a file (or the whole run) from converting. The message says why."""


@dataclass(frozen=True)
class Source:
    """Credit information for one SWC file, from the sources CSV."""

    file: str
    name: str
    cell_type: str
    archive: str
    url: str
    repository: str = DEFAULT_REPOSITORY
    license: str = DEFAULT_LICENSE

    @property
    def credit(self) -> str:
        return f"{self.name} ({self.archive} archive), via {self.repository}, {self.license}"


@dataclass
class Rows:
    """SWC rows as read from the file, before any cleaning."""

    ids: list[int] = field(default_factory=list)
    types: list[int] = field(default_factory=list)
    xyz: list[tuple[float, float, float]] = field(default_factory=list)
    radii: list[float] = field(default_factory=list)
    parents: list[int] = field(default_factory=list)


@dataclass
class Cell:
    """A cleaned neuron. Point 0 is the soma, and parent[i] < i for every other point."""

    xyz: np.ndarray     # (n, 3) coordinates
    r: np.ndarray       # (n,) radii
    kind: np.ndarray    # (n,) 1 soma, 2 axon, 3 basal dendrite, 4 apical dendrite
    parent: np.ndarray  # (n,) parent index, -1 for the soma


# ---------------------------------------------------------------------------
# Step 1: parse and clean
# ---------------------------------------------------------------------------

def parse_swc(text: str) -> tuple[Rows, list[str]]:
    """Read SWC text. Skips comments, blank lines, and rows that can't be read."""
    rows = Rows()
    seen: set[int] = set()
    malformed = duplicates = 0
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 7:
            malformed += 1
            continue
        try:
            values = [float(v) for v in parts[:7]]
        except ValueError:
            malformed += 1
            continue
        if not all(math.isfinite(v) for v in values):
            malformed += 1
            continue
        node_id, node_type, parent_id = int(values[0]), int(values[1]), int(values[6])
        if node_id in seen:
            duplicates += 1
            continue
        seen.add(node_id)
        rows.ids.append(node_id)
        rows.types.append(node_type)
        rows.xyz.append((values[2], values[3], values[4]))
        rows.radii.append(max(values[5], 0.0))
        rows.parents.append(parent_id)

    warnings: list[str] = []
    if malformed:
        warnings.append(f"skipped {malformed} malformed row(s)")
    if duplicates:
        warnings.append(f"skipped {duplicates} row(s) that repeated an earlier id")
    if not rows.ids:
        raise ConversionError("no SWC rows found")
    return rows, warnings


def build_cell(rows: Rows, warnings: list[str]) -> Cell:
    """Merge the soma into one point, re-root the tree there, and drop disconnected pieces."""
    n = len(rows.ids)
    position = {node_id: k for k, node_id in enumerate(rows.ids)}
    types = np.array(rows.types, dtype=int)
    xyz = np.array(rows.xyz, dtype=float)
    radius = np.array(rows.radii, dtype=float)

    parent = np.full(n, -1, dtype=int)
    dangling = 0
    for k, parent_id in enumerate(rows.parents):
        if parent_id < 0:
            continue
        j = position.get(parent_id)
        if j is None or j == k:
            dangling += 1
            continue
        parent[k] = j
    if dangling:
        warnings.append(f"{dangling} point(s) named a parent id that doesn't exist; treated them as separate pieces")

    neighbors: list[list[int]] = [[] for _ in range(n)]
    for k in range(n):
        if parent[k] >= 0:
            neighbors[k].append(int(parent[k]))
            neighbors[int(parent[k])].append(k)

    soma_points = np.flatnonzero(types == SOMA)
    if soma_points.size:
        start = int(soma_points[0])
        cluster = {start}
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in neighbors[u]:
                if v not in cluster and types[v] == SOMA:
                    cluster.add(v)
                    queue.append(v)
    else:
        cluster = {_root_of_largest_piece(neighbors, parent)}
        warnings.append("no soma (type 1) points; used the root of the largest piece as the soma")

    members = np.array(sorted(cluster), dtype=int)
    center = xyz[members].mean(axis=0)
    spread = float(np.linalg.norm(xyz[members] - center, axis=1).mean()) if members.size > 1 else 0.0
    soma_radius = max(float(radius[members].max()), spread)

    # Breadth-first walk out from the soma gives every point a new index after its parent's.
    new_index = np.full(n, -1, dtype=int)
    new_index[members] = 0
    order: list[int] = []
    new_parent: list[int] = []
    queue = deque(int(m) for m in members)
    while queue:
        u = queue.popleft()
        for v in neighbors[u]:
            if new_index[v] != -1:
                continue
            new_index[v] = len(order) + 1
            order.append(v)
            new_parent.append(int(new_index[u]))
            queue.append(v)

    dropped = n - members.size - len(order)
    if dropped:
        warnings.append(f"dropped {dropped} point(s) not connected to the soma")
    if not order:
        raise ConversionError("the soma has nothing attached to it")

    kinds = types[order]
    unusual = ~np.isin(kinds, (AXON, BASAL, APICAL))
    if unusual.any():
        codes = sorted(set(kinds[unusual].tolist()))
        warnings.append(f"treated {int(unusual.sum())} point(s) with type code(s) {codes} as dendrite")
        kinds = np.where(unusual, BASAL, kinds)

    return Cell(
        xyz=np.vstack([center, xyz[order]]),
        r=np.concatenate([[soma_radius], radius[order]]),
        kind=np.concatenate([[SOMA], kinds]).astype(int),
        parent=np.array([-1, *new_parent], dtype=int),
    )


def _root_of_largest_piece(neighbors: list[list[int]], parent: np.ndarray) -> int:
    """Used only when a file has no soma: the root point of the biggest connected piece."""
    n = len(neighbors)
    piece = np.full(n, -1, dtype=int)
    best_piece, best_size = 0, 0
    for start in range(n):
        if piece[start] != -1:
            continue
        piece[start] = start
        size, queue = 0, deque([start])
        while queue:
            u = queue.popleft()
            size += 1
            for v in neighbors[u]:
                if piece[v] == -1:
                    piece[v] = start
                    queue.append(v)
        if size > best_size:
            best_piece, best_size = start, size
    in_piece = np.flatnonzero(piece == best_piece)
    roots = in_piece[parent[in_piece] < 0]
    return int(roots[0]) if roots.size else int(in_piece[0])


# ---------------------------------------------------------------------------
# Step 2: flatten to 2D
# ---------------------------------------------------------------------------

def flatten(cell: Cell, projection: str) -> np.ndarray:
    """Return (n, 2) coordinates with the soma at the origin and +y pointing up."""
    rel = cell.xyz - cell.xyz[0]
    if projection == "xy":
        uv = rel[:, :2].copy()
    else:
        # Weight each point by the length of its segment, so densely traced stretches don't dominate.
        seg = np.zeros(len(rel))
        seg[1:] = np.linalg.norm(rel[1:] - rel[cell.parent[1:]], axis=1)
        if seg.sum() <= 0:
            raise ConversionError("every point sits at the soma")
        mean = np.average(rel, axis=0, weights=seg)
        centered = rel - mean
        cov = (centered * seg[:, None]).T @ centered / seg.sum()
        values, vectors = np.linalg.eigh(cov)
        widest = vectors[:, np.argsort(values)[::-1][:2]]
        uv = rel @ widest
    return orient(uv, cell.kind)


def orient(uv: np.ndarray, kind: np.ndarray) -> np.ndarray:
    """Turn the cell within its plane: apical dendrite up, or if there is none, axon down."""
    for target_kind, target_angle in ((APICAL, math.pi / 2), (AXON, -math.pi / 2)):
        mask = kind == target_kind
        if not mask.any():
            continue
        direction = uv[mask].mean(axis=0)
        if math.hypot(*direction) < 1e-12:
            continue
        turn = target_angle - math.atan2(direction[1], direction[0])
        c, s = math.cos(turn), math.sin(turn)
        return uv @ np.array([[c, s], [-s, c]])
    return uv


# ---------------------------------------------------------------------------
# Step 3: center and normalize
# ---------------------------------------------------------------------------

def normalize(uv: np.ndarray, r: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Scale so the farthest point is at distance 1, and flip y so it points down."""
    reach = float(np.linalg.norm(uv, axis=1).max())
    if reach <= 0:
        raise ConversionError("every point sits at the soma")
    xy = np.column_stack([uv[:, 0], -uv[:, 1]]) / reach
    return xy, r / reach


# ---------------------------------------------------------------------------
# Step 4: simplify
# ---------------------------------------------------------------------------

def simplify(xy: np.ndarray, parent: np.ndarray, kind: np.ndarray, epsilon: float) -> np.ndarray:
    """Return a mask of points to keep. Structure points always stay; straight-ish runs thin out."""
    n = len(parent)
    if epsilon <= 0 or n <= 2:
        return np.ones(n, dtype=bool)
    children = np.bincount(parent[1:], minlength=n)
    keep = children != 1                     # tips (0 children) and branch points (2+)
    keep[0] = True                           # soma
    keep[1:] |= kind[1:] != kind[parent[1:]] # type changes
    keep[1:] |= parent[1:] == 0              # first point of each branch leaving the soma

    for k in np.flatnonzero(keep):
        if k == 0:
            continue
        chain = [int(k)]
        j = int(parent[k])
        while not keep[j]:
            chain.append(j)
            j = int(parent[j])
        chain.append(j)
        if len(chain) <= 2:
            continue
        chain.reverse()
        mask = rdp_mask(xy[chain], epsilon)
        for node, kept in zip(chain[1:-1], mask[1:-1]):
            if kept:
                keep[node] = True
    return keep


def rdp_mask(points: np.ndarray, epsilon: float) -> np.ndarray:
    """Ramer-Douglas-Peucker: keep the fewest points that stay within epsilon of the original line."""
    m = len(points)
    keep = np.zeros(m, dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, m - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        inner = points[a + 1:b]
        segment = points[b] - points[a]
        length_sq = float(segment @ segment)
        if length_sq == 0:
            gaps = np.linalg.norm(inner - points[a], axis=1)
        else:
            t = np.clip(((inner - points[a]) @ segment) / length_sq, 0.0, 1.0)
            gaps = np.linalg.norm(inner - (points[a] + t[:, None] * segment), axis=1)
        worst = int(np.argmax(gaps))
        if gaps[worst] > epsilon:
            split = a + 1 + worst
            keep[split] = True
            stack.append((a, split))
            stack.append((split, b))
    return keep


def reindex(keep: np.ndarray, xy: np.ndarray, r: np.ndarray, kind: np.ndarray, parent: np.ndarray):
    """Keep only the masked points, reconnecting each one to its nearest kept ancestor."""
    n = len(parent)
    nearest_kept = np.empty(n, dtype=int)
    new_index = np.full(n, -1, dtype=int)
    count = 0
    for i in range(n):
        if keep[i]:
            new_index[i] = count
            nearest_kept[i] = i
            count += 1
        else:
            nearest_kept[i] = nearest_kept[parent[i]]
    kept = np.flatnonzero(keep)
    new_parent = np.full(len(kept), -1, dtype=int)
    for k, i in enumerate(kept):
        if i != 0:
            new_parent[k] = new_index[nearest_kept[parent[i]]]
    return xy[kept], r[kept], kind[kept], new_parent


# ---------------------------------------------------------------------------
# Step 5: path distances
# ---------------------------------------------------------------------------

def path_distances(xy: np.ndarray, parent: np.ndarray) -> np.ndarray:
    """Distance from the soma along the branches, in the flattened shape."""
    n = len(parent)
    step = np.zeros(n)
    step[1:] = np.linalg.norm(xy[1:] - xy[parent[1:]], axis=1)
    dist = np.zeros(n)
    for i in range(1, n):
        dist[i] = dist[parent[i]] + step[i]
    return dist


# ---------------------------------------------------------------------------
# Putting it together
# ---------------------------------------------------------------------------

def convert_text(text: str, source: Source, cell_id: str,
                 epsilon: float = DEFAULT_EPSILON, projection: str = "pca") -> tuple[dict, list[str]]:
    """Run all five steps on SWC text. Returns the cell-web/1 document and any warnings."""
    rows, warnings = parse_swc(text)
    cell = build_cell(rows, warnings)
    xy, r = normalize(flatten(cell, projection), cell.r)
    keep = simplify(xy, cell.parent, cell.kind, epsilon)
    xy, r, kind, parent = reindex(keep, xy, r, cell.kind, cell.parent)

    reach = float(np.linalg.norm(xy, axis=1).max())  # simplifying can shave a hair off the edge
    xy, r = xy / reach, r / reach
    dist = path_distances(xy, parent)

    dendrite = np.isin(kind, (BASAL, APICAL))
    axon = kind == AXON
    doc = {
        "format": FORMAT,
        "id": cell_id,
        "cellType": source.cell_type,
        "projection": projection,
        "source": {
            "name": source.name,
            "archive": source.archive,
            "repository": source.repository,
            "url": source.url,
            "license": source.license,
        },
        "credit": source.credit,
        "counts": {"input": len(rows.ids), "output": int(len(parent))},
        "stats": {
            "maxDendDist": _round(float(dist[dendrite].max())) if dendrite.any() else 0.0,
            "maxAxonDist": _round(float(dist[axon].max())) if axon.any() else 0.0,
        },
        "x": _round_list(xy[:, 0]),
        "y": _round_list(xy[:, 1]),
        "r": _round_list(r),
        "parent": parent.tolist(),
        "kind": kind.tolist(),
        "dist": _round_list(dist),
    }
    return doc, warnings


def _round(value: float) -> float:
    return round(value, 4) + 0.0


def _round_list(values: np.ndarray) -> list[float]:
    return (np.round(values.astype(float), 4) + 0.0).tolist()


def slugify(stem: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-") or "cell"


def load_sources(path: Path) -> dict[str, Source]:
    """Read the sources CSV: one row per SWC file, with what the site needs to credit it."""
    if not path.exists():
        raise ConversionError(f"sources file not found: {path}")
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        columns = reader.fieldnames or []
        missing = [c for c in REQUIRED_SOURCE_COLUMNS if c not in columns]
        if missing:
            raise ConversionError(f"{path} is missing column(s): {', '.join(missing)}")
        sources: dict[str, Source] = {}
        for line_no, row in enumerate(reader, start=2):
            values = {c: (row.get(c) or "").strip() for c in REQUIRED_SOURCE_COLUMNS}
            empty = [c for c, v in values.items() if not v]
            if empty:
                raise ConversionError(f"{path} line {line_no}: empty {', '.join(empty)}")
            sources[values["file"]] = Source(
                **values,
                repository=(row.get("repository") or "").strip() or DEFAULT_REPOSITORY,
                license=(row.get("license") or "").strip() or DEFAULT_LICENSE,
            )
    return sources


KIND_COLORS = {SOMA: "#4f6dff", AXON: "#8a949e", BASAL: "#44e07c", APICAL: "#ff5a4a"}


def preview_svg(doc: dict) -> str:
    """A plain SVG of a converted cell: green basal, red apical, gray axon, blue soma."""
    x, y, r, parent, kind = (doc[k] for k in ("x", "y", "r", "parent", "kind"))
    lines = []
    for i in range(1, len(x)):
        p = parent[i]
        width = min(0.02, max(0.002, 2 * r[i]))
        lines.append(
            f'<line x1="{x[p]}" y1="{y[p]}" x2="{x[i]}" y2="{y[i]}" '
            f'stroke="{KIND_COLORS[kind[i]]}" stroke-width="{width:.4f}"/>'
        )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.05 -1.05 2.1 2.1" width="600" height="600">'
        '<rect x="-1.05" y="-1.05" width="2.1" height="2.1" fill="#000"/>'
        f'<g stroke-linecap="round">{"".join(lines)}</g>'
        f'<circle cx="0" cy="0" r="{max(r[0], 0.012):.4f}" fill="{KIND_COLORS[SOMA]}"/></svg>\n'
    )


def write_index(out_dir: Path, entries: list[dict]) -> None:
    """Update index.json, the list of cells the site can load, keeping cells from earlier runs."""
    path = out_dir / "index.json"
    cells: dict[str, dict] = {}
    if path.exists():
        try:
            cells = {c["id"]: c for c in json.loads(path.read_text(encoding="utf-8"))["cells"]}
        except (ValueError, KeyError, TypeError):
            cells = {}
    for entry in entries:
        cells[entry["id"]] = entry
    listed = [cells[k] for k in sorted(cells) if (out_dir / cells[k]["file"]).exists()]
    path.write_text(json.dumps({"format": INDEX_FORMAT, "cells": listed}, indent=2) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Convert SWC reconstructions into cell-web/1 JSON for the website.")
    parser.add_argument("input", type=Path, help="an .swc file, or a folder of them")
    parser.add_argument("output", type=Path, help="folder to write the JSON files into")
    parser.add_argument("--sources", type=Path, required=True, help="CSV with one credit row per SWC file")
    parser.add_argument("--epsilon", type=float, default=DEFAULT_EPSILON,
                        help=f"simplification tolerance as a fraction of the cell's reach (default {DEFAULT_EPSILON}; 0 keeps every point)")
    parser.add_argument("--projection", choices=("pca", "xy"), default="pca",
                        help="pca: the widest 2D view (default); xy: drop z")
    parser.add_argument("--preview", type=Path, help="also write an SVG preview of each cell into this folder")
    args = parser.parse_args(argv)

    try:
        sources = load_sources(args.sources)
    except ConversionError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    if args.input.is_dir():
        files = sorted(p for p in args.input.iterdir() if p.suffix.lower() == ".swc")
    elif args.input.is_file():
        files = [args.input]
    else:
        print(f"error: input not found: {args.input}", file=sys.stderr)
        return 2
    if not files:
        print(f"error: no .swc files in {args.input}", file=sys.stderr)
        return 2

    args.output.mkdir(parents=True, exist_ok=True)
    if args.preview:
        args.preview.mkdir(parents=True, exist_ok=True)

    entries, failed = [], 0
    for swc_path in files:
        cell_id = slugify(swc_path.stem)
        try:
            source = sources.get(swc_path.name)
            if source is None:
                raise ConversionError(f"no row for {swc_path.name} in {args.sources}; every cell needs a credit")
            text = swc_path.read_text(encoding="utf-8", errors="replace")
            doc, warnings = convert_text(text, source, cell_id, args.epsilon, args.projection)
        except ConversionError as error:
            failed += 1
            print(f"FAIL  {swc_path.name}: {error}", file=sys.stderr)
            continue

        out_file = args.output / f"{cell_id}.json"
        out_file.write_text(json.dumps(doc, separators=(",", ":")) + "\n", encoding="utf-8")
        if args.preview:
            (args.preview / f"{cell_id}.svg").write_text(preview_svg(doc), encoding="utf-8")
        entries.append({"id": cell_id, "file": out_file.name, "cellType": doc["cellType"],
                        "credit": doc["credit"], "url": doc["source"]["url"]})

        before, after = doc["counts"]["input"], doc["counts"]["output"]
        saved = round(100 * (1 - after / before)) if before else 0
        size_kb = out_file.stat().st_size / 1024
        print(f"OK    {swc_path.name}: {before:,} -> {after:,} points ({saved}% fewer), {size_kb:.1f} KB")
        for warning in warnings:
            print(f"      warning: {warning}")

    if entries:
        write_index(args.output, entries)
    print(f"\n{len(entries)} converted, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
