import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Users, Heart, MessageCircle, Calendar, Star, Shield, Clock } from 'lucide-react';
import { BookingCalendar } from '@/components/BookingCalendar';

interface CoupleTherapyProps {
  onNavigate: (screen: string) => void;
}

export const CoupleTherapy: React.FC<CoupleTherapyProps> = ({ onNavigate }) => {
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);

  const therapists = [
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      specialization: 'Relationship Counseling',
      experience: '15 years',
      rating: 4.9,
      image: 'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$120/session',
      availability: 'Available today'
    },
    {
      id: '2',
      name: 'Dr. Michael Chen',
      specialization: 'Marriage Therapy',
      experience: '12 years',
      rating: 4.8,
      image: 'https://images.pexels.com/photos/4173239/pexels-photo-4173239.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$100/session',
      availability: 'Available tomorrow'
    },
    {
      id: '3',
      name: 'Dr. Emily Rodriguez',
      specialization: 'Communication Skills',
      experience: '10 years',
      rating: 4.9,
      image: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$110/session',
      availability: 'Available this week'
    }
  ];

  const services = [
    {
      icon: Heart,
      title: 'Relationship Building',
      description: 'Strengthen your bond and connection',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: MessageCircle,
      title: 'Communication Skills',
      description: 'Learn effective communication techniques',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Users,
      title: 'Conflict Resolution',
      description: 'Resolve conflicts in a healthy way',
      color: 'from-green-500 to-teal-500'
    },
    {
      icon: Shield,
      title: 'Trust Building',
      description: 'Rebuild and strengthen trust',
      color: 'from-purple-500 to-indigo-500'
    }
  ];

  const handleBookingConfirm = (therapistId: string, date: string, time: string) => {
    const therapist = therapists.find(t => t.id === therapistId);
    const formattedDate = new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    successMessage.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <div>
          <div class="font-bold">Couple Therapy Session Booked!</div>
          <div class="text-sm">${therapist?.name} • ${formattedDate} at ${time}</div>
        </div>
      </div>
    `;
    document.body.appendChild(successMessage);
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 7000);
  };

  return (
    <Layout
      title="Couple Therapy"
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400" 
            alt="Couple Therapy" 
            className="w-20 h-20 mx-auto mb-4 rounded-full object-cover shadow-lg"
          />
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Couple Therapy</h2>
          <p className="text-white/80">Professional guidance for stronger relationships</p>
        </div>

        {/* Services */}
        <div className="mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Our Services</h3>
          <div className="grid grid-cols-2 gap-4">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center"
                >
                  <div className={`w-12 h-12 mx-auto mb-3 bg-gradient-to-r ${service.color} rounded-full flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-white font-medium text-sm mb-2">{service.title}</h4>
                  <p className="text-white/70 text-xs">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Therapists */}
        <div className="mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Available Therapists</h3>
          <div className="space-y-4">
            {therapists.map((therapist) => (
              <div
                key={therapist.id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
              >
                <div className="flex items-start space-x-4">
                  <img
                    src={therapist.image}
                    alt={therapist.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-white font-medium">{therapist.name}</h4>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                        <span className="text-white text-sm">{therapist.rating}</span>
                      </div>
                    </div>
                    <p className="text-white/80 text-sm mb-1">{therapist.specialization}</p>
                    <p className="text-white/70 text-xs mb-2">{therapist.experience} experience • {therapist.rating}⭐</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium text-sm">{therapist.price}</span>
                      <span className="text-green-400 text-xs">{therapist.availability}</span>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedTherapist(therapist.id);
                        setShowBookingCalendar(true);
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm hover:scale-105 transition-all duration-300"
                      type="button"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Session
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-4">How It Works</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
              <div>
                <p className="text-white font-medium text-sm">Choose a Therapist</p>
                <p className="text-white/70 text-xs">Select from our certified professionals</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                2
              </div>
              <div>
                <p className="text-white font-medium text-sm">Book Your Session</p>
                <p className="text-white/70 text-xs">Schedule at your convenience</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                3
              </div>
              <div>
                <p className="text-white font-medium text-sm">Start Your Journey</p>
                <p className="text-white/70 text-xs">Begin building a stronger relationship</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Booking Calendar */}
      {showBookingCalendar && (
        <BookingCalendar
          therapists={therapists}
          onBookingConfirm={handleBookingConfirm}
          onClose={() => setShowBookingCalendar(false)}
          selectedTherapist={selectedTherapist}
        />
      )}
    </Layout>
  );
};