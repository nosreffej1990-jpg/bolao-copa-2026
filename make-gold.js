const sharp = require('sharp');
async function processImg() {
  try {
    const { data, info } = await sharp('public/icons/icon-512.png').raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240 && info.channels > 3 && data[i+3] > 50) {
        data[i] = 212;
        data[i+1] = 175;
        data[i+2] = 55;
      } else if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240 && info.channels === 3) {
        data[i] = 212;
        data[i+1] = 175;
        data[i+2] = 55;
      }
    }
    await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
      .png()
      .toFile('C:/Users/nosre/.gemini/antigravity/brain/3ba4b1c8-b21a-4905-937d-9b933ea9062b/logo-gold-preview.png');
    console.log('Done');
  } catch(e) {
    console.error(e);
  }
}
processImg();
