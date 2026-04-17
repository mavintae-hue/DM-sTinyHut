"use client";

import { useEffect, useRef } from "react";
import { registerDiceBox, destroyDiceBox, setDiceInitStatus } from "@/lib/diceManager";

interface DiceCanvasProps {
  themeColor: string;
  diceTheme: string;
}

export default function DiceCanvas({ themeColor, diceTheme }: DiceCanvasProps) {
  const boxRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const initDice = async () => {
      // Destroy existing box before reinitializing (theme/color change)
      if (boxRef.current) {
        try {
          boxRef.current.clearDice?.();
          // Remove the canvas Three.js appended into #dice-box
          const container = document.getElementById("dice-box");
          if (container) container.innerHTML = "";
        } catch (_) {}
        boxRef.current = null;
        destroyDiceBox();
      }

      console.log(`[DiceCanvas] Initializing with theme="${diceTheme}" color="${themeColor}"`);
      setDiceInitStatus('loading');

      try {
        const mod = await import("@3d-dice/dice-box-threejs");
        const DiceBox = mod.default || mod;

        if (typeof DiceBox !== 'function') throw new Error("DiceBox constructor not found");
        if (cancelled) return;

        const container = document.getElementById("dice-box");
        if (!container) throw new Error("#dice-box element not in DOM");

        // Build a custom colorset so the user's chosen color and texture are applied
        const customColorset = {
          name: `custom_${themeColor}_${diceTheme}_${Date.now()}`,
          foreground: "#ffffff",          // dice number/symbol color
          background: themeColor || "#9b111e", // dice body color (user's pick)
          outline: "#000000",
          texture: diceTheme || "wood",   // texture key from library's texturelist
          material: "glass",
          description: "Custom D&D Theme",
        };

        const box = new (DiceBox as any)("#dice-box", {
          assetPath: "/dice-assets/",
          theme_customColorset: customColorset,
          theme_surface: "green-felt",
          gravity_multiplier: 400,
          light_intensity: 0.9,
          baseScale: 100,
          shadows: true,
          strength: 2,
          sounds: false,
        });

        // CORRECT method name is `initialize()`, NOT `init()`
        await box.initialize();

        if (cancelled) {
          try { box.clearDice?.(); } catch (_) {}
          return;
        }

        boxRef.current = box;
        registerDiceBox(box);
        setDiceInitStatus('ready');
        console.log("[DiceCanvas] ✓ ThreeJS DiceBox ready!");

      } catch (err: any) {
        if (!cancelled) {
          console.error("[DiceCanvas] DiceBox init FAILED:", err?.message || err);
          setDiceInitStatus('error');
        }
      }
    };

    const timer = setTimeout(initDice, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [themeColor, diceTheme]); // Re-init when color or theme changes

  return (
    <div
      id="dice-box"
      className="fixed inset-0 z-[100000] pointer-events-none w-screen h-screen overflow-hidden"
      style={{ position: 'fixed', top: 0, left: 0, background: 'transparent' }}
    />
  );
}
