const themes = {
  red: {
    primary: "#ff003c",
    shadow: "#ff003c90",
    glow: "#ff003c30",
    rgba: "rgba(255, 0, 60, 0.5)",
  },
  blue: {
    primary: "#00f0ff",
    shadow: "#00f0ff90",
    glow: "#00f0ff30",
    rgba: "rgba(0, 240, 255, 0.5)",
  },
  green: {
    primary: "#00ff88",
    shadow: "#00ff8890",
    glow: "#00ff8830",
    rgba: "rgba(0, 255, 136, 0.5)",
  },
  purple: {
    primary: "#a000ff",
    shadow: "#a000ff90",
    glow: "#a000ff30",
    rgba: "rgba(160, 0, 255, 0.5)",
  },
  gold: {
    primary: "#f5b700",
    shadow: "#f5b70090",
    glow: "#f5b70030",
    rgba: "rgba(245, 183, 0, 0.5)",
  }
};

function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;

  document.documentElement.style.setProperty('--primary-color', theme.primary);
  document.documentElement.style.setProperty('--shadow-color', theme.shadow);
  document.documentElement.style.setProperty('--glow-color', theme.glow);
  document.documentElement.style.setProperty('--rgba-color', theme.rgba);

  localStorage.setItem("rog-theme", themeName);
}

function loadSavedTheme() {
  const saved = localStorage.getItem("rog-theme") || "red";
  applyTheme(saved);
}

window.addEventListener("DOMContentLoaded", loadSavedTheme);
