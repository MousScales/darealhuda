import AsyncStorage from '@react-native-async-storage/async-storage';

const QURAN_STREAK_KEY = 'quran_daily_streak';
const LAST_VISIT_KEY = 'quran_last_visit';
const HADITH_STREAK_KEY = 'hadith_daily_streak';
const HADITH_LAST_VISIT_KEY = 'hadith_last_visit';
const PRAYER_STREAK_KEY = 'prayer_daily_streak';
const PRAYER_LAST_VISIT_KEY = 'prayer_last_visit';

class StreakService {
  /**
   * Records a visit to the Quran screen and updates streak accordingly
   * @returns {Promise<Object>} Object containing current streak and whether it was updated
   */
  async recordQuranVisit() {
    try {
      const today = new Date();
      const todayString = this.getDateString(today);
      
      // Get last visit date and current streak
      const lastVisitString = await AsyncStorage.getItem(LAST_VISIT_KEY);
      const currentStreak = await this.getCurrentStreak();
      
      console.log('🔥 StreakService: Recording Quran visit', {
        today: todayString,
        lastVisit: lastVisitString,
        currentStreak
      });
      
      // If already visited today, no need to update
      if (lastVisitString === todayString) {
        console.log('🔥 StreakService: Already visited today, streak unchanged');
        return {
          streak: currentStreak,
          updated: false,
          isNewDay: false
        };
      }
      
      let newStreak = 1; // Default to 1 for first visit or after break
      let isConsecutive = false;
      
      if (lastVisitString) {
        const lastVisit = new Date(lastVisitString);
        const daysDifference = this.getDaysDifference(lastVisit, today);
        
        console.log('🔥 StreakService: Days difference:', daysDifference);
        
        if (daysDifference === 1) {
          // Consecutive day - increment streak
          newStreak = currentStreak + 1;
          isConsecutive = true;
          console.log('🔥 StreakService: Consecutive day detected, incrementing streak');
        } else if (daysDifference === 0) {
          // Same day (shouldn't happen due to check above, but safety)
          newStreak = currentStreak;
          console.log('🔥 StreakService: Same day visit');
        } else {
          // Gap in visits - reset streak to 1
          newStreak = 1;
          console.log('🔥 StreakService: Gap detected, resetting streak to 1');
        }
      }
      
      // Save new streak and last visit date
      await AsyncStorage.setItem(QURAN_STREAK_KEY, newStreak.toString());
      await AsyncStorage.setItem(LAST_VISIT_KEY, todayString);
      
      console.log('🔥 StreakService: Streak updated', {
        newStreak,
        isConsecutive,
        savedSuccessfully: true
      });
      
      return {
        streak: newStreak,
        updated: true,
        isNewDay: true,
        isConsecutive
      };
      
    } catch (error) {
      console.error('🔥 StreakService: Error recording Quran visit:', error);
      return {
        streak: 0,
        updated: false,
        isNewDay: false,
        error: error.message
      };
    }
  }
  
  /**
   * Gets the current Quran reading streak
   * @returns {Promise<number>} Current streak count
   */
  async getCurrentStreak() {
    try {
      const streakString = await AsyncStorage.getItem(QURAN_STREAK_KEY);
      const lastVisitString = await AsyncStorage.getItem(LAST_VISIT_KEY);
      
      if (!streakString || !lastVisitString) {
        console.log('🔥 StreakService: No streak data found, returning 0');
        return 0;
      }
      
      const streak = parseInt(streakString, 10) || 0;
      const lastVisit = new Date(lastVisitString);
      const today = new Date();
      const daysDifference = this.getDaysDifference(lastVisit, today);
      
      console.log('🔥 StreakService: Checking current streak', {
        storedStreak: streak,
        lastVisit: lastVisitString,
        daysDifference
      });
      
      // If more than 1 day has passed, streak is broken
      if (daysDifference > 1) {
        console.log('🔥 StreakService: Streak broken due to gap, resetting to 0');
        await AsyncStorage.setItem(QURAN_STREAK_KEY, '0');
        return 0;
      }
      
      return streak;
      
    } catch (error) {
      console.error('🔥 StreakService: Error getting current streak:', error);
      return 0;
    }
  }
  
