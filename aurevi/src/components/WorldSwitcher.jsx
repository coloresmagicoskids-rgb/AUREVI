// src/components/WorldSwitcher.jsx
import React from "react";
import { useWorld } from "../worlds/WorldContext";
import { WORLD_KEYS, WORLD_LABELS } from "../worlds/worldTypes";

// Colores por mundo (igual que el que ya tenías)
const WORLD_COLORS = {
  publico: {
    bg: "linear-gradient(90deg,#ff7aa2,#ffb347,#ffd452)",
    text: "#111827",
    shadow: "0 0 10px rgba(255,184,210,0.8)",
  },
  privado: {
    bg: "linear-gradient(90deg,#6366f1,#4f46e5,#111827)",
    text: "#e5e7eb",
    shadow: "0 0 10px rgba(99,102,241,0.8)",
  },
  familiar: {
    bg: "linear-gradient(90deg,#22c55e,#a3e635,#065f46)",
    text: "#022c22",
    shadow: "0 0 10px rgba(34,197,94,0.7)",
  },
  creativo: {
    bg: "linear-gradient(90deg,#ec4899,#8b5cf6,#0ea5e9)",
    text: "#f9fafb",
    shadow: "0 0 10px rgba(236,72,153,0.8)",
  },
  infantil: {
    bg: "linear-gradient(90deg,#f97316,#facc15,#f472b6)",
    text: "#1f2933",
    shadow: "0 0 10px rgba(250,204,21,0.8)",
  },
};

function WorldSwitcher() {
  // ⬅️ tomamos el mundo directamente del contexto
  const { activeWorld, setActiveWorld } = useWorld();

  const handleSelect = (key) => {
    setActiveWorld(key); // cambia el estado global
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "6px 0",
      }}
    >
      {/* Título Pentaverso */}
      <span
        style={{
          fontSize: 22,
          color: "#e5e7eb",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          fontWeight: 600,
          opacity: 0.9,
        }}
      >
        Pentaverso:
      </span>

      {/* Botones de mundos */}
      <div
        className="aurevi-world-switcher"
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {WORLD_KEYS.map((key) => {
          const isActive = activeWorld === key;
          const config = WORLD_COLORS[key] || {
            bg: "rgba(255,255,255,0.10)",
            text: "#111827",
            shadow: "none",
          };

          return (
            <button
              key={key}
              type="button"
              className="aurevi-world-pill"
              onClick={() => handleSelect(key)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.18)",
                background: isActive ? config.bg : "rgba(15,23,42,0.9)",
                color: isActive ? config.text : "#e5e7eb",
                transition: "all 0.25s ease",
                transform: isActive ? "scale(1.06)" : "scale(1.0)",
                boxShadow: isActive ? config.shadow : "none",
                whiteSpace: "nowrap",
              }}
            >
              {WORLD_LABELS[key] || key}
            </button>
          );
        })}
      </div>

      {/* Debug del mundo activo */}
      <span
        style={{
          marginLeft: 10,
          fontSize: 12,
          color: "#9ca3af",
          fontStyle: "italic",
        }}
      >
        activo: <strong>{activeWorld}</strong>
      </span>
    </div>
  );
}

export default WorldSwitcher;