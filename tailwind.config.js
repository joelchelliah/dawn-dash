/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        componentBackground: '#1f1f1f',
        appBackground: '#1a1a1a',
        hoverBackground: '#2a2a2a',
        border: '#333',
        text: {
          DEFAULT: '#ffffff',
          secondary: '#aaa',
          muted: '#999',
        },
      },
      spacing: {
        chart: {
          containerHeight: '31.25rem',
          legendHeight: '33.375rem',
          legendWidth: '13.75rem',
        },
        control: {
          minWidth: '8rem',
          maxWidth: '25rem',
        },
      },
      breakpoint: {
        mobile: '48rem', // 768px
        tablet: '64rem', // 1024px
      },
    },
  },
  plugins: [],
}
