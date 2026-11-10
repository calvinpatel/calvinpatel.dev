"""Tests for scripts/swc_to_web.py. Run from the repo root: pytest tests/test_swc_to_web.py"""
from __future__ import annotations

import importlib.util
import json
import math
import sys
from pathlib import Path

import numpy as np
import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "swc_to_web.py"
_spec = importlib.util.spec_from_file_location("swc_to_web", SCRIPT)
swc = importlib.util.module_from_spec(_spec)
sys.modules["swc_to_web"] = swc
_spec.loader.exec_module(swc)

SOURCE = swc.Source(file="cell.swc", name="test-cell", cell_type="test", archive="Test", url="https://example.org/cell")


def text_of(rows) -> str:
    return "\n".join(" ".join(str(v) for v in row) for row in rows)


def run(start_id, parent_id, kind, start, step, count, radius=1.0):
    """A straight run of `count` points, each `step` past the last, hanging off `parent_id`."""
    rows, point, parent = [], np.array(start, dtype=float), parent_id
    for k in range(count):
        point = point + np.array(step, dtype=float)
        node = start_id + k
        rows.append((node, kind, *np.round(point, 4).tolist(), radius, parent))
        parent = node
    return rows


def tips(doc) -> list[int]:
    has_child = set(doc["parent"][1:])
    return [i for i in range(1, len(doc["x"])) if i not in has_child]


def test_three_point_soma_merges_into_one_point():
    rows = [(1, 1, 0, 0, 0, 5, -1), (2, 1, 0, -5, 0, 5, 1), (3, 1, 0, 5, 0, 5, 1)]
    rows += run(10, 3, 3, (0, 5, 0), (0, 1, 0), 20)
    rows += run(40, 2, 2, (0, -5, 0), (0, -1, 0), 30)
    parsed, warnings = swc.parse_swc(text_of(rows))
    cell = swc.build_cell(parsed, warnings)
    assert cell.kind[0] == swc.SOMA
    assert (cell.kind == swc.SOMA).sum() == 1
    assert len(cell.parent) == len(rows) - 2
    assert np.allclose(cell.xyz[0], 0)
    assert cell.r[0] == pytest.approx(5)


def test_reroots_at_soma_and_orders_parents_first():
    rows = run(100, -1, 3, (20, 0, 0), (-1, 0, 0), 1)  # file root is a dendrite tip
    rows += run(101, 100, 3, (19, 0, 0), (-1, 0, 0), 18)
    rows.append((200, 1, 0, 0, 0, 4, 118))  # soma sits in the middle of the file's tree
    rows += run(201, 200, 3, (0, 0, 0), (-1, 0, 0), 15)
    shuffled = [rows[i] for i in np.random.default_rng(7).permutation(len(rows))]
    parsed, warnings = swc.parse_swc(text_of(shuffled))
    cell = swc.build_cell(parsed, warnings)
    assert cell.kind[0] == swc.SOMA
    assert len(cell.parent) == len(rows)
    assert all(0 <= cell.parent[i] < i for i in range(1, len(cell.parent)))


def test_drops_disconnected_piece_and_flags_missing_parent():
    rows = [(1, 1, 0, 0, 0, 5, -1)] + run(2, 1, 3, (0, 0, 0), (1, 0, 0), 10)
    rows += run(50, -1, 3, (100, 100, 0), (1, 0, 0), 5)   # floating piece
    rows.append((90, 3, 5, 5, 0, 1, 999))                 # parent id that doesn't exist
    parsed, warnings = swc.parse_swc(text_of(rows) + "\nnot a row\n")
    cell = swc.build_cell(parsed, warnings)
    assert len(cell.parent) == 11
    joined = " ".join(warnings)
    assert "malformed" in joined
    assert "doesn't exist" in joined
    assert "not connected" in joined


def test_output_follows_the_format_rules():
    rows = [(1, 1, 0, 0, 0, 5, -1)]
    rows += run(2, 1, 4, (0, 0, 0), (0.2, 1, 0.1), 60)
    rows += run(100, 40, 4, rows[39][2:5], (1, 1, 0), 20)
    rows += run(200, 1, 3, (0, 0, 0), (-1, -0.3, 0.2), 30)
    rows += run(300, 1, 2, (0, 0, 0), (0, -1.5, 0), 80, radius=0.5)
    doc, _ = swc.convert_text(text_of(rows), SOURCE, "cell")
    n = len(doc["x"])
    assert doc["format"] == "cell-web/1"
    assert all(len(doc[k]) == n for k in ("y", "r", "parent", "kind", "dist"))
    assert doc["parent"][0] == -1 and doc["kind"][0] == 1
    assert doc["x"][0] == 0 and doc["y"][0] == 0 and doc["dist"][0] == 0
    assert all(0 <= doc["parent"][i] < i for i in range(1, n))
    assert all(k in (2, 3, 4) for k in doc["kind"][1:])
    for i in range(1, n):
        p = doc["parent"][i]
        step = math.hypot(doc["x"][i] - doc["x"][p], doc["y"][i] - doc["y"][p])
        assert doc["dist"][i] == pytest.approx(doc["dist"][p] + step, abs=2e-3)
    reach = max(math.hypot(x, y) for x, y in zip(doc["x"], doc["y"]))
    assert reach == pytest.approx(1, abs=1e-3)


