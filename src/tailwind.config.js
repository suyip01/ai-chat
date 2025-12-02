export default {
  content: [
    '../index.html',
    './user/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        cute: ['"ZCOOL KuaiLe"', 'cursive'],
        round: ['"Varela Round"', 'sans-serif'],
        kosugi: ['"Kosugi Maru"', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fcfaff',
          100: '#f6f1fe',
          200: '#efe5fd',
          300: '#e3d2fb',
          400: '#d0b0f8',
          500: '#b78af3',
          600: '#a268ed',
          700: '#8e4ce2',
          800: '#773cbd',
          900: '#63329a',
        },
        accent: {
          pink: '#ffb7d5',
          blue: '#a8dfff',
        },
      },
    },
  },
  plugins: [],
};
