import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { TrendingUp, Leaf, Package, Truck, Users, Scale, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MetricsPage = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [metricsRes, chartRes] = await Promise.all([
        axios.get(`${API_URL}/api/metrics`),
        axios.get(`${API_URL}/api/metrics/chart-data`)
      ]);
      
      setMetrics(metricsRes.data);
      setChartData(chartRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#228B22]" />
      </div>
    );
  }

  const impactCards = [
    {
      title: 'Meals Saved',
      value: metrics?.global?.total_meals_saved || 0,
      icon: Package,
      color: 'bg-[#228B22]',
      textColor: 'text-white',
      desc: 'Total meals redistributed'
    },
    {
      title: 'Food Saved',
      value: `${metrics?.global?.total_food_saved_kg || 0} kg`,
      icon: Leaf,
      color: 'bg-[#8A9A5B]/10',
      iconColor: 'text-[#8A9A5B]',
      desc: 'Food rescued from waste'
    },
    {
      title: 'CO₂ Reduced',
      value: `${metrics?.global?.total_pollution_reduced || 0} kg`,
      icon: Scale,
      color: 'bg-green-100',
      iconColor: 'text-green-600',
      desc: 'Carbon emissions prevented'
    },
    {
      title: 'Shelters Helped',
      value: metrics?.global?.total_shelters_helped || 0,
      icon: Users,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600',
      desc: 'Communities served'
    },
    {
      title: 'Deliveries',
      value: metrics?.global?.total_volunteer_deliveries || 0,
      icon: Truck,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600',
      desc: 'Successful volunteer deliveries'
    },
    {
      title: 'Today',
      value: metrics?.today?.deliveries || 0,
      icon: TrendingUp,
      color: 'bg-amber-100',
      iconColor: 'text-amber-600',
      desc: 'Deliveries completed today'
    }
  ];

  // Calculate cumulative data for area chart
  const cumulativeData = chartData?.daily?.reduce((acc, day, index) => {
    const prev = acc[index - 1] || { totalMeals: 0, totalDeliveries: 0 };
    acc.push({
      date: day.date,
      totalMeals: prev.totalMeals + (day.donations * 10), // Estimate meals per donation
      totalDeliveries: prev.totalDeliveries + day.deliveries,
      donations: day.donations,
      deliveries: day.deliveries
    });
    return acc;
  }, []) || [];

  return (
    <div className="min-h-screen bg-[#FFFFF0] pb-12" data-testid="metrics-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-stone-800 mb-4" style={{ fontFamily: 'Manrope' }}>
              Our Impact
            </h1>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Together, we're reducing food waste and hunger. Here's the difference we've made.
            </p>
          </motion.div>
        </div>

        {/* Impact Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {impactCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`card-base h-full ${card.color === 'bg-[#228B22]' ? 'bg-gradient-to-br from-[#228B22] to-[#1A6B1A]' : ''}`}>
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                    <card.icon className={`w-5 h-5 ${card.textColor || card.iconColor}`} />
                  </div>
                  <p className={`text-2xl font-bold ${card.textColor || 'text-stone-800'}`} style={{ fontFamily: 'Manrope' }}>
                    {card.value}
                  </p>
                  <p className={`text-xs ${card.textColor ? 'text-white/80' : 'text-stone-500'} mt-1`}>{card.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <Tabs defaultValue="daily" className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="bg-white border border-stone-200">
              <TabsTrigger value="daily" data-testid="tab-daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
              <TabsTrigger value="growth" data-testid="tab-growth">Growth</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="daily">
            <Card className="card-base">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Manrope' }}>Daily Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
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
          </TabsContent>
          
          <TabsContent value="weekly">
            <Card className="card-base">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Manrope' }}>Weekly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData?.daily || []}>
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
                      <Line type="monotone" dataKey="donations" name="Donations" stroke="#8A9A5B" strokeWidth={3} dot={{ fill: '#8A9A5B' }} />
                      <Line type="monotone" dataKey="deliveries" name="Deliveries" stroke="#228B22" strokeWidth={3} dot={{ fill: '#228B22' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="growth">
            <Card className="card-base">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Manrope' }}>Cumulative Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulativeData}>
                      <defs>
                        <linearGradient id="colorMeals" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#228B22" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#228B22" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8A9A5B" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8A9A5B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
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
                      <Area type="monotone" dataKey="totalMeals" name="Total Meals" stroke="#228B22" fillOpacity={1} fill="url(#colorMeals)" />
                      <Area type="monotone" dataKey="totalDeliveries" name="Total Deliveries" stroke="#8A9A5B" fillOpacity={1} fill="url(#colorDeliveries)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Environmental Impact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <Card className="card-base bg-gradient-to-br from-[#F0F4E8] to-white border-[#8A9A5B]/20">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Manrope' }}>
                  Environmental Impact
                </h2>
                <p className="text-stone-600 mt-2">
                  Every meal saved reduces food waste and its environmental footprint
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#228B22] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Leaf className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-[#228B22]" style={{ fontFamily: 'Manrope' }}>
                    {metrics?.global?.total_food_saved_kg || 0} kg
                  </p>
                  <p className="text-stone-600 mt-1">Food Waste Prevented</p>
                  <p className="text-xs text-stone-500 mt-2">
                    Equivalent to {Math.round((metrics?.global?.total_food_saved_kg || 0) / 0.5)} meals
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#8A9A5B] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Scale className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-[#8A9A5B]" style={{ fontFamily: 'Manrope' }}>
                    {metrics?.global?.total_pollution_reduced || 0} kg
                  </p>
                  <p className="text-stone-600 mt-1">CO₂ Emissions Saved</p>
                  <p className="text-xs text-stone-500 mt-2">
                    Like planting {Math.round((metrics?.global?.total_pollution_reduced || 0) / 21)} trees
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-blue-500" style={{ fontFamily: 'Manrope' }}>
                    {metrics?.global?.total_shelters_helped || 0}
                  </p>
                  <p className="text-stone-600 mt-1">Communities Served</p>
                  <p className="text-xs text-stone-500 mt-2">
                    Shelters, NGOs, and orphanages
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default MetricsPage;
