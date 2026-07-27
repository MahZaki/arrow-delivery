import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Package, Plus, Search, DollarSign, Wallet,
  Archive, AlertCircle, MessageSquare, Webhook, Shield,
  LogOut, Menu, X, User, LucideIcon
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'CRM', path: '/crm', icon: Package },
      { label: 'New Order', path: '/zr-create-order', icon: Plus },
      { label: 'Tracking', path: '/track', icon: Search },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { label: 'Overview', path: '/finance', icon: DollarSign },
      { label: 'Balance', path: '/balance', icon: Wallet },
    ],
  },
  {
    title: 'SERVICE',
    items: [
      { label: 'Archive', path: '/archive', icon: Archive },
      { label: 'Claims', path: '/claims', icon: AlertCircle },
      { label: 'WhatsApp', path: '/whatsapp', icon: MessageSquare },
    ],
  },
  {
    title: 'DEVELOPER',
    items: [
      { label: 'Webhooks', path: '/webhooks', icon: Webhook },
      { label: 'Admin', path: '/admin', icon: Shield, adminOnly: true },
    ],
  },
];

const Sidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileOpen(false);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
      isActive
        ? 'bg-amber-500/15 text-amber-400 font-semibold border-l-2 border-amber-500 ml-0'
        : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent ml-0'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-neutral-800/60">
        <img
          src="https://i.imgur.com/ofuT9Pm.png"
          alt="Arrow Delivery"
          className="h-10 w-auto object-contain"
        />
        <span className="text-lg font-bold text-white tracking-tight">
          Arrow
        </span>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || user?.role === 'admin'
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              <div className="text-[10px] uppercase tracking-widest text-gray-600 px-3 mb-2 font-semibold">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/dashboard'}
                    className={linkClass}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon size={17} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-neutral-800/60 px-3 py-4 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center">
            <User size={14} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white truncate font-medium">
              {user?.email || 'User'}
            </div>
            <div className="text-[10px] uppercase text-gray-500">
              {user?.role || 'client'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
        >
          <LogOut size={17} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden bg-arrow-dark/90 backdrop-blur-md border border-neutral-700 p-2 rounded-lg text-amber-400 hover:text-white transition-colors"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-arrow-black border-r border-neutral-800/60 shadow-2xl animate-slide-right">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-arrow-black/95 border-r border-neutral-800/60 backdrop-blur-md z-30">
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
