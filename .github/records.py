# /// script
# requires-python = ">=3.11"
# dependencies = ["PyYAML==6.0.3", "jsonschema==4.26.0"]
# ///
"""Create, validate, query, and visualize SMADR-derived records."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import deque
from datetime import date
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator

RECORDS_VERSION = "2.0"
ID_PATTERN = re.compile(r"^(ADR|XR|ISS)-[0-9]{4}$")
RELATIONS = ("depends_on", "informs", "evaluates", "supersedes", "issues")
LEGACY_RELATION = "related"
ISSUE_STATUSES = ["open", "in-progress", "in-review", "blocked", "closed"]
ISSUE_RESOLUTIONS = ["completed", "abandoned", "duplicate", "superseded"]
SUPERSESSION_SOURCE_STATUSES = {
    "decision": {"accepted", "deprecated", "superseded"},
    "exploration": {"adopted", "rejected", "inconclusive", "superseded"},
    # Any issue may replace another; the successor is usually still open.
    "issue": set(ISSUE_STATUSES),
}
RELATION_LABELS = {
    ("outgoing", "depends_on"): "depends on",
    ("incoming", "depends_on"): "required by",
    ("outgoing", "informs"): "informs",
    ("incoming", "informs"): "informed by",
    ("outgoing", "evaluates"): "evaluates",
    ("incoming", "evaluates"): "evaluated by",
    ("outgoing", "supersedes"): "supersedes",
    ("incoming", "supersedes"): "superseded by",
    ("outgoing", "issues"): "tracked in",
    ("incoming", "issues"): "tracks",
}
TARGETS = {
    "decision": (Path("docs/decisions"), "ADR-*.md"),
    "exploration": (Path("docs/explorations"), "XR-*.md"),
    "issue": (Path("docs/issues"), "ISS-*.md"),
}
RECORD_CONFIG = {
    "adr": {
        "prefix": "ADR",
        "directory": Path("docs/decisions"),
        "template": Path("docs/decisions/template.md"),
        "title_placeholder": "Replace with decision title",
    },
    "xr": {
        "prefix": "XR",
        "directory": Path("docs/explorations"),
        "template": Path("docs/explorations/template.md"),
        "title_placeholder": "Replace with exploration title",
    },
    "issue": {
        "prefix": "ISS",
        "directory": Path("docs/issues"),
        "template": Path("docs/issues/template.md"),
        "title_placeholder": "Replace with issue title",
    },
}
REQUIRED_SECTIONS = {
    "decision": [
        "Context and Problem Statement",
        "Decision Drivers",
        "Considered Options",
        "Decision Outcome",
        "Consequences",
        "Validation",
        "Related Records",
    ],
    "exploration": [
        "Context and Question",
        "Motivation",
        "Hypothesis",
        "Approach",
        "Evaluation Conditions",
        "Observed Results",
        "Conclusion",
        "Reusable Findings",
        "Artifacts",
        "Revisit Conditions",
        "Related Records",
    ],
    "issue": [
        "Problem",
        "Goal",
        "Acceptance criteria",
    ],
}
REFERENCE_ARRAY_SCHEMA = {
    "type": "array",
    "uniqueItems": True,
    "items": {"type": "string", "pattern": r"^(ADR|XR|ISS)-[0-9]{4}$"},
}
COMMON_SCHEMA: dict[str, Any] = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["id", "title", "type", "status", "date", "authors", "scope", "tags"],
    "properties": {
        "id": {"type": "string", "pattern": r"^(ADR|XR|ISS)-[0-9]{4}$"},
        "title": {"type": "string", "minLength": 1},
        "type": {"type": "string"},
        "status": {"type": "string"},
        "date": {"type": "string", "pattern": r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
        "updated": {"type": "string", "pattern": r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
        "authors": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": True,
            "items": {"type": "string", "minLength": 1},
        },
        "scope": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": True,
            "items": {"type": "string", "minLength": 1},
        },
        "tags": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": True,
            "items": {"type": "string", "pattern": r"^[a-z0-9]+(?:-[a-z0-9]+)*$"},
        },
        "depends_on": REFERENCE_ARRAY_SCHEMA,
        "informs": {
            "type": "array",
            "uniqueItems": True,
            "items": {"type": "string", "pattern": r"^ADR-[0-9]{4}$"},
        },
        "evaluates": REFERENCE_ARRAY_SCHEMA,
        "supersedes": REFERENCE_ARRAY_SCHEMA,
        # Transitional input only. It is excluded from the canonical graph.
        "related": REFERENCE_ARRAY_SCHEMA,
        "issues": {
            "type": "array",
            "uniqueItems": True,
            "items": {"type": "string", "pattern": r"^ISS-[0-9]{4}$"},
        },
        "resolution": {"enum": ISSUE_RESOLUTIONS},
        "resolved": {"type": "string", "pattern": r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
        "duplicate_of": {"type": "string", "pattern": r"^ISS-[0-9]{4}$"},
        "artifacts": {
            "type": "object",
            "properties": {
                key: {
                    "type": "array",
                    "uniqueItems": True,
                    "items": {"type": "string", "minLength": 1},
                }
                for key in ("revisions", "manifests", "results", "commands")
            },
            "additionalProperties": False,
        },
    },
    "patternProperties": {r"^x-[a-z0-9]+(?:-[a-z0-9]+)*$": True},
    "additionalProperties": False,
}
TYPE_SCHEMAS: dict[str, dict[str, Any]] = {
    "decision": {
        "type": "object",
        "properties": {
            "id": {"type": "string", "pattern": r"^ADR-[0-9]{4}$"},
            "type": {"const": "decision"},
            "status": {
                "enum": ["proposed", "accepted", "rejected", "deprecated", "superseded"]
            },
        },
    },
    "exploration": {
        "type": "object",
        "properties": {
            "id": {"type": "string", "pattern": r"^XR-[0-9]{4}$"},
            "type": {"const": "exploration"},
            "status": {
                "enum": [
                    "planned",
                    "running",
                    "adopted",
                    "rejected",
                    "inconclusive",
                    "superseded",
                ]
            },
        },
    },
    "issue": {
        "type": "object",
        "properties": {
            "id": {"type": "string", "pattern": r"^ISS-[0-9]{4}$"},
            "type": {"const": "issue"},
            "status": {"enum": ISSUE_STATUSES},
        },
    },
}

Record = dict[str, Any]
Edge = tuple[str, str, str]
TreeEdge = tuple[str, str, str]


def parse_record(path: Path) -> tuple[dict[str, Any], str]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*\n(.*)\Z", text, re.DOTALL)
    if match is None:
        raise ValueError("missing YAML frontmatter delimited by ---")
    metadata = yaml.safe_load(match.group(1))
    if not isinstance(metadata, dict):
        raise ValueError("frontmatter must be a mapping")
    return metadata, match.group(2)


def headings(body: str) -> tuple[list[str], list[str]]:
    h1: list[str] = []
    h2: list[str] = []
    fence: str | None = None
    for line in body.splitlines():
        marker = re.match(r"(```+|~~~+)", line.lstrip())
        if marker:
            char = marker.group(1)[0]
            fence = char if fence is None else None if fence == char else fence
            continue
        if fence is not None:
            continue
        if match := re.fullmatch(r"#\s+(.+?)\s*", line):
            h1.append(match.group(1))
        elif match := re.fullmatch(r"##\s+(.+?)\s*", line):
            h2.append(match.group(1))
    return h1, h2


def relative(root: Path, path: Path) -> Path:
    try:
        return path.relative_to(root)
    except ValueError:
        return path


def reference_list(metadata: dict[str, Any], field: str) -> list[str]:
    value = metadata.get(field, [])
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]


def is_superseded_state(metadata: dict[str, Any]) -> bool:
    if metadata.get("type") == "issue":
        return (
            metadata.get("status") == "closed"
            and metadata.get("resolution") == "superseded"
        )
    return metadata.get("status") == "superseded"


def superseded_state_requirement(metadata: dict[str, Any]) -> str:
    if metadata.get("type") == "issue":
        return "status=closed and resolution=superseded"
    return "status=superseded"


def relation_cycles(records: dict[str, Record], relation: str) -> list[list[str]]:
    adjacency = {
        record_id: sorted(
            target
            for target in reference_list(record["meta"], relation)
            if target in records
        )
        for record_id, record in records.items()
    }
    state = {record_id: 0 for record_id in records}
    stack: list[str] = []
    positions: dict[str, int] = {}
    cycles: set[tuple[str, ...]] = set()

    def visit(record_id: str) -> None:
        state[record_id] = 1
        positions[record_id] = len(stack)
        stack.append(record_id)
        for target in adjacency[record_id]:
            if state[target] == 0:
                visit(target)
            elif state[target] == 1:
                cycle = stack[positions[target] :]
                rotations = [
                    tuple(cycle[index:] + cycle[:index]) for index in range(len(cycle))
                ]
                cycles.add(min(rotations))
        stack.pop()
        positions.pop(record_id)
        state[record_id] = 2

    for record_id in sorted(records):
        if state[record_id] == 0:
            visit(record_id)
    return [list(cycle) + [cycle[0]] for cycle in sorted(cycles)]


def collect(root: Path) -> tuple[dict[str, Record], list[str]]:
    root = root.resolve()
    errors: list[str] = []
    records: dict[str, Record] = {}
    common_validator = Draft202012Validator(COMMON_SCHEMA)
    type_validators = {
        key: Draft202012Validator(value) for key, value in TYPE_SCHEMAS.items()
    }

    def fail(path: Path, message: str) -> None:
        errors.append(f"{relative(root, path)}: {message}")

    for expected_type, (relative_directory, pattern) in TARGETS.items():
        directory = root / relative_directory
        if not directory.is_dir():
            fail(directory, "record directory does not exist")
            continue
        for path in sorted(directory.glob(pattern)):
            if path.name == "template.md":
                continue
            try:
                metadata, body = parse_record(path)
            except (OSError, UnicodeError, ValueError, yaml.YAMLError) as exc:
                fail(path, str(exc))
                continue
            for validator in (common_validator, type_validators[expected_type]):
                for error in sorted(
                    validator.iter_errors(metadata),
                    key=lambda item: [str(part) for part in item.absolute_path],
                ):
                    location = ".".join(str(part) for part in error.absolute_path)
                    fail(path, f"{location or 'frontmatter'}: {error.message}")
            record_id = metadata.get("id")
            if not isinstance(record_id, str) or not ID_PATTERN.fullmatch(record_id):
                continue
            if record_id in records:
                fail(
                    path,
                    f"duplicate id {record_id}; first defined in "
                    f"{relative(root, records[record_id]['path'])}",
                )
            else:
                records[record_id] = {"path": path, "meta": metadata, "body": body}
            if metadata.get("type") != expected_type:
                fail(path, f"directory requires type={expected_type!r}")
            if not path.name.startswith(f"{record_id}-"):
                fail(path, f"filename must start with {record_id}-")
            h1, h2 = headings(body)
            title = metadata.get("title")
            if h1 != [title]:
                fail(
                    path,
                    f"body must contain exactly one H1 equal to title {title!r}; found {h1!r}",
                )
            duplicates = sorted({heading for heading in h2 if h2.count(heading) > 1})
            if duplicates:
                fail(path, f"duplicate H2 sections: {', '.join(duplicates)}")
            missing = [
                section
                for section in REQUIRED_SECTIONS[expected_type]
                if section not in h2
            ]
            if missing:
                fail(path, f"missing required H2 sections: {', '.join(missing)}")

    successor_ids_by_predecessor = {record_id: [] for record_id in records}
    for successor_id, successor_record in records.items():
        for predecessor_id in reference_list(successor_record["meta"], "supersedes"):
            if predecessor_id in successor_ids_by_predecessor:
                successor_ids_by_predecessor[predecessor_id].append(successor_id)
    for successor_ids in successor_ids_by_predecessor.values():
        successor_ids.sort()

    for record_id, record in records.items():
        path = record["path"]
        metadata = record["meta"]
        record_type = metadata.get("type")

        references = [
            (field, target)
            for field in (*RELATIONS, LEGACY_RELATION)
            for target in reference_list(metadata, field)
        ]
        if reference_list(metadata, "informs") and record_type != "exploration":
            fail(path, "informs may only be declared by exploration records")
        if reference_list(metadata, "evaluates") and record_type != "exploration":
            fail(path, "evaluates may only be declared by exploration records")
        if reference_list(metadata, "issues") and record_type not in (
            "decision",
            "exploration",
        ):
            fail(
                path, "issues may only be declared by decision and exploration records"
            )
        for target_id in reference_list(metadata, "informs"):
            target = records.get(target_id)
            if target is not None and target["meta"].get("type") != "decision":
                fail(path, f"informs target {target_id} must be a decision record")
        for target_id in reference_list(metadata, "issues"):
            target = records.get(target_id)
            if target is not None and target["meta"].get("type") != "issue":
                fail(path, f"issues target {target_id} must be an issue record")
        for target_id in reference_list(metadata, "depends_on"):
            target = records.get(target_id)
            if target is None:
                continue
            target_type = target["meta"].get("type")
            if record_type == "issue" and target_type != "issue":
                fail(path, f"depends_on target {target_id} must be an issue record")
            if record_type in ("decision", "exploration") and target_type == "issue":
                fail(
                    path,
                    f"depends_on target {target_id} must be a decision or "
                    "exploration record",
                )

        if record_type == "issue":
            status = metadata.get("status")
            resolution = metadata.get("resolution")
            if status == "closed":
                if resolution is None:
                    fail(path, f"{record_id} with status=closed must set resolution")
                if metadata.get("resolved") is None:
                    fail(path, f"{record_id} with status=closed must set resolved")
            else:
                for field in ("resolution", "resolved", "duplicate_of"):
                    if metadata.get(field) is not None:
                        fail(path, f"{field} may only be set when status=closed")
            duplicate_of = metadata.get("duplicate_of")
            if resolution == "duplicate":
                if duplicate_of is None:
                    fail(
                        path,
                        f"{record_id} with resolution=duplicate must set duplicate_of",
                    )
                elif duplicate_of == record_id:
                    fail(path, "duplicate_of must not reference the record itself")
                elif (
                    duplicate_of not in records
                    or records[duplicate_of]["meta"].get("type") != "issue"
                ):
                    fail(
                        path,
                        f"duplicate_of references unknown issue record {duplicate_of}",
                    )
            elif duplicate_of is not None:
                fail(path, "duplicate_of may only be set when resolution=duplicate")
        else:
            for field in ("resolution", "resolved", "duplicate_of"):
                if metadata.get(field) is not None:
                    fail(path, f"{field} may only be set by issue records")

        for predecessor_id in reference_list(metadata, "supersedes"):
            predecessor = records.get(predecessor_id)
            if predecessor is None:
                continue
            if metadata.get("status") not in SUPERSESSION_SOURCE_STATUSES.get(
                metadata.get("type"), set()
            ):
                fail(
                    path,
                    f"{record_id} with status={metadata.get('status')} cannot supersede "
                    f"{predecessor_id}",
                )
            if predecessor["meta"].get("type") != metadata.get("type"):
                fail(
                    path,
                    f"{record_id} cannot supersede "
                    f"{predecessor['meta'].get('type')} {predecessor_id}",
                )
            if not is_superseded_state(predecessor["meta"]):
                fail(
                    path,
                    f"{predecessor_id} must set "
                    f"{superseded_state_requirement(predecessor['meta'])}",
                )
        successor_ids = successor_ids_by_predecessor[record_id]
        if is_superseded_state(metadata) and len(successor_ids) != 1:
            fail(
                path,
                f"{record_id} with {superseded_state_requirement(metadata)} must be "
                f"superseded by exactly one record; found {len(successor_ids)}",
            )

        for field, target in references:
            if target == record_id:
                fail(path, f"{field} must not reference the record itself")
            elif target not in records:
                fail(path, f"{field} references unknown record {target}")

    for relation in ("depends_on", "evaluates", "supersedes"):
        for cycle in relation_cycles(records, relation):
            fail(records[cycle[0]]["path"], f"{relation} cycle: {' -> '.join(cycle)}")
    return records, errors


def load(root: Path) -> dict[str, Record] | None:
    records, errors = collect(root)
    if not errors:
        return records
    print("Record validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    return None


def legacy_related_edges(records: dict[str, Record]) -> list[Edge]:
    return sorted(
        (source, LEGACY_RELATION, target)
        for source, record in records.items()
        for target in reference_list(record["meta"], LEGACY_RELATION)
        if target in records
    )


def validate(root: Path, strict_relations: bool = False) -> int:
    records = load(root)
    if records is None:
        return 1
    legacy_edges = legacy_related_edges(records)
    if legacy_edges:
        message = (
            f"Legacy related references remain: {len(legacy_edges)} edge(s) in "
            f"{len({source for source, _, _ in legacy_edges})} record(s)."
        )
        if strict_relations:
            print("Typed record relation validation failed:", file=sys.stderr)
            print(f"- {message}", file=sys.stderr)
            return 1
        print(f"Warning: {message}", file=sys.stderr)
    print(f"Validated {len(records)} record(s).")
    return 0


def graph_data(
    records: dict[str, Record],
) -> tuple[list[Edge], dict[str, list[Edge]], dict[str, list[Edge]]]:
    edges = sorted(
        {
            (source, relation, target)
            for source, record in records.items()
            for relation in RELATIONS
            for target in reference_list(record["meta"], relation)
            if target in records
        }
    )
    outgoing = {record_id: [] for record_id in records}
    incoming = {record_id: [] for record_id in records}
    for edge in edges:
        outgoing[edge[0]].append(edge)
        incoming[edge[2]].append(edge)
    return edges, outgoing, incoming


def record_json(root: Path, record_id: str, record: Record) -> dict[str, Any]:
    metadata = record["meta"]
    return {
        "id": record_id,
        "title": metadata["title"],
        "type": metadata["type"],
        "status": metadata["status"],
        "resolution": metadata.get("resolution"),
        "path": str(relative(root.resolve(), record["path"])),
        "date": metadata.get("date"),
        "updated": metadata.get("updated"),
        "authors": metadata.get("authors", []),
        "tags": metadata.get("tags", []),
        "scope": metadata.get("scope", []),
        "issues": metadata.get("issues", []),
    }


def list_command(
    root: Path,
    record_type: str | None,
    status: str | None,
    tag: str | None,
    output_format: str,
) -> int:
    records = load(root)
    if records is None:
        return 1
    selected = [
        (record_id, record)
        for record_id, record in sorted(records.items())
        if (record_type is None or record["meta"]["type"] == record_type)
        and (status is None or record["meta"]["status"] == status)
        and (tag is None or tag in record["meta"].get("tags", []))
    ]
    if output_format == "json":
        print(
            json.dumps(
                [
                    record_json(root, record_id, record)
                    for record_id, record in selected
                ],
                ensure_ascii=False,
                indent=2,
            )
        )
    elif not selected:
        print("No records matched.")
    else:
        width = max(len(record_id) for record_id, _ in selected)
        for record_id, record in selected:
            metadata = record["meta"]
            print(
                f"{record_id:<{width}}  {metadata['type']:<11}  "
                f"{metadata['status']:<12}  {metadata['title']}  "
                f"({relative(root.resolve(), record['path'])})"
            )
    return 0


def branch_label(direction: str, relation: str) -> str:
    return RELATION_LABELS[(direction, relation)]


def show_command(root: Path, record_id: str, output_format: str) -> int:
    records = load(root)
    if records is None:
        return 1
    if record_id not in records:
        print(f"Unknown record: {record_id}", file=sys.stderr)
        return 2
    _, outgoing, incoming = graph_data(records)
    if output_format == "json":
        payload = record_json(root, record_id, records[record_id])
        payload["outgoing"] = [
            {"source": source, "relation": relation, "target": target}
            for source, relation, target in outgoing[record_id]
        ]
        payload["incoming"] = [
            {"source": source, "relation": relation, "target": target}
            for source, relation, target in incoming[record_id]
        ]
        payload["artifacts"] = records[record_id]["meta"].get("artifacts", {})
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    metadata = records[record_id]["meta"]
    print(f"{record_id}: {metadata['title']}")
    print(f"type: {metadata['type']}")
    print(f"status: {metadata['status']}")
    print(f"path: {relative(root.resolve(), records[record_id]['path'])}")
    print(f"tags: {', '.join(metadata.get('tags', [])) or '-'}")
    print(f"issues: {', '.join(metadata.get('issues', [])) or '-'}")
    groups: list[tuple[str, list[str]]] = []
    for relation in RELATIONS:
        outgoing_targets = [
            target
            for _, edge_relation, target in outgoing[record_id]
            if edge_relation == relation
        ]
        incoming_sources = [
            source
            for source, edge_relation, _ in incoming[record_id]
            if edge_relation == relation
        ]
        if outgoing_targets:
            groups.append((branch_label("outgoing", relation), outgoing_targets))
        if incoming_sources:
            groups.append((branch_label("incoming", relation), incoming_sources))
    for label, related_ids in groups:
        print(f"{label}:")
        for index, related_id in enumerate(related_ids):
            branch = "└──" if index == len(related_ids) - 1 else "├──"
            print(f"  {branch} {related_id}: {records[related_id]['meta']['title']}")
    if not groups:
        print("relationships: -")
    return 0


def adjacent_edges(
    record_id: str,
    outgoing: dict[str, list[Edge]],
    incoming: dict[str, list[Edge]],
    direction: str,
    relations: set[str],
) -> list[tuple[str, Edge, str]]:
    adjacent: list[tuple[str, Edge, str]] = []
    if direction in ("outgoing", "both"):
        adjacent.extend(
            ("outgoing", edge, edge[2])
            for edge in outgoing[record_id]
            if edge[1] in relations
        )
    if direction in ("incoming", "both"):
        adjacent.extend(
            ("incoming", edge, edge[0])
            for edge in incoming[record_id]
            if edge[1] in relations
        )
    return sorted(adjacent, key=lambda item: (item[0], item[1][1], item[2]))


def traverse(
    records: dict[str, Record],
    root_id: str,
    depth: int,
    direction: str,
    relations: set[str],
) -> list[dict[str, Any]]:
    _, outgoing, incoming = graph_data(records)
    queue = deque([(root_id, 0)])
    visited = {root_id}
    steps: list[dict[str, Any]] = []
    while queue:
        origin, current_depth = queue.popleft()
        if current_depth >= depth:
            continue
        for edge_direction, edge, target in adjacent_edges(
            origin, outgoing, incoming, direction, relations
        ):
            if target in visited:
                continue
            visited.add(target)
            steps.append(
                {
                    "depth": current_depth + 1,
                    "origin": origin,
                    "direction": edge_direction,
                    "relation": edge[1],
                    "target": target,
                }
            )
            queue.append((target, current_depth + 1))
    return steps


def query_command(
    root: Path,
    record_id: str,
    depth: int,
    direction: str,
    relation_values: list[str] | None,
    output_format: str,
) -> int:
    records = load(root)
    if records is None:
        return 1
    if record_id not in records:
        print(f"Unknown record: {record_id}", file=sys.stderr)
        return 2
    relations = set(relation_values or RELATIONS)
    steps = traverse(records, record_id, depth, direction, relations)
    if output_format == "json":
        ids = [record_id] + [step["target"] for step in steps]
        print(
            json.dumps(
                {
                    "root": record_id,
                    "depth": depth,
                    "direction": direction,
                    "relations": sorted(relations),
                    "records": [record_json(root, item, records[item]) for item in ids],
                    "steps": steps,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    print(f"0  {record_id}: {records[record_id]['meta']['title']}")
    for step in steps:
        label = branch_label(step["direction"], step["relation"])
        print(
            f"{step['depth']}  {step['origin']} --{label}-- {step['target']}: "
            f"{records[step['target']]['meta']['title']}"
        )
    return 0


def record_label(records: dict[str, Record], record_id: str) -> str:
    metadata = records[record_id]["meta"]
    return f"{record_id}: {metadata['title']} [{metadata['status']}]"


def spanning_tree(
    records: dict[str, Record],
    root_id: str,
    depth: int,
    direction: str,
    relations: set[str],
) -> dict[str, list[TreeEdge]]:
    _, outgoing, incoming = graph_data(records)
    children: dict[str, list[TreeEdge]] = {record_id: [] for record_id in records}
    queue = deque([(root_id, 0)])
    visited = {root_id}
    while queue:
        parent, current_depth = queue.popleft()
        if current_depth >= depth:
            continue
        for edge_direction, edge, target in adjacent_edges(
            parent, outgoing, incoming, direction, relations
        ):
            if target in visited:
                continue
            visited.add(target)
            children[parent].append((edge_direction, edge[1], target))
            queue.append((target, current_depth + 1))
    return children


def tree_lines(
    records: dict[str, Record],
    root_id: str,
    depth: int,
    direction: str,
    relations: set[str],
    *,
    expanded: set[str] | None = None,
) -> tuple[list[str], set[str]]:
    children = spanning_tree(records, root_id, depth, direction, relations)
    expanded = expanded if expanded is not None else set()
    expanded.update(
        {
            root_id,
            *(target for entries in children.values() for _, _, target in entries),
        }
    )
    lines = [record_label(records, root_id)]

    def render(record_id: str, prefix: str) -> None:
        grouped: dict[tuple[str, str], list[str]] = {}
        for edge_direction, relation, target in children[record_id]:
            grouped.setdefault((edge_direction, relation), []).append(target)
        groups = sorted(
            grouped.items(),
            key=lambda item: (item[0][0] != "outgoing", RELATIONS.index(item[0][1])),
        )
        for group_index, ((edge_direction, relation), targets) in enumerate(groups):
            group_last = group_index == len(groups) - 1
            lines.append(
                f"{prefix}{'└── ' if group_last else '├── '}"
                f"{branch_label(edge_direction, relation)}"
            )
            group_prefix = prefix + ("    " if group_last else "│   ")
            for target_index, target in enumerate(targets):
                target_last = target_index == len(targets) - 1
                lines.append(
                    f"{group_prefix}{'└── ' if target_last else '├── '}"
                    f"{record_label(records, target)}"
                )
                render(target, group_prefix + ("    " if target_last else "│   "))

    render(root_id, "")
    return lines, expanded


def mermaid_source(
    records: dict[str, Record], selected: set[str], edges: list[Edge]
) -> str:
    lines = ["flowchart LR"]
    for record_id in sorted(selected):
        title = str(records[record_id]["meta"]["title"])
        title = (
            title.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("\n", "&#10;")
        )
        lines.append(f'    {record_id.replace("-", "_")}["{record_id}<br/>{title}"]')
    for source, relation, target in edges:
        lines.append(
            f"    {source.replace('-', '_')} -->|{relation}| {target.replace('-', '_')}"
        )
    return "\n".join(lines)


def graph_command(
    root: Path,
    record_id: str | None,
    depth: int,
    direction: str,
    relation_values: list[str] | None,
    output_format: str,
) -> int:
    records = load(root)
    if records is None:
        return 1
    if record_id is not None and record_id not in records:
        print(f"Unknown record: {record_id}", file=sys.stderr)
        return 2
    relations = set(relation_values or RELATIONS)
    selected = (
        set(records)
        if record_id is None
        else {
            record_id,
            *(
                step["target"]
                for step in traverse(records, record_id, depth, direction, relations)
            ),
        }
    )
    edges, _, _ = graph_data(records)
    selected_edges = [
        edge
        for edge in edges
        if edge[0] in selected and edge[2] in selected and edge[1] in relations
    ]
    if output_format == "json":
        print(
            json.dumps(
                {
                    "root": record_id,
                    "depth": depth if record_id else None,
                    "direction": direction,
                    "relations": sorted(relations),
                    "nodes": [
                        record_json(root, key, records[key]) for key in sorted(selected)
                    ],
                    "edges": [
                        {"source": source, "relation": relation, "target": target}
                        for source, relation, target in selected_edges
                    ],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    if output_format == "mermaid":
        print(mermaid_source(records, selected, selected_edges))
        return 0
    expanded: set[str] = set()
    first_tree = True
    for tree_root in [record_id] if record_id is not None else sorted(selected):
        if tree_root in expanded:
            continue
        if not first_tree:
            print()
        lines, expanded = tree_lines(
            records,
            tree_root,
            depth,
            direction,
            relations,
            expanded=expanded,
        )
        print("\n".join(lines))
        first_tree = False
    return 0


def slugify(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "record"


def new_record(root: Path, kind: str, title: str, author: str | None) -> int:
    root = root.resolve()
    config = RECORD_CONFIG[kind]
    directory = root / config["directory"]
    template = root / config["template"]
    if not template.is_file():
        print(f"Template not found: {template}", file=sys.stderr)
        return 1
    pattern = re.compile(rf"^{config['prefix']}-(\d{{4}})-.+\.md$")
    numbers = [
        int(match.group(1))
        for path in directory.glob(f"{config['prefix']}-*.md")
        if (match := pattern.fullmatch(path.name))
    ]
    record_id = f"{config['prefix']}-{max(numbers, default=0) + 1:04d}"
    output = directory / f"{record_id}-{slugify(title)}.md"
    if output.exists():
        print(f"Refusing to overwrite: {output}", file=sys.stderr)
        return 1
    content = template.read_text(encoding="utf-8")
    content = content.replace(f"id: {config['prefix']}-0000", f"id: {record_id}", 1)
    content = content.replace(
        f"title: {config['title_placeholder']}",
        f"title: {json.dumps(title, ensure_ascii=False)}",
        1,
    )
    content = content.replace(
        'date: "YYYY-MM-DD"', f'date: "{date.today().isoformat()}"', 1
    )
    content = content.replace(f"# {config['title_placeholder']}", f"# {title}", 1)
    if author:
        content = content.replace(
            "  - Replace with author or agent identifier", f"  - {author}", 1
        )
    output.write_text(content, encoding="utf-8")
    print(output.relative_to(root))
    return 0


def non_negative(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("must be zero or greater")
    return parsed


def traversal_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--depth", type=non_negative, default=1)
    parser.add_argument(
        "--direction", choices=("both", "incoming", "outgoing"), default="both"
    )
    parser.add_argument("--relation", action="append", choices=RELATIONS)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Create, validate, query, and visualize ADR, XR, and ISS files."
    )
    parser.add_argument("--root", type=Path, default=Path.cwd())
    subparsers = parser.add_subparsers(dest="command", required=True)
    validate_parser = subparsers.add_parser(
        "validate", help="Validate all ADR, XR, and ISS files."
    )
    validate_parser.add_argument(
        "--strict-relations",
        action="store_true",
        help="Reject legacy related fields after document migration is complete.",
    )
    new_parser = subparsers.add_parser("new", help="Create a record from a template.")
    new_parser.add_argument("kind", choices=sorted(RECORD_CONFIG))
    new_parser.add_argument("title")
    new_parser.add_argument("--author")
    list_parser = subparsers.add_parser("list", help="List records with filters.")
    list_parser.add_argument("--type", choices=sorted(TYPE_SCHEMAS))
    list_parser.add_argument("--status")
    list_parser.add_argument("--tag")
    list_parser.add_argument("--format", choices=("text", "json"), default="text")
    show_parser = subparsers.add_parser(
        "show", help="Show a record and direct relationships."
    )
    show_parser.add_argument("record_id")
    show_parser.add_argument("--format", choices=("text", "json"), default="text")
    query_parser = subparsers.add_parser(
        "query", help="Traverse relationships from one record."
    )
    query_parser.add_argument("record_id")
    traversal_arguments(query_parser)
    query_parser.add_argument("--format", choices=("text", "json"), default="text")
    graph_parser = subparsers.add_parser(
        "graph", help="Print a terminal tree or export graph data."
    )
    graph_parser.add_argument("record_id", nargs="?")
    traversal_arguments(graph_parser)
    graph_parser.set_defaults(depth=2)
    graph_parser.add_argument(
        "--format", choices=("text", "mermaid", "json"), default="text"
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.command == "validate":
        return validate(args.root, args.strict_relations)
    if args.command == "new":
        return new_record(args.root, args.kind, args.title, args.author)
    if args.command == "list":
        return list_command(args.root, args.type, args.status, args.tag, args.format)
    if args.command == "show":
        return show_command(args.root, args.record_id, args.format)
    if args.command == "query":
        return query_command(
            args.root,
            args.record_id,
            args.depth,
            args.direction,
            args.relation,
            args.format,
        )
    if args.command == "graph":
        return graph_command(
            args.root,
            args.record_id,
            args.depth,
            args.direction,
            args.relation,
            args.format,
        )
    raise AssertionError(args.command)


if __name__ == "__main__":
    raise SystemExit(main())
