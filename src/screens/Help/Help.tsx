import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HelpCircle, MessageCircle, Phone, Mail, Shield, CreditCard, Users, Video, Search, Book } from 'lucide-react';

interface HelpProps {
  onNavigate: (screen: string) => void;
}

export const Help: React.FC<HelpProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'guides'>('faq');
  const [searchTerm, setSearchTerm] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const faqCategories = [
    {
      title: 'Getting Started',
      questions: [
        {
          question: 'How do I create my profile?',
          answer: 'Go to Profile settings and add your photos, bio, and interests. A complete profile gets more matches!'
        },
        {
          question: 'How does the matching system work?',
          answer: 'Our AI analyzes your preferences, interests, and behavior to suggest compatible matches.'
        },
        {
          question: 'How do I get verified?',
          answer: 'Upload a government ID and selfie in the Verification section. Verified profiles get priority placement.'
        }
      ]
    },
    {
      title: 'Credits & Payments',
      questions: [
        {
          question: 'How do credits work?',
          answer: 'Credits are used for premium features like chat, video calls, and gifts. 1 credit = various actions.'
        },
        {
          question: 'What are Kobos?',
          answer: 'Kobos are special credits for chat. 1 kobo = 1 minute of live chat with matches.'
        },
        {
          question: 'Can I get a refund?',
          answer: 'All purchases are final as per our Terms of Service. Contact support for special circumstances.'
        }
      ]
    },
    {
      title: 'Safety & Privacy',
      questions: [
        {
          question: 'How do I report someone?',
          answer: 'Tap the menu (⋯) on their profile and select Report. We take safety seriously.'
        },
        {
          question: 'How do I block a user?',
          answer: 'Tap the menu (⋯) on their profile and select Block. They won\'t be able to contact you.'
        },
        {
          question: 'Is my data secure?',
          answer: 'Yes, we use 256-bit SSL encryption and comply with PIPEDA privacy laws in Canada.'
        }
      ]
    },
    {
      title: 'Features & Usage',
      questions: [
        {
          question: 'How do video calls work?',
          answer: 'Video calls cost 60 credits per minute. Both users need sufficient credits to start a call.'
        },
        {
          question: 'How do I send gifts?',
          answer: 'Visit the Gift Shop and choose from virtual gifts ranging from 3-1000 credits.'
        },
        {
          question: 'What\'s the difference between Chat and Mail?',
          answer: 'Chat is real-time messaging (2 credits/minute), Mail is like email (10-30 credits per message).'
        }
      ]
    }
  ];

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Get help via email',
      contact: 'support@dates.care',
      responseTime: '24-48 hours'
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Speak with our team',
      contact: '+1-289-270-9919',
      responseTime: 'Mon-Fri 9AM-6PM EST'
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Instant messaging support',
      contact: 'Available in app',
      responseTime: 'Usually within 1 hour'
    }
  ];

  const userGuides = [
    {
      id: 'profile-optimization',
      title: 'Profile Optimization Guide',
      description: 'Learn how to create an attractive profile that gets matches',
      icon: Users,
      sections: ['Photo tips', 'Bio writing', 'Interest selection'],
      content: [
        {
          title: 'Photo Tips',
          items: [
            'Use high-quality, recent photos',
            'Show your face clearly in the main photo', 
            'Include variety: close-up, full body, activity shots',
            'Smile genuinely and make eye contact'
          ]
        },
        {
          title: 'Bio Writing',
          items: [
            'Keep it concise but engaging (150-300 words)',
            'Show your personality and sense of humor',
            'Mention your interests and hobbies',
            'Be specific about what you\'re looking for'
          ]
        },
        {
          title: 'Interest Selection',
          items: [
            'Choose interests that truly represent you',
            'Include both active and relaxed activities',
            'Consider conversation starters',
            'Update interests regularly to stay current'
          ]
        }
      ]
    },
    {
      id: 'credit-system',
      title: 'Credit System Guide',
      description: 'Understand how to use credits and kobos effectively',
      icon: CreditCard,
      sections: ['Credit pricing', 'Kobo usage', 'Payment methods'],
      content: [
        {
          title: 'Credit Pricing',
          items: [
            'Chat: 2 credits per minute',
            'Mail: 10-30 credits per message',
            'Video calls: 60 credits per minute',
            'Virtual gifts: 3-1000 credits'
          ]
        },
        {
          title: 'Kobo Usage',
          items: [
            '1 kobo = 1 minute of chat',
            'Alternative to credits for chat',
            'Purchase kobos in bulk for better value'
          ]
        },
        {
          title: 'Payment Methods',
          items: [
            'Credit cards (Visa, Mastercard, Amex)',
            'Cryptocurrency (Bitcoin, Ethereum, etc.)',
            'Mobile payments (Apple Pay, Google Pay)'
          ]
        }
      ]
    },
    {
      id: 'safety-security',
      title: 'Safety & Security Guide',
      description: 'Stay safe while dating online',
      icon: Shield,
      sections: ['Safe dating tips', 'Privacy settings', 'Reporting users'],
      content: [
        {
          title: 'Safe Dating Tips',
          items: [
            'Meet in public places for first dates',
            'Tell friends about your date plans',
            'Trust your instincts',
            'Video chat before meeting in person'
          ]
        },
        {
          title: 'Privacy Settings',
          items: [
            'Control who can see your profile',
            'Manage your online status visibility',
            'Set distance preferences',
            'Configure notification settings'
          ]
        },
        {
          title: 'Reporting Users',
          items: [
            'Report inappropriate behavior immediately',
            'Block users who make you uncomfortable',
            'Contact support for serious issues',
            'Keep evidence of harassment'
          ]
        }
      ]
    },
    {
      id: 'video-chat',
      title: 'Video Chat Guide',
      description: 'Make the most of video calling features',
      icon: Video,
      sections: ['Starting calls', 'Call controls', 'Troubleshooting'],
      content: [
        {
          title: 'Starting Calls',
          items: [
            'Ensure you have sufficient credits (60 per minute)',
            'Click the video call button on match profiles',
            'Wait for the other person to accept',
            'Check your camera and microphone'
          ]
        },
        {
          title: 'Call Controls',
          items: [
            'Mute/unmute microphone',
            'Turn camera on/off',
            'End call anytime',
            'Adjust video quality in settings'
          ]
        },
        {
          title: 'Troubleshooting',
          items: [
            'Check internet connection',
            'Allow camera/microphone permissions',
            'Refresh browser if issues persist',
            'Contact support: +1-289-270-9919'
          ]
        }
      ]
    }
  ];

  const toggleGuide = (guideId: string) => {
    setExpandedGuide(expandedGuide === guideId ? null : guideId);
  };

  const handleContactSubmit = () => {
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) {
      alert('Please fill in all fields');
      return;
    }

    const ticketId = 'TKT-' + Math.random().toString(36).substring(2).toUpperCase();

    // ⚠️ SECURITY FIX: Replaced innerHTML with textContent to prevent XSS
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';

    // Create structure using DOM methods instead of innerHTML
    const messageContent = document.createElement('div');
    messageContent.className = 'flex items-center space-x-2';

    const textDiv = document.createElement('div');
    const titleDiv = document.createElement('div');
    titleDiv.className = 'font-bold';
    titleDiv.textContent = 'Support Ticket Created!';

    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'text-sm';
    ticketDiv.textContent = 'Ticket ID: ' + ticketId;

    textDiv.appendChild(titleDiv);
    textDiv.appendChild(ticketDiv);
    messageContent.appendChild(textDiv);
    successMessage.appendChild(messageContent);

    document.body.appendChild(successMessage);
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 7000);

    // Reset form
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

  const renderFAQ = () => (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search FAQ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/20 text-white placeholder-white/50 border-white/30"
        />
      </div>

      {/* FAQ Categories */}
      {faqCategories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <h4 className="text-white font-semibold text-lg mb-4">{category.title}</h4>
          <div className="space-y-3">
            {category.questions
              .filter(q => 
                searchTerm === '' || 
                q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.answer.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((faq, index) => (
                <details key={index} className="group">
                  <summary className="flex items-center justify-between p-3 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
                    <span className="text-white font-medium text-sm">{faq.question}</span>
                    <HelpCircle className="w-4 h-4 text-white/70 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-2 p-3 bg-white/5 rounded-lg">
                    <p className="text-white/80 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                </details>
              ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderContact = () => (
    <div className="space-y-6">
      {/* Contact Methods */}
      <div className="grid grid-cols-1 gap-4">
        {contactMethods.map((method, index) => {
          const Icon = method.icon;
          return (
            <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">{method.title}</h4>
                  <p className="text-white/70 text-sm mb-1">{method.description}</p>
                  <p className="text-white font-medium text-sm">{method.contact}</p>
                  <p className="text-white/60 text-xs">{method.responseTime}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact Form */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
        <h4 className="text-white font-semibold text-lg mb-4">Send Us a Message</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">Name</label>
              <Input
                value={contactForm.name}
                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
                className="bg-white/20 text-white placeholder-white/50 border-white/30"
              />
            </div>
            <div>
              <label className="block text-white font-medium mb-2">Email</label>
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your@email.com"
                className="bg-white/20 text-white placeholder-white/50 border-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Subject</label>
            <Input
              value={contactForm.subject}
              onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="What can we help you with?"
              className="bg-white/20 text-white placeholder-white/50 border-white/30"
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Message</label>
            <Textarea
              value={contactForm.message}
              onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Describe your issue or question..."
              className="bg-white/20 text-white placeholder-white/50 border-white/30 min-h-[100px]"
            />
          </div>

          <Button
            onClick={handleContactSubmit}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:scale-105 transition-all duration-300"
            type="button"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );

  const renderGuides = () => (
    <div className="space-y-6">
      <h3 className="text-white font-semibold text-lg">User Guides & Tutorials</h3>
      {userGuides.map((guide, index) => {
        const Icon = guide.icon;
        const isExpanded = expandedGuide === guide.id;
        return (
          <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-2">{guide.title}</h4>
                <p className="text-white/70 text-sm mb-3">{guide.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {guide.sections.map((section, sectionIndex) => (
                    <span
                      key={sectionIndex}
                      className="px-2 py-1 bg-white/20 text-white text-xs rounded-full"
                    >
                      {section}
                    </span>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    toggleGuide(guide.id);
                  }}
                  className="bg-blue-500 text-white text-sm px-4 py-2 hover:bg-blue-600 transition-all duration-300 cursor-pointer touch-manipulation active:scale-95 hover:scale-105"
                  type="button"
                >
                  {isExpanded ? '📖 Hide Guide' : '📖 Read Guide'}
                </Button>
                
                {/* Expanded Guide Content */}
                {isExpanded && (
                  <div className="mt-4 bg-white/10 rounded-lg p-4 animate-slide-up">
                    <div className="space-y-4">
                      {guide.content.map((section, sectionIndex) => (
                        <div key={sectionIndex}>
                          <h5 className="text-white font-semibold mb-2 text-sm">{section.title}:</h5>
                          <ul className="space-y-1">
                            {section.items.map((item, itemIndex) => (
                              <li key={itemIndex} className="text-white/80 text-xs flex items-start">
                                <span className="text-pink-400 mr-2">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Layout
      title="Help & Support"
      onBack={() => onNavigate('discovery')}
      showClose={true}
      onClose={() => onNavigate('discovery')}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <HelpCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Help & Support</h2>
          <p className="text-white/80">We're here to help you succeed</p>
        </div>

        {/* Quick Customer Support Section */}
        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-6 mb-8 text-center text-white shadow-xl">
          <h3 className="text-xl font-bold mb-2">Need Help?</h3>
          <p className="text-white/90 mb-4">Call our support team:</p>
          <a 
            href="tel:+1-289-270-9919" 
            className="inline-flex items-center space-x-3 bg-white/20 hover:bg-white/30 rounded-xl px-6 py-4 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
          >
            <Phone className="w-6 h-6 text-white" />
            <span className="text-xl font-bold">1-289-270-9919</span>
          </a>
          <p className="text-white/90 text-sm mt-4">Mon-Fri 9AM-9PM EST</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            onClick={() => window.open('tel:+12892709919')}
            className="bg-green-500 text-white font-semibold hover:bg-green-600 py-3"
            type="button"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Us
          </Button>
          <Button
            onClick={() => window.open('mailto:support@dates.care')}
            className="bg-blue-500 text-white font-semibold hover:bg-blue-600 py-3"
            type="button"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email Us
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 mb-6">
          {[
            { id: 'faq', label: 'FAQ', icon: HelpCircle },
            { id: 'contact', label: 'Contact', icon: MessageCircle },
            { id: 'guides', label: 'Guides', icon: Book }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-white text-gray-900 shadow-lg' 
                    : 'text-white hover:bg-white/10'
                }`}
                type="button"
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'faq' && renderFAQ()}
          {activeTab === 'contact' && renderContact()}
          {activeTab === 'guides' && renderGuides()}
        </div>

        {/* Emergency Contact */}
        <div className="mt-8 bg-red-500/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Shield className="w-6 h-6 text-red-400" />
            <h3 className="text-white font-semibold">Emergency Support</h3>
          </div>
          <p className="text-white/90 text-sm mb-3">
            If you're experiencing harassment, safety concerns, or need immediate assistance:
          </p>
          <div className="flex space-x-3">
            <Button
              onClick={() => window.open('tel:+12892709919')}
              className="flex-1 bg-red-500 text-white font-semibold hover:bg-red-600"
              type="button"
            >
              Emergency Line
            </Button>
            <Button
              onClick={() => window.open('mailto:emergency@dates.care')}
              className="flex-1 bg-red-600 text-white font-semibold hover:bg-red-700"
              type="button"
            >
              Emergency Email
            </Button>
          </div>
        </div>

        {/* App Info */}
        <div className="mt-6 text-center">
          <p className="text-white/60 text-sm">
            Dates.care v1.0.0 • Made with ❤️ in Canada
          </p>
          <p className="text-white/40 text-xs mt-1">
            © 2025 Dates.care Inc. All rights reserved.
          </p>
        </div>
      </div>
    </Layout>
  );
};