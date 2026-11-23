import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { ResponsiveShell } from './src/components/ResponsiveShell';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeDashboardScreen } from './src/screens/HomeDashboardScreen';
import { ExploreHostsScreen } from './src/screens/ExploreHostsScreen';
import { MemberProfileScreen } from './src/screens/MemberProfileScreen';
import { HostingRequestScreen } from './src/screens/HostingRequestScreen';
import { MessagesInboxScreen } from './src/screens/MessagesInboxScreen';
import { TripsScreen } from './src/screens/TripsScreen';
import { ActivitiesScreen } from './src/screens/ActivitiesScreen';
import { CommunityScreen } from './src/screens/CommunityScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme/tokens';

function RootNavigator() {
  const { isAuthenticated, currentScreen } = useApp();

  if (!isAuthenticated || currentScreen === 'auth') {
    return <AuthScreen />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeDashboardScreen />;
      case 'explore':
        return <ExploreHostsScreen />;
      case 'profile':
        return <MemberProfileScreen />;
      case 'request':
        return <HostingRequestScreen />;
      case 'messages':
        return <MessagesInboxScreen />;
      case 'trips':
        return <TripsScreen />;
      case 'activities':
        return <ActivitiesScreen />;
      case 'community':
        return <CommunityScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeDashboardScreen />;
    }
  };

  return <ResponsiveShell>{renderScreen()}</ResponsiveShell>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style="dark" />
        <AppProvider>
          <RootNavigator />
        </AppProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
