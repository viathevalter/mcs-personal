import React, { createContext, useContext, useState, useEffect } from 'react';
import type { EnrichedTitulo, FilterState } from '../types';
import { fetchEnrichedData } from '../data/loader';
import { filterData } from '../lib/metrics';

interface DataContextType {
  rawData: EnrichedTitulo[];
  filteredData: EnrichedTitulo[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableEmpresas: string[];
  availableBancos: string[];
  availablePeriodos: string[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawData, setRawData] = useState<EnrichedTitulo[]>([]);
  const [filteredData, setFilteredData] = useState<EnrichedTitulo[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    empresa: [],
    periodo: [null, null],
    status: 'Todos',
    banco: '',
    cliente: '',
    periodoFat: []
  });

  useEffect(() => {
    // Load data on mount
    const fetchData = async () => {
      try {
        const data = await fetchEnrichedData();
        setRawData(data);
        setFilteredData(data);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (rawData.length > 0) {
      const filtered = filterData(rawData, filters);
      setFilteredData(filtered);
    }
  }, [filters, rawData]);

  // Derived lists for Dropdowns
  const availableEmpresas = Array.from(new Set(rawData.map(i => i.Empresa).filter(Boolean))).sort();
  const availableBancos = Array.from(new Set(rawData.map(i => i.Banco).filter(Boolean))).sort();
  const availablePeriodos = Array.from(new Set(rawData.map(i => i.periodo_fat).filter(Boolean))).sort();

  return (
    <DataContext.Provider value={{ rawData, filteredData, filters, setFilters, availableEmpresas, availableBancos, availablePeriodos }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
