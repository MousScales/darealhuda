import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  SafeAreaView,
  Image,
  Linking,
  FlatList,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as InAppPurchases from 'expo-in-app-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firestore } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import appleSubscriptionService from '../services/appleSubscriptionService';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import InvertLantern from '../assets/invert.png';
import { getDynamicFontSize, getDynamicPadding, getResponsiveTextStyle } from '../utils/responsiveText';

const { width } = Dimensions.get('window');
const MONTHLY_SUBSCRIPTION_ID = 'premium_monthly_999';
const YEARLY_SUBSCRIPTION_ID = 'premium_yearly_80'; // Yearly subscription ID
// Promotional product IDs
const PROMOTIONAL_MONTHLY_ID = 'premium_monthly_promo';
const PROMOTIONAL_YEARLY_ID = 'premium_yearly_offer';

export default function SubscriptionModal({ visible, onClose, onSubscribeSuccess, feature, isPromotional = false }) {
  const { currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [purchaseSuccessful, setPurchaseSuccessful] = useState(false);
  const [products, setProducts] = useState([]);
  const [hasExistingSubscription, setHasExistingSubscription] = useState(false);
  const [purchaseCancelled, setPurchaseCancelled] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [selectedSubscriptionType, setSelectedSubscriptionType] = useState('yearly'); // 'monthly' or 'yearly'
  const carouselRef = useRef(null);
  const autoScrollTimer = useRef(null);
  const isUserScrolling = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  
  // Night sky animation refs
  const starAnimations = useRef([]);
  
  // Reviews data
  const reviews = [
    { name: 'Amina', rating: 5, text: 'The Quran tafsir and commentary feature helped me understand verses I\'ve been reading for years. Alhamdulillah!' },
    { name: 'Omar', rating: 5, text: 'Recording my recitation and tracking progress helped me memorize more surahs than ever before.' },
    { name: 'Fatima', rating: 4.5, text: 'As a new Muslim, the unlimited Islamic lessons made learning so much easier. Highly recommend!' },
    { name: 'Yusuf', rating: 5, text: 'The guided prayers feature improved my salah significantly. Barakallahu feekum!' },
    { name: 'Mariam', rating: 4, text: 'Love recording my Quran recitation - it helps me hear my improvement over time.' },
    { name: 'Khalid', rating: 5, text: 'The complete Quran tafsir deepened my understanding in ways I never imagined.' },
    { name: 'Layla', rating: 4.5, text: 'Hudā became essential to my daily routine. The expert guidance is invaluable!' },
    { name: 'Hassan', rating: 5, text: 'The unlimited lessons and detailed commentary are exactly what I needed. Jazakallahu khairan!' },
    { name: 'Zainab', rating: 4, text: 'Guided prayers helped me establish a consistent prayer routine. Mashallah!' },
    { name: 'Ibrahim', rating: 5, text: 'This app transformed my relationship with the Quran. May Allah reward the creators.' },
    { name: 'Aisha', rating: 4.5, text: 'Tracking my recitation progress motivates me to read more daily. Alhamdulillah!' },
    { name: 'Muhammad', rating: 5, text: 'Best Islamic app I\'ve used. The tafsir explanations are incredibly detailed and clear.' },
    { name: 'Safiya', rating: 4, text: 'The personal recording feature helps me perfect my tajweed. Invaluable tool!' },
    { name: 'Abdul', rating: 5, text: 'Hudā helped me connect with my deen in ways I never imagined possible.' },
    { name: 'Noor', rating: 4.5, text: 'The combination of lessons, recordings, and progress tracking is perfect for my learning.' },
  ];
  
  const reviewsScrollAnim = useRef(new Animated.Value(0)).current;
  
  // Debug logging for modal visibility and feature
  useEffect(() => {
    console.log('🔍 SubscriptionModal: visible changed to:', visible);
    console.log('🔍 SubscriptionModal: feature prop received:', feature);
    console.log('🔍 SubscriptionModal: isPromotional prop:', isPromotional);
    console.log('🔍 SubscriptionModal: currentLanguage:', currentLanguage);
  }, [visible, feature, isPromotional, currentLanguage]);
  
  // Bounce animation for three dots
  const bounceAnim = useRef(new Animated.Value(0)).current;
  // Pulse animation for subscribe button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Add ref to track current purchase promise
  const currentPurchasePromise = useRef(null);
  const isPurchaseCancelled = useRef(false);

  // Get feature-specific content - completely rewritten for clarity
  const getFeatureContent = () => {
    // Only log when modal is visible to reduce noise
    if (visible) {
      console.log('🔍 SubscriptionModal: getFeatureContent called with feature:', feature);
    }
    
    // Validate feature prop
    if (!feature) {
      console.error('❌ SubscriptionModal: No feature prop provided, using general');
      feature = 'general';
    }
    
    const content = {
      tafsir: {
        title: t('unlockTafsir', currentLanguage),
        subtitle: t('tafsirSubtitle', currentLanguage),
        description: t('tafsirDescription', currentLanguage),
        features: [
          { emoji: '📖', text: t('completeQuranTafsir', currentLanguage) },
          { emoji: '🔍', text: t('detailedCommentary', currentLanguage) },
          { emoji: '📚', text: t('unlimitedLessons', currentLanguage) },
          { emoji: '🕌', text: t('guidedPrayers', currentLanguage) },
          { emoji: '🎤', text: t('personalRecordings', currentLanguage) },
          { emoji: '📊', text: t('progressTracking', currentLanguage) },
          { emoji: '📱', text: t('dailyQuranWidgets', currentLanguage) }
        ]
      },
      lessons: {
        title: t('unlockLessons', currentLanguage),
        subtitle: t('lessonsSubtitle', currentLanguage),
        description: t('lessonsDescription', currentLanguage),
        features: [
          { emoji: '📚', text: t('unlimitedLessons', currentLanguage) },
          { emoji: '🎓', text: t('expertGuidance', currentLanguage) },
          { emoji: '📖', text: t('comprehensiveTopics', currentLanguage) },
          { emoji: '🔄', text: t('interactiveLearning', currentLanguage) },
          { emoji: '🕌', text: t('guidedPrayers', currentLanguage) },
          { emoji: '🎤', text: t('personalRecordings', currentLanguage) },
          { emoji: '📱', text: t('dailyQuranWidgets', currentLanguage) }
        ]
      },
      guidedPrayer: {
        title: t('unlockGuidedPrayer', currentLanguage),
        subtitle: t('guidedPrayerSubtitle', currentLanguage),
        description: t('guidedPrayerDescription', currentLanguage),
        features: [
          { emoji: '🕌', text: t('guidedPrayers', currentLanguage) },
          { emoji: '🎧', text: t('audioGuidance', currentLanguage) },
          { emoji: '📚', text: t('unlimitedLessons', currentLanguage) },
          { emoji: '📖', text: t('completeQuranTafsir', currentLanguage) },
          { emoji: '🎤', text: t('personalRecordings', currentLanguage) },
          { emoji: '📊', text: t('progressTracking', currentLanguage) },
          { emoji: '📱', text: t('dailyQuranWidgets', currentLanguage) }
        ]
      },
      recording: {
        title: t('unlockRecording', currentLanguage),
        subtitle: t('recordingSubtitle', currentLanguage),
        description: t('recordingDescription', currentLanguage),
        features: [
          { emoji: '🎤', text: t('personalRecordings', currentLanguage) },
          { emoji: '📊', text: t('progressTracking', currentLanguage) },
          { emoji: '📖', text: t('tajweedPractice', currentLanguage) },
          { emoji: '📚', text: t('unlimitedLessons', currentLanguage) },
          { emoji: '🕌', text: t('guidedPrayers', currentLanguage) },
          { emoji: '🎓', text: t('expertGuidance', currentLanguage) },
          { emoji: '📱', text: t('dailyQuranWidgets', currentLanguage) }
        ]
      },
      general: {
        title: t('subscribeForMoreFeatures', currentLanguage),
        subtitle: t('premiumSubscriptionUnlocks', currentLanguage),
        description: t('generalDescription', currentLanguage),
        features: [
          { emoji: '🕌', text: t('guidedPrayers', currentLanguage) },
          { emoji: '📚', text: t('unlimitedLessons', currentLanguage) },
          { emoji: '📖', text: t('completeQuranTafsir', currentLanguage) },
          { emoji: '🎤', text: t('personalRecordings', currentLanguage) },
          { emoji: '📊', text: t('progressTracking', currentLanguage) },
          { emoji: '🎓', text: t('expertGuidance', currentLanguage) },
          { emoji: '📱', text: t('dailyQuranWidgets', currentLanguage) }
        ]
      }
    };
    
    const selectedContent = content[feature] || content.general;
    
    // Only log when modal is visible to reduce noise
    if (visible) {
      console.log('🔍 SubscriptionModal: Selected content for feature:', feature, selectedContent);
    }
    
    return selectedContent;
  };

  // Only generate content when modal is visible to avoid unnecessary re-renders
  const featureContent = visible ? getFeatureContent() : { title: '', subtitle: '', description: '', features: [] };
  
  if (visible) {
    console.log('🔍 SubscriptionModal: Final featureContent:', {
      title: featureContent.title,
      subtitle: featureContent.subtitle,
      description: featureContent.description,
      featuresCount: featureContent.features.length
    });
  }

  // Animate fade overlay when processing
  useEffect(() => {
    if (processing) {
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [processing]);

  // Night sky animation - twinkling stars
  useEffect(() => {
    if (!visible) return;
    
    // Create multiple stars with random positions
    const numStars = 40;
    const screenHeight = Dimensions.get('window').height;
    starAnimations.current = Array.from({ length: numStars }, () => ({
      opacity: new Animated.Value(Math.random() * 0.3 + 0.4),
      scale: new Animated.Value(1),
      rotate: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      x: Math.random() * width,
      y: Math.random() * screenHeight,
    }));

    // Animate each star to twinkle, pulse, rotate, and move subtly
    const twinkleAnimations = starAnimations.current.map((star, index) => {
      // Twinkle animation
      const twinkle = Animated.loop(
        Animated.sequence([
          Animated.timing(star.opacity, {
            toValue: Math.random() * 0.2 + 0.7,
            duration: Math.random() * 2000 + 1000,
            useNativeDriver: true,
          }),
          Animated.timing(star.opacity, {
            toValue: Math.random() * 0.15 + 0.3,
            duration: Math.random() * 2000 + 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Pulse/scale animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(star.scale, {
            toValue: Math.random() * 0.3 + 1.2,
            duration: Math.random() * 3000 + 2000,
            useNativeDriver: true,
          }),
          Animated.timing(star.scale, {
            toValue: 1,
            duration: Math.random() * 3000 + 2000,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Rotation animation (swirl)
      const rotateDirection = index % 2 === 0 ? 1 : -1;
      const rotate = Animated.loop(
        Animated.timing(star.rotate, {
          toValue: rotateDirection,
          duration: Math.random() * 10000 + 5000,
          useNativeDriver: true,
        })
      );
      
      // Subtle movement animation
      const moveX = Animated.loop(
        Animated.sequence([
          Animated.timing(star.translateX, {
            toValue: Math.random() * 10 + 5,
            duration: Math.random() * 4000 + 2000,
            useNativeDriver: true,
          }),
          Animated.timing(star.translateX, {
            toValue: 0,
            duration: Math.random() * 4000 + 2000,
            useNativeDriver: true,
          }),
        ])
      );
      
      const moveY = Animated.loop(
        Animated.sequence([
          Animated.timing(star.translateY, {
            toValue: Math.random() * 10 + 5,
            duration: Math.random() * 4000 + 2000,
            useNativeDriver: true,
          }),
          Animated.timing(star.translateY, {
            toValue: 0,
            duration: Math.random() * 4000 + 2000,
            useNativeDriver: true,
          }),
        ])
      );
      
      twinkle.start();
      pulse.start();
      rotate.start();
      moveX.start();
      moveY.start();
      
      return { twinkle, pulse, rotate, moveX, moveY };
    });

    return () => {
      twinkleAnimations.forEach(anims => {
        anims.twinkle.stop();
        anims.pulse.stop();
        anims.rotate.stop();
        anims.moveX.stop();
        anims.moveY.stop();
      });
    };
  }, [visible]);

  // Auto-scroll feature list
  useEffect(() => {
    if (!visible) return;
    
    const scrollTimeout = setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: 150,
          animated: true,
        });
      }
    }, 2000); // Start scrolling after 2 seconds

    return () => {
      clearTimeout(scrollTimeout);
    };
  }, [visible]);

  // Auto-scroll reviews
  useEffect(() => {
    if (!visible) return;
    
    reviewsScrollAnim.setValue(0);
    const scrollAnimation = Animated.loop(
      Animated.timing(reviewsScrollAnim, {
        toValue: -1,
        duration: 30000, // 30 seconds for full scroll
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    scrollAnimation.start();
    
    return () => {
      scrollAnimation.stop();
    };
  }, [visible]);

  // Handle opening Terms of Service
  const openTermsOfService = () => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  };

  // Handle opening Privacy Policy
  const openPrivacyPolicy = () => {
    Linking.openURL('https://www.mouslifejournal.com/privacy.html');
  };

  // Handle redeem code
  const handleRedeemCode = () => {
    if (Platform.OS === 'ios') {
      // Open the App Store redeem page using the iOS URL scheme
      // This opens the native redeem code interface
      Linking.openURL('https://apps.apple.com/redeem')
        .catch(err => {
          console.error('Error opening redeem code page:', err);
          // Fallback: try alternative URL
          Linking.openURL('https://buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/freeProductCodeWizard')
            .catch(err2 => {
              console.error('Fallback URL also failed:', err2);
              Alert.alert(
                t('error', currentLanguage) || 'Error',
                'Could not open redeem code page. Please open the App Store and tap on your profile icon, then tap "Redeem Gift Card or Code".'
              );
            });
        });
    } else {
      Alert.alert(
        'Not Available',
        'Redeem codes are only available on iOS devices.'
      );
    }
  };

  // Handle modal close with purchase cancellation
  const handleClose = async () => {
    console.log('❌ SubscriptionModal: Close button pressed');
    
    // If there's a purchase in progress, cancel it
    if (processing && currentPurchasePromise.current) {
      console.log('🛑 Cancelling purchase due to modal close');
      setProcessing(false);
      setPurchaseCancelled(true);
      isPurchaseCancelled.current = true;
      currentPurchasePromise.current = null;
      
      // Clear pending purchase flag
      AsyncStorage.removeItem('pendingPurchase');
      
      // Try to finish any pending transactions to clean up the state
      try {
        const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
        if (purchaseHistory && purchaseHistory.results) {
          for (const purchase of purchaseHistory.results) {
            if (purchase.transactionId) {
              await InAppPurchases.finishTransactionAsync(purchase, true);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error finishing transactions after cancellation:', error);
      }
    }
    
    onClose();
  };

  // Handle restore purchases
  const handleRestorePurchases = async () => {
    try {
      console.log('🔄 Starting restore purchases...');
      
      // Ensure we're connected to App Store
      try {
        await InAppPurchases.connectAsync();
      } catch (connectError) {
        if (!connectError.message.includes('Already connected')) {
          throw connectError;
        }
      }
      
      // Restore purchases
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results.length > 0) {
        console.log('✅ Found purchase history:', results.length, 'purchases');
        
        // Check if any of the restored purchases are valid subscriptions
        for (const purchase of results) {
          if (purchase.productId === MONTHLY_SUBSCRIPTION_ID || purchase.productId === YEARLY_SUBSCRIPTION_ID || 
              purchase.productId === PROMOTIONAL_MONTHLY_ID || purchase.productId === PROMOTIONAL_YEARLY_ID) {
            console.log('✅ Found valid subscription in history');
            
            // Verify with Apple
            try {
              const functions = getFunctions();
              const verifyReceipt = httpsCallable(functions, 'verifyAppleReceipt');
              const result = await verifyReceipt({ 
                receiptData: purchase.transactionReceipt,
                productId: purchase.productId
              });
              
              if (result.data.valid) {
                console.log('✅ Receipt verified with Apple');
                
                // Update user subscription status
                const user = auth.currentUser;
                if (user) {
                  await setDoc(doc(firestore, 'users', user.uid), {
                    subscriptionStatus: 'active',
                    subscriptionType: 'premium',
                    subscriptionStartDate: serverTimestamp(),
                    lastUpdated: serverTimestamp(),
                    appleTransactionId: purchase.transactionId,
                    appleOriginalTransactionId: purchase.originalTransactionIdentifierIOS
                  }, { merge: true });
                  
                  console.log('✅ User subscription status updated');
                  setHasExistingSubscription(true);
                  setIsSubscribed(true);
                  
                  Alert.alert(
                    t('subscriptionRestored', currentLanguage), 
                    t('subscriptionRestoredMessage', currentLanguage)
                  );
                  
                  // Close modal after successful restore
                  setTimeout(() => {
                    onClose();
                  }, 1500);
                  
                  return;
                }
              }
            } catch (verifyError) {
              console.log('⚠️ Receipt verification failed:', verifyError);
            }
          }
        }
        
        Alert.alert(
          t('noValidSubscription', currentLanguage), 
          t('noValidSubscriptionMessage', currentLanguage)
        );
      } else {
        console.log('❌ No purchase history found');
        Alert.alert(
          t('noPurchasesFound', currentLanguage), 
          t('noPurchasesFoundMessage', currentLanguage)
        );
      }
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      Alert.alert(
        t('restoreError', currentLanguage), 
        t('restoreErrorMessage', currentLanguage)
      );
    }
  };

  // Initialize IAP when modal becomes visible
  useEffect(() => {
    if (!visible) return;
    
    const initIAP = async () => {
      try {
        console.log('🔌 Initializing IAP...');
        
        // Set up a timeout for the initialization
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('IAP initialization timeout')), 10000);
        });
        
        await Promise.race([
          (async () => {
            // Connect to App Store
            try {
              await InAppPurchases.connectAsync();
              console.log('✅ Connected to App Store');
            } catch (connectError) {
              if (connectError.message.includes('Already connected')) {
                console.log('✅ Already connected to App Store');
              } else {
                throw connectError;
              }
            }
            
            // Check for existing subscription
            const user = auth.currentUser;
            if (user) {
              try {
                const userDoc = await getDoc(doc(firestore, 'users', user.uid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  if (userData.subscriptionStatus === 'active') {
                    console.log('✅ User has active subscription - closing modal immediately');
                    setHasExistingSubscription(true);
                    setIsSubscribed(true);
                    // Automatically close modal if user is subscribed
                    setTimeout(() => {
                      onClose();
                    }, 100);
                    return;
                  }
                }
              } catch (userError) {
                console.log('⚠️ Error checking user subscription:', userError);
              }
            }
            
            // Also check using subscriptionGuard for additional verification
            try {
              const subscriptionGuard = require('../services/subscriptionGuard').default;
              subscriptionGuard.resetCache();
              const isSubscribed = await subscriptionGuard.forceCheckSubscriptionStatus();
              if (isSubscribed) {
                console.log('✅ SubscriptionGuard confirms user is subscribed - closing modal immediately');
                setIsSubscribed(true);
                setHasExistingSubscription(true);
                // Automatically close modal if user is subscribed
                setTimeout(() => {
                  onClose();
                }, 100);
                return;
              }
            } catch (guardError) {
              console.log('⚠️ Error checking subscription with guard:', guardError);
            }
            
            // Finish any pending transactions
            try {
              const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
              if (purchaseHistory && purchaseHistory.results) {
                for (const purchase of purchaseHistory.results) {
                  if (purchase.transactionId) {
                    await InAppPurchases.finishTransactionAsync(purchase, true);
                  }
                }
              }
              console.log('✅ Finished pending transactions');
            } catch (finishError) {
              console.log('⚠️ Finish error (non-critical):', finishError.message);
            }
            
            // Quick subscription check in background
            appleSubscriptionService.checkSubscriptionStatus().then(isUserSubscribed => {
              setIsSubscribed(isUserSubscribed);
              console.log('⚡ Quick subscription check:', { isUserSubscribed });
            }).catch(error => {
              console.log('⚠️ Background subscription check error:', error);
            });
          })(),
          timeoutPromise
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('❌ Error initializing IAP:', error);
        // Don't fail completely - just log the error and continue
        setLoading(false);
      }
    };
    
    initIAP();
    
    // Don't disconnect on cleanup to avoid conflicts with global listener
    return () => {
      // Cleanup handled by global listener in App.js
    };
  }, [visible]);

  // Step 2: Get product details (before showing popup)
  useEffect(() => {
    if (!visible || loading) return;
    
    const getProducts = async () => {
      try {
        // Ensure we're connected before getting products
        try {
          await InAppPurchases.connectAsync();
        } catch (connectError) {
          if (!connectError.message.includes('Already connected')) {
            throw connectError;
          }
        }
        
        const productIds = isPromotional 
          ? [PROMOTIONAL_MONTHLY_ID, PROMOTIONAL_YEARLY_ID]
          : [MONTHLY_SUBSCRIPTION_ID, YEARLY_SUBSCRIPTION_ID];
        const { responseCode, results } = await InAppPurchases.getProductsAsync(productIds);
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results.length > 0) {
          setProducts(results);
          console.log('✅ Products loaded:', results.map(p => ({ title: p.title, price: p.price })));
        } else {
          console.log('❌ Product not found or error loading product');
          // Set empty products array to show fallback UI
          setProducts([]);
        }
      } catch (error) {
        console.error('❌ Error loading products:', error);
        // Set empty products array to show fallback UI
        setProducts([]);
      }
    };
    
    getProducts();
  }, [visible, loading, isPromotional]);

  // Set up purchase success handling
  useEffect(() => {
    // Simple success handler that just closes the modal
    const handlePurchaseSuccess = () => {
      console.log('🎯 Purchase success - closing modal');
      setProcessing(false);
      setPurchaseSuccessful(true);
      
      // Clear pending purchase flag
      AsyncStorage.removeItem('pendingPurchase');
      
      // Close modal after successful purchase
      setTimeout(() => {
        onClose();
      }, 1000);
    };

    // Make it available globally for the purchase listener
    window.handlePurchaseSuccess = handlePurchaseSuccess;

    return () => {
      // Clean up global callback
      delete window.handlePurchaseSuccess;
    };
  }, [onClose]);

  // Cleanup effect to handle component unmounting
  useEffect(() => {
    return () => {
      // If component unmounts while purchase is in progress, clean up
      if (processing && currentPurchasePromise.current) {
        console.log('🛑 Component unmounting - cleaning up purchase state');
        setProcessing(false);
        isPurchaseCancelled.current = true;
        currentPurchasePromise.current = null;
        
        // Clear pending purchase flag
        AsyncStorage.removeItem('pendingPurchase');
        
        // Try to finish any pending transactions to clean up the state
        InAppPurchases.getPurchaseHistoryAsync().then(purchaseHistory => {
          if (purchaseHistory && purchaseHistory.results) {
            purchaseHistory.results.forEach(purchase => {
              if (purchase.transactionId) {
                InAppPurchases.finishTransactionAsync(purchase, true).catch(error => {
                  console.log('⚠️ Error finishing transaction after unmount:', error);
                });
              }
            });
          }
        }).catch(error => {
          console.log('⚠️ Error getting purchase history after unmount:', error);
        });
      }
    };
  }, [processing]);

  // Bounce animation for processing state
  useEffect(() => {
    if (processing) {
      const startBounce = () => {
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          })
        ]).start(() => {
          if (processing) {
            startBounce();
          }
        });
      };
      startBounce();
    } else {
      bounceAnim.setValue(0);
    }
  }, [processing]);

  // Pulse animation for subscribe button
  useEffect(() => {
    const startPulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start(() => {
        startPulse();
      });
    };
    startPulse();
  }, []);

  // Step 3: On subscription button click – request purchase
  const handleSubscribe = async (subscriptionType) => {
    if (processing) {
      console.log('⏳ Purchase already in progress...');
      return;
    }
    
    // Set the selected subscription type
    setSelectedSubscriptionType(subscriptionType);
    
    setProcessing(true);
    setPurchaseCancelled(false); // Reset cancellation flag for new purchase
    isPurchaseCancelled.current = false; // Reset cancellation ref for new purchase
    
    try {
      // Determine which subscription ID to use
      const subscriptionId = isPromotional 
        ? (subscriptionType === 'yearly' ? PROMOTIONAL_YEARLY_ID : PROMOTIONAL_MONTHLY_ID)
        : (subscriptionType === 'yearly' ? YEARLY_SUBSCRIPTION_ID : MONTHLY_SUBSCRIPTION_ID);
      
      console.log('🛒 Starting purchase for:', subscriptionType, 'with ID:', subscriptionId);
      
      // Set a flag to indicate purchase is in progress
      await AsyncStorage.setItem('pendingPurchase', 'true');
      
      // First, ensure we're connected to the App Store
      console.log('🔌 Ensuring connection to App Store...');
      try {
        await InAppPurchases.connectAsync();
      } catch (connectError) {
        if (!connectError.message.includes('Already connected')) {
          throw connectError;
        }
      }
      
      // Get the product details
      console.log('📦 Fetching product:', subscriptionId);
      const { responseCode, results } = await InAppPurchases.getProductsAsync([subscriptionId]);
      console.log('📦 Product fetch response:', responseCode, 'Results:', results.length);
      
      if (responseCode !== InAppPurchases.IAPResponseCode.OK || results.length === 0) {
        console.error('❌ Product not available. ResponseCode:', responseCode, 'Results:', results);
        throw new Error(`Product not available: ${subscriptionId} (ResponseCode: ${responseCode})`);
      }
      
      const product = results[0];
      console.log('🛒 Purchasing product:', product.title, 'for', product.price);
      
      // Request the purchase
      const purchasePromise = InAppPurchases.purchaseItemAsync(product.productId);
      currentPurchasePromise.current = purchasePromise;
      
      const purchaseResult = await purchasePromise;
      currentPurchasePromise.current = null;
      
      console.log('📦 Purchase result:', purchaseResult);
      
      if (!purchaseResult || !purchaseResult.responseCode) {
        // Check if purchase just succeeded to avoid showing failed alert
        const purchaseJustSucceeded = await AsyncStorage.getItem('purchaseJustSucceeded');
        if (purchaseJustSucceeded === 'true') {
          console.log('✅ Purchase already succeeded, skipping failed alert');
          setProcessing(false);
          return;
        }
        
        console.log('❌ Purchase not found in history');
        setProcessing(false);
        // Only show alert if purchase wasn't cancelled by user
        if (!purchaseCancelled && !isPurchaseCancelled.current) {
          Alert.alert(t('purchaseFailed', currentLanguage), t('purchaseNotCompleted', currentLanguage));
        }
        return;
      }
      
      if (purchaseResult && purchaseResult.responseCode === InAppPurchases.IAPResponseCode.OK) {
        console.log('✅ Purchase successful!');
        setProcessing(false);
        setPurchaseSuccessful(true);
        
        // Set flag to prevent any failed alerts after success
        await AsyncStorage.setItem('purchaseJustSucceeded', 'true');
        
        // Handle successful purchase
        if (window.handlePurchaseSuccess) {
          window.handlePurchaseSuccess();
        }
        
        setTimeout(() => {
          onClose();
          // Clear the flag after modal closes
          AsyncStorage.removeItem('purchaseJustSucceeded');
        }, 1000);
      } else {
        // Check if purchase just succeeded to avoid showing failed alert
        const purchaseJustSucceeded = await AsyncStorage.getItem('purchaseJustSucceeded');
        if (purchaseJustSucceeded === 'true') {
          console.log('✅ Purchase already succeeded, skipping failed alert');
          return;
        }
        
        console.log('❌ Purchase failed:', purchaseResult);
        setProcessing(false);
        // Only show alert if purchase wasn't cancelled by user
        if (!purchaseCancelled && !isPurchaseCancelled.current) {
          Alert.alert(t('purchaseFailed', currentLanguage), t('purchaseNotCompleted', currentLanguage));
        }
      }
    } catch (purchaseError) {
      console.error('❌ Purchase error:', purchaseError);
      setProcessing(false);
      currentPurchasePromise.current = null;
      
      // Handle the specific "Must wait for promise to resolve" error
      if (purchaseError.message && purchaseError.message.includes('Must wait for promise to resolve')) {
        console.log('🛑 Detected promise conflict, attempting to flush pending purchases...');
        try {
          // Try to finish any pending transactions
          const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
          if (purchaseHistory && purchaseHistory.results) {
            for (const purchase of purchaseHistory.results) {
              if (purchase.transactionId) {
                await InAppPurchases.finishTransactionAsync(purchase, true);
              }
            }
          }
          console.log('✅ Successfully finished pending transactions');
        } catch (flushError) {
          console.log('⚠️ Error finishing transactions:', flushError);
        }
        
        // Clear the pending purchase flag
        await AsyncStorage.removeItem('pendingPurchase');
        
        // Don't show error alert for this specific case
        return;
      }
      
      // Check if purchase just succeeded to avoid showing failed alert
      const purchaseJustSucceeded = await AsyncStorage.getItem('purchaseJustSucceeded');
      if (purchaseJustSucceeded === 'true') {
        console.log('✅ Purchase already succeeded, skipping error alert');
        return;
      }
      
      // Only show alert if purchase wasn't cancelled by user
      if (!purchaseCancelled && !isPurchaseCancelled.current) {
        Alert.alert(t('purchaseError', currentLanguage), purchaseError.message || t('couldNotCompletePurchase', currentLanguage));
      }
    }
  };

  // Show loading state if still initializing, but with a timeout fallback
  if (loading) {
    // Add a fallback to show the modal content even if loading takes too long
    setTimeout(() => {
      if (loading) {
        console.log('⚠️ Loading timeout, forcing modal to show content');
        setLoading(false);
      }
    }, 5000); // 5 second fallback
    
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <LinearGradient colors={["#000", "#181818"]} style={styles.gradient}>
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleClose}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.placeholder} />
            </View>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={[
                styles.loadingText,
                getResponsiveTextStyle(t('loadingSubscriptionOptions', currentLanguage), 18, currentLanguage, width - 40)
              ]}>
                {t('loadingSubscriptionOptions', currentLanguage)}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <LinearGradient colors={["#000", "#181818"]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          {/* Night Sky Animation */}
          <View style={styles.nightSkyContainer} pointerEvents="none">
            {/* Twinkling Stars */}
            {starAnimations.current.map((star, index) => (
              <Animated.View
                key={`star-${index}`}
                style={[
                  styles.star,
                  {
                    left: star.x,
                    top: star.y,
                    opacity: star.opacity,
                    transform: [
                      { scale: star.scale },
                      {
                        rotate: star.rotate.interpolate({
                          inputRange: [-1, 0, 1],
                          outputRange: ['-360deg', '0deg', '360deg'],
                        }),
                      },
                      { translateX: star.translateX },
                      { translateY: star.translateY },
                    ],
                  },
                ]}
              />
            ))}
            
          </View>

          {/* Fade Overlay when processing */}
          {processing && (
            <Animated.View 
              style={[
                styles.fadeOverlay,
                {
                  opacity: fadeAnim,
                }
              ]}
            />
          )}
          {/* Header with Close Button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}></Text>
            <View style={styles.placeholder} />
          </View>

          {/* Fixed Header */}
          <View style={styles.subscriptionHeader}>
            {/* Promotional Banner */}
            {isPromotional && (
              <View style={styles.promotionalBanner}>
                <View style={styles.ribbonBodyLong}>
                  <Text style={styles.promotionalBannerText}>PROMOTION!</Text>
                </View>
              </View>
            )}
            <View style={styles.logoContainer}>
              <Image source={InvertLantern} style={styles.lanternIcon} />
              <Text style={styles.appName}>Hudā Premium</Text>
              {featureContent.subtitle && (
                <Text style={styles.subtitleText}>{featureContent.subtitle}</Text>
              )}
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Feature List */}
            <View style={styles.featureListContainer}>
              {featureContent.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <Animated.View
              style={[
                styles.reviewsContainer,
                {
                  transform: [{
                    translateX: reviewsScrollAnim.interpolate({
                      inputRange: [-1, 0],
                      outputRange: [-1200, 0],
                    }),
                  }],
                },
              ]}
            >
              {[...reviews, ...reviews].map((review, index) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{review.name}</Text>
                    <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= Math.floor(review.rating) ? 'star' : star <= review.rating ? 'star-half' : 'star-outline'}
                          size={12}
                          color="#D4A574"
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{review.text}</Text>
                </View>
              ))}
            </Animated.View>
          </View>

          {/* Fixed Footer */}
          <View style={styles.footer}>
            {/* Subscribe Button */}
            {processing ? (
              <View style={styles.processingContainer}>
                <View style={styles.processingRow}>
                  <Text style={[
                    styles.processingText,
                    getResponsiveTextStyle(t('processing', currentLanguage), 20, currentLanguage, 250)
                  ]}>
                    {t('processing', currentLanguage)}
                  </Text>
                  <View style={styles.dotsContainer}>
                    <Animated.Text 
                      style={[
                        styles.dot,
                        {
                          opacity: bounceAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.3, 1, 0.3]
                          })
                        }
                      ]}
                    >
                      .
                    </Animated.Text>
                    <Animated.Text 
                      style={[
                        styles.dot,
                        {
                          opacity: bounceAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.3, 1, 0.3]
                          })
                        }
                      ]}
                    >
                      .
                    </Animated.Text>
                    <Animated.Text 
                      style={[
                        styles.dot,
                        {
                          opacity: bounceAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.3, 1, 0.3]
                          })
                        }
                      ]}
                    >
                      .
                    </Animated.Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.subscriptionButtonsContainer}>
                {/* Yearly Subscription Button */}
              <TouchableOpacity 
                style={[
                    styles.subscriptionButton,
                    styles.yearlyButton,
                    selectedSubscriptionType === 'yearly' && styles.selectedButton,
                    (loading || processing) && styles.disabledButton
                ]}
                  onPress={() => handleSubscribe('yearly')}
                  disabled={loading || processing}
                activeOpacity={0.7}
              >
                  {/* Savings Sling */}
                  <View style={styles.savingsSling}>
                    <View style={styles.ribbonFoldLeftSmall} />
                    <View style={styles.ribbonBodySmall}>
                      <Text style={styles.savingsSlingText}>
                        {isPromotional ? '37% OFF' : '33% OFF'}
                      </Text>
                    </View>
                    <View style={styles.ribbonFoldRightSmall} />
                  </View>
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.subscriptionButtonTitle}>YEARLY ACCESS</Text>
                      {isPromotional ? (
                        <View>
                          <Text style={styles.subscriptionButtonPrice}>$4.17/month</Text>
                          <Text style={styles.promotionalNote}>First year only</Text>
                        </View>
                      ) : (
                        <Text style={styles.subscriptionButtonPrice}>$6.67/month</Text>
                      )}
                    </View>
                    <Text style={styles.yearlyPriceText}>
                      {isPromotional ? '$49.99/year' : '$79.99/year'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Monthly Subscription Button */}
                <TouchableOpacity 
                  style={[
                    styles.subscriptionButton,
                    styles.monthlyButton,
                    (loading || processing) && styles.disabledButton
                  ]}
                  onPress={() => handleSubscribe('monthly')}
                  disabled={loading || processing}
                  activeOpacity={0.7}
                >
                  {/* Savings Sling */}
                  {isPromotional && (
                    <View style={styles.savingsSling}>
                      <View style={styles.ribbonFoldLeftSmall} />
                      <View style={styles.ribbonBodySmall}>
                        <Text style={styles.savingsSlingText}>40% OFF</Text>
                      </View>
                      <View style={styles.ribbonFoldRightSmall} />
                    </View>
                  )}
                  <View style={styles.buttonContent}>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.subscriptionButtonTitle}>MONTHLY ACCESS</Text>
                      {isPromotional ? (
                        <Text style={styles.promotionalNote}>First 6 months only</Text>
                      ) : null}
                    </View>
                    <Text style={styles.yearlyPriceText}>
                      {isPromotional ? '$5.99/month' : '$9.99/month'}
                  </Text>
                  </View>
              </TouchableOpacity>
              </View>
            )}
            
            {/* Redeem Code Button */}
            <TouchableOpacity 
              style={styles.redeemCodeButton}
              onPress={handleRedeemCode}
              activeOpacity={0.7}
            >
              <Text style={styles.redeemCodeButtonText}>
                Redeem Code
              </Text>
            </TouchableOpacity>
            
            <Text style={[
              styles.trustedText,
              getResponsiveTextStyle(t('bySubscribingYouAgree', currentLanguage), 15, currentLanguage, width - 40)
            ]}>
              {t('bySubscribingYouAgree', currentLanguage)}
            </Text>
            <View style={styles.legalLinksContainer}>
              <View style={styles.legalLinksRow}>
                <TouchableOpacity onPress={openTermsOfService} style={styles.legalLinkContainer}>
                  <Text style={[
                    styles.legalLink,
                    getResponsiveTextStyle(t('termsOfService', currentLanguage), 12, currentLanguage, Math.max((width - 80) / 3, 80))
                  ]}>
                    {t('termsOfService', currentLanguage)}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.legalText}> • </Text>
                <TouchableOpacity onPress={handleRestorePurchases} style={styles.legalLinkContainer}>
                  <Text style={[
                    styles.legalLink,
                    getResponsiveTextStyle(t('restorePurchases', currentLanguage), 12, currentLanguage, Math.max((width - 80) / 3, 80))
                  ]}>
                    {t('restorePurchases', currentLanguage)}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.legalText}> • </Text>
                <TouchableOpacity onPress={openPrivacyPolicy} style={styles.legalLinkContainer}>
                  <Text style={[
                    styles.legalLink,
                    getResponsiveTextStyle(t('privacyPolicy', currentLanguage), 12, currentLanguage, Math.max((width - 80) / 3, 80))
                  ]}>
                    {t('privacyPolicy', currentLanguage)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  subscriptionHeader: {
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
    position: 'relative',
  },
  promotionalBanner: {
    position: 'absolute',
    top: -20,
    right: -120,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    transform: [{ rotate: '25deg' }],
  },
  ribbonFoldLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderBottomWidth: 24,
    borderLeftWidth: 15,
    borderRightWidth: 0,
    borderTopColor: 'transparent',
    borderBottomColor: '#C49A63',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  ribbonBody: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 32,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  ribbonBodyLong: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 150,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ribbonFoldRight: {
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderBottomWidth: 24,
    borderLeftWidth: 0,
    borderRightWidth: 15,
    borderTopColor: 'transparent',
    borderBottomColor: '#C49A63',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  promotionalBannerText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  savingsSling: {
    position: 'absolute',
    top: 0,
    right: -25,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    transform: [{ rotate: '30deg' }],
  },
  ribbonFoldLeftSmall: {
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderBottomWidth: 18,
    borderLeftWidth: 10,
    borderRightWidth: 0,
    borderTopColor: 'transparent',
    borderBottomColor: '#C49A63',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  ribbonBodySmall: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  ribbonFoldRightSmall: {
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderBottomWidth: 18,
    borderLeftWidth: 0,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: '#C49A63',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  savingsSlingText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  welcomeText: {
    color: '#A3B1CC',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitleText: {
    color: '#A3B1CC',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '400',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  subtitle: {
    color: '#A3B1CC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    fontStyle: 'italic',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    color: '#A3B1CC',
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    letterSpacing: 0.1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  bullet: {
    color: '#D4A574',
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
    fontWeight: 'bold',
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '300',
    flex: 1,
    lineHeight: 20,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  subscriptionButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  subscriptionButton: {
    width: '90%',
    maxWidth: 320,
    height: 90,
    backgroundColor: '#2A2A2A',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    overflow: 'visible',
    position: 'relative',
  },
  selectedButton: {
    borderColor: '#A3B1CC',
    backgroundColor: '#2A2A3A',
  },
  yearlyButton: {
    position: 'relative',
  },
  monthlyButton: {
    height: 70,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  subscriptionButtonTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subscriptionButtonPrice: {
    color: '#A3B1CC',
    fontSize: 16,
    fontWeight: '400',
  },
  yearlyPriceText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 12,
  },
  promotionalNote: {
    color: '#D4A574',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  savingsBadge: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  savingsBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subscriptionButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  subscriptionButton: {
    width: '90%',
    maxWidth: 320,
    height: 90,
    backgroundColor: '#2A2A2A',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    overflow: 'visible',
    position: 'relative',
  },
  selectedButton: {
    borderColor: '#A3B1CC',
    backgroundColor: '#2A2A3A',
  },
  yearlyButton: {
    position: 'relative',
  },
  monthlyButton: {
    height: 70,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  subscriptionButtonTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subscriptionButtonPrice: {
    color: '#A3B1CC',
    fontSize: 16,
    fontWeight: '400',
  },
  promotionalNote: {
    color: '#D4A574',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  savingsBadge: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  savingsBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subscribeButton: {
    width: '90%',
    maxWidth: 320,
    height: 60,
    backgroundColor: 'transparent',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  restoreButton: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restoreButtonText: {
    color: '#A3B1CC',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 3,
    marginTop: -9,
  },
  dot: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginHorizontal: 2,
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  trustedText: {
    color: '#b0b0b0',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  lanternIcon: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  featureListContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  reviewsSection: {
    width: '100%',
    height: 100,
    marginTop: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  reviewsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  reviewCard: {
    width: width - 40,
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewName: {
    color: '#D4A574',
    fontSize: 13,
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '300',
  },
  carouselContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
  },
  carouselContent: {
    paddingLeft: 0,
  },
  carouselSlide: {
    width: width - 40,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A3A3A',
  },
  paginationDotActive: {
    backgroundColor: '#A3B1CC',
    width: 24,
  },
  legalLinksContainer: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: '100%',
    width: '100%',
  },
  legalLinkContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  legalText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
    flexShrink: 0,
    paddingVertical: 2,
  },
  legalLink: {
    color: '#A3B1CC',
    textDecorationLine: 'underline',
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
    lineHeight: 16,
    paddingVertical: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    color: '#A3B1CC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400',
    lineHeight: 22,
  },
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  nightSkyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  redeemCodeButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  redeemCodeButtonText: {
    color: '#D4A574',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
}); 