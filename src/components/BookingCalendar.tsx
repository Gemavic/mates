import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BookingCalendarProps {
  therapists: Array<{
    id: string;
    name: string;
    specialization: string;
    experience: string;
    rating: number;
    image: string;
    price: string;
    availability: string;
  }>;
  onBookingConfirm: (therapistId: string, date: string, time: string) => void;
  onClose: () => void;
  selectedTherapist: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
  booked?: boolean;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  therapists,
  onBookingConfirm,
  onClose,
  selectedTherapist
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [viewMode, setViewMode] = useState<'therapist' | 'calendar' | 'time' | 'confirm'>('therapist');
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(selectedTherapist);

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDay.getMonth() === month;
      const isPast = currentDay < today;
      const isToday = currentDay.getTime() === today.getTime();
      const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;
      
      days.push({
        date: new Date(currentDay),
        isCurrentMonth,
        isPast,
        isToday,
        isWeekend,
        available: isCurrentMonth && !isPast && !isWeekend
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  // Generate time slots for selected date
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [
      { time: '09:00 AM', available: true },
      { time: '10:00 AM', available: true },
      { time: '11:00 AM', available: false, booked: true },
      { time: '12:00 PM', available: false, booked: true },
      { time: '01:00 PM', available: true },
      { time: '02:00 PM', available: true },
      { time: '03:00 PM', available: false, booked: true },
      { time: '04:00 PM', available: true },
      { time: '05:00 PM', available: true },
      { time: '06:00 PM', available: true },
      { time: '07:00 PM', available: false, booked: true },
      { time: '08:00 PM', available: true }
    ];
    return slots;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDateSelect = (date: Date) => {
    if (date >= new Date() && date.getDay() !== 0 && date.getDay() !== 6) {
      setSelectedDate(date.toISOString().split('T')[0]);
      setViewMode('time');
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setViewMode('confirm');
  };

  const handleConfirmBooking = () => {
    if (selectedTherapistId && selectedDate && selectedTime) {
      onBookingConfirm(selectedTherapistId, selectedDate, selectedTime);
      onClose();
    }
  };

  const calendarDays = generateCalendarDays();
  const timeSlots = generateTimeSlots();
  const currentTherapist = therapists.find(t => t.id === selectedTherapistId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-blue-500" />
            Book Session
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {['Therapist', 'Date', 'Time', 'Confirm'].map((step, index) => (
              <React.Fragment key={step}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                  index < ['therapist', 'calendar', 'time', 'confirm'].indexOf(viewMode) + 1
                    ? 'bg-green-500 text-white'
                    : index === ['therapist', 'calendar', 'time', 'confirm'].indexOf(viewMode)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                )}>
                  {index + 1}
                </div>
                {index < 3 && <div className="flex-1 h-1 bg-gray-300 rounded"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Therapist Selection */}
          {viewMode === 'therapist' && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Your Therapist</h4>
              {therapists.map((therapist) => (
                <button
                  key={therapist.id}
                  onClick={() => {
                    setSelectedTherapistId(therapist.id);
                    setViewMode('calendar');
                  }}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all duration-300 text-left",
                    selectedTherapistId === therapist.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={therapist.image}
                      alt={therapist.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900">{therapist.name}</h5>
                      <p className="text-sm text-gray-600 mb-1">{therapist.specialization}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{therapist.experience}</span>
                        <span>⭐ {therapist.rating}</span>
                        <span className="font-medium text-green-600">{therapist.price}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="space-y-6">
              {/* Selected Therapist Info */}
              {currentTherapist && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <img
                      src={currentTherapist.image}
                      alt={currentTherapist.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h5 className="font-semibold text-gray-900">{currentTherapist.name}</h5>
                      <p className="text-sm text-gray-600">{currentTherapist.specialization}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h4 className="text-lg font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar Days */}
                {calendarDays.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(day.date)}
                    disabled={!day.available}
                    className={cn(
                      "aspect-square flex items-center justify-center text-sm rounded-lg transition-all duration-200",
                      !day.isCurrentMonth && "text-gray-300",
                      day.isPast && "text-gray-300 cursor-not-allowed",
                      day.isWeekend && day.isCurrentMonth && "bg-gray-100 text-gray-400 cursor-not-allowed",
                      day.isToday && "bg-blue-500 text-white font-bold",
                      day.available && !day.isToday && "hover:bg-blue-100 text-gray-700 cursor-pointer",
                      selectedDate === day.date.toISOString().split('T')[0] && "bg-green-500 text-white font-bold"
                    )}
                  >
                    {day.date.getDate()}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <span>Unavailable</span>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={() => setViewMode('therapist')}
                  className="flex-1 bg-gray-500 text-white hover:bg-gray-600"
                >
                  ← Back
                </Button>
                <Button
                  onClick={() => setViewMode('time')}
                  disabled={!selectedDate}
                  className="flex-1 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  Select Time →
                </Button>
              </div>
            </div>
          )}

          {/* Time Selection */}
          {viewMode === 'time' && (
            <div className="space-y-6">
              {/* Selected Date Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-8 h-8 text-blue-500" />
                  <div>
                    <h5 className="font-semibold text-gray-900">
                      {new Date(selectedDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h5>
                    <p className="text-sm text-gray-600">
                      with {currentTherapist?.name}
                    </p>
                  </div>
                </div>
              </div>

              <h4 className="text-lg font-semibold text-gray-900">Available Times</h4>
              
              {/* Morning Slots */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-700">Morning</h5>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.filter(slot => slot.time.includes('AM')).map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => handleTimeSelect(slot.time)}
                      disabled={!slot.available}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all duration-300 text-sm",
                        !slot.available && slot.booked && "border-red-200 bg-red-50 text-red-400 cursor-not-allowed",
                        !slot.available && !slot.booked && "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed",
                        slot.available && selectedTime !== slot.time && "border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer",
                        selectedTime === slot.time && "border-green-500 bg-green-50 text-green-700"
                      )}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{slot.time}</span>
                      </div>
                      {slot.booked && (
                        <div className="text-xs text-red-500 mt-1">Booked</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Afternoon/Evening Slots */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-700">Afternoon & Evening</h5>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.filter(slot => slot.time.includes('PM')).map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => handleTimeSelect(slot.time)}
                      disabled={!slot.available}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all duration-300 text-sm",
                        !slot.available && slot.booked && "border-red-200 bg-red-50 text-red-400 cursor-not-allowed",
                        !slot.available && !slot.booked && "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed",
                        slot.available && selectedTime !== slot.time && "border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer",
                        selectedTime === slot.time && "border-green-500 bg-green-50 text-green-700"
                      )}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{slot.time}</span>
                      </div>
                      {slot.booked && (
                        <div className="text-xs text-red-500 mt-1">Booked</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={() => setViewMode('calendar')}
                  className="flex-1 bg-gray-500 text-white hover:bg-gray-600"
                >
                  ← Change Date
                </Button>
                <Button
                  onClick={() => setViewMode('confirm')}
                  disabled={!selectedTime}
                  className="flex-1 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  Continue →
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {viewMode === 'confirm' && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900">Confirm Your Booking</h4>
              
              {/* Booking Summary */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={currentTherapist?.image}
                    alt={currentTherapist?.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h5 className="font-semibold text-gray-900">{currentTherapist?.name}</h5>
                    <p className="text-sm text-gray-600">{currentTherapist?.specialization}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        ⭐ {currentTherapist?.rating}
                      </span>
                      <span className="text-xs text-gray-500">{currentTherapist?.experience}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Date:</span>
                    </div>
                    <span className="text-sm text-gray-900 font-semibold">
                      {new Date(selectedDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Time:</span>
                    </div>
                    <span className="text-sm text-gray-900 font-semibold">{selectedTime}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Session Fee:</span>
                    </div>
                    <span className="text-lg text-gray-900 font-bold">{currentTherapist?.price}</span>
                  </div>
                </div>
              </div>

              {/* Session Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h5 className="font-semibold text-blue-900 mb-2">Session Information</h5>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Session duration: 60 minutes</li>
                  <li>• Video/audio call via secure platform</li>
                  <li>• Cancellation allowed up to 24 hours before</li>
                  <li>• Confidential and HIPAA compliant</li>
                </ul>
              </div>

              {/* Navigation Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={() => setViewMode('time')}
                  className="flex-1 bg-gray-500 text-white hover:bg-gray-600"
                >
                  ← Back
                </Button>
                <Button
                  onClick={handleConfirmBooking}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white hover:scale-105 transition-all duration-300"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Booking
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};