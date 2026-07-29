import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PageLoader } from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import RiskGauge from '../components/ui/RiskGauge';
import DocumentTypeIcon from '../components/ui/DocumentTypeIcon';
import { toast } from 'react-hot-toast';
import { HiOutlineMail, HiOutlinePhone, HiOutlineOfficeBuilding } from 'react-icons/hi';

const VendorDetail = () => {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const response = await api.get(`/api/vendors/${id}`);
        setVendor(response.data);
      } catch (error) {
        toast.error('Failed to load vendor details');
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!vendor) return <div className="p-8 text-center text-text-secondary">Vendor not found</div>;

  return (
    <div className="section-fade space-y-8 animate-in">
      <div className="glass-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-display font-semibold text-text-primary tracking-tight">
              {vendor.name}
            </h1>
            <div className="mt-2 flex items-center space-x-3 text-sm text-text-secondary">
              <span className="flex items-center gap-1.5">
                <HiOutlineOfficeBuilding className="w-4 h-4" />
                {vendor.category || 'General'}
              </span>
              <span>&bull;</span>
              <StatusBadge status={vendor.status} />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 text-sm text-text-secondary">
            {vendor.email && (
              <div className="flex items-center gap-2">
                <HiOutlineMail className="w-4 h-4" />
                <a href={`mailto:${vendor.email}`} className="hover:text-primary transition-colors">
                  {vendor.email}
                </a>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2">
                <HiOutlinePhone className="w-4 h-4" />
                <a href={`tel:${vendor.phone}`} className="hover:text-primary transition-colors">
                  {vendor.phone}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-auto flex justify-center bg-background/50 p-6 rounded-2xl border border-border/50">
          <RiskGauge score={vendor.riskScore} size="lg" />
        </div>
      </div>

      <div className="space-y-4 stagger-children">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-medium text-text-primary">Documents</h2>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-premium w-full">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Upload Date</th>
                  <th>Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {vendor.documents && vendor.documents.length > 0 ? (
                  vendor.documents.map((doc) => (
                    <tr key={doc.id} className="cursor-pointer group relative">
                      <td>
                        <Link to={`/documents/${doc.id}`} className="absolute inset-0" />
                        <span className="font-medium text-text-primary group-hover:text-primary transition-colors">
                          {doc.fileName}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <DocumentTypeIcon type={doc.type} />
                          <span className="capitalize">{doc.type?.toLowerCase()}</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="text-text-secondary">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{doc.riskScore || 0}/100</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-text-tertiary">
                      No documents found for this vendor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetail;
