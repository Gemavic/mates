import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  Lock, 
  User, 
  AlertTriangle, 
  CreditCard, 
  Users, 
  Settings,
  BarChart3,
  LogOut,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  Search
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { creditManager } from '@/lib/creditSystem';
import { getCurrentStaffSession, changeStaffPassword, resetStaffPassword, getAllStaffMembers, hasStaffPermission } from '@/lib/staffManager';

interface StaffPanelProps {
  onLogout: () => void;
  staffAuth: any;
}

export const StaffPanel: React.FC<StaffPanelProps> = ({ onLogout, staffAuth }) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'users' | 'credits' | 'password'>('overview');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // Password management state
  const [passwordForm, setPasswordForm] = useState({
    targetStaffId: '',
    newPassword: '',
    confirmPassword: '',
    managerPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
    manager: false
  });
  
  const [allStaff, setAllStaff] = useState<any[]>([]);
  
  // Load staff members once
  React.useEffect(() => {
    if (staffAuth && staffAuth.permissions?.includes('manage_users')) {
      const staff = getAllStaffMembers(staffAuth.staffId);
      if (staff) {
        setAllStaff(staff);
      }
    }
  }, [staffAuth?.staffId, staffAuth?.permissions]);

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('staffAuth');
      console.log('✅ Staff logged out successfully');
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      onLogout();
    }
  };

  const awardCredits = () => {
    try {
      if (!selectedUserId || !creditAmount || !creditReason) {
        alert('Please fill in all fields');
        return;
      }

      const amount = parseInt(creditAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid credit amount');
        return;
      }

      if (!hasStaffPermission(staffAuth?.staffId, 'award_credits')) {
        alert('You do not have permission to award credits');
        return;
      }

      // Award credits
      creditManager.addCredits(selectedUserId, amount, `Staff Award: ${creditReason}`, false);
      
      alert(`✅ Awarded ${amount} credits to user ${selectedUserId}`);
      
      // Reset form
      setSelectedUserId('');
      setCreditAmount('');
      setCreditReason('');
    } catch (error) {
      console.error('Error awarding credits:', error);
      alert('Failed to award credits. Please try again.');
    }
  };

  const handleChangePassword = () => {
    try {
      if (!passwordForm.targetStaffId || !passwordForm.newPassword || !passwordForm.confirmPassword || !passwordForm.managerPassword) {
        alert('Please fill in all fields');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        alert('New passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }

      const result = changeStaffPassword(
        staffAuth.staffId,
        passwordForm.managerPassword,
        passwordForm.targetStaffId,
        passwordForm.newPassword
      );

      if (result.success) {
        alert(`✅ Password changed for ${passwordForm.targetStaffId}`);

        // Reset form
        setPasswordForm({
          targetStaffId: '',
          newPassword: '',
          confirmPassword: '',
          managerPassword: ''
        });
      } else {
        alert(`Failed to change password: ${result.error}`);
      }
    } catch (error) {
      console.error('Password change error:', error);
      alert('Failed to change password. Please try again.');
    }
  };

  const handleResetPassword = () => {
    try {
      if (!passwordForm.targetStaffId || !passwordForm.managerPassword) {
        alert('Please enter target staff ID and your manager password');
        return;
      }

      const result = resetStaffPassword(
        staffAuth.staffId,
        passwordForm.managerPassword,
        passwordForm.targetStaffId
      );

      if (result.success) {
        alert(`✅ Password Reset Successful\nNew password for ${passwordForm.targetStaffId}: ${result.newPassword}`);

        // Reset form
        setPasswordForm({
          targetStaffId: '',
          newPassword: '',
          confirmPassword: '',
          managerPassword: ''
        });
      } else {
        alert(`Failed to reset password: ${result.error}`);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      alert('Failed to reset password. Please try again.');
    }
  };

  const mockUsers = [
    { id: 'user1', name: 'John Doe', email: 'john@example.com', credits: 120 },
    { id: 'user2', name: 'Jane Smith', email: 'jane@example.com', credits: 85 },
    { id: 'user3', name: 'Mike Johnson', email: 'mike@example.com', credits: 200 },
    { id: 'current-user', name: 'Demo User', email: 'demo@example.com', credits: creditManager.getTotalCredits('current-user') }
  ];

  // Filter users based on search term
  const filteredUsers = mockUsers.filter(user => 
    user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(userSearchTerm.toLowerCase())
  );
  
  return (
    <Layout
      title="Staff Panel"
      onBack={handleLogout}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Staff Panel</h2>
          <p className="text-white/80 mb-2">Welcome, {staffAuth?.role || 'Staff Member'}</p>
          <p className="text-white/60 text-sm italic">Meet genuine Singles looking for meaningful connections</p>
        </div>

        {/* Staff Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Logged in as:</h3>
              <p className="text-white/80 text-sm">{staffAuth?.staffId} ({staffAuth?.role})</p>
              <p className="text-white/60 text-xs">
                Login: {new Date(staffAuth?.loginTime).toLocaleString()}
              </p>
            </div>
            <Button
              onClick={handleLogout}
              className="bg-red-500 text-white hover:bg-red-600 px-4 py-2 cursor-pointer touch-manipulation active:scale-95"
              type="button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'credits', label: 'Credits', icon: CreditCard },
            ...((staffAuth?.permissions?.includes('change_staff_passwords') || staffAuth?.permissions?.includes('all')) ? 
              [{ id: 'password', label: 'Passwords', icon: Key }] : [])
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedTab(tab.id as any);
                }}
                className={`flex-1 flex items-center justify-center py-3 px-2 sm:px-4 rounded-xl transition-all duration-300 cursor-pointer touch-manipulation active:scale-95 ${
                  selectedTab === tab.id 
                    ? 'bg-white text-gray-900 shadow-lg' 
                    : 'text-white hover:bg-white/10'
                }`}
                type="button"
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="font-medium text-sm sm:text-base">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-white font-semibold text-lg">System Overview</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Users className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">1,234</p>
                  <p className="text-white/70 text-sm">Total Users</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <CreditCard className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">$12,345</p>
                  <p className="text-white/70 text-sm">Revenue</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Your Permissions</h4>
                <div className="flex flex-wrap gap-2">
                  {staffAuth?.permissions?.map((permission: string, index: number) => (
                    <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'users' && (
            <div className="space-y-6">
              <h3 className="text-white font-semibold text-lg">User Management</h3>
              
              {/* Search Bar for Credit Managers */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <Search className="w-5 h-5 mr-2" />
                  Quick User Search for Credit Managers
                </h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, or user ID..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10 w-full bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <p className="text-blue-700 text-sm mt-2">
                  💡 Tip: Search for any part of the name, email, or user ID for instant results
                </p>
              </div>
              
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <h4 className="text-white font-medium mb-2">No Users Found</h4>
                    <p className="text-white/70 text-sm">
                      No users match your search criteria. Try a different search term.
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="bg-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">{user.name}</h4>
                          <p className="text-white/70 text-sm">{user.email}</p>
                          <p className="text-white/60 text-xs">{user.credits} credits</p>
                          <p className="text-white/50 text-xs">ID: {user.id}</p>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedUserId(user.id);
                            setSelectedTab('credits');
                          }}
                          className="bg-blue-500 text-white px-3 py-1 text-sm cursor-pointer touch-manipulation active:scale-95"
                          type="button"
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Quick Actions for Selected User */}
              {userSearchTerm && filteredUsers.length === 1 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Quick Actions</h4>
                  <div className="flex space-x-2">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedUserId(filteredUsers[0].id);
                        setSelectedTab('credits');
                        setUserSearchTerm('');
                      }}
                      className="bg-green-500 text-white px-4 py-2 text-sm cursor-pointer touch-manipulation active:scale-95"
                      type="button"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Credits
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'credits' && (
            <div className="space-y-6">
              <h3 className="text-white font-semibold text-lg">Credit Management</h3>
              
              {/* Selected User Info */}
              {selectedUserId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Selected User</h4>
                  <div className="text-blue-800">
                    <p><strong>User ID:</strong> {selectedUserId}</p>
                    <p><strong>Current Credits:</strong> {creditManager.getTotalCredits(selectedUserId)} credits</p>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedUserId('');
                      setSelectedTab('users');
                    }}
                    className="mt-2 bg-blue-500 text-white px-3 py-1 text-sm"
                    type="button"
                  >
                    ← Back to User List
                  </Button>
                </div>
              )}
              
              {!(staffAuth?.permissions?.includes('award_credits') || staffAuth?.permissions?.includes('all')) ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center text-red-600">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Insufficient Permissions</span>
                  </div>
                  <p className="text-red-600 text-sm mt-2">
                    You do not have permission to award credits. Contact an administrator.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-medium mb-2">User ID</label>
                    <Input
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      placeholder="Enter user ID (e.g., current-user)"
                      className="bg-white/20 text-white placeholder-white/50 border-white/30"
                    />
                    <p className="text-white/60 text-xs mt-1">
                      💡 Use the search in Users tab to quickly find and select users
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-white font-medium mb-2">Credit Amount</label>
                    <Input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="bg-white/20 text-white placeholder-white/50 border-white/30"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-medium mb-2">Reason</label>
                    <Input
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      placeholder="Reason for credit award"
                      className="bg-white/20 text-white placeholder-white/50 border-white/30"
                    />
                  </div>

                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      awardCredits();
                    }}
                    disabled={!selectedUserId || !creditAmount || !creditReason}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 cursor-pointer touch-manipulation active:scale-95"
                    type="button"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Award Credits
                  </Button>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'password' && (staffAuth?.permissions?.includes('change_staff_passwords') || staffAuth?.permissions?.includes('all')) && (
            <div className="space-y-6">
              <h3 className="text-white font-semibold text-lg">Password Management</h3>
              
              {/* Staff List */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Staff Members</h4>
                <div className="space-y-2">
                  {allStaff.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-2 bg-blue-100 rounded">
                      <div>
                        <span className="text-blue-900 font-medium text-sm">{staff.id}</span>
                        <span className="text-blue-700 text-xs ml-2">({staff.role})</span>
                      </div>
                      <button
                        onClick={() => setPasswordForm(prev => ({ ...prev, targetStaffId: staff.id }))}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Target Staff ID</label>
                  <Input
                    value={passwordForm.targetStaffId}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, targetStaffId: e.target.value }))}
                    placeholder="Select from list above or enter manually"
                    className="bg-white/20 text-white placeholder-white/50 border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">New Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password (min 6 chars)"
                      className="bg-white/20 text-white placeholder-white/50 border-white/30 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      className="bg-white/20 text-white placeholder-white/50 border-white/30 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Your Manager Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.manager ? 'text' : 'password'}
                      value={passwordForm.managerPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, managerPassword: e.target.value }))}
                      placeholder="Enter your current password to confirm"
                      className="bg-white/20 text-white placeholder-white/50 border-white/30 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, manager: !prev.manager }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showPasswords.manager ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleChangePassword();
                    }}
                    disabled={!passwordForm.targetStaffId || !passwordForm.newPassword || !passwordForm.confirmPassword || !passwordForm.managerPassword}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 cursor-pointer touch-manipulation active:scale-95"
                    type="button"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                  
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleResetPassword();
                    }}
                    disabled={!passwordForm.targetStaffId || !passwordForm.managerPassword}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 cursor-pointer touch-manipulation active:scale-95"
                    type="button"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center text-yellow-600 mb-2">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <strong>Password Reset Information</strong>
                  </div>
                  <p className="text-yellow-600 text-sm">
                    Reset to Default will restore the original password for the staff member. 
                    The new default password will be shown after reset.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const successMessage = document.createElement('div');
              successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
              successMessage.textContent = '📊 System report generated successfully!';
              document.body.appendChild(successMessage);
              setTimeout(() => {
                if (document.body.contains(successMessage)) {
                  document.body.removeChild(successMessage);
                }
              }, 3000);
            }}
            className="bg-blue-500 text-white font-semibold hover:bg-blue-600 py-3 cursor-pointer touch-manipulation active:scale-95"
            type="button"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const successMessage = document.createElement('div');
              successMessage.className = 'fixed top-4 right-4 bg-purple-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
              successMessage.textContent = '🔄 System sync completed successfully!';
              document.body.appendChild(successMessage);
              setTimeout(() => {
                if (document.body.contains(successMessage)) {
                  document.body.removeChild(successMessage);
                }
              }, 3000);
            }}
            className="bg-purple-500 text-white font-semibold hover:bg-purple-600 py-3 cursor-pointer touch-manipulation active:scale-95"
            type="button"
          >
            <Settings className="w-4 h-4 mr-2" />
            Sync System
          </Button>
        </div>

        {/* Session Security Info */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-3">Session Information</h3>
          <div className="space-y-2 text-white/80 text-sm">
            <div className="flex justify-between">
              <span>Staff ID:</span>
              <span className="font-mono">{staffAuth?.staffId}</span>
            </div>
            <div className="flex justify-between">
              <span>Role:</span>
              <span>{staffAuth?.role}</span>
            </div>
            <div className="flex justify-between">
              <span>Login Time:</span>
              <span>{new Date(staffAuth?.loginTime).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Session Status:</span>
              <span className="text-green-400 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};