def test_pca_recovers_a_tilted_flat_cell():
    rows = [(1, 1, 0, 0, 0, 3, -1)]
    rows += run(2, 1, 3, (0, 0, 0), (1, 0, 0), 40)
    rows += run(50, 1, 3, (0, 0, 0), (-1, 0, 0), 40)
    rows += run(100, 1, 3, (0, 0, 0), (0, 1, 0), 20)
    rows += run(150, 1, 3, (0, 0, 0), (0, -1, 0), 20)
    a, b = math.radians(60), math.radians(30)
    tilt = (np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])
            @ np.array([[math.cos(b), 0, math.sin(b)], [0, 1, 0], [-math.sin(b), 0, math.cos(b)]]))
    tilted = [(i, t, *np.round(tilt @ np.array([x, y, z]), 4).tolist(), r, p) for i, t, x, y, z, r, p in rows]

    def tip_reaches(projection):
        doc, _ = swc.convert_text(text_of(tilted), SOURCE, "cell", 0.0, projection)
        return sorted(round(math.hypot(doc["x"][i], doc["y"][i]), 2) for i in tips(doc))

    assert tip_reaches("pca") == [0.5, 0.5, 1.0, 1.0]
    assert tip_reaches("xy") != [0.5, 0.5, 1.0, 1.0]


def test_apical_dendrite_points_up():
    rows = [(1, 1, 0, 0, 0, 5, -1)]
    rows += run(2, 1, 4, (0, 0, 0), (1, 0, 0), 40)         # apical traced along +x
    rows += run(100, 1, 3, (0, 0, 0), (-1, 0.5, 0), 15)
    rows += run(200, 1, 2, (0, 0, 0), (-1, -1, 0), 25)
    doc, _ = swc.convert_text(text_of(rows), SOURCE, "cell")
    apical_tip = max((i for i in tips(doc) if doc["kind"][i] == 4), key=lambda i: doc["dist"][i])
    assert doc["y"][apical_tip] < -0.9          # screen y points down, so up is negative
    assert abs(doc["x"][apical_tip]) < 0.05


def test_simplify_keeps_structure_and_drops_straight_runs():
    rows = [(1, 1, 0, 0, 0, 5, -1)]
    rows += run(2, 1, 3, (0, 0, 0), (1, 0, 0), 200)
    rows += run(500, 101, 3, rows[100][2:5], (0, 1, 0), 50)
    full, _ = swc.convert_text(text_of(rows), SOURCE, "cell", 0.0)
    thin, _ = swc.convert_text(text_of(rows), SOURCE, "cell", 0.002)
    assert len(full["x"]) == len(rows)
    assert len(thin["x"]) <= 6
    assert len(tips(thin)) == 2
    child_counts = np.bincount(thin["parent"][1:], minlength=len(thin["x"]))
    assert (child_counts[1:] == 2).sum() == 1   # the branch point survives


def test_cli_converts_folder_writes_index_and_flags_missing_credit(tmp_path):
    swc_dir, out_dir, preview_dir = tmp_path / "swc", tmp_path / "cells", tmp_path / "preview"
    swc_dir.mkdir()
    rows = [(1, 1, 0, 0, 0, 5, -1)] + run(2, 1, 3, (0, 0, 0), (1, 1, 0), 30)
    (swc_dir / "good.CNG.swc").write_text(text_of(rows))
    (swc_dir / "uncredited.swc").write_text(text_of(rows))
    sources = tmp_path / "sources.csv"
    sources.write_text(
        "file,name,cell_type,archive,url\n"
        "good.CNG.swc,good-cell,medium spiny,Test Lab,https://example.org/good\n"
    )
    code = swc.main([str(swc_dir), str(out_dir), "--sources", str(sources), "--preview", str(preview_dir)])
    assert code == 1  # the uncredited file fails, the good one still converts
    doc = json.loads((out_dir / "good-cng.json").read_text())
    assert doc["credit"] == "good-cell (Test Lab archive), via NeuroMorpho.Org, CC BY 4.0"
    index = json.loads((out_dir / "index.json").read_text())
    assert [c["id"] for c in index["cells"]] == ["good-cng"]
    assert (preview_dir / "good-cng.svg").exists()
    assert not (out_dir / "uncredited.json").exists()


def test_sources_file_must_have_required_columns(tmp_path):
    sources = tmp_path / "sources.csv"
    sources.write_text("file,name\ncell.swc,cell\n")
    with pytest.raises(swc.ConversionError, match="missing column"):
        swc.load_sources(sources)
