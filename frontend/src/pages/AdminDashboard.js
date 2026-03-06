import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Users, Package, Truck, BarChart3, Loader2, TrendingUp, Leaf, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import L from 'leaflet';
import axios from 'axios';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [metricsRes, chartRes, usersRes, donationsRes, heatmapRes] = await Promise.all([
        axios.get(`${API_URL}/api/metrics`),
        axios.get(`${API_URL}/api/metrics/chart-data`),
        axios.get(`${API_URL}/api/admin/users`),
        axios.get(`${API_URL}/api/admin/donations`),
        axios.get(`${API_URL}/api/admin/heatmap`)
      ]);
      
      setMetrics(metricsRes.data);
      setChartData(chartRes.data);
      setUsers(usersRes.data);
      setDonations(donationsRes.data);
      setHeatmapData(heatmapRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const COLORS = ['#228B22', '#8A9A5B', '#4CAF50', '#81C784'];

  const roleDistribution = [
    { name: 'Donors', value: users.filter(u => u.role === 'donor').length },
    { name: 'Receivers', value: users.filter(u => u.role === 'receiver').length },
    { name: 'Volunteers', value: users.filter(u => u.role === 'volunteer').length }
  ];

  const statusDistribution = [
    { name: 'Pending', value: donations.filter(d => d.status === 'pending').length },
    { name: 'In Progress', value: donations.filter(d => ['accepted', 'assigned', 'picked_up'].includes(d.status)).length },
    { name: 'Delivered', value: donations.filter(d => d.status === 'delivered').length }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#228B22]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFF0] pb-12" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-800" style={{ fontFamily: 'Manrope' }}>
            Admin Dashboard
          </h1>
          <p className="text-stone-600 mt-1">Platform overview and analytics</p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="card-base bg-gradient-to-br from-[#228B22] to-[#1A6B1A] text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Manrope' }}>{metrics?.global?.total_meals_saved || 0}</p>
                    <p className="text-white/80 text-sm">Meals Saved</p>
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
                    <Leaf className="w-6 h-6 text-[#8A9A5B]" />
                  </div>
                  <div>
                    <p className="stat-value">{metrics?.global?.total_food_saved_kg || 0}</p>
                    <p className="stat-label">kg Saved</p>
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
                    <Scale className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="stat-value">{metrics?.global?.total_pollution_reduced || 0}</p>
                    <p className="stat-label">kg CO₂ Reduced</p>
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
                    <p className="stat-value">{metrics?.global?.total_volunteer_deliveries || 0}</p>
                    <p className="stat-label">Deliveries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Today's Stats */}
        <div className="grid lg:grid-cols-3 gap-4 mb-8">
          <Card className="card-base lg:col-span-2">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Manrope' }}>Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData?.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                    <XAxis dataKey="date" stroke="#57534E" fontSize={12} />
                    <YAxis stroke="#57534E" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #E7E5E4',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="donations" name="Donations" fill="#8A9A5B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="deliveries" name="Deliveries" fill="#228B22" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-base">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Manrope' }}>User Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {roleDistribution.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-sm text-stone-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="heatmap" className="space-y-4">
          <TabsList className="bg-white border border-stone-200">
            <TabsTrigger value="heatmap" data-testid="tab-heatmap">Donation Heatmap</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="donations" data-testid="tab-donations">Donations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="heatmap">
            <Card className="card-base">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Manrope' }}>Donation Activity Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] rounded-xl overflow-hidden">
                  <MapContainer
                    center={[20.5937, 78.9629]}
                    zoom={5}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {heatmapData.map((point, index) => (
                      <CircleMarker
                        key={index}
                        center={[point.lat, point.lng]}
                        radius={Math.min(point.weight * 2, 20)}
                        fillColor="#228B22"
                        color="#228B22"
                        weight={1}
                        opacity={0.8}
                        fillOpacity={0.5}
                      >
                        <Popup>{point.weight} servings</Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users">
            <Card className="card-base">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle style={{ fontFamily: 'Manrope' }}>All Users</CardTitle>
                  <Badge className="bg-[#228B22]/10 text-[#228B22]">{users.length} total</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Role</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Organisation</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-stone-100 hover:bg-stone-50">
                          <td className="py-3 px-4 text-stone-800">{u.name}</td>
                          <td className="py-3 px-4 text-stone-600">{u.email}</td>
                          <td className="py-3 px-4">
                            <Badge className={`
                              ${u.role === 'donor' ? 'bg-blue-100 text-blue-800' : ''}
                              ${u.role === 'receiver' ? 'bg-green-100 text-green-800' : ''}
                              ${u.role === 'volunteer' ? 'bg-purple-100 text-purple-800' : ''}
                              ${u.role === 'admin' ? 'bg-red-100 text-red-800' : ''}
                            `}>
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-stone-600">{u.organisation_name || '-'}</td>
                          <td className="py-3 px-4 text-stone-500 text-sm">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="donations">
            <Card className="card-base">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle style={{ fontFamily: 'Manrope' }}>All Donations</CardTitle>
                  <div className="flex gap-2">
                    {statusDistribution.map((s, i) => (
                      <Badge key={s.name} className="bg-stone-100 text-stone-700">
                        {s.name}: {s.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Food</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Servings</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Freshness</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-600">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.slice(0, 20).map((d) => (
                        <tr key={d.id} className="border-b border-stone-100 hover:bg-stone-50">
                          <td className="py-3 px-4 text-stone-800">{d.food_name}</td>
                          <td className="py-3 px-4 text-stone-600">{d.servings_estimate}</td>
                          <td className="py-3 px-4">
                            <span className={`badge-freshness ${d.freshness_score >= 70 ? 'high' : d.freshness_score >= 50 ? 'medium' : 'low'}`}>
                              {d.freshness_score}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`status-${d.status}`}>{d.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-stone-500 text-sm">
                            {new Date(d.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
