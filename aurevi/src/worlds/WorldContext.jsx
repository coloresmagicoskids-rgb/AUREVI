// src/worlds/WorldContext.jsx
import React, { createContext, useContext, useState } from "react";

// Mundo por defecto
const DEFAULT_WORLD = "publico";

const WorldContext = createContext(null);

export function WorldProvider({ children }) {
  const [activeWorld, setActiveWorld] = useState(DEFAULT_WORLD);

  const value = {
    activeWorld,
    setActiveWorld,
  };

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) {
    throw new Error("useWorld debe usarse dentro de <WorldProvider>");
  }
  return ctx;
}