import React from 'react';
import { SEO } from '../../components/SEO';

export const AcceptableUsePolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <SEO
        title="Acceptable Use Policy"
        description="Guidelines for acceptable behavior and content on Dates.care"
      />

      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Acceptable Use Policy</h1>
          <p className="text-sm text-gray-600 mb-8">
            Last Updated: February 10, 2026
          </p>

          <div className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                This Acceptable Use Policy ("AUP") governs your use of Dates.care. By using our platform,
                you agree to comply with this policy. Violations may result in immediate account suspension
                or termination without refund.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Zero Tolerance Policy for Public Content</h2>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="font-semibold text-red-900 mb-2">Strictly Prohibited in All Public Areas:</p>
                <p className="text-gray-700">
                  All public-facing content (Profile Photos, Bios, Public Posts, Profile Information) must
                  be G-rated and appropriate for all audiences.
                </p>
              </div>

              <p className="text-gray-700 mb-3 font-semibold">The following are absolutely prohibited:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li><strong>Nudity:</strong> No exposed genitals, buttocks, or female nipples/areolas in profile photos or public content</li>
                <li><strong>Sexually Explicit Content:</strong> No pornographic images, videos, or sexually suggestive poses</li>
                <li><strong>Suggestive Content:</strong> No provocative clothing designed to expose intimate body parts</li>
                <li><strong>Sexual References:</strong> No sexual language, innuendos, or explicit references in bios or usernames</li>
                <li><strong>Objectification:</strong> No content that reduces individuals to sexual objects</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Private Communication Guidelines</h2>
              <p className="text-gray-700 mb-3">
                While we respect user privacy in direct messages, the following rules apply:
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                <p className="font-semibold text-yellow-900 mb-2">Prohibited Private Behavior:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Unsolicited Sexual Content:</strong> Sending sexual images, videos, or messages without clear prior consent</li>
                  <li><strong>Sexual Harassment:</strong> Persistent unwanted sexual advances or requests</li>
                  <li><strong>Non-Consensual Content:</strong> Sharing intimate images of others without their consent (revenge porn)</li>
                  <li><strong>Coercion:</strong> Pressuring or manipulating others into sexual activity or content sharing</li>
                </ul>
              </div>

              <p className="text-gray-700 mb-3">
                <strong>Report Function:</strong> Any user can report private messages that violate these rules.
                Reported conversations are reviewed by our Trust & Safety team.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Strictly Prohibited Activities</h2>

              <div className="space-y-4">
                <div className="border-l-4 border-red-600 pl-4">
                  <h3 className="font-bold text-gray-900 mb-2">4.1 Prostitution & Solicitation</h3>
                  <p className="text-gray-700">
                    Any attempt to exchange sexual services for money, gifts, or other compensation is
                    strictly forbidden. This includes escort services, sugar dating arrangements, or any
                    transactional sexual relationships.
                  </p>
                </div>

                <div className="border-l-4 border-red-600 pl-4">
                  <h3 className="font-bold text-gray-900 mb-2">4.2 Human Trafficking</h3>
                  <p className="text-gray-700">
                    Any content or behavior related to human trafficking, forced labor, or sexual exploitation
                    will result in immediate account termination and reporting to law enforcement.
                  </p>
                </div>

                <div className="border-l-4 border-red-600 pl-4">
                  <h3 className="font-bold text-gray-900 mb-2">4.3 Minors & Child Safety</h3>
                  <p className="text-gray-700 mb-2">
                    Users must be 18 years or older. Any content involving minors in sexual or suggestive
                    contexts will result in immediate termination and reporting to NCMEC and law enforcement.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>No user under 18 years of age</li>
                    <li>No Child Sexual Abuse Material (CSAM)</li>
                    <li>No grooming or predatory behavior toward minors</li>
                  </ul>
                </div>

                <div className="border-l-4 border-red-600 pl-4">
                  <h3 className="font-bold text-gray-900 mb-2">4.4 Violence & Threats</h3>
                  <p className="text-gray-700">
                    Threatening violence, promoting self-harm, or sharing violent/graphic content is prohibited.
                  </p>
                </div>

                <div className="border-l-4 border-red-600 pl-4">
                  <h3 className="font-bold text-gray-900 mb-2">4.5 Hate Speech</h3>
                  <p className="text-gray-700">
                    Content attacking individuals or groups based on race, ethnicity, national origin, religion,
                    gender, gender identity, sexual orientation, disability, or age is prohibited.
                  </p>
                </div>

                <div className="border-l-4 border-red-600 pl-4">
                  <h3 className="font-bold text-gray-900 mb-2">4.6 Fraud & Scams</h3>
                  <p className="text-gray-700">
                    Catfishing, romance scams, financial fraud, or any deceptive practices to obtain money
                    or personal information are strictly prohibited.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Content Moderation & Enforcement</h2>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="font-semibold text-blue-900 mb-2">Our Multi-Layer Protection System:</p>
                <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                  <li><strong>AI Pre-Screening:</strong> All uploaded images are automatically scanned by AI moderation tools before publication</li>
                  <li><strong>Manual Review:</strong> Flagged content is reviewed by our Trust & Safety team</li>
                  <li><strong>User Reports:</strong> Users can report violations, triggering immediate review</li>
                  <li><strong>ID Verification:</strong> Enhanced verification reduces bad actors and fake accounts</li>
                </ol>
              </div>

              <h3 className="font-bold text-gray-900 mb-2">5.1 Automated Content Scanning</h3>
              <p className="text-gray-700 mb-3">
                We use industry-leading AI moderation APIs (including Hive Moderation and similar services)
                to scan all uploaded media for:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
                <li>Nudity and sexually explicit content</li>
                <li>Violence and gore</li>
                <li>Hate symbols and offensive imagery</li>
                <li>Other policy violations</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Content flagged by our AI is automatically blocked or sent to manual review before it reaches other users.
              </p>

              <h3 className="font-bold text-gray-900 mb-2">5.2 Report & Review Process</h3>
              <p className="text-gray-700 mb-3">
                When a user reports content or behavior:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700 mb-4">
                <li>The report is immediately logged and prioritized</li>
                <li>Our Trust & Safety team reviews the specific reported content</li>
                <li>For encrypted messages, the reporting mechanism grants review access to that specific conversation</li>
                <li>Appropriate action is taken within 24-48 hours</li>
                <li>The reporter is notified of the outcome (without detailed user info for privacy)</li>
              </ol>

              <h3 className="font-bold text-gray-900 mb-2">5.3 Video & Voice Calls</h3>
              <p className="text-gray-700 mb-3">
                We do not record video or voice calls to respect user privacy. However:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
                <li>Call metadata (duration, participants) is logged for safety purposes</li>
                <li>Users can instantly terminate and report inappropriate calls</li>
                <li>Multiple reports trigger automatic account review and possible suspension</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Enforcement Actions</h2>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900">First Violation (Minor):</h3>
                  <p className="text-gray-700">Warning + Content removal</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Second Violation:</h3>
                  <p className="text-gray-700">3-7 day temporary suspension</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Third Violation:</h3>
                  <p className="text-gray-700">30-day suspension or permanent ban</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <h3 className="font-semibold text-red-900">Immediate Permanent Ban for:</h3>
                  <ul className="list-disc pl-6 space-y-1 text-red-800 mt-2">
                    <li>Child exploitation (CSAM)</li>
                    <li>Human trafficking</li>
                    <li>Revenge porn / Non-consensual intimate images</li>
                    <li>Threats of violence</li>
                    <li>Repeated solicitation for prostitution</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Legal Compliance</h2>
              <p className="text-gray-700 mb-3">
                We cooperate fully with law enforcement and regulatory authorities. Serious violations may
                result in reporting to:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
                <li>National Center for Missing & Exploited Children (NCMEC)</li>
                <li>Federal Bureau of Investigation (FBI)</li>
                <li>Local law enforcement agencies</li>
                <li>Financial fraud authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Your Responsibilities</h2>
              <p className="text-gray-700 mb-3">As a user, you must:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
                <li>Use the platform for genuine dating and relationship purposes only</li>
                <li>Be honest and authentic in your profile and interactions</li>
                <li>Respect other users' boundaries and consent</li>
                <li>Report violations you encounter</li>
                <li>Complete ID verification when requested</li>
                <li>Maintain appropriate, non-sexual public content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Changes to This Policy</h2>
              <p className="text-gray-700">
                We reserve the right to modify this AUP at any time. Continued use of the platform after
                changes constitutes acceptance of the modified policy.
              </p>
            </section>

            <section className="bg-gray-100 rounded-lg p-6 mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Questions or Reports?</h2>
              <p className="text-gray-700 mb-3">
                If you have questions about this policy or need to report a violation:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Email:</strong> safety@dates.care</li>
                <li><strong>In-App:</strong> Use the "Report User" button</li>
                <li><strong>Emergency:</strong> Contact local law enforcement immediately for threats or illegal activity</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
