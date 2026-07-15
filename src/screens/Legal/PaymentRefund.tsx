import React from 'react';
import { Layout } from '@/components/Layout';
import { CreditCard, DollarSign, RefreshCw, CircleAlert as AlertCircle, CircleCheck as CheckCircle } from 'lucide-react';

interface PaymentRefundProps {
  onNavigate?: (screen: string) => void;
}

export const PaymentRefund: React.FC<PaymentRefundProps> = ({ onNavigate = () => {} }) => {
  return (
    <Layout
      title="Payment & Refund Policy"
      onBack={() => onNavigate('welcome')}
      showClose={true}
      onClose={() => onNavigate('welcome')}
    >
      <div className="px-4 py-6 pb-24">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Payment & Refund Policy</h2>
          <p className="text-white/80">Last updated: October 7, 2025</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 space-y-8 text-sm md:text-base">
          {/* General Provisions */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-6 h-6 mr-2 text-green-500" />
              1. General Provisions
            </h3>
            <div className="space-y-3 text-gray-700">
              <p>
                This Payment and Refund Policy (the "Policy") governs your payment relations with Datescare
                (the "Datescare", "We", "Us", "Our"). They are additional terms to our Terms of Service and
                form part of your agreement with us.
              </p>
              <p className="text-sm">
                Please read this Policy carefully (especially Section 4 on refunds). If you have any questions,
                please contact us at: <strong>support@dates.care</strong>
              </p>
              <p className="text-sm text-gray-600">
                We may amend the Policy from time to time, and the amendments will become effective when posted
                on Datescare without prior notice.
              </p>
            </div>
          </section>

          {/* Paid Services */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Paid Services</h3>
            <div className="space-y-3 text-gray-700">
              <p>
                Datescare offers free and paid Services. You may use the free Services after registration.
                To use paid features, you will need Credits.
              </p>
              <p>
                The Datescare provides two types of paid Services:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Action-based:</strong> You are charged each time you make an action (e.g., send an email)</li>
                <li><strong>Time-dependent:</strong> You are charged per time period (e.g., chatting is charged per minute)</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                You may find the price of paid features on the Credits page in the "Pricing" section and other
                Datescare pages. Datescare may change prices at its sole discretion.
              </p>
            </div>
          </section>

          {/* Credits */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-6 h-6 mr-2 text-blue-500" />
              3. Credits
            </h3>
            <div className="space-y-4 text-gray-700">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <h4 className="font-semibold text-blue-900 mb-2">What are Credits?</h4>
                <p className="text-blue-800">
                  "Credits" means the virtual currency of Datescare exchanged to use paid features without any
                  monetary value. References to "selling", "purchasing" or "exchanging" Credits are for
                  convenience only.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3.1 Purchasing Credits</h4>
                <p className="text-sm">
                  You buy Credits for real money. Depending on your location, you may use credit/debit cards,
                  Google Pay, PayPal, and other payment systems. We do not accept gift cards, prepaid cards,
                  or scratch cards.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3.2 Payment Processing</h4>
                <p className="text-sm">
                  We engage third-party payment providers to process payments. We may change providers, so some
                  payment methods may become unavailable from time to time. We are not a payment institution and
                  do not process payments on our behalf.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3.4 Currency</h4>
                <p className="text-sm">
                  In most cases, you buy Credits in exchange for US dollars. However, you may be charged in
                  different currencies depending on your location. Your card provider may charge currency
                  conversion fees. We do not collect these fees.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3.7 Important Acknowledgments</h4>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                  <li>Credits are not legal tender and have no monetary value</li>
                  <li>Credits may not be used outside Datescare</li>
                  <li>You have no ownership rights in Credits</li>
                  <li>Credits are for personal use only and cannot be sold, transferred, or given to others</li>
                  <li>Datescare retains full authority to issue, manage, cancel, or withdraw Credits</li>
                  <li>We are not liable for damages arising from the use of Credits</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Subscription */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <RefreshCw className="w-6 h-6 mr-2 text-purple-500" />
              3-A. Subscription
            </h3>
            <div className="space-y-4 text-gray-700">
              <p className="text-sm italic text-gray-600">
                (This section applies to certain groups of users who are offered by Datescare a subscription
                model of payment)
              </p>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3A.2 Subscription Packages</h4>
                <p className="text-sm">
                  If you are an eligible user, you can choose or change your subscription package during the
                  subscription process. Datescare may offer introductory offers for subscription packages from
                  time to time.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3A.3 How Subscription Works</h4>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                  <li>Choose a subscription package and pay for it</li>
                  <li>After payment is processed, receive the specified number of Credits</li>
                  <li>Credits acquired under subscription will NOT expire at the end of the period</li>
                  <li>Unused Credits do not carry over; each period grants a new amount</li>
                  <li>Subscription period normally equals 30 calendar days</li>
                  <li>Can purchase additional Credits through regular process</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">
                  <AlertCircle className="w-5 h-5 inline mr-2" />
                  Auto-Renewal
                </h4>
                <p className="text-yellow-800 text-sm">
                  Your subscription will automatically renew after each period, and your payment method will be
                  charged until canceled. We will send reminders 3 days and 24 hours before upcoming charges.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3A.4 Canceling Subscription</h4>
                <p className="text-sm mb-2">
                  Subscriptions may be canceled at any time prior to the start of the next billing period.
                  To cancel:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Use the Subscription Page in your account, or</li>
                  <li>Contact customer support at support@dates.care</li>
                </ul>
                <p className="text-sm mt-2">
                  After cancellation, you can use remaining Credits and won't be charged for the next period.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3A.8 Daily Credits Subscription</h4>
                <p className="text-sm">
                  Datescare may offer auto-renewing Daily Credits subscription. With daily credit subscription,
                  each day you log in to Datescare, 20 credits are added to your account. If you do not log in,
                  20 credits will not be accrued that day.
                </p>
              </div>
            </div>
          </section>

          {/* Kobos */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Kobos</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                Kobos are a special method to use chat Service on our platform. Kobos may be used exclusively
                in chat. When paying for chatting, kobos are deducted first, then Credits.
                <strong> 1 Chat kobo equals 1 min of chatting.</strong>
              </p>
              <p>
                You may receive kobos as a bonus when buying Kobos. Bonus kobos are non-refundable. You may also
                buy kobos for real money (currently in test mode). Kobos may not be exchanged for Credits.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Kobos are not legal tender and have no monetary value</li>
                <li>Kobos may not be used outside Datescare</li>
                <li>You have no ownership rights in Kobos</li>
                <li>Kobos are for personal use only</li>
              </ul>
            </div>
          </section>

          {/* Refunds */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <RefreshCw className="w-6 h-6 mr-2 text-red-500" />
              4. Refunds
            </h3>
            <div className="space-y-4 text-gray-700">
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <h4 className="font-semibold text-red-900 mb-2">
                  <AlertCircle className="w-5 h-5 inline mr-2" />
                  Important Notice
                </h4>
                <p className="text-red-800 text-sm">
                  Please review this section thoroughly, as all refunds are processed in accordance with this
                  Policy. In most cases, purchases on Datescare (Credits and account credits) are not refundable.
                  All exceptions are set out in this Policy.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">4.3 Types of Refunds</h4>
                <p className="text-sm">Datescare allows for two types of refunds:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li><strong>Legal Refund</strong> - Refunds you're entitled to by law</li>
                  <li><strong>Optional Refund</strong> - Refunds issued at our discretion</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-green-700">Legal Refunds</h4>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                  <h5 className="font-semibold text-green-900 mb-2">4.4 For EU/EEA Residents</h5>
                  <ul className="list-disc list-inside space-y-1 ml-3 text-green-800 text-sm">
                    <li>Right to withdrawal within 14 calendar days after registration</li>
                    <li>No reasons required for withdrawal</li>
                    <li>By accepting Terms, you request immediate service performance</li>
                    <li>You consent that withdrawal rights expire within 14 days</li>
                    <li>If you withdraw within 15 days, we refund any unused Credits</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-semibold text-green-900 mb-2">4.5 For Certain US States</h5>
                  <p className="text-green-800 text-sm">
                    Depending on your state, you may cancel transactions before midnight of the third business
                    day after the transaction date. If your transaction qualifies under applicable law, we will
                    process such refunds upon request.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-blue-700">Optional Refunds</h4>

                <div className="space-y-3">
                  <div>
                    <h5 className="font-semibold text-gray-900 text-sm mb-1">4.7 Credits on Balance</h5>
                    <p className="text-sm mb-2">We may refund Credits on your balance if:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      <li>Credits obtained by mistake, not intended for use, and request within 3 days</li>
                      <li>Your account has been blocked/terminated (upon your request)</li>
                      <li>The value is more than USD 20</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-900 text-sm mb-1">4.8 Refund Limitations</h5>
                    <p className="text-sm">
                      We will not refund Credits on your balance if it is your fifth or further request for
                      such refund. We will not refund Credits if your claim results from a Terms of Service breach.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-900 text-sm mb-1">4.10 Spent Credits</h5>
                    <p className="text-sm mb-2">
                      We will not consider refund requests for spent Credits unless it falls under:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      <li><strong>Service Failure:</strong> Datescare failed to ensure Services as provided</li>
                      <li><strong>Scam/Fraud:</strong> Another user scammed you or engaged in fraud</li>
                      <li><strong>Unauthorized Transactions:</strong> Your payment method used without control</li>
                    </ul>
                    <p className="text-sm mt-2 text-red-600">
                      Important: Submit refund requests within 30 days after becoming aware of the issue.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">4.12 Time Limitations</h4>
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                  <p className="text-sm mb-2">
                    Datescare will consider refund requests submitted within:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li><strong>120 calendar days</strong> following credit/debit card payment</li>
                    <li><strong>180 calendar days</strong> following PayPal payment</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Chargebacks vs Refunds</h4>
                <p className="text-blue-800 text-sm">
                  Please note the difference: Chargebacks are processed by your bank, while our team handles
                  refunds. Requesting a refund is usually more effective and allows you to provide supporting
                  evidence. Should you experience difficulties, please contact our Support team first.
                </p>
              </div>
            </div>
          </section>

          {/* Submitting Refund Request */}
          <section>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Submitting Refund Request</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">4.13 How to Submit</h4>
                <p className="mb-2">
                  To submit a refund request, contact us at <strong>support@dates.care</strong>. Please describe
                  your issue in detail and explain why refunding would be suitable.
                </p>
                <p>
                  Our team reviews each request individually. We need at least 48 hours to determine the request
                  and reach out to you.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">4.15 Evidence Required</h4>
                <p className="mb-2">
                  We will ask you to provide evidence or additional information. Several rounds of evidence
                  submission may be required. Required information may include:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Your account ID</li>
                  <li>Screenshots of communication</li>
                  <li>Detailed explanation of concerns</li>
                  <li>Description of essential factors</li>
                </ul>
                <p className="mt-2 text-red-600 font-semibold">
                  We do not tolerate forged evidence. If we doubt credibility, we may omit it or close your request.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">4.19 Partial Refunds</h4>
                <p className="mb-2">We may offer partial refund if:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>The request lacks sufficient evidence</li>
                  <li>There is conflicting evidence</li>
                  <li>We could not fully verify alleged facts</li>
                  <li>Your actions or inaction made the case more serious</li>
                </ul>
                <p className="mt-2">
                  The amount refunded will NOT exceed the amount paid for a particular paid feature.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">4.21 Refund Request May Be Declined If:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Request submitted after expiry of time limits</li>
                  <li>You did not approve formal investigation or revoked approval</li>
                  <li>We believe at least part of evidence is forged or modified</li>
                  <li>You did not answer additional information request within 7 days</li>
                </ul>
              </div>

              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mt-4">
                <p className="text-sm font-semibold text-gray-900">
                  The decision to issue or decline a refund request is final and non-negotiable. Datescare
                  decides upon its sole discretion after considering all available facts.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="border-t pt-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
              <p><strong>For refund requests:</strong> support@dates.care</p>
              <p><strong>For general inquiries:</strong> support@bestdates.com</p>
              <p><strong>Legal matters:</strong> legal@bestdates.com</p>
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
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};
