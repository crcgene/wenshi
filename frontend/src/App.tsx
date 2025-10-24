// src/App.tsx
import React, { useState } from "react";
import HomeView from "./views/HomeView";
import SettingsView from "./views/SettingsView";

export default function App() {
  const [view, setView] = useState<"main" | "settings">("main");

  return (
    <>
      {view === "main" ? (
        <HomeView switchToSettings={() => setView("settings")} />
      ) : (
        <SettingsView switchToMain={() => setView("main")} />
      )}
    </>
  );
}
