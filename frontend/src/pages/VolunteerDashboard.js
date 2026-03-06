import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Package, MapPin, Navigation, CheckCircle, Loader2, Phone, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

// Custom marker icons
const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pickupIcon = createIcon('red');
const deliveryIcon = createIcon('green');
const volunteerIcon = createIcon('blue');

// Component to update map view
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
};

const VolunteerDashboard = () => {
  const { user, updateLocation } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [assignmentsRes, metricsRes] = await Promise.all([
        axios.get(`${API_URL}/api/assignments`),
        axios.get(`${API_URL}/api/metrics`)
      ]);
      
      setAssignments(assignmentsRes.data);
      setActiveAssignment(assignmentsRes.data.find(a => a.delivery_status !== 'delivered'));
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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Track volunteer location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          
          // Update location on server
          try {
            await axios.post(`${API_URL}/api/tracking/update`, { latitude, longitude });
          } catch (error) {
            console.error('Error updating location:', error);
          }
        },
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handlePickup = async () => {
    if (!activeAssignment) return;
    setActionLoading(true);
    
    try {
      await axios.post(`${API_URL}/api/assignments/${activeAssignment.id}/pickup`);
      toast.success('Pickup confirmed!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to confirm pickup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!activeAssignment) return;
    setActionLoading(true);
    
    try {
      await axios.post(`${API_URL}/api/assignments/${activeAssignment.id}/deliver`);
      toast.success('Delivery confirmed! Great job!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to confirm delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const getMapCenter = () => {
    if (currentLocation) return [currentLocation.latitude, currentLocation.longitude];
    if (activeAssignment?.donor_latitude) return [activeAssignment.donor_latitude, activeAssignment.donor_longitude];
    return [28.6139, 77.2090]; // Default: Delhi
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#228B22]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFF0]" data-testid="volunteer-dashboard">
      {/* Mobile-first: Map takes most space */}
      <div className="lg:hidden">
        {/* Top Stats Bar */}
        <div className="bg-white border-b border-stone-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-stone-600">Welcome, {user?.name}</p>
              <p className="font-semibold text-stone-800">{metrics?.user?.total_deliveries || 0} deliveries</p>
            </div>
            {activeAssignment && (
              <Badge className="bg-[#228B22] text-white">Active Task</Badge>
            )}
          </div>
        </div>
        
        {/* Map */}
        <div className="h-[50vh]">
          <MapContainer
            center={getMapCenter()}
            zoom={14}
            className="h-full w-full"
            data-testid="volunteer-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={getMapCenter()} />
            
            {currentLocation && (
              <Marker position={[currentLocation.latitude, currentLocation.longitude]} icon={volunteerIcon}>
                <Popup>Your location</Popup>
              </Marker>
            )}
            
            {activeAssignment?.donor_latitude && (
              <>
                <Marker position={[activeAssignment.donor_latitude, activeAssignment.donor_longitude]} icon={pickupIcon}>
                  <Popup>
                    <strong>Pickup:</strong> {activeAssignment.donor_name}<br/>
                    {activeAssignment.donor_address}
                  </Popup>
                </Marker>
                
                {activeAssignment.receiver_latitude && (
                  <>
                    <Marker position={[activeAssignment.receiver_latitude, activeAssignment.receiver_longitude]} icon={deliveryIcon}>
                      <Popup>
                        <strong>Deliver to:</strong> {activeAssignment.receiver_name}<br/>
                        {activeAssignment.receiver_address}
                      </Popup>
                    </Marker>
                    
                    <Polyline
                      positions={[
                        currentLocation ? [currentLocation.latitude, currentLocation.longitude] : [activeAssignment.donor_latitude, activeAssignment.donor_longitude],
                        [activeAssignment.donor_latitude, activeAssignment.donor_longitude],
                        [activeAssignment.receiver_latitude, activeAssignment.receiver_longitude]
                      ]}
                      color="#228B22"
                      weight={4}
                    />
                  </>
                )}
              </>
            )}
          </MapContainer>
        </div>
        
        {/* Bottom Sheet */}
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6 shadow-lg min-h-[40vh]">
          {activeAssignment ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-stone-800" style={{ fontFamily: 'Manrope' }}>
                  Active Delivery
                </h2>
                <Badge className={activeAssignment.pickup_status === 'completed' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}>
                  {activeAssignment.pickup_status === 'completed' ? 'En Route' : 'To Pickup'}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {/* Food Info */}
                <div className="p-4 bg-stone-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-[#228B22]" />
                    <div>
                      <p className="font-semibold text-stone-800">{activeAssignment.food_name}</p>
                      <p className="text-sm text-stone-600">{activeAssignment.servings} servings</p>
                    </div>
                  </div>
                </div>
                
                {/* Pickup */}
                <div className={`p-4 rounded-xl ${activeAssignment.pickup_status === 'completed' ? 'bg-green-50 border border-green-200' : 'bg-white border border-stone-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeAssignment.pickup_status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`}>
                      {activeAssignment.pickup_status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white font-bold">1</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-stone-800">Pickup from</p>
                      <p className="text-stone-600">{activeAssignment.donor_name}</p>
                      <p className="text-sm text-stone-500">{activeAssignment.donor_address}</p>
                    </div>
                  </div>
                </div>
                
                {/* Delivery */}
                <div className={`p-4 rounded-xl ${activeAssignment.delivery_status === 'delivered' ? 'bg-green-50 border border-green-200' : 'bg-white border border-stone-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeAssignment.delivery_status === 'delivered' ? 'bg-green-500' : 'bg-[#228B22]'}`}>
                      {activeAssignment.delivery_status === 'delivered' ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white font-bold">2</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-stone-800">Deliver to</p>
                      <p className="text-stone-600">{activeAssignment.receiver_name}</p>
                      <p className="text-sm text-stone-500">{activeAssignment.receiver_address}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Button */}
              <div className="mt-6">
                {activeAssignment.pickup_status !== 'completed' ? (
                  <button
                    onClick={handlePickup}
                    disabled={actionLoading}
                    className="w-full btn-primary py-4 text-lg disabled:opacity-50"
                    data-testid="confirm-pickup-btn"
                  >
                    {actionLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Confirming...
                      </span>
                    ) : 'Confirm Pickup'}
                  </button>
                ) : (
                  <button
                    onClick={handleDeliver}
                    disabled={actionLoading}
                    className="w-full btn-primary py-4 text-lg disabled:opacity-50"
                    data-testid="confirm-delivery-btn"
                  >
                    {actionLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Confirming...
                      </span>
                    ) : 'Confirm Delivery'}
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <Navigation className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-stone-800 mb-2" style={{ fontFamily: 'Manrope' }}>No Active Tasks</h2>
              <p className="text-stone-500">You'll be notified when a new delivery is assigned.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-stone-800" style={{ fontFamily: 'Manrope' }}>
                Welcome, {user?.name}
              </h1>
              <p className="text-stone-600 mt-1">Volunteer Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <Card className="card-base px-6 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-[#228B22]" />
                  <div>
                    <p className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Manrope' }}>{metrics?.user?.total_deliveries || 0}</p>
                    <p className="text-xs text-stone-500">Total Deliveries</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Map */}
            <div className="lg:col-span-2">
              <Card className="card-base overflow-hidden">
                <div className="h-[500px]">
                  <MapContainer
                    center={getMapCenter()}
                    zoom={14}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapUpdater center={getMapCenter()} />
                    
                    {currentLocation && (
                      <Marker position={[currentLocation.latitude, currentLocation.longitude]} icon={volunteerIcon}>
                        <Popup>Your location</Popup>
                      </Marker>
                    )}
                    
                    {activeAssignment?.donor_latitude && (
                      <>
                        <Marker position={[activeAssignment.donor_latitude, activeAssignment.donor_longitude]} icon={pickupIcon}>
                          <Popup>
                            <strong>Pickup:</strong> {activeAssignment.donor_name}<br/>
                            {activeAssignment.donor_address}
                          </Popup>
                        </Marker>
                        
                        {activeAssignment.receiver_latitude && (
                          <>
                            <Marker position={[activeAssignment.receiver_latitude, activeAssignment.receiver_longitude]} icon={deliveryIcon}>
                              <Popup>
                                <strong>Deliver to:</strong> {activeAssignment.receiver_name}<br/>
                                {activeAssignment.receiver_address}
                              </Popup>
                            </Marker>
                            
                            <Polyline
                              positions={[
                                currentLocation ? [currentLocation.latitude, currentLocation.longitude] : [activeAssignment.donor_latitude, activeAssignment.donor_longitude],
                                [activeAssignment.donor_latitude, activeAssignment.donor_longitude],
                                [activeAssignment.receiver_latitude, activeAssignment.receiver_longitude]
                              ]}
                              color="#228B22"
                              weight={4}
                            />
                          </>
                        )}
                      </>
                    )}
                  </MapContainer>
                </div>
              </Card>
            </div>
            
            {/* Task Details */}
            <div>
              {activeAssignment ? (
                <Card className="card-base">
                  <CardHeader>
                    <CardTitle style={{ fontFamily: 'Manrope' }}>Active Delivery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-stone-50 rounded-xl">
                      <p className="font-semibold text-stone-800">{activeAssignment.food_name}</p>
                      <p className="text-sm text-stone-600">{activeAssignment.servings} servings</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className={`p-3 rounded-lg ${activeAssignment.pickup_status === 'completed' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className={`w-4 h-4 ${activeAssignment.pickup_status === 'completed' ? 'text-green-600' : 'text-red-600'}`} />
                          <span className="font-medium text-stone-800">Pickup</span>
                          {activeAssignment.pickup_status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                        <p className="text-sm text-stone-600">{activeAssignment.donor_name}</p>
                        <p className="text-xs text-stone-500">{activeAssignment.donor_address}</p>
                      </div>
                      
                      <div className={`p-3 rounded-lg ${activeAssignment.delivery_status === 'delivered' ? 'bg-green-50' : 'bg-[#228B22]/10'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Navigation className={`w-4 h-4 ${activeAssignment.delivery_status === 'delivered' ? 'text-green-600' : 'text-[#228B22]'}`} />
                          <span className="font-medium text-stone-800">Deliver</span>
                          {activeAssignment.delivery_status === 'delivered' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                        <p className="text-sm text-stone-600">{activeAssignment.receiver_name}</p>
                        <p className="text-xs text-stone-500">{activeAssignment.receiver_address}</p>
                      </div>
                    </div>
                    
                    {activeAssignment.pickup_status !== 'completed' ? (
                      <button
                        onClick={handlePickup}
                        disabled={actionLoading}
                        className="w-full btn-primary disabled:opacity-50"
                        data-testid="confirm-pickup-btn-desktop"
                      >
                        {actionLoading ? 'Confirming...' : 'Confirm Pickup'}
                      </button>
                    ) : (
                      <button
                        onClick={handleDeliver}
                        disabled={actionLoading}
                        className="w-full btn-primary disabled:opacity-50"
                        data-testid="confirm-delivery-btn-desktop"
                      >
                        {actionLoading ? 'Confirming...' : 'Confirm Delivery'}
                      </button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="card-base">
                  <CardContent className="py-12 text-center">
                    <Navigation className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">No Active Tasks</h3>
                    <p className="text-stone-500 text-sm">You'll be notified when a new delivery is assigned.</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Past Deliveries */}
              <Card className="card-base mt-6">
                <CardHeader>
                  <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>Recent Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  {assignments.filter(a => a.delivery_status === 'delivered').length === 0 ? (
                    <p className="text-stone-500 text-sm text-center py-4">No completed deliveries yet</p>
                  ) : (
                    <div className="space-y-3">
                      {assignments.filter(a => a.delivery_status === 'delivered').slice(0, 5).map((assignment) => (
                        <div key={assignment.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-800 truncate">{assignment.food_name}</p>
                            <p className="text-xs text-stone-500">To: {assignment.receiver_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolunteerDashboard;
