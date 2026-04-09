"use client";

import { useEffect, useRef } from "react";
import DiceBox from "@3d-dice/dice-box";
import { registerDiceBox, setDiceTheme } from "@/lib/diceManager";

interface DiceCanvasProps {
  themeColor: string;
}

let _initialized = false;

export default function DiceCanvas({ themeColor }: DiceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (_initialized) return;
    _initialized = true;

    const timer = setTimeout(async () => {
      if (!containerRef.current) return;
      try {
        const w = window.innerWidth;
        const h = window.innerHeight;

        const box = new DiceBox({
          container: "#dice-container",
          assetPath: "/dice-assets/",
          theme: "default",
          themeColor,

          // ── Full-screen physics world ─────────────────────────────────
          scale: 24,
          gravity: 1.5,       // Settle faster after spreading
          startingHeight: 8,  // Low drop = more horizontal momentum on bounce
          spinForce: 20,      // Max spin for epic look
          throwForce: 40,     // HIGH force so dice spread across full screen
          // ─────────────────────────────────────────────────────────────
        });

        await box.init();
        registerDiceBox(box);
        console.log(`[DiceCanvas] ✓ Ready — ${w}x${h}px world`);
      } catch (e) {
        console.error("[DiceCanvas] Init failed:", e);
        _initialized = false;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDiceTheme(themeColor);
  }, [themeColor]);

  return (
    <div
      id="dice-container"
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        pointerEvents: "none",
        background: "transparent",
      }}
    />
  );
}
