// Builds the app icon set from assets/images/logo.png (blue mark on white).
// Run after replacing the logo: node scripts/gen-icons.js
const Jimp = require('jimp-compact');
const path = require('path');

const dir = path.join(__dirname, '..', 'assets', 'images');
const out = (f) => path.join(dir, f);

(async () => {
  const logo = await Jimp.read(out('logo.png'));

  // Mark colour = the darkest red channel in the image (solid blue of the "V").
  let blue = { r: 255, g: 255, b: 255 };
  logo.scan(0, 0, logo.bitmap.width, logo.bitmap.height, (x, y, i) => {
    const d = logo.bitmap.data;
    if (d[i] < blue.r) blue = { r: d[i], g: d[i + 1], b: d[i + 2] };
  });

  // Transparent mark: alpha from how far each pixel is from white, colour set to the solid blue.
  const mark = logo.clone();
  mark.scan(0, 0, mark.bitmap.width, mark.bitmap.height, (x, y, i) => {
    const d = mark.bitmap.data;
    const a = Math.max(0, Math.min(255, Math.round(((255 - d[i]) / (255 - blue.r)) * 255)));
    d[i] = blue.r;
    d[i + 1] = blue.g;
    d[i + 2] = blue.b;
    d[i + 3] = a;
  });

  const padded = (img, size, scale) => {
    const inner = Math.round(size * scale);
    const canvas = new Jimp(size, size, 0x00000000);
    return canvas.composite(img.clone().resize(inner, inner, Jimp.RESIZE_BICUBIC), (size - inner) / 2, (size - inner) / 2);
  };

  // iOS / store icon: full logo on white, 1024.
  await logo.clone().resize(1024, 1024, Jimp.RESIZE_BICUBIC).writeAsync(out('icon.png'));
  // Android adaptive foreground: transparent, inside the 66% safe zone of the circle/squircle mask.
  await padded(mark, 1024, 0.78).writeAsync(out('adaptive-icon.png'));
  // Splash: transparent mark, works on the light and dark splash backgrounds.
  await padded(mark, 1024, 1).writeAsync(out('splash-icon.png'));
  // Web favicon.
  await padded(mark, 196, 1).writeAsync(out('favicon.png'));

  console.log('mark colour', blue, '-> icon.png, adaptive-icon.png, splash-icon.png, favicon.png');
})();
