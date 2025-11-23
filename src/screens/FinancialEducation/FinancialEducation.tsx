import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, PieChart, Target, Calendar, Star, BookOpen, Briefcase } from 'lucide-react';
import { BookingCalendar } from '@/components/BookingCalendar';

interface FinancialEducationProps {
  onNavigate: (screen: string) => void;
}

export const FinancialEducation: React.FC<FinancialEducationProps> = ({ onNavigate }) => {
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(null);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);

  const advisors = [
    {
      id: '1',
      name: 'Dr. Matthew Dare',
      specialization: 'Investment Strategy & Wealth Management',
      experience: '18 years',
      rating: 4.9,
      image: 'https://images.pexels.com/photos/3760607/pexels-photo-3760607.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$150/session',
      availability: 'Available today',
      expertise: ['Investment Planning', 'Portfolio Management', 'Retirement Strategy', 'Risk Management'],
      credentials: 'CFP, CFA'
    },
    {
      id: '2',
      name: 'Mina Armis',
      specialization: 'Personal Finance & Budgeting Expert',
      experience: '12 years',
      rating: 4.9,
      image: 'https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$125/session',
      availability: 'Available tomorrow',
      expertise: ['Budget Planning', 'Debt Management', 'Savings Strategy', 'Financial Goals'],
      credentials: 'CFP, MBA Finance'
    }
  ];

  const services = [
    {
      icon: DollarSign,
      title: 'Budget Planning',
      description: 'Create sustainable spending plans',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: TrendingUp,
      title: 'Investment Advice',
      description: 'Smart investing strategies',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: PieChart,
      title: 'Wealth Management',
      description: 'Grow and protect your assets',
      color: 'from-purple-500 to-violet-500'
    },
    {
      icon: Target,
      title: 'Financial Goals',
      description: 'Plan for your future dreams',
      color: 'from-orange-500 to-amber-500'
    },
    {
      icon: Briefcase,
      title: 'Retirement Planning',
      description: 'Secure your future retirement',
      color: 'from-red-500 to-pink-500'
    },
    {
      icon: BookOpen,
      title: 'Financial Literacy',
      description: 'Learn money management skills',
      color: 'from-teal-500 to-cyan-500'
    }
  ];

  const topics = [
    {
      title: 'Starting Your Financial Journey',
      description: 'Learn the basics of personal finance and budgeting',
      duration: '4-6 sessions',
      level: 'Beginner'
    },
    {
      title: 'Investment Fundamentals',
      description: 'Understanding stocks, bonds, and mutual funds',
      duration: '6-8 sessions',
      level: 'Intermediate'
    },
    {
      title: 'Advanced Portfolio Management',
      description: 'Sophisticated investment strategies and risk management',
      duration: '8-10 sessions',
      level: 'Advanced'
    },
    {
      title: 'Retirement & Estate Planning',
      description: 'Securing your financial future and legacy',
      duration: '6-8 sessions',
      level: 'All Levels'
    }
  ];

  const handleBookingConfirm = (advisorId: string, date: string, time: string) => {
    const advisor = advisors.find(a => a.id === advisorId);
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
          <div class="font-bold">Financial Consultation Booked!</div>
          <div class="text-sm">${advisor?.name} • ${formattedDate} at ${time}</div>
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
      title="Financial Education"
      onBack={() => onNavigate('welcome')}
      showClose={false}
    >
      <div className="px-4 py-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <DollarSign className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Financial Education</h2>
          <p className="text-white/80">Expert guidance for your financial success and independence</p>
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
          <h3 className="text-white font-semibold text-lg mb-4">Learning Paths</h3>
          <div className="space-y-4">
            {topics.map((topic, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-medium">{topic.title}</h4>
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {topic.level}
                  </span>
                </div>
                <p className="text-white/80 text-sm mb-2">{topic.description}</p>
                <p className="text-white/60 text-xs">{topic.duration}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Our Financial Advisors</h3>
          <div className="space-y-4">
            {advisors.map((advisor) => (
              <div
                key={advisor.id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
              >
                <div className="flex items-start space-x-4">
                  <img
                    src={advisor.image}
                    alt={advisor.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-white font-medium">{advisor.name}</h4>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                        <span className="text-white text-sm">{advisor.rating}</span>
                      </div>
                    </div>
                    <p className="text-white/80 text-sm mb-1">{advisor.specialization}</p>
                    <p className="text-white/70 text-xs mb-2">{advisor.experience} experience • {advisor.credentials}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {advisor.expertise.map((exp, idx) => (
                        <span key={idx} className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                          {exp}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium text-sm">{advisor.price}</span>
                      <span className="text-green-400 text-xs">{advisor.availability}</span>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedAdvisor(advisor.id);
                        setShowBookingCalendar(true);
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white text-sm hover:scale-105 transition-all duration-300"
                      type="button"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Consultation
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-4 mb-8">
          <div className="text-center">
            <BookOpen className="w-12 h-12 text-white mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-2">Free Financial Resources</h3>
            <p className="text-white/90 text-sm mb-4">
              Access our library of educational materials, calculators, and guides
            </p>
            <Button
              className="bg-white text-blue-500 font-semibold px-6 py-2 hover:scale-105 transition-all duration-300"
              onClick={() => {
                const successMessage = document.createElement('div');
                successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                successMessage.textContent = 'Access granted! Check your email for resources.';
                document.body.appendChild(successMessage);
                setTimeout(() => {
                  if (document.body.contains(successMessage)) {
                    document.body.removeChild(successMessage);
                  }
                }, 5000);
              }}
              type="button"
            >
              Access Resources
            </Button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-4">Why Choose Our Financial Education?</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Certified Professionals</p>
                <p className="text-white/70 text-xs">All advisors are licensed and certified experts</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Personalized Approach</p>
                <p className="text-white/70 text-xs">Tailored advice based on your unique situation</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Practical Strategies</p>
                <p className="text-white/70 text-xs">Actionable plans you can implement immediately</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBookingCalendar && (
        <BookingCalendar
          therapists={advisors}
          onBookingConfirm={handleBookingConfirm}
          onClose={() => setShowBookingCalendar(false)}
          selectedTherapist={selectedAdvisor}
        />
      )}
    </Layout>
  );
};
