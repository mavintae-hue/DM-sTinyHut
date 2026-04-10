"use client";

import { useEffect, useRef } from "react";
import DiceBox from "@3d-dice/dice-box";
import { registerDiceBox, setDiceTheme } from "@/lib/diceManager";

interface DiceCanvasProps {
  themeColor: string;
  diceTheme: string;
}

let _initialized = false;

export default function DiceCanvas({ themeColor, diceTheme }: DiceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (_initialized) return;
    _initialized = true;

    let box: any = null;

    const initDice = async () => {
      const container = containerRef.current;
      if (!container) return;

      // Force container to fill viewport exactly
      const updateSize = () => {
        const W = window.innerWidth;
        const H = window.innerHeight;
        container.style.width = `${W}px`;
        container.style.height = `${H}px`;
        return { W, H };
      };

      const { W, H } = updateSize();

      try {
        box = new DiceBox({
          container: "#dice-container",
          assetPath: "/dice-assets/",
          theme: diceTheme,
          themeColor,
          // ── Physics Tuning for Full Screen ────────────────────────────
          scale: 9,           // Reduced scale from 18 to 9 (50% smaller)
          gravity: 1.5,
          startingHeight: 25,  // Drop from high up
          spinForce: 20,
          throwForce: 15,      // Moderate throw to keep them on screen but spread out
          // ─────────────────────────────────────────────────────────────
        });

        await box.init();

        // Ensure canvas matches container
        const canvas = container.querySelector("canvas");
        if (canvas) {
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          canvas.style.display = "block";
        }

        registerDiceBox(box);
        console.log(`[DiceCanvas] ✓ Initialized ${W}x${H}`);

        // Listen for resizes to keep the visual canvas correct
        window.addEventListener("resize", updateSize);

      } catch (e) {
        console.error("[DiceCanvas] Init failed:", e);
        _initialized = false;
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const handle = requestAnimationFrame(() => {
        initDice();
    });

    return () => {
        cancelAnimationFrame(handle);
        // We don't remove the resize listener here because _initialized is global
        // and we want to keep the box alive. In a real app we'd handle cleanup better
        // but for this singleton pattern we persist.
    };
  }, []);

  useEffect(() => {
    setDiceTheme(themeColor, diceTheme);
  }, [themeColor, diceTheme]);

  return (
    <div
      id="dice-container"
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 500,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        background: "transparent",
        overflow: "visible",
      }}
    >
      <style jsx global>{`
        #dice-container canvas {
          pointer-events: none !important;
        }
      `}</style>
    </div>
  );
}
