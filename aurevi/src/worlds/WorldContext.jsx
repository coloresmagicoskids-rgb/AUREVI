// src/worlds/WorldContext.jsx
import React, { createContext, useContext, useState } from "react";
import { WORLD_KEYS } from "./worldTypes";

const WorldContext = createContext(null);

export function WorldProvider({ children }) {
  // Mundo activo global de la app
  const [activeWorld, setActiveWorld] = useState("publico"); // por defecto: público

  const value = {
    activeWorld,
    setActiveWorld,
    availableWorlds: WORLD_KEYS,
  };

  return (
    <WorldContext.Provider value={value}>{children}</WorldContext.Provider>
  );
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) {
    throw new Error("useWorld debe usarse dentro de un WorldProvider");
  }
  return ctx;
}

export default WorldContext;