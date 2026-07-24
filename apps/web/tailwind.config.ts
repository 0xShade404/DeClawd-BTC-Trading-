import type { Config } from 'tailwindcss';

/**
 * DeClawd design tokens: dark, minimal, sleek business aesthetic in the
 * spirit of the Base ecosystem (base.org / Base app) - Base Blue (#0052FF)
 * as the sole accent, crisp glass surfaces with a subtle chrome sheen
 * (see `.chrome` in globals.css) rather than a warm/glowy treatment.
 * Colors are expressed as HSL CSS variables (defined in src/app/globals.css)
 * following shadcn/ui conventions so the hand-rolled primitives in
 * src/components/ui are a drop-in replacement for real shadcn/ui components
 * later.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1180px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Literal Base-blue scale for cases that need a raw color value
        // (glows, gradients) rather than the semantic `primary` token.
        // 500 is Base's brand blue (#0052FF).
        base: {
          50: '#eef3ff',
          100: '#dce7ff',
          200: '#b9cfff',
          300: '#8fb3ff',
          400: '#4d80ff',
          500: '#0052FF',
          600: '#0044d6',
          700: '#0036ac',
          800: '#002a85',
          900: '#001f63',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
      },
      backgroundImage: {
        'glow-radial': 'radial-gradient(circle at 50% 0%, rgba(0,82,255,0.16), transparent 60%)',
        // Subtle top-down glossy highlight used by `.chrome` surfaces
        // (primary buttons, the brand mark) for a slightly metallic finish.
        chrome: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-blue': '0 0 24px 0 rgba(0,82,255,0.45)',
        chrome: 'inset 0 1px 0 0 rgba(255,255,255,0.25), inset 0 -1px 0 0 rgba(0,0,0,0.15)',
      },
      backdropBlur: {
        glass: '16px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
