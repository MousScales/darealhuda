import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { View, AppState, Linking, Platform } from 'react-native';
import { getResponsiveIconSize, getResponsiveContainerSize, getResponsiveSpacing, isTablet, getTabletPadding } from './utils/responsiveSizing';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './firebase'; // Initialize Firebase
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import newNotificationService from './services/newNotificationService';
import { LanguageProvider } from './utils/LanguageContext';
import userStateService from './services/userStateService';
import { ExtensionStorage } from '@bacons/apple-targets';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import appleSubscriptionService from './services/appleSubscriptionService';
import subscriptionGuard from './services/subscriptionGuard';
import * as InAppPurchases from 'expo-in-app-purchases';

import expoPushService from './services/expoPushService';
import prayerBlockerService from './services/prayerBlockerService';

// Background notification task name
const PRAYER_BLOCKER_TASK = 'PRAYER_BLOCKER_BACKGROUND_TASK';

// Define background task handler for prayer blocker notifications
TaskManager.defineTask(PRAYER_BLOCKER_TASK, async ({ data, error, executionInfo }) => {
  console.log('🔄 Background task triggered:', executionInfo);
  
  if (error) {
    console.error('❌ Background task error:', error);
    return;
  }
  
  try {
    const notification = data?.notification;
    const notificationData = notification?.request?.content?.data;
    
    console.log('📬 Background notification received:', notificationData);
    
    if (notificationData?.type === 'PRAYER_BLOCKER_ACTIVATE') {
      console.log('🔒 Prayer blocker activation requested in background');
      
      // Check if prayer blocker is enabled
      const isEnabled = await AsyncStorage.getItem('prayerBlockerEnabled');
      if (isEnabled !== 'true') {
        console.log('⚠️ Prayer blocker disabled, skipping');
        return;
      }
      
      // Store blocking info
      const storage = new ExtensionStorage('group.com.digaifounder.huda');
      const blockingInfo = {
        prayerId: notificationData.prayerId,
        startTime: new Date(notificationData.prayerTime).getTime(),
        isActive: true,
        unlockOnCompletion: true
      };
      storage.set('currentPrayerBlocking', JSON.stringify(blockingInfo));
      console.log('💾 Blocking info stored:', blockingInfo);
      
      // Activate blocking immediately
      if (Platform.OS === 'ios') {
        const { NativeModules } = require('react-native');
        await NativeModules.PrayerBlockerModule.activateBlockingNow();
        console.log('✅ Prayer blocker activated in background');
      }
    }
  } catch (error) {
    console.error('❌ Error in background task:', error);
  }
});

import HomeScreen from './screens/HomeScreen';
import LessonsScreen from './screens/LessonsScreen';
import LessonDetailScreen from './screens/LessonDetailScreen';
import BookScreen from './screens/BookScreen';
import GuidedPrayerScreen from './screens/GuidedPrayerScreen';
import QuranScreen from './screens/QuranScreen';
import BookmarksScreen from './screens/BookmarksScreen';
import DuaScreen from './screens/DuaScreen';
import DuaBoardScreen from './screens/DuaBoardScreen';
import DhikrScreen from './screens/DhikrScreen';
import TasbihScreen from './screens/TasbihScreen';
import HadithScreen from './screens/HadithScreen';
import HadithBookCatalogScreen from './screens/HadithBookCatalogScreen';
import PrayerScreen from './screens/PrayerScreen';
import WuduScreen from './screens/WuduScreen';
import CleanSpotScreen from './screens/CleanSpotScreen';
import DressingScreen from './screens/DressingScreen';
import QiblaScreen from './screens/QiblaScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import TestNotificationsScreen from './screens/TestNotificationsScreen';
import PromotionalSubscriptionScreen from './screens/PromotionalSubscriptionScreen';

import OnboardingScreen from './screens/OnboardingScreen';
import GhuslScreen from './screens/GhuslScreen';
import HajjScreen from './screens/HajjScreen';
import UmrahScreen from './screens/UmrahScreen';
import NamesOfAllahScreen from './screens/NamesOfAllahScreen';
import FullOnboardingScreen from './screens/FullOnboardingScreen';
import MosqueFinderScreen from './screens/MosqueFinderScreen';
import HalalFoodFinderScreen from './screens/HalalFoodFinderScreen';
import VideoLoadingScreen from './components/VideoLoadingScreen';
// Removed SubscriptionScreen import - app is now free
// import SubscriptionScreen from './screens/SubscriptionScreen';

import SimpleQuranViewer from './screens/SimpleQuranViewer';
import RecordingScreen from './screens/RecordingScreen';
import SurahSelectionScreen from './screens/SurahSelectionScreen';
import VerseSelectionScreen from './screens/VerseSelectionScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const HomeStack = createStackNavigator();
const BookStack = createStackNavigator();
const PrayerStack = createStackNavigator();
const ProfileStack = createStackNavigator();