  /**
   * Gets streak statistics for display
   * @returns {Promise<Object>} Object containing streak info and status
   */
  async getStreakStats() {
    try {
      const currentStreak = await this.getCurrentStreak();
      const lastVisitString = await AsyncStorage.getItem(LAST_VISIT_KEY);
      
      let status = 'start'; // start, continue, broken
      let daysUntilBreak = 0;
      
      if (lastVisitString) {
        const lastVisit = new Date(lastVisitString);
        const today = new Date();
        const daysDifference = this.getDaysDifference(lastVisit, today);
        
        if (daysDifference === 0) {
          status = 'continue'; // Visited today
          daysUntilBreak = 0;
        } else if (daysDifference === 1) {
          status = 'continue'; // Can continue streak today
          daysUntilBreak = 0;
        } else {
          status = 'broken'; // Streak broken
          daysUntilBreak = daysDifference - 1;
        }
      }
      
      return {
        currentStreak,
        status,
        daysUntilBreak,
        lastVisit: lastVisitString,
        canContinueToday: status !== 'broken' && this.getDaysDifference(new Date(lastVisitString || 0), new Date()) <= 1
      };
      
    } catch (error) {
      console.error('🔥 StreakService: Error getting streak stats:', error);
      return {
        currentStreak: 0,
        status: 'start',
        daysUntilBreak: 0,
        lastVisit: null,
        canContinueToday: true,
        error: error.message
      };
    }
  }
  
  /**
   * Resets the streak (for testing or user request)
   * @returns {Promise<boolean>} Success status
   */
  async resetStreak() {
    try {
      await AsyncStorage.removeItem(QURAN_STREAK_KEY);
      await AsyncStorage.removeItem(LAST_VISIT_KEY);
      console.log('🔥 StreakService: Streak reset successfully');
      return true;
    } catch (error) {
      console.error('🔥 StreakService: Error resetting streak:', error);
      return false;
    }
  }

  // ============ HADITH STREAK METHODS ============
  
  /**
   * Records a visit to the Hadith screen and updates streak accordingly
   * @returns {Promise<Object>} Object containing current streak and whether it was updated
   */
  async recordHadithVisit() {
    try {
      const today = new Date();
      const todayString = this.getDateString(today);
      
      // Get last visit date and current streak
      const lastVisitString = await AsyncStorage.getItem(HADITH_LAST_VISIT_KEY);
      const currentStreak = await this.getCurrentHadithStreak();
      
      console.log('📚 StreakService: Recording Hadith visit', {
        today: todayString,
        lastVisit: lastVisitString,
        currentStreak
      });
      
      // If already visited today, no need to update
      if (lastVisitString === todayString) {
        console.log('📚 StreakService: Already visited today, streak unchanged');
        return {
          streak: currentStreak,
          updated: false,
          isNewDay: false
        };
      }
      
      let newStreak = 1; // Default to 1 for first visit or after break
      let isConsecutive = false;
      
      if (lastVisitString) {
        const lastVisit = new Date(lastVisitString);
        const daysDifference = this.getDaysDifference(lastVisit, today);
        
        console.log('📚 StreakService: Days difference:', daysDifference);
        
        if (daysDifference === 1) {
          // Consecutive day - increment streak
          newStreak = currentStreak + 1;
          isConsecutive = true;
          console.log('📚 StreakService: Consecutive day detected, incrementing streak');
        } else if (daysDifference === 0) {
          // Same day (shouldn't happen due to check above, but safety)
          newStreak = currentStreak;
          console.log('📚 StreakService: Same day visit');
        } else {
          // Gap in visits - reset streak to 1
          newStreak = 1;
          console.log('📚 StreakService: Gap detected, resetting streak to 1');
        }
      }
      
      // Save new streak and last visit date
      await AsyncStorage.setItem(HADITH_STREAK_KEY, newStreak.toString());
      await AsyncStorage.setItem(HADITH_LAST_VISIT_KEY, todayString);
      
      console.log('📚 StreakService: Hadith streak updated', {
        newStreak,
        isConsecutive,
        savedSuccessfully: true
      });
      
      return {
        streak: newStreak,
        updated: true,
        isNewDay: true,
        isConsecutive
      };
      
    } catch (error) {
      console.error('📚 StreakService: Error recording Hadith visit:', error);
      return {
        streak: 0,
        updated: false,
        isNewDay: false,
        error: error.message
      };
    }
  }
  
