import { useContext } from 'react';
import { AppContext, type AppContextType } from '@/context/app-provider';

export const useStore = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useStore must be used within an AppProvider');
  }
  return context;
};
