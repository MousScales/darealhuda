import { ExtensionStorage } from '@bacons/apple-targets';
// import prayerTimesLiveActivity from './prayerTimesLiveActivity'; // COMMENTED OUT: Live Activities disabled until further implementation

const APP_GROUP = 'group.com.digaifounder.huda';
const PRAYER_TIMES_KEY = 'prayer_times_widget';
const QIBLA_KEY = 'qibla_widget';
const DAILY_QURAN_VERSE_KEY = 'daily_quran_verse_widget';
const DAILY_HADITH_KEY = 'daily_hadith_widget';
const DAILY_DUA_KEY = 'daily_dua_widget';
const DAILY_DHIKR_KEY = 'daily_dhikr_widget';
const SUBSCRIPTION_STATUS_KEY = 'subscription_status_widget';

class WidgetService {
  constructor() {
    this.storage = new ExtensionStorage(APP_GROUP);
  }

  /**
   * Save prayer times data to shared storage for widgets
   * @param {Object} data - Prayer times data object
   */
  savePrayerTimes(data) {
    try {
      // Format the data for the widget
      const widgetData = {
        prayerTimes: data.prayerTimes.map(prayer => ({
          id: prayer.id,
          name: prayer.name,
          time: prayer.time,
          dateObj: prayer.dateObj.toISOString(), // Convert Date to ISO string
          isNext: prayer.isNext || false,
          isCompleted: prayer.isCompleted || false
        })),
        nextPrayer: data.nextPrayer ? {
          id: data.nextPrayer.id,
          name: data.nextPrayer.name,
          time: data.nextPrayer.time,
          dateObj: data.nextPrayer.dateObj.toISOString(),
          isNext: true,
          isCompleted: data.nextPrayer.isCompleted || false
        } : null,
        currentPrayer: data.currentPrayer ? {
          id: data.currentPrayer.id,
          name: data.currentPrayer.name,
          time: data.currentPrayer.time,
          dateObj: data.currentPrayer.dateObj.toISOString(),
          isNext: false,
          isCompleted: data.currentPrayer.isCompleted || false
        } : null,
        countdown: typeof data.countdown === 'object' && data.countdown !== null
          ? `${String(data.countdown.hours || 0).padStart(2, '0')}:${String(data.countdown.minutes || 0).padStart(2, '0')}:${String(data.countdown.seconds || 0).padStart(2, '0')}`
          : (data.countdown || ''),
        hijriDate: data.hijriDate || '',
        cityName: data.cityName || ''
      };

      // Store as JSON string since ExtensionStorage may not handle nested objects
      const jsonString = JSON.stringify(widgetData);
      this.storage.set(PRAYER_TIMES_KEY, jsonString);
      
      // Reload all widgets to show updated data
      ExtensionStorage.reloadWidget('PrayerTimesWidget');
      ExtensionStorage.reloadWidget('LockScreenPrayerWidget');
      ExtensionStorage.reloadWidget('NextPrayerCountdownWidget');
      
      // COMMENTED OUT: Live Activity (Dynamic Island) - disabled until further implementation
      // if (data.nextPrayer) {
      //   this.updateLiveActivity(data.nextPrayer.name, data.nextPrayer.time);
      // }
      
      console.log('✅ Prayer times saved to widget storage');
    } catch (error) {
      console.error('❌ Error saving prayer times to widget:', error);
    }
  }

  /**
   * Remove prayer times data from shared storage
   */
  clearPrayerTimes() {
    try {
      this.storage.remove(PRAYER_TIMES_KEY);
      // COMMENTED OUT: End Live Activity when prayer times are cleared - disabled until further implementation
      // prayerTimesLiveActivity.endActivity();
      console.log('✅ Prayer times cleared from widget storage');
    } catch (error) {
      console.error('❌ Error clearing prayer times from widget:', error);
    }
  }

  /**
   * COMMENTED OUT: Update or start Live Activity for prayer times (Dynamic Island)
   * Disabled until further implementation
   * @param {string} prayerName - Name of the next prayer
   * @param {string} prayerTime - Time of the next prayer
   */
  // async updateLiveActivity(prayerName, prayerTime) {
  //   try {
  //     // Try to start/update activity - don't check if enabled first since the check might be unreliable
  //     // The system will handle the actual authorization
  //     const isInProgress = await prayerTimesLiveActivity.isActivityInProgress();
  //     
  //     if (isInProgress) {
  //       // Update existing activity
  //       prayerTimesLiveActivity.updateActivity(prayerName, prayerTime);
  //       console.log('✅ Live Activity updated:', prayerName, prayerTime);
  //     } else {
  //       // Start new activity - let it fail gracefully if not enabled
  //       const started = await prayerTimesLiveActivity.startActivity(
  //         prayerName,
  //         prayerTime,
  //         'prayer-times'
  //       );
  //       if (started) {
  //         console.log('✅ Live Activity started:', prayerName, prayerTime);
  //       } else {
  //         console.log('⚠️ Failed to start Live Activity (may not be enabled or available)');
  //       }
  //     }
  //   } catch (error) {
  //     console.error('❌ Error updating Live Activity:', error);
  //     // Don't throw - fail silently since Live Activities are optional
  //   }
  // }

