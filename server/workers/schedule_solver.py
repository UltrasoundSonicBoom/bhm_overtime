#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Sequence, Tuple

try:
    from ortools.sat.python import cp_model
except ImportError:  # pragma: no cover - runtime fallback for local environments
    cp_model = None


@dataclass(frozen=True)
class ShiftType:
    code: str
    label: str
    start_minutes: int
    end_minutes: int
    is_work: bool


def parse_payload() -> Dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
      raise ValueError("Missing solver payload")
    return json.loads(raw)


def to_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def is_weekend(date_str: str) -> bool:
    return to_date(date_str).weekday() >= 5


def is_holiday(day: Dict[str, Any]) -> bool:
    if "isHoliday" in day:
        return bool(day["isHoliday"])
    return is_weekend(day["date"])


def shift_end_absolute(shift: ShiftType) -> int:
    if not shift.is_work:
        return shift.end_minutes
    if shift.end_minutes <= shift.start_minutes:
        return shift.end_minutes + 1440
    return shift.end_minutes


def rest_hours_between(previous: ShiftType, current: ShiftType) -> float:
    if not previous.is_work or not current.is_work:
        return 999.0
    return (current.start_minutes + 1440 - shift_end_absolute(previous)) / 60.0


def make_assignment(member: Dict[str, Any], date_str: str, shift_code: str, team_slug: str) -> Dict[str, Any]:
    return {
        "memberId": member["id"],
        "memberName": member.get("name"),
        "date": date_str,
        "shiftCode": shift_code,
        "teamSlug": team_slug,
    }


def build_explanation(
    variant: str,
    team_name: str,
    stats: Dict[str, int],
) -> Dict[str, Any]:
    variant_labels = {
        "balanced": "균형형",
        "request_friendly": "요청반영형",
        "continuity_friendly": "연속성형",
    }
    headline = f"{team_name} {variant_labels.get(variant, variant)} 후보안"
    reasons = [
        f"희망 오프 미반영 {stats['request_violations']}건",
        f"야간 상한 초과 {stats['night_cap_excess']}건",
        f"직전 배포안 대비 변경 {stats['continuity_changes']}건",
    ]
    tradeoffs = [
        f"야간 편차 합계 {stats['night_balance_gap']}",
        f"주말·공휴일 편차 합계 {stats['weekend_balance_gap']}",
        f"과편성 {stats['overcoverage']}건",
    ]
    return {
        "headline": headline,
        "reasons": reasons,
        "tradeoffs": tradeoffs,
    }


def extract_day_metadata(payload: Dict[str, Any]) -> Dict[str, Dict[str, bool]]:
    metadata: Dict[str, Dict[str, bool]] = {}
    for day in payload["coverage"]:
        metadata[day["date"]] = {
            "isWeekend": bool(day.get("isWeekend", is_weekend(day["date"]))),
            "isHoliday": bool(day.get("isHoliday", is_holiday(day))),
        }
    return metadata


def event_dates(event: Dict[str, Any]) -> List[str]:
    dates = event.get("dates")
    if isinstance(dates, list) and dates:
        return [str(item) for item in dates]
    if event.get("startDate") and event.get("endDate"):
        return [
            item
            for item in list_dates_between(str(event["startDate"]), str(event["endDate"]))
        ]
    return []


def list_dates_between(start_date: str, end_date: str) -> List[str]:
    dates: List[str] = []
    cursor = to_date(start_date)
    last = to_date(end_date)
    while cursor <= last:
        dates.append(cursor.isoformat())
        cursor = date.fromordinal(cursor.toordinal() + 1)
    return dates


def resolve_event_assignment_code(
    event: Dict[str, Any],
    shift_types: Dict[str, ShiftType],
    off_code: str,
    leave_code: str,
) -> Optional[str]:
    preferred_shift_code = event.get("preferredShiftCode")
    if preferred_shift_code in shift_types:
        return str(preferred_shift_code)
    if event.get("eventType") in {"education", "orientation", "conference"} and "EDU" in shift_types:
        return "EDU"
    if bool(event.get("blocksWork")):
        return leave_code if leave_code in shift_types else off_code
    return None


