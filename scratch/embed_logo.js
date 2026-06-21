const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const logoPath = path.join(projectRoot, 'public', 'icons', 'logo-transparent.png');
const previewPath = path.join(projectRoot, 'visual_improvements_preview.html');

try {
  // Read logo image and convert to base64
  const logoBuffer = fs.readFileSync(logoPath);
  const logoBase64 = logoBuffer.toString('base64');
  const logoDataUrl = `data:image/png;base64,${logoBase64}`;

  // Read preview HTML
  let html = fs.readFileSync(previewPath, 'utf8');

  // Replace SVG logo or old logo image with the base64 image tag
  // We'll target the logo-wrapper content
  const targetSvgStart = '<svg class="logo-official-svg"';
  const targetSvgEnd = '</svg>';

  const startIndex = html.indexOf(targetSvgStart);
  const endIndex = html.indexOf(targetSvgEnd, startIndex);

  if (startIndex !== -1 && endIndex !== -1) {
    const svgCode = html.substring(startIndex, endIndex + targetSvgEnd.length);
    const replacementImg = `<img src="${logoDataUrl}" alt="Logo Oficial Copa 2026" class="logo-image" style="height: 52px; width: auto; object-fit: contain;">`;
    html = html.replace(svgCode, replacementImg);
    
    fs.writeFileSync(previewPath, html, 'utf8');
    console.log('Successfully embedded logo in base64 into visual_improvements_preview.html!');
  } else {
    console.log('Error: Could not find the SVG logo placeholder in the HTML file.');
  }
} catch (error) {
  console.error('Error embedding logo:', error);
}
