import { act, renderHook } from '@testing-library/react-native';
import { useUsageStore } from '../store/usageStore';
import { UsageRecord } from '../types/usage';

// Mock Firebase complet
jest.mock('firebase/app', () => ({ getApp: jest.fn() }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: { uid: 'test-uid' } })),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn((n) => n),
}));

// Helper pour construire un UsageRecord de test
const makeUsage = (overrides: Partial<UsageRecord> = {}): UsageRecord => ({
  userId: 'test-uid',
  date: new Date().toISOString().split('T')[0],
  count: 0,
  fileCount: 0,
  plan: 'free',
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Mock loadUsage pour éviter les appels Firebase réels
beforeEach(() => {
  useUsageStore.setState({ usage: null, isLoading: false });

  jest.spyOn(useUsageStore.getState(), 'loadUsage').mockResolvedValue();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── canMakeRequest ───────────────────────────────────────────────────────────

describe('canMakeRequest', () => {
  it('retourne false si usage est null', () => {
    useUsageStore.setState({ usage: null });
    const { result } = renderHook(() => useUsageStore());
    expect(result.current.canMakeRequest()).toBe(false);
  });

  it('retourne true si count < limite free (5)', () => {
    useUsageStore.setState({ usage: makeUsage({ count: 4, plan: 'free' }) });
    const { result } = renderHook(() => useUsageStore());
    expect(result.current.canMakeRequest()).toBe(true);
  });

  it('retourne false si count >= limite free (5)', () => {
    useUsageStore.setState({ usage: makeUsage({ count: 5, plan: 'free' }) });
    const { result } = renderHook(() => useUsageStore());
    expect(result.current.canMakeRequest()).toBe(false);
  });

  it('retourne true si count < limite premium (50)', () => {
    useUsageStore.setState({ usage: makeUsage({ count: 49, plan: 'premium' }) });
    const { result } = renderHook(() => useUsageStore());
    expect(result.current.canMakeRequest()).toBe(true);
  });

  it('retourne false si count >= limite premium (50)', () => {
    useUsageStore.setState({ usage: makeUsage({ count: 50, plan: 'premium' }) });
    const { result } = renderHook(() => useUsageStore());
    expect(result.current.canMakeRequest()).toBe(false);
  });
});

// ─── canMakeFileRequest ───────────────────────────────────────────────────────

describe('canMakeFileRequest', () => {
  it('retourne false si usage est null', () => {
    useUsageStore.setState({ usage: null });
    const { result } = renderHook(() => useUsageStore());
    expect(result.current.canMakeFileRequest()).toBe(false);
  });

  it('retourne true si fileCount < limite free (1)', () => {
    useUsageStore.setState({ usage: makeUsage({ fileCount: 0, plan: 'free' }) });
    const { result } = renderHook(() => useUsageStore());
    expect(result.current.canMakeFileRequest()).toBe(true);
  });

  it('retourne false si fileCount >= limite free (1)', () => {
    useUsageStore.setState({ usage: makeUsage({ fileCount: 1, plan: 'free' }) });
    const { result } = renderHook(() => useUsageStore());
    expect(result.current.canMakeFileRequest()).toBe(false);
  });

  it('retourne true si fileCount < limite premium (10)', () => {
    useUsageStore.setState({ usage: makeUsage({ fileCount: 9, plan: 'premium' }) });
    const { result } = renderHook(() => useUsageStore());
    expect(result.current.canMakeFileRequest()).toBe(true);
  });

  it('retourne false si fileCount >= limite premium (10)', () => {
    useUsageStore.setState({ usage: makeUsage({ fileCount: 10, plan: 'premium' }) });
    const { result } = renderHook(() => useUsageStore());
    expect(result.current.canMakeFileRequest()).toBe(false);
  });
});

// ─── consumeRequest ───────────────────────────────────────────────────────────

describe('consumeRequest', () => {
  it('retourne false si usage est null après loadUsage', async () => {
    useUsageStore.setState({ usage: null });
    const { result } = renderHook(() => useUsageStore());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.consumeRequest(); });
    expect(ok).toBe(false);
  });

  it('retourne false si count >= limite free', async () => {
    useUsageStore.setState({ usage: makeUsage({ count: 5, plan: 'free' }) });
    const { result } = renderHook(() => useUsageStore());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.consumeRequest(); });
    expect(ok).toBe(false);
    expect(result.current.usage?.count).toBe(5); // pas incrémenté
  });

  it('incrémente count et retourne true si sous la limite', async () => {
    useUsageStore.setState({ usage: makeUsage({ count: 3, plan: 'free' }) });
    const { result } = renderHook(() => useUsageStore());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.consumeRequest(); });
    expect(ok).toBe(true);
    expect(result.current.usage?.count).toBe(4);
  });

  it('retourne false si count >= limite premium (50)', async () => {
    useUsageStore.setState({ usage: makeUsage({ count: 50, plan: 'premium' }) });
    const { result } = renderHook(() => useUsageStore());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.consumeRequest(); });
    expect(ok).toBe(false);
  });
});

// ─── consumeFileRequest ───────────────────────────────────────────────────────

describe('consumeFileRequest', () => {
  it('retourne false si usage est null après loadUsage', async () => {
    useUsageStore.setState({ usage: null });
    const { result } = renderHook(() => useUsageStore());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.consumeFileRequest(); });
    expect(ok).toBe(false);
  });

  it('retourne false si fileCount >= limite free (1)', async () => {
    useUsageStore.setState({ usage: makeUsage({ fileCount: 1, plan: 'free' }) });
    const { result } = renderHook(() => useUsageStore());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.consumeFileRequest(); });
    expect(ok).toBe(false);
    expect(result.current.usage?.fileCount).toBe(1); // pas incrémenté
  });

  it('incrémente fileCount et retourne true si sous la limite', async () => {
    useUsageStore.setState({ usage: makeUsage({ fileCount: 0, plan: 'free' }) });
    const { result } = renderHook(() => useUsageStore());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.consumeFileRequest(); });
    expect(ok).toBe(true);
    expect(result.current.usage?.fileCount).toBe(1);
  });

  it('premium : autorise jusqu\'à 10 fichiers', async () => {
    useUsageStore.setState({ usage: makeUsage({ fileCount: 9, plan: 'premium' }) });
    const { result } = renderHook(() => useUsageStore());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.consumeFileRequest(); });
    expect(ok).toBe(true);
    expect(result.current.usage?.fileCount).toBe(10);
  });
  // ─── upgradeToPremium ─────────────────────────────────────────────────────────

describe('upgradeToPremium', () => {
  it('met à jour le plan à premium dans le store', async () => {
    const { updateDoc, setDoc } = require('firebase/firestore');
    updateDoc.mockResolvedValue(undefined);
    setDoc.mockResolvedValue(undefined);

    useUsageStore.setState({ usage: makeUsage({ plan: 'free' }) });

    await act(async () => {
      await useUsageStore.getState().upgradeToPremium();
    });

    expect(useUsageStore.getState().usage?.plan).toBe('premium');
  });
});

// ─── resetUsageForTest ────────────────────────────────────────────────────────

describe('resetUsageForTest', () => {
  it('remet count et fileCount à 0', async () => {
    useUsageStore.setState({ usage: makeUsage({ count: 5, fileCount: 3 }) });
    const { result } = renderHook(() => useUsageStore());
    await act(async () => {
      await result.current.resetUsageForTest();
    });
    expect(result.current.usage?.count).toBe(0);
    expect(result.current.usage?.fileCount).toBe(0);
  });
});
});