function HomeStackNavigator({ onSubscriptionExpired }) {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain">
        {(props) => <HomeScreen {...props} onSubscriptionExpired={onSubscriptionExpired} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="LessonsScreen" component={LessonsScreen} />
      <HomeStack.Screen name="LessonDetail" component={LessonDetailScreen} />
      <HomeStack.Screen name="TasbihScreen" component={TasbihScreen} />
      <HomeStack.Screen name="QiblaScreen" component={QiblaScreen} />
      <HomeStack.Screen name="DuaBoardScreen" component={DuaBoardScreen} />
      <HomeStack.Screen name="SimpleQuranViewer" component={SimpleQuranViewer} />
      <HomeStack.Screen name="MosqueFinderScreen" component={MosqueFinderScreen} />
      <HomeStack.Screen name="HalalFoodFinderScreen" component={HalalFoodFinderScreen} />
    </HomeStack.Navigator>
  );
}

function BookStackNavigator() {
  return (
    <BookStack.Navigator screenOptions={{ headerShown: false }}>
      <BookStack.Screen name="BookMain" component={BookScreen} />
      <BookStack.Screen name="Quran" component={QuranScreen} />
      <BookStack.Screen name="RecordingScreen" component={RecordingScreen} />
      <BookStack.Screen name="SurahSelectionScreen" component={SurahSelectionScreen} />
      <BookStack.Screen name="VerseSelectionScreen" component={VerseSelectionScreen} />
      <BookStack.Screen name="Bookmarks" component={BookmarksScreen} />
      <BookStack.Screen name="Dua" component={DuaScreen} />
      <BookStack.Screen name="Dhikr" component={DhikrScreen} />
      <BookStack.Screen name="Hadith" component={HadithScreen} />
      <BookStack.Screen name="HadithBookCatalogScreen" component={HadithBookCatalogScreen} />
    </BookStack.Navigator>
  );
}

function PrayerStackNavigator() {
  return (
    <PrayerStack.Navigator screenOptions={{ headerShown: false }}>
      <PrayerStack.Screen name="PrayerMain" component={PrayerScreen} />
      <PrayerStack.Screen name="WuduScreen" component={WuduScreen} />
      <PrayerStack.Screen name="CleanSpotScreen" component={CleanSpotScreen} />
      <PrayerStack.Screen name="DressingScreen" component={DressingScreen} />
      <PrayerStack.Screen name="QiblaScreen" component={QiblaScreen} />
      <PrayerStack.Screen name="GuidedPrayer" component={GuidedPrayerScreen} />
      <PrayerStack.Screen name="GhuslScreen" component={GhuslScreen} />
      <PrayerStack.Screen name="HajjScreen" component={HajjScreen} />
      <PrayerStack.Screen name="UmrahScreen" component={UmrahScreen} />
      <PrayerStack.Screen name="NamesOfAllahScreen" component={NamesOfAllahScreen} />
    </PrayerStack.Navigator>
  );
}

function ProfileStackNavigator({ onLogout }) {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="SettingsScreen">
        {(props) => <SettingsScreen {...props} onLogout={onLogout} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="TestNotifications" component={TestNotificationsScreen} />
      <ProfileStack.Screen name="PromotionalSubscription" component={PromotionalSubscriptionScreen} />
    </ProfileStack.Navigator>
  );
}

const getMainScreens = (route) => {
  const routeName = getFocusedRouteNameFromRoute(route) ?? 'HomeMain';
  switch (routeName) {
    case 'HomeMain':
    case 'BookMain':
    case 'PrayerMain':
    case 'ProfileMain':
      return 'flex';
    case 'TasbihScreen':
    case 'QiblaScreen':
    case 'LessonsScreen':
    case 'LessonDetail':
    case 'DuaBoardScreen':
    case 'SettingsScreen':
    case 'Bookmarks':
      return 'none';
    default:
      return 'none';
  }
};

const navigationTheme = {
  dark: true,
  colors: {
    primary: '#FFFFFF',
    background: 'transparent',
    card: '#121212',
    text: '#FFFFFF',
    border: '#2A2A2A',
    notification: '#FF453A',
  },
};

