// __tests__/useDeleteHistory.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useDeleteHistory, CACHE_KEYS, HistoryType } from '../hooks/useDeleteHistory';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDeleteDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockRemoveItem = jest.fn();

const mockAuth = { currentUser: null as any };
const mockDb = {};

jest.mock('firebase/app', () => ({ getApp: jest.fn() }));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => mockDb),
  collection: jest.fn(),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  doc: jest.fn((db, type, id) => ({ path: `${type}/${id}` })),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  query: jest.fn(),
  where: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  removeItem: (...args: any[]) => mockRemoveItem(...args),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.currentUser = { uid: 'uid-test' };
  mockDeleteDoc.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
});

// ─── CACHE_KEYS ───────────────────────────────────────────────────────────────

describe('CACHE_KEYS', () => {
  it('contient toutes les clés attendues', () => {
    const expected: HistoryType[] = [
      'quizzes', 'flashcards', 'plans',
      'summaries', 'explanations', 'solutions', 'chatSessions',
    ];
    expected.forEach((key) => {
      expect(CACHE_KEYS[key]).toBeDefined();
      expect(CACHE_KEYS[key]).toContain('studyai_');
    });
  });
});

// ─── deleteOne ────────────────────────────────────────────────────────────────

describe('deleteOne', () => {
  it('supprime le doc et appelle onSuccess', async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteHistory());

    await act(async () => {
      await result.current.deleteOne('quizzes', 'doc-123', onSuccess);
    });

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('appelle cacheUpdater si fourni', async () => {
    const onSuccess = jest.fn();
    const cacheUpdater = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteHistory());

    await act(async () => {
      await result.current.deleteOne('summaries', 'doc-456', onSuccess, cacheUpdater);
    });

    expect(cacheUpdater).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('ne fait rien si user non connecté', async () => {
    mockAuth.currentUser = null;
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteHistory());

    await act(async () => {
      await result.current.deleteOne('quizzes', 'doc-123', onSuccess);
    });

    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('affiche Alert si deleteDoc échoue', async () => {
    mockDeleteDoc.mockRejectedValue(new Error('Firestore error'));
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteHistory());

    await act(async () => {
      await result.current.deleteOne('quizzes', 'doc-123', onSuccess);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Erreur',
      'Impossible de supprimer cet élément.'
    );
  });

  it('fonctionne pour tous les types HistoryType', async () => {
    const types: HistoryType[] = [
      'quizzes', 'flashcards', 'plans',
      'summaries', 'explanations', 'solutions', 'chatSessions',
    ];
    const { result } = renderHook(() => useDeleteHistory());

    for (const type of types) {
      const onSuccess = jest.fn();
      await act(async () => {
        await result.current.deleteOne(type, 'doc-id', onSuccess);
      });
      expect(onSuccess).toHaveBeenCalled();
    }
  });
});

// ─── deleteAll ────────────────────────────────────────────────────────────────

describe('deleteAll', () => {
  it('supprime tous les docs et vide le cache', async () => {
    const fakeDoc = { ref: { path: 'quizzes/doc-1' } };
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [fakeDoc, { ref: { path: 'quizzes/doc-2' } }],
    });

    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteHistory());

    await act(async () => {
      await result.current.deleteAll('quizzes', onSuccess);
    });

    expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
    expect(mockRemoveItem).toHaveBeenCalledWith(
      `${CACHE_KEYS.quizzes}_uid-test`
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('appelle onSuccess même si la collection est vide', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteHistory());

    await act(async () => {
      await result.current.deleteAll('flashcards', onSuccess);
    });

    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('ne fait rien si user non connecté', async () => {
    mockAuth.currentUser = null;
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteHistory());

    await act(async () => {
      await result.current.deleteAll('quizzes', onSuccess);
    });

    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('affiche Alert si getDocs échoue', async () => {
    mockGetDocs.mockRejectedValue(new Error('Firestore error'));
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteHistory());

    await act(async () => {
      await result.current.deleteAll('plans', onSuccess);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Erreur',
      "Impossible de supprimer l'historique."
    );
  });

  it('utilise la bonne clé cache pour chaque type', async () => {
    const types: HistoryType[] = [
      'quizzes', 'flashcards', 'plans',
      'summaries', 'explanations', 'solutions', 'chatSessions',
    ];

    for (const type of types) {
      jest.clearAllMocks();
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ ref: { path: `${type}/doc-1` } }],
      });
      mockDeleteDoc.mockResolvedValue(undefined);
      mockRemoveItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteHistory());
      await act(async () => {
        await result.current.deleteAll(type, jest.fn());
      });

      expect(mockRemoveItem).toHaveBeenCalledWith(
        `${CACHE_KEYS[type]}_uid-test`
      );
    }
  });
});

