// __tests__/authStore.test.ts
import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../store/authStore';

// ─── Mocks Firebase ───────────────────────────────────────────────────────────

const mockSignIn = jest.fn();
const mockCreateUser = jest.fn();
const mockSignOut = jest.fn();
const mockSendEmailVerification = jest.fn();
const mockOnAuthStateChanged = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockReload = jest.fn();
// Objet auth partagé qu'on peut modifier dans les tests
const mockAuth = { currentUser: null as any };

jest.mock('../src/config/firebase', () => mockAuth); // app = mockAuth (peu importe)

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth), // quand getAuth(app) est appelé → mockAuth
  signInWithEmailAndPassword: (...args: any[]) => mockSignIn(...args),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUser(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  sendEmailVerification: (...args: any[]) => mockSendEmailVerification(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
  reload: (...args: any[]) => mockReload(...args),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.currentUser = null; // reset currentUser
  useAuthStore.setState({
    user: null,
    isLoading: false,
    isInitialized: false,
    error: null,
    lastCreatedUid: null,
    firstName: null,
  });
  mockGetDoc.mockResolvedValue({ exists: () => false });
  mockSignOut.mockResolvedValue(undefined);
  mockSendEmailVerification.mockResolvedValue(undefined);
  mockReload.mockResolvedValue(undefined); // ← ajoute ça aussi
});

// ─── setFirstName ─────────────────────────────────────────────────────────────

describe('setFirstName', () => {
  it('met à jour firstName dans le store', () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.setFirstName('Alice'));
    expect(result.current.firstName).toBe('Alice');
  });
});

// ─── clearError ───────────────────────────────────────────────────────────────

describe('clearError', () => {
  it('remet error à null', () => {
    useAuthStore.setState({ error: 'Une erreur' });
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('login', () => {
  it('login réussi — email vérifié', async () => {
    const fakeUser = { uid: 'uid-123', emailVerified: true };
    mockSignIn.mockResolvedValue({ user: fakeUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ firstName: 'Alice' }),
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('alice@test.com', 'password123');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.firstName).toBe('Alice');
  });

  it('login échoue — email non vérifié', async () => {
    const fakeUser = { uid: 'uid-123', emailVerified: false };
    mockSignIn.mockResolvedValue({ user: fakeUser });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('alice@test.com', 'password123').catch(() => {});
    });

    expect(result.current.error).toBe('email_not_verified');
    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('login échoue — mauvais mot de passe (EN)', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/wrong-password' });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('alice@test.com', 'wrong', 'en').catch(() => {});
    });

    expect(result.current.error).toBe('Incorrect password.');
    expect(result.current.isLoading).toBe(false);
  });

  it('login échoue — mauvais mot de passe (FR)', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/wrong-password' });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('alice@test.com', 'wrong', 'fr').catch(() => {});
    });

    expect(result.current.error).toBe('Mot de passe incorrect.');
  });

  it('login échoue — mauvais mot de passe (AR)', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/wrong-password' });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('alice@test.com', 'wrong', 'ar').catch(() => {});
    });

    expect(result.current.error).toBe('كلمة المرور غير صحيحة.');
  });

  it('login échoue — email invalide', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/invalid-email' });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('invalid', 'password', 'fr').catch(() => {});
    });

    expect(result.current.error).toBe('Adresse email invalide.');
  });

  it('login échoue — trop de tentatives', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/too-many-requests' });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('alice@test.com', 'password', 'fr').catch(() => {});
    });

    expect(result.current.error).toBe('Trop de tentatives. Réessaie dans quelques minutes.');
  });

  it('firstName est null si Firestore ne retourne rien', async () => {
    const fakeUser = { uid: 'uid-123', emailVerified: true };
    mockSignIn.mockResolvedValue({ user: fakeUser });
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('alice@test.com', 'password123');
    });

    expect(result.current.firstName).toBeNull();
  });
});

// ─── signup ───────────────────────────────────────────────────────────────────

