import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
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
import ZrCreateOrder from './pages/ZrCreateOrder';
import Claims from './pages/Claims';
import Webhooks from './pages/Webhooks';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <div className="bg-arrow-black min-h-screen text-arrow-light flex flex-col font-sans selection:bg-arrow-green selection:text-black">
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
                  <Route path="/zr-create-order" element={<ZrCreateOrder />} />
                  <Route path="/claims" element={<Claims />} />
                  <Route path="/webhooks" element={<Webhooks />} />
                  <Route path="/admin" element={<Admin />} />
                </Route>
              </Routes>
            </main>
            <Footer />
          </div>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;