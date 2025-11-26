// src/layout/BottomBar.jsx
import React from "react";
import "./BottomBar.css";

function BottomBar({ current, onChange }) {
  const items = [
    { key: "home", label: "Inicio", icon: "🏠" },
    { key: "explore", label: "Explorar", icon: "🔍" },
    { key: "create", label: "Crear", icon: "➕" },
    { key: "market", label: "Mercado", icon: "🛒" },
    { key: "wallet", label: "Monedas", icon: "🪙" },
    { key: "notifications", label: "Alertas", icon: "🔔" },
    { key: "messages", label: "Mensajes", icon: "💬" }, // 👈 Mensajes aquí
    { key: "profile", label: "Perfil", icon: "👤" },
  ];

  return (
    <div
      className="bottom-bar"
      style={{
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        background: "rgba(255,255,255,0.1)",
        padding: "10px 15px",
        borderRadius: "30px",
        width: "95%",
        maxWidth: "420px",
        margin: "0 auto",
        position: "fixed",
        bottom: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        backdropFilter: "blur(10px)",
        zIndex: 50,
      }}
    >
      {items.map((item) => {
        const active = current === item.key;

        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: active
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0)",
              padding: "8px 12px",
              borderRadius: "14px",
              border: "none",
              cursor: "pointer",
              color: active ? "#fff" : "#ccc",
              fontSize: "14px",
              transition: "all 0.25s ease",
            }}
          >
            <span style={{ fontSize: "20px" }}>{item.icon}</span>
            <span style={{ fontSize: "12px" }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BottomBar;
