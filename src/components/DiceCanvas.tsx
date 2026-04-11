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
      console.log("[DiceCanvas] Starting DiceBox initialization...");
      setDiceInitStatus('loading');

      try {
        // Inject container directly into body so it's guaranteed to exist
        let container = document.getElementById("dice-box-root");
        if (!container) {
          container = document.createElement("div");
          container.id = "dice-box-root";
          document.body.appendChild(container);
        }

        // Absolute reinforcement of styling
        Object.assign(container.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100vw",
          height: "100vh",
          zIndex: "100000",
          overflow: "visible",
          background: "transparent",
          pointerEvents: "none",
        });

        // Inject global CSS to force any canvas inside to be visible
        const styleId = "dice-box-visibility-style";
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.innerHTML = `
            #dice-box-root canvas {
              display: block !important;
              visibility: visible !important;
              width: 100vw !important;
              height: 100vh !important;
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              z-index: 100000 !important;
              pointer-events: none !important;
            }
          `;
          document.head.appendChild(style);
        }

        const mod = await import("@3d-dice/dice-box");
        const DiceBox = mod.default || mod;

        if (typeof DiceBox !== 'function') {
          throw new Error("DiceBox constructor not found in module exports");
        }

        // Standard constructor: (container_selector, options)
        const box = new (DiceBox as any)("#dice-box-root", {
          assetPath: "/dice-assets/", 
          theme: diceTheme,
          themeColor,
          scale: 5,
          gravity: 1.5,
          spinForce: 15,
          throwForce: 10,
        });

        // Initialize with a timeout to prevent infinite "LOADING" state
        const initPromise = box.init();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("DiceBox initialization timed out after 15s")), 15000)
        );

        await Promise.race([initPromise, timeoutPromise]);

        // Style the resulting canvas directly
        const canvas = container!.querySelector("canvas");
        if (canvas) {
          console.log("[DiceCanvas] Canvas found in DOM, applying styles.");
          Object.assign(canvas.style, {
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
          });
        } else {
          console.warn("[DiceCanvas] DiceBox initialized but no canvas found in container!");
        }

        registerDiceBox(box);
        setDiceInitStatus('ready');
        console.log("[DiceCanvas] ✓ DiceBox ready and registered!");

        // --- NEW: Dimension Enforcement Loop ---
        const enforceDimensions = () => {
          const cv = container?.querySelector("canvas");
          if (cv) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            if (cv.width !== w || cv.height !== h) {
              console.log(`[DiceCanvas] Reinforcing dimensions: ${w}x${h}`);
              cv.width = w;
              cv.height = h;
              Object.assign(cv.style, {
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                top: '0',
                left: '0',
                display: 'block',
                visibility: 'visible',
                opacity: '1',
                zIndex: '100000',
                pointerEvents: 'none'
              });
            }
          }
        };

        const dimensionInterval = setInterval(enforceDimensions, 500);
        (box as any)._enforceInterval = dimensionInterval;

      } catch (err) {
        console.error("[DiceCanvas] DiceBox init FAILED:", err);
        setDiceInitStatus('error');
        // Allow retry on next mount
        initAttempted.current = false;
      }
    };

    // Use a slight delay to ensure the body is ready in Next.js hydrate phase
    const timer = setTimeout(initDice, 100);
    return () => {
      clearTimeout(timer);
      // Cleanup happens if we unmount, but the container stays in body
    };
  }, [themeColor, diceTheme]);

  // Sync theme/color to DiceBox whenever props change
  useEffect(() => {
    setDiceTheme(themeColor, diceTheme);
  }, [themeColor, diceTheme]);

  // No rendered DOM in the React tree — container lives directly in document.body
  return null;
}
