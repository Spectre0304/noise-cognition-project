import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen   from './screens/HomeScreen';
import TestScreen   from './screens/TestScreen';
import ResultScreen from './screens/ResultScreen';
import { C } from './constants';

const Tab = createBottomTabNavigator();

function Navigation() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: C.navy },
        headerTintColor:  C.white,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor:   C.accent,
        tabBarInactiveTintColor: C.gray,
        tabBarStyle: {
          paddingBottom: insets.bottom + 4,
          height: 56 + insets.bottom,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ title:'首頁', tabBarIcon:() => <Text style={{fontSize:20}}>🏠</Text> }} />
      <Tab.Screen name="Test" component={TestScreen}
        options={{ title:'開始測試', tabBarIcon:() => <Text style={{fontSize:20}}>🧠</Text> }} />
      <Tab.Screen name="Result" component={ResultScreen}
        options={{ title:'我的成果', tabBarIcon:() => <Text style={{fontSize:20}}>📊</Text> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
