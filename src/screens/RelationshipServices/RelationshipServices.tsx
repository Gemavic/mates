import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Users, Heart, MessageCircle, Calendar, Star, Shield, Phone, Video, Brain } from 'lucide-react';
import { BookingCalendar } from '@/components/BookingCalendar';

interface RelationshipServicesProps {
  onNavigate: (screen: string) => void;
}

export const RelationshipServices: React.FC<RelationshipServicesProps> = ({ onNavigate }) => {
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);

  const therapists = [
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      specialization: 'Relationship & Communication Expert',
      experience: '15 years',
      rating: 4.9,
      image: 'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$120/session',
      availability: 'Available today',
      expertise: ['Couple Therapy', 'Conflict Resolution', 'Marriage Counseling']
    },
    {
      id: '2',
      name: 'Dr. Michael Chen',
      specialization: 'Dating & Self-Confidence Coach',
      experience: '12 years',
      rating: 4.8,
      image: 'https://images.pexels.com/photos/4173239/pexels-photo-4173239.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$100/session',
      availability: 'Available tomorrow',
      expertise: ['Dating Anxiety', 'Self-Esteem', 'Personal Growth']
    },
    {
      id: '3',
      name: 'Dr. Emily Rodriguez',
      specialization: 'Trust & Communication Specialist',
      experience: '10 years',
      rating: 4.9,
      image: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$110/session',
      availability: 'Available this week',
      expertise: ['Trust Building', 'Communication Skills', 'Relationship Healing']
    },
    {
      id: '4',
      name: 'Dr. James Wilson',
      specialization: 'Anxiety & Trauma Recovery Expert',
      experience: '13 years',
      rating: 4.9,
      image: 'https://images.pexels.com/photos/6560258/pexels-photo-6560258.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$115/session',
      availability: 'Available today',
      expertise: ['Past Trauma', 'Anxiety Management', 'Emotional Healing']
    }
  ];

  const services = [
    {
      icon: Heart,
      title: 'Couple Therapy',
      description: 'Strengthen your relationship bond',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: MessageCircle,
      title: 'Communication',
      description: 'Improve dialogue and understanding',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Brain,
      title: 'Dating Confidence',
      description: 'Build self-esteem and overcome fears',
      color: 'from-green-500 to-teal-500'
    },
    {
      icon: Shield,
      title: 'Trust & Healing',
      description: 'Recover from past trauma',
      color: 'from-purple-500 to-violet-500'
    },
    {
      icon: Users,
      title: 'Conflict Resolution',
      description: 'Healthy ways to resolve disputes',
      color: 'from-orange-500 to-amber-500'
    },
    {
      icon: Heart,
      title: 'Relationship Building',
      description: 'Create meaningful connections',
      color: 'from-red-500 to-pink-500'
    }
  ];

  const sessionModes = [
    { icon: Video, name: 'Video Call', description: 'Face-to-face sessions' },
    { icon: Phone, name: 'Voice Call', description: 'Audio-only sessions' },
    { icon: MessageCircle, name: 'Text Chat', description: 'Written conversations' }
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
          <div class="font-bold">Session Booked!</div>
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
      title="Relationship Services"
      onBack={() => onNavigate('welcome')}
      showClose={false}
    >
      <div className="px-4 py-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Relationship Services</h2>
          <p className="text-white/80">Professional guidance for personal growth and healthy relationships</p>
        </div>

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

        <div className="mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Session Options</h3>
          <div className="grid grid-cols-3 gap-3">
            {sessionModes.map((mode, index) => {
              const Icon = mode.icon;
              return (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center"
                >
                  <Icon className="w-8 h-8 text-white mx-auto mb-2" />
                  <h4 className="text-white font-medium text-sm mb-1">{mode.name}</h4>
                  <p className="text-white/70 text-xs">{mode.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Our Professionals</h3>
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
                    <p className="text-white/70 text-xs mb-2">{therapist.experience} experience</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {therapist.expertise.map((exp, idx) => (
                        <span key={idx} className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                          {exp}
                        </span>
                      ))}
                    </div>
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
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm hover:scale-105 transition-all duration-300"
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

        <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-4 mb-8">
          <div className="text-center">
            <Shield className="w-12 h-12 text-white mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-2">Need Immediate Support?</h3>
            <p className="text-white/90 text-sm mb-4">
              If you're experiencing a crisis, we're here to help 24/7
            </p>
            <Button
              className="bg-white text-red-500 font-semibold px-6 py-2 hover:scale-105 transition-all duration-300"
              onClick={() => {
                const successMessage = document.createElement('div');
                successMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                successMessage.textContent = 'Emergency support contacted. Help is on the way.';
                document.body.appendChild(successMessage);
                setTimeout(() => {
                  if (document.body.contains(successMessage)) {
                    document.body.removeChild(successMessage);
                  }
                }, 5000);
              }}
              type="button"
            >
              Emergency Support
            </Button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-4">How It Works</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
              <div>
                <p className="text-white font-medium text-sm">Choose a Professional</p>
                <p className="text-white/70 text-xs">Select from our certified experts</p>
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
                <p className="text-white/70 text-xs">Begin your path to growth and healing</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
