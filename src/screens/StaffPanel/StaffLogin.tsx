import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Lock, User, AlertTriangle, Eye, EyeOff, Key } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { authenticateStaff } from '@/lib/staffManager';

interface StaffLoginProps {
  onNavigate: (screen: string) => void;
  onStaffLogin: (staffId: string) => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ onNavigate, onStaffLogin }) => {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffId.trim() || !password.trim()) {
      setError('Please enter both Staff ID and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting staff authentication...');
      const result = await authenticateStaff(staffId.trim(), password);

      if (result.success) {
        console.log(`✅ Staff authentication successful: ${staffId}`);

        // Show success message
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-semibold';
        successDiv.textContent = '✅ Login successful! Redirecting...';
        document.body.appendChild(successDiv);

        // Small delay to show success message
        setTimeout(() => {
          document.body.removeChild(successDiv);
          onStaffLogin(staffId);
        }, 1000);
      } else {
        console.error('Authentication failed:', result.error);
        setError(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout
      title="Staff Login"
      onBack={() => onNavigate('discovery')}
      showClose={true}
      onClose={() => onNavigate('discovery')}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-red-500 to-purple-500 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Staff Access</h2>
          <p className="text-white/80 mb-2">Authorized personnel only</p>
          <p className="text-white/60 text-sm italic">Meet genuine Singles looking for meaningful connections</p>
        </div>

        {/* Security Notice */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center text-red-600 mb-2">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <strong>Restricted Access</strong>
          </div>
          <p className="text-red-600 text-sm">
            This area is restricted to authorized Dates.care staff members only. 
            Unauthorized access attempts are logged and monitored.
          </p>
        </div>

        {/* Valid Staff Accounts */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-blue-800 font-semibold mb-3">Available Staff Accounts</h3>
          <div className="space-y-2 text-blue-700 text-sm">
            <div className="flex justify-between">
              <span><strong>admin@dates.care</strong> - Super User</span>
              <span className="text-blue-600">Full Access</span>
            </div>
            <div className="flex justify-between">
              <span><strong>creditmanager@dates.care</strong> - Credit Manager</span>
              <span className="text-red-600">Credit + Password Management</span>
            </div>
            <div className="flex justify-between">
              <span><strong>support@dates.care</strong> - Support Agent</span>
              <span className="text-blue-600">Support Access</span>
            </div>
          </div>

          {/* Database-backed Notice */}
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center text-green-600 mb-2">
              <Key className="w-4 h-4 mr-2" />
              <strong>Secure Authentication</strong>
            </div>
            <p className="text-green-600 text-xs">
              All staff credentials are now stored securely in the database with bcrypt hashing.
              Passwords can be changed by Super Users and Credit Managers.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center text-red-600">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-white font-medium mb-2">Staff ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="Enter your staff ID (e.g., SU, admin@dates.care)"
                className="pl-10 bg-white/90 h-12"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-10 pr-10 bg-white/90 h-12"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            onClick={(e) => {
              console.log('Login button clicked');
            }}
            className="w-full h-14 bg-gradient-to-r from-red-500 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-red-600 hover:to-purple-700 hover:scale-105 transition-all duration-300 cursor-pointer touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            disabled={isLoading || !staffId.trim() || !password.trim()}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                <span>Authenticating...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Shield className="w-5 h-5 mr-3" />
                <span>Access Staff Panel</span>
              </div>
            )}
          </Button>
        </form>

        {/* Initial Setup Credentials */}
        <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 shadow-md">
          <h3 className="text-yellow-800 font-semibold mb-3 text-center">Initial Setup - Default Credentials</h3>
          <p className="text-yellow-700 text-sm mb-4 text-center">Click any button below to auto-fill login form:</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => {
                setStaffId('admin@dates.care');
                setPassword('AdminPass2025!');
                setError('');
              }}
              className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 active:scale-95 shadow-md"
            >
              <div className="flex items-center justify-between">
                <span>Super User</span>
                <span className="text-xs bg-blue-700 px-2 py-1 rounded">Full Access</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setStaffId('creditmanager@dates.care');
                setPassword('CreditPass2025!');
                setError('');
              }}
              className="bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 active:scale-95 shadow-md"
            >
              <div className="flex items-center justify-between">
                <span>Credit Manager</span>
                <span className="text-xs bg-green-700 px-2 py-1 rounded">Credits + Passwords</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setStaffId('support@dates.care');
                setPassword('SupportPass2025!');
                setError('');
              }}
              className="bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 active:scale-95 shadow-md"
            >
              <div className="flex items-center justify-between">
                <span>Support Agent</span>
                <span className="text-xs bg-purple-700 px-2 py-1 rounded">Support</span>
              </div>
            </button>
          </div>
          <p className="text-red-600 text-xs mt-3 text-center font-semibold">
            ⚠️ IMPORTANT: Change these default passwords immediately after first login!
          </p>
          <p className="text-yellow-600 text-xs mt-1 text-center italic">
            After clicking, press "Access Staff Panel" button above
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-white/60 text-xs">
            All login attempts are logged and monitored for security purposes.
          </p>
          <p className="text-white/60 text-xs mt-1">
            Contact IT support if you need assistance: tech@dates.care
          </p>
        </div>
      </div>
    </Layout>
  );
};