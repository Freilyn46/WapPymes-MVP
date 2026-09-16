module.exports = {
  content: ["./index.html", "./*.js"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#2563eb',
          600: '#1d4ed8'
        },
        ink: '#0f172a',
        line: '#e6e6e6',
        muted: '#6b7580'
      },
      borderRadius: {
        ticket: '12px'
      }
    }
  },
  plugins: []
};
