"use client";

import { useEffect, useRef } from "react";
import { registerDiceBox, setDiceInitStatus } from "@/lib/diceManager";

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

        // The constructor fires document.querySelector so the element MUST be in DOM
        const container = document.getElementById("dice-box");
        if (!container) throw new Error("#dice-box element not in DOM yet");

        // Pass onRollComplete IN the constructor config (not after)
        const box = new (DiceBox as any)("#dice-box", {
          assetPath: "/dice-assets/",         // base path for all texture/sound loading
          theme_colorset: "white",             // built-in colorset name
          theme_texture: diceTheme || "",      // texture name key from the library's texturelist
          theme_material: "glass",
          theme_surface: "green-felt",
          gravity_multiplier: 400,
          light_intensity: 0.9,
          baseScale: 100,
          shadows: true,
          strength: 2,
          sounds: false,
        });

        // The correct async init method is `initialize()`, NOT `init()`
        await box.initialize();

        registerDiceBox(box);
        setDiceInitStatus('ready');
        console.log("[DiceCanvas] ✓ ThreeJS DiceBox ready and registered!");

      } catch (err: any) {
        console.error("[DiceCanvas] ThreeJS DiceBox init FAILED:", err?.message || err);
        setDiceInitStatus('error');
        initAttempted.current = false;
      }
    };

    const timer = setTimeout(initDice, 200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only run once on mount

  return (
    <div
      id="dice-box"
      className="fixed inset-0 z-[100000] pointer-events-none w-screen h-screen overflow-hidden"
      style={{ position: 'fixed', top: 0, left: 0, background: 'transparent' }}
    />
  );
}
