import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { PublicSurveyScreen } from '../screens/respond/PublicSurveyScreen';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  PublicSurvey: { slug: string };
};

const Stack = createStackNavigator<RootStackParamList>();

// Deep link configuration for Expo Web + mobile
const linking = {
  prefixes: ['surveyapp://', process.env.EXPO_PUBLIC_APP_URL || 'https://survey-app-vwhs-psi.vercel.app', 'http://localhost:8081'],
  config: {
    screens: {
      Main: {
        path: '',
        screens: {
          Home: '',
          SurveysTab: {
            path: 'surveys',
            screens: {
              SurveyList: '',
              SurveyDetail: 'details/:id',
              CreateSurvey: 'new',
            },
          },
          CreateSurvey: 'create',
          Reports: 'reports',
        },
      },
      Auth: {
        path: 'auth',
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
      // Rota pública — slug deve ser uma string válida (não 'undefined')
      PublicSurvey: {
        path: 'survey/:slug',
        parse: {
          slug: (slug: string) => (slug === 'undefined' ? '' : slug),
        },
      },
    },
  },
};

export const RootNavigator: React.FC = () => {
  const { c } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary }}>
        <ActivityIndicator size="large" color="#EAF3EE" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking as any}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isAuthenticated ? 'Main' : 'Auth'}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
        {/* Rota pública de resposta a pesquisa — disponível sempre */}
        <Stack.Screen name="PublicSurvey" component={PublicSurveyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
