// src/App.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useWorld } from "./worlds/WorldContext";

// Layout
import Header from "./layout/Header.jsx";
import BottomBar from "./layout/BottomBar.jsx";

// Pantallas
import HomeFeed from "./screens/HomeFeed.jsx";
import Explore from "./screens/Explore.jsx";
import Create from "./screens/Create.jsx";
import Notifications from "./screens/Notifications.jsx";
import Profile from "./screens/Profile.jsx";
import AuthScreen from "./screens/AuthScreen.jsx";
import WatchVideo from "./screens/WatchVideo.jsx";
import Marketplace from "./screens/Marketplace.jsx";
import MyLibrary from "./screens/MyLibrary.jsx";
import MarketItemDetail from "./screens/MarketItemDetail.jsx";
import PublishMarketItem from "./screens/PublishMarketItem.jsx";
import Wallet from "./screens/Wallet.jsx";
import Messages from "./screens/Messages.jsx"; // 👈 NUEVO

function App() {
  const [currentScreen, setCurrentScreen] = useState("home");
  const [screenParams, setScreenParams] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Mundo activo (aunque ahora no lo usemos mucho, lo dejamos coherente)
  const { activeWorld } = useWorld();

  // ==========================
  //     LOGIN / USUARIO
  // ==========================
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUser(data.user ?? null);
      setAuthLoading(false);
    };
    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  // ==========================
  //     NAVIGACIÓN GLOBAL
  // ==========================
  const navigate = (screen, params = null) => {
    setCurrentScreen(screen);
    setScreenParams(params);
  };

  // ==========================
  //     SISTEMA DE PANTALLAS
  // ==========================
  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        // HomeFeed ya usa useWorld internamente
        return <HomeFeed navigate={navigate} />;

      case "explore":
        return <Explore navigate={navigate} />;

      case "create":
        return <Create activeWorld={activeWorld} navigate={navigate} />;

      case "market":
        return (
          <Marketplace activeWorld={activeWorld} navigate={navigate} />
        );

      case "marketPublish":
        return (
          <PublishMarketItem
            activeWorld={activeWorld}
            navigate={navigate}
          />
        );

      case "marketDetail": {
        const item = screenParams?.item || null;
        return (
          <MarketItemDetail
            item={item}
            activeWorld={activeWorld}
            navigate={navigate}
          />
        );
      }

      case "library":
        return <MyLibrary activeWorld={activeWorld} navigate={navigate} />;

      case "wallet":
        return <Wallet activeWorld={activeWorld} navigate={navigate} />;

      case "notifications":
        return <Notifications navigate={navigate} />;

      case "profile":
        return <Profile navigate={navigate} />;

      case "watch": {
        const videoId = screenParams?.videoId;
        return <WatchVideo videoId={videoId} navigate={navigate} />;
      }

      case "messages":
        return <Messages navigate={navigate} params={screenParams} />;

      default:
        return <HomeFeed navigate={navigate} />;
    }
  };

  // ==========================
  //     ESTADOS ESPECIALES
  // ==========================
  if (authLoading) {
    return (
      <div className="aurevi-app">
        <main className="aurevi-main">
          <p style={{ color: "#9ca3af" }}>Cargando AUREVI...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="aurevi-app">
        <main className="aurevi-main">
          <AuthScreen />
        </main>
      </div>
    );
  }

  // ==========================
  //     UI PRINCIPAL
  // ==========================
  return (
    <div className="aurevi-app">
      <Header />
      <main className="aurevi-main">{renderScreen()}</main>
      <BottomBar
        current={currentScreen}
        onChange={(screen) => navigate(screen)}
      />
    </div>
  );
}

export default App;
