import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore, auth } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getNotificationTitle, getCurrentLanguage } from '../utils/translations';

class DirectNotificationService {
  constructor() {
    this.isInitialized = false;
    this.expoPushToken = null;
    this.userId = null;
    this.notificationPermissionStatus = 'unknown';
    this.lastScheduledFajr = null;
    this.lastScheduledSunrise = null;
  }

  // Helper function to get random hadith (matching Firebase Functions)
  getRandomHadith() {
    const hadiths = [
      "The Prophet ﷺ said: 'The most beloved places to Allah are the mosques, and the most disliked places to Allah are the markets.'",
      "The Prophet ﷺ said: 'When one of you prays, he is conversing with his Lord.'",
      "The Prophet ﷺ said: 'The first thing for which a person will be held accountable on the Day of Resurrection is prayer.'",
      "The Prophet ﷺ said: 'Prayer is the pillar of religion.'",
      "The Prophet ﷺ said: 'The key to Paradise is prayer.'"
    ];
    return hadiths[Math.floor(Math.random() * hadiths.length)];
  }

  // Helper function to get prayer-specific notification keys
  getPrayerNotificationKeys(prayerName) {
    const prayerKeys = {
      fajr: {
        in5Minutes: 'fajrIn5Minutes',
        atTime: 'fajrAtTime',
        dontDelay: 'dontDelayFajr',
        salaamReminder: 'salaamReminder'
      },
      dhuhr: {
        in5Minutes: 'dhuhrIn5Minutes',
        atTime: 'dhuhrAtTime',
        dontDelay: 'dontDelayDhuhr',
        salaamReminder: 'salaamReminderDhuhr'
      },
      asr: {
        in5Minutes: 'asrIn5Minutes',
        atTime: 'asrAtTime',
        dontDelay: 'dontDelayAsr',
        salaamReminder: 'salaamReminderAsr'
      },
      maghrib: {
        in5Minutes: 'maghribIn5Minutes',
        atTime: 'maghribAtTime',
        dontDelay: 'dontDelayMaghrib',
        salaamReminder: 'salaamReminderMaghrib'
      },
      isha: {
        in5Minutes: 'ishaIn5Minutes',
        atTime: 'ishaAtTime',
        dontDelay: 'dontDelayIsha',
        salaamReminder: 'salaamReminderIsha'
      },
      sunrise: {
        atTime: 'sunriseAtTime'
      }
    };
    
    return prayerKeys[prayerName.toLowerCase()] || prayerKeys.fajr; // Default to fajr if prayer not found
  }

