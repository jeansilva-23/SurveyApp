import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { HomeScreen } from '../screens/home/HomeScreen';
import { SurveyListScreen } from '../screens/surveys/management/SurveyListScreen';
import { SurveyDetailScreen } from '../screens/surveys/management/SurveyDetailScreen';
import { CreateSurveyScreen } from '../screens/surveys/creation/CreateSurveyScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { useTheme } from '../theme';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

export type MainTabParamList = {
  Home: undefined;
  SurveysTab: NavigatorScreenParams<SurveysStackParamList> | undefined;
  CreateSurvey: { surveyId?: string };
  Reports: { surveyId?: string };
};

export type SurveysStackParamList = {
  SurveyList: undefined;
  SurveyDetail: { id: string; openShare?: boolean };
  CreateSurvey: { surveyId?: string };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const SurveysStack = createStackNavigator<SurveysStackParamList>();

const SurveysStackNavigator: React.FC = () => {
  const { c } = useTheme();
  return (
    <SurveysStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.primary },
        headerTintColor: '#EAF3EE',
        headerTitleStyle: { ...typography.h3, color: '#EAF3EE' },
      }}
    >
      <SurveysStack.Screen name="SurveyList" component={SurveyListScreen} options={{ title: 'Pesquisas' }} />
      <SurveysStack.Screen 
        name="SurveyDetail" 
        component={SurveyDetailScreen} 
        options={({ navigation }) => ({ 
          title: 'Detalhes',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}>
              <Text style={[typography.bodyBold, { color: '#EAF3EE' }]}>{'< Voltar'}</Text>
            </TouchableOpacity>
          )
        })} 
      />
      <SurveysStack.Screen 
        name="CreateSurvey" 
        component={CreateSurveyScreen} 
        options={({ navigation }) => ({ 
          title: 'Criar Pesquisa',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}>
              <Text style={[typography.bodyBold, { color: '#EAF3EE' }]}>{'< Voltar'}</Text>
            </TouchableOpacity>
          )
        })} 
      />
    </SurveysStack.Navigator>
  );
};

type TabIconProps = { label: string; emoji: string; focused: boolean };

const TabIcon: React.FC<TabIconProps> = ({ label, emoji, focused }) => {
  const { c } = useTheme();
  return (
    <View style={styles.tabIcon}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
      <Text style={[typography.labelSmall, { color: focused ? c.tabBarActive : c.tabBarInactive, marginTop: 2, textAlign: 'center' }]}>
        {label}
      </Text>
    </View>
  );
};

export const MainNavigator: React.FC = () => {
  const { c } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.tabBarBg,
          borderTopColor: c.border,
          height: 64,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Início" emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SurveysTab"
        component={SurveysStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Pesquisas" emoji="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CreateSurvey"
        component={CreateSurveyScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Criar" emoji="➕" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Relatórios" emoji="📊" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIcon: { width: 85, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  createTabBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
