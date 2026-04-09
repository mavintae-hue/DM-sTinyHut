"use client";

import React, { useState, useEffect, useRef } from "react";
import { Move, Maximize2, X } from "lucide-react";

interface FloatingWidgetProps {
  children: React.ReactNode;
  title: string;
  storageKey: string;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
}

export default function FloatingWidget({
  children,
  title,
  storageKey,
  defaultPosition = { x: 20, y: 120 },
  defaultSize = { width: 320, height: 400 }
}: FloatingWidgetProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isMinimized, setIsMinimized] = useState(false);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  // Load state
  useEffect(() => {
    const saved = localStorage.getItem(`widget_${storageKey}`);
    if (saved) {
      try {
        const { pos, size: sz, minimized } = JSON.parse(saved);
        setPosition(pos);
        setSize(sz);
        setIsMinimized(minimized);
      } catch (e) {
        console.error("Failed to load widget state:", e);
      }
    }
  }, [storageKey]);

  // Save state
  useEffect(() => {
    localStorage.setItem(`widget_${storageKey}`, JSON.stringify({ pos: position, size, minimized: isMinimized }));
  }, [position, size, isMinimized, storageKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    isResizing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { ...size };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    } else if (isResizing.current) {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;
      setSize({
        width: Math.max(200, startSize.current.width + deltaX),
        height: Math.max(150, startSize.current.height + deltaY)
      });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className="fixed z-[50] flex flex-col bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-shadow hover:shadow-gold/5"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? "200px" : `${size.width}px`,
        height: isMinimized ? "auto" : `${size.height}px`
      }}
    >
      {/* Header / Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-3 bg-white/5 border-b border-white/5 cursor-move group"
      >
        <div className="flex items-center gap-2">
          <Move className="w-3 h-3 text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{title}</span>
        </div>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <Maximize2 className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden pointer-events-auto">
          {children}
        </div>
      )}

      {/* Resize Handle */}
      {!isMinimized && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center group"
        >
          <div className="w-1 h-1 bg-white/20 rounded-full group-hover:bg-gold transition-colors" />
        </div>
      )}
    </div>
  );
}
