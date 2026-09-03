import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Users, Heart, MessageCircle, Calendar, Shield } from 'lucide-react';
import { BookingCalendar } from '@/components/BookingCalendar';
import { CrisisSupport } from '@/components/CrisisSupport';
import { loadPractitioners, requestBooking, formatFee } from '@/lib/practitioners';
import { useAuth } from '@/hooks/useAuth';

interface CoupleTherapyProps {
  onNavigate: (screen: string) => void;
}

export const CoupleTherapy: React.FC<CoupleTherapyProps> = ({ onNavigate }) => {
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);
  const [showCrisisSupport, setShowCrisisSupport] = useState(false);
  const [bookingNotice, setBookingNotice] = useState<string | null>(null);
  const { user } = useAuth();

  // The roster used to be four invented people written into this file, with
  // stock photographs and credentials nobody had checked. It comes from the
  // database now, and only practitioners somebody has verified are returned.
  const [therapists, setTherapists] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadPractitioners('couple_therapy').then((rows) => {
      if (cancelled) return;
      setTherapists(rows.map((p) => ({
        id: p.id,
        name: p.title ? `${p.title} ${p.full_name}` : p.full_name,
        specialization: p.specialization ?? '',
        experience: p.experience_years ? `${p.experience_years} years` : '',
        image: p.photo_url ?? '',
        price: formatFee(p) ?? 'Fee on request',
        availability: p.availability_note ?? '',
        expertise: [] as string[],
      })));
      setLoadingRoster(false);
    });
    return () => { cancelled = true; };
  }, []);


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

  const handleBookingConfirm = async (therapistId: string, date: string, time: string) => {
    // This used to pop up "Couple Therapy Session Booked!" and save nothing
    // anywhere, so the member believed they had an appointment that did not
    // exist and nobody would ever turn up to. It records a real request now,
    // and says only what is true about it.
    if (!user) {
      setBookingNotice('Please sign in first so we can send your confirmation.');
      return;
    }
    const therapist = therapists.find((t) => t.id === therapistId);
    const result = await requestBooking({
      userId: user.id,
      service: 'couple_therapy',
      practitionerId: therapistId,
      practitionerName: therapist?.name ?? 'practitioner',
      date,
      time,
    });

    if (!result.ok) {
      setBookingNotice(result.error ?? 'Your request could not be saved.');
      return;
    }

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    setBookingNotice(
      `Request sent for ${formattedDate} at ${time} with ${therapist?.name ?? 'your practitioner'}. ` +
      'This is not confirmed yet - we will be in touch to arrange it, and you are not charged until it is agreed.'
    );
  };

  return (
    <Layout
      onNavigate={onNavigate}
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
            {!loadingRoster && therapists.length === 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                <p className="text-white font-medium mb-1">No practitioners listed yet</p>
                <p className="text-white/70 text-sm">
                  We are onboarding qualified professionals and verifying their
                  credentials before they appear here. Nobody is bookable until
                  that is done.
                </p>
              </div>
            )}
            {loadingRoster && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                <p className="text-white/70 text-sm">Loading practitioners...</p>
              </div>
            )}
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
                    </div>
                    <p className="text-white/80 text-sm mb-1">{therapist.specialization}</p>
                    <p className="text-white/70 text-xs mb-2">{therapist.experience && `${therapist.experience} experience`}</p>
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
      {bookingNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <p className="mb-4 text-sm text-gray-800">{bookingNotice}</p>
            <button
              onClick={() => setBookingNotice(null)}
              className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showCrisisSupport && <CrisisSupport onClose={() => setShowCrisisSupport(false)} />}

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