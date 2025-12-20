import Jimp from 'jimp';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateIcon(size, outputPath) {
  // Crear imagen con fondo blanco
  const image = new Jimp(size, size, 0xffffffff);

  // Crear gradiente circular
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;

  // Dibujar círculo con gradiente (simulado)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        // Gradiente de púrpura a azul
        const ratio = distance / radius;
        const r = Math.floor(118 + (102 - 118) * ratio); // 667eea -> 764ba2
        const g = Math.floor(126 + (75 - 126) * ratio);
        const b = Math.floor(234 + (162 - 234) * ratio);
        const color = (r << 16) | (g << 8) | b;
        image.setPixelColor(color, x, y);
      }
    }
  }

  // Cargar fuente para texto (usar fuente básica)
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const textSize = Math.floor(size * 0.15);
  
  // Crear texto "PWA" en blanco
  const text = 'PWA';
  const textX = centerX - (text.length * textSize * 0.3);
  const textY = centerY - textSize / 2;
  
  // Dibujar texto (simulado con rectángulos blancos)
  // Jimp tiene limitaciones con fuentes, así que creamos un texto simple
  image.print(font, textX, textY, {
    text: text,
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
  }, size, size);

  // Guardar imagen
  await image.writeAsync(outputPath);
  console.log(`✓ Icono generado: ${outputPath} (${size}x${size})`);
}

async function main() {
  try {
    // Crear directorio public si no existe
    const publicDir = join(__dirname, '..', 'public');
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    // Generar iconos
    console.log('Generando iconos de PWA...\n');
    await generateIcon(192, join(publicDir, 'pwa-192x192.png'));
    await generateIcon(512, join(publicDir, 'pwa-512x512.png'));

    console.log('\n✅ Iconos de PWA generados exitosamente!');
  } catch (error) {
    console.error('❌ Error al generar iconos:', error.message);
    console.log('\n💡 Alternativa: Puedes crear los iconos manualmente:');
    console.log('   - pwa-192x192.png (192x192px)');
    console.log('   - pwa-512x512.png (512x512px)');
    console.log('   Colócalos en la carpeta public/');
    process.exit(1);
  }
}

main();

