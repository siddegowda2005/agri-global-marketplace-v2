import { describe, it, expect } from 'vitest';
import { convert, money, haversineKm, safeUrl } from '../utils/format.js';
import { validateRegister, validateLogin, validateCrop } from '../utils/validate.js';

describe('currency helpers', () => {
  it('converts INR to AED with correct rounding and never invents a rate', () => {
    expect(convert(30, 'AED', { AED: 0.044 })).toBe(1.32);
    expect(convert(30, 'INR', null)).toBe(30);
    expect(convert(30, 'USD', null)).toBeNull();
    expect(convert(30, 'USD', { USD: 0 })).toBeNull();
    expect(convert(1.005, 'USD', { USD: 1 })).toBe(1.01);
  });
  it('formats money with symbols', () => { expect(money(1.32, 'AED')).toBe('AED 1.32'); expect(money(30, 'INR')).toBe('₹30.00'); });
});
describe('geo + url helpers', () => {
  it('haversine is ~0 for same point and plausible for Mysuru-Bengaluru', () => {
    expect(haversineKm({ lat: 12.3, lng: 76.6 }, { lat: 12.3, lng: 76.6 })).toBe(0);
    const d = haversineKm({ lat: 12.2958, lng: 76.6394 }, { lat: 12.9716, lng: 77.5946 });
    expect(d).toBeGreaterThan(110); expect(d).toBeLessThan(140);
  });
  it('safeUrl rejects non-http schemes', () => { expect(safeUrl('javascript:alert(1)')).toBeNull(); expect(safeUrl('https://example.com')).toBe('https://example.com'); expect(safeUrl(undefined)).toBeNull(); });
});
describe('form validation', () => {
  it('register', () => {
    expect(Object.keys(validateRegister({ name: '', email: 'bad', password: 'short' }))).toEqual(['name', 'email', 'password']);
    expect(validateRegister({ name: 'Asha K', email: 'a@b.co', password: 'Passw0rd1' })).toEqual({});
  });
  it('login', () => { expect(validateLogin({ email: '', password: '' })).toHaveProperty('email'); expect(validateLogin({ email: 'a@b.co', password: 'x' })).toEqual({}); });
  it('crop', () => {
    expect(Object.keys(validateCrop({ name: '', category: '', quantity: '', priceInr: '-1', location: '' })).length).toBe(5);
    expect(validateCrop({ name: 'Tomato', category: 'Vegetables', quantity: '10', priceInr: '30', location: 'Mysuru' })).toEqual({});
  });
});
