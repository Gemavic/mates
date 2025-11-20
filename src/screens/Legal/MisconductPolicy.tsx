import React from 'react';
import { Layout } from '@/components/Layout';
import { Shield, TriangleAlert as AlertTriangle, Ban, UserX, FileWarning, Eye, CircleCheck as CheckCircle, DollarSign } from 'lucide-react';

interface MisconductPolicyProps {
  onNavigate?: (screen: string) => void;
}

export const MisconductPolicy: React.FC<MisconductPolicyProps> = ({ onNavigate = () => {} }) => {
  return (
    <Layout
      title="Misconduct Prevention Policy"
      onBack={() => onNavigate('welcome')}
      showClose={true}
      onClose={() => onNavigate('welcome')}
    >
      <div className="px-4 py-6 pb-24">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Misconduct Prevention Policy</h2>
          <p className="text-white/80">Creating a Safe Community</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 space-y-8 text-sm md:text-base">
          {/* Introduction */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Introduction</h3>
            <div className="space-y-3 text-gray-700">
              <p>
                Welcome to Datescare! We are here to create a safe and welcoming online environment that removes
                barriers and brings together people from different walks of life.
              </p>
              <p>
                Our freedom coexists with respect to other people's boundaries. That is why we have established
                a Policy that must be followed by all users of our platform. This Policy outlines what content
                and conduct is not acceptable.
              </p>

              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <h4 className="font-semibold text-red-900 mb-2">
                  <AlertTriangle className="w-5 h-5 inline mr-2" />
                  Consequences of Violations
                </h4>
                <ul className="list-disc list-inside space-y-1 ml-4 text-red-800">
                  <li>Deletion of prohibited content</li>
                  <li>Warnings about behavior</li>
                  <li>Temporary or permanent blocking</li>
                  <li>Removal from the platform</li>
                  <li>Reporting to law enforcement</li>
                </ul>
              </div>

              <p className="text-sm text-gray-600 italic">
                We may amend this Policy from time to time. Amendments become effective when posted. If you do
                not opt out within 14 days, the new version becomes legally binding for you.
              </p>
            </div>
          </section>

          {/* Modern Slavery & Human Trafficking */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Ban className="w-6 h-6 mr-2 text-red-500" />
              Preventing Modern Slavery & Human Trafficking
            </h3>
            <div className="space-y-4 text-gray-700">
              <p>
                Datescare does not tolerate any modern slavery and/or human trafficking on our platform or within
                our partnership chains. Our main goal is to be a completely safe platform for building connections.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How We Understand These Issues:</h4>
                <div className="space-y-2 text-blue-800 text-sm">
                  <p>
                    <strong>Modern Slavery:</strong> When someone is exploited by others for personal or commercial
                    gain and loses their freedom. Forms include human trafficking, forced labour, debt bondage,
                    slavery of children, and forced marriage.
                  </p>
                  <p>
                    <strong>Human Trafficking:</strong> The use of violence, threats or coercion to transport,
                    recruit or harbour people to exploit them for financial or personal gain. This can include
                    forced marriage, labour, prostitution, criminality, or organ removal.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Steps We Take:</h4>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                  <li>
                    <strong>Partner Cooperation:</strong> Contractual obligations mandate partners align with our
                    zero-tolerance stance
                  </li>
                  <li>
                    <strong>Verification Processes:</strong> User verification measures to identify and mitigate risks
                  </li>
                  <li>
                    <strong>Internal Training:</strong> Regular trainings for staff on prevention commitments
                  </li>
                  <li>
                    <strong>Moderation:</strong> Combination of AI and human moderation to detect violations
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">Reporting Mechanisms</h4>
                <p className="text-yellow-800 text-sm">
                  If you see content that could be related to modern slavery or human trafficking, immediately
                  click the abuse report button or contact us at <strong>support@dates.care</strong>
                </p>
              </div>

              <p className="text-sm font-semibold">
                We will report detected cases to appropriate law enforcement authorities and cooperate fully with
                investigations.
              </p>
            </div>
          </section>

          {/* Money Laundering & Fraud */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-6 h-6 mr-2 text-green-600" />
              Preventing Money Laundering & Fraud
            </h3>
            <div className="space-y-4 text-gray-700">
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <p className="text-sm mb-2">
                  <strong>Money Laundering:</strong> The process by which proceeds from criminal activity are
                  disguised to conceal their illicit origin.
                </p>
                <p className="text-sm">
                  <strong>Fraud:</strong> The illegal act of deceiving someone to obtain money or valuable goods.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Prevention Measures:</h4>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                  <li>Proper KYC (Know Your Customer) and KYB (Know Your Business) practices</li>
                  <li>Identification and validation of counterparty information</li>
                  <li>Enhanced due diligence using open sources and licensed systems</li>
                  <li>Refusing business with entities on FATF blacklist or sanctions lists</li>
                  <li>PCI DSS security standards compliance</li>
                  <li>Trusted payment providers with necessary certifications</li>
                  <li>Transaction monitoring by anti-fraud systems</li>
                  <li>Velocity rules and BIN/IP filtering</li>
                  <li>Patented anti-fraud system analyzing user behavior</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Profile Requirements:</h4>
                <p className="text-sm">
                  Your profile should not contain contact information such as telephone numbers, social media
                  links, or email addresses.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-blue-800 text-sm">
                  We have a dedicated team of fraud experts who continuously monitor for "red flags" and may
                  initiate billing verification to check official documents and payment cards.
                </p>
              </div>
            </div>
          </section>

          {/* Scam Prevention */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-orange-500" />
              Preventing Scams
            </h3>
            <div className="space-y-4 text-gray-700">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-2">What We Categorize as Scams:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4 text-orange-800 text-sm">
                  <li>Soliciting financial assistance (money, loans, investments, donations)</li>
                  <li>Misrepresenting intentions for financial advantage</li>
                  <li>Falsely professing romantic interest to defraud members</li>
                  <li>Providing false information (name, gender, age, location) for financial benefits</li>
                  <li>Urging members to move communication off-platform quickly</li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-red-900 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Warning: Scammers want to move your chat away from our safety measures. Stay on the platform!
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Protection Steps:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Stringent verification processes for user identity</li>
                  <li>Active monitoring and investigation of suspicious activities</li>
                  <li>Anti-scam system using defined metrics on a set schedule</li>
                  <li>User education about potential scams</li>
                  <li>Dedicated Support team for concerns</li>
                </ul>
              </div>

              <p className="text-sm font-semibold">
                If you suspect scamming, click the report button on their profile or email{' '}
                <strong>support@dates.care</strong>
              </p>
            </div>
          </section>

          {/* Abuse & Sexual Harassment */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <UserX className="w-6 h-6 mr-2 text-red-600" />
              Combatting Abuse & Sexual Harassment
            </h3>
            <div className="space-y-4 text-gray-700">
              <p>
                We make all efforts for our platform to be a place for making genuine connections in a safe and
                respectful way. Datescare does not tolerate any forms of abuse and sexual harassment.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">Prohibited Abuse:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4 text-red-800 text-sm">
                  <li>Threats of violence and promotion of violent acts</li>
                  <li>Bullying, belittling, insulting, mocking, trolling, intimidating</li>
                  <li>Body shaming or unsolicited comments about physical appearance</li>
                  <li>Releasing another user's private information without consent</li>
                  <li>Blackmailing or threatening to reveal private information</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">Sexual Harassment Includes:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4 text-red-800 text-sm">
                  <li>Sharing unsolicited sexually explicit images</li>
                  <li>Sharing or threatening to share sexual visual materials without consent</li>
                  <li>Making unwanted sexual comments and questions</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Detection and Action:</h4>
                <p className="text-sm">
                  We employ automated tools and trained human moderators specialized in identifying abuse and
                  sexual harassment. Upon detection, we thoroughly examine user interactions and take appropriate
                  actions including content removal and user deletion.
                </p>
              </div>

              <p className="text-sm">
                Use the abuse report button or contact <strong>support@dates.care</strong> if you encounter
                abuse or sexual harassment.
              </p>
            </div>
          </section>

          {/* CSAM Prevention */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FileWarning className="w-6 h-6 mr-2 text-purple-600" />
              Preventing CSAM Distribution
            </h3>
            <div className="space-y-4 text-gray-700">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                <p className="text-purple-900 font-semibold text-sm mb-2">
                  Datescare fights to prevent the creation and distribution of child sexual abuse materials (CSAM).
                </p>
                <p className="text-purple-800 text-sm">
                  We strictly prohibit any content that sexualizes or poses danger to children, whether real or
                  fictional. This includes visual depictions, third-party links, or discussions involving sexually
                  explicit activities with children.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Prevention Steps:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Ongoing scans to detect and prevent CSAM distribution</li>
                  <li>Content moderators and AI rigorously trained to recognize CSAM</li>
                  <li>Immediate removal of users and content</li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <h4 className="font-semibold text-red-900 mb-2">
                  <AlertTriangle className="w-5 h-5 inline mr-2" />
                  Reporting to Authorities
                </h4>
                <p className="text-red-800 text-sm">
                  All detected cases of CSAM distribution may be reported to the National Center for Missing and
                  Exploited Children (NCMEC). NCMEC will make reports available to relevant local and global law
                  enforcement authorities.
                </p>
              </div>

              <p className="text-sm font-semibold">
                If you encounter potential CSAM, immediately click the abuse report button and select "Child
                safety concerns" or email <strong>support@dates.care</strong>
              </p>
            </div>
          </section>

          {/* Age Verification */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
              Age Verification
            </h3>
            <div className="space-y-4 text-gray-700">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Age Requirements</h4>
                <p className="text-green-800 text-sm">
                  You must be at least 18 years old to create an account and use our platform. It is against
                  our Terms of Service and this Policy for anyone under 18 to access and use Datescare.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Verification Process:</h4>
                <p className="text-sm mb-2">
                  We use Persona, a trusted verification vendor, for age verification. With your consent, Persona
                  will verify your age using real-time face check and matching a "selfie" with your government ID.
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-4 text-sm">
                  <li>We inform you about verification and provide a Persona link</li>
                  <li>You have 14 calendar days to complete verification</li>
                  <li>Using the link, you're redirected to Persona's verification process</li>
                  <li>Access to platform is denied until verification is complete</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">If Verification Fails:</h4>
                <p className="text-yellow-800 text-sm">
                  All user information (content) will be deleted from the platform and access will remain denied.
                </p>
              </div>

              <p className="text-sm">
                We use advanced technology, analytics, and moderation to meet age verification standards and
                actively promote verification among users to protect minors and increase authenticity.
              </p>
            </div>
          </section>

          {/* Appeals */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Eye className="w-6 h-6 mr-2 text-blue-600" />
              Rules for Appeals
            </h3>
            <div className="space-y-4 text-gray-700">
              <p className="text-sm">
                If users violate this Policy, we may delete content, warn users, block temporarily or permanently,
                remove from platform, and/or report to authorities.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to Appeal:</h4>
                <p className="text-blue-800 text-sm mb-2">
                  If you disagree with our content or account moderation decision, contact Customer Support at{' '}
                  <strong>support@dates.care</strong>
                </p>
                <p className="text-blue-800 text-sm font-semibold mb-2">Required information:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-blue-800 text-sm">
                  <li>Your account ID</li>
                  <li>Description of our decision you disagree with</li>
                  <li>Detailed reasons why your content/account complies with our Terms and Policies</li>
                </ul>
              </div>

              <p className="text-sm">
                Our Trust Safety team will review each fully and properly completed appeal in a diligent and
                non-partial way and will notify you about the final decision. Decision-making may be delayed
                due to heavy workload.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="border-t pt-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
              <p><strong>Report Abuse:</strong> Use the abuse report button on any profile</p>
              <p><strong>Email Support:</strong> support@dates.care</p>
              <p><strong>Child Safety Concerns:</strong> Report immediately via abuse button or email</p>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              This Policy is an integral part of our Terms of Service. Please also review the Terms of Service
              regarding misconduct prevention.
            </p>
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
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};
