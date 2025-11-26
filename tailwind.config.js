/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // use .dark class on <html> to toggle dark mode
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#F97316',
          dark: '#FB923C',
        },
        secondary: {
          light: '#EF4444',
          dark: '#F87171',
        },
        success: {
          light: '#10B981',
          dark: '#34D399',
        },
        warning: {
          light: '#F59E0B',
          dark: '#FBBF24',
        },
        info: {
          light: '#8B5CF6',
          dark: '#C084FC',
        },
        neutral: {
          100: '#F9FAFB', // light surface
          200: '#F3F4F6',
          300: '#E5E7EB',
          400: '#D1D5DB',
          500: '#9CA3AF',
          600: '#6B7280',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#111827',
        },
        border: {
          light: '#E5E7EB',
          dark: '#374151',
        },
        hover: {
          light: '#FDE68A',
          dark: '#FBBF24',
        },
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.06)',
        elevated: '0 4px 8px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
