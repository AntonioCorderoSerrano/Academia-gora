/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f6f6f5',
          100: '#e7e7e4',
          200: '#d1d0cb',
          300: '#b0afa6',
          400: '#8b8a7e',
          500: '#6f6e63',
          600: '#57564d',
          700: '#464540',
          800: '#3b3a36',
          900: '#1c1b18',
        },
        accent: {
          DEFAULT: '#b8864c',
          soft: '#d4a574',
          deep: '#8b5e2a',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28,27,24,.04), 0 4px 16px rgba(28,27,24,.06)',
        elegant: '0 2px 4px rgba(28,27,24,.06), 0 16px 40px rgba(28,27,24,.08)',
      },
    },
  },
  plugins: [],
};
