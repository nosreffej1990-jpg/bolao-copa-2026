import { useChampion } from '@/components/ChampionProvider';
import { getFlagCode } from '@/lib/worldcupApi';

export function usePdfExport() {
  const { activeChampionObj } = useChampion();

  const loadJsPDF = () => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.jspdf) {
        resolve(window.jspdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => resolve(window.jspdf);
      script.onerror = (e) => reject(e);
      document.body.appendChild(script);
    });
  };

  const generatePDFReceipt = async (userBets, username) => {
    try {
      const jspdfModule = await loadJsPDF();
      const { jsPDF } = jspdfModule;
      const doc = new jsPDF();
      
      const loadImage = (src) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      const logoUrl = '/icons/logo-transparent.png';
      const flagUrl = activeChampionObj ? `https://flagcdn.com/w160/${activeChampionObj.flag}.png` : null;

      // Create a cache for flags to avoid loading duplicates
      const flagCache = new Map();
      const loadFlagImage = async (teamName) => {
        if (!teamName) return null;
        if (flagCache.has(teamName)) return flagCache.get(teamName);
        
        const code = getFlagCode(teamName);
        if (!code || code === 'un' || code === 'placeholder') {
          flagCache.set(teamName, null);
          return null;
        }
        
        const url = `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
        const img = await loadImage(url);
        flagCache.set(teamName, img);
        return img;
      };

      // Gather all unique team names from bets to load their flags in parallel
      const uniqueTeams = new Set();
      userBets.forEach(bet => {
        const home = bet.home_team || bet.home || '';
        const away = bet.away_team || bet.away || '';
        if (home) uniqueTeams.add(home);
        if (away) uniqueTeams.add(away);
      });

      // Load all required images in parallel
      const [logoImg, flagImg] = await Promise.all([
        loadImage(logoUrl),
        flagUrl ? loadImage(flagUrl) : Promise.resolve(null),
        ...Array.from(uniqueTeams).map(team => loadFlagImage(team))
      ]);

      // Draw Header Banner - Premium Dark Green Match Theme
      doc.setFillColor(3, 16, 11);
      doc.rect(0, 0, 220, 40, 'F');
      
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 15, 8, 24, 24);
      }
      if (flagImg) {
        doc.addImage(flagImg, 'PNG', 171, 12, 24, 16);
      }

      doc.setTextColor(255, 215, 0); // Golden text
      doc.setFontSize(22);
      doc.setFont('Helvetica', 'bold');
      doc.text('BOLÃO COPA 2026', 45, 23);
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('COMPROVANTE OFICIAL DE PALPITES - MATA-MATA', 45, 31);
      
      // Bettor details
      doc.setFontSize(11);
      doc.setTextColor(3, 16, 11);
      doc.setFont('Helvetica', 'bold');
      doc.text(`Apostador:`, 15, 52);
      doc.setFont('Helvetica', 'normal');
      doc.text(username, 38, 52);
      
      doc.setFont('Helvetica', 'bold');
      doc.text(`Emissão:`, 115, 52);
      doc.setFont('Helvetica', 'normal');
      doc.text(new Date().toLocaleString('pt-BR'), 134, 52);
      
      doc.setDrawColor(218, 165, 32); // Gold border line
      doc.setLineWidth(0.5);
      doc.line(15, 57, 195, 57);
      
      // Table Headers
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(3, 16, 11);
      doc.text('Fase', 15, 66);
      doc.text('Mandante', 46, 66);
      doc.text('Placar', 105, 66, { align: 'center' });
      doc.text('Visitante', 118, 66);
      doc.line(15, 69, 195, 69);
      
      doc.setFont('Helvetica', 'normal');
      let y = 78;
      const rowHeight = 12;

      userBets.forEach((bet, index) => {
        // Prevent page overflow
        if (y > 275) {
          doc.addPage();
          
          // Re-draw Header Banner on new page
          doc.setFillColor(3, 16, 11);
          doc.rect(0, 0, 220, 40, 'F');
          
          if (logoImg) {
            doc.addImage(logoImg, 'PNG', 15, 8, 24, 24);
          }
          if (flagImg) {
            doc.addImage(flagImg, 'PNG', 171, 12, 24, 16);
          }

          doc.setTextColor(255, 215, 0);
          doc.setFontSize(22);
          doc.setFont('Helvetica', 'bold');
          doc.text('BOLÃO COPA 2026', 45, 23);
          doc.setFontSize(10);
          doc.setTextColor(255, 255, 255);
          doc.text('COMPROVANTE OFICIAL DE PALPITES - MATA-MATA', 45, 31);
          
          // Re-draw Table Headers on new page
          doc.setFontSize(10);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(3, 16, 11);
          doc.text('Fase', 15, 52);
          doc.text('Mandante', 46, 52);
          doc.text('Placar', 105, 52, { align: 'center' });
          doc.text('Visitante', 118, 52);
          doc.line(15, 55, 195, 55);
          
          doc.setFont('Helvetica', 'normal');
          y = 64;
        }

        let phaseLabel = 'Mata-Mata';
        if (bet.match_id >= 73 && bet.match_id <= 88) phaseLabel = '1/16';
        else if (bet.match_id >= 89 && bet.match_id <= 96) phaseLabel = 'Oitavas';
        else if (bet.match_id >= 97 && bet.match_id <= 100) phaseLabel = 'Quartas';
        else if (bet.match_id >= 101 && bet.match_id <= 102) phaseLabel = 'Semifinal';
        else if (bet.match_id >= 103) phaseLabel = 'Final';

        const homeName = bet.home_team || bet.home || '';
        const awayName = bet.away_team || bet.away || '';
        const homeScore = bet.home_score !== undefined && bet.home_score !== null ? bet.home_score : (bet.bet_home !== undefined ? bet.bet_home : '');
        const awayScore = bet.away_score !== undefined && bet.away_score !== null ? bet.away_score : (bet.bet_away !== undefined ? bet.bet_away : '');

        // Alternate background color for readability
        if (index % 2 === 0) {
          doc.setFillColor(245, 247, 245);
          doc.rect(15, y - 7, 180, rowHeight, 'F');
        }

        // Draw Phase Label
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(110, 110, 110);
        doc.text(phaseLabel, 15, y);

        // Draw Home Team Flag
        const homeFlagImg = flagCache.get(homeName);
        if (homeFlagImg) {
          doc.addImage(homeFlagImg, 'PNG', 38, y - 4.2, 6, 4.5);
        }

        // Draw Home Team Name
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(20, 30, 25);
        doc.text(homeName, 46, y);

        // Draw score box background
        doc.setFillColor(225, 230, 227);
        doc.roundedRect(95, y - 5, 20, 6.5, 1, 1, 'F');

        // Draw Score (Centered)
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(3, 16, 11);
        doc.text(`${homeScore} - ${awayScore}`, 105, y - 0.2, { align: 'center' });

        // Draw Away Team Name
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(20, 30, 25);
        doc.text(awayName, 118, y);

        // Draw Away Team Flag
        const awayFlagImg = flagCache.get(awayName);
        if (awayFlagImg) {
          doc.addImage(awayFlagImg, 'PNG', 168, y - 4.2, 6, 4.5);
        }

        // Draw a light grey separator line under the row
        doc.setDrawColor(220, 225, 222);
        doc.setLineWidth(0.2);
        doc.line(15, y + rowHeight - 7, 195, y + rowHeight - 7);

        y += rowHeight;
      });

      // Ensure footer isn't pushed off the page
      if (y > 275) {
        doc.addPage();
        y = 25;
      }

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(120, 125, 122);
      doc.text('Comprovante gerado automaticamente pelo app Bolão Copa 2026', 15, y + 6);

      doc.save(`Comprovante_Bolao_${username.replace(/\s+/g, '_')}.pdf`);
      return true;
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      return false;
    }
  };

  return { generatePDFReceipt };
}
