import React, { useState } from 'react';
import { TrafficAnalytics } from './TrafficAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, CreditCard, Users, Settings, BarChart3, LogOut, Key, Eye, EyeOff, RefreshCw, CheckCircle, Search, Gift, History, Zap, BookOpen, UserX } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { searchMembers, staffOverview, memberDisplayName, verificationLabel, type MemberRow, type OverviewCounts } from '@/lib/staffMembers';
import { changeStaffPassword, resetStaffPassword, getAllStaffMembers, hasStaffPermission } from '@/lib/staffManager';
import { RewardPanel } from '@/components/RewardPanel';
import { AutomatedRulesPanel } from '@/components/AutomatedRulesPanel';
import { RewardHistoryViewer } from '@/components/RewardHistoryViewer';
import { StaffAccessRequests } from '@/components/StaffAccessRequests';
import { PhotoMigrationTool } from '@/components/PhotoMigrationTool';
import { CareBlogEditor } from '@/components/CareBlogEditor';
import { formatWhen, formatDay, timeAgo } from '@/lib/when';
import { AccountDeletionsPanel } from '@/components/AccountDeletionsPanel';

interface StaffPanelProps {
  onLogout: () => void;
  staffAuth: any;
  isAdmin?: boolean;
}

export const StaffPanel: React.FC<StaffPanelProps> = ({ onLogout, staffAuth, isAdmin = false }) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'traffic' | 'users' | 'credits' | 'rewards' | 'rules' | 'history' | 'password' | 'access' | 'blog' | 'deletions'>('overview');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
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

  // Members - the real ones, from the database, staff-gated server side.
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [overview, setOverview] = useState<OverviewCounts | null>(null);
  const [overviewError, setOverviewError] = useState('');

  // Search as the staffer types, a beat after the last keystroke, and
  // never show results for an older keystroke over a newer one.
  React.useEffect(() => {
    if (selectedTab !== 'users') return;
    let stale = false;
    setMembersLoading(true);
    setMembersError('');
    const timer = setTimeout(async () => {
      try {
        const rows = await searchMembers(userSearchTerm, 25);
        if (!stale) setMembers(rows);
      } catch (e: any) {
        if (!stale) { setMembers([]); setMembersError(e?.message || 'Search failed'); }
      } finally {
        if (!stale) setMembersLoading(false);
      }
    }, userSearchTerm.trim() ? 250 : 0);
    return () => { stale = true; clearTimeout(timer); };
  }, [selectedTab, userSearchTerm]);

  React.useEffect(() => {
    if (selectedTab !== 'overview') return;
    let stale = false;
    staffOverview()
      .then((o) => { if (!stale) { setOverview(o); setOverviewError(''); } })
      .catch((e: any) => { if (!stale) setOverviewError(e?.message || 'Could not load counts'); });
    return () => { stale = true; };
  }, [selectedTab]);

  // Load staff members once
  React.useEffect(() => {
    const loadStaff = async () => {
      if (staffAuth && staffAuth.permissions?.includes('manage_users')) {
        const staff = await getAllStaffMembers(staffAuth.staffId);
        if (staff) {
          setAllStaff(staff);
        }
      }
    };
    loadStaff();
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

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const awardCredits = async () => {
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

      const { supabaseClient } = await import('@/lib/supabase');

      // Check if input is an email address or UUID
      let userId = selectedUserId.trim();
      const isEmail = userId.includes('@');

      if (isEmail) {
        // Look up user_id from email
        const { data: userData, error: lookupError } = await supabaseClient
          .from('user_profiles')
          .select('user_id')
          .eq('email', userId)
          .maybeSingle();

        if (lookupError || !userData) {
          // Try auth.users table as fallback
          const { data: authData, error: authError } = await supabaseClient.rpc('get_user_id_by_email', {
            p_email: userId
          });

          if (authError || !authData) {
            alert(`User not found with email: ${userId}`);
            return;
          }

          userId = authData;
        } else {
          userId = userData.user_id;
        }
      }

      // Award credits using database function
      const { data, error } = await supabaseClient.rpc('add_credits_atomic', {
        p_user_id: userId,
        p_amount: amount,
        p_credit_type: 'complimentary',
        p_description: `Staff Award: ${creditReason}`,
        p_category: 'staff_award'
      });

      if (error) {
        console.error('Error awarding credits:', error);
        alert(`Failed to award credits: ${error.message || 'Please try again.'}`);
        return;
      }

      const result = data as any;
      if (!result.success) {
        alert(`Failed to award credits: ${result.error}`);
        return;
      }

      alert(`✅ Awarded ${amount} credits!\nUser: ${isEmail ? selectedUserId : userId}\nNew balance: ${result.new_balance} credits`);

      // Reset form
      setSelectedUserId('');
      setSelectedMember(null);
      setCreditAmount('');
      setCreditReason('');
    } catch (error: any) {
      console.error('Error awarding credits:', error);
      alert(`Failed to award credits: ${error.message || 'Please try again.'}`);
    }
  };

  const handleChangePassword = async () => {
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

      const result = await changeStaffPassword(
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

  const handleResetPassword = async () => {
    try {
      if (!passwordForm.targetStaffId || !passwordForm.managerPassword) {
        alert('Please enter target staff ID and your manager password');
        return;
      }

      const result = await resetStaffPassword(
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

  const pickMember = (m: MemberRow) => {
    setSelectedMember(m);
    setSelectedUserId(m.user_id);
    setSelectedTab('credits');
  };

  const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
              <p className="text-white/80 text-sm break-all">{staffAuth?.email || staffAuth?.staffId} ({staffAuth?.role})</p>
              <p className="text-white/60 text-xs">
                {staffAuth?.loginTime
                  ? `Signed in ${timeAgo(staffAuth.loginTime)} · ${formatWhen(staffAuth.loginTime)}`
                  : 'Signed in this session'}
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

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-300">{successMessage}</p>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'traffic', label: 'Traffic & Ads', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'credits', label: 'Credits', icon: CreditCard },
            { id: 'rewards', label: 'Rewards', icon: Gift },
            { id: 'rules', label: 'Auto Rules', icon: Zap },
            { id: 'history', label: 'History', icon: History },
            { id: 'access', label: 'Free Access', icon: Shield },
            ...(isAdmin ? [{ id: 'blog', label: 'Care Blog', icon: BookOpen }] : []),
            ...(isAdmin ? [{ id: 'deletions', label: 'Deletions', icon: UserX }] : []),
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
                className={`flex-1 flex items-center justify-center py-3 px-2 sm:px-4 rounded-xl transition-all duration-300 cursor-pointer touch-manipulation active:scale-95 whitespace-nowrap ${
                  selectedTab === tab.id
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
                type="button"
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="font-medium text-xs sm:text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
          {selectedTab === 'traffic' && <TrafficAnalytics />}

          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-white font-semibold text-lg">System Overview</h3>
              
              {overviewError && (
                <p className="text-red-300 text-sm">{overviewError}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Users className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{overview ? overview.members.toLocaleString() : '…'}</p>
                  <p className="text-white/70 text-sm">Members</p>
                  {overview && (
                    <p className="text-white/50 text-xs mt-1">{overview.verified.toLocaleString()} verified · {overview.joined_7d.toLocaleString()} joined this week</p>
                  )}
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <CreditCard className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{overview ? money(overview.paid_usd) : '…'}</p>
                  <p className="text-white/70 text-sm">Paid, all time</p>
                  {overview && (
                    <p className="text-white/50 text-xs mt-1">{overview.paid_count.toLocaleString()} completed payment{overview.paid_count === 1 ? '' : 's'} · {money(overview.paid_30d_usd)} in 30 days</p>
                  )}
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Zap className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{overview ? overview.active_7d.toLocaleString() : '…'}</p>
                  <p className="text-white/70 text-sm">Active in the last 7 days</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <UserX className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{overview ? overview.pending_deletions.toLocaleString() : '…'}</p>
                  <p className="text-white/70 text-sm">Deletions pending</p>
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
              <h3 className="text-white font-semibold text-lg">Members</h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <Search className="w-5 h-5 mr-2" />
                  Find a member
                </h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <Input
                    type="search"
                    autoComplete="off"
                    placeholder="Name, email, or user ID"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10 w-full bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <p className="text-blue-700 text-sm mt-2">
                  Any part of the name or email will do. With nothing typed, the most recently active members are listed.
                </p>
              </div>

              {membersError && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
                  <p className="text-red-200 text-sm">{membersError}</p>
                </div>
              )}

              <div className="space-y-3" aria-busy={membersLoading}>
                {membersLoading && members.length === 0 ? (
                  <p className="text-white/60 text-sm text-center py-6">Searching…</p>
                ) : members.length === 0 && !membersError ? (
                  <div className="text-center py-8">
                    <Search className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <h4 className="text-white font-medium mb-2">No member matches</h4>
                    <p className="text-white/70 text-sm">
                      Nobody has that in their name, email, or user ID. Try fewer letters.
                    </p>
                  </div>
                ) : (
                  members.map((m) => (
                    <div key={m.user_id} className={`bg-white/10 rounded-xl p-4 ${membersLoading ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-white font-medium truncate">
                            {memberDisplayName(m)}
                            {m.is_admin && <span className="ml-2 text-[10px] uppercase tracking-wide bg-purple-500/40 text-purple-100 px-1.5 py-0.5 rounded">Admin</span>}
                            {!m.is_admin && m.is_staff && <span className="ml-2 text-[10px] uppercase tracking-wide bg-blue-500/40 text-blue-100 px-1.5 py-0.5 rounded">Staff</span>}
                            {m.deletion_pending && <span className="ml-2 text-[10px] uppercase tracking-wide bg-red-500/40 text-red-100 px-1.5 py-0.5 rounded">Deletion pending</span>}
                          </h4>
                          <p className="text-white/70 text-sm break-all">{m.email || 'No email on profile'}</p>
                          <p className="text-white/60 text-xs">
                            {m.credits.toLocaleString()} credits · {verificationLabel(m.verification_status)}
                          </p>
                          <p className="text-white/50 text-xs">
                            Joined {formatDay(m.joined_at)} · Last active {m.last_active ? timeAgo(m.last_active) : 'not recorded'}
                          </p>
                          <p className="text-white/40 text-[11px] font-mono break-all">{m.user_id}</p>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            pickMember(m);
                          }}
                          className="shrink-0 bg-blue-500 text-white px-3 py-1 text-sm cursor-pointer touch-manipulation active:scale-95"
                          type="button"
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedTab === 'credits' && (
            <div className="space-y-6">
              <h3 className="text-white font-semibold text-lg">Credit Management</h3>
              
              {/* Selected User Info */}
              {selectedUserId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Selected member</h4>
                  {selectedMember && selectedMember.user_id === selectedUserId ? (
                    <div className="text-blue-800 text-sm">
                      <p><strong>{memberDisplayName(selectedMember)}</strong>{selectedMember.email ? ` · ${selectedMember.email}` : ''}</p>
                      <p><strong>Credits now:</strong> {selectedMember.credits.toLocaleString()}</p>
                      <p className="font-mono text-xs break-all">{selectedMember.user_id}</p>
                    </div>
                  ) : (
                    <div className="text-blue-800 text-sm">
                      <p className="break-all"><strong>Typed by hand:</strong> {selectedUserId}</p>
                      <p className="text-blue-600 text-xs">Balance is not shown for a hand-typed address; pick the member from the Users tab to see it.</p>
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      setSelectedUserId('');
                      setSelectedMember(null);
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
                    <label className="block text-white font-medium mb-2">User ID or Email</label>
                    <Input
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      placeholder="Enter email (e.g., user@example.com) or user ID"
                      className="bg-white/20 text-white placeholder-white/50 border-white/30"
                    />
                    <p className="text-white/60 text-xs mt-1">
                      💡 You can enter either an email address or a user ID. Use the Users tab to search and select users.
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

          {selectedTab === 'rewards' && (
            <RewardPanel
              selectedUserId={selectedUserId}
              staffId={staffAuth?.staffId}
              onSuccess={showSuccess}
              onError={showError}
            />
          )}

          {selectedTab === 'rules' && (
            <AutomatedRulesPanel
              staffId={staffAuth?.staffId}
              onSuccess={showSuccess}
              onError={showError}
            />
          )}

          {selectedTab === 'history' && (
            <RewardHistoryViewer
              selectedUserId={selectedUserId}
              onError={showError}
            />
          )}

          {selectedTab === 'access' && (
            <div className="space-y-6">
              <StaffAccessRequests isAdmin={isAdmin} />
              {isAdmin && <PhotoMigrationTool />}
            </div>
          )}

          {selectedTab === 'blog' && isAdmin && (
            <CareBlogEditor onSuccess={showSuccess} onError={showError} />
          )}

          {selectedTab === 'deletions' && isAdmin && (
            <AccountDeletionsPanel onSuccess={showSuccess} onError={showError} />
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
              <span>{staffAuth?.loginTime ? timeAgo(staffAuth.loginTime) : 'this session'}</span>
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