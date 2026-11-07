/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Modo Claro Absoluto: deshabilitado por diseño
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        hand: ['"Caveat"', 'cursive', 'sans-serif']
      },
      colors: {
        proofly: {
          canvas: '#FFFFFF',      // Blanco puro para fondos y tarjetas elevadas
          lavender: '#F8D4FD',    // Rosa/Lavanda pastel para bloques destacados y Bento
          'lavender-soft': '#FFF8FE',
          'lavender-deep': '#E5A8F2',
          subtle: '#F6F5F8',      // Gris lavanda ultra claro para inputs y contenedores
          electric: '#7300FF',    // Violeta eléctrico de marca y estados activos
          black: '#000000',       // Negro puro para botones primarios píldora y títulos
          emerald: '#16A34A',     // Verde para retornos positivos (+ $ 500.000 COP)
          rose: '#E11D48',        // Rosa/Rojo para salidas de caja y descuentos
          muted: '#52525B'        // Gris texto secundario
        }
      },
      boxShadow: {
        'card': '0 12px 36px -10px rgba(0, 0, 0, 0.08), 0 2px 0 #000000',
        'polaroid': '0 16px 32px -8px rgba(115, 0, 255, 0.12), 0 4px 0 #000000',
        'phone': '0 25px 60px -15px rgba(29, 11, 49, 0.22), 0 6px 0 #18181B'
      },
      borderRadius: {
        'bento': '24px',
        'pill': '9999px',
        'container': '36px',
        'phone': '46px'
      },
      backdropBlur: {
        'glass': '16px'
      }
    },
  },
  plugins: [],
}
