// __tests__/useAIRequest.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useAIRequest } from '../hooks/useAIRequest';
import { useUsageStore } from '../store/usageStore';
import { LIMITS, FILE_LIMITS, UsageRecord } from '../types/usage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockConsumeRequest = jest.fn();
const mockConsumeFileRequest = jest.fn();

jest.mock('../store/usageStore', () => ({
  useUsageStore: jest.fn(),
}));

let mockLanguage = 'fr';
jest.mock('../store/languageStore', () => ({
  useLanguageStore: jest.fn(() => ({ currentLanguage: mockLanguage })),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// ─── Helper ───────────────────────────────────────────────────────────────────

const makeUsage = (overrides: Partial<UsageRecord> = {}): UsageRecord => ({
  userId: 'uid-test',
  date: new Date().toISOString().split('T')[0],
  count: 0,
  fileCount: 0,
  plan: 'free',
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const setupStore = (usageOverrides: Partial<UsageRecord> = {}) => {
  (useUsageStore as unknown as jest.Mock).mockReturnValue({
    usage: makeUsage(usageOverrides),
    isLoading: false,
    consumeRequest: mockConsumeRequest,
    consumeFileRequest: mockConsumeFileRequest,
  });
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockLanguage = 'fr';
  setupStore();
});

// ─── getRemainingText ─────────────────────────────────────────────────────────

describe('getRemainingText', () => {
  it('FR — affiche le bon texte avec count=0', () => {
    setupStore({ count: 0, plan: 'free' });
    const { result } = renderHook(() => useAIRequest());
    expect(result.current.getRemainingText()).toBe(
      `${LIMITS.free} requêtes restantes aujourd'hui`
    );
  });

  it('FR — affiche singulier quand remaining=1', () => {
    setupStore({ count: LIMITS.free - 1, plan: 'free' });
    const { result } = renderHook(() => useAIRequest());
    expect(result.current.getRemainingText()).toBe(
      `1 requête restante aujourd'hui`
    );
  });

  it('EN — affiche le bon texte', () => {
    mockLanguage = 'en';
    setupStore({ count: 0, plan: 'free' });
    const { result } = renderHook(() => useAIRequest());
    expect(result.current.getRemainingText()).toBe(
      `${LIMITS.free} requests left today`
    );
  });

  it('EN — singulier quand remaining=1', () => {
    mockLanguage = 'en';
    setupStore({ count: LIMITS.free - 1, plan: 'free' });
    const { result } = renderHook(() => useAIRequest());
    expect(result.current.getRemainingText()).toBe('1 request left today');
  });

  it('AR — affiche le bon texte', () => {
    mockLanguage = 'ar';
    setupStore({ count: 0, plan: 'free' });
    const { result } = renderHook(() => useAIRequest());
    expect(result.current.getRemainingText()).toBe(
      `${LIMITS.free} طلب متبقي اليوم`
    );
  });

  it('retourne "" si usage est null', () => {
    (useUsageStore as unknown as jest.Mock).mockReturnValue({
      usage: null,
      isLoading: false,
      consumeRequest: mockConsumeRequest,
      consumeFileRequest: mockConsumeFileRequest,
    });
    const { result } = renderHook(() => useAIRequest());
    expect(result.current.getRemainingText()).toBe('');
  });

  it('premium — affiche la bonne limite', () => {
    setupStore({ count: 10, plan: 'premium' });
    const { result } = renderHook(() => useAIRequest());
    expect(result.current.getRemainingText()).toContain(
      `${LIMITS.premium - 10}`
    );
  });
});

// ─── checkAndConsume ──────────────────────────────────────────────────────────

describe('checkAndConsume', () => {
  it('retourne true si consumeRequest réussit', async () => {
    mockConsumeRequest.mockResolvedValue(true);
    const { result } = renderHook(() => useAIRequest());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.checkAndConsume(); });
    expect(ok).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('retourne false et affiche Alert FR si consumeRequest échoue', async () => {
    mockConsumeRequest.mockResolvedValue(false);
    const { result } = renderHook(() => useAIRequest());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.checkAndConsume(); });
    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Limite journalière atteinte',
      expect.stringContaining('Plan gratuit')
    );
  });

  it('retourne false et affiche Alert EN si consumeRequest échoue', async () => {
    mockLanguage = 'en';
    mockConsumeRequest.mockResolvedValue(false);
    const { result } = renderHook(() => useAIRequest());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.checkAndConsume(); });
    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Daily limit reached',
      expect.stringContaining('Free plan')
    );
  });

  it('retourne false et affiche Alert AR si consumeRequest échoue', async () => {
    mockLanguage = 'ar';
    mockConsumeRequest.mockResolvedValue(false);
    const { result } = renderHook(() => useAIRequest());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.checkAndConsume(); });
    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'تم الوصول إلى الحد اليومي',
      expect.stringContaining('طلبات')
    );
  });
});

// ─── checkAndConsumeFile ──────────────────────────────────────────────────────

describe('checkAndConsumeFile', () => {
  it('retourne true si consumeFileRequest réussit', async () => {
    mockConsumeFileRequest.mockResolvedValue(true);
    const { result } = renderHook(() => useAIRequest());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.checkAndConsumeFile(); });
    expect(ok).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('retourne false et affiche Alert FR si consumeFileRequest échoue', async () => {
    mockConsumeFileRequest.mockResolvedValue(false);
    const { result } = renderHook(() => useAIRequest());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.checkAndConsumeFile(); });
    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Limite de fichiers atteinte',
      expect.stringContaining('Plan gratuit')
    );
  });

  it('retourne false et affiche Alert EN si consumeFileRequest échoue', async () => {
    mockLanguage = 'en';
    mockConsumeFileRequest.mockResolvedValue(false);
    const { result } = renderHook(() => useAIRequest());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.checkAndConsumeFile(); });
    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Daily file limit reached',
      expect.stringContaining('Free plan')
    );
  });

  it('retourne false et affiche Alert AR si consumeFileRequest échoue', async () => {
    mockLanguage = 'ar';
    mockConsumeFileRequest.mockResolvedValue(false);
    const { result } = renderHook(() => useAIRequest());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.checkAndConsumeFile(); });
    expect(ok).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'تم الوصول إلى حد الملفات اليومي',
      expect.stringContaining('ملف')
    );
  });

  it('premium — message mentionne la limite premium', async () => {
    mockConsumeFileRequest.mockResolvedValue(false);
    setupStore({ plan: 'premium' });
    const { result } = renderHook(() => useAIRequest());
    await act(async () => { await result.current.checkAndConsumeFile(); });
    expect(Alert.alert).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining(`${FILE_LIMITS.premium}`)
    );
  });
});