def event_priority(event: Dict[str, Any]) -> int:
    if event.get("eventType") == "fixed_shift":
        return 4
    if event.get("preferredShiftCode"):
        return 3
    if bool(event.get("blocksWork")):
        return 2
    return 1


def build_member_event_assignments(
    payload: Dict[str, Any],
    shift_types: Dict[str, ShiftType],
    off_code: str,
    leave_code: str,
) -> Dict[Tuple[int, str], str]:
    assignments: Dict[Tuple[int, str], str] = {}
    priorities: Dict[Tuple[int, str], int] = {}

    for event in payload.get("memberEvents", []):
        member_id = event.get("memberId")
        if not member_id:
            continue
        shift_code = resolve_event_assignment_code(event, shift_types, off_code, leave_code)
        if shift_code is None:
            continue
        for date_str in event_dates(event):
            key = (int(member_id), date_str)
            current_priority = priorities.get(key, -1)
            next_priority = event_priority(event)
            if next_priority >= current_priority:
                priorities[key] = next_priority
                assignments[key] = shift_code

    return assignments


def solve_with_fallback(payload: Dict[str, Any]) -> Dict[str, Any]:
    team = payload["team"]
    team_slug = team["slug"]
    members = payload["members"]
    shifts = {item["code"]: ShiftType(
        code=item["code"],
        label=item["label"],
        start_minutes=int(item["startMinutes"]),
        end_minutes=int(item["endMinutes"]),
        is_work=bool(item["isWork"]),
    ) for item in payload["shiftTypes"]}
    coverage = payload["coverage"]
    requests = {(item["memberId"], item["date"]) for item in payload.get("requests", [])}
    leave_dates = {(item["memberId"], item["date"]): "LEAVE" for item in payload.get("approvedLeaves", [])}
    locks = {(item["memberId"], item["date"]): item["shiftCode"] for item in payload.get("locks", [])}
    previous = {(item["memberId"], item["date"]): item["shiftCode"] for item in payload.get("previousPublished", [])}
    active_codes = [code for code, shift in shifts.items() if shift.is_work]
    inactive_codes = [code for code, shift in shifts.items() if not shift.is_work]
    off_code = "OFF" if "OFF" in shifts else inactive_codes[0]
    leave_code = "LEAVE" if "LEAVE" in shifts else off_code
    event_assignments = build_member_event_assignments(payload, shifts, off_code, leave_code)
    assignments: Dict[Tuple[int, str], str] = {}
    counts = defaultdict(lambda: {"night": 0, "weekend": 0, "holiday": 0})
    violations: List[Dict[str, Any]] = []
    day_meta = extract_day_metadata(payload)
    previous_assignments = {
        member["id"]: list(member.get("previousAssignments", []))
        for member in members
    }
    protected_keys = set(leave_dates.keys()) | set(event_assignments.keys()) | set(locks.keys())

    def candidate_sort_key(member: Dict[str, Any], date_str: str, shift_code: str) -> Tuple[int, int, int, int]:
        fairness = member.get("fairness", {})
        request_penalty = 1 if (member["id"], date_str) in requests else 0
        night_cost = counts[member["id"]]["night"] if shift_code == "N" else 0
        continuity_cost = 0
        if previous.get((member["id"], date_str)) not in (None, shift_code):
            continuity_cost = 1
        return (
            request_penalty,
            night_cost,
            int(fairness.get("undesirable", 0)),
            continuity_cost,
        )

    def violates_rest(member_id: int, date_str: str, shift_code: str) -> bool:
        current_shift = shifts[shift_code]
        if not current_shift.is_work:
            return False
        ordered_dates = [item["date"] for item in coverage]
        index = ordered_dates.index(date_str)
        prev_code = None
        if index > 0:
            prev_code = assignments.get((member_id, ordered_dates[index - 1]))
        elif previous_assignments[member_id]:
            prev_code = previous_assignments[member_id][-1]
        if prev_code and prev_code in shifts:
            return rest_hours_between(shifts[prev_code], current_shift) < payload["rules"]["minRestHours"]
        return False

    for day in coverage:
        date_str = day["date"]
        for member in members:
            key = (member["id"], date_str)
            if key in leave_dates:
                assignments[key] = leave_dates[key]
            elif key in event_assignments:
                assignments[key] = event_assignments[key]
            elif key in locks:
                assignments[key] = locks[key]
            else:
                assignments[key] = off_code
            assigned_shift = assignments[key]
            if assigned_shift in shifts and shifts[assigned_shift].is_work:
                if assigned_shift == "N":
                    counts[member["id"]]["night"] += 1
                if day_meta[date_str]["isWeekend"]:
                    counts[member["id"]]["weekend"] += 1
                if day_meta[date_str]["isHoliday"]:
                    counts[member["id"]]["holiday"] += 1

        for shift_code in active_codes:
            required = int(day["requirements"].get(shift_code, 0))
            if required <= 0:
                continue
            while sum(1 for member in members if assignments[(member["id"], date_str)] == shift_code) < required:
                eligible = []
                for member in members:
                    key = (member["id"], date_str)
                    if assignments[key] != off_code or key in protected_keys:
                        continue
                    if shift_code == "N" and not member.get("canNight", True):
                        continue
                    if violates_rest(member["id"], date_str, shift_code):
                        continue
                    eligible.append(member)
                if not eligible:
                    return {
                        "status": "infeasible",
                        "engine": "heuristic-fallback",
                        "reasons": [f"{date_str} {shift_code} 인원을 채울 수 없습니다."],
                        "suggestions": [
                            "희망 오프를 일부 완화하세요.",
                            "고정 배치를 줄이거나 추가 인력을 투입하세요.",
                        ],
                        "summary": {"date": date_str, "shiftCode": shift_code},
                    }
                eligible.sort(key=lambda member: candidate_sort_key(member, date_str, shift_code))
                selected = eligible[0]
                assignments[(selected["id"], date_str)] = shift_code
                if shift_code == "N":
                    counts[selected["id"]]["night"] += 1
                if day_meta[date_str]["isWeekend"]:
                    counts[selected["id"]]["weekend"] += 1
                if day_meta[date_str]["isHoliday"]:
                    counts[selected["id"]]["holiday"] += 1

    candidate_assignments = [
        make_assignment(member, day["date"], assignments[(member["id"], day["date"])], team_slug)
        for day in coverage
        for member in members
    ]
    request_violations = 0
    night_cap_excess = 0
    continuity_changes = 0
    for assignment in candidate_assignments:
        key = (assignment["memberId"], assignment["date"])
        if key in requests and assignment["shiftCode"] not in {"OFF", "LEAVE"}:
            request_violations += 1
            violations.append({
                "severity": "soft",
                "ruleCode": "request.preferred_off",
                "message": "희망 오프를 반영하지 못했습니다.",
                "date": assignment["date"],
                "memberId": assignment["memberId"],
                "details": {"requested": "OFF", "assigned": assignment["shiftCode"]},
            })
        if previous.get(key) not in (None, assignment["shiftCode"]):
            continuity_changes += 1
    for member in members:
        extra_night = max(0, counts[member["id"]]["night"] - int(payload["rules"]["maxNightShiftsPerMonth"]))
        if extra_night:
            night_cap_excess += extra_night
            violations.append({
                "severity": "soft",
                "ruleCode": "night.max_monthly",
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": member["id"],
                "details": {"extraNights": extra_night},
            })

    stats = {
        "request_violations": request_violations,
        "night_cap_excess": night_cap_excess,
        "continuity_changes": continuity_changes,
        "night_balance_gap": 0,
        "weekend_balance_gap": 0,
        "overcoverage": 0,
    }
    candidate = {
        "candidateKey": "balanced",
        "rank": 1,
        "score": {
            "total": request_violations + night_cap_excess * 10 + continuity_changes,
            **stats,
        },
        "explanation": build_explanation("balanced", team["name"], stats),
        "assignments": candidate_assignments,
        "violations": violations,
    }
    return {
        "status": "completed",
        "engine": "heuristic-fallback",
        "selectedCandidateKey": "balanced",
        "candidates": [candidate],
        "summary": stats,
    }


