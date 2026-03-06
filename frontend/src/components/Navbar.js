import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Leaf, House, Package, Users, Truck, BarChart3, LogOut, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'donor': return '/donor';
      case 'receiver': return '/receiver';
      case 'volunteer': return '/volunteer';
      case 'admin': return '/admin';
      default: return '/';
    }
  };

  const navLinks = user ? [
    { path: getDashboardPath(), label: 'Dashboard', icon: House },
    ...(user.role === 'donor' ? [{ path: '/donor/donations', label: 'My Donations', icon: Package }] : []),
    ...(user.role === 'receiver' ? [{ path: '/receiver/available', label: 'Available', icon: Package }] : []),
    ...(user.role === 'volunteer' ? [{ path: '/volunteer/assignments', label: 'Assignments', icon: Truck }] : []),
    ...(user.role === 'admin' ? [
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 }
    ] : []),
    { path: '/metrics', label: 'Impact', icon: BarChart3 }
  ] : [];

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={user ? getDashboardPath() : '/'} className="flex items-center gap-2" data-testid="nav-logo">
              <div className="w-10 h-10 bg-[#228B22] rounded-full flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Manrope' }}>FoodBridge</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link flex items-center gap-2 ${location.pathname === link.path ? 'active' : ''}`}
                data-testid={`nav-${link.label.toLowerCase().replace(' ', '-')}`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            {user ? (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-stone-200">
                <div className="text-sm">
                  <p className="font-medium text-stone-800">{user.name}</p>
                  <p className="text-stone-500 capitalize">{user.role}</p>
                </div>
                <button onClick={handleLogout} className="nav-link flex items-center gap-2" data-testid="nav-logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-4">
                <Link to="/login" className="nav-link" data-testid="nav-login">Log in</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4" data-testid="nav-register">Get Started</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2" data-testid="mobile-menu-btn">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-stone-200"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block nav-link ${location.pathname === link.path ? 'active' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </div>
                </Link>
              ))}
              {user ? (
                <button onClick={handleLogout} className="w-full nav-link text-left flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block nav-link">Log in</Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block btn-primary text-center">Get Started</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
