// Script simple para crear iconos básicos de PWA
// Este script crea iconos SVG que pueden servir como placeholder
// Los iconos reales deben ser PNG, pero esto ayuda durante el desarrollo

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createSVGIcon(size, outputPath) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#ffffff"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.4}" fill="url(#grad)"/>
  <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${size*0.2}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">PWA</text>
</svg>`;
  
  writeFileSync(outputPath, svg);
  console.log(`✓ Icono SVG creado: ${outputPath} (${size}x${size})`);
  console.log(`  ⚠️  Nota: Este es un SVG. Para producción, convierte a PNG usando una herramienta online o ejecuta: npm run generate-icons`);
}

async function main() {
  try {
    const publicDir = join(__dirname, '..', 'public');
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    console.log('Creando iconos SVG de placeholder...\n');
    createSVGIcon(192, join(publicDir, 'pwa-192x192.svg'));
    createSVGIcon(512, join(publicDir, 'pwa-512x512.svg'));

    console.log('\n✅ Iconos SVG creados!');
    console.log('\n📝 Para crear los iconos PNG reales:');
    console.log('   1. Abre los SVG en un editor de imágenes');
    console.log('   2. Exporta como PNG en los tamaños 192x192 y 512x512');
    console.log('   3. Guarda como pwa-192x192.png y pwa-512x512.png en public/');
    console.log('\n   O usa una herramienta online como:');
    console.log('   - https://convertio.co/svg-png/');
    console.log('   - https://cloudconvert.com/svg-to-png');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

