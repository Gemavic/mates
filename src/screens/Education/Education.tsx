import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, PieChart, Target, Calendar, Star, BookOpen, Briefcase, Calculator, Wallet, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { BookingCalendar } from '@/components/BookingCalendar';

interface EducationProps {
  onNavigate: (screen: string) => void;
}

export const Education: React.FC<EducationProps> = ({ onNavigate }) => {
  const [selectedEducator, setSelectedEducator] = useState<string | null>(null);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);
  const [activeTab, setActiveTab] = useState<'educators' | 'calculators' | 'tips'>('calculators');

  const [investmentAmount, setInvestmentAmount] = useState('10000');
  const [investmentYears, setInvestmentYears] = useState('10');
  const [investmentRate, setInvestmentRate] = useState('7');
  const [monthlyContribution, setMonthlyContribution] = useState('500');

  const [savingsGoal, setSavingsGoal] = useState('50000');
  const [savingsMonths, setSavingsMonths] = useState('24');
  const [currentSavings, setCurrentSavings] = useState('5000');

  const [monthlyIncome, setMonthlyIncome] = useState('5000');
  const [monthlyExpenses, setMonthlyExpenses] = useState('3500');

  const [expandedTip, setExpandedTip] = useState<number | null>(null);

  const educators = [
    {
      id: '1',
      name: 'Dr. Matthew Dare',
      specialization: 'Couples Financial Education & Money Communication',
      experience: '18 years',
      rating: 4.9,
      image: 'https://images.pexels.com/photos/3778966/pexels-photo-3778966.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$150/session',
      availability: 'Available today',
      expertise: ['Financial Literacy', 'Joint Budget Planning', 'Debt Education for Couples', 'Money Conversations'],
      credentials: 'PhD, Certified Financial Educator'
    },
    {
      id: '2',
      name: 'Mina Armis',
      specialization: 'Relationship Finance Education & Budget Planning',
      experience: '12 years',
      rating: 4.9,
      image: 'https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=400',
      price: '$125/session',
      availability: 'Available tomorrow',
      expertise: ['Shared Expenses', 'Financial Trust Building', 'Financial Planning Education', 'Money Communication'],
      credentials: 'MBA, Certified Financial Educator'
    }
  ];

  const services = [
    {
      icon: DollarSign,
      title: 'Shared Budgets',
      description: 'Track income, expenses & the 50/30/20 rule',
      color: 'from-green-500 to-emerald-500',
      action: () => {
        setActiveTab('calculators');
        setTimeout(() => {
          const element = document.querySelector('[data-calculator="budget"]');
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    },
    {
      icon: TrendingUp,
      title: 'Financial Compatibility',
      description: 'Understanding money values together',
      color: 'from-blue-500 to-cyan-500',
      action: () => {
        setActiveTab('tips');
        setTimeout(() => {
          setExpandedTip(0);
        }, 100);
      }
    },
    {
      icon: PieChart,
      title: 'Splitting Expenses',
      description: 'Fair ways to share costs',
      color: 'from-purple-500 to-pink-500',
      action: () => {
        setActiveTab('tips');
        setTimeout(() => {
          setExpandedTip(2);
        }, 100);
      }
    },
    {
      icon: Target,
      title: 'Couple Goals',
      description: 'Save for wedding, home & dream vacation',
      color: 'from-orange-500 to-amber-500',
      action: () => {
        setActiveTab('calculators');
        setTimeout(() => {
          const element = document.querySelector('[data-calculator="savings"]');
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    },
    {
      icon: Briefcase,
      title: 'Debt in Relationships',
      description: 'Managing loans and debt together',
      color: 'from-red-500 to-pink-500',
      action: () => {
        setActiveTab('tips');
        setTimeout(() => {
          setExpandedTip(3);
        }, 100);
      }
    },
    {
      icon: BookOpen,
      title: 'Money Conversations',
      description: 'How to talk about finances',
      color: 'from-teal-500 to-cyan-500',
      action: () => setActiveTab('tips')
    }
  ];

  const topics = [
    {
      title: 'Money Talks for New Couples',
      description: 'Starting financial conversations in your relationship',
      duration: '4-6 sessions',
      level: 'Beginner'
    },
    {
      title: 'Managing Money Together',
      description: 'Joint accounts, shared budgets, and splitting expenses',
      duration: '6-8 sessions',
      level: 'Intermediate'
    },
    {
      title: 'Navigating Debt as a Couple',
      description: 'Student loans, credit cards, and building together',
      duration: '5-7 sessions',
      level: 'All Levels'
    },
    {
      title: 'Planning Your Future Together',
      description: 'Saving for marriage, home, and major life goals',
      duration: '6-8 sessions',
      level: 'All Levels'
    }
  ];

  const budgetTips = [
    {
      title: 'Have The Money Talk Early',
      icon: PieChart,
      summary: 'Discuss financial values and goals before combining finances',
      details: [
        'Share your financial history, debt, and credit scores openly',
        'Discuss spending habits and money values honestly',
        'Talk about financial goals for the relationship',
        'Address any money concerns or anxieties',
        'Revisit these conversations regularly as relationship grows'
      ],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Choose Your Money System',
      icon: Target,
      summary: 'Decide how to manage money together as a couple',
      details: [
        'Option 1: Fully combined finances (all money shared)',
        'Option 2: Partially combined (joint account for shared expenses)',
        'Option 3: Completely separate (split bills proportionally)',
        'There is no "right" way - choose what works for both of you',
        'Communicate openly about which system feels fair'
      ],
      color: 'from-orange-500 to-red-500'
    },
    {
      title: 'Split Expenses Fairly',
      icon: DollarSign,
      summary: 'Find equitable ways to share costs based on income',
      details: [
        '50/50 split works when incomes are similar',
        'Proportional split (by income percentage) when earnings differ',
        'One partner covers housing, other covers groceries/utilities',
        'Discuss and agree on "shared" vs "personal" expenses',
        'Revisit agreement when income or circumstances change'
      ],
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Managing Debt Together',
      icon: Wallet,
      summary: 'Navigate student loans and credit cards as a team',
      details: [
        'Be honest about existing debt before moving in or marriage',
        'Decide if you\'ll tackle debt together or keep it separate',
        'Create a plan for paying off high-interest debt first',
        'Avoid taking on joint debt until you\'re committed long-term',
        'Support each other without judgment about past financial choices'
      ],
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Handling Money Arguments',
      icon: Target,
      summary: 'Resolve financial conflicts without damaging the relationship',
      details: [
        'Money disagreements are normal - address them calmly',
        'Listen to understand, not to win the argument',
        'Avoid accusations like "you always" or "you never"',
        'Focus on finding compromise, not being "right"',
        'Consider couples financial counseling if conflicts persist'
      ],
      color: 'from-red-500 to-orange-500'
    },
    {
      title: 'Plan Big Purchases Together',
      icon: TrendingUp,
      summary: 'Make major financial decisions as a team',
      details: [
        'Set a dollar threshold for purchases that require discussion',
        'Give each partner some "fun money" with no questions asked',
        'Save together for shared goals (wedding, house, vacation)',
        'Respect each other\'s financial priorities and spending',
        'Celebrate financial milestones together as a couple'
      ],
      color: 'from-indigo-500 to-blue-500'
    }
  ];

  const calculateInvestment = () => {
    const principal = parseFloat(investmentAmount) || 0;
    const years = parseFloat(investmentYears) || 0;
    const rate = (parseFloat(investmentRate) || 0) / 100;
    const monthly = parseFloat(monthlyContribution) || 0;

    const futureValuePrincipal = principal * Math.pow(1 + rate, years);
    const futureValueContributions = monthly * 12 * (Math.pow(1 + rate, years) - 1) / rate;
    const totalInvested = principal + (monthly * 12 * years);
    const totalValue = futureValuePrincipal + futureValueContributions;
    const totalGain = totalValue - totalInvested;

    return {
      totalValue: totalValue.toFixed(2),
      totalInvested: totalInvested.toFixed(2),
      totalGain: totalGain.toFixed(2),
      gainPercentage: ((totalGain / totalInvested) * 100).toFixed(1)
    };
  };

  const calculateSavings = () => {
    const goal = parseFloat(savingsGoal) || 0;
    const months = parseFloat(savingsMonths) || 1;
    const current = parseFloat(currentSavings) || 0;
    const remaining = goal - current;
    const monthlyNeeded = remaining / months;

    return {
      remaining: remaining.toFixed(2),
      monthlyNeeded: monthlyNeeded.toFixed(2),
      percentComplete: ((current / goal) * 100).toFixed(1)
    };
  };

  const calculateBudget = () => {
    const income = parseFloat(monthlyIncome) || 0;
    const expenses = parseFloat(monthlyExpenses) || 0;
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    const needs = income * 0.5;
    const wants = income * 0.3;
    const savingsRecommended = income * 0.2;

    return {
      savings: savings.toFixed(2),
      savingsRate: savingsRate.toFixed(1),
      needs: needs.toFixed(2),
      wants: wants.toFixed(2),
      savingsRecommended: savingsRecommended.toFixed(2),
      status: savings >= savingsRecommended ? 'excellent' : savings > 0 ? 'good' : 'needs improvement'
    };
  };

  const investmentResults = calculateInvestment();
  const savingsResults = calculateSavings();
  const budgetResults = calculateBudget();

  const handleBookingConfirm = (educatorId: string, date: string, time: string) => {
    const educator = educators.find(a => a.id === educatorId);
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // ⚠️ SECURITY FIX: Replaced innerHTML with textContent to prevent XSS
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';

    const textDiv = document.createElement('div');
    const titleDiv = document.createElement('div');
    titleDiv.className = 'font-bold';
    titleDiv.textContent = 'Education Session Booked!';

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'text-sm';
    detailsDiv.textContent = (educator?.name || 'Educator') + ' • ' + formattedDate + ' at ' + time;

    textDiv.appendChild(titleDiv);
    textDiv.appendChild(detailsDiv);
    successMessage.appendChild(textDiv);

    document.body.appendChild(successMessage);
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 7000);
  };

  return (
    <Layout
      title="Education - Relationship Learning"
      onBack={() => onNavigate('welcome')}
      showClose={false}
    >
      <div className="px-4 py-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Education Center</h2>
          <p className="text-white/80 text-sm">Learn, grow, and build a strong foundation for your relationship</p>
        </div>

        <div className="mb-6">
          <h3 className="text-white font-semibold text-base mb-3">Quick Access</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {services.slice(0, 4).map((service, index) => {
              const Icon = service.icon;
              return (
                <button
                  key={index}
                  onClick={service.action}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center hover:bg-white/20 hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
                >
                  <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-r ${service.color} rounded-full flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-white font-medium text-xs mb-1">{service.title}</h4>
                  <p className="text-white/70 text-xs">{service.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-white/10 backdrop-blur-sm rounded-full p-1">
          <button
            onClick={() => setActiveTab('calculators')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === 'calculators'
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4 inline mr-1" />
            Calculators
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === 'tips'
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Lightbulb className="w-4 h-4 inline mr-1" />
            Tips
          </button>
          <button
            onClick={() => setActiveTab('educators')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === 'educators'
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 inline mr-1" />
            Educators
          </button>
        </div>

        {activeTab === 'calculators' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5" data-calculator="investment">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mr-3">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg">Investment Calculator</h3>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-white/80 text-sm mb-1 block">Initial Investment ($)</label>
                  <Input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder-white/50"
                    placeholder="10000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/80 text-sm mb-1 block">Years</label>
                    <Input
                      type="number"
                      value={investmentYears}
                      onChange={(e) => setInvestmentYears(e.target.value)}
                      className="bg-white/20 border-white/30 text-white placeholder-white/50"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="text-white/80 text-sm mb-1 block">Annual Return (%)</label>
                    <Input
                      type="number"
                      value={investmentRate}
                      onChange={(e) => setInvestmentRate(e.target.value)}
                      className="bg-white/20 border-white/30 text-white placeholder-white/50"
                      placeholder="7"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-white/80 text-sm mb-1 block">Monthly Contribution ($)</label>
                  <Input
                    type="number"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder-white/50"
                    placeholder="500"
                  />
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4">
                <h4 className="text-white font-semibold text-sm mb-3">Results</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-white/80 text-xs mb-1">Total Value</p>
                    <p className="text-white font-bold text-lg">${parseFloat(investmentResults.totalValue).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/80 text-xs mb-1">Total Gain</p>
                    <p className="text-white font-bold text-lg">${parseFloat(investmentResults.totalGain).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/80 text-xs mb-1">Total Invested</p>
                    <p className="text-white font-medium text-sm">${parseFloat(investmentResults.totalInvested).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/80 text-xs mb-1">Gain %</p>
                    <p className="text-white font-medium text-sm">{investmentResults.gainPercentage}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5" data-calculator="savings">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mr-3">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg">Savings Goal Calculator</h3>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-white/80 text-sm mb-1 block">Savings Goal ($)</label>
                  <Input
                    type="number"
                    value={savingsGoal}
                    onChange={(e) => setSavingsGoal(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder-white/50"
                    placeholder="50000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/80 text-sm mb-1 block">Time Frame (months)</label>
                    <Input
                      type="number"
                      value={savingsMonths}
                      onChange={(e) => setSavingsMonths(e.target.value)}
                      className="bg-white/20 border-white/30 text-white placeholder-white/50"
                      placeholder="24"
                    />
                  </div>
                  <div>
                    <label className="text-white/80 text-sm mb-1 block">Current Savings ($)</label>
                    <Input
                      type="number"
                      value={currentSavings}
                      onChange={(e) => setCurrentSavings(e.target.value)}
                      className="bg-white/20 border-white/30 text-white placeholder-white/50"
                      placeholder="5000"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4">
                <h4 className="text-white font-semibold text-sm mb-3">Your Plan</h4>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center">
                    <p className="text-white/80 text-xs">Progress</p>
                    <p className="text-white font-bold text-sm">{savingsResults.percentComplete}%</p>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white rounded-full h-2 transition-all duration-500"
                      style={{ width: `${Math.min(parseFloat(savingsResults.percentComplete), 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-white/80 text-xs mb-1">Monthly Needed</p>
                    <p className="text-white font-bold text-lg">${parseFloat(savingsResults.monthlyNeeded).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/80 text-xs mb-1">Remaining</p>
                    <p className="text-white font-bold text-lg">${parseFloat(savingsResults.remaining).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5" data-calculator="budget">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg">Budget Analyzer</h3>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-white/80 text-sm mb-1 block">Monthly Income ($)</label>
                  <Input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder-white/50"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="text-white/80 text-sm mb-1 block">Monthly Expenses ($)</label>
                  <Input
                    type="number"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder-white/50"
                    placeholder="3500"
                  />
                </div>
              </div>
              <div className={`rounded-xl p-4 ${
                budgetResults.status === 'excellent' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                budgetResults.status === 'good' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                'bg-gradient-to-r from-red-500 to-orange-500'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold text-sm">Budget Health</h4>
                  <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full capitalize">
                    {budgetResults.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-white/80 text-xs mb-1">Monthly Savings</p>
                    <p className="text-white font-bold text-lg">${parseFloat(budgetResults.savings).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/80 text-xs mb-1">Savings Rate</p>
                    <p className="text-white font-bold text-lg">{budgetResults.savingsRate}%</p>
                  </div>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-white font-medium text-xs mb-2">50/30/20 Rule Breakdown</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-white/90">
                      <span>Needs (50%):</span>
                      <span className="font-semibold">${parseFloat(budgetResults.needs).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white/90">
                      <span>Wants (30%):</span>
                      <span className="font-semibold">${parseFloat(budgetResults.wants).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white/90">
                      <span>Savings (20%):</span>
                      <span className="font-semibold">${parseFloat(budgetResults.savingsRecommended).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-4 mb-4">
              <Lightbulb className="w-8 h-8 text-white mb-2" />
              <h3 className="text-white font-bold text-lg mb-1">Expert Financial Tips</h3>
              <p className="text-white/90 text-sm">Proven strategies to build wealth and financial security</p>
            </div>

            {budgetTips.map((tip, index) => {
              const Icon = tip.icon;
              const isExpanded = expandedTip === index;
              return (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedTip(isExpanded ? null : index)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 bg-gradient-to-r ${tip.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="text-white font-semibold text-base mb-1">{tip.title}</h4>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-white/70 flex-shrink-0 ml-2" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-white/70 flex-shrink-0 ml-2" />
                          )}
                        </div>
                        <p className="text-white/80 text-sm">{tip.summary}</p>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className={`bg-gradient-to-r ${tip.color} rounded-xl p-4`}>
                        <ul className="space-y-2">
                          {tip.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start space-x-2 text-white text-sm">
                              <span className="text-white/80 mt-1">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'educators' && (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-white font-semibold text-lg mb-3">Our Services</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {services.map((service, index) => {
                  const Icon = service.icon;
                  return (
                    <button
                      key={index}
                      onClick={service.action}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center hover:bg-white/20 hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
                    >
                      <div className={`w-10 h-10 mx-auto mb-2 bg-gradient-to-r ${service.color} rounded-full flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-white font-medium text-xs mb-1">{service.title}</h4>
                      <p className="text-white/70 text-xs">{service.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-white font-semibold text-lg mb-3">Learning Paths</h3>
              <div className="space-y-3">
                {topics.map((topic, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-3"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-white font-medium text-sm">{topic.title}</h4>
                      <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {topic.level}
                      </span>
                    </div>
                    <p className="text-white/80 text-xs mb-1">{topic.description}</p>
                    <p className="text-white/60 text-xs">{topic.duration}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold text-lg mb-3">Our Financial Educators</h3>
              <div className="space-y-4">
                {educators.map((educator) => (
                  <div
                    key={educator.id}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={educator.image}
                        alt={educator.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-white font-semibold text-sm">{educator.name}</h4>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                            <span className="text-white text-xs">{educator.rating}</span>
                          </div>
                        </div>
                        <p className="text-white/80 text-xs mb-1">{educator.specialization}</p>
                        <p className="text-white/70 text-xs mb-2">{educator.experience} • {educator.credentials}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {educator.expertise.slice(0, 3).map((exp, idx) => (
                            <span key={idx} className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                              {exp}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium text-xs">{educator.price}</span>
                          <span className="text-green-400 text-xs">{educator.availability}</span>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedEducator(educator.id);
                            setShowBookingCalendar(true);
                          }}
                          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs py-2 hover:scale-105 transition-all duration-300"
                          type="button"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Book Session
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-4">
              <div className="text-center">
                <BookOpen className="w-10 h-10 text-white mx-auto mb-2" />
                <h3 className="text-white font-bold text-base mb-1">Free Resources</h3>
                <p className="text-white/90 text-xs mb-3">
                  Educational materials and guides
                </p>
                <Button
                  className="bg-white text-blue-500 font-semibold text-xs px-4 py-2 hover:scale-105 transition-all duration-300"
                  onClick={() => {
                    const successMessage = document.createElement('div');
                    successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                    successMessage.textContent = 'Access granted! Check your email for resources.';
                    document.body.appendChild(successMessage);
                    setTimeout(() => {
                      if (document.body.contains(successMessage)) {
                        document.body.removeChild(successMessage);
                      }
                    }, 5000);
                  }}
                  type="button"
                >
                  Access Resources
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showBookingCalendar && (
        <BookingCalendar
          therapists={educators}
          onBookingConfirm={handleBookingConfirm}
          onClose={() => setShowBookingCalendar(false)}
          selectedTherapist={selectedEducator}
          professionalType="Financial Educator"
        />
      )}
    </Layout>
  );
};
