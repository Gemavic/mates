import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bitcoin, Shield, Loader2, X, Wallet, Copy, QrCode, Clock } from 'lucide-react';
import { DATES_CRYPTO_WALLETS, calculateCryptoAmount, getCryptoPrice } from '@/lib/cryptoWallets';
import { startCryptoCheckout, type CheckoutKind } from '@/lib/cryptoCheckout';
import { useAuth } from '@/hooks/useAuth';

interface PaymentGatewayProps {
  amount: number;
  packageName: string;
  credits: number;
  /**
   * What is actually being bought, taken straight from the product.
   *
   * This used to be guessed backwards from the credit count, which meant
   * subscriptions - which carry no credit count at all - could never be paid
   * for with crypto, and any change to a package's size silently broke its
   * checkout.
   */
  checkoutKind: CheckoutKind;
  checkoutId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  packageName,
  credits,
  checkoutKind,
  checkoutId,
  onSuccess: _onSuccess,
  onCancel,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTC');
  const [cryptoPayment] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState<'method' | 'payment' | 'confirmation'>('method');
  const { user } = useAuth();

  const handleCryptoPayment = async () => {
    if (!user) {
      alert('Please sign in to make a payment');
      return;
    }

    if (!checkoutId) {
      alert('This package is temporarily unavailable. Please choose another.');
      return;
    }

    setIsProcessing(true);
    // Redirects to a hosted invoice with a unique payment address.
    // Credits are added automatically after blockchain confirmation.
    const result = await startCryptoCheckout(checkoutKind, checkoutId);
    if (!result.ok) {
      setIsProcessing(false);
      alert(result.error || 'Could not start checkout.');
    }
  };

