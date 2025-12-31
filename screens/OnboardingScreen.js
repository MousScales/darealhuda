import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  ScrollView,
  Animated,
  useNavigation,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InvertLantern from '../assets/invert.png';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firestore } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCredential, OAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import userStateService from '../services/userStateService';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ navigation: navProp, onComplete }) {
  const navigation = navProp || useNavigation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);

  // Helper function to get language-specific styles
  const getLanguageSpecificStyles = () => {
    const baseStyles = {
      welcomeTextSize: 20,
      subtitleSize: 16,
      sectionTitleSize: 22,
      featureTextSize: 16,
      trustedTextSize: 15,
    };

    // Adjust font sizes for languages that typically have longer text
    if (currentLanguage === 'spanish' || currentLanguage === 'french') {
      return {
        ...baseStyles,
        welcomeTextSize: 18,
        subtitleSize: 15,
        sectionTitleSize: 20,
        featureTextSize: 15,
        trustedTextSize: 14,
      };
    } else if (currentLanguage === 'italian') {
      return {
        ...baseStyles,
        welcomeTextSize: 19,
        subtitleSize: 15,
        sectionTitleSize: 21,
        featureTextSize: 15,
        trustedTextSize: 14,
      };
    }

    return baseStyles;
  };

  // Helper function to get responsive container width
  const getContainerWidth = () => {
    const screenWidth = Dimensions.get('window').width;
    
    // For smaller screens, use more width
    if (screenWidth < 375) {
      return '98%';
    } else if (screenWidth < 414) {
      return '95%';
    } else {
      return '90%';
    }
  };

  const languageStyles = getLanguageSpecificStyles();
  const [showDevModal, setShowDevModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [devError, setDevError] = useState('');
  const [devLoading, setDevLoading] = useState(false);

  // Language options
  const languageOptions = [
    { code: 'english', name: 'English', flag: '🇺🇸' },
    { code: 'spanish', name: 'Español', flag: '🇪🇸' },
    { code: 'french', name: 'Français', flag: '🇫🇷' },
    { code: 'italian', name: 'Italiano', flag: '🇮🇹' }
  ];

  const handleLanguageChange = async (languageCode) => {
    try {
      await changeLanguage(languageCode);
      setShowLanguageDropdown(false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  // Typewriter effect states
  const [displayText, setDisplayText] = useState('');
  const [animationComplete, setAnimationComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);



  // Animation values
  const contentAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Floating verses animation values
  const verse1Anim = useRef(new Animated.Value(0)).current;
  const verse2Anim = useRef(new Animated.Value(0)).current;
  const verse3Anim = useRef(new Animated.Value(0)).current;
  const verse4Anim = useRef(new Animated.Value(0)).current;
  const verse5Anim = useRef(new Animated.Value(0)).current;
  const verse6Anim = useRef(new Animated.Value(0)).current;
  const verse7Anim = useRef(new Animated.Value(0)).current;
  const verse8Anim = useRef(new Animated.Value(0)).current;
  const verse9Anim = useRef(new Animated.Value(0)).current;
  const verse10Anim = useRef(new Animated.Value(0)).current;



  useEffect(() => {
    // Animate content in
    Animated.sequence([
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Typewriter effect
  useEffect(() => {
    const targetText = t('joinTheUmmah', currentLanguage);
    
    // Reset typewriter when language changes
    if (displayText !== targetText.substring(0, currentIndex)) {
      setDisplayText('');
      setCurrentIndex(0);
      setAnimationComplete(false);
      return;
    }
    
    if (currentIndex < targetText.length) {
      const timer = setTimeout(() => {
        setDisplayText(targetText.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 150); // Speed of typing

      return () => clearTimeout(timer);
    } else if (!animationComplete) {
      // Start bounce animation after typing is complete
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start(() => {
          setAnimationComplete(true);
          // Start pulsing animation
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1.1,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              })
            ])
          ).start();
        });
      }, 500); // Wait 500ms before starting bounce
    }
  }, [currentIndex, animationComplete, bounceAnim, currentLanguage, displayText]);

  // Floating verses animation
  useEffect(() => {
    const animateVerses = () => {
      // Animate each verse to new random positions
      Animated.parallel([
        Animated.timing(verse1Anim, {
          toValue: Math.random() * 2 - 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(verse2Anim, {
          toValue: Math.random() * 2 - 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(verse3Anim, {
          toValue: Math.random() * 2 - 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(verse4Anim, {
          toValue: Math.random() * 2 - 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(verse5Anim, {
          toValue: Math.random() * 2 - 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(verse6Anim, {
          toValue: Math.random() * 2 - 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(verse7Anim, {
          toValue: Math.random() * 2 - 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(verse8Anim, {
          toValue: Math.random() * 2 - 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(verse9Anim, {
          toValue: Math.random() * 2 - 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(verse10Anim, {
          toValue: Math.random() * 2 - 1,
          duration: 3000,
          useNativeDriver: true,
        }),


      ]).start();
    };

    // Start initial animation after a delay
    const initialDelay = setTimeout(animateVerses, 1000);
    
    // Set up recurring animation
    const interval = setInterval(animateVerses, 4000);
    
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [verse1Anim, verse2Anim, verse3Anim, verse4Anim, verse5Anim, verse6Anim, verse7Anim, verse8Anim, verse9Anim, verse10Anim]);

  // Helper function to extract user name from Apple credentials
  const extractUserName = (fullName, userEmail) => {
    console.log('🍎 Extracting user name from:', { fullName, userEmail });
    
    // Try to get name from Apple credentials (only available on first sign-in)
    if (fullName?.givenName && fullName.givenName.trim() !== '') {
      console.log('🍎 Using given name from Apple:', fullName.givenName);
      return fullName.givenName.trim();
    }
    
    if (fullName?.familyName && fullName.familyName.trim() !== '') {
      console.log('🍎 Using family name from Apple:', fullName.familyName);
      return fullName.familyName.trim();
    }
    
    // If we have both given and family name, combine them
    if (fullName?.givenName && fullName?.familyName && 
        fullName.givenName.trim() !== '' && fullName.familyName.trim() !== '') {
      const combinedName = `${fullName.givenName.trim()} ${fullName.familyName.trim()}`;
      console.log('🍎 Using combined name from Apple:', combinedName);
      return combinedName;
    }
    
    // If no name from Apple (common for returning users), try to get from user's Apple ID
    // We can't directly access the Apple ID name, but we can show a message
    console.log('🍎 No name from Apple credentials (this is normal for returning users)');
    console.log('🍎 Apple only provides name on first sign-in for privacy reasons');
    
    // Return empty string so user can enter their name manually
    return '';
  };

  // Apple Sign-In handler
  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      console.log('🍎 Starting Apple Sign-In process...');
      
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      console.log('🍎 Apple Authentication available:', isAvailable);
      
      if (!isAvailable) {
        throw new Error('Apple Sign In is not available on this device');
      }
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      console.log('🍎 Apple authentication successful, processing credential...');
      console.log('🍎 Full credential object:', credential);
      console.log('🍎 Full name from Apple:', credential.fullName);
      console.log('🍎 Given name:', credential.fullName?.givenName);
      console.log('🍎 Family name:', credential.fullName?.familyName);
      
      // Note: Apple only provides the full name on the FIRST sign-in
      // For returning users, fullName will be null for privacy reasons
      if (!credential.fullName) {
        console.log('🍎 Note: No name provided by Apple (normal for returning users)');
      }
      const { identityToken, fullName } = credential;
      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({ idToken: identityToken });
      const userCredential = await signInWithCredential(auth, firebaseCredential);
      const user = userCredential.user;
      
      console.log('🍎 Firebase authentication successful, checking user profile...');
      console.log('🍎 User UID:', user.uid);
      console.log('🍎 User email:', user.email);
      
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      
      if (userDoc.exists()) {
        // User exists, check if they have completed onboarding
        const userProfile = userDoc.data();
        console.log('🍎 Existing user found, user profile:', userProfile);
        console.log('🍎 Onboarding completed field:', userProfile.onboardingCompleted);
        console.log('🍎 User has name:', userProfile.firstName || userProfile.name);
        
        // SIMPLIFIED LOGIC: If user has a Firebase document, they're existing
        // This is the most reliable way to detect existing users
        const isExistingUser = true; // If they have a Firebase doc, they're existing
        
        console.log('🍎 SIMPLIFIED: User has Firebase document, treating as existing user');
        console.log('🍎 User profile data:', {
          firstName: userProfile.firstName,
          name: userProfile.name,
          madhab: userProfile.madhab,
          experienceLevel: userProfile.experienceLevel,
          onboardingCompleted: userProfile.onboardingCompleted,
          email: userProfile.email,
          createdAt: userProfile.createdAt,
          lastLogin: userProfile.lastLogin,
          allKeys: Object.keys(userProfile)
        });
        
        // Additional debugging for Apple Sign-In issue
        console.log('🍎 Apple Sign-In Debug Info:', {
          userUID: user.uid,
          userEmail: user.email,
          firestoreDocExists: userDoc.exists(),
          isExistingUser: isExistingUser,
          profileKeys: Object.keys(userProfile),
          profileDataCount: Object.keys(userProfile).length,
          profileValues: Object.values(userProfile).filter(v => v !== null && v !== undefined && v !== '')
        });
        
        console.log('🍎 Profile completeness check:', {
          hasFirstName: !!(userProfile.firstName && userProfile.firstName.trim() !== ''),
          hasName: !!(userProfile.name && userProfile.name.trim() !== ''),
          hasMadhab: !!userProfile.madhab,
          hasExperienceLevel: !!userProfile.experienceLevel,
          hasOnboardingFlag: userProfile.onboardingCompleted === true,
          hasCreatedAt: !!userProfile.createdAt,
          hasLastLogin: !!userProfile.lastLogin
        });
        
        if (isExistingUser) {
          // User exists and has meaningful profile data, complete login
          console.log('🍎 Existing user detected, completing login...');
          
          // Debug info logged to console
          console.log('🍎 Existing user detected - proceeding with login');
          
          // Ensure onboardingCompleted is set to true for existing users
          if (userProfile.onboardingCompleted !== true) {
            console.log('🍎 Setting onboardingCompleted to true for existing user...');
            await updateDoc(doc(firestore, 'users', user.uid), {
              onboardingCompleted: true,
              lastLogin: serverTimestamp()
            });
            userProfile.onboardingCompleted = true; // Update local reference
          } else {
            // Just update last login time
            await updateDoc(doc(firestore, 'users', user.uid), {
              lastLogin: serverTimestamp()
            });
          }
          
          // Extract name from Apple credentials or existing profile
          const extractedName = extractUserName(fullName, user.email);
          const finalName = extractedName || userProfile.firstName || userProfile.name || '';
          
          console.log('🍎 Name extraction result:', {
            extractedName,
            existingFirstName: userProfile.firstName,
            existingName: userProfile.name,
            finalName
          });
          
          // Update user profile using UserStateService
          await userStateService.saveUserState({
            uid: user.uid,
            email: user.email,
            firstName: finalName,
            name: finalName,
            ...userProfile,
            onboardingCompleted: true
          }, true, currentLanguage);
          
          console.log('🍎 User profile and flags updated successfully');
          
          setLoading(false);
          
          // Add a small delay to ensure all state updates are complete
          setTimeout(() => {
            if (onComplete) {
              console.log('🍎 Calling onComplete callback...');
              onComplete();
            } else {
              console.log('🍎 Navigating to Home...');
              navigation.replace('Home');
            }
          }, 100);
        } else {
          // User exists but has no meaningful profile data, go to onboarding
          console.log('🍎 User exists but has no meaningful profile data, navigating to FullOnboardingScreen...');
          
          // Debug info logged to console
          console.log('🍎 This should not happen with simplified logic!');
          setLoading(false);
          // Add a small delay to ensure loading state is reset before navigation
          setTimeout(() => {
            console.log('🍎 Attempting navigation to FullOnboardingScreen for existing user...');
            const userName = extractUserName(fullName, user.email);
            navigation.replace('FullOnboardingScreen', { 
              email: user.email, 
              password: '', // Apple users don't have a password
              appleUser: true,
              appleName: userName,
              selectedLanguage: currentLanguage
            });
          }, 100);
          
          // Fallback: If navigation doesn't work within 2 seconds, try again
          setTimeout(() => {
            console.log('🍎 Fallback navigation attempt for existing user...');
            const userName = extractUserName(fullName, user.email);
            navigation.replace('FullOnboardingScreen', { 
              email: user.email, 
              password: '', // Apple users don't have a password
              appleUser: true,
              appleName: userName,
              selectedLanguage: currentLanguage
            });
          }, 2000);
        }
      } else {
          // New user, go to onboarding
          console.log('🍎 New user detected, navigating to FullOnboardingScreen...');
          
          // Debug info logged to console
          console.log('🍎 Truly new user - no Firebase document found');
          setLoading(false);
          // Add a small delay to ensure loading state is reset before navigation
          setTimeout(() => {
            console.log('🍎 Attempting navigation to FullOnboardingScreen...');
            const userName = extractUserName(fullName, user.email);
            navigation.replace('FullOnboardingScreen', { 
              email: user.email, 
              password: '', // Apple users don't have a password
              appleUser: true,
              appleName: userName,
              selectedLanguage: currentLanguage
            });
          }, 100);
          
          // Fallback: If navigation doesn't work within 2 seconds, try again
          setTimeout(() => {
            console.log('🍎 Fallback navigation attempt...');
            const userName = extractUserName(fullName, user.email);
            navigation.replace('FullOnboardingScreen', { 
              email: user.email, 
              password: '', // Apple users don't have a password
              appleUser: true,
              appleName: userName,
              selectedLanguage: currentLanguage
            });
          }, 2000);
        }
    } catch (error) {
      setLoading(false);
      console.error('🍎 Apple Sign-In error:', error);
      
      if (error.code === 'ERR_CANCELED') {
        // User cancelled the sign-in
        console.log('🍎 Apple Sign-In cancelled by user');
      } else {
        console.log('🍎 Apple Sign-In error:', error.message);
        // Show user-friendly error message
        Alert.alert(
          'Sign In Error',
          'There was an issue signing in with Apple. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleDevLogin = async () => {
    setDevError('');
    setDevLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, devEmail, devPassword);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      setDevLoading(false);
      setShowDevModal(false);
      setDevEmail('');
      setDevPassword('');
      if (userDoc.exists() && userDoc.data().onboardingCompleted) {
        // User has completed onboarding, go to Home
        const userProfile = userDoc.data();
        await AsyncStorage.setItem('userProfile', JSON.stringify({
          uid: user.uid,
          email: user.email,
          ...userProfile
        }));
        if (onComplete) onComplete();
        else navigation.replace('Home');
      } else {
        // User has not completed onboarding, go to onboarding
        navigation.navigate('FullOnboardingScreen', {
          email: user.email,
          password: devPassword,
          appleUser: false
        });
      }
    } catch (error) {
      setDevLoading(false);
      setDevError(error.message);
    }
  };

  return (
    <LinearGradient colors={["#000", "#181818"]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        
        <View style={{ flex: 1, width: '100%' }}>
          {/* Welcome Header with Language Selector */}
          <View style={styles.welcomeHeaderContainer}>
            {/* Language Switcher - Positioned absolutely on the left */}
            <View style={styles.absoluteLanguageSwitcher}>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
              >
                <Text style={styles.languageFlag}>
                  {languageOptions.find(lang => lang.code === currentLanguage)?.flag || '🇺🇸'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              
              {showLanguageDropdown && (
                <View style={styles.languageDropdown}>
                  {languageOptions.map((language) => (
                    <TouchableOpacity
                      key={language.code}
                      style={[
                        styles.languageOption,
                        currentLanguage === language.code && styles.languageOptionSelected
                      ]}
                      onPress={() => handleLanguageChange(language.code)}
                    >
                      <Text style={styles.languageFlag}>{language.flag}</Text>
                      <Text style={[
                        styles.languageName,
                        currentLanguage === language.code && styles.languageNameSelected
                      ]}>
                        {language.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            {/* Centered Welcome Text */}
            <Text style={[styles.welcomeText, { fontSize: languageStyles.welcomeTextSize }]}>{t('welcomeTo', currentLanguage)}</Text>
          </View>
          <Animated.ScrollView
            contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            style={{
              opacity: contentAnim,
              transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }]
            }}
          >
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Image source={InvertLantern} style={styles.lanternIcon} />
              <Text style={styles.appName}>Hudā</Text>
              <Text style={[styles.subtitle, { fontSize: languageStyles.subtitleSize }]}>{t('theAppForMuslims', currentLanguage)}</Text>
            </View>
                          <Text style={[styles.sectionTitle, { fontSize: languageStyles.sectionTitleSize }]}>{t('everythingYouNeedToStayOnDeen', currentLanguage)}</Text>
            <View style={{ height: 18 }} />
            <View style={{ width: getContainerWidth(), maxWidth: 400 }}>
              <View style={styles.featureRow}><Text style={styles.emoji}>🕑</Text><Text style={[styles.featureText, { fontSize: languageStyles.featureTextSize }]}>{t('accuratePrayerTimesWithNotifications', currentLanguage)}</Text></View>
              <View style={styles.featureRow}><Text style={styles.emoji}>🧭</Text><Text style={[styles.featureText, { fontSize: languageStyles.featureTextSize }]}>{t('qiblaDirectionFinder', currentLanguage)}</Text></View>
              <View style={styles.featureRow}><Text style={styles.emoji}>📖</Text><Text style={[styles.featureText, { fontSize: languageStyles.featureTextSize }]}>{t('quranReadingWithAudio', currentLanguage)}</Text></View>
              <View style={styles.featureRow}><Text style={styles.emoji}>📚</Text><Text style={[styles.featureText, { fontSize: languageStyles.featureTextSize }]}>{t('islamicLessonsAndHadith', currentLanguage)}</Text></View>
              <View style={styles.featureRow}><Text style={styles.emoji}>🕌</Text><Text style={[styles.featureText, { fontSize: languageStyles.featureTextSize }]}>{t('guidedPrayerInstructions', currentLanguage)}</Text></View>
              <View style={styles.featureRow}><Text style={styles.emoji}>📍</Text><Text style={[styles.featureText, { fontSize: languageStyles.featureTextSize }]}>{t('nearbyMosqueFinder', currentLanguage)}</Text></View>
              <View style={styles.featureRow}><Text style={styles.emoji}>📿</Text><Text style={[styles.featureText, { fontSize: languageStyles.featureTextSize }]}>{t('digitalTasbihCounter', currentLanguage)}</Text></View>
              <View style={styles.featureRow}><Text style={styles.emoji}>📒</Text><Text style={[styles.featureText, { fontSize: languageStyles.featureTextSize }]}>{t('trackYourDeenPrayerFastingAndMore', currentLanguage)}</Text></View>
              <View style={styles.featureRow}><Text style={styles.emoji}>🎧</Text><Text style={[styles.featureText, { fontSize: languageStyles.featureTextSize }]}>{t('saveAndTrackQuranProgressWithAudio', currentLanguage)}</Text></View>
              <View style={styles.featureRow}><Text style={styles.emoji}>📱</Text><Text style={[styles.featureText, { fontSize: languageStyles.featureTextSize }]}>{t('islamicWidgets', currentLanguage)}</Text></View>
            </View>
          </Animated.ScrollView>
          <Animated.View
            style={{
              width: '100%',
              alignItems: 'center',
              marginBottom: 32,
              opacity: buttonAnim,
              transform: [{ scale: buttonAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }]
            }}
          >
            {/* Typewriter Text Button */}
            <TouchableOpacity
              style={styles.typewriterButton}
              onPress={animationComplete ? () => setShowSignInModal(true) : undefined}
              disabled={loading || !animationComplete}
              activeOpacity={animationComplete ? 0.7 : 1}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: animationComplete 
                        ? pulseAnim.interpolate({
                            inputRange: [1, 1.1],
                            outputRange: [1, 1.1]
                          })
                        : bounceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.1]
                          })
                    }
                  ]
                }}
              >
                <Text style={[
                  styles.typewriterText,
                  animationComplete && {
                    textShadowColor: '#fff',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  }
                ]}>{displayText}</Text>
              </Animated.View>
            </TouchableOpacity>
            
            {/* DEV LOGIN BUTTON */}
            {/* <TouchableOpacity
              style={[styles.enterButton, { backgroundColor: '#222', marginTop: 8 }]}
              onPress={() => setShowDevModal(true)}
            >
              <Text style={[styles.enterButtonText, { color: '#fff' }]}>Dev Login (Email)</Text>
            </TouchableOpacity> */}
            <Text style={[styles.trustedText, { fontSize: languageStyles.trustedTextSize }]}>{t('trustedByThousandsOfMuslimsWorldwide', currentLanguage)}</Text>
          </Animated.View>
          {/* DEV LOGIN MODAL */}
          {/* <Modal
            visible={showDevModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowDevModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Developer Login</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#666"
                  value={devEmail}
                  onChangeText={setDevEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#666"
                  value={devPassword}
                  onChangeText={setDevPassword}
                  secureTextEntry
                />
                {devError ? <Text style={styles.errorText}>{devError}</Text> : null}
                <TouchableOpacity
                  style={[styles.enterButton, { backgroundColor: '#007AFF', marginTop: 8 }]}
                  onPress={handleDevLogin}
                  disabled={devLoading}
                >
                  <Text style={[styles.enterButtonText, { color: '#fff' }]}>
                    {devLoading ? 'Logging in...' : 'Login'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 12 }}
                  onPress={() => setShowDevModal(false)}
                >
                  <Text style={{ color: '#666', fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal> */}
          
          {/* SIGN IN MODAL */}
          <Modal
            visible={showSignInModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowSignInModal(false)}
            onShow={() => console.log('🍎 Apple Sign In modal shown')}
          >
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={['#1a1a1a', '#2a2a2a', '#1a1a1a']}
                style={styles.bottomSheetContent}
              >
                {/* Floating Arabic Verses */}
                <Animated.Text 
                  style={[
                    styles.floatingVerse, 
                    styles.verse1,
                    {
                      transform: [
                        { 
                          translateX: verse1Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-40, 40]
                          })
                        },
                        { 
                          translateY: verse1Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-30, 30]
                          })
                        },
                        { 
                          rotate: verse1Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-15deg', '15deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.floatingVerse, 
                    styles.verse2,
                    {
                      transform: [
                        { 
                          translateX: verse2Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-35, 35]
                          })
                        },
                        { 
                          translateY: verse2Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-25, 25]
                          })
                        },
                        { 
                          rotate: verse2Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-12deg', '12deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  إِنَّ اللَّهَ مَعَ الصَّابِرِينَ
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.floatingVerse, 
                    styles.verse3,
                    {
                      transform: [
                        { 
                          translateX: verse3Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-45, 45]
                          })
                        },
                        { 
                          translateY: verse3Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-20, 20]
                          })
                        },
                        { 
                          rotate: verse3Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-10deg', '10deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  رَبِّ زِدْنِي عِلْمًا
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.floatingVerse, 
                    styles.verse4,
                    {
                      transform: [
                        { 
                          translateX: verse4Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-30, 30]
                          })
                        },
                        { 
                          translateY: verse4Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-35, 35]
                          })
                        },
                        { 
                          rotate: verse4Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-8deg', '8deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.floatingVerse, 
                    styles.verse5,
                    {
                      transform: [
                        { 
                          translateX: verse5Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-25, 25]
                          })
                        },
                        { 
                          translateY: verse5Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-40, 40]
                          })
                        },
                        { 
                          rotate: verse5Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-6deg', '6deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  سُبْحَانَ اللَّهِ وَبِحَمْدِهِ
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.floatingVerse, 
                    styles.verse6,
                    {
                      transform: [
                        { 
                          translateX: verse6Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-50, 50]
                          })
                        },
                        { 
                          translateY: verse6Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-15, 15]
                          })
                        },
                        { 
                          rotate: verse6Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-14deg', '14deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  لَا إِلَهَ إِلَّا اللَّهُ
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.floatingVerse, 
                    styles.verse7,
                    {
                      transform: [
                        { 
                          translateX: verse7Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-20, 20]
                          })
                        },
                        { 
                          translateY: verse7Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-45, 45]
                          })
                        },
                        { 
                          rotate: verse7Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-9deg', '9deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  أَسْتَغْفِرُ اللَّهَ
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.floatingVerse, 
                    styles.verse8,
                    {
                      transform: [
                        { 
                          translateX: verse8Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-55, 55]
                          })
                        },
                        { 
                          translateY: verse8Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-10, 10]
                          })
                        },
                        { 
                          rotate: verse8Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-11deg', '11deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  الْحَمْدُ لِلَّهِ
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.floatingVerse, 
                    styles.verse9,
                    {
                      transform: [
                        { 
                          translateX: verse9Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-35, 35]
                          })
                        },
                        { 
                          translateY: verse9Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-25, 25]
                          })
                        },
                        { 
                          rotate: verse9Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-7deg', '7deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.floatingVerse, 
                    styles.verse10,
                    {
                      transform: [
                        { 
                          translateX: verse10Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-40, 40]
                          })
                        },
                        { 
                          translateY: verse10Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: [-30, 30]
                          })
                        },
                        { 
                          rotate: verse10Anim.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-13deg', '13deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ
                </Animated.Text>
                
                <View style={styles.bottomSheetHandle} />
                
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { fontSize: currentLanguage === 'spanish' || currentLanguage === 'french' ? 26 : 28 }]}>{t('joinTheUmmah', currentLanguage)}</Text>
                  <Text style={[styles.modalSubtitle, { fontSize: currentLanguage === 'spanish' || currentLanguage === 'french' ? 15 : 16 }]}>{t('signInWithAppleToContinueYourJourney', currentLanguage)}</Text>
                </View>
                
                <View style={styles.modalBody}>
                  <View style={styles.appleButtonContainer}>
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={16}
                      style={{ width: 280, height: 52 }}
                      onPress={() => {
                        console.log('🍎 Apple Sign In button pressed');
                        handleAppleSignIn();
                      }}
                    />
                  </View>
                  
                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={[styles.dividerText, { fontSize: currentLanguage === 'spanish' || currentLanguage === 'french' ? 14 : 15 }]}>{t('orJustHereToReadSomeQuran', currentLanguage)}</Text>
                    <View style={styles.divider} />
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.viewQuranButton}
                    onPress={() => {
                      setShowSignInModal(false);
                      navigation.navigate('SimpleQuranViewer', { selectedLanguage: currentLanguage });
                    }}
                  >
                    <Text style={styles.viewQuranButtonText}>{t('viewQuran', currentLanguage)}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowSignInModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>{t('cancel', currentLanguage)}</Text>
                  </TouchableOpacity>

                </View>
                

              </LinearGradient>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: 'rgba(40,40,60,0.18)',
    borderRadius: 0,
  },
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  welcomeText: {
    color: '#A3B1CC',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#A3B1CC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    fontStyle: 'italic',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 36,
    marginBottom: 8,
    paddingHorizontal: 20,
    lineHeight: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
    paddingHorizontal: 10,
  },
  emoji: {
    fontSize: 22,
    marginRight: 16,
    width: 38,
    textAlign: 'center',
    marginTop: 2,
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
    lineHeight: 22,
  },
  enterButton: {
    width: '90%',
    maxWidth: 340,
    height: 54,
    backgroundColor: '#fff',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  enterButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  typewriterButton: {
    width: '90%',
    maxWidth: 340,
    height: 54,
    backgroundColor: 'transparent',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  typewriterText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
  },


  trustedText: {
    color: '#b0b0b0',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
    fontStyle: 'italic',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  lanternIcon: {
    width: 110,
    height: 110,
    marginVertical: 18,
    resizeMode: 'contain',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  bottomSheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#444',
    borderRadius: 3,
    marginBottom: 24,
    alignSelf: 'center',
  },
  input: {
    width: 260,
    height: 48,
    backgroundColor: '#181818',
    borderRadius: 10,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
  },
  modalSubtitle: {
    color: '#A3B1CC',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#ff7675',
    marginTop: 8,
    fontSize: 14,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    alignItems: 'center',
    marginTop: 24,
  },
  appleButtonContainer: {
    marginBottom: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#A3B1CC',
  },
  dividerText: {
    color: '#A3B1CC',
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  viewQuranButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  viewQuranButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#A3B1CC',
  },
  dividerText: {
    color: '#A3B1CC',
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  floatingVerse: {
    position: 'absolute',
    color: 'rgba(255, 255, 255, 0.08)',
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  verse1: {
    top: '8%',
    left: '5%',
    transform: [{ rotate: '-5deg' }],
  },
  verse2: {
    top: '18%',
    right: '8%',
    transform: [{ rotate: '3deg' }],
  },
  verse3: {
    top: '35%',
    left: '12%',
    transform: [{ rotate: '-2deg' }],
  },
  verse4: {
    top: '45%',
    right: '15%',
    transform: [{ rotate: '4deg' }],
  },
  verse5: {
    top: '60%',
    left: '8%',
    transform: [{ rotate: '-3deg' }],
  },
  verse6: {
    top: '75%',
    right: '12%',
    transform: [{ rotate: '2deg' }],
  },
  verse7: {
    bottom: '25%',
    left: '18%',
    transform: [{ rotate: '-1deg' }],
  },
  verse8: {
    bottom: '15%',
    right: '8%',
    transform: [{ rotate: '5deg' }],
  },
  verse9: {
    bottom: '35%',
    right: '22%',
    transform: [{ rotate: '-4deg' }],
  },
  verse10: {
    bottom: '45%',
    left: '25%',
    transform: [{ rotate: '6deg' }],
  },
  welcomeHeaderContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 0,
  },
  absoluteLanguageSwitcher: {
    position: 'absolute',
    left: 20,
    top: 0,
    zIndex: 1000,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 60,
  },
  languageFlag: {
    fontSize: 18,
    marginRight: 6,
  },
  languageDropdown: {
    position: 'absolute',
    top: 45,
    left: 0,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 120,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  languageName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  languageNameSelected: {
    fontWeight: '600',
  },


}); 