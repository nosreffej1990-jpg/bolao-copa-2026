'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// Color definitions for all 48 nations in World Cup 2026
export const THEMES = {
  brasil: { id: 'brasil', nome: 'Brasil', emoji: '🇧🇷', flag: 'br', primary: '#fbbf24', secondary: '#fbbf24', bg: '#060913' },
  mexico: { id: 'mexico', nome: 'México', emoji: '🇲🇽', flag: 'mx', primary: '#12a154', secondary: '#c91b2c', bg: '#042110' },
  africa_do_sul: { id: 'africa_do_sul', nome: 'África do Sul', emoji: '🇿🇦', flag: 'za', primary: '#007a4d', secondary: '#ffb612', bg: '#022417' },
  coreia_do_sul: { id: 'coreia_do_sul', nome: 'Coreia do Sul', emoji: '🇰🇷', flag: 'kr', primary: '#cd2e3a', secondary: '#0047a0', bg: '#0e1828' },
  republica_tcheca: { id: 'republica_tcheca', nome: 'República Tcheca', emoji: '🇨🇿', flag: 'cz', primary: '#11457e', secondary: '#d7141a', bg: '#041527' },
  canada: { id: 'canada', nome: 'Canadá', emoji: '🇨🇦', flag: 'ca', primary: '#ff0000', secondary: '#ffffff', bg: '#1c0202' },
  bosnia: { id: 'bosnia', nome: 'Bósnia e Herz.', emoji: '🇧🇦', flag: 'ba', primary: '#002f6c', secondary: '#ecb319', bg: '#020f21' },
  catar: { id: 'catar', nome: 'Catar', emoji: '🇶🇦', flag: 'qa', primary: '#8a1538', secondary: '#ffffff', bg: '#20030c' },
  suica: { id: 'suica', nome: 'Suíça', emoji: '🇨🇭', flag: 'ch', primary: '#d52b1e', secondary: '#ffffff', bg: '#1f0303' },
  marrocos: { id: 'marrocos', nome: 'Marrocos', emoji: '🇲🇦', flag: 'ma', primary: '#c1272d', secondary: '#006233', bg: '#1c0303' },
  haiti: { id: 'haiti', nome: 'Haiti', emoji: '🇭🇹', flag: 'ht', primary: '#00209f', secondary: '#d21034', bg: '#020c2b' },
  escoscia: { id: 'escoscia', nome: 'Escócia', emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', flag: 'gb-sct', primary: '#005eb8', secondary: '#ffffff', bg: '#021a33' },
  estados_unidos: { id: 'estados_unidos', nome: 'Estados Unidos', emoji: '🇺🇸', flag: 'us', primary: '#002868', secondary: '#bf0a30', bg: '#02112b' },
  paraguai: { id: 'paraguai', nome: 'Paraguai', emoji: '🇵🇾', flag: 'py', primary: '#d52b1e', secondary: '#0038a8', bg: '#1f050b' },
  australia: { id: 'australia', nome: 'Austrália', emoji: '🇦🇺', flag: 'au', primary: '#002b7f', secondary: '#f2a900', bg: '#001642' },
  turquia: { id: 'turquia', nome: 'Turquia', emoji: '🇹🇷', flag: 'tr', primary: '#e30a17', secondary: '#ffffff', bg: '#260204' },
  alemanha: { id: 'alemanha', nome: 'Alemanha', emoji: '🇩🇪', flag: 'de', primary: '#dd2a2a', secondary: '#ffce00', bg: '#0d0d0d' },
  curacao: { id: 'curacao', nome: 'Curaçao', emoji: '🇨🇼', flag: 'cw', primary: '#002b7f', secondary: '#f9e814', bg: '#01153b' },
  costa_do_marfim: { id: 'costa_do_marfim', nome: 'Costa do Marfim', emoji: '🇨🇮', flag: 'ci', primary: '#ff8200', secondary: '#009e60', bg: '#281402' },
  equador: { id: 'equador', nome: 'Equador', emoji: '🇪🇨', flag: 'ec', primary: '#ffcc00', secondary: '#0033a0', bg: '#241b02' },
  holanda: { id: 'holanda', nome: 'Holanda', emoji: '🇳🇱', flag: 'nl', primary: '#ff4f00', secondary: '#21468b', bg: '#1c0c02' },
  japao: { id: 'japao', nome: 'Japão', emoji: '🇯🇵', flag: 'jp', primary: '#0005a0', secondary: '#bc002d', bg: '#020326' },
  suecia: { id: 'suecia', nome: 'Suécia', emoji: '🇸🇪', flag: 'se', primary: '#006aa7', secondary: '#fecc00', bg: '#011e30' },
  tunisia: { id: 'tunisia', nome: 'Tunísia', emoji: '🇹🇳', flag: 'tn', primary: '#e70013', secondary: '#ffffff', bg: '#260204' },
  belgica: { id: 'belgica', nome: 'Bélgica', emoji: '🇧🇪', flag: 'be', primary: '#e30613', secondary: '#ffd900', bg: '#1c0203' },
  egito: { id: 'egito', nome: 'Egito', emoji: '🇪🇬', flag: 'eg', primary: '#cc0000', secondary: '#d4af37', bg: '#1c0408' },
  ira: { id: 'ira', nome: 'Irã', emoji: '🇮🇷', flag: 'ir', primary: '#239e46', secondary: '#da251d', bg: '#05240e' },
  nova_zelandia: { id: 'nova_zelandia', nome: 'Nova Zelândia', emoji: '🇳🇿', flag: 'nz', primary: '#111111', secondary: '#ffffff', bg: '#0f0f0f' },
  espanha: { id: 'espanha', nome: 'Espanha', emoji: '🇪🇸', flag: 'es', primary: '#c60b1e', secondary: '#ffc400', bg: '#1c0303' },
  cabo_verde: { id: 'cabo_verde', nome: 'Cabo Verde', emoji: '🇨🇻', flag: 'cv', primary: '#002a8f', secondary: '#f7d117', bg: '#011038' },
  arabia_saudita: { id: 'arabia_saudita', nome: 'Arábia Saudita', emoji: '🇸🇦', flag: 'sa', primary: '#006c35', secondary: '#ffffff', bg: '#022412' },
  uruguai: { id: 'uruguai', nome: 'Uruguai', emoji: '🇺🇾', flag: 'uy', primary: '#00a8e8', secondary: '#f7b500', bg: '#051829' },
  franca: { id: 'franca', nome: 'França', emoji: '🇫🇷', flag: 'fr', primary: '#002395', secondary: '#ed2939', bg: '#020e3b' },
  senegal: { id: 'senegal', nome: 'Senegal', emoji: '🇸🇳', flag: 'sn', primary: '#00853f', secondary: '#fdef42', bg: '#022411' },
  iraque: { id: 'iraque', nome: 'Iraque', emoji: '🇮🇶', flag: 'iq', primary: '#007a3d', secondary: '#c8102e', bg: '#022412' },
  noruega: { id: 'noruega', nome: 'Noruega', emoji: '🇳🇴', flag: 'no', primary: '#ef2b2d', secondary: '#002868', bg: '#240406' },
  argentina: { id: 'argentina', nome: 'Argentina', emoji: '🇦🇷', flag: 'ar', primary: '#74acdf', secondary: '#f6b426', bg: '#0b1f30' },
  algeria: { id: 'algeria', nome: 'Argélia', emoji: '🇩🇿', flag: 'dz', primary: '#006633', secondary: '#d21034', bg: '#021a0f' },
  austria: { id: 'austria', nome: 'Áustria', emoji: '🇦🇹', flag: 'at', primary: '#ed2939', secondary: '#ffffff', bg: '#240608' },
  jordania: { id: 'jordania', nome: 'Jordânia', emoji: '🇯🇴', flag: 'jo', primary: '#c8102e', secondary: '#1a8a44', bg: '#240408' },
  portugal: { id: 'portugal', nome: 'Portugal', emoji: '🇵🇹', flag: 'pt', primary: '#c60b1e', secondary: '#11457e', bg: '#1c0305' },
  congo: { id: 'congo', nome: 'Congo', emoji: '🇨🇬', flag: 'cg', primary: '#00853f', secondary: '#fbde02', bg: '#022411' },
  uzbequistao: { id: 'uzbequistao', nome: 'Uzbequistão', emoji: '🇺🇿', flag: 'uz', primary: '#00a5df', secondary: '#1ca534', bg: '#021e2a' },
  colombia: { id: 'colombia', nome: 'Colômbia', emoji: '🇨🇴', flag: 'co', primary: '#fcd116', secondary: '#003893', bg: '#261e02' },
  inglaterra: { id: 'inglaterra', nome: 'Inglaterra', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', flag: 'gb-eng', primary: '#cf142b', secondary: '#ffffff', bg: '#1c0204' },
  croacia: { id: 'croacia', nome: 'Croácia', emoji: '🇭🇷', flag: 'hr', primary: '#ff0000', secondary: '#11457e', bg: '#1c0203' },
  gana: { id: 'gana', nome: 'Gana', emoji: '🇬🇭', flag: 'gh', primary: '#fcd116', secondary: '#006b3f', bg: '#261e02' },
  panama: { id: 'panama', nome: 'Panamá', emoji: '🇵🇦', flag: 'pa', primary: '#da121a', secondary: '#072357', bg: '#1c0204' }
};

const ThemeContext = createContext({ theme: 'brasil', setTheme: () => {} });

// Helper to lighten hex color
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
}

// Helper to darken hex color
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
}

