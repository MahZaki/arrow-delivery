import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { CarrierType } from '../types';

interface CarrierContextType {
  carrier: CarrierType;
  setCarrier: (carrier: CarrierType) => void;
}

const CarrierContext = createContext<CarrierContextType | undefined>(undefined);

const STORAGE_KEY = 'arrow_carrier';

export const CarrierProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [carrier, setCarrierState] = useState<CarrierType>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ecotrack' || stored === 'zrexpress') return stored;
    return 'ecotrack';
  });

  const setCarrier = useCallback((c: CarrierType) => {
    setCarrierState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }, []);

  return (
    <CarrierContext.Provider value={{ carrier, setCarrier }}>
      {children}
    </CarrierContext.Provider>
  );
};

export const useCarrier = () => {
  const context = useContext(CarrierContext);
  if (context === undefined) {
    throw new Error('useCarrier must be used within a CarrierProvider');
  }
  return context;
};
