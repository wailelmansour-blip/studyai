import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Page() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <Text style={styles.title}>wail</Text>
        <Text style={styles.subtitle}>This is the first page of your app.</Text>

        {/* Bouton temporaire pour tester le résumé IA */}
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push("/summary")}
        >
          <Text style={styles.buttonText}>Tester le résumé IA</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 24,
  },
  main: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 960,
    marginHorizontal: "auto",
  },
  title: {
    fontSize: 64,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 36,
    color: "#38434D",
  },
  button: {
    marginTop: 30,
    backgroundColor: "#6C63FF",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});