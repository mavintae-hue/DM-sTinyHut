"use client";

import { useEffect, useRef } from "react";
import DiceBox from "@3d-dice/dice-box";
import { registerDiceBox, setDiceTheme } from "@/lib/diceManager";

interface DiceCanvasProps {
  themeColor: string;
}

// Prevent double-init across React StrictMode remounts
let _initialized = false;

export default function DiceCanvas({ themeColor }: DiceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (_initialized) return; // Already inited in a previous mount
    _initialized = true;

    const timer = setTimeout(async () => {
      if (!containerRef.current) return;
      try {
        const box = new DiceBox({
          container: "#dice-container",
          assetPath: "https://unpkg.com/@3d-dice/dice-box@1.1.4/dist/assets/",
          theme: "default",
          themeColor,
          scale: 7,
          spinForce: 10,
          throwForce: 30,
          gravity: 2,
          startingHeight: 12,
        });

        await box.init();
        registerDiceBox(box); // Hand over to diceManager
      } catch (e) {
        console.error("[DiceCanvas] Init failed:", e);
        _initialized = false; // Allow retry on next mount
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep theme color in sync
  useEffect(() => {
    setDiceTheme(themeColor);
  }, [themeColor]);

  return (
    <div
      id="dice-container"
      ref={containerRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ width: "100vw", height: "100vh", background: "transparent" }}
    />
  );
}
