"use client";

import { useEffect, useRef, useState } from "react";
import { registerDiceBox, setDiceTheme, setDiceInitStatus, destroyDiceBox } from "@/lib/diceManager";

interface DiceCanvasProps {
  themeColor: string;
  diceTheme: string;
}

export default function DiceCanvas({ themeColor, diceTheme }: DiceCanvasProps) {
  const initAttempted = useRef(false);
  const [reinitKey, setReinitKey] = useState(0);

  // Expose re-init to window for the debug button
  useEffect(() => {
    (window as any).__reinitDice = () => {
      console.log("[DiceCanvas] Manual RE-INIT triggered");
      destroyDiceBox();
      initAttempted.current = false;
      setReinitKey(prev => prev + 1);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initAttempted.current) return;
    initAttempted.current = true;

    const initDice = async () => {
      console.log("[DiceCanvas] Starting DiceBox initialization (Attempt " + reinitKey + ")...");
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

        // Standard constructor
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
        }

        registerDiceBox(box);
        setDiceInitStatus('ready');
        console.log("[DiceCanvas] ✓ DiceBox ready and registered!");

        // --- Dimension Enforcement Loop ---
        const enforceDimensions = () => {
          const cv = container?.querySelector("canvas");
          if (cv) {
            // ONLY enforce CSS styles. Setting cv.width or cv.height wipes the WebGL frame buffer!
            if (cv.style.width !== '100vw' || cv.style.height !== '100vh') {
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

      } catch (err: any) {
        console.error("[DiceCanvas] DiceBox init FAILED:", err);
        setDiceInitStatus('error');
        initAttempted.current = false;
      }
    };

    const timer = setTimeout(initDice, 100);
    return () => {
      clearTimeout(timer);
    };
  }, [themeColor, diceTheme, reinitKey]);

  useEffect(() => {
    setDiceTheme(themeColor, diceTheme);
  }, [themeColor, diceTheme]);

  return null;
}
