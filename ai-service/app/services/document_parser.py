"""Document parsing service using LangChain and OpenAI.

Extracts text from documents and uses GPT to identify structured entities.
"""

import os
import json
import time
import logging
from typing import Optional, List, Dict, Any

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models import DocumentType, ParsedDocument, ExtractedEntity

logger = logging.getLogger(__name__)
settings = get_settings()


# --- Pydantic schema for LLM output parsing ---
class LLMExtractionResult(BaseModel):
    """Schema the LLM must return."""
    document_type_detected: str = Field(description="The detected document type")
    entities: List[Dict[str, Any]] = Field(description="List of extracted entities, each with field_name, value, and confidence (0.0-1.0)")
    summary: str = Field(description="A brief summary of the document contents")


# --- Prompt templates per document type ---
INSURANCE_FIELDS = """
Extract these specific fields:
- legal_name: The insured party's full legal name
- insurance_provider: The insurance company name
- policy_number: The policy or certificate number
- coverage_type: Type of coverage (e.g., General Liability, Workers Comp, Auto)
- coverage_limit: The total coverage limit amount in USD
- per_occurrence_limit: Per-occurrence limit in USD (if present)
- aggregate_limit: Aggregate limit in USD (if present)  
- effective_date: Policy effective/start date (ISO 8601 format YYYY-MM-DD)
- expiration_date: Policy expiration/end date (ISO 8601 format YYYY-MM-DD)
- additional_insured: Whether additional insured is included (true/false)
- certificate_holder: Name of the certificate holder
- deductible: Deductible amount if mentioned
"""

TAX_W9_FIELDS = """
Extract these specific fields:
- legal_name: The individual or business legal name
- business_name: Business name / DBA if different from legal name
- tax_classification: Federal tax classification (Individual, C Corporation, S Corporation, Partnership, LLC, etc.)
- tax_id_type: Type of tax ID (SSN or EIN)
- tax_id_last_four: Last 4 digits of SSN or EIN only (for security)
- address: Full mailing address
- city: City
- state: State
- zip_code: ZIP code
- exempt_payee: Whether exempt payee (true/false)
- fatca_reporting: FATCA reporting code if applicable
- signature_present: Whether the form is signed (true/false)
- signature_date: Date signed (ISO 8601 format YYYY-MM-DD)
"""

TAX_W8_FIELDS = """
Extract these specific fields:
- legal_name: Name of individual or organization
- country_of_citizenship: Country of citizenship or incorporation
- permanent_residence_address: Permanent residence address
- mailing_address: Mailing address if different
- tax_id_type: Type of tax ID (US TIN, Foreign TIN)
- tax_id_last_four: Last 4 digits of tax ID (for security)
- reference_numbers: Any reference numbers
- date_of_birth: Date of birth (ISO 8601)
- treaty_country: Tax treaty country claimed
- treaty_article: Treaty article number
- withholding_rate: Claimed withholding rate percentage
- signature_present: Whether the form is signed (true/false)
- signature_date: Date signed (ISO 8601 format YYYY-MM-DD)
"""

BUSINESS_LICENSE_FIELDS = """
Extract these specific fields:
- business_name: Registered business name
- license_number: License or permit number
- license_type: Type of license (Business, Professional, Trade, etc.)
- issuing_authority: Government body that issued the license
- issue_date: Date license was issued (ISO 8601)
- expiration_date: Date license expires (ISO 8601)
- business_address: Business address on the license
- owner_name: Business owner or authorized person name
- status: Current status (Active, Expired, Suspended)
"""

GENERIC_FIELDS = """
Extract any identifiable fields including but not limited to:
- legal_name: Any legal name or party name
- document_date: Date of the document
- expiration_date: Any expiration date
- reference_number: Any reference, policy, or ID number
- amounts: Any monetary amounts mentioned
- parties: All parties mentioned in the document
- key_terms: Important terms or conditions
- effective_date: When the document becomes effective
- signatures: Whether signatures are present
"""

FIELD_MAP = {
    DocumentType.INSURANCE_CERTIFICATE: INSURANCE_FIELDS,
    DocumentType.TAX_FORM_W9: TAX_W9_FIELDS,
    DocumentType.TAX_FORM_W8: TAX_W8_FIELDS,
    DocumentType.BUSINESS_LICENSE: BUSINESS_LICENSE_FIELDS,
    DocumentType.NDA: GENERIC_FIELDS,
    DocumentType.CONTRACT: GENERIC_FIELDS,
    DocumentType.OTHER: GENERIC_FIELDS,
}


BASE_PROMPT = """You are an expert document analyst specializing in vendor compliance documents.
You must extract structured data from the following document text.

Document type: {document_type}

{field_instructions}

Rules:
1. For each field, provide your confidence level (0.0 to 1.0) in the extraction accuracy.
2. If a field is not found in the document, set its value to null and confidence to 0.0.
3. Dates must be in ISO 8601 format (YYYY-MM-DD). If only month/year, use the first of the month.
4. Monetary amounts should be numeric without currency symbols or commas.
5. Provide a brief summary of the document.

Return your response as valid JSON matching this exact schema:
{format_instructions}

--- DOCUMENT TEXT START ---
{document_text}
--- DOCUMENT TEXT END ---
"""