def solve_with_cp_sat(payload: Dict[str, Any]) -> Dict[str, Any]:
    assert cp_model is not None

    team = payload["team"]
    team_slug = team["slug"]
    members = payload["members"]
    coverage = payload["coverage"]
    day_meta = extract_day_metadata(payload)
    shift_types = {
        item["code"]: ShiftType(
            code=item["code"],
            label=item["label"],
            start_minutes=int(item["startMinutes"]),
            end_minutes=int(item["endMinutes"]),
            is_work=bool(item["isWork"]),
        )
        for item in payload["shiftTypes"]
    }
    shift_codes = list(shift_types.keys())
    active_codes = [code for code, shift in shift_types.items() if shift.is_work]
    off_codes = [code for code, shift in shift_types.items() if not shift.is_work]
    off_code = "OFF" if "OFF" in shift_types else off_codes[0]
    leave_code = "LEAVE" if "LEAVE" in shift_types else off_code
    event_assignments = build_member_event_assignments(payload, shift_types, off_code, leave_code)
    day_index = {day["date"]: idx for idx, day in enumerate(coverage)}
    rules = payload["rules"]
    requests = defaultdict(list)
    for request in payload.get("requests", []):
        requests[(request["memberId"], request["date"])].append(request)
    leaves = defaultdict(list)
    for leave in payload.get("approvedLeaves", []):
        leaves[(leave["memberId"], leave["date"])].append(leave)
    locks = {(lock["memberId"], lock["date"]): lock["shiftCode"] for lock in payload.get("locks", [])}
    previous_published = {
        (item["memberId"], item["date"]): item["shiftCode"]
        for item in payload.get("previousPublished", [])
    }
    previous_assignments = {
        member["id"]: list(member.get("previousAssignments", []))
        for member in members
    }

    def shift_var_key(member_id: int, date_str: str, shift_code: str) -> str:
        return f"x_{member_id}_{date_str}_{shift_code}"

    def incompatible_shift_pair(previous_code: str, current_code: str) -> bool:
        if previous_code not in shift_types or current_code not in shift_types:
            return False
        return rest_hours_between(shift_types[previous_code], shift_types[current_code]) < float(rules["minRestHours"])

    def build_model(variant: str) -> Tuple[Any, Dict[Tuple[int, str, str], Any], Dict[str, int]]:
        model = cp_model.CpModel()
        x: Dict[Tuple[int, str, str], Any] = {}
        stats: Dict[str, int] = {}
        objective_terms: List[Any] = []

        weights = {
            "balanced": {
                "request": int(rules["weights"]["request"]),
                "fairness": int(rules["weights"]["fairness"]),
                "night_cap": int(rules["weights"]["nightCap"]),
                "continuity": int(rules["weights"]["continuity"]),
                "inactive": 1,
                "overcoverage": 3,
            },
            "request_friendly": {
                "request": int(rules["weights"]["request"]) * 5,
                "fairness": int(rules["weights"]["fairness"]),
                "night_cap": int(rules["weights"]["nightCap"]),
                "continuity": max(1, int(rules["weights"]["continuity"]) // 2),
                "inactive": 1,
                "overcoverage": 3,
            },
            "continuity_friendly": {
                "request": int(rules["weights"]["request"]),
                "fairness": max(1, int(rules["weights"]["fairness"]) // 2),
                "night_cap": int(rules["weights"]["nightCap"]),
                "continuity": int(rules["weights"]["continuity"]) * 5,
                "inactive": 1,
                "overcoverage": 3,
            },
        }[variant]

        for member in members:
            for day in coverage:
                for shift_code in shift_codes:
                    x[(member["id"], day["date"], shift_code)] = model.NewBoolVar(
                        shift_var_key(member["id"], day["date"], shift_code)
                    )

        for member in members:
            for day in coverage:
                model.Add(
                    sum(x[(member["id"], day["date"], shift_code)] for shift_code in shift_codes) == 1
                )

        for member in members:
            if not member.get("canNight", True) and "N" in shift_types:
                for day in coverage:
                    model.Add(x[(member["id"], day["date"], "N")] == 0)

        for (member_id, date_str), leave_items in leaves.items():
            if (member_id, date_str, leave_code) in x:
                model.Add(x[(member_id, date_str, leave_code)] == 1)

        for (member_id, date_str), event_shift in event_assignments.items():
            if (member_id, date_str) in leaves:
                continue
            if (member_id, date_str, event_shift) in x:
                model.Add(x[(member_id, date_str, event_shift)] == 1)

        for (member_id, date_str), locked_shift in locks.items():
            if (member_id, date_str) in leaves or (member_id, date_str) in event_assignments:
                continue
            if (member_id, date_str, locked_shift) in x:
                model.Add(x[(member_id, date_str, locked_shift)] == 1)

        overcoverage_terms = []
        for day in coverage:
            for shift_code in active_codes:
                required = int(day["requirements"].get(shift_code, 0))
                assigned = sum(x[(member["id"], day["date"], shift_code)] for member in members)
                model.Add(assigned >= required)
                over = model.NewIntVar(0, len(members), f"over_{day['date']}_{shift_code}_{variant}")
                model.Add(assigned - required == over)
                overcoverage_terms.append(over)

        for member in members:
            member_id = member["id"]
            for index, day in enumerate(coverage):
                current_date = day["date"]
                if index > 0:
                    previous_date = coverage[index - 1]["date"]
                    for previous_code in active_codes:
                        for current_code in active_codes:
                            if incompatible_shift_pair(previous_code, current_code):
                                model.Add(
                                    x[(member_id, previous_date, previous_code)]
                                    + x[(member_id, current_date, current_code)]
                                    <= 1
                                )
                else:
                    if previous_assignments.get(member_id):
                        previous_code = previous_assignments[member_id][-1]
                        for current_code in active_codes:
                            if incompatible_shift_pair(previous_code, current_code):
                                model.Add(x[(member_id, current_date, current_code)] == 0)

            for pattern in rules.get("forbiddenPatterns", []):
                if len(pattern) != 3:
                    continue
                first_code, second_code, third_code = pattern
                if first_code not in shift_types or second_code not in shift_types or third_code not in shift_types:
                    continue
                for index in range(len(coverage) - 2):
                    model.Add(
                        x[(member_id, coverage[index]["date"], first_code)]
                        + x[(member_id, coverage[index + 1]["date"], second_code)]
                        + x[(member_id, coverage[index + 2]["date"], third_code)]
                        <= 2
                    )
                previous_tail = previous_assignments.get(member_id, [])
                if len(previous_tail) >= 2:
                    if previous_tail[-2:] == [first_code, second_code]:
                        model.Add(x[(member_id, coverage[0]["date"], third_code)] == 0)
                if len(previous_tail) >= 1 and len(coverage) >= 2:
                    if previous_tail[-1] == first_code:
                        model.Add(
                            x[(member_id, coverage[0]["date"], second_code)]
                            + x[(member_id, coverage[1]["date"], third_code)]
                            <= 1
                        )

        request_violations = []
        for (member_id, date_str), request_items in requests.items():
            acceptable_codes = [code for code in ("OFF", leave_code) if code in shift_types]
            if not acceptable_codes:
                continue
            satisfied = model.NewBoolVar(f"request_ok_{member_id}_{date_str}_{variant}")
            acceptable_sum = sum(x[(member_id, date_str, code)] for code in acceptable_codes)
            model.Add(acceptable_sum == 1).OnlyEnforceIf(satisfied)
            model.Add(acceptable_sum == 0).OnlyEnforceIf(satisfied.Not())
            violated = model.NewBoolVar(f"request_violation_{member_id}_{date_str}_{variant}")
            model.Add(violated + satisfied == 1)
            request_violations.append((violated, request_items))
            objective_terms.append(violated * weights["request"])

        continuity_changes = []
        for day in coverage:
            for member in members:
                key = (member["id"], day["date"])
                previous_shift = previous_published.get(key)
                if previous_shift not in shift_types:
                    continue
                changed = model.NewBoolVar(f"change_{member['id']}_{day['date']}_{variant}")
                model.Add(x[(member["id"], day["date"], previous_shift)] == 1).OnlyEnforceIf(changed.Not())
                model.Add(x[(member["id"], day["date"], previous_shift)] == 0).OnlyEnforceIf(changed)
                continuity_changes.append(changed)
                objective_terms.append(changed * weights["continuity"])

        night_counts = []
        weekend_counts = []
        holiday_counts = []
        night_cap_excess = []
        for member in members:
            member_id = member["id"]
            night_count = model.NewIntVar(0, len(coverage), f"night_count_{member_id}_{variant}")
            if "N" in shift_types:
                model.Add(night_count == sum(x[(member_id, day["date"], "N")] for day in coverage))
            else:
                model.Add(night_count == 0)
            night_counts.append((member, night_count))

            weekend_count = model.NewIntVar(0, len(coverage), f"weekend_count_{member_id}_{variant}")
            weekend_days = [
                day for day in coverage if day_meta[day["date"]]["isWeekend"]
            ]
            model.Add(weekend_count == sum(
                x[(member_id, day["date"], shift_code)]
                for day in weekend_days
                for shift_code in active_codes
            ))
            weekend_counts.append((member, weekend_count))

            holiday_count = model.NewIntVar(0, len(coverage), f"holiday_count_{member_id}_{variant}")
            holiday_days = [
                day for day in coverage if day_meta[day["date"]]["isHoliday"]
            ]
            model.Add(holiday_count == sum(
                x[(member_id, day["date"], shift_code)]
                for day in holiday_days
                for shift_code in active_codes
            ))
            holiday_counts.append((member, holiday_count))

            excess = model.NewIntVar(0, len(coverage), f"night_cap_excess_{member_id}_{variant}")
            model.Add(excess >= night_count - int(rules["maxNightShiftsPerMonth"]))
            objective_terms.append(excess * weights["night_cap"])
            night_cap_excess.append((member, excess))

            if "EDU" in shift_types:
                for day in coverage:
                    objective_terms.append(x[(member_id, day["date"], "EDU")] * weights["inactive"])

        def add_balance_terms(items: Sequence[Tuple[Dict[str, Any], Any]], prefix: str) -> List[Any]:
            balance_terms = []
            for left_index in range(len(items)):
                for right_index in range(left_index + 1, len(items)):
                    left_member, left_count = items[left_index]
                    right_member, right_count = items[right_index]
                    if prefix == "night" and (
                        not left_member.get("canNight", True)
                        or not right_member.get("canNight", True)
                    ):
                        continue
                    delta = model.NewIntVar(-len(coverage), len(coverage), f"{prefix}_delta_{left_index}_{right_index}_{variant}")
                    absolute = model.NewIntVar(0, len(coverage), f"{prefix}_abs_{left_index}_{right_index}_{variant}")
                    model.Add(delta == left_count - right_count)
                    model.AddAbsEquality(absolute, delta)
                    objective_terms.append(absolute * weights["fairness"])
                    balance_terms.append(absolute)
            return balance_terms

        night_balance_terms = add_balance_terms(night_counts, "night")
        weekend_balance_terms = add_balance_terms(weekend_counts, "weekend")
        holiday_balance_terms = add_balance_terms(holiday_counts, "holiday")

        if objective_terms:
            model.Minimize(sum(objective_terms))

        stats["request_violations_var_count"] = len(request_violations)
        stats["continuity_changes_var_count"] = len(continuity_changes)
        stats["night_balance_var_count"] = len(night_balance_terms)
        stats["weekend_balance_var_count"] = len(weekend_balance_terms) + len(holiday_balance_terms)
        stats["overcoverage_var_count"] = len(overcoverage_terms)

        return model, x, {
            "request_violations": request_violations,
            "continuity_changes": continuity_changes,
            "night_counts": night_counts,
            "night_cap_excess": night_cap_excess,
            "night_balance_terms": night_balance_terms,
            "weekend_balance_terms": weekend_balance_terms,
            "holiday_balance_terms": holiday_balance_terms,
            "overcoverage_terms": overcoverage_terms,
        }

    def solve_variant(variant: str) -> Optional[Dict[str, Any]]:
        model, x, metric_vars = build_model(variant)
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 15.0
        solver.parameters.num_search_workers = 8
        status = solver.Solve(model)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return None

        assignments: List[Dict[str, Any]] = []
        request_violation_count = 0
        continuity_change_count = 0
        night_cap_excess_count = 0
        night_balance_gap = 0
        weekend_balance_gap = 0
        overcoverage = 0
        violations: List[Dict[str, Any]] = []

        for member in members:
            for day in coverage:
                for shift_code in shift_codes:
                    if solver.Value(x[(member["id"], day["date"], shift_code)]):
                        assignments.append(make_assignment(member, day["date"], shift_code, team_slug))
                        if (member["id"], day["date"]) in requests and shift_code not in {"OFF", leave_code}:
                            request_violation_count += 1
                            violations.append({
                                "severity": "soft",
                                "ruleCode": "request.preferred_off",
                                "message": "희망 오프를 반영하지 못했습니다.",
                                "date": day["date"],
                                "memberId": member["id"],
                                "details": {"assigned": shift_code},
                            })
                        break

        for changed in metric_vars["continuity_changes"]:
            continuity_change_count += solver.Value(changed)
        for _, excess in metric_vars["night_cap_excess"]:
            extra = solver.Value(excess)
            night_cap_excess_count += extra
        for term in metric_vars["night_balance_terms"]:
            night_balance_gap += solver.Value(term)
        for term in metric_vars["weekend_balance_terms"]:
            weekend_balance_gap += solver.Value(term)
        for term in metric_vars["holiday_balance_terms"]:
            weekend_balance_gap += solver.Value(term)
        for term in metric_vars["overcoverage_terms"]:
            overcoverage += solver.Value(term)

        for member, excess in metric_vars["night_cap_excess"]:
            extra = solver.Value(excess)
            if extra:
                violations.append({
                    "severity": "soft",
                    "ruleCode": "night.max_monthly",
                    "message": "월간 야간 상한을 초과했습니다.",
                    "memberId": member["id"],
                    "details": {"extraNights": extra},
                })

        stats = {
            "request_violations": request_violation_count,
            "night_cap_excess": night_cap_excess_count,
            "continuity_changes": continuity_change_count,
            "night_balance_gap": night_balance_gap,
            "weekend_balance_gap": weekend_balance_gap,
            "overcoverage": overcoverage,
        }
        total_score = (
            stats["request_violations"]
            + stats["night_cap_excess"] * int(rules["weights"]["nightCap"])
            + stats["continuity_changes"] * int(rules["weights"]["continuity"])
            + stats["night_balance_gap"] * int(rules["weights"]["fairness"])
            + stats["weekend_balance_gap"] * int(rules["weights"]["fairness"])
            + stats["overcoverage"] * 3
        )
        return {
            "candidateKey": variant,
            "rank": 0,
            "score": {"total": total_score, **stats},
            "explanation": build_explanation(variant, team["name"], stats),
            "assignments": assignments,
            "violations": violations,
        }

    candidates = []
    for variant in payload.get("variants", ["balanced"]):
        solved = solve_variant(variant)
        if solved:
            candidates.append(solved)

    if not candidates:
        return {
            "status": "infeasible",
            "engine": "ortools-cp-sat",
            "reasons": [
                "필수 커버리지와 휴가, 고정 배치를 동시에 만족하는 해를 찾지 못했습니다.",
            ],
            "suggestions": [
                "희망 오프를 일부 완화하세요.",
                "고정 배치를 줄이거나 야간 가능 인력을 추가하세요.",
                "필요 인원 템플릿을 재확인하세요.",
            ],
            "summary": {"candidateCount": 0},
        }

    candidates.sort(key=lambda item: int(item["score"]["total"]))
    for index, candidate in enumerate(candidates, start=1):
        candidate["rank"] = index

    return {
        "status": "completed",
        "engine": "ortools-cp-sat",
        "selectedCandidateKey": candidates[0]["candidateKey"],
        "candidates": candidates,
        "summary": {
            "candidateCount": len(candidates),
            "selectedCandidateKey": candidates[0]["candidateKey"],
        },
    }


def main() -> None:
    payload = parse_payload()
    if cp_model is None:
        result = solve_with_fallback(payload)
    else:
        result = solve_with_cp_sat(payload)
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # pragma: no cover - surfaced to caller
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        raise
