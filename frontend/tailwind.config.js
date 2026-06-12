/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FAF6F0',
          dark: '#F3EDE2',
        },
        terracotta: {
          50: '#FDF5F2',
          100: '#FBEBE6',
          200: '#F7D8CD',
          300: '#F0BCA7',
          400: '#E49575',
          500: '#D37556', // Base primary
          600: '#BD5D3E',
          700: '#9D4830',
          800: '#813C29',
          900: '#6C3526',
        },
        charcoal: {
          DEFAULT: '#2C2A29',
          light: '#4A4745',
        },
        warmbrown: {
          DEFAULT: '#8C7A6B',
          light: '#A69587',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Manrope"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
