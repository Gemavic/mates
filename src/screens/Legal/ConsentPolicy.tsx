import React from 'react';
import { Layout } from '@/components/Layout';
import { CircleCheck as CheckCircle, Shield, TriangleAlert as AlertTriangle, FileText } from 'lucide-react';

interface ConsentPolicyProps {
  onNavigate?: (screen: string) => void;
}

export const ConsentPolicy: React.FC<ConsentPolicyProps> = ({ onNavigate = () => {} }) => {
  return (
    <Layout
      title="Consent Policy"
      onBack={() => onNavigate('welcome')}
      showClose={true}
      onClose={() => onNavigate('welcome')}
    >
      <div className="px-4 py-6 pb-24">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Consent Policy</h2>
          <p className="text-white/80">Your Rights and Our Commitments</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 space-y-8 text-sm md:text-base">
          {/* Prevention of Non-Consensual Participation */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-teal-500" />
              Prevention Of Non-Consensual Participation
            </h3>
            <div className="space-y-3 text-gray-700">
              <p>
                We have implemented measures to ensure that all participation on the platform is consensual.
                By registering on the website, you explicitly agree to participate on the platform, including
                uploading and sharing content.
              </p>
              <div className="bg-teal-50 border-l-4 border-teal-500 p-4">
                <p className="text-teal-900 font-semibold text-sm mb-2">
                  <CheckCircle className="w-5 h-5 inline mr-2" />
                  Your Consent Documentation
                </p>
                <p className="text-teal-800 text-sm">
                  Your consent will be securely documented and retained for a minimum of three years in accordance
                  with legal requirements and best practices.
                </p>
              </div>
            </div>
          </section>

          {/* Content Rights */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-blue-500" />
              Our Rights to and Regarding Content Posted by You
            </h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Content Moderation</h4>
                <p className="text-sm">
                  The Website is entitled to moderate, oversee, amend or delete any User Content for any reason
                  without any limitation on this right. Generally, User Content removal is linked to its
                  noncompliance with any of the rules of the Website, including these Terms.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Marketing Use of Content</h4>
                <p className="text-sm mb-2">
                  The Website is entitled to use the User Content, including but not limited to photographs,
                  testimonials, feedback, comments, endorsements for marketing purposes, advertising, or any
                  other publication. This concerns the User Content in full or in part, and with such corrections
                  of any grammatical, stylistic, or other similar shortcomings as we deem appropriate.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm">
                    <strong>Important:</strong> In case you want us not to use your User Content, please contact
                    us. The details on how we use your information are contained in our Privacy Policy.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Content Upload Risk */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-yellow-500" />
              Content Uploaded at Your Own Risk
            </h3>
            <div className="space-y-3 text-gray-700">
              <p>
                The Website, regardless of its efforts to provide the best level of data security, does not
                guarantee protection from the unauthorized use of the User Content by third parties.
              </p>
              <p>
                To the furthest extent permitted by applicable law, you hereby release and forever waive any
                claims you may have against Datescare for any such unauthorized copying or usage of the User
                Content, under any theory.
              </p>

              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <p className="text-gray-900 font-semibold text-sm mb-2">SECURITY MEASURES DISCLAIMER</p>
                <p className="text-gray-700 text-sm">
                  THE SECURITY MEASURES TO PROTECT USER CONTENT USED BY HEREIN ARE PROVIDED AND USED "AS-IS"
                  AND WITH NO WARRANTIES, GUARANTEES, CONDITIONS, ASSURANCES, OR OTHER TERMS THAT SUCH SECURITY
                  MEASURES WILL WITHSTAND ATTEMPTS TO EVADE SECURITY MECHANISMS OR THAT THERE WILL BE NO CRACKS,
                  DISABLEMENTS, OR OTHER CIRCUMVENTION OF SUCH SECURITY MEASURES.
                </p>
              </div>
            </div>
          </section>

          {/* Types of Consent */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-green-500" />
              Types of Consent We Obtain
            </h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">1. Platform Participation Consent</h4>
                <p className="text-sm">
                  By registering, you consent to participate on the platform, including creating a profile,
                  uploading content, and interacting with other users.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">2. Content Usage Consent</h4>
                <p className="text-sm">
                  You consent to us using your content (photos, testimonials, feedback) for marketing and
                  advertising purposes, with the ability to opt-out by contacting us.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3. Data Processing Consent</h4>
                <p className="text-sm">
                  You consent to the processing of your personal data as described in our Privacy Policy,
                  including for analytics, communication, customization, and marketing purposes.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">4. Communication Consent</h4>
                <p className="text-sm">
                  By providing your email and phone number, you consent to receive communications from us,
                  including service updates, promotional offers, and important notices.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">5. Cookie Consent</h4>
                <p className="text-sm">
                  You consent to the use of cookies and similar tracking technologies as described in our
                  Cookie Policy, with the ability to manage preferences at any time.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">6. Payment Processing Consent</h4>
                <p className="text-sm">
                  When making purchases, you consent to sharing your payment information with third-party
                  payment processors for transaction processing.
                </p>
              </div>
            </div>
          </section>

          {/* Withdrawing Consent */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Withdrawing Your Consent</h3>
            <div className="space-y-3 text-gray-700">
              <p>
                You have the right to withdraw your consent at any time. However, please note that withdrawing
                certain types of consent may affect your ability to use the platform.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to Withdraw Consent:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4 text-blue-800 text-sm">
                  <li><strong>Content Marketing:</strong> Contact us at support@dates.care to opt-out</li>
                  <li><strong>Email Communications:</strong> Use the unsubscribe link in emails</li>
                  <li><strong>Cookie Consent:</strong> Manage preferences in your account settings</li>
                  <li><strong>Data Processing:</strong> Submit request via legal@dates.care</li>
                  <li><strong>Account/Platform:</strong> Delete your account to withdraw platform consent</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                <p className="text-yellow-900 font-semibold text-sm mb-2">
                  <AlertTriangle className="w-5 h-5 inline mr-2" />
                  Important Notice
                </p>
                <p className="text-yellow-800 text-sm">
                  Withdrawing consent for essential platform features (registration, profile participation)
                  will require account deletion. Some data may be retained for legal compliance, dispute
                  resolution, and fraud prevention even after account deletion.
                </p>
              </div>
            </div>
          </section>

          {/* Legal Rights */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Your Legal Rights</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                Under applicable data protection laws (including GDPR and CCPA), you have the following rights
                regarding your consent and personal data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate personal data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
                <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Right to Object:</strong> Object to certain processing activities</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
                <li><strong>Right to Lodge a Complaint:</strong> File complaints with data protection authorities</li>
              </ul>
              <p className="mt-3 font-semibold">
                To exercise these rights, contact us at <strong>legal@dates.care</strong>
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Children's Privacy and Consent</h3>
            <div className="space-y-3 text-gray-700">
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-red-900 font-semibold text-sm mb-2">
                  <AlertTriangle className="w-5 h-5 inline mr-2" />
                  No Consent from Minors
                </p>
                <p className="text-red-800 text-sm">
                  The Website does not and will not knowingly process personal data of individuals under 18.
                  We do not seek or accept consent from minors. If it becomes evident that a minor is using
                  the website, please contact us immediately at <strong>legal@dates.care</strong>
                </p>
              </div>
            </div>
          </section>

          {/* Record Keeping */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Consent Records</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                We maintain detailed records of all consents you provide, including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Date and time of consent</li>
                <li>Method of consent (registration, checkbox, button click)</li>
                <li>Type of consent given</li>
                <li>Any withdrawals of consent</li>
                <li>IP address and device information at time of consent</li>
              </ul>
              <p className="mt-3">
                These records are retained for a minimum of three years to comply with legal obligations and
                to protect both your rights and ours in case of disputes.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="border-t pt-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
              <p><strong>Content Marketing Opt-out:</strong> support@dates.care</p>
              <p><strong>Legal/Privacy Rights:</strong> legal@dates.care</p>
              <p><strong>General Support:</strong> support@bestdates.com</p>
            </div>
          </section>

          {/* Related Policies */}
          <section className="border-t pt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Related Policies</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('terms')}
                className="text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors"
              >
                Terms of Service
              </button>
              <button
                onClick={() => onNavigate('privacy')}
                className="text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors"
              >
                Privacy Policy
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
