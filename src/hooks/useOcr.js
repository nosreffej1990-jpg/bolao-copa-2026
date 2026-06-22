import { useState } from 'react';

// Helper to compress and resize images on client-side before sending to API
export const compressImage = (file, maxWidth = 1024, maxHeight = 1024) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Apply aspect ratio scaling
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to jpeg with 0.8 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export function useOcr() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const performOcrScan = async (base64String, bettorNameInput) => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64String,
          name: bettorNameInput
        })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Resposta inválida do servidor (HTTP ${res.status})`);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }

      return data;
    } catch (err) {
      console.error('Erro na leitura com IA:', err);
      setError(err.message || 'Erro desconhecido no escaneamento.');
      throw err;
    } finally {
      setScanning(false);
    }
  };

  return {
    performOcrScan,
    scanning,
    error,
    compressImage
  };
}
