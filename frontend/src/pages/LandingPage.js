import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, ArrowRight, Heart, Truck, Users, ShieldCheck, BarChart3, Clock } from 'lucide-react';

const LandingPage = () => {
  const features = [
    { icon: Heart, title: 'AI Food Analysis', desc: 'Smart freshness detection ensures only safe food gets distributed' },
    { icon: Truck, title: 'Route Optimization', desc: 'Intelligent volunteer matching for fastest delivery times' },
    { icon: Users, title: 'Community Network', desc: 'Connect donors, receivers, and volunteers seamlessly' },
    { icon: ShieldCheck, title: 'Food Safety', desc: 'Automated spoilage prediction protects receivers' },
    { icon: BarChart3, title: 'Impact Tracking', desc: 'Real-time metrics show environmental and social impact' },
    { icon: Clock, title: 'Real-time Tracking', desc: 'Live volunteer tracking like food delivery apps' }
  ];

  const stats = [
    { value: '10K+', label: 'Meals Saved' },
    { value: '500+', label: 'Partner Shelters' },
    { value: '2K+', label: 'Active Volunteers' },
    { value: '50T', label: 'CO₂ Reduced' }
  ];

  return (
    <div className="min-h-screen bg-[#FFFFF0]">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 section-padding">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#8A9A5B] rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#228B22] rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-[#228B22]/10 text-[#228B22] px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Leaf className="w-4 h-4" />
                Reducing food waste, one meal at a time
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-stone-800 tracking-tight mb-6" style={{ fontFamily: 'Manrope' }}>
                Bridge the gap between
                <span className="text-gradient block">surplus and need</span>
              </h1>
              
              <p className="text-lg text-stone-600 mb-8 max-w-lg leading-relaxed">
                FoodBridge uses AI to connect restaurants and events with surplus food to shelters and NGOs who need it. Fast, safe, and impactful.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="btn-primary inline-flex items-center justify-center gap-2" data-testid="hero-get-started">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/login" className="btn-secondary inline-flex items-center justify-center" data-testid="hero-login">
                  Sign In
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1771980589898-0bf5cab95a30?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwzfHx2b2x1bnRlZXJzJTIwZGlzdHJpYnV0aW5nJTIwZm9vZCUyMGNvbW11bml0eXxlbnwwfHx8fDE3NzI3NzIwNDJ8MA&ixlib=rb-4.1.0&q=85"
                  alt="Community food distribution"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex justify-between">
                  <div className="bg-white/90 backdrop-blur rounded-xl px-4 py-3">
                    <p className="text-2xl font-bold text-[#228B22]" style={{ fontFamily: 'Manrope' }}>1,234</p>
                    <p className="text-xs text-stone-600">Meals today</p>
                  </div>
                  <div className="bg-white/90 backdrop-blur rounded-xl px-4 py-3">
                    <p className="text-2xl font-bold text-[#8A9A5B]" style={{ fontFamily: 'Manrope' }}>89%</p>
                    <p className="text-xs text-stone-600">On-time delivery</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto section-padding">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-4xl md:text-5xl font-extrabold text-[#228B22]" style={{ fontFamily: 'Manrope' }}>{stat.value}</p>
                <p className="text-stone-600 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 section-padding">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4" style={{ fontFamily: 'Manrope' }}>
              Powered by AI, driven by compassion
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Our platform uses cutting-edge technology to ensure food gets where it's needed, safely and quickly.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="card-base p-6 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-[#8A9A5B]/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#8A9A5B]" />
                </div>
                <h3 className="text-xl font-semibold text-stone-800 mb-2" style={{ fontFamily: 'Manrope' }}>{feature.title}</h3>
                <p className="text-stone-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white section-padding">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4" style={{ fontFamily: 'Manrope' }}>
              How FoodBridge works
            </h2>
          </motion.div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Donor uploads', desc: 'Restaurants upload surplus food with photos' },
              { step: '02', title: 'AI analyzes', desc: 'Our AI checks freshness and predicts expiry' },
              { step: '03', title: 'Shelter accepts', desc: 'Nearby shelters get notified and accept' },
              { step: '04', title: 'Volunteer delivers', desc: 'Matched volunteer picks up and delivers' }
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-[#228B22] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4" style={{ fontFamily: 'Manrope' }}>
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-stone-800 mb-2" style={{ fontFamily: 'Manrope' }}>{item.title}</h3>
                <p className="text-stone-600 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 section-padding">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-[#228B22] rounded-3xl p-12 text-white"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
              Ready to make a difference?
            </h2>
            <p className="text-white/80 mb-8 max-w-lg mx-auto">
              Join thousands of donors, shelters, and volunteers already using FoodBridge to reduce food waste and hunger.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 bg-white text-[#228B22] font-semibold px-8 py-4 rounded-full hover:bg-stone-100 transition-colors" data-testid="cta-get-started">
              Start Today <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-stone-800 text-white section-padding">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#228B22] rounded-full flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>FoodBridge</span>
            </div>
            <p className="text-stone-400 text-sm">© 2024 FoodBridge. Reducing food waste, feeding communities.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
