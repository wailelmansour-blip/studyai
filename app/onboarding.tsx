// app/onboarding.tsx
import React, { useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Dimensions, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguageStore, LANGUAGES, Language } from "../store/languageStore";
import { useOnboardingStore } from "../store/onboardingStore";
import { useThemeStore } from "../store/themeStore";
import { Colors } from "../constants/colors";

const { width } = Dimensions.get("window");

const getSlides = (lang: string) => [
  {
    icon: "school" as const,
    color: "#6366F1",
    bgLight: "#EEF2FF",
    bgDark: "#1E1B4B",
    title: lang === "ar" ? "مرحباً بك في StudyAI" : lang === "en" ? "Welcome to StudyAI" : "Bienvenue sur StudyAI",
    subtitle: lang === "ar"
      ? "مساعدك الذكي للدراسة — يساعدك على التعلم أسرع وأذكى"
      : lang === "en"
      ? "Your AI study assistant — learn faster and smarter"
      : "Ton assistant IA pour étudier — apprends plus vite et mieux",
  },
  {
    icon: "sparkles" as const,
    color: "#8B5CF6",
    bgLight: "#F5F3FF",
    bgDark: "#1E1245",
    title: lang === "ar" ? "أدوات دراسية ذكية" : lang === "en" ? "Smart Study Tools" : "Outils d'étude intelligents",
    subtitle: lang === "ar"
      ? "بطاقات تعليمية، اختبارات، ملخصات، خطط دراسية — كل ما تحتاجه في مكان واحد"
      : lang === "en"
      ? "Flashcards, quizzes, summaries, study plans — everything you need in one place"
      : "Flashcards, quiz, résumés, plans d'étude — tout ce dont tu as besoin au même endroit",
  },
  {
    icon: "trophy" as const,
    color: "#F59E0B",
    bgLight: "#FFFBEB",
    bgDark: "#2D1B00",
    title: lang === "ar" ? "حقق أهدافك" : lang === "en" ? "Achieve Your Goals" : "Atteins tes objectifs",
    subtitle: lang === "ar"
      ? "سواء كانت امتحانات أو مشاريع أو تعلم جديد — StudyAI معك في كل خطوة"
      : lang === "en"
      ? "Whether it's exams, projects, or new skills — StudyAI is with you every step"
      : "Examens, projets ou nouvelles compétences — StudyAI t'accompagne à chaque étape",
  },
];

export default function OnboardingScreen() {
  const { currentLanguage, setLanguage } = useLanguageStore();
  const { isDark } = useThemeStore();
  const C = isDark ? Colors.dark : Colors.light;
  const isRTL = currentLanguage === "ar";
  const slides = getSlides(currentLanguage);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState<Language>(currentLanguage);
  const scrollRef = useRef<ScrollView>(null);
  const dotAnim = useRef(slides.map(() => new Animated.Value(0))).current;
  const { completeOnboarding } = useOnboardingStore();

  const animateDots = (index: number) => {
    dotAnim.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === index ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  };

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
      animateDots(index);
    }
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      const next = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrentIndex(next);
      animateDots(next);
    }
  };

  const handleStart = async () => {
    await setLanguage(selectedLang);
    await completeOnboarding();
    router.replace("/(auth)/login" as any);
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace("/(auth)/login" as any);
  };

  const currentSlide = slides[currentIndex];
  const isLast = currentIndex === slides.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>

      {/* Bouton Skip */}
      {!isLast && (
        <TouchableOpacity
          onPress={handleSkip}
          style={{
            position: "absolute", top: 56, right: 24, zIndex: 10,
            backgroundColor: isDark ? C.card : "#F3F4F6",
            borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
            borderWidth: isDark ? 1 : 0,
            borderColor: C.border,
          }}
        >
          <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: "600" }}>
            {currentLanguage === "ar" ? "تخطي" : currentLanguage === "en" ? "Skip" : "Passer"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {slides.map((slide, index) => {
          const bg = isDark ? slide.bgDark : slide.bgLight;
          return (
            <View
              key={index}
              style={{
                width, flex: 1, alignItems: "center",
                justifyContent: "center", padding: 32,
              }}
            >
              {/* Icône */}
              <View style={{
                width: 120, height: 120, borderRadius: 32,
                backgroundColor: bg,
                alignItems: "center", justifyContent: "center",
                marginBottom: 40,
                borderWidth: 2,
                borderColor: slide.color + (isDark ? "50" : "30"),
              }}>
                <Ionicons name={slide.icon} size={60} color={slide.color} />
              </View>

              {/* Texte */}
              <Text style={{
                fontSize: 26, fontWeight: "800", color: C.text,
                textAlign: "center", marginBottom: 16, lineHeight: 34,
              }}>
                {slide.title}
              </Text>
              <Text style={{
                fontSize: 15, color: C.textSecondary,
                textAlign: "center", lineHeight: 24, paddingHorizontal: 8,
              }}>
                {slide.subtitle}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Bas de page */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>

        {/* Dots */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 32, gap: 8 }}>
          {slides.map((_, i) => (
            <Animated.View
              key={i}
              style={{
                height: 8, borderRadius: 4,
                backgroundColor: C.primary,
                width: dotAnim[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 24],
                }),
                opacity: dotAnim[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
              }}
            />
          ))}
        </View>

        {/* Sélecteur langue — seulement sur le dernier slide */}
        {isLast && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 14, fontWeight: "600", color: C.text,
              textAlign: "center", marginBottom: 12,
            }}>
              {currentLanguage === "ar" ? "اختر لغتك"
                : currentLanguage === "en" ? "Choose your language"
                : "Choisis ta langue"}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => setSelectedLang(lang.code)}
                  style={{
                    flex: 1, borderRadius: 12, padding: 12, alignItems: "center",
                    backgroundColor: selectedLang === lang.code
                      ? C.primaryLight
                      : C.card,
                    borderWidth: 1.5,
                    borderColor: selectedLang === lang.code
                      ? C.primary
                      : C.borderMedium,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{lang.flag}</Text>
                  <Text style={{
                    fontSize: 12, fontWeight: "600", marginTop: 4,
                    color: selectedLang === lang.code ? C.primary : C.text,
                  }}>
                    {lang.nativeLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Bouton principal */}
        <TouchableOpacity
          onPress={isLast ? handleStart : goToNext}
          style={{
            backgroundColor: C.primary,
            borderRadius: 14, padding: 16, alignItems: "center",
            flexDirection: isRTL ? "row-reverse" : "row",
            justifyContent: "center", gap: 8, elevation: 4,
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
            {isLast
              ? currentLanguage === "ar" ? "ابدأ الآن" : currentLanguage === "en" ? "Get Started" : "Commencer"
              : currentLanguage === "ar" ? "التالي" : currentLanguage === "en" ? "Next" : "Suivant"
            }
          </Text>
          {!isLast && (
            <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}