  /**
   * Gets the current Hadith reading streak
   * @returns {Promise<number>} Current streak count
   */
  async getCurrentHadithStreak() {
    try {
      const streakString = await AsyncStorage.getItem(HADITH_STREAK_KEY);
      const lastVisitString = await AsyncStorage.getItem(HADITH_LAST_VISIT_KEY);
      
      if (!streakString || !lastVisitString) {
        console.log('📚 StreakService: No hadith streak data found, returning 0');
        return 0;
      }
      
      const streak = parseInt(streakString, 10) || 0;
      const lastVisit = new Date(lastVisitString);
      const today = new Date();
      const daysDifference = this.getDaysDifference(lastVisit, today);
      
      console.log('📚 StreakService: Checking current hadith streak', {
        storedStreak: streak,
        lastVisit: lastVisitString,
        daysDifference
      });
      
      // If more than 1 day has passed, streak is broken
      if (daysDifference > 1) {
        console.log('📚 StreakService: Hadith streak broken due to gap, resetting to 0');
        await AsyncStorage.setItem(HADITH_STREAK_KEY, '0');
        return 0;
      }
      
      return streak;
      
    } catch (error) {
      console.error('📚 StreakService: Error getting current hadith streak:', error);
      return 0;
    }
  }
  
  /**
   * Gets hadith streak statistics for display
   * @returns {Promise<Object>} Object containing streak info and status
   */
  async getHadithStreakStats() {
    try {
      const currentStreak = await this.getCurrentHadithStreak();
      const lastVisitString = await AsyncStorage.getItem(HADITH_LAST_VISIT_KEY);
      
      let status = 'start'; // start, continue, broken
      let daysUntilBreak = 0;
      
      if (lastVisitString) {
        const lastVisit = new Date(lastVisitString);
        const today = new Date();
        const daysDifference = this.getDaysDifference(lastVisit, today);
        
        if (daysDifference === 0) {
          status = 'continue'; // Visited today
          daysUntilBreak = 0;
        } else if (daysDifference === 1) {
          status = 'continue'; // Can continue streak today
          daysUntilBreak = 0;
        } else {
          status = 'broken'; // Streak broken
          daysUntilBreak = daysDifference - 1;
        }
      }
      
      return {
        currentStreak,
        status,
        daysUntilBreak,
        lastVisit: lastVisitString,
        canContinueToday: status !== 'broken' && this.getDaysDifference(new Date(lastVisitString || 0), new Date()) <= 1
      };
      
    } catch (error) {
      console.error('📚 StreakService: Error getting hadith streak stats:', error);
      return {
        currentStreak: 0,
        status: 'start',
        daysUntilBreak: 0,
        lastVisit: null,
        canContinueToday: true,
        error: error.message
      };
    }
  }
  
  /**
   * Resets the hadith streak (for testing or user request)
   * @returns {Promise<boolean>} Success status
   */
  async resetHadithStreak() {
    try {
      await AsyncStorage.removeItem(HADITH_STREAK_KEY);
      await AsyncStorage.removeItem(HADITH_LAST_VISIT_KEY);
      console.log('📚 StreakService: Hadith streak reset successfully');
      return true;
    } catch (error) {
      console.error('📚 StreakService: Error resetting hadith streak:', error);
      return false;
    }
  }

