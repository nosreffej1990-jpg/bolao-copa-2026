import { useChampion } from '@/components/ChampionProvider';

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

      const [logoImg, flagImg] = await Promise.all([
        loadImage(logoUrl),
        flagUrl ? loadImage(flagUrl) : Promise.resolve(null)
      ]);

      doc.setFillColor(11, 15, 25);
      doc.rect(0, 0, 220, 40, 'F');
      
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 15, 8, 24, 24);
      }
      if (flagImg) {
        doc.addImage(flagImg, 'PNG', 171, 12, 24, 16);
      }

      doc.setTextColor(255, 215, 0);
      doc.setFontSize(22);
      doc.text('BOLÃO COPA 2026', 45, 23);
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('COMPROVANTE OFICIAL DE PALPITES - MATA-MATA', 45, 31);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Apostador: ${username}`, 15, 52);
      doc.text(`Data de Emissão: ${new Date().toLocaleString('pt-BR')}`, 15, 58);
      
      doc.setDrawColor(218, 165, 32);
      doc.setLineWidth(0.5);
      doc.line(15, 62, 195, 62);
      
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.text('Fase / Confronto', 15, 70);
      doc.text('Palpite', 160, 70);
      doc.line(15, 73, 195, 73);
      
      doc.setFont('Helvetica', 'normal');
      let y = 80;
      userBets.forEach((bet) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        
        let phaseLabel = 'Mata-Mata';
        if (bet.match_id >= 73 && bet.match_id <= 88) phaseLabel = '1/16';
        else if (bet.match_id >= 89 && bet.match_id <= 96) phaseLabel = '1/8';
        else if (bet.match_id >= 97 && bet.match_id <= 100) phaseLabel = 'Quartas';
        else if (bet.match_id >= 101 && bet.match_id <= 102) phaseLabel = 'Semifinal';
        else if (bet.match_id >= 103) phaseLabel = 'Final';

        doc.text(`${phaseLabel} | ${bet.home} x ${bet.away}`, 15, y);
        doc.text(`${bet.bet_home} x ${bet.bet_away}`, 160, y);
        y += 8;
      });

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Comprovante gerado automaticamente pelo app Bolão Copa 2026', 15, y + 10);

      doc.save(`Comprovante_Bolao_${username.replace(/\s+/g, '_')}.pdf`);
      return true;
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      return false;
    }
  };

  return { generatePDFReceipt };
}
