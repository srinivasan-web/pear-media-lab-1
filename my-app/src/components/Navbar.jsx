import React from "react";
import { NavLink } from "react-router-dom";

function Navbar({ theme, setTheme }) {
  const pages = [
    {
      id: "creative-studio",
      to: "/creative-studio",
      title: "Creative Studio",
      subtitle: "Text enhancement, approval, and image generation",
      badge: "Prompt Page",
    },
    {
      id: "style-lab",
      to: "/style-lab",
      title: "Style Lab",
      subtitle: "Upload, analyze, and create visual variations",
      badge: "Image Page",
    },
  ];

  return (
    <nav className="nav-shell">
      <div className="nav-brand">
        <div className="nav-brand__mark">PM</div>
        <div>
          <div className="nav-brand__title">Pear Media AI</div>
          <p className="nav-brand__subtitle">Creative prompt and visual lab</p>
        </div>
      </div>

      <div className="nav-actions">
        <button
          className="nav-theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
        </button>
      </div>

      <div className="nav-tabs">
        {pages.map((page) => (
          <NavLink
            key={page.id}
            to={page.to}
            className={({ isActive }) =>
              `nav-tab ${isActive ? "nav-tab--active" : ""}`
            }
          >
            <span className="nav-tab__badge">{page.badge}</span>
            <span className="nav-tab__title">{page.title}</span>
            <span className="nav-tab__subtitle">{page.subtitle}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default Navbar;