  /**
   * Save Qibla data to shared storage for widgets
   * @param {Object} data - Qibla data object
   */
  saveQiblaData(data) {
    try {
      const widgetData = {
        qiblaDirection: data.qiblaDirection || 0,
        heading: data.heading || 0,
        locationName: data.locationName || 'Unknown',
        isFacingQibla: data.isFacingQibla || false,
        instruction: data.instruction || 'Finding Qibla...'
      };

      const jsonString = JSON.stringify(widgetData);
      this.storage.set(QIBLA_KEY, jsonString);
      
      // Reload the widget to show updated data
      ExtensionStorage.reloadWidget('QiblaWidget');
      
      console.log('✅ Qibla data saved to widget storage');
    } catch (error) {
      console.error('❌ Error saving Qibla data to widget:', error);
    }
  }

  /**
   * Save daily Quran verse data to shared storage for widgets
   * @param {Object} data - Quran verse data object
   */
  saveDailyQuranVerse(data) {
    try {
      const widgetData = {
        arabic: data.arabic || '',
        translation: data.translation || '',
        reference: data.reference || '',
        surahName: data.surahName || '',
        surahNameArabic: data.surahNameArabic || '',
        ayahNumber: data.ayahNumber || 0,
        surahNumber: data.surahNumber || 0
      };

      const jsonString = JSON.stringify(widgetData);
      this.storage.set(DAILY_QURAN_VERSE_KEY, jsonString);
      
      // Reload the widget to show updated data
      ExtensionStorage.reloadWidget('DailyQuranVerseWidget');
      ExtensionStorage.reloadWidget('DailyQuranVerseArabicWidget');
      ExtensionStorage.reloadWidget('DailyQuranVerseEnglishWidget');
      
      console.log('✅ Daily Quran verse saved to widget storage');
    } catch (error) {
      console.error('❌ Error saving daily Quran verse to widget:', error);
    }
  }

  /**
   * Save daily hadith data to shared storage for widgets
   * @param {Object} data - Hadith data object
   */
  saveDailyHadith(data) {
    try {
      const widgetData = {
        title: data.title || '',
        arabic: data.arabic || '',
        translation: data.translation || '',
        reference: data.reference || '',
        collection: data.collection || null,
        hadithNumber: data.hadithNumber || null
      };

      const jsonString = JSON.stringify(widgetData);
      this.storage.set(DAILY_HADITH_KEY, jsonString);
      
      // Reload the widget to show updated data
      ExtensionStorage.reloadWidget('DailyHadithWidget');
      ExtensionStorage.reloadWidget('DailyHadithArabicWidget');
      ExtensionStorage.reloadWidget('DailyHadithEnglishWidget');
      
      console.log('✅ Daily hadith saved to widget storage');
    } catch (error) {
      console.error('❌ Error saving daily hadith to widget:', error);
    }
  }

  /**
   * Save daily dua data to shared storage for widgets
   * @param {Object} data - Dua data object
   */
  saveDailyDua(data) {
    try {
      const widgetData = {
        title: data.title || '',
        arabic: data.arabic || '',
        translation: data.translation || data.english || '',
        reference: data.reference || data.source || ''
      };

      const jsonString = JSON.stringify(widgetData);
      this.storage.set(DAILY_DUA_KEY, jsonString);
      
      // Reload the widget to show updated data
      ExtensionStorage.reloadWidget('DailyDuaWidget');
      ExtensionStorage.reloadWidget('DailyDuaArabicWidget');
      ExtensionStorage.reloadWidget('DailyDuaEnglishWidget');
      
      console.log('✅ Daily dua saved to widget storage');
    } catch (error) {
      console.error('❌ Error saving daily dua to widget:', error);
    }
  }

  /**
   * Save daily dhikr data to shared storage for widgets
   * @param {Object} data - Dhikr data object
   */
  saveDailyDhikr(data) {
    try {
      const widgetData = {
        title: data.title || '',
        arabic: data.arabic || '',
        translation: data.translation || data.english || '',
        reference: data.reference || data.source || ''
      };

      const jsonString = JSON.stringify(widgetData);
      this.storage.set(DAILY_DHIKR_KEY, jsonString);
      
      // Reload the widget to show updated data
      ExtensionStorage.reloadWidget('DailyDhikrWidget');
      ExtensionStorage.reloadWidget('DailyDhikrArabicWidget');
      ExtensionStorage.reloadWidget('DailyDhikrEnglishWidget');
      
      console.log('✅ Daily dhikr saved to widget storage');
    } catch (error) {
      console.error('❌ Error saving daily dhikr to widget:', error);
    }
  }

  /**
   * Save subscription status to shared storage for widgets
   * This status comes from Apple's subscription service verification
   * @param {boolean} isSubscribed - Whether user is subscribed (verified with Apple)
   */
  saveSubscriptionStatus(isSubscribed) {
    try {
      // Store subscription status verified by Apple's subscription service
      const subscriptionData = {
        isSubscribed: isSubscribed || false,
        lastVerified: new Date().toISOString(), // Track when last verified with Apple
        verifiedBy: 'apple' // Indicate this is verified by Apple subscription service
      };

      const jsonString = JSON.stringify(subscriptionData);
      this.storage.set(SUBSCRIPTION_STATUS_KEY, jsonString);
      
      // Reload Quran verse widgets to reflect subscription status
      ExtensionStorage.reloadWidget('DailyQuranVerseWidget');
      ExtensionStorage.reloadWidget('DailyQuranVerseArabicWidget');
      ExtensionStorage.reloadWidget('DailyQuranVerseEnglishWidget');
      
      console.log('✅ Subscription status (verified by Apple) saved to widget storage:', isSubscribed);
    } catch (error) {
      console.error('❌ Error saving subscription status to widget:', error);
    }
  }
}

export default new WidgetService();
