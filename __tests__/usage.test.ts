import { LIMITS, FILE_LIMITS } from '../types/usage';

describe('LIMITS constants', () => {
  it('free plan has 5 AI requests', () => {
    expect(LIMITS.free).toBe(5);
  });
  it('premium plan has 50 AI requests', () => {
    expect(LIMITS.premium).toBe(50);
  });
});

describe('FILE_LIMITS constants', () => {
  it('free plan has 1 file request', () => {
    expect(FILE_LIMITS.free).toBe(1);
  });
  it('premium plan has 10 file requests', () => {
    expect(FILE_LIMITS.premium).toBe(10);
  });
});