function MainTabNavigator({ onLogout, onSubscriptionExpired }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: { 
          display: getMainScreens(route),
          backgroundColor: '#1A1A1A',
          borderRadius: isTablet() ? 35 : 25,
          position: 'absolute',
          bottom: .5,
          left: isTablet() ? 50 : 15,
          right: isTablet() ? 50 : 15,
          height: isTablet() ? 90 : 70,
          paddingBottom: getTabletPadding(12),
          paddingTop: getTabletPadding(12),
          paddingHorizontal: 0,
          borderTopWidth: 0,
          elevation: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Book') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Prayer') {
            iconName = focused ? 'accessibility' : 'accessibility-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return (
            <View style={{
              backgroundColor: 'transparent',
              borderRadius: getResponsiveContainerSize(20),
              width: getResponsiveContainerSize(isTablet() ? 60 : 45),
              height: getResponsiveContainerSize(isTablet() ? 60 : 45),
              alignItems: 'center',
              justifyContent: 'center',
              marginHorizontal: getResponsiveSpacing(isTablet() ? 8 : 5),
            }}>
              <Ionicons 
                name={iconName} 
                size={getResponsiveIconSize(24)} 
                color={focused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} 
              />
            </View>
          );
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: 0,
          paddingHorizontal: 0,
        },
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <HomeStackNavigator {...props} onSubscriptionExpired={onSubscriptionExpired} />}
      </Tab.Screen>
      <Tab.Screen name="Book" component={BookStackNavigator} />
      <Tab.Screen name="Prayer" component={PrayerStackNavigator} />
      <Tab.Screen name="Profile">
        {(props) => <ProfileStackNavigator {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  // Development mode flag - set to true to show subscription screen first
  const isDevelopmentMode = false;
  
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showVideoLoading, setShowVideoLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  // Removed subscription state - app is now free
  // const [isSubscribed, setIsSubscribed] = useState(false);
  // const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  
  // Navigation ref for deep linking
  const navigationRef = useRef(null);


  useEffect(() => {
    const initializeApp = async () => {
      try {
        await checkAuthStatus();
        
        // Set app launch time to prevent immediate notifications
        await AsyncStorage.setItem('appLaunchTime', Date.now().toString());
        
        // Initialize services in order with proper error handling
        console.log('🚀 Initializing app services...');
        
        // Initialize push notifications with retry logic
        const initializePushNotifications = async () => {
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              console.log(`🔄 Attempting to initialize push notifications (attempt ${retryCount + 1}/${maxRetries})`);
              
              // Initialize both services
              await expoPushService.initialize();
              await newNotificationService.initialize();
              
              // Register background notification task for prayer blocker
              if (Platform.OS === 'ios') {
                try {
                  await Notifications.registerTaskAsync(PRAYER_BLOCKER_TASK);
                  console.log('✅ Prayer blocker background task registered');
                } catch (bgError) {
                  console.warn('⚠️ Could not register prayer blocker background task:', bgError);
                }
              }
              
              console.log('✅ Push notifications initialized successfully');
              break;
            } catch (error) {
              retryCount++;
              console.error(`❌ Push notification initialization failed (attempt ${retryCount}):`, error);
              
              if (retryCount < maxRetries) {
                console.log(`⏳ Retrying in ${retryCount * 2} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
              } else {
                console.error('❌ Failed to initialize push notifications after all retries');
              }
            }
          }
        };
        
        await initializePushNotifications();
        
        // Initialize prayer blocker service
        try {
          const prayerBlockerService = require('./services/prayerBlockerService').default;
          await prayerBlockerService.initialize();
          console.log('✅ Prayer blocker service initialized');
        } catch (error) {
          console.error('❌ Failed to initialize prayer blocker service:', error);
        }
        
        // Add a small delay to ensure native modules are properly registered
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reset and re-establish push token on every app open
        try {
          console.log('🔄 Resetting and re-establishing push token on app open...');
          await newNotificationService.resetAndReestablishPushToken();
          console.log('✅ Push token reset and re-established');
        } catch (error) {
          console.error('❌ Error resetting push token:', error);
        }
        
                // Initialize Apple subscription service for purchase handling
        try {
          await appleSubscriptionService.initialize();
          console.log('✅ Apple subscription service initialized');
          
          // Check and save initial subscription status to widget storage
          subscriptionGuard.resetCache();
          const initialSubscriptionStatus = await subscriptionGuard.forceCheckSubscriptionStatus();
          const widgetService = (await import('./services/widgetService')).default;
          widgetService.saveSubscriptionStatus(initialSubscriptionStatus);
          
          // Add listener to save subscription status to widget storage immediately when it changes
          appleSubscriptionService.addListener(async (isSubscribed) => {
            console.log('🔄 Subscription status changed, updating widget storage:', isSubscribed);
            try {
              const widgetService = (await import('./services/widgetService')).default;
              widgetService.saveSubscriptionStatus(isSubscribed);
            } catch (error) {
              console.error('❌ Error saving subscription status to widget storage:', error);
            }
          });
        } catch (error) {
          console.error('❌ Apple subscription service initialization failed:', error);
        }
        
                        // Initialize InAppPurchases first
        const initializeInAppPurchases = async () => {
          try {
            console.log('🎧 Initializing InAppPurchases...');
            await InAppPurchases.connectAsync();
            console.log('✅ InAppPurchases connected successfully');
            
            // Setup global purchase listener that works even when app is backgrounded
            setupGlobalPurchaseListener();
          } catch (error) {
            console.error('❌ Error initializing InAppPurchases:', error);
            console.warn('⚠️ InAppPurchases not available, continuing without purchase listener');
          }
        };
        
        initializeInAppPurchases();
        
        // Setup periodic subscription checking - check frequently for widget updates
        const subscriptionCheckInterval = setInterval(async () => {
          try {
            const isSubscribed = await subscriptionGuard.checkSubscriptionStatus();
            // Save subscription status to widget storage
            const widgetService = (await import('./services/widgetService')).default;
            widgetService.saveSubscriptionStatus(isSubscribed);
          } catch (error) {
            console.error('Periodic subscription check failed:', error);
          }
        }, 30000); // Check every 30 seconds for faster widget updates
        
        // ⏰ CRITICAL: Setup periodic prayer blocker check - runs every minute
        // This ensures blocking activates at prayer time even if Cloud Function notifications don't arrive
        const prayerBlockerCheckInterval = setInterval(async () => {
          try {
            console.log('⏰ Periodic prayer blocker check...');
            
            // Check if prayer blocker is enabled
            const isEnabled = await AsyncStorage.getItem('prayerBlockerEnabled');
            if (isEnabled !== 'true') {
              return; // Skip if blocker is disabled
            }
            
            // Get prayer times from shared storage
            const storage = new ExtensionStorage('group.com.digaifounder.huda');
            const prayerTimesJson = storage.get('prayer_times_widget');
            
            if (!prayerTimesJson) {
              console.log('⚠️ No prayer times found');
              return;
            }
            
            const widgetData = JSON.parse(prayerTimesJson);
            const prayerTimes = widgetData.prayerTimes || [];
            const today = new Date().toISOString().split('T')[0];
            
            // Get prayer completion data
            const prayerDataJson = storage.get('prayerData');
            let prayerData = {};
            if (prayerDataJson) {
              prayerData = typeof prayerDataJson === 'string' ? JSON.parse(prayerDataJson) : prayerDataJson;
            }
            const todayPrayerData = prayerData[today] || {};
            
            // Check if any past prayer is NOT completed
            const now = new Date();
            const fardhPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
            
            for (const prayer of prayerTimes) {
              if (!fardhPrayers.includes(prayer.name) || !prayer.dateObj) continue;
              
              const prayerTime = new Date(prayer.dateObj);
              const prayerId = prayer.name.toLowerCase();
              
              // If prayer time has passed and prayer is NOT completed
              if (prayerTime <= now && !todayPrayerData[prayerId]) {
                console.log(`🔒 Prayer ${prayer.name} time has passed and not completed - activating blocker`);
                
                // Store blocking info
                const blockingInfo = {
                  prayerId,
                  startTime: prayerTime.getTime(),
                  isActive: true,
                  unlockOnCompletion: true
                };
                storage.set('currentPrayerBlocking', JSON.stringify(blockingInfo));
                
                // Activate blocking immediately
                if (Platform.OS === 'ios') {
                  const { NativeModules } = require('react-native');
                  await NativeModules.PrayerBlockerModule.forceSyncUserDefaults();
                  await NativeModules.PrayerBlockerModule.activateBlockingNow();
                  console.log(`✅ Prayer blocker activated for ${prayer.name}`);
                }
                
                // Only block for the first uncompleted past prayer, not all of them
                break;
              }
            }
          } catch (error) {
            console.error('❌ Periodic prayer blocker check failed:', error);
          }
        }, 60000); // Check every 60 seconds (1 minute)
        
        // 🎯 CRITICAL: Setup AppState listener to check immediately when app becomes active
        // This ensures if prayer time passed while user was on another app, it blocks immediately
        const prayerBlockerAppStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
          if (nextAppState === 'active') {
            console.log('📱 App became active - checking if blocker should activate...');
            
            try {
              // Check if prayer blocker is enabled
              const isEnabled = await AsyncStorage.getItem('prayerBlockerEnabled');
              if (isEnabled !== 'true') {
                return;
              }
              
              // Get prayer times and check if blocking is needed
              const storage = new ExtensionStorage('group.com.digaifounder.huda');
              const prayerTimesJson = storage.get('prayer_times_widget');
              
              if (!prayerTimesJson) return;
              
              const widgetData = JSON.parse(prayerTimesJson);
              const prayerTimes = widgetData.prayerTimes || [];
              const today = new Date().toISOString().split('T')[0];
              
              // Get prayer completion data
              const prayerDataJson = storage.get('prayerData');
              let prayerData = {};
              if (prayerDataJson) {
                prayerData = typeof prayerDataJson === 'string' ? JSON.parse(prayerDataJson) : prayerDataJson;
              }
              const todayPrayerData = prayerData[today] || {};
              
              // Check for uncompleted past prayers
              const now = new Date();
              const fardhPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
              
              for (const prayer of prayerTimes) {
                if (!fardhPrayers.includes(prayer.name) || !prayer.dateObj) continue;
                
                const prayerTime = new Date(prayer.dateObj);
                const prayerId = prayer.name.toLowerCase();
                
                // If prayer time has passed and prayer is NOT completed
                if (prayerTime <= now && !todayPrayerData[prayerId]) {
                  console.log(`🔒 App became active: ${prayer.name} needs blocking`);
                  
                  // Store blocking info
                  const blockingInfo = {
                    prayerId,
                    startTime: prayerTime.getTime(),
                    isActive: true,
                    unlockOnCompletion: true
                  };
                  storage.set('currentPrayerBlocking', JSON.stringify(blockingInfo));
                  
                  // Activate blocking immediately
                  if (Platform.OS === 'ios') {
                    const { NativeModules } = require('react-native');
                    await NativeModules.PrayerBlockerModule.forceSyncUserDefaults();
                    await NativeModules.PrayerBlockerModule.activateBlockingNow();
                    console.log(`✅ Blocker activated on app resume for ${prayer.name}`);
                  }
                  
                  break;
                }
              }
            } catch (error) {
              console.error('❌ Error checking blocker on app state change:', error);
            }
          }
        });
        
        // 📬 Setup foreground notification listener for prayer blocker activation
        const notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
          const data = notification.request.content.data;
          
          if (data?.type === 'PRAYER_BLOCKER_ACTIVATE') {
            console.log('📬 Foreground notification: Prayer blocker activation requested');
            
            try {
              // Check if prayer blocker is enabled
              const isEnabled = await AsyncStorage.getItem('prayerBlockerEnabled');
              if (isEnabled !== 'true') {
                console.log('⚠️ Prayer blocker disabled, skipping');
                return;
              }
              
              // Store blocking info
              const storage = new ExtensionStorage('group.com.digaifounder.huda');
              const blockingInfo = {
                prayerId: data.prayerId,
                startTime: new Date(data.prayerTime).getTime(),
                isActive: true,
                unlockOnCompletion: true
              };
              storage.set('currentPrayerBlocking', JSON.stringify(blockingInfo));
              console.log('💾 Blocking info stored from notification:', blockingInfo);
              
              // Activate blocking immediately
              if (Platform.OS === 'ios') {
                const { NativeModules } = require('react-native');
                await NativeModules.PrayerBlockerModule.forceSyncUserDefaults();
                await NativeModules.PrayerBlockerModule.activateBlockingNow();
                console.log('✅ Prayer blocker activated from foreground notification');
              }
            } catch (error) {
              console.error('❌ Error handling foreground notification:', error);
            }
          }
        });
        
        // Setup Firebase auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          console.log('🔥 Firebase auth state changed:', user ? 'User logged in' : 'User logged out');
          if (user) {
            console.log('✅ User UID:', user.uid);
            console.log('✅ User email:', user.email);
            
            // Add a small delay to allow onboarding screens to complete their checks
            setTimeout(async () => {
              setIsLoggedIn(true);
              await AsyncStorage.setItem('userLoggedIn', 'true');
              
              // Ensure push token is grabbed and saved when user logs in
              console.log('🔥 User logged in - ensuring push token is grabbed and saved');
              try {
                // First ensure we have a token
                await newNotificationService.forceRefreshPushToken();
                // Then save it to Firebase
                await newNotificationService.forceSavePushTokenToFirebase();
                console.log('✅ Push token grabbed and saved on login');
              } catch (error) {
                console.error('❌ Error grabbing/saving push token on login:', error);
              }
            }, 200);
            
            // Removed subscription status check - app is now free

          } else {
            console.log('❌ No user logged in - redirecting to onboarding');
            console.log('🔄 Setting isLoggedIn to false...');
            setIsLoggedIn(false);
            // Reset onboarding completion status so user goes through onboarding again
            setHasCompletedOnboarding(false);
            await AsyncStorage.setItem('userLoggedIn', 'false');
            await AsyncStorage.setItem('hasCompletedOnboarding', 'false');
            console.log('✅ User state cleared, should now show onboarding screen');
          }
        });
        
        // Setup app state change listeners (adhan now plays through notifications, not in-app audio)
        const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
          if (nextAppState.match(/inactive|background/)) {
            // App is being backgrounded or closed
            console.log('📱 App backgrounded - adhan now plays through notifications');
            // No need to stop audio since adhan plays through notification system
          } else if (nextAppState === 'active') {
            // App became active - ensure push token is grabbed and saved
            console.log('📱 App became active - ensuring push token is grabbed and saved');
            try {
              // First ensure we have a token
              await newNotificationService.forceRefreshPushToken();
              // Then save it to Firebase
              await newNotificationService.forceSavePushTokenToFirebase();
              console.log('✅ Push token grabbed and saved on app active');
            } catch (error) {
              console.error('❌ Error grabbing/saving push token on app active:', error);
            }
            
            // Check if shield button was pressed (from Shield Action Extension)
            try {
              const storage = new ExtensionStorage('group.com.digaifounder.huda');
              const shieldButtonPressed = storage.get('shieldButtonPressed');
              const shieldButtonPressedTime = storage.get('shieldButtonPressedTime');
              
              if (shieldButtonPressed === true || shieldButtonPressed === 'true') {
                // Check if the button was pressed recently (within last 10 seconds)
                const now = Date.now() / 1000; // Convert to seconds
                const pressedTime = shieldButtonPressedTime ? parseFloat(shieldButtonPressedTime) : 0;
                
                if (now - pressedTime < 10) {
                  console.log('🛡️ Shield button was pressed - navigating to Home screen');
                  
                  // Clear the flag
                  storage.set('shieldButtonPressed', false);
                  storage.set('shieldButtonPressedTime', null);
                  
                  // Navigate to Home screen
                  if (navigationRef.current) {
                    setTimeout(() => {
                      navigationRef.current?.dispatch(
                        CommonActions.navigate({
                          name: 'Home',
                          params: { screen: 'HomeMain' }
                        })
                      );
                    }, 500); // Small delay to ensure navigation is ready
                  }
                }
              }
            } catch (error) {
              console.error('❌ Error checking shield button press:', error);
            }
          }
        });

        return () => {
          unsubscribe();
          appStateSubscription?.remove();
          subscriptionCheckInterval && clearInterval(subscriptionCheckInterval);
          // Cleanup purchase listener
          window.purchaseListenerCleanup?.();
          // Cleanup services when app unmounts
          newNotificationService.cleanup();
          appleSubscriptionService.cleanup();
          expoPushService.cleanup();
        };
        
      } catch (error) {
        console.error('❌ Error during app initialization:', error);
      }
    };
    
    initializeApp();
  }, []);
  
  // Handle deep linking from widgets
  useEffect(() => {
    // Handle initial URL when app opens from widget
    const getInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        handleDeepLink(url);
      }
    };
    
    getInitialURL();
    
    // Listen for URL events when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });
    
    return () => {
      subscription.remove();
    };
  }, [isLoggedIn, hasCompletedOnboarding]);
  
  // Handle deep link navigation
  const handleDeepLink = (url) => {
    try {
      console.log('🔗 Handling deep link:', url);
      
      // Handle prayer screen deep link
      if (url.startsWith('huda://prayer')) {
        if (navigationRef.current) {
          navigationRef.current.dispatch(
            CommonActions.navigate({
              name: 'Prayer',
              params: { screen: 'PrayerMain' }
            })
          );
        }
        return;
      }
      
      // Parse URL: huda://quran?surah=49&ayah=12&surahName=Al-Hujurat&surahNameArabic=الحجرات
      // Or: huda://subscribe?promotional=true
      const parsedUrl = new URL(url);
      
      // Handle subscription deep link
      if (parsedUrl.host === 'subscribe' && navigationRef.current) {
        const params = new URLSearchParams(parsedUrl.search);
        const isPromotional = params.get('promotional') === 'true';
        
        console.log('🎁 Subscription deep link:', { isPromotional });
        
        // Store flag to show promotional modal
        if (isPromotional) {
          AsyncStorage.setItem('showPromotionalNext', 'true').then(() => {
            console.log('✅ Set promotional flag for subscription modal');
            // Navigate to PromotionalSubscription screen
            if (navigationRef.current) {
              navigationRef.current.navigate('Profile', {
                screen: 'PromotionalSubscription',
              });
            }
          });
        } else {
          // Show regular subscription modal
          AsyncStorage.removeItem('showPromotionalNext').then(() => {
            console.log('✅ Set normal subscription modal flag');
            if (navigationRef.current?.getCurrentRoute()?.name !== 'Home') {
              navigationRef.current?.navigate('Home');
            }
          });
        }
        return;
      }
      
      // Handle hadith deep link
      if (parsedUrl.host === 'hadith' && navigationRef.current) {
        const params = new URLSearchParams(parsedUrl.search);
        const title = params.get('title') || '';
        const arabic = params.get('arabic') || '';
        const translation = params.get('translation') || '';
        const reference = params.get('reference') || '';
        const collection = params.get('collection') || '';
        const hadithNumber = params.get('hadithNumber') || '';
        
        console.log('📚 Navigating to Hadith:', {
          title,
          reference,
          collection,
          hadithNumber
        });
        
        setTimeout(() => {
          if (navigationRef.current) {
            // First navigate to Book tab and BookMain to ensure proper stack
            navigationRef.current.dispatch(
              CommonActions.navigate({
                name: 'Book',
                params: {
                  screen: 'BookMain'
                }
              })
            );
            // Then navigate to Hadith screen after a short delay
            setTimeout(() => {
              if (navigationRef.current) {
                navigationRef.current.dispatch(
                  CommonActions.navigate({
                    name: 'Book',
                    params: {
                      screen: 'Hadith',
                      params: {
                        highlightHadith: {
                          title,
                          arabic,
                          translation,
                          reference,
                          collection,
                          hadithNumber: hadithNumber ? parseInt(hadithNumber) : undefined
                        }
                      }
                    }
                  })
                );
              }
            }, 100);
          }
        }, 500);
        return;
      }
      
      // Handle dua deep link
      if (parsedUrl.host === 'dua' && navigationRef.current) {
        const params = new URLSearchParams(parsedUrl.search);
        const title = params.get('title') || '';
        const arabic = params.get('arabic') || '';
        const translation = params.get('translation') || '';
        const reference = params.get('reference') || '';
        
        console.log('🤲 Navigating to Dua:', {
          title,
          reference
        });
        
        setTimeout(() => {
          if (navigationRef.current) {
            // First navigate to Book tab and BookMain to ensure proper stack
            navigationRef.current.dispatch(
              CommonActions.navigate({
                name: 'Book',
                params: {
                  screen: 'BookMain'
                }
              })
            );
            // Then navigate to Dua screen after a short delay
            setTimeout(() => {
              if (navigationRef.current) {
                navigationRef.current.dispatch(
                  CommonActions.navigate({
                    name: 'Book',
                    params: {
                      screen: 'Dua',
                      params: {
                        highlightDua: {
                          title,
                          arabic,
                          translation,
                          reference
                        }
                      }
                    }
                  })
                );
              }
            }, 100);
          }
        }, 500);
        return;
      }
      
      // Handle dhikr deep link
      if (parsedUrl.host === 'dhikr' && navigationRef.current) {
        const params = new URLSearchParams(parsedUrl.search);
        const title = params.get('title') || '';
        const arabic = params.get('arabic') || '';
        const translation = params.get('translation') || '';
        const reference = params.get('reference') || '';
        
        console.log('🔄 Navigating to Dhikr:', {
          title,
          reference
        });
        
        setTimeout(() => {
          if (navigationRef.current) {
            // First navigate to Book tab and BookMain to ensure proper stack
            navigationRef.current.dispatch(
              CommonActions.navigate({
                name: 'Book',
                params: {
                  screen: 'BookMain'
                }
              })
            );
            // Then navigate to Dhikr screen after a short delay
            setTimeout(() => {
              if (navigationRef.current) {
                navigationRef.current.dispatch(
                  CommonActions.navigate({
                    name: 'Book',
                    params: {
                      screen: 'Dhikr',
                      params: {
                        highlightDhikr: {
                          title,
                          arabic,
                          translation,
                          reference
                        }
                      }
                    }
                  })
                );
              }
            }, 100);
          }
        }, 500);
        return;
      }
      
      if (parsedUrl.host === 'quran' && navigationRef.current) {
        const params = new URLSearchParams(parsedUrl.search);
        const surahNumber = parseInt(params.get('surah') || '0');
        const ayahNumber = parseInt(params.get('ayah') || '0');
        const surahName = params.get('surahName') || '';
        const surahNameArabic = params.get('surahNameArabic') || '';
        
        if (surahNumber > 0 && ayahNumber > 0) {
          console.log('📖 Navigating to Quran verse:', {
            surahNumber,
            ayahNumber,
            surahName,
            surahNameArabic
          });
          
          // Wait for navigation to be ready
          setTimeout(() => {
            if (navigationRef.current) {
              // First navigate to Book tab and BookMain to ensure proper stack
              navigationRef.current.dispatch(
                CommonActions.navigate({
                  name: 'Book',
                  params: {
                    screen: 'BookMain'
                  }
                })
              );
              // Then navigate to Quran screen after a short delay
              setTimeout(() => {
                if (navigationRef.current) {
                  navigationRef.current.dispatch(
                    CommonActions.navigate({
                      name: 'Book',
                      params: {
                        screen: 'Quran',
                        params: {
                          highlightVerse: {
                            surahNumber,
                            ayahNumber,
                            surahName,
                            surahNameArabic
                          }
                        }
                      }
                    })
                  );
                }
              }, 100);
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('❌ Error handling deep link:', error);
    }
  };

  // Setup global purchase listener that works even when app is backgrounded
  const setupGlobalPurchaseListener = () => {
    console.log('🎧 Setting up global purchase listener...');
    
    // Note: InAppPurchases.addListener doesn't exist in current Expo API
    // Purchase handling is now done directly in the purchase screens
    // This function now only handles app state changes and periodic checks
    
    console.log('✅ Global purchase listener setup completed (using app state monitoring)');

    // Method 2: App state change listener to handle background purchases
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active, checking for pending purchases...');
        
        // Add a small delay to avoid conflicts with ongoing purchases
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for any pending purchases when app becomes active
        try {
          console.log('🔄 Checking for pending purchases...');
          
          // Ensure InAppPurchases is available and connected
          if (!InAppPurchases || typeof InAppPurchases.getPurchaseHistoryAsync !== 'function') {
            console.log('⚠️ InAppPurchases not available, skipping purchase check');
            return;
          }
          
          // Check if there's a pending purchase in progress
          const pendingPurchase = await AsyncStorage.getItem('pendingPurchase');
          if (pendingPurchase === 'true') {
            console.log('⚠️ Purchase in progress, skipping purchase history check to avoid conflicts');
            return;
          }
          
          // The correct method is to check purchase history instead
          const purchaseHistoryResponse = await InAppPurchases.getPurchaseHistoryAsync();
          if (purchaseHistoryResponse && purchaseHistoryResponse.results && purchaseHistoryResponse.results.length > 0) {
            console.log('🔄 Found purchase history:', purchaseHistoryResponse.results.length, 'purchases');
            
            // Check for recent purchases that might need processing
            const recentPurchases = purchaseHistoryResponse.results.filter(purchase => {
              // Check if purchase is from the last hour and hasn't been processed
              const purchaseTime = new Date(purchase.transactionDate || purchase.purchaseTime || Date.now());
              const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
              return purchaseTime > oneHourAgo;
            });
            
            if (recentPurchases.length > 0) {
              console.log('🔄 Found recent purchases:', recentPurchases.length);
              for (const purchase of recentPurchases) {
                await handleSuccessfulPurchase(purchase);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error checking pending purchases:', error);
          console.log('🔄 InAppPurchases methods available:', Object.keys(InAppPurchases));
          
          // Add more specific error handling
          if (error.message) {
            console.log('🔄 Error message:', error.message);
          }
          if (error.code) {
            console.log('🔄 Error code:', error.code);
          }
        }
      }
    });

    // Method 3: Periodic check for subscription status changes
    const periodicCheck = setInterval(async () => {
      try {
        // Check if there's a pending purchase in progress
        const pendingPurchase = await AsyncStorage.getItem('pendingPurchase');
        if (pendingPurchase === 'true') {
          console.log('⚠️ Purchase in progress, skipping periodic subscription check');
          return;
        }
        
        const wasSubscribed = await AsyncStorage.getItem('wasSubscribed');
        const isCurrentlySubscribed = await subscriptionGuard.checkSubscriptionStatus();
        
        // Save subscription status to widget storage
        const widgetService = (await import('./services/widgetService')).default;
        widgetService.saveSubscriptionStatus(isCurrentlySubscribed);
        
        if (wasSubscribed === 'false' && isCurrentlySubscribed) {
          console.log('🔄 Subscription status changed from false to true');
          await handleSubscriptionStatusChange(true);
        }
      } catch (error) {
        console.error('❌ Error in periodic subscription check:', error);
        
        // Handle the specific "Must wait for promise to resolve" error
        if (error.message && error.message.includes('Must wait for promise to resolve')) {
          console.log('🛑 Detected promise conflict in periodic check, skipping this cycle');
          return;
        }
      }
    }, 10000); // Check every 10 seconds

    // Store cleanup functions
    window.purchaseListenerCleanup = () => {
      // Note: No purchase listener to clean up since addListener doesn't exist
      appStateSubscription?.remove();
      clearInterval(periodicCheck);
    };
  };

  // Handle successful purchase
  const handleSuccessfulPurchase = async (purchase) => {
    console.log('🎉 Handling successful purchase:', purchase);
    
    try {
      // Update subscription status
      await appleSubscriptionService.saveSubscriptionToFirebase(purchase);
      
      // Immediately check and save subscription status to widget storage
      subscriptionGuard.resetCache();
      const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
      const widgetService = (await import('./services/widgetService')).default;
      widgetService.saveSubscriptionStatus(isSubscribed);
      
      // Clear any pending purchase flags
      await AsyncStorage.removeItem('pendingPurchase');
      
      // Trigger global success handler if available
      if (window.handlePurchaseSuccess) {
        window.handlePurchaseSuccess();
      }
      
      // Show success notification
      console.log('✅ Purchase processed successfully');
      
    } catch (error) {
      console.error('❌ Error handling successful purchase:', error);
    }
  };

  // Handle subscription status change
  const handleSubscriptionStatusChange = async (isSubscribed) => {
    console.log('🔄 Subscription status changed to:', isSubscribed);
    
    try {
      await AsyncStorage.setItem('wasSubscribed', isSubscribed.toString());
      
      // Save subscription status to widget storage
      const widgetService = (await import('./services/widgetService')).default;
      widgetService.saveSubscriptionStatus(isSubscribed);
      
      if (isSubscribed) {
        // Trigger global success handler if available
        if (window.handlePurchaseSuccess) {
          window.handlePurchaseSuccess();
        }
      }
    } catch (error) {
      console.error('❌ Error handling subscription status change:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const userState = await userStateService.getUserState();
      
      console.log('🔍 Auth Status Check:', { 
        hasCompletedOnboarding: userState.hasCompletedOnboarding,
        userLoggedIn: userState.userLoggedIn,
        currentUser: !!auth.currentUser,
        hasUserProfile: !!userState.userProfile
      });
      
      setHasCompletedOnboarding(userState.hasCompletedOnboarding);
      setIsFirstLaunch(!userState.hasCompletedOnboarding);
      
      // If we have a current user but AsyncStorage doesn't reflect it, update it
      if (auth.currentUser && !userState.userLoggedIn) {
        console.log('🔍 Syncing AsyncStorage with Firebase auth state');
        await userStateService.saveUserState(userState.userProfile, userState.hasCompletedOnboarding, userState.userLanguage);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(userState.userLoggedIn);
      }
      
      // Firebase auth state will be handled by the onAuthStateChanged listener
      // which will automatically update isLoggedIn state
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsFirstLaunch(true);
      setIsLoggedIn(false);
    }
  };

  // Removed checkSubscriptionStatus function - app is now free

  // Show video loading screen first
  if (showVideoLoading) {
    return (
      <VideoLoadingScreen 
        onComplete={() => {
          setShowVideoLoading(false);
        }} 
      />
    );
  }

  // Show loading screen while checking first launch status
  if (isFirstLaunch === null) {
    return null;
  }

  return (
    <LanguageProvider>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <StatusBar style="dark" />
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
{/* Removed development mode with subscription screen - app is now free */}
        {(() => {
          const shouldShowOnboarding = (isFirstLaunch || !isLoggedIn) && !hasCompletedOnboarding;
          console.log('🧭 Navigation decision:', {
            isFirstLaunch,
            isLoggedIn,
            hasCompletedOnboarding,
            shouldShowOnboarding
          });
          return shouldShowOnboarding;
        })() ? (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="OnboardingScreen">
                {(props) => <OnboardingScreen {...props} onComplete={() => {
                  setIsFirstLaunch(false);
                  AsyncStorage.setItem('hasCompletedOnboarding', 'true');
                }} />}
              </Stack.Screen>
              <Stack.Screen name="FullOnboardingScreen">
                {(props) => <FullOnboardingScreen {...props} onComplete={() => {
                  setHasCompletedOnboarding(true);
                  setIsFirstLaunch(false);
                  AsyncStorage.setItem('hasCompletedOnboarding', 'true');
                }} />}
              </Stack.Screen>
              <Stack.Screen name="SimpleQuranViewer" component={SimpleQuranViewer} />
              {/* Removed SubscriptionScreen from onboarding flow - app is now free */}
              <Stack.Screen name="Home">
                {(props) => <HomeScreen {...props} />}
              </Stack.Screen>
            </Stack.Navigator>
          ) : (
            <MainTabNavigator onLogout={async () => {
              try {
                console.log('🔄 onLogout callback called - auth state listener will handle navigation');
                // The auth state listener will automatically update isLoggedIn to false
                // and redirect to onboarding when user is signed out
                // No need to call auth.signOut() here as it's already called in SettingsScreen
                
                // Fallback: Force navigation after a short delay if auth state doesn't update
                setTimeout(() => {
                  console.log('🔄 Fallback navigation check - forcing onboarding if needed');
                  if (!auth.currentUser) {
                    console.log('🔄 No user found, forcing onboarding navigation');
                    setIsLoggedIn(false);
                    setHasCompletedOnboarding(false);
                  }
                }, 1000);
              } catch (error) {
                console.error('❌ Error in onLogout callback:', error);
              }
            }} />
          )
        }
      </NavigationContainer>
      </View>
    </LanguageProvider>
  );
}
