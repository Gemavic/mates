import React from 'react';
import { Layout } from '@/components/Layout';
import { NavigationMenu } from '@/components/NavigationMenu';
import { Menu as MenuIcon, Grid } from 'lucide-react';

interface MenuShowcaseProps {
  onNavigate: (screen: string) => void;
}

export const MenuShowcase: React.FC<MenuShowcaseProps> = ({ onNavigate }) => {
  return (
    <Layout
      title="Menu Navigation"
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="px-4 py-6 space-y-6">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl">
            <Grid className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Navigation Menu</h2>
          <p className="text-white/80 text-sm">Explore all features and services</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
              <MenuIcon className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-white font-semibold">Quick Access</h3>
          </div>
          <p className="text-white/70 text-sm">
            All features are organized into categories for easy navigation. Tap any category to expand and see available options.
          </p>
        </div>

        <NavigationMenu onNavigate={onNavigate} variant="full" />

        <div className="text-center mt-6">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="text-white font-bold text-lg">20+</span>
            <span className="text-white text-sm">Features Available</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};
