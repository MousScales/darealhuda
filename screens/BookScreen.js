import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Dimensions, SafeAreaView, ActivityIndicator, Animated, Easing, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../firebase';
import { useFocusEffect } from '@react-navigation/native';
import { getResponsiveIconSize, isTablet, getResponsiveGridColumns, getTabletSpacing } from '../utils/responsiveSizing';
import { useLanguage } from '../utils/useLanguage';
import { t } from '../utils/translations';
import { 
  getResponsiveFontSize, 
  getResponsiveLineHeight, 
  getResponsivePadding, 
  getResponsiveContainerWidth,
  getResponsiveTextStyle,
  getResponsiveCardStyle,
  getResponsiveBadgeStyle
} from '../utils/languageResponsiveSizing';
import multilingualDailyContentService from '../services/multilingualDailyContentService';
import { getTranslationEdition } from '../utils/quranTranslations';
import { getDuaContent } from '../services/multilingualDuaService';
import { getDhikrContent } from '../services/multilingualDhikrService';
import streakService from '../services/streakService';
import widgetService from '../services/widgetService';

const { width } = Dimensions.get('window');
const ALQURAN_API_BASE = 'https://api.alquran.cloud/v1';

export default function BookScreen({ navigation }) {
  // Language support
  const { currentLanguage } = useLanguage();
  
  const [dailyContent, setDailyContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quranStreak, setQuranStreak] = useState(0);
  const [hadithStreak, setHadithStreak] = useState(0);

  // Animation values for staggered entrance
  const [headerAnim] = useState(new Animated.Value(0));
  const [optionsAnim] = useState(new Animated.Value(0));
  const [carouselAnim] = useState(new Animated.Value(0));
  
  // Button press animations - separate for each button
  const [quranButtonScale] = useState(new Animated.Value(1));
  const [duaButtonScale] = useState(new Animated.Value(1));
  const [dhikrButtonScale] = useState(new Animated.Value(1));
  const [hadithButtonScale] = useState(new Animated.Value(1));
  
  // Daily content card animations - separate for each card
  const [dailyVerseScale] = useState(new Animated.Value(1));
  const [dailyDuaScale] = useState(new Animated.Value(1));
  const [dailyDhikrScale] = useState(new Animated.Value(1));
  const [dailyHadithScale] = useState(new Animated.Value(1));

  // Collections for daily rotation (keeping as fallback)
  const quranVerses = [
    {
      title: 'Ayah Al-Kursi',
      arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
      translation: 'Allah - there is no deity except Him, the Ever-Living, the Self-Sustaining. Neither drowsiness nor sleep overtakes Him',
      reference: 'Quran 2:255'
    },
    {
      title: 'The Opening',
      arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      translation: 'All praise is due to Allah, Lord of all the worlds',
      reference: 'Quran 1:2'
    },
    {
      title: 'Light Verse',
      arabic: 'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ',
      translation: 'Allah is the light of the heavens and the earth',
      reference: 'Quran 24:35'
    },
    {
      title: 'Seeking Knowledge',
      arabic: 'رَبِّ زِدْنِي عِلْمًا',
      translation: 'My Lord, increase me in knowledge',
      reference: 'Quran 20:114'
    },
    {
      title: 'Guidance Prayer',
      arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً',
      translation: 'Our Lord, give us good in this world and good in the next world',
      reference: 'Quran 2:201'
    },
    {
      title: 'Trust in Allah',
      arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
      translation: 'And whoever relies upon Allah - then He is sufficient for him',
      reference: 'Quran 65:3'
    },
    {
      title: 'Patience and Prayer',
      arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
      translation: 'And seek help through patience and prayer',
      reference: 'Quran 2:45'
    }
  ];

  const dailyDuas = [
    {
      title: 'Morning Protection',
      arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
      translation: 'We have entered the morning and the dominion belongs to Allah',
      reference: 'Morning Adhkar'
    },
    {
      title: 'Evening Peace',
      arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ',
      translation: 'We have entered the evening and the dominion belongs to Allah',
      reference: 'Evening Adhkar'
    },
    {
      title: 'Before Eating',
      arabic: 'بِسْمِ اللَّهِ',
      translation: 'In the name of Allah',
      reference: 'Prophetic Tradition'
    },
    {
      title: 'Seeking Guidance',
      arabic: 'اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ',
      translation: 'O Allah, guide me among those You have guided',
      reference: 'Sunan at-Tirmidhi'
    },
    {
      title: 'Protection Prayer',
      arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
      translation: 'I seek refuge in the perfect words of Allah from the evil of what He created',
      reference: 'Sahih Muslim'
    },
    {
      title: 'For Easy Affairs',
      arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا',
      translation: 'O Allah, nothing is easy except what You make easy',
      reference: 'Authentic Hadith'
    },
    {
      title: 'Forgiveness Prayer',
      arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ',
      translation: 'I seek forgiveness from Allah the Great, who there is no god except Him',
      reference: 'Authentic Hadith'
    }
  ];

  const dailyDhikr = [
    {
      title: 'Tasbih',
      arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      translation: 'Glory be to Allah and praise be to Him',
      reference: 'Sahih Bukhari'
    },
    {
      title: 'Tahlil',
      arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
      translation: 'There is no god except Allah alone, without any partners',
      reference: 'Sahih Muslim'
    },
    {
      title: 'Takbir',
      arabic: 'اللَّهُ أَكْبَرُ',
      translation: 'Allah is the Greatest',
      reference: 'Daily Remembrance'
    },
    {
      title: 'Hawqala',
      arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
      translation: 'There is no power and no strength except with Allah',
      reference: 'Sahih Bukhari'
    },
    {
      title: 'Istighfar',
      arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ',
      translation: 'I seek forgiveness from Allah the Great',
      reference: 'Sunan at-Tirmidhi'
    },
    {
      title: 'Salawat',
      arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
      translation: 'O Allah, send blessings upon Muhammad and the family of Muhammad',
      reference: 'Sahih al-Bukhari'
    },
    {
      title: 'Dhikr After Prayer',
      arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَاللَّهُ أَكْبَرُ',
      translation: 'Glory be to Allah, praise be to Allah, and Allah is the Greatest',
      reference: 'Sahih Muslim'
    }
  ];

  const dailyHadith = [
    {
      title: 'Intentions',
      arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ',
      translation: 'Actions are but by intention',
      reference: 'Sahih al-Bukhari'
    },
    {
      title: 'Best of People',
      arabic: 'خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ',
      translation: 'The best of people are those who are most beneficial to others',
      reference: 'Ibn Majah'
    },
    {
      title: 'Good Character',
      arabic: 'أَكْمَلُ الْمُؤْمِنِينَ إِيمَانًا أَحْسَنُهُمْ خُلُقًا',
      translation: 'The most complete believers in faith are those with the best character',
      reference: 'Sahih Muslim'
    },
    {
      title: 'Seeking Knowledge',
      arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ',
      translation: 'Whoever takes a path seeking knowledge, Allah will make easy for him a path to Paradise',
      reference: 'Sahih al-Bukhari'
    },
    {
      title: 'True Islam',
      arabic: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ',
      translation: 'A Muslim is one from whom Muslims are safe from his tongue and hand',
      reference: 'Sunan an-Nasa\'i'
    },
    {
      title: 'Brotherhood',
      arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
      translation: 'None of you truly believes until he loves for his brother what he loves for himself',
      reference: 'Sahih Muslim'
    },
    {
      title: 'Prayer Foundation',
      arabic: 'الصَّلاَةُ عِمَادُ الدِّينِ',
      translation: 'Prayer is the pillar of religion',
      reference: 'Sahih Muslim'
    }
  ];

  // Function to fetch a random dua using multilingual service
  const fetchRandomDua = async () => {
    try {
      // Get today's date to ensure consistent dua selection for the day
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      
      console.log(`🌍 BookScreen: Fetching dua in ${currentLanguage} using multilingual service...`);
      
      // Try to fetch from multilingual dua service first
      try {
        const allDuas = await getDuaContent('all', currentLanguage);
        
        if (allDuas && allDuas.length > 0) {
          // Use day of year to select a consistent dua for the day
          const duaIndex = dayOfYear % allDuas.length;
          const selectedDua = allDuas[duaIndex];
          
          console.log(`✅ BookScreen: Selected dua from multilingual service: ${selectedDua.title}`);
          
          return {
            type: t('duaOfTheDay', currentLanguage),
            title: selectedDua.title || 'Daily Dua',
            arabic: selectedDua.arabic || '',
            translation: selectedDua.english || selectedDua.translation || '',
            reference: selectedDua.source || selectedDua.reference || 'Prophetic Tradition',
            color: '#4CAF50',
            icon: 'hand-left-outline'
          };
        }
      } catch (multilingualError) {
        console.log('⚠️ Multilingual dua service failed, trying Firebase...', multilingualError.message);
      }
      
      // Fallback to Firebase
      try {
        const duaSnapshot = await getDocs(collection(firestore, 'duas'));
        const duas = [];
        duaSnapshot.forEach((doc) => {
          duas.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        if (duas.length > 0) {
          // Use day of year to select a consistent dua for the day
          const duaIndex = dayOfYear % duas.length;
          const selectedDua = duas[duaIndex];
          
          return {
            type: t('duaOfTheDay', currentLanguage),
            title: selectedDua.title || selectedDua.english || 'Daily Dua',
            arabic: selectedDua.arabic || '',
            translation: selectedDua.english || selectedDua.translation || '',
            reference: selectedDua.source || 'Prophetic Tradition',
            color: '#4CAF50',
            icon: 'hand-left-outline'
          };
        }
      } catch (firebaseError) {
        console.log('⚠️ Firebase dua fetch failed, using hardcoded data...', firebaseError.message);
      }
      
      // Fallback to hardcoded duas
      const duaIndex = dayOfYear % dailyDuas.length;
      return {
        type: t('duaOfTheDay', currentLanguage),
        title: dailyDuas[duaIndex].title,
        arabic: dailyDuas[duaIndex].arabic,
        translation: dailyDuas[duaIndex].translation,
        reference: dailyDuas[duaIndex].reference,
        color: '#4CAF50',
        icon: 'hand-left-outline'
      };
      
    } catch (error) {
      console.error('Error fetching random dua:', error);
      // Fallback to hardcoded duas
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      const duaIndex = dayOfYear % dailyDuas.length;
      
      return {
        type: t('duaOfTheDay', currentLanguage),
        title: dailyDuas[duaIndex].title,
        arabic: dailyDuas[duaIndex].arabic,
        translation: dailyDuas[duaIndex].translation,
        reference: dailyDuas[duaIndex].reference,
        color: '#4CAF50',
        icon: 'hand-left-outline'
      };
    }
  };

  // Function to fetch a random hadith from the Hadith API
  const fetchRandomHadith = async () => {
    try {
      // Get today's date to ensure consistent hadith selection for the day
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      
      // Hadith API configuration
      const HADITH_API_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';
      
      // Determine which collection to use based on language
      let collectionId, collectionName, collectionNameAr;
      
      if (currentLanguage === 'french') {
        // Use French hadith collection
        collectionId = 'fr-bukhari';
        collectionName = 'Sahih al-Bukhari';
        collectionNameAr = 'صحيح البخاري';
        console.log('🌍 BookScreen: Using French hadith collection');
      } else {
        // Use English collections for English, Spanish, and Italian
        const majorCollections = [
          { id: 'eng-bukhari', name: 'Sahih al-Bukhari', nameAr: 'صحيح البخاري' },
          { id: 'eng-muslim', name: 'Sahih Muslim', nameAr: 'صحيح مسلم' },
          { id: 'eng-abudawud', name: 'Sunan Abu Dawood', nameAr: 'سنن أبي داود' },
          { id: 'eng-tirmidhi', name: 'Jami At-Tirmidhi', nameAr: 'جامع الترمذي' },
          { id: 'eng-ibnmajah', name: 'Sunan Ibn Majah', nameAr: 'سنن ابن ماجه' },
          { id: 'eng-nasai', name: 'Sunan An-Nasai', nameAr: 'سنن النسائي' },
        ];
        
        // Use day of year to select a consistent collection for the day
        const collectionIndex = dayOfYear % majorCollections.length;
        const selectedCollection = majorCollections[collectionIndex];
        collectionId = selectedCollection.id;
        collectionName = selectedCollection.name;
        collectionNameAr = selectedCollection.nameAr;
        console.log(`🌍 BookScreen: Using English hadith collection: ${collectionName}`);
      }
      
      try {
        // Fetch the selected collection
        const collectionUrl = `${HADITH_API_BASE}/editions/${collectionId}.json`;
        const response = await fetch(collectionUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${collectionName}: ${response.status}`);
        }
        
        const collectionData = await response.json();
        
        if (collectionData.hadiths && Array.isArray(collectionData.hadiths) && collectionData.hadiths.length > 0) {
          // Use day of year to select a consistent hadith from this collection
          const hadithIndex = dayOfYear % collectionData.hadiths.length;
          const selectedHadith = collectionData.hadiths[hadithIndex];
          
          // Extract a short title from the hadith text
          const hadithText = selectedHadith.text || '';
          const shortTitle = hadithText.substring(0, 50) + (hadithText.length > 50 ? '...' : '');
          
          return {
            type: t('hadithOfTheDay', currentLanguage),
            title: shortTitle,
            arabic: selectedHadith.arabic || '',
            translation: selectedHadith.text || 'Hadith text not available',
            reference: `${collectionName} ${selectedHadith.hadithnumber || (hadithIndex + 1)}`,
            color: '#9C27B0',
            icon: 'library-outline',
            collection: collectionName,
            collectionAr: collectionNameAr,
            hadithNumber: selectedHadith.hadithnumber || (hadithIndex + 1)
          };
        }
      } catch (apiError) {
        console.log('⚠️ Hadith API fetch failed, using local data...', apiError.message);
      }
      
      // Fallback to hardcoded hadith
      const hadithIndex = dayOfYear % dailyHadith.length;
      return {
        type: t('hadithOfTheDay', currentLanguage),
        title: dailyHadith[hadithIndex].title,
        arabic: dailyHadith[hadithIndex].arabic,
        translation: dailyHadith[hadithIndex].translation,
        reference: dailyHadith[hadithIndex].reference,
        color: '#9C27B0',
        icon: 'library-outline'
      };
      
    } catch (error) {
      console.error('Error fetching random hadith:', error);
      // Fallback to hardcoded hadith
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const hadithIndex = dayOfYear % dailyHadith.length;

      return {
        type: t('hadithOfTheDay', currentLanguage),
        title: dailyHadith[hadithIndex].title,
        arabic: dailyHadith[hadithIndex].arabic,
        translation: dailyHadith[hadithIndex].translation,
        reference: dailyHadith[hadithIndex].reference,
        color: '#9C27B0',
        icon: 'library-outline'
      };
    }
  };

  // Function to fetch a random dhikr using multilingual service
  const fetchRandomDhikr = async () => {
    try {
      // Get today's date to ensure consistent dhikr selection for the day
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      
      console.log(`🌍 BookScreen: Fetching dhikr in ${currentLanguage} using multilingual service...`);
      
      // Try to fetch from multilingual dhikr service first
      try {
        const allDhikrs = await getDhikrContent('all', currentLanguage);
        
        if (allDhikrs && allDhikrs.length > 0) {
          // Use day of year to select a consistent dhikr for the day
          const dhikrIndex = dayOfYear % allDhikrs.length;
          const selectedDhikr = allDhikrs[dhikrIndex];
          
          console.log(`✅ BookScreen: Selected dhikr from multilingual service: ${selectedDhikr.title}`);
          
          return {
            type: t('dhikrOfTheDay', currentLanguage),
            title: selectedDhikr.title || selectedDhikr.arabic || 'Daily Dhikr',
            arabic: selectedDhikr.arabic || '',
            translation: selectedDhikr.translation || selectedDhikr.english || '',
            reference: selectedDhikr.source || selectedDhikr.reference || 'Prophetic Tradition',
            color: '#FF9800',
            icon: 'refresh-outline',
            dhikrId: selectedDhikr.id, // Add the document ID
            category: selectedDhikr.category || 'general' // Add the category for better matching
          };
        }
      } catch (multilingualError) {
        console.log('⚠️ Multilingual dhikr service failed, trying Firebase...', multilingualError.message);
      }
      
      // Fallback to Firebase
      try {
        console.log('📡 BookScreen: Fetching dhikr from Firebase...');
        const dhikrSnapshot = await getDocs(collection(firestore, 'dhikr'));
        const dhikrs = [];
        dhikrSnapshot.forEach((doc) => {
          dhikrs.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log(`📊 BookScreen: Found ${dhikrs.length} dhikrs in Firebase`);
        
        if (dhikrs.length > 0) {
          // Use day of year to select a consistent dhikr for the day
          const dhikrIndex = dayOfYear % dhikrs.length;
          const selectedDhikr = dhikrs[dhikrIndex];
          
          console.log(`✅ BookScreen: Selected dhikr from Firebase: ${selectedDhikr.title} (ID: ${selectedDhikr.id})`);
          
          return {
            type: t('dhikrOfTheDay', currentLanguage),
            title: selectedDhikr.title || selectedDhikr.arabic || 'Daily Dhikr',
            arabic: selectedDhikr.arabic || '',
            translation: selectedDhikr.translation || selectedDhikr.english || '',
            reference: selectedDhikr.source || 'Prophetic Tradition',
            color: '#FF9800',
            icon: 'refresh-outline',
            dhikrId: selectedDhikr.id, // Add the Firebase document ID
            category: selectedDhikr.category || 'general' // Add the category for better matching
          };
        }
      } catch (firebaseError) {
        console.log('⚠️ Firebase dhikr fetch failed, using hardcoded data...', firebaseError.message);
      }
      
      // Fallback to hardcoded dhikr
      const dhikrIndex = dayOfYear % dailyDhikr.length;
      return {
        type: t('dhikrOfTheDay', currentLanguage),
        title: dailyDhikr[dhikrIndex].title,
        arabic: dailyDhikr[dhikrIndex].arabic,
        translation: dailyDhikr[dhikrIndex].translation,
        reference: dailyDhikr[dhikrIndex].reference,
        color: '#FF9800',
        icon: 'refresh-outline',
        category: 'general' // Default category for hardcoded dhikr
      };
      
    } catch (error) {
      console.error('Error fetching random dhikr:', error);
      // Fallback to hardcoded dhikr
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      const dhikrIndex = dayOfYear % dailyDhikr.length;
      
      return {
        type: t('dhikrOfTheDay', currentLanguage),
        title: dailyDhikr[dhikrIndex].title,
        arabic: dailyDhikr[dhikrIndex].arabic,
        translation: dailyDhikr[dhikrIndex].translation,
        reference: dailyDhikr[dhikrIndex].reference,
        color: '#FF9800',
        icon: 'refresh-outline',
        category: 'general' // Default category for hardcoded dhikr
      };
    }
  };

  // Function to fetch a random verse from the Quran API
  const fetchRandomVerse = async () => {
    try {
      // Get today's date to ensure consistent verse selection for the day
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      
      // Use day of year to select a consistent surah and ayah for the day
      // We'll use surahs 2-114 (avoiding Al-Fatiha for variety)
      const surahNumber = ((dayOfYear % 113) + 2); // 2-114
      
      // Get surah info first
      const surahResponse = await fetch(`${ALQURAN_API_BASE}/surah/${surahNumber}`);
      const surahData = await surahResponse.json();
      
      if (!surahData.data) {
        throw new Error('Failed to fetch surah data');
      }
      
      const totalAyahs = surahData.data.numberOfAyahs;
      const surahName = surahData.data.englishName;
      const surahNameArabic = surahData.data.name;
      
      // Select a random ayah from this surah using day of year
      const ayahNumber = (dayOfYear % totalAyahs) + 1;
      
      // Get the appropriate translation edition for the current language
      const translationEdition = getTranslationEdition(currentLanguage);
      console.log(`🌍 BookScreen: Fetching verse translation in ${currentLanguage} using edition: ${translationEdition}`);
      
      // Fetch the specific ayah with Arabic and translation in selected language
      const [arabicResponse, translationResponse] = await Promise.all([
        fetch(`${ALQURAN_API_BASE}/ayah/${surahNumber}:${ayahNumber}/ar`),
        fetch(`${ALQURAN_API_BASE}/ayah/${surahNumber}:${ayahNumber}/${translationEdition}`)
      ]);
      
      const [arabicData, translationData] = await Promise.all([
        arabicResponse.json(),
        translationResponse.json()
      ]);
      
      if (!arabicData.data || !translationData.data) {
        throw new Error('Failed to fetch verse data');
      }
      
      return {
        type: t('verseOfTheDay', currentLanguage),
        title: `${surahName} ${ayahNumber}`,
        arabic: arabicData.data.text,
        translation: translationData.data.text,
        reference: `Quran ${surahNumber}:${ayahNumber}`,
        color: '#2196F3',
        icon: 'book-outline',
        surahName: surahName,
        surahNameArabic: surahNameArabic,
        ayahNumber: ayahNumber,
        surahNumber: surahNumber
      };
      
    } catch (error) {
      console.error('Error fetching random verse:', error);
      // Fallback to hardcoded verses
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      const verseIndex = dayOfYear % quranVerses.length;
      
      return {
        type: t('verseOfTheDay', currentLanguage),
        title: quranVerses[verseIndex].title,
        arabic: quranVerses[verseIndex].arabic,
        translation: quranVerses[verseIndex].translation,
        reference: quranVerses[verseIndex].reference,
        color: '#2196F3',
        icon: 'book-outline'
      };
    }
  };

  // Function to get daily content based on current date
  const getDailyContent = async () => {
    console.log('📅 BookScreen: Getting daily content...');
    
    try {
      // Try to fetch random content from APIs/Firebase first
      const [randomVerse, randomDua, randomDhikr, randomHadith] = await Promise.all([
        fetchRandomVerse(),
        fetchRandomDua(),
        fetchRandomDhikr(),
        fetchRandomHadith()
      ]);

      console.log('📊 BookScreen: Daily content fetched from APIs:', {
        verse: randomVerse.type,
        dua: randomDua.type,
        dhikr: randomDhikr.type,
        hadith: randomHadith.type
      });
      
      // Save daily content to widget storage
      try {
        widgetService.saveDailyHadith(randomHadith);
        widgetService.saveDailyDua(randomDua);
        widgetService.saveDailyDhikr(randomDhikr);
      } catch (error) {
        console.error('Error saving daily content to widgets:', error);
      }
      
      console.log('🔍 BookScreen: Type values for navigation logic:', {
        verseType: randomVerse.type,
        verseIncludesVerse: randomVerse.type.includes('Verse'),
        verseIncludesVerso: randomVerse.type.includes('Verso'),
        verseIncludesVerset: randomVerse.type.includes('Verset'),
        verseIncludesVersetto: randomVerse.type.includes('Versetto'),
        hadithType: randomHadith.type,
        hadithIncludesHadith: randomHadith.type.includes('Hadith'),
        hadithIncludesHadiz: randomHadith.type.includes('Hadiz')
      });

      // Log detailed data for debugging navigation
      console.log('🔍 BookScreen: Detailed verse data for navigation:', {
        surahNumber: randomVerse.surahNumber,
        ayahNumber: randomVerse.ayahNumber,
        surahName: randomVerse.surahName
      });
      
      console.log('🔍 BookScreen: Detailed hadith data for navigation:', {
        collection: randomHadith.collection,
        hadithNumber: randomHadith.hadithNumber,
        title: randomHadith.title
      });

      // Save daily Quran verse to widget
      try {
        widgetService.saveDailyQuranVerse({
          arabic: randomVerse.arabic || '',
          translation: randomVerse.translation || '',
          reference: randomVerse.reference || '',
          surahName: randomVerse.surahName || '',
          surahNameArabic: randomVerse.surahNameArabic || '',
          ayahNumber: randomVerse.ayahNumber || 0,
          surahNumber: randomVerse.surahNumber || 0
        });
      } catch (error) {
        console.error('Error saving daily Quran verse to widget:', error);
      }

      return [
        randomVerse,
        randomDua,
        randomDhikr,
        randomHadith
      ];
    } catch (error) {
      console.log('📊 BookScreen: Using multilingual daily content service due to API error:', error.message);
      
      // Fallback to multilingual daily content service
      return multilingualDailyContentService.getDailyContent(currentLanguage);
    }
  };

    // Initialize animations
  useEffect(() => {
    console.log('🎭 BookScreen: Initializing animations');
    // Ensure animations start at 0
    headerAnim.setValue(0);
    optionsAnim.setValue(0);
    carouselAnim.setValue(0);
  }, []);

  // Function to load Quran streak
  const loadQuranStreak = async () => {
    try {
      const streak = await streakService.getCurrentStreak();
      console.log('🔥 BookScreen: Loaded Quran streak:', streak);
      setQuranStreak(streak);
    } catch (error) {
      console.error('🔥 BookScreen: Error loading streak:', error);
      setQuranStreak(0);
    }
  };

  // Function to load Hadith streak
  const loadHadithStreak = async () => {
    try {
      const streak = await streakService.getCurrentHadithStreak();
      console.log('📚 BookScreen: Loaded Hadith streak:', streak);
      setHadithStreak(streak);
    } catch (error) {
      console.error('📚 BookScreen: Error loading hadith streak:', error);
      setHadithStreak(0);
    }
  };

  // Load daily content when component mounts
  useFocusEffect(
    React.useCallback(() => {
      const loadDailyContent = async () => {
        setLoading(true);
        try {
          const content = await getDailyContent();
          setDailyContent(content);
        } catch (error) {
          console.error('Error loading daily content:', error);
          // Fallback to multilingual daily content service
          const fallbackContent = multilingualDailyContentService.getDailyContent(currentLanguage);
          setDailyContent(fallbackContent);
        } finally {
          setLoading(false);
        }
      };
      
      // Load both daily content and streaks
      loadDailyContent();
      loadQuranStreak();
      loadHadithStreak();

      // Start entrance animations immediately
      startEntranceAnimations();
    }, [])
  );

  // Reload daily content when language changes
  useEffect(() => {
    console.log(`🌍 BookScreen: Language changed to: ${currentLanguage}`);
    const loadDailyContent = async () => {
      setLoading(true);
      try {
        // Clear cache to ensure fresh content
        multilingualDailyContentService.clearCache();
        
        const content = await getDailyContent();
        console.log(`📖 BookScreen: Loaded content for language: ${currentLanguage}`, content);
        setDailyContent(content);
      } catch (error) {
        console.error('Error loading daily content:', error);
        // Fallback to multilingual daily content service
        const fallbackContent = multilingualDailyContentService.getDailyContent(currentLanguage);
        console.log(`🔄 BookScreen: Using fallback content for language: ${currentLanguage}`, fallbackContent);
        setDailyContent(fallbackContent);
      } finally {
        setLoading(false);
      }
    };
    
    loadDailyContent();
    // Also reload streaks when language changes (for proper display)
    loadQuranStreak();
    loadHadithStreak();
  }, [currentLanguage]);

  // Animation functions
  const startEntranceAnimations = () => {
    console.log('🎬 Starting BookScreen entrance animations');
    
    // Reset all animations
    headerAnim.setValue(0);
    optionsAnim.setValue(0);
    carouselAnim.setValue(0);

    // Staggered entrance animations
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(optionsAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(carouselAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start(() => {
      console.log('✅ BookScreen animations completed');
    });
  };

  const animateButtonPress = (buttonScale, onPress) => {
    console.log('👆 BookScreen: Button pressed, animating scale:', buttonScale);
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onPress) onPress();
    });
  };

  const getButtonScale = (optionTitle, index) => {
    console.log('🎯 BookScreen: Getting button scale for:', optionTitle, 'at index:', index);
    // Use index to determine which scale to use for each button
    switch (index) {
      case 0: 
        console.log('📖 BookScreen: Using quranButtonScale');
        return quranButtonScale;    // Quran
      case 1: 
        console.log('🙏 BookScreen: Using duaButtonScale');
        return duaButtonScale;      // Dua
      case 2: 
        console.log('🔄 BookScreen: Using dhikrButtonScale');
        return dhikrButtonScale;    // Dhikr
      case 3: 
        console.log('📚 BookScreen: Using hadithButtonScale');
        return hadithButtonScale;   // Hadith
      default: 
        console.log('⚠️ BookScreen: Using fallback quranButtonScale');
        return quranButtonScale;   // fallback
    }
  };

  const getDailyContentScale = (contentType) => {
    console.log('🎯 BookScreen: Getting scale for content type:', contentType);
    if (contentType.includes('Verse') || contentType.includes('Verso') || contentType.includes('Verset') || contentType.includes('Versetto')) {
      console.log('📖 BookScreen: Using dailyVerseScale for verse content');
      return dailyVerseScale;
    } else if (contentType.includes('Dua')) {
      console.log('🙏 BookScreen: Using dailyDuaScale for dua content');
      return dailyDuaScale;
    } else if (contentType.includes('Dhikr')) {
      console.log('🔄 BookScreen: Using dailyDhikrScale for dhikr content');
      return dailyDhikrScale;
    } else if (contentType.includes('Hadith') || contentType.includes('Hadiz')) {
      console.log('📚 BookScreen: Using dailyHadithScale for hadith content');
      return dailyHadithScale;
    }
    console.log('⚠️ BookScreen: Using fallback dailyVerseScale');
    return dailyVerseScale; // fallback
  };

  const bookOptions = [
    {
      title: t('quran', currentLanguage),
      arabic: 'القرآن',
      image: require('../assets/quranscreen.png'),
      color: '#2196F3',
      description: t('readTheHolyQuran', currentLanguage)
    },
    {
      title: t('dua', currentLanguage),
      arabic: 'الدعاء',
      image: require('../assets/duascreen.png'),
      color: '#4CAF50',
      description: t('collectionOfPrayers', currentLanguage)
    },
    {
      title: t('dhikr', currentLanguage),
      arabic: 'الذكر',
      image: require('../assets/dhikrscreenn.png'),
      color: '#FF9800',
      description: t('remembranceOfAllah', currentLanguage)
    },
    {
      title: t('hadith', currentLanguage),
      arabic: 'الحديث',
      image: require('../assets/hadithscreen.png'),
      color: '#9C27B0',
      description: t('propheticTraditions', currentLanguage)
    }
  ];

  const handleOptionPress = (option) => {
    if (option.title === t('quran', currentLanguage)) {
      navigation.navigate('Quran');
    } else if (option.title === t('dua', currentLanguage)) {
      navigation.navigate('Dua');
    } else if (option.title === t('dhikr', currentLanguage)) {
      navigation.navigate('Dhikr');
    } else if (option.title === t('hadith', currentLanguage)) {
      navigation.navigate('HadithBookCatalogScreen');
    } else {
      Alert.alert(
        option.title,
        `${option.description} - ${t('comingSoon', currentLanguage)}!`,
        [{ text: t('ok', currentLanguage), style: 'default' }]
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.title}>{t('islamicLibrary', currentLanguage)}</Text>
        <Text style={styles.subtitle}>{t('accessSacredTexts', currentLanguage)}</Text>
      </Animated.View>

      <Animated.View 
        style={[
          styles.optionsContainer,
          {
            opacity: optionsAnim,
            transform: [
              {
                translateY: optionsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.gridRow}>
          {bookOptions.slice(0, 2).map((option, index) => (
            <Animated.View 
              key={index}
              style={{ 
                transform: [{ scale: getButtonScale(option.title, index) }],
                width: '48%'
              }}
            >
              <TouchableOpacity
              style={styles.optionCard}
                onPress={() => animateButtonPress(getButtonScale(option.title, index), () => handleOptionPress(option))}
            >
              {/* Streak badge for Quran button - always show */}
              {option.title === t('quran', currentLanguage) && (
                <View style={[
                  styles.streakBadge, 
                  quranStreak === 0 && styles.streakBadgeEmpty
                ]}>
                  <Ionicons 
                    name="flame" 
                    size={12} 
                    color={quranStreak > 0 ? "#FF6B35" : "#666666"} 
                  />
                  <Text style={[
                    styles.streakText,
                    quranStreak === 0 && styles.streakTextEmpty
                  ]}>
                    {quranStreak}
                  </Text>
                </View>
              )}
              
              <View style={[styles.iconContainer, { backgroundColor: 'transparent' }]}>
                <Image 
                  source={option.image}
                  style={styles.optionImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={[
                styles.optionTitle,
                getResponsiveTextStyle(option.title, 18, currentLanguage, Dimensions.get('window').width - 80)
              ]}>
                {option.title}
              </Text>
              <Text style={styles.optionArabic}>{option.arabic}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
        
        <View style={styles.gridRow}>
          {bookOptions.slice(2, 4).map((option, index) => (
            <Animated.View 
              key={index + 2}
              style={{ 
                transform: [{ scale: getButtonScale(option.title, index + 2) }],
                width: '48%'
              }}
            >
              <TouchableOpacity
              style={styles.optionCard}
                onPress={() => animateButtonPress(getButtonScale(option.title, index + 2), () => handleOptionPress(option))}
            >
              {/* Streak badge for Hadith button - always show */}
              {option.title === t('hadith', currentLanguage) && (
                <View style={[
                  styles.streakBadge, 
                  hadithStreak === 0 && styles.streakBadgeEmpty
                ]}>
                  <Ionicons 
                    name="flame" 
                    size={12} 
                    color={hadithStreak > 0 ? "#FF6B35" : "#666666"} 
                  />
                  <Text style={[
                    styles.streakText,
                    hadithStreak === 0 && styles.streakTextEmpty,
                    hadithStreak > 0 && { color: '#FF6B35' }
                  ]}>
                    {hadithStreak}
                  </Text>
                </View>
              )}
              
              <View style={[styles.iconContainer, { backgroundColor: 'transparent' }]}>
                <Image 
                  source={option.image}
                  style={styles.optionImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={[
                styles.optionTitle,
                getResponsiveTextStyle(option.title, 18, currentLanguage, Dimensions.get('window').width - 80)
              ]}>
                {option.title}
              </Text>
              <Text style={styles.optionArabic}>{option.arabic}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Daily Content Carousel */}
      <Animated.View 
        style={[
          styles.carouselSection,
          {
            opacity: carouselAnim,
            transform: [
              {
                translateY: carouselAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.carouselSectionHeader}>
          <Text style={styles.carouselTitle}>{t('dailyInspiration', currentLanguage)}</Text>
        </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>{t('loadingDailyInspiration', currentLanguage)}</Text>
            </View>
          ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          snapToInterval={width - 60}
          decelerationRate="fast"
        >
          {dailyContent.map((item, index) => (
            <Animated.View 
              key={index} 
              style={{ 
                transform: [{ scale: getDailyContentScale(item.type) }],
              }}
            >
              <TouchableOpacity 
              style={styles.carouselCard}
              onPress={() => {
                  animateButtonPress(getDailyContentScale(item.type), () => {
                    // Navigate to respective screen with specific content when daily inspiration is tapped
                    console.log('📱 BookScreen: Daily content tapped:', {
                      type: item.type,
                      title: item.title,
                      surahNumber: item.surahNumber,
                      ayahNumber: item.ayahNumber,
                      collection: item.collection,
                      hadithNumber: item.hadithNumber
                    });
                    
                if (item.type.includes('Verse') || item.type.includes('Verso') || item.type.includes('Verset') || item.type.includes('Versetto')) {
                      console.log('📱 BookScreen: Navigating to Quran with highlight:', {
                        surahNumber: item.surahNumber,
                        ayahNumber: item.ayahNumber,
                        surahName: item.surahName,
                        surahNameArabic: item.surahNameArabic,
                        title: item.title,
                        reference: item.reference
                      });
                      navigation.navigate('Quran', { 
                        highlightVerse: {
                          surahNumber: item.surahNumber,
                          ayahNumber: item.ayahNumber,
                          surahName: item.surahName,
                          surahNameArabic: item.surahNameArabic
                        }
                      });
                } else if (item.type.includes('Dua')) {
                      console.log('📱 BookScreen: Navigating to Dua with highlight:', {
                        title: item.title,
                        reference: item.reference
                      });
                      navigation.navigate('Dua', { 
                        highlightDua: {
                          title: item.title,
                          arabic: item.arabic,
                          translation: item.translation,
                          reference: item.reference
                        }
                      });
                } else if (item.type.includes('Dhikr')) {
                      console.log('📱 BookScreen: Navigating to Dhikr with highlight:', {
                        title: item.title,
                        dhikrId: item.dhikrId,
                        category: item.category
                      });
                      navigation.navigate('Dhikr', { 
                        highlightDhikr: {
                          title: item.title,
                          arabic: item.arabic,
                          translation: item.translation,
                          reference: item.reference,
                          dhikrId: item.dhikrId, // Pass the Firebase document ID
                          category: item.category // Pass the category
                        }
                      });
                } else if (item.type.includes('Hadith') || item.type.includes('Hadiz')) {
                      console.log('📱 BookScreen: Navigating to Hadith with highlight:', {
                        title: item.title,
                        collection: item.collection,
                        collectionAr: item.collectionAr,
                        hadithNumber: item.hadithNumber,
                        translation: item.translation?.substring(0, 100) + '...'
                      });
                      
                      // Map collection name to book ID
                      const collectionToIdMap = {
                        'Sahih al-Bukhari': 'bukhari',
                        'Sahih Muslim': 'muslim',
                        'Sunan Abu Dawood': 'abudawud',
                        'Jami At-Tirmidhi': 'tirmidhi',
                        'Sunan Ibn Majah': 'ibnmajah',
                        'Sunan An-Nasai': 'nasai',
                      };
                      
                      // Find the book ID from collection name
                      const bookId = collectionToIdMap[item.collection] || 'bukhari'; // Default to bukhari
                      
                      console.log('📱 BookScreen: Navigating to HadithScreen with book:', bookId, 'and hadith:', item.hadithNumber);
                      
                      // Navigate directly to HadithScreen with the selected book and highlight
                      navigation.navigate('Hadith', {
                        selectedBook: bookId,
                        bookName: item.collection,
                        bookNameAr: item.collectionAr,
                        highlightHadith: {
                          title: item.title,
                          arabic: item.arabic,
                          translation: item.translation,
                          reference: item.reference,
                          collection: item.collection,
                          collectionAr: item.collectionAr,
                          hadithNumber: item.hadithNumber
                        }
                      });
                } else {
                  Alert.alert(item.type, `${item.title}\n\n${item.translation}\n\nSource: ${item.reference}`);
                }
                  }); // Close animateButtonPress callback
                }} // Close onPress
            >

              
              <Text style={[
                styles.carouselTitle2,
                getResponsiveTextStyle(item.title, 18, currentLanguage, Dimensions.get('window').width - 60)
              ]}>
                {item.title}
              </Text>
              <Text style={styles.carouselArabic}>{item.arabic}</Text>
              <Text style={[
                styles.carouselTranslation,
                getResponsiveTextStyle(item.translation, 16, currentLanguage, Dimensions.get('window').width - 60)
              ]}>
                {item.translation}
              </Text>
              
              <View style={styles.carouselFooter}>
                <Text style={styles.carouselReference}>{item.reference}</Text>
                <Ionicons name="chevron-forward" size={16} color="#B0B0B0" />
              </View>
            </TouchableOpacity>
            </Animated.View>
          ))}
                 </ScrollView>
          )}
       </Animated.View>
     </ScrollView>
    </SafeAreaView>
   );
 }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    fontWeight: '500',
  },
  optionsContainer: {
    paddingHorizontal: 20,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  optionImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
  optionArabic: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '400',
  },
  carouselSection: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  carouselSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  carouselTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  dailyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dailyText: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '600',
  },
  carousel: {
    paddingLeft: 20,
  },
  carouselCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    marginRight: 15,
    width: width - 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  carouselTitle2: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
  carouselArabic: {
    fontSize: 18,
    textAlign: 'right',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 28,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'Roboto',
  },
  carouselTranslation: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '500',
  },
  carouselFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 42, 42, 0.8)',
  },
  carouselReference: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#B0B0B0',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  streakBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  streakText: {
    color: '#FF6B35',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  streakBadgeEmpty: {
    backgroundColor: '#2A2A2A',
    borderColor: '#666666',
    shadowColor: '#666666',
    opacity: 0.7,
  },
  streakTextEmpty: {
    color: '#666666',
  },
}); 