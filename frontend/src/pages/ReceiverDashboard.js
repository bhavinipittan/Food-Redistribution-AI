import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Package, MapPin, Clock, CheckCircle, Loader2, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ReceiverDashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [acceptedDonations, setAcceptedDonations] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [donationsRes, metricsRes] = await Promise.all([
        axios.get(`${API_URL}/api/donations`),
        axios.get(`${API_URL}/api/metrics`)
      ]);
      
      // Filter available donations (pending) and accepted ones
      const available = donationsRes.data.filter(d => d.status === 'pending');
      const accepted = donationsRes.data.filter(d => d.receiver_id === user?.id && d.status !== 'pending');
      
      setDonations(available);
      setAcceptedDonations(accepted);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAccept = async (donationId) => {
    setAccepting(donationId);
    try {
      const response = await axios.post(`${API_URL}/api/donations/${donationId}/accept`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to accept donation');
    } finally {
      setAccepting(null);
    }
  };

  const openTracking = async (donation) => {
    setSelectedDonation(donation);
    setTrackingOpen(true);
    
    try {
      // Find assignment for this donation
      const assignmentsRes = await axios.get(`${API_URL}/api/assignments`);
      const assignment = assignmentsRes.data.find(a => a.donation_id === donation.id);
      
      if (assignment) {
        const trackingRes = await axios.get(`${API_URL}/api/tracking/${assignment.id}`);
        setTrackingData(trackingRes.data);
      }
    } catch (error) {
      console.error('Error fetching tracking:', error);
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
    <div className="min-h-screen bg-[#FFFFF0] pb-12" data-testid="receiver-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-800" style={{ fontFamily: 'Manrope' }}>
            Welcome, {user?.name}
          </h1>
          <p className="text-stone-600 mt-1">{user?.organisation_name || 'Receiver Dashboard'}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="card-base">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#228B22]/10 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#228B22]" />
                  </div>
                  <div>
                    <p className="stat-value">{donations.length}</p>
                    <p className="stat-label">Available Nearby</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="card-base">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="stat-value">{metrics?.user?.total_accepted || 0}</p>
                    <p className="stat-label">Accepted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="card-base">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="stat-value">{metrics?.user?.total_received || 0}</p>
                    <p className="stat-label">Received</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Available Donations */}
        <Card className="card-base mb-8">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Manrope' }}>Available Donations Nearby</CardTitle>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500">No donations available nearby at the moment.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {donations.map((donation, index) => (
                  <motion.div
                    key={donation.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-white border border-stone-200 rounded-xl hover:border-[#8A9A5B] transition-all"
                    data-testid={`available-donation-${donation.id}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-stone-800">{donation.food_name}</h3>
                      <span className={`badge-freshness ${donation.freshness_score >= 70 ? 'high' : donation.freshness_score >= 50 ? 'medium' : 'low'}`}>
                        {donation.freshness_score}%
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-stone-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>{donation.servings_estimate} servings</span>
                      </div>
                      {donation.distance_km && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{donation.distance_km} km away</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Expires in ~{donation.expiry_prediction_hours}h</span>
                      </div>
                      {donation.donor_name && (
                        <p className="text-xs text-stone-500">From: {donation.donor_name}</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleAccept(donation.id)}
                      disabled={accepting === donation.id}
                      className="w-full btn-primary py-2 text-sm disabled:opacity-50"
                      data-testid={`accept-btn-${donation.id}`}
                    >
                      {accepting === donation.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Accepting...
                        </span>
                      ) : 'Accept Donation'}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accepted Donations */}
        <Card className="card-base">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Manrope' }}>Your Accepted Donations</CardTitle>
          </CardHeader>
          <CardContent>
            {acceptedDonations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-stone-500">No accepted donations yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {acceptedDonations.map((donation, index) => (
                  <motion.div
                    key={donation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-stone-50 rounded-xl"
                    data-testid={`accepted-donation-${donation.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-stone-800">{donation.food_name}</h3>
                        <Badge className={getStatusBadge(donation.status)}>{donation.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-stone-600">
                        <span>{donation.servings_estimate} servings</span>
                        <span>From: {donation.donor_name}</span>
                      </div>
                    </div>
                    
                    {['assigned', 'picked_up'].includes(donation.status) && (
                      <button
                        onClick={() => openTracking(donation)}
                        className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
                        data-testid={`track-btn-${donation.id}`}
                      >
                        <Navigation className="w-4 h-4" />
                        Track
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tracking Dialog */}
      <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>Live Tracking</DialogTitle>
          </DialogHeader>
          
          {trackingData && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
                <div className="w-12 h-12 bg-[#228B22] rounded-full flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-stone-800">{trackingData.volunteer?.name || 'Volunteer'}</p>
                  <p className="text-sm text-stone-600 capitalize">
                    {trackingData.status?.pickup === 'completed' ? 'On the way to you' : 'Heading to pickup'}
                  </p>
                </div>
              </div>
              
              <div className="h-[300px] rounded-xl overflow-hidden">
                {trackingData.volunteer?.latitude && trackingData.receiver?.latitude && (
                  <MapContainer
                    center={[trackingData.receiver.latitude, trackingData.receiver.longitude]}
                    zoom={13}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Volunteer marker */}
                    <Marker position={[trackingData.volunteer.latitude, trackingData.volunteer.longitude]}>
                      <Popup>Volunteer: {trackingData.volunteer.name}</Popup>
                    </Marker>
                    
                    {/* Donor marker */}
                    {trackingData.donor?.latitude && (
                      <Marker position={[trackingData.donor.latitude, trackingData.donor.longitude]}>
                        <Popup>Pickup: {trackingData.donor.name}</Popup>
                      </Marker>
                    )}
                    
                    {/* Receiver marker */}
                    <Marker position={[trackingData.receiver.latitude, trackingData.receiver.longitude]}>
                      <Popup>Delivery: {trackingData.receiver.name}</Popup>
                    </Marker>
                    
                    {/* Route line */}
                    {trackingData.donor?.latitude && (
                      <Polyline
                        positions={[
                          [trackingData.volunteer.latitude, trackingData.volunteer.longitude],
                          [trackingData.donor.latitude, trackingData.donor.longitude],
                          [trackingData.receiver.latitude, trackingData.receiver.longitude]
                        ]}
                        color="#228B22"
                        weight={3}
                        dashArray="5, 10"
                      />
                    )}
                  </MapContainer>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceiverDashboard;
