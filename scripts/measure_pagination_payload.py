import json
import sys
import uuid
import datetime

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def generate_mock_task(i: int):
    return {
        "id": str(uuid.uuid4()),
        "org_id": "00000000-0000-0000-0000-000000000001",
        "project_id": str(uuid.uuid4()),
        "project_name": f"Comprehensive Enterprise Campaign #{i}",
        "title": f"Execute Multi-Platform PR Crisis Mitigation Strategy & Analysis #{i}",
        "description": f"Detailed executive briefing, sentiment analysis, stakeholder alignment, press release distribution across 14 MENA media outlets for record #{i}.",
        "status": "in_progress",
        "priority": "high",
        "assigned_to": "dr-ibrahim",
        "assigned_user_name": "Dr. Ibrahim (Market Strategist)",
        "due_date": "2026-11-30T18:00:00Z",
        "progress_percentage": 65,
        "dependencies": [str(uuid.uuid4()), str(uuid.uuid4())],
        "events": [
            {
                "id": str(uuid.uuid4()),
                "task_id": str(uuid.uuid4()),
                "event_type": "status_changed",
                "timestamp": "2026-11-07T05:00:00Z",
                "metadata": {"old_status": "planning", "new_status": "in_progress"}
            }
        ],
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

def run_pagination_benchmark():
    print("===============================================================")
    print("📦 PHASE 2.4 PAGINATION PAYLOAD SIZE BENCHMARK (500 RECORDS)")
    print("===============================================================")

    # Generate 500 records
    records_500 = [generate_mock_task(i) for i in range(500)]

    # 1. Unpaginated payload (All 500 records)
    unpaginated_payload = {
        "tasks": records_500,
        "count": len(records_500)
    }
    raw_unpaginated_json = json.dumps(unpaginated_payload)
    unpaginated_bytes = len(raw_unpaginated_json.encode("utf-8"))
    unpaginated_kb = round(unpaginated_bytes / 1024, 2)

    # 2. Paginated payload (Default Limit: 20 records)
    paginated_20 = records_500[:20]
    paginated_payload = {
        "tasks": paginated_20,
        "count": len(paginated_20),
        "total": len(records_500),
        "skip": 0,
        "limit": 20
    }
    raw_paginated_json = json.dumps(paginated_payload)
    paginated_bytes = len(raw_paginated_json.encode("utf-8"))
    paginated_kb = round(paginated_bytes / 1024, 2)

    reduction_percentage = round(((unpaginated_bytes - paginated_bytes) / unpaginated_bytes) * 100, 2)

    result = {
        "record_count_total": 500,
        "paginated_page_size": 20,
        "unpaginated": {
            "bytes": unpaginated_bytes,
            "kb": unpaginated_kb
        },
        "paginated": {
            "bytes": paginated_bytes,
            "kb": paginated_kb
        },
        "reduction_percentage": reduction_percentage,
        "bytes_saved": unpaginated_bytes - paginated_bytes,
        "kb_saved": round((unpaginated_bytes - paginated_bytes) / 1024, 2)
    }

    with open("task_2_4_pagination_benchmark.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"  Unpaginated (500 items): {unpaginated_kb} KB ({unpaginated_bytes:,} bytes)")
    print(f"  Paginated   (20 items):  {paginated_kb} KB ({paginated_bytes:,} bytes)")
    print(f"  Payload Reduction:       -{reduction_percentage}% ({result['kb_saved']} KB saved)")
    print("===============================================================")

if __name__ == "__main__":
    run_pagination_benchmark()
