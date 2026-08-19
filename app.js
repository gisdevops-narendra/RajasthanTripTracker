 
    const THEMES = [
      { id: "classic-blue", name: "Classic Blue", colors: ["#123b68", "#1d5d9b"], vars: { "--blue": "#123b68", "--blue2": "#1d5d9b", "--bg": "#f1f4f8", "--green": "#16834b", "--green-bg": "#e8f7ef", "--red": "#c62828", "--orange": "#b86b00" } },
      { id: "forest-green", name: "Forest Green", colors: ["#14532d", "#2f855a"], vars: { "--blue": "#14532d", "--blue2": "#2f855a", "--bg": "#f1f7f3", "--green": "#16834b", "--green-bg": "#e8f7ef", "--red": "#c62828", "--orange": "#b86b00" } },
      { id: "ocean-teal", name: "Ocean Teal", colors: ["#115e59", "#0d9488"], vars: { "--blue": "#115e59", "--blue2": "#0d9488", "--bg": "#eef7f7", "--green": "#16834b", "--green-bg": "#e8f7ef", "--red": "#c62828", "--orange": "#b86b00" } },
      { id: "burnt-orange", name: "Burnt Orange", colors: ["#7c2d12", "#c2410c"], vars: { "--blue": "#7c2d12", "--blue2": "#c2410c", "--bg": "#faf3ee", "--green": "#16834b", "--green-bg": "#e8f7ef", "--red": "#c62828", "--orange": "#b86b00" } },
      { id: "sunset-amber", name: "Sunset Amber", colors: ["#78350f", "#d97706"], vars: { "--blue": "#78350f", "--blue2": "#d97706", "--bg": "#fdf6ec", "--green": "#16834b", "--green-bg": "#e8f7ef", "--red": "#c62828", "--orange": "#b86b00" } },
      { id: "royal-purple", name: "Royal Purple", colors: ["#4c1d95", "#7c3aed"], vars: { "--blue": "#4c1d95", "--blue2": "#7c3aed", "--bg": "#f5f2fb", "--green": "#16834b", "--green-bg": "#e8f7ef", "--red": "#c62828", "--orange": "#b86b00" } },
      { id: "black-white", name: "Black & White", colors: ["#111827", "#4b5563"], vars: { "--blue": "#111827", "--blue2": "#4b5563", "--bg": "#f4f4f5", "--green": "#374151", "--green-bg": "#f3f4f6", "--red": "#111827", "--orange": "#6b7280" } }
    ];
    function getSavedThemeId() {
      try { return localStorage.getItem("rtt_theme") } catch (e) { return null }
    }
    function applyTheme(themeId) {
      const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
      const root = document.documentElement.style;
      Object.keys(theme.vars).forEach(k => root.setProperty(k, theme.vars[k]));
      try { localStorage.setItem("rtt_theme", theme.id) } catch (e) { }
      document.querySelectorAll(".theme-option").forEach(btn => {
        const active = btn.dataset.theme === theme.id;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-checked", String(active));
      });
    }
    (function () {
      const saved = getSavedThemeId();
      if (saved && THEMES.some(t => t.id === saved)) applyTheme(saved);
    })();
