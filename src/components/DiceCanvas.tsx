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
          scale: 12,           // BIG dice (was 7)
          gravity: 1,          // Lower gravity = longer air time
          startingHeight: 20,  // Drop from high
          spinForce: 15,       // Fast spin for cool effect
          throwForce: 8,       // Medium throw so they spread across screen
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
