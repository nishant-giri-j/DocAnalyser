import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { PageLoader } from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import RiskGauge from '../components/ui/RiskGauge';
import DocumentTypeIcon from '../components/ui/DocumentTypeIcon';
import { toast } from 'react-hot-toast';
import { HiOutlineDocumentText, HiOutlineCalendar, HiOutlineCpuChip, HiExclamationTriangle } from 'react-icons/hi2';

const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchDocument = async () => {
    try {
      const response = await api.get(`/documents/${id}`);
      setDoc(response.data);
    } catch (error) {
      toast.error('Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await toast.promise(
        api.post(`/documents/${id}/process`),
        {
          loading: 'Processing document with AI...',
          success: 'Document processed successfully!',
          error: 'Failed to process document',
        }
      );
      await fetchDocument();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const formatKey = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/_/g, ' ');
  };

  if (loading) return <PageLoader />;
  if (!doc) return <div className="p-8 text-center text-text-secondary">Document not found</div>;

  const showProcessingData = ['PARSED', 'COMPLETED', 'FAILED'].includes(doc.status);

  return (
    <div className="section-fade space-y-8 animate-in">
      {/* Header Section */}
      <div className="glass-card p-8 flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-4 flex-1">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <DocumentTypeIcon type={doc.type} className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-medium text-text-primary break-all">
                {doc.fileName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                <StatusBadge status={doc.status} />
                <span className="flex items-center gap-1.5">
                  <HiOutlineCalendar className="w-4 h-4" />
                  Uploaded {new Date(doc.createdAt).toLocaleString()}
                </span>
                {doc.vendorId && (
                  <button 
                    onClick={() => navigate(`/vendors/${doc.vendorId}`)}
                    className="hover:text-primary transition-colors underline decoration-border underline-offset-4"
                  >
                    View Vendor
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {doc.status === 'UPLOADED' && (
            <div className="pt-4">
              <button
                onClick={handleProcess}
                disabled={processing}
                className="btn-primary inline-flex items-center gap-2"
              >
                <HiOutlineCpuChip className="w-5 h-5" />
                {processing ? 'Processing...' : 'Process Document with AI'}
              </button>
            </div>
          )}
        </div>

        <div className="w-full md:w-auto shrink-0 bg-background/50 p-6 rounded-2xl border border-border/50 flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">Risk Score</span>
          <RiskGauge score={doc.riskScore || 0} size="md" />
        </div>
      </div>

      {/* Extracted Data & Compliance Section */}
      {showProcessingData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 stagger-children">
          {/* Extracted Data */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-medium text-text-primary flex items-center gap-2">
              <HiOutlineDocumentText className="w-5 h-5 text-primary" />
              Extracted Data
            </h2>
            <div className="glass-card p-6">
              {doc.extractedEntities && Object.keys(doc.extractedEntities).length > 0 ? (
                <div className="divide-y divide-border/50">
                  {Object.entries(doc.extractedEntities).map(([key, value]) => (
                    <div key={key} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                      <span className="text-sm font-medium text-text-secondary w-1/3 shrink-0">
                        {formatKey(key)}
                      </span>
                      <span className="text-sm text-text-primary font-mono text-right break-words">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-text-tertiary text-sm">
                  No entities extracted.
                </div>
              )}
            </div>
          </div>

          {/* Compliance Results */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-medium text-text-primary flex items-center gap-2">
              <HiExclamationTriangle className="w-5 h-5 text-amber-500" />
              Compliance Results
            </h2>
            <div className="space-y-4">
              {doc.complianceNotes && (
                <div className="glass-card p-5 border-l-4 border-l-primary/50">
                  <h3 className="text-sm font-medium text-text-primary mb-2">Summary</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {doc.complianceNotes}
                  </p>
                </div>
              )}

              {doc.riskFactors && doc.riskFactors.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider ml-1">Detected Risks</h3>
                  {doc.riskFactors.map((risk, index) => (
                    <div key={index} className="glass-card p-4 border-l-4 border-l-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-colors">
                      <div className="flex items-start gap-3">
                        <HiExclamationTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {risk.title || 'Compliance Violation'}
                          </p>
                          <p className="text-sm text-text-secondary mt-1">
                            {risk.description || (typeof risk === 'string' ? risk : JSON.stringify(risk))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                doc.status === 'COMPLETED' && (
                  <div className="glass-card p-6 flex flex-col items-center justify-center text-center gap-2 border-l-4 border-l-emerald-500 bg-emerald-500/5">
                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">✓</span>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">No immediate risks detected</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDetail;
