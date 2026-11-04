// src/context/MonthContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface MonthContextData {
  currentDate: Date;
  formattedMonth: string;
  nextMonth: () => void;
  prevMonth: () => void;
  setMonthYear: (year: number, monthIndex: number) => void;
}

const MonthContext = createContext<MonthContextData>({} as MonthContextData);

export const MonthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 10, 1)); // Nov 2026[cite: 29]

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)); //[cite: 29]
  };

  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)); //[cite: 29]
  };

  const setMonthYear = (year: number, monthIndex: number) => {
    setCurrentDate(new Date(year, monthIndex, 1));
  };

  const formattedMonth = currentDate
    .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '')
    .replace(' de ', ' '); //[cite: 29]

  const capitalizedMonth =
    formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1); //[cite: 29]

  return (
    <MonthContext.Provider
      value={{
        currentDate,
        formattedMonth: capitalizedMonth,
        nextMonth,
        prevMonth,
        setMonthYear,
      }}
    >
      {children}
    </MonthContext.Provider>
  );
};

export const useMonth = () => useContext(MonthContext); //[cite: 29]