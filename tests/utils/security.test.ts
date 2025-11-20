import { describe, it, expect } from 'vitest';
import { isValidUrl, sanitizeHtml, sanitizeCss } from '../../utils/security';

describe('security utilities', () => {
  describe('isValidUrl', () => {
    it('should validate http URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
    });

    it('should validate https URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('   ')).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('should sanitize dangerous scripts', () => {
      const html = '<div>Safe</div><script>alert("xss")</script>';
      const sanitized = sanitizeHtml(html);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<div>Safe</div>');
    });

    it('should preserve safe HTML', () => {
      const html = '<div><p>Hello</p><span>World</span></div>';
      const sanitized = sanitizeHtml(html);
      expect(sanitized).toContain('<div>');
      expect(sanitized).toContain('<p>Hello</p>');
    });
  });

  describe('sanitizeCss', () => {
    it('should remove dangerous expressions', () => {
      const css = 'body { color: red; } div { expression(alert(1)); }';
      const sanitized = sanitizeCss(css);
      expect(sanitized).not.toContain('expression(');
    });

    it('should preserve safe CSS', () => {
      const css = 'body { color: red; background: blue; }';
      const sanitized = sanitizeCss(css);
      expect(sanitized).toContain('color: red');
      expect(sanitized).toContain('background: blue');
    });
  });
});

