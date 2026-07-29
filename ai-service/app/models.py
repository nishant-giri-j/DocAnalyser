from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DocumentType(str, Enum):
    INSURANCE_CERTIFICATE = "INSURANCE_CERTIFICATE"
    TAX_FORM_W9 = "TAX_FORM_W9"
    TAX_FORM_W8 = "TAX_FORM_W8"
    BUSINESS_LICENSE = "BUSINESS_LICENSE"
    NDA = "NDA"
    CONTRACT = "CONTRACT"
    OTHER = "OTHER"


class ExtractedEntity(BaseModel):
    field_name: str
    value: Any
    confidence: float = Field(ge=0.0, le=1.0)
    source_text: Optional[str] = None


class ParsedDocument(BaseModel):
    document_type: DocumentType
    entities: List[ExtractedEntity]
    raw_text: Optional[str] = None
    summary: Optional[str] = None
    metadata: Dict[str, Any] = {}
    processing_time_ms: float = 0


class ComplianceCheckRequest(BaseModel):
    parsed_data: Dict[str, Any]
    rules: List[Dict[str, Any]]


class ComplianceViolation(BaseModel):
    rule_name: str
    field: str
    expected: str
    actual: Optional[str] = None
    severity: str = "MEDIUM"
    message: str


class ComplianceResult(BaseModel):
    is_compliant: bool
    risk_score: float = Field(ge=0.0, le=100.0)
    violations: List[ComplianceViolation] = []
    passed_rules: List[str] = []
    summary: str = ""


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    service: str = "ai-document-parser"
    openai_configured: bool = False