class DocumentParser:
    """Handles document text extraction and LLM-based entity extraction."""

    def __init__(self):
        if settings.openai_api_key:
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0,
                api_key=settings.openai_api_key,
                max_tokens=4096,
            )
        else:
            self.llm = None
            logger.warning("OpenAI API key not configured. LLM parsing will not be available.")

    async def extract_text(self, file_path: str, mime_type: str) -> str:
        """Extract raw text from an uploaded document file."""
        logger.info(f"Extracting text from {file_path} (type: {mime_type})")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        text = ""

        if mime_type == "application/pdf":
            text = self._extract_from_pdf(file_path)
        elif mime_type in ("image/jpeg", "image/png", "image/jpg"):
            text = self._extract_from_image(file_path)
        elif mime_type == "text/plain":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        elif mime_type in (
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ):
            text = self._extract_from_docx(file_path)
        else:
            # Attempt to read as text as a fallback
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
            except Exception:
                raise ValueError(f"Unsupported file type: {mime_type}")

        if not text or not text.strip():
            raise ValueError("No text could be extracted from the document")

        logger.info(f"Extracted {len(text)} characters from document")
        return text.strip()

    def _extract_from_pdf(self, file_path: str) -> str:
        """Extract text from a PDF file using PyPDF2."""
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(file_path)
            pages = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    pages.append(page_text)
            return "\n\n".join(pages)
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            raise ValueError(f"Failed to extract text from PDF: {e}")

    def _extract_from_image(self, file_path: str) -> str:
        """Extract text from an image using OCR (pytesseract)."""
        try:
            import pytesseract
            from PIL import Image
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
            return text
        except ImportError:
            logger.warning("pytesseract not available, returning placeholder for image")
            return "[IMAGE FILE - OCR not available. Install tesseract to enable image text extraction.]"
        except Exception as e:
            logger.error(f"Image OCR error: {e}")
            raise ValueError(f"Failed to extract text from image: {e}")

    def _extract_from_docx(self, file_path: str) -> str:
        """Extract text from a DOCX file."""
        try:
            import zipfile
            import xml.etree.ElementTree as ET

            with zipfile.ZipFile(file_path, "r") as z:
                if "word/document.xml" not in z.namelist():
                    raise ValueError("Invalid DOCX file")
                with z.open("word/document.xml") as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                    # Define namespace
                    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                    paragraphs = []
                    for p in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                        texts = []
                        for t in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"):
                            if t.text:
                                texts.append(t.text)
                        if texts:
                            paragraphs.append("".join(texts))
                    return "\n".join(paragraphs)
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            raise ValueError(f"Failed to extract text from DOCX: {e}")

    async def parse(self, text: str, document_type: DocumentType) -> ParsedDocument:
        """Use LLM to extract structured entities from document text."""
        start_time = time.time()

        if not self.llm:
            # Return a fallback result with no LLM
            logger.warning("LLM not available, returning basic extraction")
            return ParsedDocument(
                document_type=document_type,
                entities=[],
                raw_text=text[:5000],
                summary="LLM not configured. Raw text extracted but no entity extraction performed.",
                metadata={"llm_available": False},
                processing_time_ms=0,
            )

        # Truncate very long documents for the LLM context window
        max_chars = 15000
        truncated_text = text[:max_chars]
        if len(text) > max_chars:
            truncated_text += f"\n\n[... truncated, {len(text) - max_chars} characters omitted ...]"

        field_instructions = FIELD_MAP.get(document_type, GENERIC_FIELDS)

        parser = PydanticOutputParser(pydantic_object=LLMExtractionResult)

        prompt = ChatPromptTemplate.from_template(BASE_PROMPT)
        chain = prompt | self.llm

        try:
            response = await chain.ainvoke({
                "document_type": document_type.value,
                "field_instructions": field_instructions,
                "format_instructions": parser.get_format_instructions(),
                "document_text": truncated_text,
            })

            # Parse the LLM response
            content = response.content
            # Try to extract JSON from the response
            extraction = self._parse_llm_response(content)

            # Build ExtractedEntity list
            entities = []
            for entity_data in extraction.get("entities", []):
                entities.append(ExtractedEntity(
                    field_name=entity_data.get("field_name", "unknown"),
                    value=entity_data.get("value"),
                    confidence=min(max(float(entity_data.get("confidence", 0.5)), 0.0), 1.0),
                    source_text=entity_data.get("source_text"),
                ))

            processing_time = (time.time() - start_time) * 1000

            return ParsedDocument(
                document_type=document_type,
                entities=entities,
                raw_text=text[:5000],
                summary=extraction.get("summary", "Document parsed successfully."),
                metadata={
                    "llm_model": "gpt-4o-mini",
                    "detected_type": extraction.get("document_type_detected", document_type.value),
                    "entity_count": len(entities),
                    "text_length": len(text),
                    "was_truncated": len(text) > max_chars,
                },
                processing_time_ms=round(processing_time, 2),
            )

        except Exception as e:
            logger.error(f"LLM parsing error: {e}")
            processing_time = (time.time() - start_time) * 1000
            return ParsedDocument(
                document_type=document_type,
                entities=[],
                raw_text=text[:5000],
                summary=f"Error during LLM parsing: {str(e)}",
                metadata={"error": str(e), "llm_model": "gpt-4o-mini"},
                processing_time_ms=round(processing_time, 2),
            )

    def _parse_llm_response(self, content: str) -> dict:
        """Parse the LLM's text response into a dictionary, handling markdown code blocks."""
        # Strip markdown code block wrappers if present
        cleaned = content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to find JSON object in the response
            start_idx = cleaned.find("{")
            end_idx = cleaned.rfind("}")
            if start_idx != -1 and end_idx != -1:
                try:
                    return json.loads(cleaned[start_idx:end_idx + 1])
                except json.JSONDecodeError:
                    pass
            logger.error(f"Could not parse LLM response as JSON: {content[:500]}")
            return {"entities": [], "summary": "Failed to parse LLM response", "document_type_detected": "UNKNOWN"}


# Module-level singleton
document_parser = DocumentParser()
