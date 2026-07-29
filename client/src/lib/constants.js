export const VENDOR_STATUS = {
  PENDING_REVIEW: { label: 'Pending Review', color: 'warning', icon: 'clock' },
  APPROVED: { label: 'Approved', color: 'success', icon: 'check-circle' },
  FLAGGED: { label: 'Flagged', color: 'danger', icon: 'alert-triangle' },
  REJECTED: { label: 'Rejected', color: 'danger', icon: 'x-circle' },
  EXPIRED: { label: 'Expired', color: 'surface', icon: 'archive' },
};

export const DOCUMENT_STATUS = {
  UPLOADED: { label: 'Uploaded', color: 'info' },
  PROCESSING: { label: 'Processing', color: 'warning' },
  PARSED: { label: 'Parsed', color: 'primary' },
  COMPLIANCE_CHECK: { label: 'Checking Compliance', color: 'warning' },
  COMPLETED: { label: 'Completed', color: 'success' },
  FAILED: { label: 'Failed', color: 'danger' },
};

export const DOCUMENT_TYPES = {
  INSURANCE_CERTIFICATE: 'Insurance Certificate',
  TAX_FORM_W9: 'Tax Form (W-9)',
  TAX_FORM_W8: 'Tax Form (W-8)',
  BUSINESS_LICENSE: 'Business License',
  NDA: 'Non-Disclosure Agreement',
  CONTRACT: 'Contract',
  OTHER: 'Other',
};

export const RISK_LEVELS = {
  LOW: { label: 'Low Risk', min: 0, max: 30, color: '#22c55e' },
  MEDIUM: { label: 'Medium Risk', min: 31, max: 60, color: '#f59e0b' },
  HIGH: { label: 'High Risk', min: 61, max: 80, color: '#f97316' },
  CRITICAL: { label: 'Critical Risk', min: 81, max: 100, color: '#ef4444' },
};
