/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Modo Claro Absoluto: deshabilitado por diseño
  theme: {
    extend: {
      colors: {
        proofly: {
          canvas: '#FFFFFF',      // Blanco puro para fondos y tarjetas elevadas
          lavender: '#F8D4FD',    // Rosa/Lavanda pastel para bloques destacados y Bento
          subtle: '#F6F5F8',      // Gris lavanda ultra claro para inputs y contenedores
          electric: '#7300FF',    // Violeta eléctrico de marca y estados activos
          black: '#000000',       // Negro puro para botones primarios píldora y títulos
          emerald: '#16A34A',     // Verde para retornos positivos (+ $ 500.000 COP)
          rose: '#E11D48',        // Rosa/Rojo para salidas de caja y descuentos
          muted: '#52525B'        // Gris texto secundario
        }
      },
      borderRadius: {
        'bento': '24px',
        'pill': '9999px',
        'container': '32px'
      },
      backdropBlur: {
        'glass': '16px'
      }
    },
  },
  plugins: [],
}

