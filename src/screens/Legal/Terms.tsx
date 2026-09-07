import React from 'react';
import { Layout } from '@/components/Layout';
import { Shield, FileText, TriangleAlert as AlertTriangle, Gavel, CreditCard, Users, Ban } from 'lucide-react';

interface TermsProps {
  onNavigate?: (screen: string) => void;
}

export const Terms: React.FC<TermsProps> = ({ onNavigate = () => {} }) => {
  return (
    <Layout
      onNavigate={onNavigate}
      title="Terms of Service"
      onBack={() => onNavigate('welcome')}
      showClose={true}
      onClose={() => onNavigate('welcome')}
    >
      <div className="px-4 py-6 pb-24">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Terms of Service</h2>
          <p className="text-white/80">Last updated: October 7, 2025</p>
          <p className="text-white/60 text-sm mt-2">Governed by Ontario, Canada</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 space-y-8 text-sm md:text-base">
          {/* Introduction */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-blue-500" />
              1. Introduction
            </h3>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                Welcome to Datescare! These Terms of Service ("Terms") constitute a legally binding agreement
                ("Agreement") between you—whether acting individually or on behalf of an organization ("User")—and
                Datescare ("Datescare," "Website," "we," "us," or "our"). By accessing or utilizing the Website,
                you consent to adhere to and be bound by these Terms.
              </p>
              <p>
                These Terms outline the legal relationship between you and Datescare that arises from your access
                to and use of the Website, encompassing all features, functionalities, and content available therein
                (collectively referred to as the "Services").
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
                <p className="font-semibold text-yellow-900 mb-2">
                  <AlertTriangle className="w-5 h-5 inline mr-2" />
                  IMPORTANT NOTICE
                </p>
                <p className="text-yellow-800">
                  THESE TERMS CONTAIN A BINDING ARBITRATION CLAUSE AND A CLASS ACTION WAIVER.
                  FOR FURTHER DETAILS, PLEASE REFER TO SECTION 16 (DISPUTE RESOLUTION BY MANDATORY BINDING
                  ARBITRATION AND CLASS ACTION WAIVER) BELOW.
                </p>
              </div>
              <p>
                Additionally, these Terms reference the following supplementary documents that are integral parts
                of our Agreement with you:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Privacy Policy</li>
                <li>Cookie Policy</li>
                <li>Payment and Refund Policy</li>
                <li>Misconduct Prevention Policy</li>
              </ul>
              <p className="text-sm text-gray-600 italic mt-3">
                We may also revise these Terms occasionally at our discretion. Any notifications regarding changes
                will be effective 21 days after they are published on our website.
              </p>
            </div>
          </section>

          {/* User Eligibility */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-500" />
              2. User Eligibility and Account Requirements
            </h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">2.1 Age Requirement</h4>
                <p>You must be at least 18 years old to create an account and use our platform.</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">2.2 Profile Requirements</h4>
                <p className="mb-2">While intended for entertainment purposes, user profiles must contain real names. Profile limitations include:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Use your actual name to prevent impersonation</li>
                  <li>Usernames should not infringe upon rights held by others</li>
                  <li>Usernames must not include offensive or vulgar language</li>
                  <li>Profiles should not display personal contact information</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">2.3 Commercial Use Prohibited</h4>
                <p>The platform is strictly non-commercial in nature. Neither the Website nor its Services may be utilized for commercial purposes.</p>
              </div>
            </div>
          </section>

          {/* Paid Features */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-6 h-6 mr-2 text-blue-500" />
              3. Paid Features and Credits
            </h3>
            <div className="space-y-3 text-gray-700">
              <p>
                Certain services offered on our website require payment. While searching remains free-of-charge,
                other features incur fees. The following paid Services may include:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Mail correspondence exchanges</li>
                <li>Online chatting</li>
                <li>Sending virtual gifts/stickers</li>
                <li>Transmission of personal photos/videos</li>
                <li>Making Audio or Video calls</li>
              </ul>
              <p className="text-sm mt-3">
                For detailed information about payments, refunds, and our credit system, please refer to our
                Payment and Refund Policy.
              </p>
            </div>
          </section>

          {/* User Representations */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-500" />
              4. User Representations and Warranties
            </h3>
            <div className="space-y-4 text-gray-700">
              <p>Prior to accessing and during utilization of the Service, you assert:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li>No criminal convictions ever recorded against you</li>
                <li>Not categorized by authorities as sex offender</li>
                <li>All data posted publicly remains accurate and updated</li>
                <li>You will promptly report changes regarding contact info including emails</li>
                <li>Compliance ensured across applicable regulations throughout site usage</li>
                <li>Legally capable of entering into this Agreement</li>
              </ul>

              <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
                <h4 className="font-semibold text-red-900 mb-2">4.2 Strictly Prohibited Activities</h4>
                <ul className="list-disc list-inside space-y-1 ml-4 text-red-800 text-sm">
                  <li>Personal data breaches</li>
                  <li>Spam or mass messaging</li>
                  <li>Scam or fraud</li>
                  <li>Sharing personal identification details publicly</li>
                  <li>Harassment or abusive behavior</li>
                  <li>Content containing violence, pornography, or illegal material</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Content Requirements */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">4.4 Requirements for User Content</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <p className="font-semibold">
                Make sure your content does not include abuse, offense, discrimination, commercials, sexual matters,
                and copyright breaches.
              </p>
              <p>
                "User Content" means any information, communication, media, and other files that the User publishes,
                sends, transmits, or makes publicly available on or through the Website. Prohibited content includes:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Inflammatory religious commentaries or inaccurate quotations</li>
                <li>Realistic portrayals of violence or content encouraging violence</li>
                <li>Commercial activities without prior written consent</li>
                <li>Pornographic or adult content</li>
                <li>Copyright or trademark infringement</li>
                <li>Racist, bigoted, or hateful content</li>
                <li>Content promoting terrorism or illegal activities</li>
                <li>Images of unaccompanied minors</li>
              </ul>
            </div>
          </section>

          {/* Profile Security */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">5. Profile Security</h3>
            <div className="space-y-3 text-gray-700">
              <p>You are responsible for your account security and shall be obliged to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Keep your login credentials confidential</li>
                <li>Be liable for all activities under your account</li>
                <li>Notify us immediately about unauthorized use</li>
                <li>Not authorize others to use your account</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                We shall not be liable for any loss or damage arising from your failure to comply with this provision
                or from unauthorized use of your credentials by third parties.
              </p>
            </div>
          </section>

          {/* Meeting other members. The single most important section in a
              dating platform's terms, and it was absent entirely: nothing said
              members meet at their own risk, nothing said we run no background
              checks, and there was no safety guidance anywhere on the site. */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">6. Meeting Other Members</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                Dates.care is a place to meet people. What happens after that is between you and them.
                Please read this section before you arrange to see anyone.
              </p>

              <p className="font-semibold text-gray-900">6.1 We do not screen members</p>
              <p>
                We do not run criminal background checks, sex-offender registry searches or credit
                checks, and we are not able to. Our verification confirms that a person holds the
                phone number they gave us and that their selfie matches the photographs on their
                profile. That is all it confirms. It does not confirm that they are honest, safe,
                single, employed, solvent, of good character or free of a criminal record.
              </p>

              <p className="font-semibold text-gray-900">6.2 Meetings happen at your own risk</p>
              <p>
                Any communication, meeting or relationship with another member - online, by
                telephone, by video call, or in person - is entirely at your own risk. We are not a
                party to it, we do not supervise it, and we cannot control what another person says
                or does. We are not responsible or liable for the conduct of any member, on
                Dates.care or anywhere else, and that includes anything that happens when you meet
                someone offline.
              </p>

              <p className="font-semibold text-gray-900">6.3 Please take these precautions</p>
              <p>
                Following this guidance is not a legal requirement and does not make us responsible
                for the outcome. It is what we would tell a friend.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Talk on Dates.care first. Video call before meeting in person.</li>
                <li>Meet somewhere public for the first few times, and stay somewhere public.</li>
                <li>Arrange your own transport, both ways, and keep control of it.</li>
                <li>Tell a friend or relative where you are going, who with, and when you expect to be back.</li>
                <li>Do not leave drinks, food, bags, phones or documents unattended.</li>
                <li>
                  Never send money, gift cards or cryptocurrency to someone you met online, and never
                  share bank details, card numbers, passwords or one-time codes - however convincing
                  the reason. Anyone who asks for money is very likely defrauding you. Report them.
                </li>
                <li>Do not share your home or work address, or your daily routine, until you know someone well.</li>
                <li>Leave whenever you want to. You never owe anyone an explanation.</li>
                <li>
                  If you feel unsafe, contact your local emergency services. In Canada and the United
                  States, that is 911.
                </li>
              </ul>

              <p className="font-semibold text-gray-900">6.4 Report anyone who worries you</p>
              <p>
                Use the report control on any profile, message or photograph, or write to
                admin@dates.care. We read every report. We can suspend and remove accounts, and we
                cooperate with law enforcement where the law requires it or a person is at risk of harm.
              </p>
            </div>
          </section>

          {/* Indemnity */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">7. Your Responsibility to Us</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                You agree to indemnify, defend and hold harmless Dates.care and the person operating
                it against any claim, demand, loss, liability, damage, cost or expense - including
                reasonable legal fees - arising out of or connected with your use of the Services,
                your content, your dealings with other members, or your breach of these Terms or of
                any law or of anyone else&apos;s rights. We may take over the defence of any such
                claim, and you agree to cooperate with us if we do.
              </p>
            </div>
          </section>

          {/* Account Termination */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Ban className="w-6 h-6 mr-2 text-red-500" />
              8. Termination of Account
            </h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                We reserve the right at our sole discretion to terminate or suspend any account at any time without
                liability. We will notify you when we take action against your account unless prohibited by law.
              </p>
              <p>
                Termination may occur for Terms violation, inappropriate conduct, non-activity for three consecutive
                months, or payment security concerns.
              </p>
              <p>
                A User may voluntarily terminate their account temporarily or permanently by sending a letter to
                admin@dates.care
              </p>
            </div>
          </section>

          {/* Copyright */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">9. Copyright Policy</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                Datescare owns, possesses, and has title over the intellectual property, licenses, or otherwise
                retains all proprietary rights to the Website and Services.
              </p>
              <p>
                Any activity that infringes intellectual property rights is not allowed. To report copyright
                infringement, contact us at admin@dates.care
              </p>
              <p className="font-semibold mt-3">9.1 License</p>
              <p>
                By posting User Content, you grant us an unrestricted, irrevocable, non-exclusive, sub-licensable,
                free, worldwide license to use, copy, perform, display, reproduce, adapt, modify, publish and
                distribute such content.
              </p>
            </div>
          </section>

          {/* Warranty Disclaimers */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">10. Warranty Disclaimers</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <p className="font-semibold mb-2">THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE"</p>
                <p>
                  We expressly disclaim all implied warranties including merchantability, fitness for a particular
                  purpose, and non-infringement. We do not guarantee the Website will meet your requirements, be
                  uninterrupted, timely, secure, or error-free.
                </p>
              </div>
              <p className="mt-3">
                We are not liable for information in user profiles, user behavior, or for guaranteeing any particular
                relationship outcome.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">11. Limitation of Liability</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                To the fullest extent permitted by law, Datescare shall not be liable for any direct, indirect,
                incidental, special, consequential, punitive, or exemplary damages.
              </p>
              <p className="font-semibold">
                Even if Datescare is found liable under any theory, the liability and your exclusive remedy will be
                limited to the greater of the fees you have paid to Datescare or $100.
              </p>
            </div>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Gavel className="w-6 h-6 mr-2 text-blue-500" />
              12. Dispute Resolution by Mandatory Binding Arbitration
            </h3>
            <div className="space-y-4 text-gray-700 text-sm">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="font-semibold text-blue-900 mb-2">IMPORTANT: READ CAREFULLY</p>
                <p className="text-blue-800">
                  This section requires you to arbitrate disputes with Datescare and limits the manner in which
                  you can seek relief from us.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">12.1 Scope and Applicability</h4>
                <p>
                  This Arbitration Agreement applies to all disputes, claims, or controversies between you and
                  Datescare, including those arising from these Terms or your use of the Services.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">12.2 Pre-Arbitration Informal Dispute Resolution</h4>
                <p className="mb-2">
                  Before initiating arbitration, both parties must attempt informal resolution:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Send written notice to admin@dates.care with details of your dispute</li>
                  <li>Participate in good faith for a 90-day period</li>
                  <li>Attend at least one individualized conference</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">12.3 Arbitration Agreement</h4>
                <p className="mb-2">For U.S. residents:</p>
                <p>
                  Arbitration will be administered by National Arbitration and Mediation (NAM) under their
                  Comprehensive Dispute Resolution Rules. Contact NAM at commercial@namadr.com
                </p>
                <p className="mt-2 mb-2">For non-U.S. residents:</p>
                <p>
                  Arbitration will be administered by the London Court of International Arbitration (LCIA).
                  Contact LCIA at onlinefiling@lcia.org
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">12.4 Class Action Waiver</h4>
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                  <p className="font-semibold text-yellow-900">
                    TO THE FULLEST EXTENT PERMITTED BY LAW, BOTH YOU AND WE WAIVE ANY RIGHT TO BRING OR PARTICIPATE
                    IN A CLASS, COLLECTIVE, OR REPRESENTATIVE ACTION, OR TO A JURY TRIAL. ALL DISPUTES MUST BE
                    RESOLVED ON AN INDIVIDUAL BASIS.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Governing Law */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">13. Miscellaneous</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">13.1 Governing Law and Venue</h4>
                <p>
                  This Agreement shall be governed by and construed under the laws of Ontario, Canada. Each party
                  submits to the exclusive jurisdiction of the courts of Ontario, Canada.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">13.2 Force Majeure</h4>
                <p>
                  Datescare shall not be responsible for any failure to perform due to unforeseen circumstances
                  including acts of God, war, terrorism, strikes, or system failures.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="border-t pt-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">14. Contact Information</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
              <p><strong>Company:</strong> Datescare</p>
              <p><strong>Address:</strong> 5515 Eglington Avenue West, Etobicoke, ON M9C 5K5, Canada</p>
              <p><strong>Legal:</strong> admin@dates.care</p>
              <p><strong>Customer Support:</strong> admin@dates.care</p>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              All Rights Reserved © {new Date().getFullYear()} Datescare
            </p>
          </section>

          {/* Quick Links */}
          <section className="border-t pt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Related Policies</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('privacy')}
                className="text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => onNavigate('payment-refund')}
                className="text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors"
              >
                Payment & Refund
              </button>
              <button
                onClick={() => onNavigate('misconduct')}
                className="text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors"
              >
                Misconduct Prevention
              </button>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};