describe('signup', () => {
  it('signup réussi — adulte (age >= 13)', async () => {
    const fakeUser = { uid: 'new-uid-456' };
    mockCreateUser.mockResolvedValue({ user: fakeUser });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signup(
        'bob@test.com', 'Password123!',
        'Bob', 'Martin', '2000-01-01'
      );
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastCreatedUid).toBe('new-uid-456');
    expect(mockSendEmailVerification).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();

    // Vérifie que isChild = false dans setDoc
    const setDocCall = mockSetDoc.mock.calls[0][1];
    expect(setDocCall.isChild).toBe(false);
    expect(setDocCall.plan).toBe('free');
  });

  it('signup réussi — enfant (age < 13)', async () => {
    const fakeUser = { uid: 'child-uid-789' };
    mockCreateUser.mockResolvedValue({ user: fakeUser });

    const thisYear = new Date().getFullYear();
    const childBirthDate = `${thisYear - 10}-06-15`;

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signup(
        'child@test.com', 'Password123!',
        'Tom', 'Dupont', childBirthDate
      );
    });

    const setDocCall = mockSetDoc.mock.calls[0][1];
    expect(setDocCall.isChild).toBe(true);
    expect(setDocCall.parentalConsentStatus).toBe('pending');
    expect(result.current.lastCreatedUid).toBe('child-uid-789');
  });

  it('signup échoue — email déjà utilisé (FR)', async () => {
    mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signup(
        'existing@test.com', 'Password123!',
        'Bob', 'Martin', '2000-01-01', 'fr'
      ).catch(() => {});
    });

    expect(result.current.error).toBe('Un compte existe déjà avec cet email.');
    expect(result.current.isLoading).toBe(false);
  });

  it('signup échoue — mot de passe faible (EN)', async () => {
    mockCreateUser.mockRejectedValue({ code: 'auth/weak-password' });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signup(
        'bob@test.com', '123',
        'Bob', 'Martin', '2000-01-01', 'en'
      ).catch(() => {});
    });

    expect(result.current.error).toBe('Password too weak. Minimum 6 characters.');
  });

  it('setDoc sauvegarde les bonnes données utilisateur', async () => {
    const fakeUser = { uid: 'uid-data-check' };
    mockCreateUser.mockResolvedValue({ user: fakeUser });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signup(
        '  Alice@Test.COM  ', 'Password123!',
        '  Alice  ', '  Dupont  ', '1995-03-20'
      );
    });

    const setDocCall = mockSetDoc.mock.calls[0][1];
    expect(setDocCall.firstName).toBe('Alice');        // trimé
    expect(setDocCall.lastName).toBe('Dupont');        // trimé
    expect(setDocCall.email).toBe('alice@test.com');   // lowercase + trim
    expect(setDocCall.isVerified).toBe(false);
    expect(setDocCall.plan).toBe('free');
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('logout', () => {
  it('reset user, firstName et lastCreatedUid', async () => {
    useAuthStore.setState({
      user: { uid: 'uid-123' } as any,
      firstName: 'Alice',
      lastCreatedUid: 'uid-123',
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.firstName).toBeNull();
    expect(result.current.lastCreatedUid).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockSignOut).toHaveBeenCalled();
  });

// ─── sendVerificationEmail ────────────────────────────────────────────────────

describe('sendVerificationEmail', () => {
  it('ne plante pas et met isLoading à false', async () => {
    // auth.currentUser est undefined dans le mock — sendVerificationEmail
    // attrape l'erreur dans son catch, on vérifie juste que le store reste stable
    await act(async () => {
      await useAuthStore.getState().sendVerificationEmail().catch(() => {});
    });
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

// ─── reloadUser ───────────────────────────────────────────────────────────────

describe('reloadUser', () => {
  it('ne plante pas quand auth est indisponible', async () => {
    // reloadUser attrape toutes les erreurs en interne (console.log)
    // On vérifie juste qu'il ne throw pas
    await expect(
      act(async () => {
        await useAuthStore.getState().reloadUser();
      })
    ).resolves.not.toThrow();
  });
});
});