import os
import time
import shutil
import logging
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.models import (
    HealthResponse,
    DocumentType,
    ParsedDocument,
    ComplianceCheckRequest,
    ComplianceResult,
)
from app.services.document_parser import document_parser
from app.services.compliance_engine import compliance_engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.upload_dir, exist_ok=True)
    logger.info("="* 60)
    logger.info("AI Document Parser service starting...")
    logger.info(f"OpenAI API Key configured: {bool(settings.openai_api_key)}")
    logger.info(f"Upload directory: {os.path.abspath(settings.upload_dir)}")
    logger.info(f"Max file size: {settings.max_file_size_mb} MB")
    logger.info("="* 60)
    yield
    # Shutdown
    logger.info("AI Document Parser service shutting down...")


app = FastAPI(
    title="Vendor Compliance AI Parser",
    description="AI-powered document parsing and compliance checking microservice",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health and configuration status."""
    return HealthResponse(
        status="ok",
        timestamp=datetime.utcnow().isoformat(),
        openai_configured=bool(settings.openai_api_key),
    )


@app.post("/api/parse")
async def parse_document(
    file: UploadFile = File(...),
    document_type: str = Form("OTHER"),
):
    """Parse an uploaded document and extract structured entities.

    Accepts a file upload and optional document_type form field.
    Returns extracted entities, raw text, summary, and processing metadata.
    """
    start_time = time.time()
    logger.info(f"Parse request received: {file.filename} (type: {document_type})")

    # Validate file size
    max_size = settings.max_file_size_mb * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_file_size_mb} MB.",
        )

    # Save file temporarily
    temp_path = os.path.join(settings.upload_dir, f"temp_{int(time.time())}_{file.filename}")
    try:
        with open(temp_path, "wb") as f:
            f.write(contents)

        # Resolve document type enum
        try:
            doc_type = DocumentType(document_type)
        except ValueError:
            doc_type = DocumentType.OTHER

        # Extract text from document
        mime_type = file.content_type or "application/octet-stream"
        raw_text = await document_parser.extract_text(temp_path, mime_type)

        # Parse with LLM
        result: ParsedDocument = await document_parser.parse(raw_text, doc_type)

        processing_time = (time.time() - start_time) * 1000

        # Build response matching what the Node.js backend expects
        entities_dict = {}
        entities_list = []
        for entity in result.entities:
            entities_dict[entity.field_name] = entity.value
            entities_list.append({
                "field_name": entity.field_name,
                "value": entity.value,
                "confidence": entity.confidence,
                "source_text": entity.source_text,
            })

        response = {
            "success": True,
            "parsedData": {
                "document_type": result.document_type.value,
                "entities": entities_list,
                "raw_text": result.raw_text,
                "summary": result.summary,
                "metadata": result.metadata,
            },
            "extractedEntities": entities_dict,
            "entities": entities_list,
            "summary": result.summary,
            "processing_time_ms": round(processing_time, 2),
        }

        logger.info(f"Parse complete: {len(result.entities)} entities extracted in {processing_time:.0f}ms")
        return response

    except ValueError as e:
        logger.error(f"Parsing error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during parsing: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error during document parsing: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.post("/api/compliance-check")
async def check_compliance(
    request: ComplianceCheckRequest = Body(...),
):
    """Check parsed document data against compliance rules.

    Accepts parsed data (entities) and a list of compliance rules.
    Returns compliance result with violations, risk score, and summary.
    """
    logger.info(f"Compliance check request: {len(request.rules)} rules")

    try:
        result: ComplianceResult = compliance_engine.evaluate(
            parsed_data=request.parsed_data,
            rules=request.rules,
        )

        # Build response matching what the Node.js backend expects
        response = {
            "success": True,
            "is_compliant": result.is_compliant,
            "riskScore": result.risk_score,
            "risk_score": result.risk_score,
            "violations": [
                {
                    "rule_name": v.rule_name,
                    "field": v.field,
                    "expected": v.expected,
                    "actual": v.actual,
                    "severity": v.severity,
                    "message": v.message,
                }
                for v in result.violations
            ],
            "riskFactors": [
                {
                    "rule_name": v.rule_name,
                    "field": v.field,
                    "severity": v.severity,
                    "message": v.message,
                }
                for v in result.violations
            ],
            "passed_rules": result.passed_rules,
            "complianceNotes": result.summary,
            "summary": result.summary,
        }

        logger.info(f"Compliance check complete: score={result.risk_score}, compliant={result.is_compliant}")
        return response

    except Exception as e:
        logger.error(f"Compliance check error: {e}")
        raise HTTPException(status_code=500, detail=f"Compliance check failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.ai_service_host,
        port=settings.ai_service_port,
        reload=True,
    )
