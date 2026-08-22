import { render, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Clear any inline styles on documentElement before each test
    document.documentElement.style.cssText = '';
  });

  describe('CSS custom properties are set on mount', () => {
    it('sets --theme-primary, --theme-css, and --theme-type on document.documentElement for a solid color', () => {
      render(
        <ThemeProvider websiteColor="#ff0000">
          <div>children</div>
        </ThemeProvider>,
      );

      expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#ff0000');
      expect(document.documentElement.style.getPropertyValue('--theme-css')).toBe('#ff0000');
      expect(document.documentElement.style.getPropertyValue('--theme-type')).toBe('solid');
    });

    it('sets gradient CSS values when websiteColor is a gradient string', () => {
      render(
        <ThemeProvider websiteColor="gradient:to-r:#ff0000:#0066ff">
          <div>children</div>
        </ThemeProvider>,
      );

      expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#ff0000');
      // Explicit 0%/100% stops keep the two colours at an even 50/50 split.
      expect(document.documentElement.style.getPropertyValue('--theme-css')).toBe(
        'linear-gradient(to right, #ff0000 0%, #0066ff 100%)',
      );
      expect(document.documentElement.style.getPropertyValue('--theme-type')).toBe('gradient');
    });

    it('falls back to default black when websiteColor is null', () => {
      render(
        <ThemeProvider websiteColor={null}>
          <div>children</div>
        </ThemeProvider>,
      );

      expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#000000');
      expect(document.documentElement.style.getPropertyValue('--theme-css')).toBe('#000000');
      expect(document.documentElement.style.getPropertyValue('--theme-type')).toBe('solid');
    });
  });

  describe('CSS custom properties are cleaned up on unmount', () => {
    it('removes --theme-primary, --theme-css, and --theme-type from document.documentElement on unmount', () => {
      const { unmount } = render(
        <ThemeProvider websiteColor="#ff0000">
          <div>children</div>
        </ThemeProvider>,
      );

      // Verify properties are set
      expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#ff0000');

      unmount();

      // Verify properties are removed
      expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--theme-css')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--theme-type')).toBe('');
    });
  });

  describe('useTheme throws when used outside provider', () => {
    it('throws "useTheme must be used within ThemeProvider" when used outside ThemeProvider', () => {
      // Suppress React error boundary console errors for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within ThemeProvider');

      consoleSpy.mockRestore();
    });
  });
});
