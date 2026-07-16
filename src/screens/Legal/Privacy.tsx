import React from 'react';
import { Layout } from '@/components/Layout';
import { Shield, Lock, Database, MapPin, Phone, Mail } from 'lucide-react';

interface PrivacyProps {
  onNavigate?: (screen: string) => void;
}

export const Privacy: React.FC<PrivacyProps> = ({ onNavigate = () => {} }) => {
  return (
    <Layout
      title="Privacy Policy"
      onBack={() => onNavigate('welcome')}
      showClose={true}
      onClose={() => onNavigate('welcome')}
    >
      <div className="px-4 py-6 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Privacy Policy</h2>
          <p className="text-white/80">Last updated: January 14, 2025</p>
          <p className="text-white/60 text-sm mt-2">PIPEDA & CPPA Compliant</p>
        </div>

        {/* Privacy Content */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 space-y-8 text-sm md:text-base">
          {/* 1. Information Collection - PIPEDA Compliance */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Database className="w-5 h-5 md:w-6 md:h-6 mr-2 text-blue-500" />
              1. Information We Collect (PIPEDA Principle 4)
            </h3>
            <div className="space-y-4 text-gray-700">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Personal Information Under PIPEDA</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800">
                  <div>
                    <h5 className="font-medium mb-1">Identity Information:</h5>
                    <ul className="space-y-1 text-sm">
                      <li>• Full legal name</li>
                      <li>• Date of birth (age verification)</li>
                      <li>• Government-issued photo ID</li>
                      <li>• Verification selfie photographs</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-1">Contact Information:</h5>
                    <ul className="space-y-1 text-sm">
                      <li>• Email address</li>
                      <li>• Phone number</li>
                      <li>• Residential address</li>
                      <li>• IP address and device info</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Legal Basis for Processing */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="w-5 h-5 md:w-6 md:h-6 mr-2 text-green-500" />
              2. Legal Basis for Processing
            </h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-3">Under Canadian Privacy Legislation:</h4>
              <div className="space-y-2 text-green-800">
                <div className="flex items-start space-x-2">
                  <span className="font-medium">Consent:</span>
                  <span>Express consent for sensitive personal information collection</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium">Contract:</span>
                  <span>Necessary for service delivery and platform operation</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium">Legal Obligation:</span>
                  <span>Age verification, safety monitoring, regulatory compliance</span>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Your Privacy Rights */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">3. Your Privacy Rights Under Canadian Law</h3>
            <div className="space-y-4 text-gray-700">
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <h4 className="font-semibold text-cyan-900 mb-2">PIPEDA Individual Rights</h4>
                <ul className="space-y-1 text-cyan-800">
                  <li>• <strong>Right to Access:</strong> Request copies of your personal information</li>
                  <li>• <strong>Right to Correction:</strong> Update or correct inaccurate information</li>
                  <li>• <strong>Right to Deletion:</strong> Request deletion of your personal data</li>
                  <li>• <strong>Right to Portability:</strong> Export your data in standard format</li>
                  <li>• <strong>Right to Withdraw Consent:</strong> Revoke consent for data processing</li>
                  <li>• <strong>Right to Complain:</strong> File complaints with Privacy Commissioner</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">4. Privacy Contact Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Chief Privacy Officer
                </h4>
                <p className="text-gray-700">Dates.care Inc.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                <div>
                  <div className="flex items-center mb-2">
                    <Mail className="w-4 h-4 mr-2 text-blue-500" />
                    <span><strong>Email:</strong> privacy@dates.care</span>
                  </div>
                  <div className="flex items-center mb-2">
                    <Phone className="w-4 h-4 mr-2 text-green-500" />
                    <span><strong>Phone:</strong> +1-289-270-9919</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 text-purple-500 mt-0.5" />
                    <div>
                      <p><strong>Address:</strong></p>
                      <p>Chief Privacy Officer</p>
                      <p>Dates.care Inc.</p>
                      <p>5515 Eglinton Ave</p>
                      <p>Etobicoke, ON M9C 5K5</p>
                      <p>Canada</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
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
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl hover:scale-105 transition-all duration-300"
          >
            Back to App
          </button>
        </div>
      </div>
    </Layout>
  );
};