  // ============ PRAYER STREAK METHODS ============
  
  /**
   * Records completion of all daily prayers and updates streak accordingly
   * @returns {Promise<Object>} Object containing current streak and whether it was updated
   */
  async recordPrayerCompletion() {
    try {
      const today = new Date();
      const todayString = this.getDateString(today);
      
      // Get last completion date and current streak
      const lastCompletionString = await AsyncStorage.getItem(PRAYER_LAST_VISIT_KEY);
      const currentStreak = await this.getCurrentPrayerStreak();
      
      console.log('🕌 StreakService: Recording Prayer completion', {
        today: todayString,
        lastCompletion: lastCompletionString,
        currentStreak
      });
      
      // If already completed today, no need to update
      if (lastCompletionString === todayString) {
        console.log('🕌 StreakService: Already completed today, streak unchanged');
        return {
          streak: currentStreak,
          updated: false,
          isNewDay: false
        };
      }
      
      let newStreak = 1; // Default to 1 for first completion or after break
      let isConsecutive = false;
      
      if (lastCompletionString) {
        const lastCompletion = new Date(lastCompletionString);
        const daysDifference = this.getDaysDifference(lastCompletion, today);
        
        console.log('🕌 StreakService: Days difference:', daysDifference);
        
        if (daysDifference === 1) {
          // Consecutive day - increment streak
          newStreak = currentStreak + 1;
          isConsecutive = true;
          console.log('🕌 StreakService: Consecutive day detected, incrementing streak');
        } else if (daysDifference === 0) {
          // Same day (shouldn't happen due to check above, but safety)
          newStreak = currentStreak;
          console.log('🕌 StreakService: Same day completion');
        } else {
          // Gap in completions - reset streak to 1
          newStreak = 1;
          console.log('🕌 StreakService: Gap detected, resetting streak to 1');
        }
      }
      
      // Save new streak and last completion date
      await AsyncStorage.setItem(PRAYER_STREAK_KEY, newStreak.toString());
      await AsyncStorage.setItem(PRAYER_LAST_VISIT_KEY, todayString);
      
      console.log('🕌 StreakService: Prayer streak updated', {
        newStreak,
        isConsecutive,
        savedSuccessfully: true
      });
      
      return {
        streak: newStreak,
        updated: true,
        isNewDay: true,
        isConsecutive
      };
      
    } catch (error) {
      console.error('🕌 StreakService: Error recording Prayer completion:', error);
      return {
        streak: 0,
        updated: false,
        isNewDay: false,
        error: error.message
      };
    }
  }
  
  /**
   * Gets the current Prayer completion streak
   * @returns {Promise<number>} Current streak count
   */
  async getCurrentPrayerStreak() {
    try {
      const streakString = await AsyncStorage.getItem(PRAYER_STREAK_KEY);
      const lastCompletionString = await AsyncStorage.getItem(PRAYER_LAST_VISIT_KEY);
      
      if (!streakString || !lastCompletionString) {
        console.log('🕌 StreakService: No prayer streak data found, returning 0');
        return 0;
      }
      
      const streak = parseInt(streakString, 10) || 0;
      const lastCompletion = new Date(lastCompletionString);
      const today = new Date();
      const daysDifference = this.getDaysDifference(lastCompletion, today);
      
      console.log('🕌 StreakService: Checking current prayer streak', {
        storedStreak: streak,
        lastCompletion: lastCompletionString,
        daysDifference
      });
      
      // If more than 1 day has passed, streak is broken
      if (daysDifference > 1) {
        console.log('🕌 StreakService: Prayer streak broken due to gap, resetting to 0');
        await AsyncStorage.setItem(PRAYER_STREAK_KEY, '0');
        return 0;
      }
      
      return streak;
      
    } catch (error) {
      console.error('🕌 StreakService: Error getting current prayer streak:', error);
      return 0;
    }
  }
  