  const confirmCryptoPayment = () => {
    // Legacy manual-confirmation flow removed: crediting only ever happens
    // server-side via the payment webhook after real confirmation.
    setPaymentStep('method');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const selectedWallet = Object.values(DATES_CRYPTO_WALLETS).find(w => w.symbol === selectedCrypto);
  const tempCryptoAmount = selectedWallet ? calculateCryptoAmount(amount, selectedCrypto) : null;
  const cryptoAmount = typeof tempCryptoAmount === 'number' && !isNaN(tempCryptoAmount) ? tempCryptoAmount : 0;

  // Crypto payment confirmation step
  if (paymentStep === 'confirmation' && cryptoPayment && selectedWallet) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-white animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirming Payment</h3>
            <p className="text-gray-600">Waiting for blockchain confirmations...</p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Transaction Status</span>
              <span className="text-sm text-blue-600 font-medium">Confirming</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-600">
              Confirmations: {cryptoPayment.confirmations || 0}/{selectedWallet.confirmations || 6}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">{cryptoPayment.amount?.toFixed(8) || '0.00000000'} {selectedWallet.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">USD Value:</span>
              <span className="font-medium">${cryptoPayment.usdAmount?.toFixed(2) || '0.00'}</span>
            </div>
            {cryptoPayment.txHash && (
              <div className="flex justify-between">
                <span className="text-gray-600">TX Hash:</span>
                <button 
                  onClick={() => copyToClipboard(cryptoPayment.txHash!)}
                  className="text-blue-600 hover:underline text-xs"
                >
                  {cryptoPayment.txHash.substring(0, 10)}...
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              This process usually takes 2-10 minutes depending on network congestion.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Crypto payment step
  if (paymentStep === 'payment' && selectedWallet && cryptoPayment) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Send {selectedWallet.currency}</h3>
            <button onClick={() => setPaymentStep('method')} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Payment Instructions */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <span className={`text-2xl ${selectedWallet.color}`}>{selectedWallet.icon}</span>
              <div>
                <h4 className="font-semibold">{selectedWallet.currency}</h4>
                <p className="text-sm opacity-90">{selectedWallet.network}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{cryptoAmount.toFixed(8)} {selectedWallet.symbol}</p>
              <p className="text-sm opacity-90">≈ ${amount.toFixed(2)} USD</p>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send to this address:
            </label>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-center justify-between">
                <code className="text-sm text-gray-800 break-all">{selectedWallet.address}</code>
                <button
                  onClick={() => copyToClipboard(selectedWallet.address)}
                  className="ml-2 p-1 hover:bg-gray-200 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="mb-6 text-center">
            <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <QrCode className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-2">QR Code for mobile wallets</p>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h5 className="font-semibold text-yellow-800 mb-2">Important:</h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Send exactly {cryptoAmount.toFixed(8)} {selectedWallet.symbol}</li>
              <li>• Use {selectedWallet.network} network only</li>
              <li>• Requires {selectedWallet.confirmations} confirmations</li>
              <li>• Do not send from exchange wallets</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={() => setPaymentStep('method')}
              className="flex-1 bg-gray-500 text-white"
            >
              Back
            </Button>
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*,.pdf';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    alert(`Payment proof uploaded: ${file.name}`);
                  }
                };
                input.click();
              }}
              className="flex-1 bg-blue-500 text-white"
            >
              📎 Upload Proof
            </Button>
            <Button
              onClick={confirmCryptoPayment}
              className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white"
            >
              I've Sent Payment
            </Button>
          </div>

          {/* Security Notice */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              🔒 Payments are secured with high-level encryption
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            Secure Payment
          </h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Package Info */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl p-4 text-white mb-6">
          <h4 className="font-semibold">{packageName}</h4>
          <p className="text-sm opacity-90">{credits} Credits + Bonus Kobos</p>
          <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
        </div>

        {/*
          There used to be a three-way Card / Crypto / Mobile selector here.
          Card opened a form that collected the number, expiry and CVV and then
          did nothing at all - no charge, no error, no credits - and the mobile
          buttons only raised a "coming soon" alert. Offering payment methods
          that cannot take a payment misleads members, and a card field on our
          own page with no processor behind it is a PCI problem besides.
          Crypto is the only checkout that works, so it is the only one shown.
          Card support returns here when a real processor is connected.
        */}
        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-900 mb-1 flex items-center">
              <Bitcoin className="w-5 h-5 mr-2" />
              Pay with Cryptocurrency
            </h5>
            <p className="text-xs text-blue-800/80 mb-3">
              The only payment method available right now. Card payment is coming soon.
            </p>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {Object.values(DATES_CRYPTO_WALLETS).slice(0, 6).map((wallet) => (
                  <button
                    key={wallet.symbol}
                    onClick={() => setSelectedCrypto(wallet.symbol)}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      selectedCrypto === wallet.symbol 
                        ? 'border-blue-500 bg-blue-100' 
                        : 'border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`text-lg ${wallet.color}`}>{wallet.icon}</span>
                      <div className="text-left">
                        <div className="text-sm font-medium">{wallet.currency}</div>
                        <div className="text-xs text-gray-600">{wallet.symbol} • {wallet.network}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        {calculateCryptoAmount(amount, wallet.symbol).toFixed(8)}
                      </div>
                      <div className="text-xs text-gray-600">
                        ${getCryptoPrice(wallet.symbol).toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Selected Crypto Summary */}
              {selectedWallet && (
                <div className="bg-blue-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${selectedWallet.color}`}>{selectedWallet.icon}</span>
                      <span className="font-medium">{selectedWallet.currency}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{cryptoAmount.toFixed(8)} {selectedWallet.symbol}</div>
                      <div className="text-xs text-gray-600">≈ ${amount.toFixed(2)} USD</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center text-yellow-800 text-sm">
                <Bitcoin className="w-4 h-4 mr-2" />
                <span>Send payment to our official Dates.care wallet address</span>
              </div>
            </div>
            
            {/* This box said "High-Security Encryption Active" and "maximum security
                encryption for all sensitive data". There is no encryption layer in this
                product beyond HTTPS; lib/encryption.ts is disabled and imported by nothing.
                A security claim beside a pay button that the code cannot back is the
                first thing a payment underwriter notices. Say what is true instead. */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center text-green-800 text-sm mb-2">
                <Shield className="w-4 h-4 mr-2" />
                <span className="font-medium">How this payment works</span>
              </div>
              <p className="text-xs text-green-700">
                You are taken to a hosted invoice with a one-time payment address. Credits are added
                to your account automatically once the network confirms the payment.
              </p>
            </div>

            {/* Dates.care Official Wallets Notice */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center text-purple-800 text-sm mb-2">
                <Wallet className="w-4 h-4 mr-2" />
                <span className="font-medium">Official Dates.care Wallets</span>
              </div>
              <p className="text-xs text-purple-700">
                These are the official Dates.care cryptocurrency wallet addresses. 
                Send payments only to these verified addresses for your security.
              </p>
            </div>
        </div>

        {/* Security Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
          <div className="flex items-center space-x-2 text-green-600 mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Secure connection</span>
          </div>
          <p className="text-xs text-gray-600">
            This page is served over HTTPS. Dates.care never sees or stores card details, because
            no card is entered here.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={onCancel}
            className="flex-1 bg-gray-500 text-white hover:bg-gray-600"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCryptoPayment}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:scale-105 transition-all duration-300"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {`Pay ${cryptoAmount.toFixed(8)} ${selectedCrypto}`}
              </>
            )}
          </Button>
        </div>

        {/* Three badges reading Secure / Encrypted / Verified and a banner
            promising "military-grade encryption" used to sit here. Removed:
            nothing in the code did what they said. */}
        <p className="mt-4 text-center text-xs text-gray-500">
          Questions about a payment? Email admin@dates.care with your invoice reference.
        </p>
      </div>
    </div>
  );
};