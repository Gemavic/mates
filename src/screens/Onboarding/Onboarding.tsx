import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  onBack: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    location: '',
    occupation: '',
    bio: '',
    interests: [] as string[],
    idealDate: ''
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const updateFormData = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Tell us about yourself
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Enter your name"
                  className="bg-white/90"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Age</label>
                <Input
                  type="number"
                  value={formData.age}
                  onChange={(e) => updateFormData('age', e.target.value)}
                  placeholder="Enter your age"
                  className="bg-white/90"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => updateFormData('location', e.target.value)}
                  placeholder="Enter your city"
                  className="bg-white/90"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Occupation</label>
                <Input
                  value={formData.occupation}
                  onChange={(e) => updateFormData('occupation', e.target.value)}
                  placeholder="What do you do?"
                  className="bg-white/90"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Add your photos
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className="aspect-square bg-white/20 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-white/40 hover:bg-white/30 transition-colors cursor-pointer"
                >
                  <Camera className="w-8 h-8 text-white/70 mb-2" />
                  <span className="text-white/70 text-sm">Add Photo</span>
                </div>
              ))}
            </div>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <Upload className="w-5 h-5 text-white" />
                <div>
                  <p className="text-white font-medium">Upload from gallery</p>
                  <p className="text-white/70 text-sm">Add up to 6 photos</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Write about yourself
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2">Bio</label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => updateFormData('bio', e.target.value)}
                  placeholder="Tell others about yourself..."
                  className="bg-white/90 min-h-[120px]"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Interests</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Travel', 'Music', 'Sports', 'Movies', 'Food', 'Art', 'Books', 'Gaming'].map((interest) => (
                    <button
                      key={interest}
                      onClick={() => {
                        const current = formData.interests;
                        const updated = current.includes(interest)
                          ? current.filter(i => i !== interest)
                          : [...current, interest];
                        updateFormData('interests', updated);
                      }}
                      className={`p-3 rounded-xl text-sm font-medium transition-colors ${
                        formData.interests.includes(interest)
                          ? 'bg-white text-pink-600'
                          : 'bg-white/20 text-white border border-white/30'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <img 
                src="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400" 
                alt="Dating visualization" 
                className="w-32 h-32 mx-auto mb-6 rounded-2xl object-cover shadow-lg"
              />
              <div className="w-32 h-32 mx-auto mb-6 relative">
                <img
                  src="https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=400"
                  alt="Dating visualization"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Your ideal date 💕 would be...
              </h2>
            </div>
            <div>
              <Textarea
                value={formData.idealDate}
                onChange={(e) => updateFormData('idealDate', e.target.value)}
                placeholder="Describe your perfect date..."
                className="bg-white/90 min-h-[120px] text-center"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout
      title="Your goals"
      onBack={handlePrevious}
      onClose={onBack}
    >
      <div className="pt-4">
        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={totalSteps}
          className="mb-8"
        />
        
        {renderStep()}
        
        <div className="px-6 pb-8">
          <Button
            onClick={handleNext}
            className="w-full h-12 bg-white text-pink-600 hover:bg-white/90 font-semibold rounded-xl"
            disabled={
              (currentStep === 1 && (!formData.name || !formData.age || !formData.location)) ||
              (currentStep === 3 && !formData.bio) ||
              (currentStep === 4 && !formData.idealDate)
            }
          >
            {currentStep === totalSteps ? 'Complete Profile' : 'Continue'}
          </Button>
        </div>
      </div>
    </Layout>
  );
};