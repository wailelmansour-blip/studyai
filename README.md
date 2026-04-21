# StudyAI 📚✨

A scalable AI-powered study app built with **React Native (Expo)**, **React Navigation**, **Zustand**, and **NativeWind**.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React Native + Expo ~52 |
| Navigation | React Navigation 6 |
| State | Zustand 5 |
| Styling | NativeWind 4 (Tailwind CSS) |
| Icons | @expo/vector-icons (Ionicons) |
| Language | TypeScript |

---

## Project Structure

```
StudyAI/
├── App.tsx                  # Entry point
├── global.css               # NativeWind / Tailwind directives
├── tailwind.config.js
├── metro.config.js
├── babel.config.js
└── src/
    ├── components/          # Shared UI components
    │   ├── Button.tsx
    │   ├── Input.tsx
    │   ├── Card.tsx
    │   └── ProgressBar.tsx
    ├── navigation/          # React Navigation stacks & tabs
    │   ├── RootNavigator.tsx
    │   ├── AuthNavigator.tsx
    │   └── MainNavigator.tsx
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.tsx
    │   │   └── SignupScreen.tsx
    │   └── main/
    │       ├── HomeScreen.tsx
    │       ├── StudyScreen.tsx
    │       ├── QuizScreen.tsx
    │       ├── PlanningScreen.tsx
    │       └── ProfileScreen.tsx
    ├── services/
    │   └── aiService.ts     # Mock AI service (swap for real API)
    ├── store/
    │   ├── authStore.ts     # Auth + user state (Zustand)
    │   └── studyStore.ts    # Subjects + sessions state
    └── utils/
        ├── types.ts         # Navigation param types
        └── helpers.ts       # Utility functions
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
cd StudyAI
npm install
```

### 2. Start the development server

```bash
npx expo start
```

### 3. Run on a device / simulator

| Platform | Command |
|----------|---------|
| iOS Simulator | Press `i` in the terminal |
| Android Emulator | Press `a` in the terminal |
| Physical device | Scan QR code with **Expo Go** app |
| Web | Press `w` in the terminal |

---

## 🔑 Test Login

Use **any email/password** on the Login screen (min 6 chars password). The auth is mocked — no backend required.

---

## 📱 Features

- **Auth Stack** – Login & Signup with validation
- **Home** – Greeting, streak banner, quick actions, subject progress
- **Study** – Subject cards with progress, AI assistant prompt
- **Quiz** – Mode selector, score history, stats
- **Planning** – Week calendar, task checklist with completion toggle
- **Profile** – User stats, settings menu, logout

---

## 🔧 Connecting a Real Backend

1. **Auth** → Replace `login` / `signup` in `src/store/authStore.ts`
2. **AI Features** → Replace mock functions in `src/services/aiService.ts`
3. **Data** → Extend `src/store/studyStore.ts` with real API calls

---

## 🎨 Customisation

- **Colors** → Edit `tailwind.config.js` → `theme.extend.colors`
- **Dark/Light mode** → `userInterfaceStyle` in `app.json`
- **Add screens** → Create in `src/screens/`, register in the relevant navigator
