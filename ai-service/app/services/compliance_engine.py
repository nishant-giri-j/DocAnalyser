"""Compliance rule engine for validating parsed document data.

Evaluates extracted document entities against configurable compliance rules
and computes a weighted risk score.
"""

import logging
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple

from app.models import ComplianceResult, ComplianceViolation

logger = logging.getLogger(__name__)

# Severity weights for risk score calculation
SEVERITY_WEIGHTS = {
    "LOW": 5,
    "MEDIUM": 15,
    "HIGH": 30,
    "CRITICAL": 50,
}


class ComplianceEngine:
    """Evaluates parsed document data against compliance rules and computes risk scores."""

    def evaluate(self, parsed_data: Dict[str, Any], rules: List[Dict[str, Any]]) -> ComplianceResult:
        """Run all compliance rules against parsed data and compute a risk score.

        Args:
            parsed_data: Dict of field_name -> value from the document parser.
                         Can also contain an 'entities' key with a list of ExtractedEntity dicts.
            rules: List of compliance rule dicts from the database.

        Returns:
            ComplianceResult with violations, passed rules, risk score, and summary.
        """
        # Normalize parsed_data: extract entities into a flat field->value map
        entity_map = self._normalize_parsed_data(parsed_data)

        violations: List[ComplianceViolation] = []
        passed_rules: List[str] = []
        skipped_rules: List[str] = []

        active_rules = [r for r in rules if r.get("isActive", True)]

        for rule in active_rules:
            field = rule.get("field", "")
            operator = rule.get("operator", "")
            expected_value = rule.get("value", "")
            severity = rule.get("severity", "MEDIUM")
            rule_name = rule.get("name", "Unnamed Rule")

            actual_value = entity_map.get(field)

            try:
                is_pass, message = self._evaluate_rule(
                    field=field,
                    operator=operator,
                    expected=expected_value,
                    actual=actual_value,
                )

                if is_pass:
                    passed_rules.append(rule_name)
                else:
                    violations.append(ComplianceViolation(
                        rule_name=rule_name,
                        field=field,
                        expected=str(expected_value),
                        actual=str(actual_value) if actual_value is not None else None,
                        severity=severity,
                        message=message,
                    ))
            except Exception as e:
                logger.warning(f"Error evaluating rule '{rule_name}': {e}")
                skipped_rules.append(rule_name)

        # Calculate risk score
        risk_score = self._calculate_risk_score(violations, len(active_rules))

        # Determine overall compliance
        has_critical = any(v.severity == "CRITICAL" for v in violations)
        has_high = any(v.severity == "HIGH" for v in violations)
        is_compliant = len(violations) == 0

        # Build summary
        summary = self._build_summary(
            total_rules=len(active_rules),
            passed=len(passed_rules),
            failed=len(violations),
            skipped=len(skipped_rules),
            risk_score=risk_score,
            has_critical=has_critical,
        )

        return ComplianceResult(
            is_compliant=is_compliant,
            risk_score=round(risk_score, 1),
            violations=violations,
            passed_rules=passed_rules,
            summary=summary,
        )

    def _normalize_parsed_data(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Flatten parsed data into a field_name -> value map."""
        entity_map: Dict[str, Any] = {}

        # If the parsed_data has an 'entities' list of ExtractedEntity-like dicts
        entities = parsed_data.get("entities", [])
        if isinstance(entities, list):
            for entity in entities:
                if isinstance(entity, dict) and "field_name" in entity:
                    entity_map[entity["field_name"]] = entity.get("value")

        # Also include top-level keys (except 'entities', 'raw_text', 'metadata', 'summary')
        skip_keys = {"entities", "raw_text", "metadata", "summary", "processing_time_ms", "document_type"}
        for key, value in parsed_data.items():
            if key not in skip_keys and key not in entity_map:
                entity_map[key] = value

        return entity_map

    def _evaluate_rule(
        self, field: str, operator: str, expected: str, actual: Any
    ) -> Tuple[bool, str]:
        """Evaluate a single rule against the actual value.

        Returns:
            Tuple of (passed: bool, message: str)
        """
        # EXISTS operator - just check if the field has a value
        if operator == "EXISTS":
            if actual is not None and actual != "" and actual != "null":
                return True, f"Field '{field}' exists"
            else:
                return False, f"Required field '{field}' is missing or empty"

        # For all other operators, check if actual value is present
        if actual is None or actual == "" or actual == "null":
            return False, f"Field '{field}' is missing — cannot evaluate rule"

        # CONTAINS / NOT_CONTAINS (string operations)
        if operator == "CONTAINS":
            if expected.lower() in str(actual).lower():
                return True, f"Field '{field}' contains '{expected}'"
            return False, f"Field '{field}' does not contain '{expected}'. Actual: '{actual}'"

        if operator == "NOT_CONTAINS":
            if expected.lower() not in str(actual).lower():
                return True, f"Field '{field}' does not contain '{expected}'"
            return False, f"Field '{field}' contains '{expected}' but should not. Actual: '{actual}'"

        # EQUALS / NOT_EQUALS
        if operator == "EQUALS":
            if str(actual).lower().strip() == str(expected).lower().strip():
                return True, f"Field '{field}' equals '{expected}'"
            return False, f"Field '{field}' expected '{expected}', got '{actual}'"

        if operator == "NOT_EQUALS":
            if str(actual).lower().strip() != str(expected).lower().strip():
                return True, f"Field '{field}' is not '{expected}'"
            return False, f"Field '{field}' should not equal '{expected}'"

        # NUMERIC comparisons: GREATER_THAN, LESS_THAN
        if operator in ("GREATER_THAN", "LESS_THAN"):
            try:
                actual_num = self._parse_number(actual)
                expected_num = self._parse_number(expected)

                if operator == "GREATER_THAN":
                    if actual_num > expected_num:
                        return True, f"Field '{field}' ({actual_num}) > {expected_num}"
                    return False, f"Field '{field}' ({actual_num}) must be > {expected_num}"

                if operator == "LESS_THAN":
                    if actual_num < expected_num:
                        return True, f"Field '{field}' ({actual_num}) < {expected_num}"
                    return False, f"Field '{field}' ({actual_num}) must be < {expected_num}"

            except (ValueError, TypeError) as e:
                return False, f"Cannot compare '{field}': not a valid number. Actual='{actual}', Expected='{expected}'"

        # DATE comparisons: BEFORE_DATE, AFTER_DATE
        if operator in ("BEFORE_DATE", "AFTER_DATE"):
            try:
                actual_date = self._parse_date(actual)
                expected_date = self._parse_date(expected)

                if actual_date is None or expected_date is None:
                    return False, f"Cannot parse date for field '{field}'. Actual='{actual}', Expected='{expected}'"

                if operator == "AFTER_DATE":
                    if actual_date > expected_date:
                        return True, f"Date '{field}' ({actual_date}) is after {expected_date}"
                    return False, f"Date '{field}' ({actual_date}) must be after {expected_date}"

                if operator == "BEFORE_DATE":
                    if actual_date < expected_date:
                        return True, f"Date '{field}' ({actual_date}) is before {expected_date}"
                    return False, f"Date '{field}' ({actual_date}) must be before {expected_date}"

            except Exception as e:
                return False, f"Date comparison error for '{field}': {e}"

        return False, f"Unknown operator '{operator}' for field '{field}'"

    def _parse_number(self, value: Any) -> float:
        """Parse a value into a number, handling common formats."""
        if isinstance(value, (int, float)):
            return float(value)
        s = str(value).replace(",", "").replace("$", "").replace(" ", "").strip()
        return float(s)

    def _parse_date(self, value: Any) -> Optional[date]:
        """Parse a value into a date, trying multiple formats."""
        if isinstance(value, date):
            return value
        if isinstance(value, datetime):
            return value.date()

        s = str(value).strip()
        formats = [
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%m-%d-%Y",
            "%d/%m/%Y",
            "%Y/%m/%d",
            "%B %d, %Y",
            "%b %d, %Y",
            "%d %B %Y",
            "%d %b %Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue

        # Try ISO format as last resort
        try:
            return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
        except (ValueError, TypeError):
            return None

    def _calculate_risk_score(self, violations: List[ComplianceViolation], total_rules: int) -> float:
        """Calculate a weighted risk score from 0 to 100.

        The score is based on:
        1. Severity-weighted violation points
        2. Percentage of rules that failed
        """
        if total_rules == 0:
            return 0.0

        # Calculate weighted violation points
        total_weight = sum(
            SEVERITY_WEIGHTS.get(v.severity, SEVERITY_WEIGHTS["MEDIUM"])
            for v in violations
        )

        # Max possible weight if all rules were CRITICAL violations
        max_weight = total_rules * SEVERITY_WEIGHTS["CRITICAL"]

        # Weighted score component (0-70 points)
        weighted_score = (total_weight / max_weight) * 70 if max_weight > 0 else 0

        # Failure ratio component (0-30 points)
        failure_ratio = len(violations) / total_rules
        ratio_score = failure_ratio * 30

        risk_score = weighted_score + ratio_score

        return min(risk_score, 100.0)

    def _build_summary(self, total_rules: int, passed: int, failed: int, skipped: int, risk_score: float, has_critical: bool) -> str:
        """Build a human-readable compliance summary."""
        parts = []

        if failed == 0 and total_rules > 0:
            parts.append(f"All {total_rules} compliance rules passed.")
        elif total_rules == 0:
            parts.append("No compliance rules configured for evaluation.")
        else:
            parts.append(f"{failed} of {total_rules} compliance rules failed.")
            parts.append(f"{passed} rules passed.")

        if skipped > 0:
            parts.append(f"{skipped} rules could not be evaluated.")

        if risk_score <= 30:
            parts.append(f"Risk Level: LOW ({risk_score:.1f}/100).")
        elif risk_score <= 60:
            parts.append(f"Risk Level: MEDIUM ({risk_score:.1f}/100).")
        elif risk_score <= 80:
            parts.append(f"Risk Level: HIGH ({risk_score:.1f}/100).")
        else:
            parts.append(f"Risk Level: CRITICAL ({risk_score:.1f}/100).")

        if has_critical:
            parts.append("⚠ CRITICAL violations detected — immediate review required.")

        return " ".join(parts)


# Module-level singleton
compliance_engine = ComplianceEngine()
