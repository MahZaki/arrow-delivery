import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Tracking from './pages/Tracking';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import ArchivedImport from './pages/ArchivedImport';
import Finance from './pages/Finance';
import Balance from './pages/Balance';
import ZrCreateOrder from './pages/ZrCreateOrder';
import Claims from './pages/Claims';
import Webhooks from './pages/Webhooks';
import Crm from './pages/Crm';
import WhatsAppCampaigns from './pages/WhatsAppCampaigns';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-arrow-black min-h-screen text-arrow-light font-sans selection:bg-amber-500 selection:text-black">
      {isAuthenticated ? (
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 animate-fade-in">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/track" element={<Tracking />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/archive" element={<ArchivedImport />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/balance" element={<Balance />} />
                <Route path="/zr-create-order" element={<ZrCreateOrder />} />
                <Route path="/claims" element={<Claims />} />
                <Route path="/webhooks" element={<Webhooks />} />
                <Route path="/crm" element={<Crm />} />
                <Route path="/whatsapp" element={<WhatsAppCampaigns />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Routes>
          </main>
        </div>
      ) : (
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow animate-fade-in">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/track" element={<Tracking />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/archive" element={<ArchivedImport />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/balance" element={<Balance />} />
                <Route path="/zr-create-order" element={<ZrCreateOrder />} />
                <Route path="/claims" element={<Claims />} />
                <Route path="/webhooks" element={<Webhooks />} />
                <Route path="/crm" element={<Crm />} />
                <Route path="/whatsapp" element={<WhatsAppCampaigns />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Routes>
          </main>
          <Footer />
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <AppLayout />
        </DataProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
