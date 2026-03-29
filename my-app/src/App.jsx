import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import WorkflowText from "./components/WorkflowText";
import WorkflowImage from "./components/WorkflowImage";

function App() {
  const [theme, setTheme] = useState("dark");

  return (
    <div className={`app-shell app-shell--${theme}`}>
      <div className="app-shell__glow app-shell__glow--one"></div>
      <div className="app-shell__glow app-shell__glow--two"></div>
      <Navbar theme={theme} setTheme={setTheme} />

      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/creative-studio" replace />}
          />
          <Route
            path="/creative-studio"
            element={<WorkflowText appTheme={theme} setAppTheme={setTheme} />}
          />
          <Route
            path="/style-lab"
            element={<WorkflowImage appTheme={theme} setAppTheme={setTheme} />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
