"use client";

import { useEffect, useRef } from "react";
import DiceBox from "@3d-dice/dice-box";
import { registerDiceBox, setDiceTheme } from "@/lib/diceManager";

interface DiceCanvasProps {
  themeColor: string;
  diceTheme: string;
}

export default function DiceCanvas({ themeColor, diceTheme }: DiceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initializedRef.current || initializingRef.current) return;
    
    initializingRef.current = true;
    let box: any = null;

    const initDice = async () => {
      const container = containerRef.current;
      if (!container) {
        initializingRef.current = false;
        return;
      }

      console.log("[DiceCanvas] Starting initialization...");

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
        initializedRef.current = true;
        initializingRef.current = false;
        console.log(`[DiceCanvas] ✓ Initialized ${W}x${H}`);

        // Listen for resizes to keep the visual canvas correct
        window.addEventListener("resize", updateSize);

      } catch (e) {
        console.error("[DiceCanvas] Init failed:", e);
        initializingRef.current = false;
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const handle = requestAnimationFrame(() => {
        initDice();
    });

    return () => {
        cancelAnimationFrame(handle);
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
