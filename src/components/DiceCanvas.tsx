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
    if (_initialized) return;
    _initialized = true;

    const timer = setTimeout(async () => {
      if (!containerRef.current) return;
      try {
        const box = new DiceBox({
          container: "#dice-container",
          assetPath: "/dice-assets/",     // Local assets — no CORS
          theme: "default",
          themeColor,

          // ── Size & Physics ────────────────────────────────────────────
          scale: 24,           // 2x bigger (was 12)
          gravity: 0.8,        // Even lower gravity = longer air time, more bounce
          startingHeight: 25,  // Drop from higher
          spinForce: 20,       // Max spin
          throwForce: 6,       // Gentle throw so dice spread across full screen
          // ─────────────────────────────────────────────────────────────

          offscreen: true,     // Render off-screen for smoother performance
        });

        await box.init();
        registerDiceBox(box);
        console.log("[DiceCanvas] ✓ Ready — scale 12, full-screen physics");
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
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{
        width: "100vw",
        height: "100vh",
        background: "transparent",
        // Ensure no clipping — dice should be visible over EVERYTHING
        overflow: "visible",
      }}
    />
  );
}
