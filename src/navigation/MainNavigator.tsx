import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  HomeScreen,
  StudyScreen,
  QuizScreen,
  PlanningScreen,
  ProfileScreen,
} from "../screens";
import { MainTabParamList } from "../utils/types";

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = keyof typeof Ionicons.glyphMap;

const TAB_CONFIG: Record<
  keyof MainTabParamList,
  { icon: TabIconName; activeIcon: TabIconName; label: string }
> = {
  Home: { icon: "home-outline", activeIcon: "home", label: "Home" },
  Study: { icon: "book-outline", activeIcon: "book", label: "Study" },
  Quiz: { icon: "help-circle-outline", activeIcon: "help-circle", label: "Quiz" },
  Planning: { icon: "calendar-outline", activeIcon: "calendar", label: "Plan" },
  Profile: { icon: "person-outline", activeIcon: "person", label: "Profile" },
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  return (
    <View
      className="bg-slate-900 border-t border-slate-800"
      style={{
        paddingBottom: Platform.OS === "ios" ? 24 : 8,
        paddingTop: 10,
        paddingHorizontal: 8,
        flexDirection: "row",
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const config = TAB_CONFIG[route.name as keyof MainTabParamList];

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center gap-1"
            activeOpacity={0.7}
          >
            <View
              className={`w-12 h-8 rounded-xl items-center justify-center ${
                isFocused ? "bg-indigo-500/20" : ""
              }`}
            >
              <Ionicons
                name={isFocused ? config.activeIcon : config.icon}
                size={22}
                color={isFocused ? "#6366f1" : "#475569"}
              />
            </View>
            <Text
              className={`text-[10px] font-medium ${
                isFocused ? "text-indigo-400" : "text-slate-500"
              }`}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const MainNavigator: React.FC = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Study" component={StudyScreen} />
    <Tab.Screen name="Quiz" component={QuizScreen} />
    <Tab.Screen name="Planning" component={PlanningScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);
