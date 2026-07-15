import React from 'react';
import { Layout } from '@/components/Layout';
import { AlertTriangle, Shield, Heart, Users, Gavel, FileText, Phone, Mail, Clock } from 'lucide-react';

interface DisclaimerProps {
  onNavigate?: (screen: string) => void;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ onNavigate = () => {} }) => {
  return (
    <Layout
      title="Legal Disclaimer"
      onBack={() => onNavigate('welcome')}
      showClose={true}
      onClose={() => onNavigate('welcome')}
    >
      <div className="px-4 py-6 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Legal Disclaimer</h2>
          <p className="text-white/80">Important legal notices and limitations</p>
          <p className="text-white/60 text-sm mt-2">Ontario, Canada Legal Framework</p>
        </div>

        {/* Disclaimer Content */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 space-y-8 text-sm md:text-base">
          {/* 1. General Disclaimer */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 mr-2 text-orange-500" />
              1. General Disclaimer of Warranties
            </h3>
            <div className="space-y-3 text-gray-700">
              <p className="leading-relaxed">
                The services provided by Dates.care Inc. are offered "as is" and "as available" without 
                warranties of any kind, either express or implied, to the fullest extent permitted by Ontario 
                and Canadian law.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-2">Specifically Disclaimed:</h4>
                <ul className="space-y-1 text-orange-800">
                  <li>• Warranties of merchantability or fitness for particular purpose</li>
                  <li>• Guarantees of service availability or uninterrupted operation</li>
                  <li>• Warranties regarding accuracy or completeness of user information</li>
                  <li>• Guarantees of successful romantic outcomes or relationships</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. Dating Service Specific Disclaimers */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Heart className="w-5 h-5 md:w-6 md:h-6 mr-2 text-pink-500" />
              2. Dating Service Disclaimers
            </h3>
            <div className="space-y-4 text-gray-700">
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <h4 className="font-semibold text-pink-900 mb-2">No Guarantee of Romantic Success</h4>
                <p className="text-pink-800 leading-relaxed">
                  Dates.care is a platform that facilitates introductions between consenting adults. 
                  We do not guarantee, warrant, or represent that you will:
                </p>
                <ul className="space-y-1 text-pink-800 mt-2">
                  <li>• Find a romantic partner or spouse</li>
                  <li>• Achieve successful dates or relationships</li>
                  <li>• Experience compatibility with matched users</li>
                  <li>• Meet users who accurately represent themselves</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Legal Contact Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-semibold text-gray-900">Dates.care Inc.</h4>
                <p className="text-gray-700">BIN Registration #1000890862</p>
                <p className="text-gray-700">HST/GST Registration #123456789RT0001</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                <div>
                  <p><strong>Legal Department:</strong> legal@dates.care</p>
                  <p><strong>Compliance Officer:</strong> compliance@dates.care</p>
                  <p><strong>Phone:</strong> +1-289-270-9919</p>
                </div>
                <div>
                  <p><strong>Registered Office:</strong></p>
                  <p>5515 Eglinton Ave</p>
                  <p>Etobicoke, ON M9C 5K5</p>
                  <p>Canada</p>
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
            onClick={() => onNavigate('dispute')}
            className="w-full bg-white/20 text-white py-3 rounded-xl hover:bg-white/30 transition-colors"
          >
            Dispute Resolution
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