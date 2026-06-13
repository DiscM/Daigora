import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { GameState } from '../game/types';
import { PlanetBoardScene } from './PlanetBoardScene';
import planetWatercolor from '../assets/planet/planet-watercolor.png';

interface PhaserBoardProps {
  game: GameState;
}

export function PhaserBoard({ game }: PhaserBoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<PlanetBoardScene | null>(null);

  useEffect(() => {
    if (!hostRef.current || phaserRef.current) return;

    const scene = new PlanetBoardScene(game, planetWatercolor);
    sceneRef.current = scene;
    phaserRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      transparent: true,
      backgroundColor: 'rgba(0,0,0,0)',
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: hostRef.current.clientWidth,
        height: hostRef.current.clientHeight,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
      scene,
    });

    return () => {
      phaserRef.current?.destroy(true);
      phaserRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.sync(game);
  }, [game]);

  return <div className="phaser-board" ref={hostRef} aria-hidden="true" />;
}
