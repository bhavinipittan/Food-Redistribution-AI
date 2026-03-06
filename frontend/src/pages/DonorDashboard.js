import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Package, Users, Truck, Plus, Camera, X, Loader2, Clock, CheckCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DonorDashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDonation, setNewDonation] = useState({
    food_name: '',
    ingredients: '',
    servings_estimate: '',
    preparation_time: '',
    image_base64: '',
    meal_prepared_at: ''
  });
  const [imagePreview, setImagePreview] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [donationsRes, metricsRes] = await Promise.all([
        axios.get(`${API_URL}/api/donations`),
        axios.get(`${API_URL}/api/metrics`)
      ]);
      setDonations(donationsRes.data);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        setNewDonation(prev => ({ ...prev, image_base64: base64 }));
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateDonation = async (e) => {
    e.preventDefault();
    
    if (!newDonation.meal_prepared_at) {
      toast.error('Please enter when the meal was prepared');
      return;
    }
    
    setCreating(true);
    
    try {
      await axios.post(`${API_URL}/api/donations`, {
        ...newDonation,
        servings_estimate: parseInt(newDonation.servings_estimate),
        preparation_time: newDonation.preparation_time ? parseInt(newDonation.preparation_time) : null,
        meal_prepared_at: new Date(newDonation.meal_prepared_at).toISOString()
      });
      
      toast.success('Donation created successfully!');
      setCreateOpen(false);
      setNewDonation({ food_name: '', ingredients: '', servings_estimate: '', preparation_time: '', image_base64: '', meal_prepared_at: '' });
      setImagePreview(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create donation');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800',
      accepted: 'bg-blue-100 text-blue-800',
      assigned: 'bg-purple-100 text-purple-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800'
    };
    return styles[status] || 'bg-stone-100 text-stone-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#228B22]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFF0] pb-12" data-testid="donor-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-800" style={{ fontFamily: 'Manrope' }}>
              Welcome, {user?.name}
            </h1>
            <p className="text-stone-600 mt-1">{user?.organisation_name || 'Donor Dashboard'}</p>
          </div>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button className="btn-primary flex items-center gap-2" data-testid="create-donation-btn">
                <Plus className="w-5 h-5" />
                Upload Donation
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Manrope' }}>Create New Donation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateDonation} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="food_name">Food Name *</Label>
                  <Input
                    id="food_name"
                    value={newDonation.food_name}
                    onChange={(e) => setNewDonation(prev => ({ ...prev, food_name: e.target.value }))}
                    placeholder="e.g., Vegetable Biryani"
                    className="mt-1"
                    required
                    data-testid="donation-food-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="meal_prepared_at" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Meal Preparation Date & Time *
                  </Label>
                  <Input
                    id="meal_prepared_at"
                    type="datetime-local"
                    value={newDonation.meal_prepared_at}
                    onChange={(e) => setNewDonation(prev => ({ ...prev, meal_prepared_at: e.target.value }))}
                    className="mt-1"
                    required
                    max={new Date().toISOString().slice(0, 16)}
                    data-testid="donation-meal-prepared-at"
                  />
                  <p className="text-xs text-stone-500 mt-1">When was this meal prepared? This helps us predict food freshness accurately.</p>
                </div>
                
                <div>
                  <Label htmlFor="ingredients">Ingredients</Label>
                  <Textarea
                    id="ingredients"
                    value={newDonation.ingredients}
                    onChange={(e) => setNewDonation(prev => ({ ...prev, ingredients: e.target.value }))}
                    placeholder="List main ingredients..."
                    className="mt-1"
                    data-testid="donation-ingredients"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="servings">Servings *</Label>
                    <Input
                      id="servings"
                      type="number"
                      min="1"
                      value={newDonation.servings_estimate}
                      onChange={(e) => setNewDonation(prev => ({ ...prev, servings_estimate: e.target.value }))}
                      placeholder="e.g., 50"
                      className="mt-1"
                      required
                      data-testid="donation-servings"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prep_time">Prep Time (hours)</Label>
                    <Input
                      id="prep_time"
                      type="number"
                      min="0"
                      value={newDonation.preparation_time}
                      onChange={(e) => setNewDonation(prev => ({ ...prev, preparation_time: e.target.value }))}
                      placeholder="e.g., 2"
                      className="mt-1"
                      data-testid="donation-prep-time"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Food Photo</Label>
                  <div className="mt-1">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => { setImagePreview(null); setNewDonation(prev => ({ ...prev, image_base64: '' })); }}
                          className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-[#228B22] transition-colors">
                        <Camera className="w-8 h-8 text-stone-400" />
                        <span className="text-sm text-stone-500 mt-2">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          data-testid="donation-image-input"
                        />
                      </label>
                    )}
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full btn-primary disabled:opacity-50"
                  data-testid="donation-submit-btn"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </span>
                  ) : 'Create Donation'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="card-base">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#228B22]/10 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#228B22]" />
                  </div>
                  <div>
                    <p className="stat-value">{metrics?.user?.total_donations || 0}</p>
                    <p className="stat-label">Total Donations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="card-base">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#8A9A5B]/10 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-[#8A9A5B]" />
                  </div>
                  <div>
                    <p className="stat-value">{metrics?.user?.meals_delivered || 0}</p>
                    <p className="stat-label">Meals Delivered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="card-base">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="stat-value">{donations.filter(d => d.status === 'pending').length}</p>
                    <p className="stat-label">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="card-base">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="stat-value">{donations.filter(d => ['assigned', 'picked_up'].includes(d.status)).length}</p>
                    <p className="stat-label">In Transit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Donations List */}
        <Card className="card-base">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Manrope' }}>Your Donations</CardTitle>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500">No donations yet. Create your first donation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {donations.map((donation, index) => (
                  <motion.div
                    key={donation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-stone-50 rounded-xl"
                    data-testid={`donation-item-${donation.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-stone-800">{donation.food_name}</h3>
                        <Badge className={getStatusBadge(donation.status)}>{donation.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-stone-600">
                        <span>{donation.servings_estimate} servings</span>
                        {donation.freshness_score && (
                          <span className={`badge-freshness ${donation.freshness_score >= 70 ? 'high' : donation.freshness_score >= 50 ? 'medium' : 'low'}`}>
                            Freshness: {donation.freshness_score}%
                          </span>
                        )}
                        {donation.expiry_prediction_hours && (
                          <span>Expires in ~{donation.expiry_prediction_hours}h</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-stone-500">{new Date(donation.created_at).toLocaleString()}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DonorDashboard;