// Helper to convert hex to RGB values
function hexToRgb(hex) {
  const num = parseInt(hex.replace("#",""), 16);
  return `${num >> 16}, ${num >> 8 & 0x00FF}, ${num & 0x0000FF}`;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('brasil');

  const applyThemeVariables = (themeId) => {
    const t = THEMES[themeId] || THEMES['brasil'];
    const root = document.documentElement;
    
    // Background variables
    const bgApp = t.bg;
    const bgHeader = darkenColor(bgApp, 15);
    const bgCard = lightenColor(bgApp, 6);
    const bgCardHover = lightenColor(bgApp, 12);
    const borderCard = 'rgba(255, 255, 255, 0.08)';
    const borderActive = `rgba(${hexToRgb(t.secondary)}, 0.4)`;
    
    root.style.setProperty('--bg-app', bgApp);
    root.style.setProperty('--bg-header', bgHeader);
    root.style.setProperty('--bg-card', bgCard);
    root.style.setProperty('--bg-card-hover', bgCardHover);
    root.style.setProperty('--border-color', borderCard);
    root.style.setProperty('--border-active', borderActive);
    
    // Brand colors
    root.style.setProperty('--primary-green', t.primary);
    root.style.setProperty('--soccer-green', t.primary);
    root.style.setProperty('--accent-gold', t.secondary);
    root.style.setProperty('--accent-gold-hover', lightenColor(t.secondary, 8));
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', lightenColor(t.primary, 35));
    root.style.setProperty('--text-muted', lightenColor(t.bg, 25));
    
    // Custom specific components variables
    root.style.setProperty('--splash-bg', `radial-gradient(circle at center, ${bgCard}, ${bgHeader})`);
    root.style.setProperty('--btn-primary-bg', `linear-gradient(135deg, ${t.primary}, ${t.secondary})`);
    root.style.setProperty('--btn-primary-color', '#000000');
    root.style.setProperty('--nav-bg', bgHeader);
    root.style.setProperty('--nav-border', borderCard);
    root.style.setProperty('--nav-active', t.secondary);
    root.style.setProperty('--card-glow', `rgba(${hexToRgb(t.primary)}, 0.1)`);
    
    root.setAttribute('data-theme', themeId);
  };

  useEffect(() => {
    const saved = localStorage.getItem('copa26_theme') || 'brasil';
    setThemeState(saved);
    applyThemeVariables(saved);
  }, []);

  const setTheme = (id) => {
    setThemeState(id);
    localStorage.setItem('copa26_theme', id);
    applyThemeVariables(id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
