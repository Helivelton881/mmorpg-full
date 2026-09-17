import Phaser from 'phaser';
import { LoginScene } from './scenes/LoginScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [LoginScene, CharacterSelectScene, GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3, // joystick + buttons
  },
  render: {
    antialias: true,
    pixelArt: false,
    powerPreference: 'high-performance',
  },
};

new Phaser.Game(config);

// Prevent pull-to-refresh / page scroll on mobile while playing
document.addEventListener(
  'touchmove',
  (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('#chat-log') || t.closest('#chat-input') || t.closest('#inv-panel') || t.closest('#quest-panel')) {
      return;
    }
    e.preventDefault();
  },
  { passive: false }
);


// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Adaptive UI class
try {
  const coarse = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (coarse) document.body.classList.add('mobile-ui');
} catch {}


window.addEventListener('orientationchange', () => {
  setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
});
