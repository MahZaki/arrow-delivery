import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Box, MapPin, LayoutDashboard, LogIn, LogOut, DollarSign, AlertCircle, Webhook, Shield, Package, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 border border-transparent ${
      isActive
        ? 'bg-arrow-green text-arrow-black font-bold shadow-[0_0_15px_rgba(47,191,142,0.4)]'
        : 'text-arrow-green hover:bg-arrow-deepGreen/20 hover:text-white hover:border-arrow-deepGreen'
    }`;

  const buttonClasses = 
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 border border-transparent text-arrow-green hover:bg-arrow-deepGreen/20 hover:text-white hover:border-arrow-deepGreen`;

  return (
    <nav className="sticky top-0 z-50 bg-arrow-dark/95 backdrop-blur-md border-b border-arrow-deepGreen shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-32">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
             <img 
               src="https://i.imgur.com/ofuT9Pm.png" 
               alt="Arrow Delivery Logo" 
               className="h-24 md:h-28 w-auto object-contain drop-shadow-[0_0_15px_rgba(47,191,142,0.6)]"
             />
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {!isAuthenticated && (
                <>
                  <NavLink to="/" className={linkClasses}>
                     <Box size={18} /> Home
                  </NavLink>
                  <NavLink to="/pricing" className={linkClasses}>
                     <DollarSign size={18} /> Pricing
                  </NavLink>
                </>
              )}
              <NavLink to="/track" className={linkClasses}>
                 <MapPin size={18} /> Track Order
              </NavLink>
              
              {isAuthenticated ? (
                <>
                  <NavLink to="/dashboard" className={linkClasses}>
                     <LayoutDashboard size={18} /> Dashboard
                  </NavLink>
                  <NavLink to="/finance" className={linkClasses}>
                     <DollarSign size={18} /> Finance
                  </NavLink>
                  <NavLink to="/claims" className={linkClasses}>
                     <AlertCircle size={18} /> Claims
                  </NavLink>
                  <NavLink to="/webhooks" className={linkClasses}>
                     <Webhook size={18} /> Webhooks
                  </NavLink>
                  <NavLink to="/crm" className={linkClasses}>
                     <Package size={18} /> CRM
                  </NavLink>
                  <NavLink to="/whatsapp" className={linkClasses}>
                     <MessageSquare size={18} /> WhatsApp
                  </NavLink>
                  {user?.role === 'admin' && (
                    <NavLink to="/admin" className={linkClasses}>
                       <Shield size={18} /> Admin
                    </NavLink>
                  )}
                  <button onClick={handleLogout} className={buttonClasses}>
                     <LogOut size={18} /> Logout
                  </button>
                </>
              ) : (
                <NavLink to="/login" className={linkClasses}>
                   <LogIn size={18} /> Login
                </NavLink>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-arrow-green hover:text-white hover:bg-arrow-deepGreen focus:outline-none transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-arrow-dark border-b border-arrow-deepGreen">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {!isAuthenticated && (
              <>
                <NavLink to="/" onClick={() => setIsOpen(false)} className={linkClasses}>
                  <Box size={18} /> Home
                </NavLink>
                <NavLink to="/pricing" onClick={() => setIsOpen(false)} className={linkClasses}>
                  <DollarSign size={18} /> Pricing
                </NavLink>
              </>
            )}
            <NavLink to="/track" onClick={() => setIsOpen(false)} className={linkClasses}>
               <MapPin size={18} /> Track Order
            </NavLink>
            
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" onClick={() => setIsOpen(false)} className={linkClasses}>
                   <LayoutDashboard size={18} /> Dashboard
                </NavLink>
                <NavLink to="/finance" onClick={() => setIsOpen(false)} className={linkClasses}>
                   <DollarSign size={18} /> Finance
                </NavLink>
                <NavLink to="/claims" onClick={() => setIsOpen(false)} className={linkClasses}>
                   <AlertCircle size={18} /> Claims
                </NavLink>
                <NavLink to="/webhooks" onClick={() => setIsOpen(false)} className={linkClasses}>
                   <Webhook size={18} /> Webhooks
                </NavLink>
                <NavLink to="/crm" onClick={() => setIsOpen(false)} className={linkClasses}>
                   <Package size={18} /> CRM
                </NavLink>
                <NavLink to="/whatsapp" onClick={() => setIsOpen(false)} className={linkClasses}>
                   <MessageSquare size={18} /> WhatsApp
                </NavLink>
                {user?.role === 'admin' && (
                  <NavLink to="/admin" onClick={() => setIsOpen(false)} className={linkClasses}>
                     <Shield size={18} /> Admin
                  </NavLink>
                )}
                <button onClick={handleLogout} className={`w-full ${buttonClasses} text-left`}>
                   <LogOut size={18} /> Logout
                </button>
              </>
            ) : (
              <NavLink to="/login" onClick={() => setIsOpen(false)} className={linkClasses}>
                 <LogIn size={18} /> Login
              </NavLink>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
