/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Modo Claro Absoluto — never enabled by default
  theme: {
    extend: {
      colors: {
        lilac: {
          DEFAULT: '#F8D4FD',
          soft: '#FFF8FE',
          pastel: '#F3E5F5',
          lavender: '#EFE5FF',
          blush: '#FFF0FA',
          deep: '#E5A8F2',
        },
        electric: {
          DEFAULT: '#7300FF',
          dark: '#5200B8',
          light: '#A259FF',
        },
        // Deep brand violet — replaces pure black for text, borders and CTAs
        ink: {
          DEFAULT: '#1E0B3B',
          900: '#160828',
          800: '#1E0B3B',
          700: '#2A0E52',
          600: '#3A1670',
          500: '#4E2490',
          soft: '#5B4576',
        },
        canvas: '#FFFFFF',
        surface: '#F6F5F8',
        // Legacy aliases kept for existing component code
        proofly: {
          canvas: '#FFFFFF',
          lavender: '#F8D4FD',
          'lavender-soft': '#FFF8FE',
          'lavender-deep': '#E5A8F2',
          subtle: '#F6F5F8',
          electric: '#7300FF',
          black: '#1E0B3B',
          emerald: '#16A34A',
          rose: '#E11D48',
          muted: '#5B4576',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Syne"', '"Plus Jakarta Sans"', 'sans-serif'],
        hand: ['"Caveat"', 'cursive'],
        script: ['"Pacifico"', 'cursive'],
      },
      boxShadow: {
        // Soft, elevated shadows — no hard black offsets
        sticker: '0 16px 32px -12px rgba(30,11,59,0.18), 0 4px 10px -4px rgba(30,11,59,0.10)',
        'sticker-hover': '0 26px 46px -14px rgba(115,0,255,0.26), 0 8px 18px -6px rgba(30,11,59,0.14)',
        polaroid: '0 18px 38px -14px rgba(30,11,59,0.16), 0 4px 12px -6px rgba(30,11,59,0.10)',
        'polaroid-hover': '0 28px 52px -16px rgba(115,0,255,0.24), 0 8px 20px -8px rgba(30,11,59,0.14)',
        phone: '0 36px 80px -20px rgba(30,11,59,0.28), 0 0 0 1px rgba(30,11,59,0.06)',
        card: '0 22px 54px -24px rgba(30,11,59,0.16), 0 4px 14px -8px rgba(30,11,59,0.08)',
        floating: '0 24px 50px -20px rgba(30,11,59,0.16), 0 6px 16px -8px rgba(30,11,59,0.10)',
        'pill-nav': '0 12px 30px -12px rgba(30,11,59,0.28)',
      },
      borderRadius: {
        bento: '24px',
        pill: '9999px',
        container: '36px',
        phone: '46px',
      },
    },
  },
  plugins: [],
}
