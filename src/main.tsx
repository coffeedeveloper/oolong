import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MenuBarApp } from "./components/menu-bar/MenuBarApp";
import "./styles.css";

const isMenuBarView = new URLSearchParams(window.location.search).get("view") === "menu-bar";
document.documentElement.classList.toggle("menu-bar-view", isMenuBarView);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isMenuBarView ? <MenuBarApp /> : <App />}
  </React.StrictMode>
);
