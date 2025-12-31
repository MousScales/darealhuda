import * as InAppPurchases from 'expo-in-app-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firestore } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const SUBSCRIPTION_ID = 'premium_monthly_999';

class AppleSubscriptionService {
  constructor() {
    this.isConnected = false;
    this.subscriptionStatus = false;
    this.listeners = [];
    this.isCheckingSubscription = false;
    this.checkPromise = null;
    this.listenerSet = false;
  }

  // Initialize the service
  async initialize() {
    try {
      // Check if already connected
      if (this.isConnected) {
        console.log('✅ Apple subscription service already initialized');
        return true;
      }

      try {
        await InAppPurchases.connectAsync();
        this.isConnected = true;
        console.log('✅ Apple subscription service initialized');
      } catch (connectError) {
        if (connectError.message.includes('Already connected')) {
          console.log('✅ Apple subscription service already connected');
          this.isConnected = true;
        } else {
          throw connectError;
        }
      }
      
      // Note: Purchase listener is now handled by the subscription screen
      // to avoid conflicts and ensure proper handling
      console.log('✅ Apple subscription service initialized (no purchase listener)');
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing Apple subscription service:', error);
      return false;
    }
  }

  // Check if user is currently subscribed
  async checkSubscriptionStatus() {
    // Prevent concurrent calls
    if (this.isCheckingSubscription) {
      console.log('⏳ Subscription check already in progress, waiting...');
      return this.checkPromise;
    }

    this.isCheckingSubscription = true;
    
    // Add timeout to prevent hanging promises
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Subscription check timeout'));
      }, 15000); // 15 second timeout
    });
    
    this.checkPromise = Promise.race([
      this._performSubscriptionCheck(),
      timeoutPromise
    ]);
    
    try {
      const result = await this.checkPromise;
      return result;
    } catch (error) {
      console.error('❌ Error in subscription check:', error);
      
      // If we get the "Must wait for promise to resolve" error, try to finish pending transactions
      if (error.message && error.message.includes('Must wait for promise to resolve')) {
        console.log('🛑 Detected pending purchase promise, attempting to finish transactions...');
        try {
          const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
          if (purchaseHistory && purchaseHistory.results) {
            for (const purchase of purchaseHistory.results) {
              if (purchase.transactionId) {
                await InAppPurchases.finishTransactionAsync(purchase, true);
              }
            }
          }
          console.log('✅ Successfully finished pending transactions');
        } catch (finishError) {
          console.log('⚠️ Error finishing transactions:', finishError);
        }
      }
      
      // If it's a timeout error, clear the promise state
      if (error.message && error.message.includes('timeout')) {
        console.log('⏰ Subscription check timed out, clearing state');
        this.checkPromise = null;
      }
      
      return false;
    } finally {
      this.isCheckingSubscription = false;
      this.checkPromise = null;
    }
  }

  async _performSubscriptionCheck() {
    try {
      // Initialize if not connected
      if (!this.isConnected) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.log('❌ Failed to initialize Apple subscription service');
          return false;
        }
      }

      // Get purchase history from Apple
      const history = await InAppPurchases.getPurchaseHistoryAsync();
      console.log('📋 Purchase history:', history.results);

      // Filter for our subscription
      const subscriptionPurchases = history.results.filter(
        (item) => item.productId === SUBSCRIPTION_ID
      );

      if (subscriptionPurchases.length === 0) {
        console.log('❌ No subscription purchases found');
        return false;
      }

      // Sort by purchase date to get the latest
      subscriptionPurchases.sort((a, b) => {
        const dateA = new Date(a.purchaseTime);
        const dateB = new Date(b.purchaseTime);
        return dateB - dateA;
      });

      const latestPurchase = subscriptionPurchases[0];
      console.log('📦 Latest subscription purchase:', latestPurchase);
      console.log('🔍 Purchase validation check:', {
        hasPurchase: !!latestPurchase,
        hasTransactionReceipt: !!latestPurchase?.transactionReceipt,
        hasProductId: !!latestPurchase?.productId,
        purchaseKeys: latestPurchase ? Object.keys(latestPurchase) : []
      });

      // Check if the subscription is still active
      if (latestPurchase && latestPurchase.transactionReceipt && latestPurchase.productId) {
        const isActive = await this.verifySubscriptionWithApple(latestPurchase);
        
        if (isActive) {
          // Save to Firebase for server-side verification
          await this.saveSubscriptionToFirebase(latestPurchase);
        }

        this.subscriptionStatus = isActive;
        this.notifyListeners(isActive);
        
        return isActive;
      } else {
        console.log('❌ No valid purchase found for Apple receipt validation');
        this.subscriptionStatus = false;
        this.notifyListeners(false);
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      
      // If we get the "Must wait for promise to resolve" error, try to finish pending transactions
      if (error.message && error.message.includes('Must wait for promise to resolve')) {
        console.log('🛑 Detected pending purchase promise in _performSubscriptionCheck, attempting to finish transactions...');
        try {
          const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
          if (purchaseHistory && purchaseHistory.results) {
            for (const purchase of purchaseHistory.results) {
              if (purchase.transactionId) {
                await InAppPurchases.finishTransactionAsync(purchase, true);
              }
            }
          }
          console.log('✅ Successfully finished pending transactions in _performSubscriptionCheck');
        } catch (finishError) {
          console.log('⚠️ Error finishing transactions in _performSubscriptionCheck:', finishError);
        }
      }
      
      return false;
    }
  }

  // Verify subscription with Apple's servers using Firebase Functions
  async verifySubscriptionWithApple(purchase) {
    try {
      console.log('🔍 verifySubscriptionWithApple called with:', {
        purchase: !!purchase,
        purchaseType: typeof purchase,
        purchaseKeys: purchase ? Object.keys(purchase) : [],
        transactionReceipt: purchase?.transactionReceipt ? 'EXISTS' : 'MISSING',
        productId: purchase?.productId || 'MISSING'
      });
      
      // Check if user is authenticated
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No user logged in for Apple receipt validation');
        return false;
      }
      
      console.log('🔍 User authenticated:', user.uid);
      
      // Check if purchase has required fields
      if (!purchase || !purchase.transactionReceipt || !purchase.productId) {
        console.log('❌ Purchase missing required fields:', {
          hasPurchase: !!purchase,
          hasTransactionReceipt: !!purchase?.transactionReceipt,
          hasProductId: !!purchase?.productId,
          purchaseKeys: purchase ? Object.keys(purchase) : []
        });
        return false;
      }
      
      console.log('✅ Purchase has required fields for validation');
      
      // Get the user's ID token to ensure authentication
      const idToken = await user.getIdToken();
      console.log('🔑 Got ID token for user:', user.uid);
      
      const functions = getFunctions();
      const validateReceipt = httpsCallable(functions, 'validateAppleReceipt');
      
      console.log('🔍 Validating receipt with Apple servers...');
      console.log('🔑 Using ID token for authentication');
      console.log('📦 Sending data to Firebase function:', {
        receiptDataLength: purchase.transactionReceipt?.length || 0,
        productId: purchase.productId,
        hasReceiptData: !!purchase.transactionReceipt,
        hasProductId: !!purchase.productId
      });
      
      const result = await validateReceipt({
        receiptData: purchase.transactionReceipt,
        productId: purchase.productId
      });
      
      const { data } = result;
      console.log('✅ Server-side validation result:', data);
      
      return data.isActive;
    } catch (error) {
      console.error('❌ Error verifying subscription with Apple servers:', error);
      return false;
    }
  }

  // Save subscription data to Firebase
  async saveSubscriptionToFirebase(purchase) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No user logged in');
        return false;
      }

      // Build subscription data, only including fields that exist
      const subscriptionData = {
        productId: purchase.productId,
        purchaseTime: purchase.purchaseTime,
        acknowledged: purchase.acknowledged || false,
        isActive: true,
        lastVerified: serverTimestamp(),
        platform: 'apple'
      };

      // Only add purchaseToken if it exists
      if (purchase.purchaseToken) {
        subscriptionData.purchaseToken = purchase.purchaseToken;
      }

      // Only add transactionId if it exists
      if (purchase.transactionId) {
        subscriptionData.transactionId = purchase.transactionId;
      }

      console.log('📦 Saving subscription data:', subscriptionData);

      await setDoc(doc(firestore, 'users', user.uid, 'subscription', 'apple'), subscriptionData);
      console.log('✅ Subscription saved to Firebase');
      
      return true;
    } catch (error) {
      console.error('❌ Error saving subscription to Firebase:', error);
      return false;
    }
  }

  // Handle successful purchase
  async handleSuccessfulPurchase(purchase) {
    try {
      console.log('✅ Handling successful purchase:', purchase);
      
      // Acknowledge the purchase
      await InAppPurchases.finishTransactionAsync(purchase, false);
      
      // Save to Firebase
      await this.saveSubscriptionToFirebase(purchase);
      
      // Update local status
      this.subscriptionStatus = true;
      this.notifyListeners(true);
      
      console.log('✅ Purchase handled successfully');
    } catch (error) {
      console.error('❌ Error handling purchase:', error);
    }
  }

  // Get subscription status from Firebase
  async getSubscriptionFromFirebase() {
    try {
      const user = auth.currentUser;
      if (!user) {
        return null;
      }

      const docRef = doc(firestore, 'users', user.uid, 'subscription', 'apple');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting subscription from Firebase:', error);
      return null;
    }
  }

  // Add listener for subscription status changes
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  notifyListeners(status) {
    this.listeners.forEach(listener => listener(status));
  }

  // Get current subscription status
  getSubscriptionStatus() {
    return this.subscriptionStatus;
  }

  // Cleanup
  async cleanup() {
    try {
      // Note: IAP connection is now managed by the subscription screen
      // to avoid conflicts with the purchase listener
      this.isConnected = false;
      this.listenerSet = false;
      console.log('✅ Apple subscription service cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up Apple subscription service:', error);
    }
  }

  // Force finish pending transactions to resolve promise conflicts
  async flushPendingPurchases() {
    try {
      console.log('🛑 Force finishing pending transactions...');
      const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
      if (purchaseHistory && purchaseHistory.results) {
        for (const purchase of purchaseHistory.results) {
          if (purchase.transactionId) {
            await InAppPurchases.finishTransactionAsync(purchase, true);
          }
        }
      }
      console.log('✅ Successfully finished pending transactions');
      return true;
    } catch (error) {
      console.error('❌ Error finishing pending transactions:', error);
      return false;
    }
  }

  // Debug function to manually check subscription
  async debugCheckSubscription() {
    try {
      console.log('🔍 Debug: Checking Apple subscription status...');
      
      // Initialize if not connected
      if (!this.isConnected) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.log('❌ Debug: Failed to initialize Apple subscription service');
          return false;
        }
      }

      // Get purchase history
      const history = await InAppPurchases.getPurchaseHistoryAsync();
      console.log('📋 Debug: Purchase history:', history.results);

      // Filter for our subscription
      const subscriptionPurchases = history.results.filter(
        (item) => item.productId === SUBSCRIPTION_ID
      );

      console.log('📦 Debug: Subscription purchases found:', subscriptionPurchases.length);

      if (subscriptionPurchases.length > 0) {
        // Sort by purchase date
        subscriptionPurchases.sort((a, b) => {
          const dateA = new Date(a.purchaseTime);
          const dateB = new Date(b.purchaseTime);
          return dateB - dateA;
        });

        const latestPurchase = subscriptionPurchases[0];
        console.log('📦 Debug: Latest purchase:', {
          productId: latestPurchase.productId,
          purchaseTime: new Date(latestPurchase.purchaseTime),
          acknowledged: latestPurchase.acknowledged,
          purchaseToken: latestPurchase.purchaseToken,
          hasTransactionReceipt: !!latestPurchase.transactionReceipt,
          transactionReceiptLength: latestPurchase.transactionReceipt?.length || 0
        });

        // Check if active
        if (latestPurchase && latestPurchase.transactionReceipt && latestPurchase.productId) {
          const isActive = await this.verifySubscriptionWithApple(latestPurchase);
          console.log('✅ Debug: Subscription is active:', isActive);
          return isActive;
        } else {
          console.log('❌ Debug: Latest purchase missing required fields for validation');
          return false;
        }
      } else {
        console.log('❌ Debug: No subscription purchases found');
        return false;
      }
    } catch (error) {
      console.error('❌ Debug: Error checking subscription:', error);
      return false;
    }
  }
}

export default new AppleSubscriptionService(); 