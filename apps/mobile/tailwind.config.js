const { nativeWindPreset } = require("@hr/tokens/nativewind-preset.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset"), nativeWindPreset],
  // NativeWind web requires class strategy to set colorScheme; media throws.
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};
