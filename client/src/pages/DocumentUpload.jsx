import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { HiOutlineUpload, HiOutlineDocumentAdd, HiOutlineX } from 'react-icons/hi';
import api from '../lib/api';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { DOCUMENT_TYPES } from '../lib/constants';

export default function DocumentUpload() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    vendorId: '',
    documentType: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await api.get('/vendors');
        setVendors(response.data || []);
      } catch (error) {
        toast.error('Failed to load vendors.');
        console.error('Error fetching vendors:', error);
      } finally {
        setLoadingVendors(false);
      }
    };
    fetchVendors();
  }, []);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }
    if (!formData.vendorId) {
      toast.error('Please select a vendor.');
      return;
    }
    if (!formData.documentType) {
      toast.error('Please select a document type.');
      return;
    }

    setIsSubmitting(true);
    const data = new FormData();
    data.append('file', selectedFile);
    data.append('vendorId', formData.vendorId);
    data.append('documentType', formData.documentType);

    try {
      const response = await api.post('/documents/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Document uploaded successfully.');
      navigate(`/documents/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload document.');
      console.error('Upload error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingVendors) return <PageLoader />;

  return (
    <div className="section-fade max-w-3xl mx-auto py-8">
      <div className="glass-card p-8 rounded-2xl stagger-children">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            <HiOutlineDocumentAdd className="text-blue-500" />
            Upload Document
          </h1>
          <p className="text-gray-500">Securely upload and process your vendor documents.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <select
                id="vendorId"
                name="vendorId"
                value={formData.vendorId}
                onChange={handleInputChange}
                className="input-premium w-full"
                required
              >
                <option value="">Select Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-1">
                Document Type
              </label>
              <select
                id="documentType"
                name="documentType"
                value={formData.documentType}
                onChange={handleInputChange}
                className="input-premium w-full"
                required
              >
                <option value="">Select Type</option>
                {DOCUMENT_TYPES?.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <div
              {...getRootProps()}
              className={`dropzone mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-2 text-center">
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                      <span className="truncate max-w-xs font-medium">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <HiOutlineX size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Click or drag to replace file</p>
                  </div>
                ) : (
                  <>
                    <HiOutlineUpload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500">
                        Upload a file
                      </span>{' '}
                      or drag and drop
                    </div>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="mr-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
