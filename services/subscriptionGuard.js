import appleSubscriptionService from './appleSubscriptionService';

class SubscriptionGuard {
  constructor() {
    this.isChecking = false;
    this.lastCheck = null;
    this.checkInterval = 60 * 1000; // 1 minute
    this.cachedResult = undefined; // Cache the subscription result
  }

  // Check subscription status with caching
  async checkSubscriptionStatus() {
    console.log('🔍 SubscriptionGuard: checkSubscriptionStatus called');
    try {
      // Don't check too frequently - but return cached result instead of assuming true
      const now = Date.now();
      if (this.lastCheck && (now - this.lastCheck) < this.checkInterval && this.cachedResult !== undefined) {
        console.log('⏭️ SubscriptionGuard: Using cached subscription result');
        console.log('⏱️ Time since last check:', now - this.lastCheck, 'ms');
        console.log('📋 Cached result:', this.cachedResult);
        return this.cachedResult;
      }

      // Prevent concurrent checks - return cached result if available
      if (this.isChecking) {
        console.log('⏳ SubscriptionGuard: Check already in progress, using cached result...');
        if (this.cachedResult !== undefined) {
          console.log('📋 Using cached result during concurrent check:', this.cachedResult);
          return this.cachedResult;
        } else {
          console.log('⚠️ No cached result available, defaulting to false (not subscribed)');
          return false;
        }
      }

      this.isChecking = true;
      console.log('🔍 SubscriptionGuard: Starting fresh subscription check...');
      
      const isSubscribed = await appleSubscriptionService.checkSubscriptionStatus();
      this.lastCheck = now;
      this.cachedResult = isSubscribed; // Cache the result
      this.isChecking = false;
      
      console.log('✅ SubscriptionGuard: Status check complete:', { isSubscribed });
      console.log('📋 Result cached for future use:', isSubscribed);
      console.log('⏱️ Last check time updated to:', new Date(now).toISOString());
      return isSubscribed;
    } catch (error) {
      console.error('❌ SubscriptionGuard: Error checking status:', error);
      this.isChecking = false;
      return false;
    }
  }

  // Force check subscription status (ignores cache)
  async forceCheckSubscriptionStatus() {
    console.log('🔍 SubscriptionGuard: forceCheckSubscriptionStatus called');
    try {
      this.isChecking = true;
      console.log('🔍 SubscriptionGuard: Force checking status (bypassing cache)...');
      
      const isSubscribed = await appleSubscriptionService.checkSubscriptionStatus();
      this.lastCheck = Date.now();
      this.cachedResult = isSubscribed; // Cache the result
      this.isChecking = false;
      
      console.log('✅ SubscriptionGuard: Force check complete:', { isSubscribed });
      console.log('📋 Result cached for future use:', isSubscribed);
      console.log('⏱️ Last check time updated to:', new Date(this.lastCheck).toISOString());
      return isSubscribed;
    } catch (error) {
      console.error('❌ SubscriptionGuard: Error force checking status:', error);
      this.isChecking = false;
      return false;
    }
  }

  // Check if user should be redirected to subscription screen
  async shouldRedirectToSubscription() {
    console.log('🔍 SubscriptionGuard: shouldRedirectToSubscription called');
    const isSubscribed = await this.checkSubscriptionStatus();
    const shouldRedirect = !isSubscribed;
    console.log('📊 SubscriptionGuard: shouldRedirectToSubscription result:', { isSubscribed, shouldRedirect });
    return shouldRedirect;
  }

  // Get current checking status
  isCurrentlyChecking() {
    return this.isChecking;
  }

  // Get last check time
  getLastCheckTime() {
    return this.lastCheck;
  }

  // Debug: Reset cache state
  resetCache() {
    console.log('🔄 SubscriptionGuard: Resetting cache state');
    this.lastCheck = null;
    this.isChecking = false;
    this.cachedResult = undefined;
    console.log('✅ SubscriptionGuard: Cache reset complete');
  }
}

export default new SubscriptionGuard(); 