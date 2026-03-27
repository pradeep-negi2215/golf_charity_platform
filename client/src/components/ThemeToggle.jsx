import { useEffect, useState } from "react";

function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(() => document.body.classList.contains("dark-mode"));

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
      return;
    }

    document.body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
  }, [darkMode]);

  return (
    <button
      type="button"
      className="theme-fab"
      onClick={() => setDarkMode((prev) => !prev)}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {darkMode ? "Light" : "Dark"}
    </button>
  );
}

export default ThemeToggle;
