import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firestore } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';

const { width, height } = Dimensions.get('window');

const TasbihScreen = ({ navigation }) => {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [count, setCount] = useState(0);
  const [selectedDhikr, setSelectedDhikr] = useState(0);
  const [targetCount, setTargetCount] = useState(33);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDhikr, setNewDhikr] = useState({
    arabic: '',
    transliteration: '',
    translation: '',
    target: '33'
  });

  // Animation values for 3D effects
  const counterButtonScale = new Animated.Value(1);
  const dhikrCardScale = new Animated.Value(1);
  const progressBarScale = new Animated.Value(1);

  // Preset dhikrs with their information
  const [dhikrs, setDhikrs] = useState([
    {
      id: 1,
      arabic: 'سُبْحَانَ اللَّهِ',
      transliteration: 'Subhanallah',
      translation: 'Glory be to Allah',
      target: 33,
      color: '#4CAF50',
      gradientColors: ['#4CAF50', '#45a049'],
      isDefault: true
    },
    {
      id: 2,
      arabic: 'الْحَمْدُ لِلَّهِ',
      transliteration: 'Alhamdulillah',
      translation: 'All praise is for Allah',
      target: 33,
      color: '#2196F3',
      gradientColors: ['#2196F3', '#1976D2'],
      isDefault: true
    },
    {
      id: 3,
      arabic: 'اللَّهُ أَكْبَرُ',
      transliteration: 'Allahu Akbar',
      translation: 'Allah is the Greatest',
      target: 34,
      color: '#FF9800',
      gradientColors: ['#FF9800', '#F57C00'],
      isDefault: true
    },
    {
      id: 4,
      arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
      transliteration: 'La ilaha illa Allah',
      translation: 'There is no god but Allah',
      target: 100,
      color: '#9C27B0',
      gradientColors: ['#9C27B0', '#7B1FA2'],
      isDefault: true
    }
  ]);

  const currentDhikr = dhikrs[selectedDhikr];

  // 3D Animation functions
  const animateCounterPress = () => {
    Animated.sequence([
      Animated.timing(counterButtonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(counterButtonScale, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(counterButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateDhikrCardPress = () => {
    Animated.sequence([
      Animated.timing(dhikrCardScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(dhikrCardScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateProgressBar = () => {
    Animated.sequence([
      Animated.timing(progressBarScale, {
        toValue: 1.02,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(progressBarScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Add new dhikr function
  const handleAddDhikr = async () => {
    if (!newDhikr.transliteration || !newDhikr.target) {
      Alert.alert(t('missingInformation', currentLanguage), t('fillTransliterationAndTarget', currentLanguage));
      return;
    }

    const target = parseInt(newDhikr.target);
    if (isNaN(target) || target <= 0) {
              Alert.alert(t('invalidTarget', currentLanguage), t('enterValidTarget', currentLanguage));
      return;
    }

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A', '#FFC107'];
    const newId = Date.now(); // Use timestamp as unique ID
    
    const newDhikrItem = {
      id: newId,
      arabic: newDhikr.arabic || newDhikr.transliteration,
      transliteration: newDhikr.transliteration,
      translation: newDhikr.translation || newDhikr.transliteration,
      target: target,
      color: colors[dhikrs.length % colors.length],
      isDefault: false
    };

    const updatedDhikrs = [...dhikrs, newDhikrItem];
    setDhikrs(updatedDhikrs);
    setNewDhikr({
      arabic: '',
      transliteration: '',
      translation: '',
      target: '33'
    });
    setShowAddModal(false);
    
    // Save to Firebase
    await saveDhikrToFirebase(newDhikrItem);
  };

  // Save dhikr to Firebase
  const saveDhikrToFirebase = async (dhikr) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(firestore, 'users', user.uid, 'customDhikrs', dhikr.id.toString()), dhikr);
        console.log('✅ Custom dhikr saved to Firebase');
      }
    } catch (error) {
      console.error('❌ Error saving dhikr to Firebase:', error);
              Alert.alert(t('error', currentLanguage), t('failedToSaveDhikr', currentLanguage));
    }
  };

  // Load dhikrs from Firebase
  const loadDhikrsFromFirebase = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const dhikrsSnapshot = await getDocs(collection(firestore, 'users', user.uid, 'customDhikrs'));
        const customDhikrs = [];
        
        dhikrsSnapshot.forEach((doc) => {
          customDhikrs.push(doc.data());
        });
        
        // Combine default dhikrs with custom ones
        const defaultDhikrs = dhikrs.filter(d => d.isDefault);
        const allDhikrs = [...defaultDhikrs, ...customDhikrs];
        setDhikrs(allDhikrs);
        console.log('✅ Custom dhikrs loaded from Firebase:', customDhikrs.length);
      }
    } catch (error) {
      console.error('❌ Error loading dhikrs from Firebase:', error);
    }
  };

  // Delete custom dhikr
  const deleteDhikr = async (dhikr) => {
    if (dhikr.isDefault) {
              Alert.alert(t('cannotDelete', currentLanguage), t('defaultDhikrsCannotDelete', currentLanguage));
      return;
    }

    Alert.alert(
              t('deleteDhikr', currentLanguage),
        t('confirmDeleteDhikr', currentLanguage).replace('{dhikr}', dhikr.transliteration),
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                await deleteDoc(doc(firestore, 'users', user.uid, 'customDhikrs', dhikr.id.toString()));
                const updatedDhikrs = dhikrs.filter(d => d.id !== dhikr.id);
                setDhikrs(updatedDhikrs);
                
                // Reset selection if deleted dhikr was selected
                if (selectedDhikr >= updatedDhikrs.length) {
                  setSelectedDhikr(0);
                }
                console.log('✅ Custom dhikr deleted from Firebase');
              }
            } catch (error) {
              console.error('❌ Error deleting dhikr:', error);
              Alert.alert(t('error', currentLanguage), t('failedToDeleteDhikr', currentLanguage));
            }
          }
        }
      ]
    );
  };

  // Keys for AsyncStorage
  const TASBIH_COUNTS_KEY = 'tasbih_counts';
  const TASBIH_SELECTED_KEY = 'tasbih_selectedDhikr';

  // Store all counts as an object { dhikrId: count }
  const [allCounts, setAllCounts] = useState({});
  const [lastSelectedDhikr, setLastSelectedDhikr] = useState(0);

  // Load saved spot on mount
  useEffect(() => {
    const loadSavedSpot = async () => {
      try {
        const savedCounts = await AsyncStorage.getItem(TASBIH_COUNTS_KEY);
        const savedSelected = await AsyncStorage.getItem(TASBIH_SELECTED_KEY);
        let countsObj = {};
        if (savedCounts) {
          countsObj = JSON.parse(savedCounts);
          setAllCounts(countsObj);
        }
        if (savedSelected !== null) setSelectedDhikr(Number(savedSelected));
        // Set count for selected dhikr
        const initialIndex = savedSelected !== null ? Number(savedSelected) : 0;
        const initialDhikr = dhikrs[initialIndex];
        if (initialDhikr && countsObj[initialDhikr.id] !== undefined) {
          setCount(countsObj[initialDhikr.id]);
        } else {
          setCount(0);
        }
        setLastSelectedDhikr(initialIndex);
      } catch (e) {
        console.warn('Failed to load saved tasbih spot:', e);
      }
    };
    loadSavedSpot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save allCounts whenever it changes
  useEffect(() => {
    AsyncStorage.setItem(TASBIH_COUNTS_KEY, JSON.stringify(allCounts));
  }, [allCounts]);

  // Save selectedDhikr whenever it changes
  useEffect(() => {
    AsyncStorage.setItem(TASBIH_SELECTED_KEY, selectedDhikr.toString());
  }, [selectedDhikr]);

  // Remove the useEffect that updates allCounts and count on selectedDhikr change
  // Add a handler for selecting a dhikr
  const handleSelectDhikr = (newIndex) => {
    if (dhikrs.length === 0) return;
    const currentDhikrId = dhikrs[selectedDhikr]?.id;
    setAllCounts(prev => ({ ...prev, [currentDhikrId]: count }));
    setSelectedDhikr(newIndex);
    // After setSelectedDhikr, useEffect for selectedDhikr will run, so load count there
  };

  // When selectedDhikr changes, load the count for the new dhikr
  useEffect(() => {
    if (dhikrs.length === 0) return;
    const newDhikr = dhikrs[selectedDhikr];
    if (newDhikr && allCounts[newDhikr.id] !== undefined) {
      setCount(allCounts[newDhikr.id]);
    } else {
      setCount(0);
    }
  }, [selectedDhikr, dhikrs, allCounts]);

  // When count changes, update allCounts for current dhikr
  useEffect(() => {
    if (dhikrs.length === 0) return;
    const current = dhikrs[selectedDhikr];
    setAllCounts(prev => ({ ...prev, [current.id]: count }));
  }, [count]);

  useEffect(() => {
    loadDhikrsFromFirebase();
  }, []);

  useEffect(() => {
    setTargetCount(currentDhikr.target);
  }, [selectedDhikr]);

  const handleCount = () => {
    const newCount = count + 1;
    setCount(newCount);

    // Check if target is reached
    if (newCount >= targetCount) {
      setCount(0);
      
      // Show completion feedback
      Alert.alert(
        '🎉 Set Complete!',
        t('completedDhikr', currentLanguage).replace('{count}', targetCount).replace('{dhikr}', currentDhikr.transliteration),
        [
          { text: 'Continue', style: 'default' }
        ]
      );
    }
    
    // Trigger 3D animations
    animateCounterPress();
    animateProgressBar();
  };

  const resetCounter = () => {
    Alert.alert(
      t('resetCounter', currentLanguage),
      t('confirmResetCounter', currentLanguage),
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => setCount(0)
        }
      ]
    );
  };

  const progress = (count / targetCount) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#1e1e1e', '#2a2a2a']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('digitalTasbih', currentLanguage)}</Text>
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetCounter}
          >
            <Ionicons name="refresh" size={24} color="#ffffff" />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Dhikr Display */}
        <Animated.View 
          style={[styles.dhikrCard, { transform: [{ scale: dhikrCardScale }] }]}
        >
          <LinearGradient
            colors={['#1e1e1e', '#2a2a2a']}
            style={styles.dhikrCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.dhikrCardBorder}>
              <Text style={styles.arabicText}>{currentDhikr.arabic}</Text>
              <Text style={styles.transliterationText}>{currentDhikr.transliteration}</Text>
              <Text style={styles.translationText}>{currentDhikr.translation}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Progress Indicator */}
        <Animated.View 
          style={[styles.progressSection, { transform: [{ scale: progressBarScale }] }]}
        >
          <View style={styles.progressBar}>
            <LinearGradient
              colors={currentDhikr.gradientColors}
              style={[
                styles.progressFill, 
                { width: `${progress}%` }
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={styles.progressText}>
            {count} / {targetCount}
          </Text>
        </Animated.View>

        {/* Main Counter Button */}
        <TouchableOpacity 
          onPress={handleCount}
          activeOpacity={0.9}
        >
          <Animated.View 
            style={[styles.counterButton, { transform: [{ scale: counterButtonScale }] }]}
          >
            <LinearGradient
              colors={currentDhikr.gradientColors}
              style={styles.counterButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.counterButtonInner}>
                <Text style={styles.counterText}>{count}</Text>
                <Text style={styles.tapText}>{t('tapToCount', currentLanguage)}</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        {/* Dhikr Selection */}
        <View style={styles.selectionSection}>
          <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('chooseDhikr', currentLanguage)}</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={28} color="#4CAF50" />
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.dhikrScroll}
          >
            {dhikrs.map((dhikr, index) => (
              <TouchableOpacity
                key={dhikr.id}
                onPress={() => handleSelectDhikr(index)}
                onLongPress={() => deleteDhikr(dhikr)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.dhikrOption,
                  { 
                    opacity: selectedDhikr === index ? 1 : 0.8,
                    transform: [{ scale: selectedDhikr === index ? 1.08 : 1 }]
                  }
                ]}>
                  <LinearGradient
                    colors={dhikr.gradientColors}
                    style={styles.dhikrOptionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.dhikrOptionArabic}>{dhikr.arabic}</Text>
                    <Text style={styles.dhikrOptionText}>{dhikr.transliteration}</Text>
                    <Text style={styles.dhikrTargetText}>{dhikr.target}x</Text>
                    {!dhikr.isDefault && (
                      <View style={styles.customIndicator}>
                        <Ionicons name="person" size={12} color="#ffffff" />
                      </View>
                    )}
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.helpText}>{t('longPressToDelete', currentLanguage)}</Text>
        </View>
      </ScrollView>

      {/* Add Dhikr Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('addCustomDhikr', currentLanguage)}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAddModal(false)}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('arabicTextOptional', currentLanguage)}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newDhikr.arabic}
                  onChangeText={(text) => setNewDhikr({...newDhikr, arabic: text})}
                  placeholder={t('enterArabicText', currentLanguage)}
                  placeholderTextColor="#666666"
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('transliteration', currentLanguage)} *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newDhikr.transliteration}
                  onChangeText={(text) => setNewDhikr({...newDhikr, transliteration: text})}
                  placeholder={t('enterTransliteration', currentLanguage)}
                  placeholderTextColor="#666666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('translationOptional', currentLanguage)}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newDhikr.translation}
                  onChangeText={(text) => setNewDhikr({...newDhikr, translation: text})}
                  placeholder={t('enterMeaning', currentLanguage)}
                  placeholderTextColor="#666666"
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('targetCount', currentLanguage)} *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newDhikr.target}
                  onChangeText={(text) => setNewDhikr({...newDhikr, target: text})}
                  placeholder="33"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                />
        </View>

          <TouchableOpacity 
                style={styles.addDhikrButton}
                onPress={handleAddDhikr}
          >
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.addDhikrButtonText}>{t('addDhikr', currentLanguage)}</Text>
          </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    marginHorizontal: 15,
    marginTop: 8,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  dhikrCard: {
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  dhikrCardGradient: {
    borderRadius: 15,
    padding: 15,
  },
  dhikrCardBorder: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  arabicText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 32,
  },
  transliterationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#bbbbbb',
    textAlign: 'center',
    marginBottom: 4,
  },
  translationText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  counterButton: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 15,
  },
  counterButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.325,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.325,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  counterText: {
    fontSize: 68,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  tapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  selectionSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  addButton: {
    padding: 5,
  },
  dhikrScroll: {
    paddingHorizontal: 5,
  },
  dhikrOption: {
    borderRadius: 12,
    marginHorizontal: 4,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  dhikrOptionGradient: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minHeight: 80,
  },
  dhikrOptionArabic: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 3,
    textAlign: 'center',
  },
  dhikrOptionText: {
    fontSize: 10,
    color: '#ffffff',
    marginBottom: 2,
    textAlign: 'center',
  },
  dhikrTargetText: {
    fontSize: 9,
    color: '#ffffff',
    opacity: 0.8,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  customIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(233, 30, 99, 0.8)',
    borderRadius: 10,
    padding: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  modalForm: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#bbbbbb',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#444444',
    minHeight: 50,
  },
  addDhikrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addDhikrButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TasbihScreen; 