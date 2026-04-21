import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY_INDEX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

const TASKS = [
  {
    id: "1",
    title: "Review Chapter 5 – Calculus",
    subject: "Mathematics",
    time: "09:00 AM",
    duration: "45 min",
    color: "#6366f1",
    done: true,
  },
  {
    id: "2",
    title: "Newton's Laws Practice Problems",
    subject: "Physics",
    time: "11:00 AM",
    duration: "30 min",
    color: "#ec4899",
    done: false,
  },
  {
    id: "3",
    title: "Organic Chemistry – Reactions",
    subject: "Chemistry",
    time: "02:00 PM",
    duration: "60 min",
    color: "#10b981",
    done: false,
  },
  {
    id: "4",
    title: "World War II Summary",
    subject: "History",
    time: "04:00 PM",
    duration: "30 min",
    color: "#f59e0b",
    done: false,
  },
];

export const PlanningScreen: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(TODAY_INDEX);
  const [tasks, setTasks] = useState(TASKS);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const completed = tasks.filter((t) => t.done).length;
  const progress = Math.round((completed / tasks.length) * 100);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-white text-2xl font-bold">Planning</Text>
              <Text className="text-slate-400 text-sm mt-1">
                Stay on schedule
              </Text>
            </View>
            <TouchableOpacity className="w-10 h-10 bg-indigo-500 rounded-xl items-center justify-center">
              <Ionicons name="add" size={22} color="white" />
            </TouchableOpacity>
          </View>

          {/* Day Picker */}
          <View className="flex-row gap-2 mb-6">
            {DAYS.map((day, i) => (
              <TouchableOpacity
                key={day}
                onPress={() => setSelectedDay(i)}
                className={`flex-1 items-center py-3 rounded-2xl ${
                  selectedDay === i
                    ? "bg-indigo-500"
                    : i === TODAY_INDEX
                    ? "bg-slate-700 border border-indigo-500/50"
                    : "bg-slate-800"
                }`}
              >
                <Text
                  className={`text-[10px] font-medium mb-1 ${
                    selectedDay === i ? "text-indigo-200" : "text-slate-400"
                  }`}
                >
                  {day}
                </Text>
                <Text
                  className={`text-sm font-bold ${
                    selectedDay === i ? "text-white" : "text-slate-300"
                  }`}
                >
                  {14 + i}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Daily Progress */}
          <Card className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-bold">Today's Progress</Text>
              <Text className="text-indigo-400 font-bold">{progress}%</Text>
            </View>
            <View className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
              <View
                className="h-2 bg-indigo-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-400 text-xs">
                {completed} of {tasks.length} tasks done
              </Text>
              <Text className="text-slate-400 text-xs">
                {tasks.filter((t) => !t.done).length} remaining
              </Text>
            </View>
          </Card>

          {/* AI Suggest */}
          <TouchableOpacity className="mb-6">
            <View className="flex-row items-center gap-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl px-4 py-3">
              <Ionicons name="sparkles" size={20} color="#6366f1" />
              <Text className="text-indigo-300 text-sm font-medium flex-1">
                Let AI optimize your schedule for today
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#6366f1" />
            </View>
          </TouchableOpacity>

          {/* Task List */}
          <Text className="text-white text-lg font-bold mb-4">
            {DAYS[selectedDay]}'s Tasks
          </Text>
          <View className="gap-3">
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                onPress={() => toggleTask(task.id)}
                activeOpacity={0.8}
              >
                <Card
                  className={task.done ? "opacity-60" : ""}
                >
                  <View className="flex-row items-start gap-3">
                    {/* Checkbox */}
                    <TouchableOpacity
                      onPress={() => toggleTask(task.id)}
                      className={`w-6 h-6 rounded-lg border-2 items-center justify-center mt-0.5 ${
                        task.done
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-slate-600"
                      }`}
                    >
                      {task.done && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </TouchableOpacity>

                    <View className="flex-1">
                      <Text
                        className={`font-semibold text-sm ${
                          task.done ? "text-slate-500 line-through" : "text-white"
                        }`}
                      >
                        {task.title}
                      </Text>
                      <View className="flex-row items-center gap-3 mt-2">
                        <View className="flex-row items-center gap-1">
                          <View
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: task.color }}
                          />
                          <Text className="text-slate-400 text-xs">
                            {task.subject}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color="#64748b"
                          />
                          <Text className="text-slate-400 text-xs">
                            {task.time}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Ionicons
                            name="hourglass-outline"
                            size={12}
                            color="#64748b"
                          />
                          <Text className="text-slate-400 text-xs">
                            {task.duration}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