// ─── confirmDeleteOne ─────────────────────────────────────────────────────────

describe('confirmDeleteOne', () => {
  it('affiche Alert avec titre FR', () => {
    const { result } = renderHook(() => useDeleteHistory());
    result.current.confirmDeleteOne('quizzes', 'doc-1', 'Mon Quiz', 'fr', jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith(
      'Supprimer',
      'Supprimer "Mon Quiz" ?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Annuler' }),
        expect.objectContaining({ text: 'Supprimer', style: 'destructive' }),
      ])
    );
  });

  it('affiche Alert avec titre EN', () => {
    const { result } = renderHook(() => useDeleteHistory());
    result.current.confirmDeleteOne('quizzes', 'doc-1', 'My Quiz', 'en', jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete',
      'Delete "My Quiz"?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ])
    );
  });

  it('affiche Alert avec titre AR', () => {
    const { result } = renderHook(() => useDeleteHistory());
    result.current.confirmDeleteOne('quizzes', 'doc-1', 'اختبار', 'ar', jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith(
      'حذف',
      'حذف "اختبار" ؟',
      expect.arrayContaining([
        expect.objectContaining({ text: 'إلغاء' }),
        expect.objectContaining({ text: 'حذف', style: 'destructive' }),
      ])
    );
  });

  it('appelle deleteOne quand on confirme', async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteHistory());

    result.current.confirmDeleteOne('quizzes', 'doc-1', 'Mon Quiz', 'fr', onSuccess);

    // Simule le clic sur "Supprimer"
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmButton = buttons.find((b: any) => b.style === 'destructive');

    await act(async () => { await confirmButton.onPress(); });

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

// ─── confirmDeleteAll ─────────────────────────────────────────────────────────

describe('confirmDeleteAll', () => {
  it('affiche Alert avec titre FR', () => {
    const { result } = renderHook(() => useDeleteHistory());
    result.current.confirmDeleteAll('quizzes', 'Quiz', 'fr', jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith(
      'Tout supprimer',
      'Supprimer tout l\'historique "Quiz" ?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Annuler' }),
        expect.objectContaining({ text: 'Tout supprimer', style: 'destructive' }),
      ])
    );
  });

  it('affiche Alert avec titre EN', () => {
    const { result } = renderHook(() => useDeleteHistory());
    result.current.confirmDeleteAll('quizzes', 'Quiz', 'en', jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete All',
      'Delete all "Quiz" history?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete All', style: 'destructive' }),
      ])
    );
  });

  it('affiche Alert avec titre AR', () => {
    const { result } = renderHook(() => useDeleteHistory());
    result.current.confirmDeleteAll('quizzes', 'اختبار', 'ar', jest.fn());

    expect(Alert.alert).toHaveBeenCalledWith(
      'حذف الكل',
      'حذف كل سجل "اختبار" ؟',
      expect.arrayContaining([
        expect.objectContaining({ text: 'إلغاء' }),
        expect.objectContaining({ text: 'حذف الكل', style: 'destructive' }),
      ])
    );
  });

  it('appelle deleteAll quand on confirme', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ ref: { path: 'quizzes/doc-1' } }],
    });
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteHistory());

    result.current.confirmDeleteAll('quizzes', 'Quiz', 'fr', onSuccess);

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmButton = buttons.find((b: any) => b.style === 'destructive');

    await act(async () => { await confirmButton.onPress(); });

    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});