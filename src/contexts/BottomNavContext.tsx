import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Lets a screen hide the app-wide bottom navigation for as long as it needs to.
 *
 * Almost every screen wants the bar. The exceptions are the two that take over
 * the whole display - a video or voice call in progress - where a fixed bar
 * would sit on top of the call controls. Rather than each screen rendering its
 * own navigation (which is how half of them ended up with none at all), the bar
 * is rendered once in App and screens opt out of it here.
 */

interface BottomNavContextValue {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const BottomNavContext = createContext<BottomNavContextValue>({
  hidden: false,
  setHidden: () => {},
});

export const BottomNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden]);
  return <BottomNavContext.Provider value={value}>{children}</BottomNavContext.Provider>;
};

export const useBottomNav = () => useContext(BottomNavContext);

/**
 * Hide the bottom bar while `active` is true. Restores it on unmount, so a
 * screen that navigates away mid-call cannot leave the app without navigation.
 */
export const useHideBottomNav = (active: boolean) => {
  const { setHidden } = useBottomNav();
  useEffect(() => {
    setHidden(active);
    return () => setHidden(false);
  }, [active, setHidden]);
};
