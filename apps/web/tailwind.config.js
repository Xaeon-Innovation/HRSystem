/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          strong: "hsl(var(--accent-strong))",
          soft: "hsl(var(--accent-soft))",
          tint: "hsl(var(--accent-tint))",
          ink: "hsl(var(--accent-ink))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          title: "hsl(var(--card-title))",
        },
        canvas: "hsl(var(--canvas))",
        frame: "hsl(var(--frame))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
        line: {
          DEFAULT: "hsl(var(--line))",
          strong: "hsl(var(--line-strong))",
        },
        ink: {
          DEFAULT: "hsl(var(--text))",
          2: "hsl(var(--text-2))",
          muted: "hsl(var(--muted-fg))",
        },
        warn: "hsl(var(--warn))",
        yellow: "hsl(var(--yellow))",
        danger: "hsl(var(--danger))",
        info: "hsl(var(--info))",
      },
      borderRadius: {
        xs: "6px",
        sm: "10px",
        md: "14px",
        lg: "18px",
        xl: "24px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        pop: "var(--shadow-pop)",
      },
      fontSize: {
        "2xs": ["11px", "1.4"],
        xs: ["12px", "1.45"],
        sm: ["13.5px", "1.45"],
        base: ["15px", "1.5"],
        stat: ["30px", "1.05"],
        "stat-lg": ["34px", "1"],
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "General Sans",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        ar: ["var(--font-ar)", "var(--font-sans)", "system-ui", "sans-serif"],
        display: [
          "var(--font-sans)",
          "General Sans",
          "system-ui",
          "sans-serif",
        ],
      },
      screens: {
        frame: "1080px",
      },
      animation: {
        "gradient-first": "gradient-move-vertical 30s ease infinite",
        "gradient-second": "gradient-move-in-circle 20s reverse infinite",
        "gradient-third": "gradient-move-in-circle 40s linear infinite",
        "gradient-fourth": "gradient-move-horizontal 40s ease infinite",
        "gradient-fifth": "gradient-move-in-circle 20s ease infinite",
      },
      keyframes: {
        "gradient-move-horizontal": {
          "0%": { transform: "translateX(-50%) translateY(-10%)" },
          "50%": { transform: "translateX(50%) translateY(10%)" },
          "100%": { transform: "translateX(-50%) translateY(-10%)" },
        },
        "gradient-move-in-circle": {
          "0%": { transform: "rotate(0deg)" },
          "50%": { transform: "rotate(180deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "gradient-move-vertical": {
          "0%": { transform: "translateY(-50%)" },
          "50%": { transform: "translateY(50%)" },
          "100%": { transform: "translateY(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
