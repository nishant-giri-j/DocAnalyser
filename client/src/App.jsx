import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import VendorList from './pages/VendorList';
import VendorDetail from './pages/VendorDetail';
import DocumentUpload from './pages/DocumentUpload';
import DocumentDetail from './pages/DocumentDetail';
import ComplianceRules from './pages/ComplianceRules';

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(20px)',
            color: '#f1f5f9',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#f1f5f9' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="vendors" element={<VendorList />} />
          <Route path="vendors/:id" element={<VendorDetail />} />
          <Route path="documents/upload" element={<DocumentUpload />} />
          <Route path="documents/:id" element={<DocumentDetail />} />
          <Route path="compliance" element={<ComplianceRules />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
