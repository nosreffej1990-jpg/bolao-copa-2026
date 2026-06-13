'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = {
  verde: {
    id: 'verde',
    nome: 'Verde Clássico',
    emoji: '🌿',
    preview: ['#060907', '#10b981', '#fbbf24'],
  },
  brasil: {
    id: 'brasil',
    nome: 'Brasil',
    emoji: '🇧🇷',
    preview: ['#052e12', '#00A86B', '#FFD700'],
  },
  azul: {
    id: 'azul',
    nome: 'Azul Noturno',
    emoji: '🌊',
    preview: ['#050815', '#3b82f6', '#06b6d4'],
  },
  galaxia: {
    id: 'galaxia',
    nome: 'Galáxia',
    emoji: '🌌',
    preview: ['#0a0612', '#7c3aed', '#ec4899'],
  },
  carbono: {
    id: 'carbono',
    nome: 'Carbono',
    emoji: '🖤',
    preview: ['#111111', '#FFD700', '#C0C0C0'],
  },
  estadio: {
    id: 'estadio',
    nome: 'Estádio',
    emoji: '🏟️',
    preview: ['#071a0e', '#22c55e', '#f97316'],
  },
  neon: {
    id: 'neon',
    nome: 'Retro Neon',
    emoji: '🕹️',
    preview: ['#05050f', '#ff6b35', '#ff2d9b'],
  },
};

const ThemeContext = createContext({ theme: 'verde', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('verde');

  useEffect(() => {
    const saved = localStorage.getItem('copa26_theme') || 'verde';
    setThemeState(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const setTheme = (id) => {
    setThemeState(id);
    localStorage.setItem('copa26_theme', id);
    document.documentElement.setAttribute('data-theme', id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