  // Initialize the service
  async initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      console.log('🚀 DirectNotificationService: Initializing...');

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: false,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ DirectNotificationService: Notification permission not granted');
        this.notificationPermissionStatus = 'denied';
        return false;
      }

      // Get Expo push token
      this.expoPushToken = await this.getExpoPushToken();
      
      if (!this.expoPushToken) {
        console.log('❌ DirectNotificationService: Failed to get Expo push token');
        return false;
      }

      this.notificationPermissionStatus = 'granted';
      this.isInitialized = true;
      console.log('✅ DirectNotificationService: Initialized successfully');
      
      // Save push token to Firebase
      await this.savePushTokenToFirebase();
      
      return true;
    } catch (error) {
      console.error('❌ DirectNotificationService: Initialization error:', error);
      return false;
    }
  }

  // Get Expo push token
  async getExpoPushToken() {
    try {
      if (!Device.isDevice) {
        console.log('⚠️ DirectNotificationService: Not running on a device, using simulator token');
        return 'ExponentPushToken[simulator]';
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '06fc807b-d01f-45d3-92e3-965e851cbb48', // Your Expo project ID
      });
      
      console.log('📱 DirectNotificationService: Expo push token:', token.data);
      return token.data;
    } catch (error) {
      console.error('❌ DirectNotificationService: Error getting Expo push token:', error);
      return null;
    }
  }

  // Save push token to Firebase
  async savePushTokenToFirebase() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ DirectNotificationService: No authenticated user, skipping Firebase save');
        return;
      }

      this.userId = user.uid;
      
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        expoPushToken: this.expoPushToken,
        lastTokenUpdate: new Date().toISOString(),
        directNotificationService: true, // Flag to indicate this service is being used
      });
      
      console.log('✅ DirectNotificationService: Push token saved to Firebase');
    } catch (error) {
      console.error('❌ DirectNotificationService: Error saving push token to Firebase:', error);
    }
  }

  // Schedule Fajr notification
  async scheduleFajrNotification(fajrTime, shouldPlayAdhan = true) {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ DirectNotificationService: Service not initialized');
        return false;
      }

      // Check if we already scheduled for this time to prevent duplicates
      const fajrTimeString = fajrTime.toISOString();
      if (this.lastScheduledFajr === fajrTimeString) {
        console.log('⚠️ DirectNotificationService: Fajr notifications already scheduled for this time');
        return true;
      }

      console.log('🌅 DirectNotificationService: Scheduling Fajr notifications for:', fajrTime);
      
      // Cancel any existing Fajr notifications
      await this.cancelFajrNotifications();
      
      // Get user's name for personalized notifications
      let userName = 'there';
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userName = userData.firstName || userData.name || 'there';
          }
        }
      } catch (error) {
        console.log('⚠️ DirectNotificationService: Could not get user name, using default');
      }
      
      // Format the time for display (matching other prayer notifications)
      const timeString = fajrTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // 5-minute warning notification (before prayer time)
      const fiveMinWarning = new Date(fajrTime.getTime() - 5 * 60 * 1000);
      const currentLanguage = await getCurrentLanguage();
      const prayerKeys = this.getPrayerNotificationKeys('fajr');
      console.log('🔔 DirectNotificationService: Scheduling Fajr notifications in language:', currentLanguage);
      
      const warningNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: getNotificationTitle('prayerTimeAlmostHere', currentLanguage),
          body: getNotificationTitle(prayerKeys.in5Minutes, currentLanguage),
          data: {
            type: 'prayer_time',
            prayer: 'fajr',
            warning: '5min',
            shouldPlayAdhan: false,
            timestamp: Date.now(),
          },
          sound: 'default',
        },
        trigger: {
          date: fiveMinWarning,
          channelId: 'prayer-notifications',
        },
      });

      // Main Fajr notification (at prayer time)
      const mainNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: getNotificationTitle(prayerKeys.atTime, currentLanguage, { time: timeString }),
          body: getNotificationTitle('itsTimeToPray', currentLanguage),
          data: {
            type: 'prayer_time',
            prayer: 'fajr',
            shouldPlayAdhan: shouldPlayAdhan,
            timestamp: Date.now(),
          },
          sound: shouldPlayAdhan ? 'Adhan.m4a' : 'default',
        },
        trigger: {
          date: fajrTime,
          channelId: 'prayer-notifications',
        },
      });

      // 30-minute reminder notification (after prayer time)
      const thirtyMinReminder = new Date(fajrTime.getTime() + 30 * 60 * 1000);
      const hadith = this.getRandomHadith();
      const reminderNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: getNotificationTitle(prayerKeys.dontDelay, currentLanguage),
          body: `${getNotificationTitle(prayerKeys.salaamReminder, currentLanguage, { name: userName })}. ${hadith}`,
          data: {
            type: 'prayer_delay_reminder',
            prayer: 'fajr',
            reminder: '30min',
            shouldPlayAdhan: false,
            timestamp: Date.now(),
          },
          sound: 'default',
        },
        trigger: {
          date: thirtyMinReminder,
          channelId: 'prayer-notifications',
        },
      });

      console.log('✅ DirectNotificationService: Fajr notifications scheduled:', {
        warning: warningNotificationId,
        main: mainNotificationId,
        reminder: reminderNotificationId
      });
      
      // Save notification info to Firebase
      await this.saveNotificationToFirebase('fajr', fajrTime, mainNotificationId);
      
      // Track that we scheduled for this time
      this.lastScheduledFajr = fajrTimeString;
      
      return true;
    } catch (error) {
      console.error('❌ DirectNotificationService: Error scheduling Fajr notification:', error);
      return false;
    }
  }

  // Schedule Sunrise notification
  async scheduleSunriseNotification(sunriseTime, shouldPlayAdhan = true) {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ DirectNotificationService: Service not initialized');
        return false;
      }

      // Check if we already scheduled for this time to prevent duplicates
      const sunriseTimeString = sunriseTime.toISOString();
      if (this.lastScheduledSunrise === sunriseTimeString) {
        console.log('⚠️ DirectNotificationService: Sunrise notification already scheduled for this time');
        return true;
      }

      console.log('🌅 DirectNotificationService: Scheduling Sunrise notification for:', sunriseTime);
      
      // Cancel any existing Sunrise notifications
      await this.cancelSunriseNotifications();
      
      // Format the time for display
      const timeString = sunriseTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Sunrise',
          body: `It's ${timeString} - the sun has risen. Time for morning dhikr and gratitude.`,
          data: {
            type: 'prayer_time',
            prayer: 'sunrise',
            shouldPlayAdhan: shouldPlayAdhan,
            timestamp: Date.now(),
          },
          sound: shouldPlayAdhan ? 'Adhan.m4a' : 'default',
        },
        trigger: {
          date: sunriseTime,
          channelId: 'prayer-notifications',
        },
      });

      console.log('✅ DirectNotificationService: Sunrise notification scheduled with ID:', notificationId);
      
      // Save notification info to Firebase
      await this.saveNotificationToFirebase('sunrise', sunriseTime, notificationId);
      
      // Track that we scheduled for this time
      this.lastScheduledSunrise = sunriseTimeString;
      
      return true;
    } catch (error) {
      console.error('❌ DirectNotificationService: Error scheduling Sunrise notification:', error);
      return false;
    }
  }

  // Cancel Fajr notifications
  async cancelFajrNotifications() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const fajrNotifications = scheduledNotifications.filter(notification => 
        notification.content.data?.prayer === 'fajr'
      );
      
      for (const notification of fajrNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log('🗑️ DirectNotificationService: Cancelled Fajr notification:', notification.identifier);
      }
    } catch (error) {
      console.error('❌ DirectNotificationService: Error cancelling Fajr notifications:', error);
    }
  }

  // Cancel Sunrise notifications
  async cancelSunriseNotifications() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const sunriseNotifications = scheduledNotifications.filter(notification => 
        notification.content.data?.prayer === 'sunrise'
      );
      
      for (const notification of sunriseNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log('🗑️ DirectNotificationService: Cancelled Sunrise notification:', notification.identifier);
      }
    } catch (error) {
      console.error('❌ DirectNotificationService: Error cancelling Sunrise notifications:', error);
    }
  }

  // Save notification info to Firebase
  async saveNotificationToFirebase(prayerType, scheduledTime, notificationId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ DirectNotificationService: No authenticated user, skipping Firebase save');
        return;
      }

      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        [`directNotifications.${prayerType}`]: {
          scheduledTime: scheduledTime.toISOString(),
          notificationId: notificationId,
          lastUpdated: new Date().toISOString(),
        },
      });
      
      console.log('✅ DirectNotificationService: Notification info saved to Firebase');
    } catch (error) {
      console.error('❌ DirectNotificationService: Error saving notification info to Firebase:', error);
    }
  }

  // Send immediate notification via API
  async sendImmediateNotification(prayerType, shouldPlayAdhan = true) {
    try {
      if (!this.expoPushToken) {
        console.log('❌ DirectNotificationService: No push token available');
        return false;
      }

      console.log('📤 DirectNotificationService: Sending immediate notification for:', prayerType);
      
      const now = new Date();
      
      if (prayerType === 'fajr') {
        const timeString = now.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const currentLanguage = await getCurrentLanguage();
        const title = getNotificationTitle('fajrAtTime', currentLanguage, { time: timeString });
        const body = getNotificationTitle('itsTimeToPray', currentLanguage);

        const message = {
          to: this.expoPushToken,
          sound: shouldPlayAdhan ? 'Adhan.m4a' : 'default',
          title: title,
          body: body,
          data: {
            type: 'prayer_time',
            prayer: prayerType,
            shouldPlayAdhan: shouldPlayAdhan,
            timestamp: Date.now(),
          },
          priority: 'high',
        };

        // Add iOS-specific sound for adhan
        if (shouldPlayAdhan) {
          message.ios = {
            sound: 'Adhan.m4a',
          };
        }

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        const result = await response.json();
        console.log('📤 DirectNotificationService: API response:', result);
        
        if (result.data?.status === 'ok') {
          console.log('✅ DirectNotificationService: Immediate Fajr notification sent successfully');
          return true;
        } else {
          console.log('❌ DirectNotificationService: Failed to send immediate Fajr notification:', result);
          return false;
        }
      } else if (prayerType === 'sunrise') {
        const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        
        const title = 'Sunrise';
        const body = `It's ${timeString} - the sun has risen. Time for morning dhikr and gratitude.`;

        const message = {
          to: this.expoPushToken,
          sound: shouldPlayAdhan ? 'Adhan.m4a' : 'default',
          title: title,
          body: body,
          data: {
            type: 'prayer_time',
            prayer: prayerType,
            shouldPlayAdhan: shouldPlayAdhan,
            timestamp: Date.now(),
          },
          priority: 'high',
        };

        // Add iOS-specific sound for adhan
        if (shouldPlayAdhan) {
          message.ios = {
            sound: 'Adhan.m4a',
          };
        }

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        const result = await response.json();
        console.log('📤 DirectNotificationService: API response:', result);
        
        if (result.data?.status === 'ok') {
          console.log('✅ DirectNotificationService: Immediate Sunrise notification sent successfully');
          return true;
        } else {
          console.log('❌ DirectNotificationService: Failed to send immediate Sunrise notification:', result);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ DirectNotificationService: Error sending immediate notification:', error);
      return false;
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 DirectNotificationService: Scheduled notifications:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('❌ DirectNotificationService: Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Test notification
  async testNotification() {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ DirectNotificationService: Service not initialized');
        return false;
      }

      console.log('🧪 DirectNotificationService: Testing notification...');
      
      // Test local notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from DirectNotificationService!',
          data: { type: 'test' },
        },
        trigger: { seconds: 5 },
      });
      
      console.log('✅ DirectNotificationService: Test notification scheduled with ID:', notificationId);
      
      // Test immediate notification via API
      if (this.expoPushToken) {
        await this.sendImmediateNotification('fajr', false);
      }
      
      return true;
    } catch (error) {
      console.error('❌ DirectNotificationService: Error testing notification:', error);
      return false;
    }
  }

  // Cleanup
  async cleanup() {
    try {
      await this.cancelFajrNotifications();
      await this.cancelSunriseNotifications();
      console.log('✅ DirectNotificationService: Cleanup completed');
    } catch (error) {
      console.error('❌ DirectNotificationService: Error during cleanup:', error);
    }
  }

  // Get status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      notificationPermissionStatus: this.notificationPermissionStatus,
      expoPushToken: this.expoPushToken,
      userId: this.userId,
    };
  }
}

export default new DirectNotificationService(); 