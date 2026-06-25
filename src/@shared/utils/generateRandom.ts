import { v4 as uuidv4 } from 'uuid';

export class GenerateRandom {
  static number(length = 16): number {
    const max = 10 ** length - 1;
    return Math.floor(Math.random() * (max + 1));
  }

  static text(length = 16): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-';

    let generatedId = '';

    for (let i = 0; i <= length; i += 1) {
      const randomCharacterIndex = Math.floor(
        Math.random() * characters.length,
      );
      const randomCharacter = characters[randomCharacterIndex];
      generatedId += randomCharacter;
    }

    return generatedId.trim();
  }

  static mixed(length = 30): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%ˆ&*()<>?[]{}';
    let generatedId = '';

    for (let i = 0; i < length; i++) {
      const randomCharacterIndex = Math.floor(
        Math.random() * characters.length,
      );
      const randomCharacter = characters[randomCharacterIndex];
      generatedId += randomCharacter;
    }

    return generatedId;
  }

  static id(): string {
    const uuid = uuidv4();

    return uuid;
  }

  static hexColor(): string {
    // Gera cores mais fechadas e pastéis reduzindo a saturação e ajustando o brilho
    const hue = Math.floor(Math.random() * 360); // Matiz completa (0-360)
    const saturation = Math.floor(Math.random() * 30) + 20; // Saturação baixa (20-50%)
    const lightness = Math.floor(Math.random() * 30) + 40; // Luminosidade média-alta (40-70%)

    // Converte HSL para RGB
    const c = (1 - Math.abs(2 * (lightness / 100) - 1)) * (saturation / 100);
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness / 100 - c / 2;

    let r = 0,
      g = 0,
      b = 0;

    if (0 <= hue && hue < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (60 <= hue && hue < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (120 <= hue && hue < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (180 <= hue && hue < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (240 <= hue && hue < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (300 <= hue && hue < 360) {
      r = c;
      g = 0;
      b = x;
    }

    // Converte para valores RGB 0-255
    const red = Math.round((r + m) * 255);
    const green = Math.round((g + m) * 255);
    const blue = Math.round((b + m) * 255);

    // Converte para hexadecimal
    return (
      '#' +
      red.toString(16).padStart(2, '0') +
      green.toString(16).padStart(2, '0') +
      blue.toString(16).padStart(2, '0')
    );
  }
}
