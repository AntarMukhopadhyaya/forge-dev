import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-slate-900">
        Expo + NativeWind + Supabase
      </Text>
      <Text className="mt-3 text-center text-base text-slate-600">
        Add your Supabase URL and anon key in .env, then build your auth flow.
      </Text>
    </View>
  );
}