  /**
   * Gets prayer streak statistics for display
   * @returns {Promise<Object>} Object containing streak info and status
   */
  async getPrayerStreakStats() {
    try {
      const currentStreak = await this.getCurrentPrayerStreak();
      const lastCompletionString = await AsyncStorage.getItem(PRAYER_LAST_VISIT_KEY);
      
      let status = 'start'; // start, continue, broken
      let daysUntilBreak = 0;
      
      if (lastCompletionString) {
        const lastCompletion = new Date(lastCompletionString);
        const today = new Date();
        const daysDifference = this.getDaysDifference(lastCompletion, today);
        
        if (daysDifference === 0) {
          status = 'continue'; // Completed today
          daysUntilBreak = 0;
        } else if (daysDifference === 1) {
          status = 'continue'; // Can continue streak today
          daysUntilBreak = 0;
        } else {
          status = 'broken'; // Streak broken
          daysUntilBreak = daysDifference - 1;
        }
      }
      
      return {
        currentStreak,
        status,
        daysUntilBreak,
        lastCompletion: lastCompletionString,
        canContinueToday: status !== 'broken' && this.getDaysDifference(new Date(lastCompletionString || 0), new Date()) <= 1
      };
      
    } catch (error) {
      console.error('🕌 StreakService: Error getting prayer streak stats:', error);
      return {
        currentStreak: 0,
        status: 'start',
        daysUntilBreak: 0,
        lastCompletion: null,
        canContinueToday: true,
        error: error.message
      };
    }
  }
  
  /**
   * Resets the prayer streak (for testing or user request)
   * @returns {Promise<boolean>} Success status
   */
  async resetPrayerStreak() {
    try {
      await AsyncStorage.removeItem(PRAYER_STREAK_KEY);
      await AsyncStorage.removeItem(PRAYER_LAST_VISIT_KEY);
      console.log('🕌 StreakService: Prayer streak reset successfully');
      return true;
    } catch (error) {
      console.error('🕌 StreakService: Error resetting prayer streak:', error);
      return false;
    }
  }
  
  /**
   * Helper function to get date string in YYYY-MM-DD format using local timezone
   * @param {Date} date - Date object
   * @returns {string} Date string
   */
  getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Helper function to calculate days difference between two dates using local calendar days
   * @param {Date} date1 - Earlier date
   * @param {Date} date2 - Later date
   * @returns {number} Days difference
   */
  getDaysDifference(date1, date2) {
    // Create new date objects at midnight to avoid time-of-day issues
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    
    const timeDifference = d2.getTime() - d1.getTime();
    return Math.floor(timeDifference / (1000 * 3600 * 24));
  }
  
  /**
   * Gets a motivational message based on streak count
   * @param {number} streak - Current streak count
   * @param {string} type - Type of streak ('quran', 'hadith', or 'prayer')
   * @returns {string} Motivational message
   */
  getStreakMessage(streak, type = 'quran') {
    let activity, emoji;
    
    switch (type) {
      case 'hadith':
        activity = 'Hadith reading';
        emoji = '📚';
        break;
      case 'prayer':
        activity = 'Prayer completion';
        emoji = '🕌';
        break;
      default:
        activity = 'Quran reading';
        emoji = '📖';
        break;
    }
    
    if (streak === 0) {
      return `Start your ${activity} journey today! ${emoji}`;
    } else if (streak === 1) {
      return 'Great start! Keep it up tomorrow! 🌟';
    } else if (streak < 7) {
      return `${streak} days strong! Building a beautiful habit! 💪`;
    } else if (streak < 30) {
      return `Amazing ${streak}-day streak! You're on fire! 🔥`;
    } else if (streak < 100) {
      return `Incredible ${streak}-day streak! Truly inspiring! ✨`;
    } else {
      return `Subhanallah! ${streak} days of consistent ${activity.toLowerCase()}! 🤲`;
    }
  }
}

export default new StreakService();
