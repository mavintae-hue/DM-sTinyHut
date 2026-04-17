"use client";

import { useEffect, useRef } from "react";
import { registerDiceBox, setDiceTheme, setDiceInitStatus } from "@/lib/diceManager";

interface DiceCanvasProps {
  themeColor: string;
  diceTheme: string;
}

export default function DiceCanvas({ themeColor, diceTheme }: DiceCanvasProps) {
  const initAttempted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initAttempted.current) return;
    initAttempted.current = true;

    const initDice = async () => {
      console.log("[DiceCanvas] Starting ThreeJS DiceBox initialization...");
      setDiceInitStatus('loading');

      try {
        const mod = await import("@3d-dice/dice-box-threejs");
        const DiceBox = mod.default || mod;

        if (typeof DiceBox !== 'function') {
          throw new Error("DiceBox constructor not found in module exports");
        }

        // Standard constructor targeting our JSX container
        const box = new DiceBox("#dice-box", {
          assetPath: "/dice-assets/", // dice-box-threejs might not use this, but we leave it just in case
          theme_texture: `/dice-assets/textures/${diceTheme || 'wood'}.webp`,
          theme_color: themeColor,
          scale: 6,
          gravity_multiplier: 600,
          light_intensity: 0.8,
          shadows: true,
          strength: 2,
        });

        // Initialize ThreeJS Box
        await box.init();
        
        registerDiceBox(box);
        setDiceInitStatus('ready');
        console.log("[DiceCanvas] ✓ ThreeJS DiceBox ready and registered!");

      } catch (err: any) {
        console.error("[DiceCanvas] ThreeJS DiceBox init FAILED:", err);
        setDiceInitStatus('error');
        initAttempted.current = false;
      }
    };

    const timer = setTimeout(initDice, 100);
    return () => clearTimeout(timer);
  }, [themeColor, diceTheme]);

  useEffect(() => {
    setDiceTheme(themeColor, diceTheme);
  }, [themeColor, diceTheme]);

  // Standard React rendering for the container
  return (
    <div 
      id="dice-box" 
      className="fixed inset-0 z-[100000] pointer-events-none w-screen h-screen overflow-hidden" 
      style={{ position: 'fixed', top: 0, left: 0, background: 'transparent' }}
    />
  );
}
