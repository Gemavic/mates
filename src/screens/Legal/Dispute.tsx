import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Scale, FileText, Phone, Mail, AlertCircle, CheckCircle, Gavel, Shield, Clock, Upload } from 'lucide-react';

interface DisputeProps {
  onNavigate?: (screen: string) => void;
}

export const Dispute: React.FC<DisputeProps> = ({ onNavigate = () => {} }) => {
  const [disputeType, setDisputeType] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    evidence: '',
    desiredResolution: '',
    incidentDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disputeTypes = [
    { id: 'billing', name: 'Billing Dispute', description: 'Issues with charges, refunds, or unauthorized transactions', legal: 'Consumer Protection Act, 2002 (Ontario)' },
    { id: 'service', name: 'Service Quality', description: 'Platform functionality or service delivery issues', legal: 'Sale of Goods Act (Ontario)' },
    { id: 'harassment', name: 'User Harassment', description: 'Report inappropriate user behavior or safety concerns', legal: 'Criminal Code of Canada s. 264' },
    { id: 'privacy', name: 'Privacy Violation', description: 'Unauthorized use or disclosure of personal information', legal: 'PIPEDA / Privacy Act' },
    { id: 'discrimination', name: 'Discrimination', description: 'Discriminatory treatment based on protected grounds', legal: 'Ontario Human Rights Code' },
    { id: 'contract', name: 'Contract Dispute', description: 'Disagreement regarding terms or service delivery', legal: 'Contract Law (Ontario)' }
  ];

  const handleSubmit = () => {
    if (!disputeType || !formData.name || !formData.email || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    // Simulate submission
    setTimeout(() => {
      const disputeId = 'DSP-' + Math.random().toString(36).substring(2).toUpperCase();
      
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <div>
            <div class="font-bold">Dispute Filed Successfully!</div>
            <div class="text-sm">Reference: ${disputeId}</div>
          </div>
        </div>
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 7000);

      // Reset form
      setFormData({ 
        name: '', 
        email: '', 
        phone: '', 
        description: '', 
        evidence: '', 
        desiredResolution: '', 
        incidentDate: '' 
      });
      setDisputeType('');
      setIsSubmitting(false);
    }, 2000);
  };

  return (
    <Layout
      title="Dispute Resolution"
      onBack={() => onNavigate('welcome')}
      showClose={true}
      onClose={() => onNavigate('welcome')}
    >
      <div className="px-4 py-6 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Scale className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Dispute Resolution</h2>
          <p className="text-white/80">Fair resolution under Ontario and Canadian law</p>
        </div>

        {/* Legal Framework */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-blue-800 font-semibold mb-3 flex items-center">
            <Gavel className="w-5 h-5 mr-2" />
            Ontario Alternative Dispute Resolution Process
          </h3>
          <div className="space-y-2 text-blue-700 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center font-bold">1</span>
              <span><strong>Informal Resolution:</strong> Direct negotiation (30 days)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center font-bold">2</span>
              <span><strong>Mediation:</strong> Ontario Commercial Mediation Centre</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center font-bold">3</span>
              <span><strong>Arbitration:</strong> Binding arbitration under Ontario Arbitration Act</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center font-bold">4</span>
              <span><strong>Court Action:</strong> Ontario Superior Court of Justice</span>
            </div>
          </div>
        </div>

        {/* Quick Resolution Options */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="text-green-800 font-semibold mb-3">Quick Resolution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-700 text-sm">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <div>
                <p className="font-medium">Emergency Line:</p>
                <p>+1-289-270-9919</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <div>
                <p className="font-medium">Dispute Email:</p>
                <p>disputes@dates.care</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dispute Form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Submit Formal Dispute
          </h3>
          
          {/* Dispute Type Selection */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-3">Dispute Category *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {disputeTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setDisputeType(type.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                    disputeType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <h4 className="font-medium text-sm mb-1">{type.name}</h4>
                  <p className="text-xs text-gray-600 mb-2">{type.description}</p>
                  <p className="text-xs text-blue-600 font-medium">Legal Basis: {type.legal}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Full Legal Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full legal name"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email Address *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email address"
                className="w-full"
              />
            </div>
          </div>

          {/* Dispute Details */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Detailed Description *</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Please provide a detailed description of your dispute..."
              className="min-h-[120px] w-full"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !disputeType || !formData.name || !formData.email || !formData.description}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Filing Dispute...
              </>
            ) : (
              <>
                <Scale className="w-4 h-4 mr-2" />
                Submit Formal Dispute
              </>
            )}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-4">
          <button
            onClick={() => onNavigate('terms')}
            className="w-full bg-white/20 text-white py-3 rounded-xl hover:bg-white/30 transition-colors"
          >
            View Terms of Service
          </button>
          <button
            onClick={() => onNavigate('welcome')}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl hover:scale-105 transition-all duration-300"
          >
            Back to App
          </button>
        </div>
      </div>
    </Layout>
  );
};