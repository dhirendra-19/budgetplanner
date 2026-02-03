module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui"],
        display: ["Sora", "ui-sans-serif", "system-ui"]
      },
      colors: {
        ink: "#0f172a",
        slate: "#1f2937",
        mist: "#e6f0f5",
        mint: "#9ae6b4",
        coral: "#fb7185",
        sand: "#fef3c7",
        ocean: "#0ea5e9",
        lavender: "#c7d2fe"
      },
      boxShadow: {
        soft: "0 20px 60px -40px rgba(15, 23, 42, 0.35)",
        glow: "0 0 0 1px rgba(15, 23, 42, 0.08), 0 24px 48px -24px rgba(14, 165, 233, 0.35)"
      }
    }
  },
  plugins: []
};

