import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Leaf, Eye, EyeOff, AlertCircle, Building, User, Truck, Shield } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: '',
    organisation_name: '',
    organisation_type: '',
    phone: '',
    address: '',
    latitude: null,
    longitude: null,
    transport_mode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { value: 'donor', label: 'Donor', icon: Building, desc: 'Restaurant, hotel, or event with surplus food' },
    { value: 'receiver', label: 'Receiver', icon: User, desc: 'NGO, shelter, or orphanage needing food' },
    { value: 'volunteer', label: 'Volunteer', icon: Truck, desc: 'Driver to deliver food donations' },
    { value: 'admin', label: 'Admin', icon: Shield, desc: 'Platform administrator' }
  ];

  const transportModes = [
    { value: 'bike', label: 'Bike' },
    { value: 'car', label: 'Car' },
    { value: 'scooter', label: 'Scooter' },
    { value: 'walking', label: 'Walking' }
  ];

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.role) {
      setError('Please select a role');
      return;
    }
    
    setLoading(true);
    
    try {
      const user = await register(formData);
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-[#228B22] rounded-full flex items-center justify-center">
              <Leaf className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-stone-800" style={{ fontFamily: 'Manrope' }}>Join FoodBridge</h1>
          <p className="text-stone-600 mt-2">Create an account to start making a difference</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-stone-200">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700" data-testid="register-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <Label className="text-stone-700 font-medium mb-3 block">Select your role</Label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.role === role.value
                        ? 'border-[#228B22] bg-[#228B22]/5'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                    data-testid={`role-${role.value}`}
                  >
                    <role.icon className={`w-6 h-6 mb-2 ${formData.role === role.value ? 'text-[#228B22]' : 'text-stone-400'}`} />
                    <p className="font-semibold text-stone-800">{role.label}</p>
                    <p className="text-xs text-stone-500 mt-1">{role.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="text-stone-700 font-medium">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="mt-2 input-field w-full"
                  required
                  data-testid="register-name"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-stone-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="mt-2 input-field w-full"
                  required
                  data-testid="register-email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-stone-700 font-medium">Password</Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="input-field w-full pr-12"
                  required
                  minLength={6}
                  data-testid="register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {(formData.role === 'donor' || formData.role === 'receiver') && (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="organisation_name" className="text-stone-700 font-medium">Organisation Name</Label>
                  <Input
                    id="organisation_name"
                    type="text"
                    value={formData.organisation_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, organisation_name: e.target.value }))}
                    placeholder="Your organisation"
                    className="mt-2 input-field w-full"
                    data-testid="register-org-name"
                  />
                </div>

                <div>
                  <Label htmlFor="organisation_type" className="text-stone-700 font-medium">Organisation Type</Label>
                  <Select
                    value={formData.organisation_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, organisation_type: value }))}
                  >
                    <SelectTrigger className="mt-2 input-field w-full" data-testid="register-org-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.role === 'donor' ? (
                        <>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="hostel">Hostel</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="ngo">NGO</SelectItem>
                          <SelectItem value="shelter">Shelter</SelectItem>
                          <SelectItem value="orphanage">Orphanage</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {formData.role === 'volunteer' && (
              <div>
                <Label htmlFor="transport_mode" className="text-stone-700 font-medium">Transport Mode</Label>
                <Select
                  value={formData.transport_mode}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, transport_mode: value }))}
                >
                  <SelectTrigger className="mt-2 input-field w-full" data-testid="register-transport">
                    <SelectValue placeholder="Select transport" />
                  </SelectTrigger>
                  <SelectContent>
                    {transportModes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="phone" className="text-stone-700 font-medium">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1234567890"
                  className="mt-2 input-field w-full"
                  data-testid="register-phone"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-stone-700 font-medium">Address</Label>
                <Input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St, City"
                  className="mt-2 input-field w-full"
                  data-testid="register-address"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={getLocation}
                className="text-sm text-[#228B22] hover:underline flex items-center gap-2"
                data-testid="get-location-btn"
              >
                📍 Get my current location
              </button>
              {formData.latitude && (
                <p className="text-xs text-stone-500 mt-1">
                  Location: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
              data-testid="register-submit"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-stone-600">
              Already have an account?{' '}
              <Link to="/login" className="text-[#228B22] font-medium hover:underline" data-testid="register-login-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
