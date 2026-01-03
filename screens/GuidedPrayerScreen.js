import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Switch,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../utils/useLanguage';
import { t, translations } from '../utils/translations';
import { getTranslationEdition } from '../utils/quranTranslations';
import { availableReciters, getAyahAudioUrl } from '../services/reciterService';

const ALQURAN_API_BASE = 'https://api.alquran.cloud/v1';
const QURAN_COM_AUDIO_CDN = 'https://verses.quran.com';

// Constants moved outside component to prevent hooks order issues
const shortSurahs = [
  {
    number: 112,
    name: 'Al-Ikhlas',
    arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ ۝ ٱللَّهُ ٱلصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
    transliteration: 'Qul huwa Allahu ahad. Allahu as-samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
    translation: 'Say: He is Allah, the One! Allah, the Eternal, Absolute; He begets not, nor is He begotten; And there is none like unto Him.'
  },
  {
    number: 113,
    name: 'Al-Falaq',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    transliteration: 'Qul a\'udhu bi rabbi al-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab. Wa min sharri an-naffathati fi al-\'uqad. Wa min sharri hasidin idha hasad.',
    translation: 'Say: I seek refuge with the Lord of the Dawn, From the mischief of created things; From the mischief of Darkness as it overspreads; From the mischief of those who practice Secret Arts; And from the mischief of the envious one as he practices envy.'
  },
  {
    number: 114,
    name: 'An-Nas',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ ۝ مَلِكِ ٱلنَّاسِ ۝ إِلَٰهِ ٱلنَّاسِ ۝ مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ ۝ ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ ۝ مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
    transliteration: 'Qul a\'udhu bi rabbi an-nas. Maliki an-nas. Ilahi an-nas. Min sharri al-waswasi al-khannas. Alladhi yuwaswisu fi suduri an-nas. Min al-jinnati wa an-nas.',
    translation: 'Say: I seek refuge with the Lord and Cherisher of Mankind, The King (or Ruler) of Mankind, The God (or Judge) of Mankind, From the mischief of the Whisperer (of Evil), who withdraws (after his whisper), (The same) who whispers into the hearts of Mankind, Among Jinns and among men.'
  },
  {
    number: 110,
    name: 'An-Nasr',
    arabic: 'إِذَا جَآءَ نَصْرُ ٱللَّهِ وَٱلْفَتْحُ ۝ وَرَأَيْتَ ٱلنَّاسَ يَدْخُلُونَ فِى دِينِ ٱللَّهِ أَفْوَاجًا ۝ فَسَبِّحْ بِحَمْدِ رَبِّكَ وَٱسْتَغْفِرْهُ ۚ إِنَّهُۥ كَانَ تَوَّابًۢا',
    transliteration: 'Idha ja\'a nasru Allahi wa al-fath. Wa ra\'ayta an-nasa yadkhuluna fi dini Allahi afwajan. Fa sabbih bi hamdi rabbika wa astaghfirhu innahu kana tawwaban.',
    translation: 'When comes the Help of Allah, and Victory, And you see the people enter Allah\'s Religion in crowds, Celebrate the praises of your Lord, and pray for His Forgiveness: For He is Oft-Returning (in Grace and Mercy).'
  },
  {
    number: 108,
    name: 'Al-Kawthar',
    arabic: 'إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ ۝ فَصَلِّ لِرَبِّكَ وَٱنْحَرْ ۝ إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ',
    transliteration: 'Inna a\'taynayka al-kawthar. Fa salli li rabbika wa anhar. Inna shani\'aka huwa al-abtar.',
    translation: 'To you have We granted the Fount (of Abundance). Therefore to your Lord turn in Prayer and Sacrifice. For he who hates you, he will be cut off (from Future Hope).'
  }
];

// Prayer configurations
const prayerConfigs = {
  fajr: { rakahs: 2, hasMiddleTashahhud: false, hasQunoot: false },
  dhuhr: { rakahs: 4, hasMiddleTashahhud: true, hasQunoot: false },
  asr: { rakahs: 4, hasMiddleTashahhud: true, hasQunoot: false },
  maghrib: { rakahs: 3, hasMiddleTashahhud: true, hasQunoot: false },
  isha: { rakahs: 4, hasMiddleTashahhud: true, hasQunoot: false },
  witr: { rakahs: 3, hasMiddleTashahhud: true, hasQunoot: true }
};

// Quran recitation options - will be populated with translations
const getQuranRecitationOptions = (language) => [
  { id: 'fixed', name: t('fixedSurahs', language), description: t('fixedSurahsDescription', language) },
  { id: 'random', name: t('randomVerses', language), description: t('randomVersesDescription', language) },
  { id: 'custom', name: t('customSelection', language), description: t('customSelectionDescription', language) }
];

const getRandomVerseOptions = (language) => [
  { id: 'last3juz', name: t('last3Juzes', language), description: t('last3JuzesDescription', language) },
  { id: 'lastjuz', name: t('lastJuz', language), description: t('lastJuzDescription', language) },
  { id: 'wholequran', name: t('wholeQuran', language), description: t('wholeQuranDescription', language) }
];

// Surah list for dropdown
const surahList = [
  { number: 1, name: 'Al-Fatiha', arabicName: 'الفاتحة', ayahs: 7 },
  { number: 2, name: 'Al-Baqarah', arabicName: 'البقرة', ayahs: 286 },
  { number: 3, name: 'Aal-Imran', arabicName: 'آل عمران', ayahs: 200 },
  { number: 4, name: 'An-Nisa', arabicName: 'النساء', ayahs: 176 },
  { number: 5, name: 'Al-Ma\'idah', arabicName: 'المائدة', ayahs: 120 },
  { number: 6, name: 'Al-An\'am', arabicName: 'الأنعام', ayahs: 165 },
  { number: 7, name: 'Al-A\'raf', arabicName: 'الأعراف', ayahs: 206 },
  { number: 8, name: 'Al-Anfal', arabicName: 'الأنفال', ayahs: 75 },
  { number: 9, name: 'At-Tawbah', arabicName: 'التوبة', ayahs: 129 },
  { number: 10, name: 'Yunus', arabicName: 'يونس', ayahs: 109 },
  { number: 11, name: 'Hud', arabicName: 'هود', ayahs: 123 },
  { number: 12, name: 'Yusuf', arabicName: 'يوسف', ayahs: 111 },
  { number: 13, name: 'Ar-Ra\'d', arabicName: 'الرعد', ayahs: 43 },
  { number: 14, name: 'Ibrahim', arabicName: 'إبراهيم', ayahs: 52 },
  { number: 15, name: 'Al-Hijr', arabicName: 'الحجر', ayahs: 99 },
  { number: 16, name: 'An-Nahl', arabicName: 'النحل', ayahs: 128 },
  { number: 17, name: 'Al-Isra', arabicName: 'الإسراء', ayahs: 111 },
  { number: 18, name: 'Al-Kahf', arabicName: 'الكهف', ayahs: 110 },
  { number: 19, name: 'Maryam', arabicName: 'مريم', ayahs: 98 },
  { number: 20, name: 'Ta-Ha', arabicName: 'طه', ayahs: 135 },
  { number: 21, name: 'Al-Anbiya', arabicName: 'الأنبياء', ayahs: 112 },
  { number: 22, name: 'Al-Hajj', arabicName: 'الحج', ayahs: 78 },
  { number: 23, name: 'Al-Mu\'minun', arabicName: 'المؤمنون', ayahs: 118 },
  { number: 24, name: 'An-Nur', arabicName: 'النور', ayahs: 64 },
  { number: 25, name: 'Al-Furqan', arabicName: 'الفرقان', ayahs: 77 },
  { number: 26, name: 'Ash-Shu\'ara', arabicName: 'الشعراء', ayahs: 227 },
  { number: 27, name: 'An-Naml', arabicName: 'النمل', ayahs: 93 },
  { number: 28, name: 'Al-Qasas', arabicName: 'القصص', ayahs: 88 },
  { number: 29, name: 'Al-Ankabut', arabicName: 'العنكبوت', ayahs: 69 },
  { number: 30, name: 'Ar-Rum', arabicName: 'الروم', ayahs: 60 },
  { number: 31, name: 'Luqman', arabicName: 'لقمان', ayahs: 34 },
  { number: 32, name: 'As-Sajdah', arabicName: 'السجدة', ayahs: 30 },
  { number: 33, name: 'Al-Ahzab', arabicName: 'الأحزاب', ayahs: 73 },
  { number: 34, name: 'Saba', arabicName: 'سبإ', ayahs: 54 },
  { number: 35, name: 'Fatir', arabicName: 'فاطر', ayahs: 45 },
  { number: 36, name: 'Ya-Sin', arabicName: 'يس', ayahs: 83 },
  { number: 37, name: 'As-Saffat', arabicName: 'الصافات', ayahs: 182 },
  { number: 38, name: 'Sad', arabicName: 'ص', ayahs: 88 },
  { number: 39, name: 'Az-Zumar', arabicName: 'الزمر', ayahs: 75 },
  { number: 40, name: 'Ghafir', arabicName: 'غافر', ayahs: 85 },
  { number: 41, name: 'Fussilat', arabicName: 'فصلت', ayahs: 54 },
  { number: 42, name: 'Ash-Shura', arabicName: 'الشورى', ayahs: 53 },
  { number: 43, name: 'Az-Zukhruf', arabicName: 'الزخرف', ayahs: 89 },
  { number: 44, name: 'Ad-Dukhan', arabicName: 'الدخان', ayahs: 59 },
  { number: 45, name: 'Al-Jathiyah', arabicName: 'الجاثية', ayahs: 37 },
  { number: 46, name: 'Al-Ahqaf', arabicName: 'الأحقاف', ayahs: 35 },
  { number: 47, name: 'Muhammad', arabicName: 'محمد', ayahs: 38 },
  { number: 48, name: 'Al-Fath', arabicName: 'الفتح', ayahs: 29 },
  { number: 49, name: 'Al-Hujurat', arabicName: 'الحجرات', ayahs: 18 },
  { number: 50, name: 'Qaf', arabicName: 'ق', ayahs: 45 },
  { number: 51, name: 'Adh-Dhariyat', arabicName: 'الذاريات', ayahs: 60 },
  { number: 52, name: 'At-Tur', arabicName: 'الطور', ayahs: 49 },
  { number: 53, name: 'An-Najm', arabicName: 'النجم', ayahs: 62 },
  { number: 54, name: 'Al-Qamar', arabicName: 'القمر', ayahs: 55 },
  { number: 55, name: 'Ar-Rahman', arabicName: 'الرحمن', ayahs: 78 },
  { number: 56, name: 'Al-Waqi\'ah', arabicName: 'الواقعة', ayahs: 96 },
  { number: 57, name: 'Al-Hadid', arabicName: 'الحديد', ayahs: 29 },
  { number: 58, name: 'Al-Mujadila', arabicName: 'المجادلة', ayahs: 22 },
  { number: 59, name: 'Al-Hashr', arabicName: 'الحشر', ayahs: 24 },
  { number: 60, name: 'Al-Mumtahanah', arabicName: 'الممتحنة', ayahs: 13 },
  { number: 61, name: 'As-Saf', arabicName: 'الصف', ayahs: 14 },
  { number: 62, name: 'Al-Jumu\'ah', arabicName: 'الجمعة', ayahs: 11 },
  { number: 63, name: 'Al-Munafiqun', arabicName: 'المنافقون', ayahs: 11 },
  { number: 64, name: 'At-Taghabun', arabicName: 'التغابن', ayahs: 18 },
  { number: 65, name: 'At-Talaq', arabicName: 'الطلاق', ayahs: 12 },
  { number: 66, name: 'At-Tahrim', arabicName: 'التحريم', ayahs: 12 },
  { number: 67, name: 'Al-Mulk', arabicName: 'الملك', ayahs: 30 },
  { number: 68, name: 'Al-Qalam', arabicName: 'القلم', ayahs: 52 },
  { number: 69, name: 'Al-Haqqah', arabicName: 'الحاقة', ayahs: 52 },
  { number: 70, name: 'Al-Ma\'arij', arabicName: 'المعارج', ayahs: 44 },
  { number: 71, name: 'Nuh', arabicName: 'نوح', ayahs: 28 },
  { number: 72, name: 'Al-Jinn', arabicName: 'الجن', ayahs: 28 },
  { number: 73, name: 'Al-Muzzammil', arabicName: 'المزمل', ayahs: 20 },
  { number: 74, name: 'Al-Muddathir', arabicName: 'المدثر', ayahs: 56 },
  { number: 75, name: 'Al-Qiyamah', arabicName: 'القيامة', ayahs: 40 },
  { number: 76, name: 'Al-Insan', arabicName: 'الإنسان', ayahs: 31 },
  { number: 77, name: 'Al-Mursalat', arabicName: 'المرسلات', ayahs: 50 },
  { number: 78, name: 'An-Naba', arabicName: 'النبإ', ayahs: 40 },
  { number: 79, name: 'An-Nazi\'at', arabicName: 'النازعات', ayahs: 46 },
  { number: 80, name: 'Abasa', arabicName: 'عبس', ayahs: 42 },
  { number: 81, name: 'At-Takwir', arabicName: 'التكوير', ayahs: 29 },
  { number: 82, name: 'Al-Infitar', arabicName: 'الانفطار', ayahs: 19 },
  { number: 83, name: 'Al-Mutaffifin', arabicName: 'المطففين', ayahs: 36 },
  { number: 84, name: 'Al-Inshiqaq', arabicName: 'الانشقاق', ayahs: 25 },
  { number: 85, name: 'Al-Buruj', arabicName: 'البروج', ayahs: 22 },
  { number: 86, name: 'At-Tariq', arabicName: 'الطارق', ayahs: 17 },
  { number: 87, name: 'Al-A\'la', arabicName: 'الأعلى', ayahs: 19 },
  { number: 88, name: 'Al-Ghashiyah', arabicName: 'الغاشية', ayahs: 26 },
  { number: 89, name: 'Al-Fajr', arabicName: 'الفجر', ayahs: 30 },
  { number: 90, name: 'Al-Balad', arabicName: 'البلد', ayahs: 20 },
  { number: 91, name: 'Ash-Shams', arabicName: 'الشمس', ayahs: 15 },
  { number: 92, name: 'Al-Layl', arabicName: 'الليل', ayahs: 21 },
  { number: 93, name: 'Ad-Duha', arabicName: 'الضحى', ayahs: 11 },
  { number: 94, name: 'Ash-Sharh', arabicName: 'الشرح', ayahs: 8 },
  { number: 95, name: 'At-Tin', arabicName: 'التين', ayahs: 8 },
  { number: 96, name: 'Al-Alaq', arabicName: 'العلق', ayahs: 19 },
  { number: 97, name: 'Al-Qadr', arabicName: 'القدر', ayahs: 5 },
  { number: 98, name: 'Al-Bayyinah', arabicName: 'البينة', ayahs: 8 },
  { number: 99, name: 'Az-Zalzalah', arabicName: 'الزلزلة', ayahs: 8 },
  { number: 100, name: 'Al-Adiyat', arabicName: 'العاديات', ayahs: 11 },
  { number: 101, name: 'Al-Qari\'ah', arabicName: 'القارعة', ayahs: 11 },
  { number: 102, name: 'At-Takathur', arabicName: 'التكاثر', ayahs: 8 },
  { number: 103, name: 'Al-Asr', arabicName: 'العصر', ayahs: 3 },
  { number: 104, name: 'Al-Humazah', arabicName: 'الهمزة', ayahs: 9 },
  { number: 105, name: 'Al-Fil', arabicName: 'الفيل', ayahs: 5 },
  { number: 106, name: 'Quraish', arabicName: 'قريش', ayahs: 4 },
  { number: 107, name: 'Al-Ma\'un', arabicName: 'الماعون', ayahs: 7 },
  { number: 108, name: 'Al-Kawthar', arabicName: 'الكوثر', ayahs: 3 },
  { number: 109, name: 'Al-Kafirun', arabicName: 'الكافرون', ayahs: 6 },
  { number: 110, name: 'An-Nasr', arabicName: 'النصر', ayahs: 3 },
  { number: 111, name: 'Al-Masad', arabicName: 'المسد', ayahs: 5 },
  { number: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص', ayahs: 4 },
  { number: 113, name: 'Al-Falaq', arabicName: 'الفلق', ayahs: 5 },
  { number: 114, name: 'An-Nas', arabicName: 'الناس', ayahs: 6 }
];

export default function GuidedPrayerScreen({ route, navigation }) {
  // ALL HOOKS MUST BE DECLARED HERE, AT THE TOP LEVEL
  const { prayer } = route.params;
  // Language support
  const { currentLanguage } = useLanguage();
  
  // Debug: Log the current language and test translation
  useEffect(() => {
    console.log('🔍 GuidedPrayerScreen: Current language:', currentLanguage);
    console.log('🔍 GuidedPrayerScreen: Test translation:', t('reciteFatiha', currentLanguage));
    console.log('🔍 GuidedPrayerScreen: Iqama text:', t('iqamaText', currentLanguage));
    console.log('🔍 GuidedPrayerScreen: Takbir text:', t('takbirText', currentLanguage));
    console.log('🔍 GuidedPrayerScreen: Fatiha text:', t('fatihaText', currentLanguage));
    console.log('🔍 GuidedPrayerScreen: SubhanAllah text:', t('subhanAllahText', currentLanguage));
    console.log('🔍 GuidedPrayerScreen: Tashahhud text:', t('tashahhudText', currentLanguage));
    console.log('🔍 GuidedPrayerScreen: Available languages:', Object.keys(translations));
  }, [currentLanguage]);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentRakah, setCurrentRakah] = useState(1);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(true);
  const [selectedReciter, setSelectedReciter] = useState({ id: '5', name: 'Mishary Rashed Alafasy' });
  const [audio, setAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [randomSurah, setRandomSurah] = useState(null);
  const [useRandomSurah, setUseRandomSurah] = useState(false);
  const [randomAyahsSets, setRandomAyahsSets] = useState([[], []]);
  const [loadingRandomAyahs, setLoadingRandomAyahs] = useState(false);
  const [reciters, setReciters] = useState([]);
  const [showReciterDropdown, setShowReciterDropdown] = useState(false);
  const [quranRecitationMode, setQuranRecitationMode] = useState('fixed');
  const [selectedQuranOptions, setSelectedQuranOptions] = useState({
    rakah1: { type: 'surah', value: '112' },
    rakah2: { type: 'surah', value: '112' }
  });
  const [showQuranOptionsModal, setShowQuranOptionsModal] = useState(false);
  const [currentRakahForSelection, setCurrentRakahForSelection] = useState(1);
  const [pickerModal, setPickerModal] = useState(null);
  const [showCustomSelectionUI, setShowCustomSelectionUI] = useState(false);
  const [fetchedCustomAyahs, setFetchedCustomAyahs] = useState({});
  const [showStartModal, setShowStartModal] = useState(true);
  const [selectedRandomScope, setSelectedRandomScope] = useState('wholequran');
  const isMounted = useRef(true);
  const autoPlayTimer = useRef(null);
  const [prayerSteps, setPrayerSteps] = useState([]);
  const [isDhikrRepeating, setIsDhikrRepeating] = useState(false);

  // Prayer configuration for current prayer
  const currentConfig = prayerConfigs[prayer.name.toLowerCase()] || prayerConfigs.fajr;

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // Helper function to add timeout to fetch requests
  const fetchWithTimeout = async (url, timeout = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      console.log('🌐 Fetching URL:', url);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('✅ Fetch successful for:', url);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Fetch failed for:', url, error.message);
      throw error;
    }
  };

  // Helper function to retry failed requests
  const fetchWithRetry = async (url, maxRetries = 3, timeout = 10000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} for:`, url);
        return await fetchWithTimeout(url, timeout);
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  };

  // 1. Update fetchOneRandomAyahSet to accept a scope
  const fetchOneRandomAyahSet = async (scope = 'wholequran') => {
    let surahMin = 2, surahMax = 113;
    if (scope === 'last3juz' || scope === 'lastjuz') {
      surahMin = 78; // Juz 30 starts at surah 78
      surahMax = 114;
    }
    // Pick a random surah in the range
    const surahNumber = Math.floor(Math.random() * (surahMax - surahMin + 1)) + surahMin;
    
    try {
      console.log(`🔄 Fetching surah ${surahNumber} for random ayah set`);
      
      const translationEdition = getTranslationEdition(currentLanguage);
      const [surahResp, transResp, translitResp] = await Promise.all([
        fetchWithRetry(`https://api.alquran.cloud/v1/surah/${surahNumber}`),
        fetchWithRetry(`https://api.alquran.cloud/v1/surah/${surahNumber}/${translationEdition}`),
        fetchWithRetry(`https://api.alquran.cloud/v1/surah/${surahNumber}/en.transliteration`)
      ]);
      
      // Check if responses are ok
      if (!surahResp.ok || !transResp.ok || !translitResp.ok) {
        throw new Error(`API response not ok: surah=${surahResp.status}, trans=${transResp.status}, translit=${translitResp.status}`);
      }
      
      const surahData = await surahResp.json();
      const transData = await transResp.json();
      const translitData = await translitResp.json();
      
      // Validate data
      if (!surahData.data || !transData.data || !translitData.data) {
        throw new Error('Invalid API response data');
      }
      
      const totalAyahs = surahData.data.numberOfAyahs;
      // Only use ayahs from Juz 30 for lastjuz (surahs 78-114 are all in Juz 30)
      let maxAyahs = Math.min(10, totalAyahs);
      const maxStart = Math.max(1, totalAyahs - maxAyahs + 1);
      const startAyah = Math.floor(Math.random() * maxStart) + 1;
      const endAyah = Math.min(startAyah + maxAyahs - 1, totalAyahs);
      
      const ayahs = surahData.data.ayahs.slice(startAyah - 1, endAyah);
      const transAyahs = transData.data.ayahs.slice(startAyah - 1, endAyah);
      const translitAyahs = translitData.data.ayahs.slice(startAyah - 1, endAyah);
      
      const result = ayahs.map((a, i) => ({
        surah: surahNumber,
        surahName: surahData.data.englishName,
        numberInSurah: a.numberInSurah,
        number: a.number, // Global ayah number for audio playback
        arabic: a.text,
        translation: transAyahs[i]?.text || '',
        transliteration: translitAyahs[i]?.text || '',
      }));
      
      console.log(`✅ Successfully fetched ${result.length} ayahs from surah ${surahNumber}`);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching surah ${surahNumber}:`, error);
      throw error;
    }
  };

  // 2. Update fetchRandomAyahsSets to accept a scope
  const fetchRandomAyahsSets = async (scope = 'wholequran') => {
    console.log('🎯 fetchRandomAyahsSets called with scope:', scope);
    setLoadingRandomAyahs(true);
    
    try {
      console.log('🔄 Fetching random ayah sets for scope:', scope);
      
      let set1 = await fetchOneRandomAyahSet(scope);
      console.log('✅ Set 1 fetched:', set1.length, 'ayahs');
      
      let set2 = await fetchOneRandomAyahSet(scope);
      console.log('✅ Set 2 fetched:', set2.length, 'ayahs');
      
      // Ensure different surah or ayah range
      let tries = 0;
      while (set2[0].surah === set1[0].surah && set2[0].numberInSurah === set1[0].numberInSurah && tries < 5) {
        console.log('🔄 Duplicate detected, fetching new set 2...');
        set2 = await fetchOneRandomAyahSet(scope);
        tries++;
      }
      
      console.log('✅ Random ayah sets fetched successfully:', {
        set1: set1.length,
        set2: set2.length,
        set1Surah: set1[0]?.surahName,
        set2Surah: set2[0]?.surahName,
        scope: scope
      });
      
      setRandomAyahsSets([set1, set2]);
      console.log('✅ randomAyahsSets state updated');
    } catch (e) {
      console.error('❌ Error fetching random ayah sets:', e);
      console.error('❌ Error details:', e.message, e.stack);
      
      // Fallback to default surahs if API fails
      const fallbackSet1 = [{
        surah: 112,
        surahName: 'Al-Ikhlas',
        numberInSurah: 1,
        number: 6226,
        arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
        translation: 'Say: He is Allah, the One!',
        transliteration: 'Qul huwa Allahu ahad.',
      }];
      const fallbackSet2 = [{
        surah: 113,
        surahName: 'Al-Falaq',
        numberInSurah: 1,
        number: 6231,
        arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ',
        translation: 'Say: I seek refuge with the Lord of the Dawn',
        transliteration: 'Qul a\'udhu bi rabbi al-falaq.',
      }];
      
      console.log('🔄 Using fallback sets due to error');
      setRandomAyahsSets([fallbackSet1, fallbackSet2]);
    }
    
    setLoadingRandomAyahs(false);
    console.log('✅ fetchRandomAyahsSets completed');
  };

  // Modal for wudu and toggle
  const renderStartModal = () => (
    <Modal visible={showStartModal} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#1E1E1E', borderRadius: 24, padding: 28, width: '90%', maxWidth: 420, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, elevation: 8, borderWidth: 1, borderColor: '#333', position: 'relative' }}>
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#2C2C2C',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1
            }}
            onPress={async () => {
              await cleanupAudio();
              navigation.goBack();
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
                  <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#FFFFFF', letterSpacing: 0.2, marginTop: 20 }}>{t('beforeYouBegin', currentLanguage)}</Text>
        <Text style={{ fontSize: 15, color: '#CCCCCC', marginBottom: 18, textAlign: 'center', lineHeight: 22 }}>
          {t('wuduReminder', currentLanguage)}
          </Text>
          <View style={{ width: '100%', backgroundColor: '#2C2C2C', borderRadius: 12, padding: 16, marginBottom: 18 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 10 }}>Quran Recitation for Each Rakah</Text>
            
            {/* Recitation Mode Selection */}
            <View style={{ marginBottom: 15 }}>
              {quranRecitationOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: quranRecitationMode === option.id ? '#667eea' : '#404040',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8
                  }}
                  onPress={() => {
                    setQuranRecitationMode(option.id);
                    if (option.id === 'random') {
                      fetchRandomAyahsSets();
                    }
                    if (option.id === 'custom') {
                      setShowCustomSelectionUI(true);
                    }
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 15,
                      color: quranRecitationMode === option.id ? '#fff' : '#CCCCCC',
                      fontWeight: '600'
                    }}>
                      {option.name}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: quranRecitationMode === option.id ? '#e0e0e0' : '#999999',
                      marginTop: 2
                    }}>
                      {option.description}
                    </Text>
                  </View>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: quranRecitationMode === option.id ? '#fff' : '#666',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {quranRecitationMode === option.id && (
                      <Ionicons name="checkmark" size={12} color="#667eea" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Random Verse Options */}
            {quranRecitationMode === 'random' && (
                              <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 14, color: '#CCCCCC', marginBottom: 8 }}>{t('chooseRandomVersesFrom', currentLanguage)}</Text>
                {getRandomVerseOptions(currentLanguage).map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: selectedRandomScope === option.id ? '#667eea' : '#404040',
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 6,
                      borderWidth: selectedRandomScope === option.id ? 1 : 0,
                      borderColor: selectedRandomScope === option.id ? '#8B9DC3' : 'transparent'
                    }}
                    onPress={() => {
                      console.log('🎯 Selected random scope:', option.id);
                      setSelectedRandomScope(option.id);
                      fetchRandomAyahsSets(option.id);
                    }}
                  >
                    <Ionicons 
                      name={selectedRandomScope === option.id ? "checkmark-circle" : "shuffle"} 
                      size={16} 
                      color={selectedRandomScope === option.id ? "#FFFFFF" : "#67C3F3"} 
                      style={{ marginRight: 8 }} 
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontSize: 14, 
                        color: selectedRandomScope === option.id ? '#FFFFFF' : '#FFFFFF', 
                        fontWeight: selectedRandomScope === option.id ? 'bold' : '500' 
                      }}>
                        {option.name}
                      </Text>
                      <Text style={{ 
                        fontSize: 12, 
                        color: selectedRandomScope === option.id ? '#E0E0E0' : '#BBBBBB' 
                      }}>
                        {option.description}
                      </Text>
                    </View>
                    {selectedRandomScope === option.id && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Custom Selection */}
            {quranRecitationMode === 'custom' && (
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 14, color: '#CCCCCC', marginBottom: 8 }}>{t('chooseSpecificSurahsAyahs', currentLanguage)}</Text>
                {[1, 2].map((rakahNum) => {
                  const sel = selectedQuranOptions[`rakah${rakahNum}`] || { type: 'surah', value: '112', start: 1, end: 4 };
                  const surah = surahList.find(s => s.number.toString() === sel.value) || surahList[111];
                  const ayahCount = surah ? (surah.ayahs || 4) : 4;
                  return (
                    <View key={rakahNum} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#404040', borderRadius: 8, padding: 12 }}>
                      <Text style={{ color: '#BBBBBB', fontWeight: '600', marginRight: 6 }}>{t('rakah', currentLanguage)} {rakahNum}:</Text>
                      {/* Surah Name Dropdown */}
                      <TouchableOpacity onPress={() => setPickerModal({ type: 'surah', rakah: rakahNum })}>
                        <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 15 }}>{surah.name}</Text>
                      </TouchableOpacity>
                      <Text style={{ color: '#BBBBBB', marginHorizontal: 4 }}>,</Text>
                      {/* Start Ayah Picker */}
                      <TouchableOpacity onPress={() => setPickerModal({ type: 'start', rakah: rakahNum })}>
                        <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 15 }}>{sel.start || 1}</Text>
                      </TouchableOpacity>
                      <Text style={{ color: '#BBBBBB', marginHorizontal: 2 }}>-</Text>
                      {/* End Ayah Picker */}
                      <TouchableOpacity onPress={() => setPickerModal({ type: 'end', rakah: rakahNum })}>
                        <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 15 }}>{sel.end || ayahCount}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Display current selection */}
            {quranRecitationMode === 'fixed' && (
              <Text style={{ fontSize: 15, color: '#67C3F3', marginBottom: 2, textAlign: 'center' }}>
                <Text style={{ fontWeight: 'bold' }}>{t('secondRakatOnly', currentLanguage)}</Text> {t('surah', currentLanguage)} {t('alIkhlas', currentLanguage)}
              </Text>
            )}
            {quranRecitationMode === 'random' && loadingRandomAyahs && (
              <ActivityIndicator size="small" color="#67C3F3" style={{ marginBottom: 10 }} />
            )}
            {quranRecitationMode === 'random' && !loadingRandomAyahs && (
              <View style={{ marginBottom: 2 }}>
                <Text style={{ fontSize: 14, color: '#67C3F3', textAlign: 'center', marginBottom: 8 }}>
                                      Selected: {getRandomVerseOptions(currentLanguage).find(opt => opt.id === selectedRandomScope)?.name || t('wholeQuran', currentLanguage)}
                </Text>
                {randomAyahsSets[0].length > 0 && randomAyahsSets[1].length > 0 ? (
                  [0, 1].map((idx) => (
                    <View key={idx} style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 15, color: '#67C3F3', textAlign: 'center', fontWeight: 'bold' }}>
                        {t('rakah', currentLanguage)} {idx + 1}:
                      </Text>
                      {randomAyahsSets[idx].map((ayah, i) => (
                        <Text key={i} style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>
                          {ayah.surahName} {ayah.numberInSurah}: {ayah.arabic}
                        </Text>
                      ))}
                    </View>
                  ))
                ) : (
                  <Text style={{ color: '#FF6B6B', fontSize: 12, textAlign: 'center' }}>
                    {t('noVersesLoadedYet', currentLanguage)}
                  </Text>
                )}
              </View>
            )}
          </View>
          <View style={{ width: '100%', marginBottom: 18 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 }}>{t('chooseReciter', currentLanguage)}</Text>
            <Text style={{ fontSize: 13, color: '#CCCCCC', marginBottom: 8 }}>
              {t('selectReciterDescription', currentLanguage)}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#404040',
                borderRadius: 10,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: '#555'
              }}
              onPress={() => setShowReciterDropdown(!showReciterDropdown)}
            >
              <Text style={{ fontSize: 15, color: '#FFFFFF', fontWeight: '600', flex: 1 }}>
                {selectedReciter.name}
              </Text>
              <Ionicons 
                name={showReciterDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#CCCCCC" 
              />
            </TouchableOpacity>
            
            {showReciterDropdown && (
              <View style={{ 
                backgroundColor: '#2C2C2C', 
                borderRadius: 10, 
                marginTop: 5,
                maxHeight: 200,
                borderWidth: 1,
                borderColor: '#555',
                shadowColor: '#000',
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4
              }}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {reciters.map((reciter) => (
                    <TouchableOpacity
                      key={reciter.id}
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        padding: 12, 
                        borderBottomWidth: reciters.indexOf(reciter) === reciters.length - 1 ? 0 : 1,
                        borderBottomColor: '#444'
                      }}
                      onPress={() => {
                        setSelectedReciter(reciter);
                        setShowReciterDropdown(false);
                      }}
                    >
                      <Text style={{ 
                        color: selectedReciter.id === reciter.id ? '#67C3F3' : '#FFFFFF', 
                        fontWeight: selectedReciter.id === reciter.id ? 'bold' : '500', 
                        fontSize: 15, 
                        flex: 1 
                      }}>
                        {reciter.name}
                      </Text>
                      {selectedReciter.id === reciter.id && (
                        <Ionicons name="checkmark-circle" size={18} color="#67C3F3" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={{ backgroundColor: '#667eea', borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14, marginTop: 6, width: '100%', shadowColor: '#667eea', shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 }}
            onPress={() => setShowStartModal(false)}
            disabled={quranRecitationMode === 'random' && loadingRandomAyahs}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, textAlign: 'center', letterSpacing: 0.2 }}>{t('continue', currentLanguage)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Quran options modal for custom selection
  const renderQuranOptionsModal = () => (
    <Modal visible={showQuranOptionsModal} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#1E1E1E', borderRadius: 24, padding: 28, width: '90%', maxWidth: 420, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, elevation: 8, borderWidth: 1, borderColor: '#333' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#FFFFFF', textAlign: 'center' }}>
                            {t('chooseQuranRecitationForRakah', currentLanguage)} {currentRakahForSelection}
          </Text>
          
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 10 }}>
              Select Type:
            </Text>
            
            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: (selectedQuranOptions[`rakah${currentRakahForSelection || 1}`]?.type === 'surah') ? '#667eea' : '#404040',
                  borderRadius: 12,
                  padding: 12,
                  marginRight: 8
                }}
                onPress={() => {
                  setSelectedQuranOptions(prev => ({
                    ...prev,
                    [`rakah${currentRakahForSelection || 1}`]: { type: 'surah', value: '112' }
                  }));
                }}
              >
                <Text style={{ fontSize: 15, color: '#FFFFFF', fontWeight: '600', textAlign: 'center' }}>{t('surah', currentLanguage)}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: (selectedQuranOptions[`rakah${currentRakahForSelection || 1}`]?.type === 'ayah') ? '#667eea' : '#404040',
                  borderRadius: 12,
                  padding: 12,
                  marginLeft: 8
                }}
                onPress={() => {
                  setSelectedQuranOptions(prev => ({
                    ...prev,
                    [`rakah${currentRakahForSelection || 1}`]: { type: 'ayah', value: '1:1' }
                  }));
                }}
              >
                <Text style={{ fontSize: 15, color: '#FFFFFF', fontWeight: '600', textAlign: 'center' }}>{t('ayah', currentLanguage)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Surah Selection */}
          {selectedQuranOptions[`rakah${currentRakahForSelection || 1}`]?.type === 'surah' && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 10 }}>
                {t('surah', currentLanguage)}:
              </Text>
              <ScrollView style={{ maxHeight: 200, backgroundColor: '#2C2C2C', borderRadius: 12 }}>
                {surahList.map((surah) => (
                  <TouchableOpacity
                    key={surah.number}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#444',
                      backgroundColor: selectedQuranOptions[`rakah${currentRakahForSelection || 1}`]?.value === surah.number.toString() ? '#667eea' : 'transparent'
                    }}
                    onPress={() => {
                      setSelectedQuranOptions(prev => ({
                        ...prev,
                        [`rakah${currentRakahForSelection || 1}`]: { type: 'surah', value: surah.number.toString() }
                      }));
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontSize: 15, 
                        color: selectedQuranOptions[`rakah${currentRakahForSelection || 1}`]?.value === surah.number.toString() ? '#FFFFFF' : '#CCCCCC',
                        fontWeight: selectedQuranOptions[`rakah${currentRakahForSelection || 1}`]?.value === surah.number.toString() ? 'bold' : '500'
                      }}>
                        {surah.number}. {surah.name}
                      </Text>
                      <Text style={{ 
                        fontSize: 12, 
                        color: selectedQuranOptions[`rakah${currentRakahForSelection || 1}`]?.value === surah.number.toString() ? '#e0e0e0' : '#999999'
                      }}>
                        {surah.arabicName}
                      </Text>
                    </View>
                    {selectedQuranOptions[`rakah${currentRakahForSelection || 1}`]?.value === surah.number.toString() && (
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Ayah Selection */}
          {selectedQuranOptions[`rakah${currentRakahForSelection || 1}`]?.type === 'ayah' && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 10 }}>
                {t('ayah', currentLanguage)}:
              </Text>
              <Text style={{ fontSize: 14, color: '#CCCCCC', marginBottom: 15, textAlign: 'center' }}>
                Format: Surah:Ayah (e.g., 1:1, 2:255, 36:1)
              </Text>
              <View style={{ backgroundColor: '#2C2C2C', borderRadius: 12, padding: 15 }}>
                <Text style={{ fontSize: 15, color: '#FFFFFF', fontWeight: '600', textAlign: 'center' }}>
                  {selectedQuranOptions[`rakah${currentRakahForSelection || 1}`]?.value}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#999999', marginTop: 8, textAlign: 'center' }}>
                You can manually enter the ayah reference in the format above
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              style={{ backgroundColor: '#404040', borderRadius: 12, padding: 12, flex: 1, marginRight: 8 }}
              onPress={() => {
                setShowQuranOptionsModal(false);
                setCurrentRakahForSelection(1);
              }}
            >
              <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#667eea', borderRadius: 12, padding: 12, flex: 1, marginLeft: 8 }}
              onPress={() => {
                if (currentRakahForSelection < 2) {
                  setCurrentRakahForSelection(currentRakahForSelection + 1);
                } else {
                  setShowQuranOptionsModal(false);
                  setCurrentRakahForSelection(1);
                }
              }}
            >
              <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>
                {currentRakahForSelection < 2 ? t('nextRakah', currentLanguage) : t('done', currentLanguage)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Step generation logic
  const generatePrayerSteps = () => {
    const steps = [];
    
    // 0. Prayer Setup Step (previously the modal)
    steps.push({
      id: 'prayer_setup',
      title: t('beforeYouBegin', currentLanguage),
      posture: 'setup',
      rakah: 0,
      arabic: '',
      transliteration: '',
      translation: '',
      instruction: t('wuduReminder', currentLanguage),
      isSetupStep: true
    });
    
    // 1. Iqama (Call to start prayer)
    steps.push({
      id: 'iqama',
      title: t('iqama', currentLanguage),
      posture: 'standing',
      rakah: 0,
      arabic: 'ٱللَّهُ أَكْبَرُ ٱللَّهُ أَكْبَرُ ۝ أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ ۝ أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ ۝ حَيَّ عَلَى ٱلصَّلَاةِ ۝ حَيَّ عَلَى ٱلْفَلَاحِ ۝ قَدْ قَامَتِ ٱلصَّلَاةُ قَدْ قَامَتِ ٱلصَّلَاةُ ۝ ٱللَّهُ أَكْبَرُ ٱللَّهُ أَكْبَرُ ۝ لَا إِلَٰهَ إِلَّا ٱللَّهُ',
      transliteration: 'Allahu akbar, Allahu akbar. Ash-hadu an la ilaha illa Allah. Ash-hadu anna Muhammadan rasul Allah. Hayya \'ala as-salah. Hayya \'ala al-falah. Qad qamati as-salah, qad qamati as-salah. Allahu akbar, Allahu akbar. La ilaha illa Allah.',
              translation: t('iqamaText', currentLanguage),
      instruction: t('iqamaInstruction', currentLanguage)
    });
    // 2. Opening Takbir
    steps.push({
      id: 'opening_takbir',
      title: t('takbirAlIhram', currentLanguage),
      posture: 'standing',
      rakah: 0,
      arabic: 'ٱللَّهُ أَكْبَرُ',
      transliteration: 'Allahu Akbar',
      translation: t('takbirText', currentLanguage),
      instruction: t('openingTakbirInstruction', currentLanguage)
    });

    // For each rakah
    for (let rakah = 1; rakah <= currentConfig.rakahs; rakah++) {
      // Fatiha always
      steps.push({
        id: `fatiha_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - Al-Fatiha`,
        posture: 'standing',
        rakah,
        arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ۝ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ ۝ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ۝ مَٰلِكِ يَوْمِ ٱلدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمِ ۝ صِرَٰطَ ٱلَّذِىنَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
        transliteration: 'Bismillahi ar-rahmani ar-raheem. Al-hamdu lillahi rabbi al-alameen. Ar-rahmani ar-raheem. Maliki yawmi ad-deen. Iyyaka na\'budu wa iyyaka nasta\'een. Ihdina as-sirata al-mustaqeem. Sirata alladheena an\'amta alayhim ghayri al-maghdubi alayhim wa la ad-dalleen.',
                    translation: t('fatihaText', currentLanguage),
        instruction: t('reciteFatiha', currentLanguage)
      });
      // For first two rakats: add surah after Fatiha
      if (rakah <= 2) {
        if (quranRecitationMode === 'random' && randomAyahsSets[rakah-1].length > 0) {
          const ayahSet = randomAyahsSets[rakah-1];
          steps.push({
            id: `random_surah_${rakah}`,
            title: `${t('rakah', currentLanguage)} ${rakah} - ${t('surah', currentLanguage)} ${ayahSet[0].surahName}, ${t('ayah', currentLanguage)}s ${ayahSet[0].numberInSurah}–${ayahSet[ayahSet.length-1].numberInSurah}`,
            posture: 'standing',
            rakah,
            arabic: ayahSet.map(a => a.arabic).join(' ۝ '),
            transliteration: ayahSet.map(a => a.transliteration).join(' ۝ '),
            translation: ayahSet.map(a => a.translation).join(' '),
            instruction: t('reciteAyahsAfterFatiha', currentLanguage)
          });
        } else if (quranRecitationMode === 'custom' && selectedQuranOptions[`rakah${rakah}`]) {
          const option = selectedQuranOptions[`rakah${rakah}`];
          const surahNumber = parseInt(option.value);
          const startAyah = option.start || 1;
          const endAyah = option.end || 4;
          const surah = surahList.find(s => s.number === surahNumber);
          
          if (surah) {
            // Fetch the selected ayahs from the API
            const fetchCustomAyahs = async () => {
              try {
                const translationEdition = getTranslationEdition(currentLanguage);
                const [surahResp, transResp, translitResp] = await Promise.all([
                  fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`),
                  fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${translationEdition}`),
                  fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/en.transliteration`)
                ]);
                
                const surahData = await surahResp.json();
                const transData = await transResp.json();
                const translitData = await translitResp.json();
                
                const ayahs = surahData.data.ayahs.slice(startAyah - 1, endAyah);
                const transAyahs = transData.data.ayahs.slice(startAyah - 1, endAyah);
                const translitAyahs = translitData.data.ayahs.slice(startAyah - 1, endAyah);
                
                const customAyahs = ayahs.map((a, i) => ({
                  surah: surahNumber,
                  surahName: surah.name,
                  numberInSurah: a.numberInSurah,
                  number: a.number, // Global ayah number for audio playback
                  arabic: a.text,
                  translation: transAyahs[i]?.text || '',
                  transliteration: translitAyahs[i]?.text || '',
                }));
                
                return customAyahs;
              } catch (error) {
                console.error('Error fetching custom ayahs:', error);
                return [];
              }
            };
            
            // For now, we'll use a placeholder that will be updated when the step is actually used
            const stepKey = `custom_surah_${rakah}`;
            const existingAyahs = fetchedCustomAyahs[stepKey];
            
            if (existingAyahs) {
              // Use already fetched ayahs
              steps.push({
                id: stepKey,
                title: `${t('rakah', currentLanguage)} ${rakah} - ${t('surah', currentLanguage)} ${surah.name}, ${t('ayah', currentLanguage)}s ${startAyah}-${endAyah}`,
                posture: 'standing',
                rakah,
                arabic: existingAyahs.map(a => a.arabic).join(' ۝ '),
                transliteration: existingAyahs.map(a => a.transliteration).join(' ۝ '),
                translation: existingAyahs.map(a => a.translation).join(' '),
                instruction: `Recite Surah ${surah.name}, Ayahs ${startAyah}-${endAyah} after Al-Fatiha`,
                customAyahs: { surahNumber, startAyah, endAyah, surahName: surah.name },
                isCustomSelection: true
              });
            } else {
              // Use placeholder that will be updated when step is played
              steps.push({
                id: stepKey,
                title: `${t('rakah', currentLanguage)} ${rakah} - ${t('surah', currentLanguage)} ${surah.name}, ${t('ayah', currentLanguage)}s ${startAyah}-${endAyah}`,
                posture: 'standing',
                rakah,
                arabic: `Custom selection: ${surah.name} ${startAyah}-${endAyah}`, // Will be replaced with actual text
                transliteration: `Custom transliteration for ${surah.name} ${startAyah}-${endAyah}`,
                translation: `Custom translation for ${surah.name} ${startAyah}-${endAyah}`,
                instruction: t('reciteSurahAfterFatiha', currentLanguage).replace('{surah}', surah.name).replace('{start}', startAyah).replace('{end}', endAyah),
                customAyahs: { surahNumber, startAyah, endAyah, surahName: surah.name },
                isCustomSelection: true
              });
            }
          }
        } else {
          // Default: Ikhlas (fixed mode)
          steps.push({
            id: `ikhlas_${rakah}`,
            title: `${t('rakah', currentLanguage)} ${rakah} - ${t('surah', currentLanguage)} ${t('alIkhlas', currentLanguage)}`,
            posture: 'standing',
            rakah,
            arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ ۝ ٱللَّهُ ٱلصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
            transliteration: 'Qul huwa Allahu ahad. Allahu as-samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
            translation: 'Say: He is Allah, the One! Allah, the Eternal, Absolute; He begets not, nor is He begotten; And there is none like unto Him.',
            instruction: t('reciteIkhlasAfterFatiha', currentLanguage)
          });
        }
      }
      // Add ruku, sujud, etc. for each rakah (simplified)
      steps.push({
        id: `takbir_ruku_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - ${t('takbirForRuku', currentLanguage)}`,
        posture: 'standing',
        rakah,
        arabic: 'ٱللَّهُ أَكْبَرُ',
        transliteration: 'Allahu Akbar',
        translation: t('takbirText', currentLanguage),
        instruction: t('takbirTransitionInstruction', currentLanguage)
      });
      steps.push({
        id: `ruku_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - ${t('rukuBowing', currentLanguage)}`,
        posture: 'bowing',
        rakah,
        arabic: 'سُبْحَانَ رَبِّيَ ٱلْعَظِيمِ',
        transliteration: 'Subhana rabbiya al-adheem',
        translation: t('subhanAllahAdheemText', currentLanguage),
        instruction: t('bowDownInstruction', currentLanguage)
      });
      steps.push({
        id: `rise_ruku_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - ${t('risingFromRuku', currentLanguage)}`,
        posture: 'standing',
        rakah,
        arabic: 'سَمِعَ ٱللَّهُ لِمَنْ حَمِدَهُ',
        transliteration: 'Sami\'a Allahu liman hamidah',
        translation: t('samiAllahuText', currentLanguage),
        instruction: t('standUprightInstruction', currentLanguage)
      });
      steps.push({
        id: `standing_after_ruku_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - ${t('standingAfterRuku', currentLanguage)}`,
        posture: 'standing',
        rakah,
        arabic: 'رَبَّنَا وَلَكَ ٱلْحَمْدُ',
        transliteration: 'Rabbana wa lakal hamd',
        translation: t('rabbanaLakalHamdText', currentLanguage),
        instruction: t('standUprightInstruction', currentLanguage)
      });
      steps.push({
        id: `takbir_sujud1_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - ${t('takbirForSujud', currentLanguage)}`,
        posture: 'standing',
        rakah,
        arabic: 'ٱللَّهُ أَكْبَرُ',
        transliteration: 'Allahu Akbar',
        translation: t('takbirText', currentLanguage),
        instruction: t('takbirProstrationInstruction', currentLanguage)
      });
      steps.push({
        id: `sujud1_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - ${t('firstSujud', currentLanguage)}`,
        posture: 'prostrating',
        rakah,
        arabic: 'سُبْحَانَ رَبِّيَ ٱلْأَعْلَىٰ',
        transliteration: 'Subhana rabbiya al-a\'la',
        translation: t('subhanAllahText', currentLanguage),
        instruction: t('prostrateInstruction', currentLanguage)
      });
      steps.push({
        id: `takbir_between_sujud_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - ${t('takbirRisingFromSujud', currentLanguage)}`,
        posture: 'prostrating',
        rakah,
        arabic: 'ٱللَّهُ أَكْبَرُ',
        transliteration: 'Allahu Akbar',
        translation: t('takbirText', currentLanguage),
        instruction: t('takbirRisingInstruction', currentLanguage)
      });
      steps.push({
        id: `sitting_between_sujud_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - ${t('sittingBetweenSujud', currentLanguage)}`,
        posture: 'sitting',
        rakah,
        arabic: 'رَبِّ ٱغْفِرْ لِي، رَبِّ ٱغْفِرْ لِي',
        transliteration: 'Rabbi ghfir li, rabbi ghfir li',
        translation: t('forgivenessDhikrText', currentLanguage),
                  instruction: t('sitBetweenProstrationsInstruction', currentLanguage)
      });
      steps.push({
        id: `takbir_sujud2_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - ${t('takbirForSecondSujud', currentLanguage)}`,
        posture: 'sitting',
        rakah,
        arabic: 'ٱللَّهُ أَكْبَرُ',
        transliteration: 'Allahu Akbar',
        translation: t('takbirText', currentLanguage),
        instruction: t('takbirSecondProstrationInstruction', currentLanguage)
      });
      steps.push({
        id: `sujud2_${rakah}`,
        title: `${t('rakah', currentLanguage)} ${rakah} - ${t('secondSujud', currentLanguage)}`,
        posture: 'prostrating',
        rakah,
        arabic: 'سُبْحَانَ رَبِّيَ ٱلْأَعْلَىٰ',
        transliteration: 'Subhana rabbiya al-a\'la',
        translation: t('subhanAllahText', currentLanguage),
        instruction: t('prostrateAgainInstruction', currentLanguage)
      });
      // Add sitting after sujud except last rakah
      if (rakah !== currentConfig.rakahs) {
        steps.push({
          id: `sit_between_rakah_${rakah}`,
          title: `${t('rakah', currentLanguage)} ${rakah} - ${t('sitBeforeStandingInstruction', currentLanguage)}`,
          posture: 'sitting',
          rakah,
          arabic: '',
          transliteration: '',
          translation: '',
          instruction: t('sitBeforeStandingInstruction', currentLanguage)
        });
      }
      // Middle Tashahhud after 2nd rakah if prayer has more than 2 rakahs
      if (rakah === 2 && currentConfig.rakahs > 2) {
        steps.push({
          id: 'middle_tashahhud',
          title: t('middleTashahhud', currentLanguage),
          posture: 'sitting',
          rakah,
          arabic: 'التحيات لله والصلوات والطيبات، السلام عليك أيها النبي ورحمة الله وبركاته، السلام علينا وعلى عباد الله الصالحين، أشهد أن لا إله إلا الله وأشهد أن محمداً عبده ورسوله',
          transliteration: 'At-tahiyyatu lillahi was-salawatu wat-tayyibat. As-salamu alayka ayyuhan-nabiyyu wa rahmatullahi wa barakatuh. As-salamu alayna wa ala ibadillahis-saliheen. Ash-hadu an la ilaha illallah wa ash-hadu anna Muhammadan abduhu wa rasuluh',
          translation: t('tashahhudText', currentLanguage),
          instruction: t('reciteTashahhudInstruction', currentLanguage)
        });
      }
    }
    // Final Tashahhud at the end
    steps.push({
      id: 'final_tashahhud',
      title: t('finalTashahhud', currentLanguage),
      posture: 'sitting',
      rakah: currentConfig.rakahs,
      arabic: 'التحيات لله والصلوات والطيبات، السلام عليك أيها النبي ورحمة الله وبركاته، السلام علينا وعلى عباد الله الصالحين، أشهد أن لا إله إلا الله وأشهد أن محمداً عبده ورسوله',
      transliteration: 'At-tahiyyatu lillahi was-salawatu wat-tayyibat. As-salamu alayka ayyuhan-nabiyyu wa rahmatullahi wa barakatuh. As-salamu alayna wa ala ibadillahis-saliheen. Ash-hadu an la ilaha illallah wa ash-hadu anna Muhammadan abduhu wa rasuluh',
      translation: t('tashahhudText', currentLanguage),
      instruction: t('reciteTashahhudInstruction', currentLanguage)
    });
    // Tasleem (ending)
    steps.push({
      id: 'tasleem',
      title: t('tasleemTitle', currentLanguage),
      posture: 'sitting',
      rakah: currentConfig.rakahs,
      arabic: 'السلام عليكم ورحمة الله',
      transliteration: 'As-salamu alaikum wa rahmatullah',
              translation: t('tasleemText', currentLanguage),
      instruction: t('tasleemInstruction', currentLanguage)
    });
    return steps;
  };

  // Regenerate steps when useRandomSurah or randomAyahsSets changes
  useEffect(() => {
    // If using random mode, ensure we have the data before generating steps
    if (quranRecitationMode === 'random' && randomAyahsSets.every(set => set.length === 0)) {
      // Don't generate steps yet, wait for random verses to be fetched
      return;
    }
    const steps = generatePrayerSteps();
    console.log('🔍 Generated prayer steps:', steps.length, 'steps');
    console.log('🔍 Steps:', steps.map(s => ({ id: s.id, title: s.title })));
    setPrayerSteps(steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quranRecitationMode, randomAyahsSets, selectedQuranOptions]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * shortSurahs.length);
    setRandomSurah(shortSurahs[randomIndex]);
  }, []);

  const cleanupAudio = async () => {
    if (audio) {
      try {
        await audio.unloadAsync();
        setAudio(null);
      } catch (error) {
        console.error('Error cleaning up audio:', error);
      }
    }
    // Stop any speech (dhikr, tashahhud, etc.)
    try {
      Speech.stop();
    } catch (e) {
      // Ignore if Speech is not active
    }
    // Clear any autoPlay timers
    if (autoPlayTimer.current) {
      clearTimeout(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
    setIsPlaying(false);
  };

  // Play audio function from QuranScreen
  const playAudio = async (ayah) => {
    try {
      if (!ayah || !ayah.number || !selectedReciter) return;
      const audioUrl = await getAyahAudioUrl(ayah.number, selectedReciter.id);
      if (!audioUrl) throw new Error('Audio URL not found');
      
      if (audio) {
        await audio.unloadAsync();
        setAudio(null);
      }
      
      setIsPlaying(true);
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
      setAudio(sound);
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (e) {
      setIsPlaying(false);
      console.error('Audio playback error:', e);
    }
  };

  const playAudioFile = async (audioFileName, onComplete) => {
    try {
      if (audio) {
        await audio.unloadAsync();
        setAudio(null);
      }
      
      setIsPlaying(true);
      let audioSource;
      
      // Handle specific audio files
      switch (audioFileName) {
        case 'Takbeer.mp3':
          audioSource = require('../assets/audio/Takbeer.mp3');
          break;
        case 'Iqama.mp3':
          audioSource = require('../assets/audio/Iqama.mp3');
          break;
        default:
          throw new Error(`Unknown audio file: ${audioFileName}`);
      }
      
      const { sound } = await Audio.Sound.createAsync(audioSource);
      setAudio(sound);
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          if (onComplete) {
            onComplete();
          }
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio file:', error);
      setIsPlaying(false);
      if (onComplete) {
        onComplete();
      }
    }
  };

  // Play sequential ayahs (for custom/random selections)
  const playSequentialAyahs = async (ayahs, onComplete) => {
    try {
      if (!ayahs || ayahs.length === 0) {
        if (onComplete) onComplete();
        return;
      }
      
      let currentIndex = 0;
      const playNextAyah = async () => {
        if (currentIndex >= ayahs.length) {
          setIsPlaying(false);
          if (onComplete) onComplete();
          return;
        }
        
        const ayah = ayahs[currentIndex];
        try {
          if (audio) {
            await audio.unloadAsync();
            setAudio(null);
          }
          
          const audioUrl = await getAyahAudioUrl(ayah.number, selectedReciter.id);
          if (!audioUrl) {
            currentIndex++;
            setTimeout(playNextAyah, 1000);
            return;
          }
          
          setIsPlaying(true);
          const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
          setAudio(sound);
          await sound.playAsync();
          
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              currentIndex++;
              setTimeout(playNextAyah, 500); // Small delay between ayahs
            }
          });
        } catch (error) {
          console.error('Error playing ayah:', error);
          currentIndex++;
          setTimeout(playNextAyah, 1000);
        }
      };
      
      playNextAyah();
    } catch (error) {
      console.error('Error in playSequentialAyahs:', error);
      setIsPlaying(false);
      if (onComplete) onComplete();
    }
  };

  // Fetch reciters list on mount
  useEffect(() => {
    const fetchReciters = async () => {
      // Use all available reciters from the service (excluding user recordings)
      const recitersData = availableReciters.filter(reciter => reciter.id !== 'user');
      setReciters(recitersData);
    };
    fetchReciters();
  }, []);

  // Cleanup and reset function
  const resetGuidedPrayer = async () => {
    try {
      await cleanupAudio();
      setIsPlaying(false);
      setCurrentStep(0);
      setFetchedCustomAyahs({});
      setRandomAyahsSets([[], []]);
      setQuranRecitationMode('fixed');
      setSelectedQuranOptions({});
      setShowCustomSelectionUI(false);
      setPickerModal(null);
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
    } catch (error) {
      console.error('Error in resetGuidedPrayer:', error);
    }
  };

  // Navigation cleanup: reset everything and stop audio when leaving
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        try {
          console.log('GuidedPrayerScreen: Cleaning up on screen exit');
          handleStopAudio();
          resetGuidedPrayer();
        } catch (error) {
          console.error('Error in useFocusEffect cleanup:', error);
        }
      };
    }, [])
  );

  // Robust stop audio handler
  const handleStopAudio = async () => {
    try {
      console.log('Stopping all audio sources...');
      
      // Stop dhikr repetition
      setIsDhikrRepeating(false);
      
      // Stop Speech.speak() for dhikr, tashahhud, etc.
      try {
        Speech.stop();
        console.log('Speech stopped');
      } catch (e) {
        console.log('Speech was not active');
      }
      
      // Stop Expo Audio for Quran recitations
      await cleanupAudio();
      
      // Clear any remaining timers
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
        console.log('AutoPlay timer cleared');
      }
      
      // Reset playing state
      setIsPlaying(false);
      console.log('All audio stopped successfully');
    } catch (error) {
      console.error('Error stopping audio:', error);
      setIsPlaying(false);
    }
  };

  // In playCurrentStep, always clear previous timers before starting
  const playCurrentStep = async (stepIndex) => {
    try {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
      const step = prayerSteps[stepIndex];
      if (!step) return;
      
      // Clean up any existing audio first
      await cleanupAudio();
      setIsPlaying(true);
      
      // Handle takbeer steps with audio file
      if (step.id === 'opening_takbir' || step.id.includes('takbir_')) {
        playAudioFile('Takbeer.mp3', () => {
          setIsPlaying(false);
          if (autoPlay && stepIndex < prayerSteps.length - 1) {
            setTimeout(async () => {
              await cleanupAudio();
              setCurrentStep(stepIndex + 1);
              playCurrentStep(stepIndex + 1);
            }, 2500);
          }
        });
      }
      // Handle iqama step with audio file
      else if (step.id === 'iqama') {
        playAudioFile('Iqama.mp3', () => {
          setIsPlaying(false);
          if (autoPlay && stepIndex < prayerSteps.length - 1) {
            setTimeout(async () => {
              await cleanupAudio();
              setCurrentStep(stepIndex + 1);
              playCurrentStep(stepIndex + 1);
            }, 2500);
          }
        });
      }
      // If the step is a Quranic recitation (Fatiha, Ikhlas, or random surah), use Quran audio
      else if (step.id.startsWith('fatiha_') || step.id.startsWith('ikhlas_') || step.id.startsWith('random_surah_') || step.id.startsWith('custom_surah_')) {
        if (step.isCustomSelection && step.customAyahs) {
          // Handle custom selections by fetching the actual text and playing audio
          const { surahNumber, startAyah, endAyah, surahName } = step.customAyahs;
          
          try {
            const translationEdition = getTranslationEdition(currentLanguage);
            const [surahResp, transResp, translitResp] = await Promise.all([
              fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`),
              fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${translationEdition}`),
              fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/en.transliteration`)
            ]);
            
            const surahData = await surahResp.json();
            const transData = await transResp.json();
            const translitData = await translitResp.json();
            
            const ayahs = surahData.data.ayahs.slice(startAyah - 1, endAyah);
            const transAyahs = transData.data.ayahs.slice(startAyah - 1, endAyah);
            const translitAyahs = translitData.data.ayahs.slice(startAyah - 1, endAyah);
            
            const customAyahs = ayahs.map((a, i) => ({
              surah: surahNumber,
              surahName,
              numberInSurah: a.numberInSurah,
              number: a.number, // Global ayah number for audio playback
              arabic: a.text,
              translation: transAyahs[i]?.text || '',
              transliteration: translitAyahs[i]?.text || '',
            }));
            
            // Update the step with the actual text
            step.arabic = customAyahs.map(a => a.arabic).join(' ۝ ');
            step.transliteration = customAyahs.map(a => a.transliteration).join(' ۝ ');
            step.translation = customAyahs.map(a => a.translation).join(' ');
            
            // Store the fetched ayahs for reuse
            setFetchedCustomAyahs(prev => ({
              ...prev,
              [`custom_surah_${step.rakah}`]: customAyahs
            }));
            
            // Use the new playSequentialAyahs function
            playSequentialAyahs(customAyahs, () => {
              setIsPlaying(false);
              if (autoPlay && stepIndex < prayerSteps.length - 1) {
                setTimeout(async () => {
                  await cleanupAudio();
                  setCurrentStep(stepIndex + 1);
                  playCurrentStep(stepIndex + 1);
                }, 2500);
              }
            });
          } catch (error) {
            console.error('Error playing custom ayahs:', error);
            setIsPlaying(false);
          }
        } else if (step.id.startsWith('random_surah_')) {
          // Handle random ayahs with sequential audio playback
          const ayahSet = randomAyahsSets[step.rakah - 1];
          if (ayahSet && ayahSet.length > 0) {
            // Use the new playSequentialAyahs function
            playSequentialAyahs(ayahSet, () => {
              setIsPlaying(false);
              if (autoPlay && stepIndex < prayerSteps.length - 1) {
                setTimeout(async () => {
                  await cleanupAudio();
                  setCurrentStep(stepIndex + 1);
                  playCurrentStep(stepIndex + 1);
                }, 2500);
              }
            });
          } else {
            // Fallback to regular Quran audio
            playSequentialAyahs(ayahSet, () => {
              setIsPlaying(false);
              if (autoPlay && stepIndex < prayerSteps.length - 1) {
                setTimeout(async () => {
                  await cleanupAudio();
                  setCurrentStep(stepIndex + 1);
                  playCurrentStep(stepIndex + 1);
                }, 2500);
              }
            });
          }
        } else {
          // Handle regular Quran steps (Fatiha, Ikhlas)
          if (step.id.startsWith('fatiha_')) {
            // Play all 7 ayahs of Al-Fatiha sequentially
            const fatihaAyahs = [
              { number: 1, arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', transliteration: 'Bismillahi ar-rahmani ar-raheem', translation: 'In the name of Allah, the Beneficent, the Merciful' },
              { number: 2, arabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', transliteration: 'Al-hamdu lillahi rabbi al-alameen', translation: 'Praise be to Allah, Lord of the Worlds' },
              { number: 3, arabic: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', transliteration: 'Ar-rahmani ar-raheem', translation: 'The Beneficent, the Merciful' },
              { number: 4, arabic: 'مَٰلِكِ يَوْمِ ٱلدِّينِ', transliteration: 'Maliki yawmi ad-deen', translation: 'Master of the Day of Judgment' },
              { number: 5, arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', transliteration: 'Iyyaka na\'budu wa iyyaka nasta\'een', translation: 'You alone we worship; You alone we ask for help' },
              { number: 6, arabic: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمِ', transliteration: 'Ihdina as-sirata al-mustaqeem', translation: 'Show us the straight path' },
              { number: 7, arabic: 'صِرَٰطَ ٱلَّذِىنَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ', transliteration: 'Sirata alladheena an\'amta alayhim ghayri al-maghdubi alayhim wa la ad-dalleen', translation: 'The path of those You have blessed, not of those who have incurred Your wrath, nor of those who have gone astray' }
            ];
            
            playSequentialAyahs(fatihaAyahs, () => {
              setIsPlaying(false);
              if (autoPlay && stepIndex < prayerSteps.length - 1) {
                setTimeout(async () => {
                  await cleanupAudio();
                  setCurrentStep(stepIndex + 1);
                  playCurrentStep(stepIndex + 1);
                }, 2500);
              }
            });
          } else if (step.id.startsWith('ikhlas_')) {
            // Play all 4 ayahs of Al-Ikhlas sequentially
            const ikhlasAyahs = [
              { number: 6221, arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', transliteration: 'Qul huwa Allahu ahad', translation: 'Say: He is Allah, the One!' },
              { number: 6222, arabic: 'ٱللَّهُ ٱلصَّمَدُ', transliteration: 'Allahu as-samad', translation: 'Allah, the Eternal, Absolute' },
              { number: 6223, arabic: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', transliteration: 'Lam yalid wa lam yulad', translation: 'He begets not, nor is He begotten' },
              { number: 6224, arabic: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ', transliteration: 'Wa lam yakun lahu kufuwan ahad', translation: 'And there is none like unto Him' }
            ];
            
            playSequentialAyahs(ikhlasAyahs, () => {
              setIsPlaying(false);
              if (autoPlay && stepIndex < prayerSteps.length - 1) {
                setTimeout(async () => {
                  await cleanupAudio();
                  setCurrentStep(stepIndex + 1);
                  playCurrentStep(stepIndex + 1);
                }, 2500);
              }
            });
          } else {
            // Fallback for other Quran steps
            const ayah = { number: step.id === 'fatiha_1' ? 1 : 112 }; // Fatiha or Ikhlas
            await playAudio(ayah);
            if (autoPlay && stepIndex < prayerSteps.length - 1) {
              autoPlayTimer.current = setTimeout(async () => {
                await cleanupAudio();
                setCurrentStep(stepIndex + 1);
                playCurrentStep(stepIndex + 1);
              }, 2500);
            }
          }
        }
      } else if (step.arabic) {
        // For dhikr steps (ruku and sujud), repeat 3 times
        if ((step.id.includes('ruku_') && !step.id.includes('rise_ruku_') && !step.id.includes('standing_after_ruku_')) || (step.id.includes('sujud') && !step.id.includes('sitting_between_sujud') && !step.id.includes('takbir_between_sujud') && !step.id.includes('takbir_sujud'))) {
          let repeatCount = 0;
          const maxRepeats = 3;
          
          setIsDhikrRepeating(true);
          
          const speakDhikr = () => {
            // Check if we should stop repeating (e.g., user left screen)
            if (!isDhikrRepeating) {
              setIsPlaying(false);
              return;
            }
            
            repeatCount++;
            Speech.speak(step.arabic, {
              language: 'ar',
              onDone: () => {
                // Check again before scheduling next repetition
                if (!isDhikrRepeating) {
                  setIsPlaying(false);
                  return;
                }
                
                if (repeatCount < maxRepeats) {
                  // Wait 1 second before next repetition
                  setTimeout(speakDhikr, 1000);
                } else {
                  setIsDhikrRepeating(false);
                  setIsPlaying(false);
                  if (autoPlay && stepIndex < prayerSteps.length - 1) {
                    setTimeout(async () => {
                      await cleanupAudio();
                      setCurrentStep(stepIndex + 1);
                      playCurrentStep(stepIndex + 1);
                    }, 2500);
                  }
                }
              },
            });
          };
          
          speakDhikr();
        } else {
          // For all other non-Quran steps, use Expo Speech to read the Arabic aloud once
          Speech.speak(step.arabic, {
            language: 'ar',
            onDone: () => {
              setIsPlaying(false);
              if (autoPlay && stepIndex < prayerSteps.length - 1) {
                setTimeout(async () => {
                  await cleanupAudio();
                  setCurrentStep(stepIndex + 1);
                  playCurrentStep(stepIndex + 1);
                }, 2500);
              }
            },
          });
        }
      } else {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error in playCurrentStep:', error);
      setIsPlaying(false);
    }
  };

  // Update nextStep and previousStep to use playCurrentStep if autoPlay is enabled
  const nextStep = async () => {
    console.log('🔍 Next step called. Current step:', currentStep, 'Total steps:', prayerSteps.length);
    if (currentStep < prayerSteps.length - 1) {
      // Stop any current audio when navigating
      await cleanupAudio();
      const newStep = currentStep + 1;
      console.log('🔍 Moving to step:', newStep);
      setCurrentStep(newStep);
      if (autoPlay) {
        playCurrentStep(newStep);
      }
    } else {
      console.log('🔍 Already at last step');
    }
  };

  const previousStep = async () => {
    console.log('🔍 Previous step called. Current step:', currentStep);
    if (currentStep > 0) {
      // Stop any current audio when navigating
      await cleanupAudio();
      const newStep = currentStep - 1;
      console.log('🔍 Moving to step:', newStep);
      setCurrentStep(newStep);
      if (autoPlay) {
        playCurrentStep(newStep);
      }
    } else {
      console.log('🔍 Already at first step');
    }
  };

  // Ensure audio player is properly initialized
  useEffect(() => {
    if (audio) {
      // Set up error handling for the player
      const handlePlayerError = (error) => {
        console.error('Audio player error:', error);
        setIsPlaying(false);
      };
      
      // Add any necessary player setup here
      return () => {
        // Cleanup if needed
      };
    }
  }, [audio]);

  // When user toggles autoPlay ON, start playing from current step (only if modal is closed)
  useEffect(() => {
    if (autoPlay && !isPlaying) {
      playCurrentStep(currentStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  const getPostureIcon = (posture) => {
    switch (posture) {
      case 'standing': return 'man-outline';
      case 'bowing': return 'trending-down-outline';
      case 'prostrating': return 'remove-outline';
      case 'sitting': return 'square-outline';
      default: return 'man-outline';
    }
  };

  const getPostureColor = (posture) => {
    switch (posture) {
      case 'standing': return '#2196F3';
      case 'bowing': return '#FF9800';
      case 'prostrating': return '#4CAF50';
      case 'sitting': return '#9C27B0';
      default: return '#2196F3';
    }
  };

  const selectRandomSurah = () => {
    const randomIndex = Math.floor(Math.random() * shortSurahs.length);
    setRandomSurah(shortSurahs[randomIndex]);
    Alert.alert(
      'Surah Updated',
      `Selected: Surah ${shortSurahs[randomIndex].name}`,
      [{ text: 'OK' }]
    );
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) audio.unloadAsync();
    };
  }, [audio]);

  const currentStepData = prayerSteps[currentStep];
  console.log('🔍 Current step data:', currentStepData);
  console.log('🔍 Current step index:', currentStep, 'Total steps:', prayerSteps.length);
  
  if (!currentStepData) {
    console.log('🔍 No current step data, showing loading');
    return (
      <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator size='large' />
      </View>
    );
  }
  const progress = ((currentStep + 1) / prayerSteps.length) * 100;

  return (
    <>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={async () => {
                try {
                  console.log('Back button pressed, cleaning up all audio');
                  await handleStopAudio();
                  await resetGuidedPrayer();
                  navigation.goBack();
                } catch (error) {
                  console.error('Error in back button handler:', error);
                  navigation.goBack();
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{t('guided', currentLanguage)} {prayer.name.charAt(0).toUpperCase() + prayer.name.slice(1)}</Text>
              <Text style={styles.headerSubtitle}>
                {t('step', currentLanguage)} {currentStep + 1} {t('of', currentLanguage)} {prayerSteps.length}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}% {t('complete', currentLanguage)}</Text>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.controlsSection}>
              <View style={styles.controlRow}>
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>{t('autoPlay', currentLanguage)}</Text>
                  <Switch
                    value={autoPlay}
                    onValueChange={setAutoPlay}
                    trackColor={{ false: '#767577', true: '#2196F3' }}
                    thumbColor={autoPlay ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              </View>
            </View>

            <View style={styles.stepContainer}>
              {currentStepData.isSetupStep ? (
                // Setup step - show the modal content
                <View style={{ backgroundColor: '#1E1E1E', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, elevation: 8, borderWidth: 1, borderColor: '#333' }}>
                  <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#FFFFFF', letterSpacing: 0.2 }}>{t('beforeYouBegin', currentLanguage)}</Text>
                  <Text style={{ fontSize: 15, color: '#CCCCCC', marginBottom: 18, textAlign: 'center', lineHeight: 22 }}>
                    {t('wuduReminder', currentLanguage)}
                  </Text>
                  <View style={{ width: '100%', backgroundColor: '#2C2C2C', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' }}>{t('chooseVersesForEachRakat', currentLanguage)}</Text>
                    
                    {/* Recitation Mode Selection */}
                    <View style={{ marginBottom: 15 }}>
                      {getQuranRecitationOptions(currentLanguage).map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: quranRecitationMode === option.id ? '#667eea' : '#404040',
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 8
                          }}
                          onPress={() => {
                            setQuranRecitationMode(option.id);
                            if (option.id === 'random') {
                              fetchRandomAyahsSets();
                            }
                            if (option.id === 'custom') {
                              setShowCustomSelectionUI(true);
                            }
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: 15,
                              color: quranRecitationMode === option.id ? '#fff' : '#CCCCCC',
                              fontWeight: '600'
                            }}>
                              {option.name}
                            </Text>
                            <Text style={{
                              fontSize: 12,
                              color: quranRecitationMode === option.id ? '#e0e0e0' : '#999999',
                              marginTop: 2
                            }}>
                              {option.description}
                            </Text>
                          </View>
                          <View style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: quranRecitationMode === option.id ? '#fff' : '#666',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            {quranRecitationMode === option.id && (
                              <Ionicons name="checkmark" size={12} color="#667eea" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Random Verse Options */}
                    {quranRecitationMode === 'random' && (
                      <View style={{ marginBottom: 15 }}>
                        <Text style={{ fontSize: 14, color: '#CCCCCC', marginBottom: 8 }}>{t('chooseRandomVersesFrom', currentLanguage)}</Text>
                        {getRandomVerseOptions(currentLanguage).map((option) => (
                          <TouchableOpacity
                            key={option.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#404040',
                              borderRadius: 8,
                              padding: 10,
                              marginBottom: 6
                            }}
                            onPress={() => {
                              fetchRandomAyahsSets(option.id);
                            }}
                          >
                            <Ionicons name="shuffle" size={16} color="#67C3F3" style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '500' }}>
                                {option.name}
                              </Text>
                              <Text style={{ fontSize: 12, color: '#BBBBBB' }}>
                                {option.description}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Custom Selection */}
                    {quranRecitationMode === 'custom' && (
                      <View style={{ marginBottom: 15 }}>
                        <Text style={{ fontSize: 14, color: '#CCCCCC', marginBottom: 8 }}>{t('chooseSpecificSurahsAyahs', currentLanguage)}</Text>
                        {[1, 2].map((rakahNum) => {
                          const sel = selectedQuranOptions[`rakah${rakahNum}`] || { type: 'surah', value: '112', start: 1, end: 4 };
                          const surah = surahList.find(s => s.number.toString() === sel.value) || surahList[111];
                          const ayahCount = surah ? (surah.ayahs || 4) : 4;
                          return (
                            <View key={rakahNum} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#404040', borderRadius: 8, padding: 12 }}>
                              <Text style={{ color: '#BBBBBB', fontWeight: '600', marginRight: 6 }}>{t('rakah', currentLanguage)} {rakahNum}:</Text>
                              {/* Surah Name Dropdown */}
                              <TouchableOpacity onPress={() => setPickerModal({ type: 'surah', rakah: rakahNum })}>
                                <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 15 }}>{surah.name}</Text>
                              </TouchableOpacity>
                              <Text style={{ color: '#BBBBBB', marginHorizontal: 4 }}>,</Text>
                              {/* Start Ayah Picker */}
                              <TouchableOpacity onPress={() => setPickerModal({ type: 'start', rakah: rakahNum })}>
                                <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 15 }}>{sel.start || 1}</Text>
                              </TouchableOpacity>
                              <Text style={{ color: '#BBBBBB', marginHorizontal: 2 }}>-</Text>
                              {/* End Ayah Picker */}
                              <TouchableOpacity onPress={() => setPickerModal({ type: 'end', rakah: rakahNum })}>
                                <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 15 }}>{sel.end || ayahCount}</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Display current selection */}
                    {quranRecitationMode === 'fixed' && (
                      <Text style={{ fontSize: 15, color: '#67C3F3', marginBottom: 2, textAlign: 'center' }}>
                        <Text style={{ fontWeight: 'bold' }}>{t('secondRakatOnly', currentLanguage)}</Text> {t('surah', currentLanguage)} {t('alIkhlas', currentLanguage)}
                      </Text>
                    )}
                    {quranRecitationMode === 'random' && loadingRandomAyahs && (
                      <ActivityIndicator size="small" color="#67C3F3" style={{ marginBottom: 10 }} />
                    )}
                    {quranRecitationMode === 'random' && !loadingRandomAyahs && randomAyahsSets[0].length > 0 && randomAyahsSets[1].length > 0 && (
                      <View style={{ marginBottom: 2 }}>
                        {[0, 1].map((idx) => (
                          <View key={idx} style={{ marginBottom: 8 }}>
                            <Text style={{ fontSize: 15, color: '#67C3F3', textAlign: 'center', fontWeight: 'bold' }}>
                              {t('rakah', currentLanguage)} {idx + 1}:
                            </Text>
                            {randomAyahsSets[idx].map((ayah, i) => (
                              <Text key={i} style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>
                                {ayah.surahName} {ayah.numberInSurah}: {ayah.arabic}
                              </Text>
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={{ width: '100%', marginBottom: 18 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 }}>{t('chooseReciter', currentLanguage)}</Text>
                    <Text style={{ fontSize: 13, color: '#CCCCCC', marginBottom: 8 }}>
                      {t('selectReciterDescription', currentLanguage)}
                    </Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#404040',
                        borderRadius: 10,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: '#555'
                      }}
                      onPress={() => setShowReciterDropdown(!showReciterDropdown)}
                    >
                      <Text style={{ fontSize: 15, color: '#FFFFFF', fontWeight: '600', flex: 1 }}>
                        {selectedReciter.name}
                      </Text>
                      <Ionicons 
                        name={showReciterDropdown ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#CCCCCC" 
                      />
                    </TouchableOpacity>
                    
                    {showReciterDropdown && (
                      <View style={{ 
                        backgroundColor: '#2C2C2C', 
                        borderRadius: 10, 
                        marginTop: 8,
                        maxHeight: 200
                      }}>
                        <ScrollView>
                          {reciters.map((reciter) => (
                            <TouchableOpacity
                              key={reciter.id}
                              style={{
                                padding: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: '#404040'
                              }}
                              onPress={() => {
                                setSelectedReciter(reciter);
                                setShowReciterDropdown(false);
                              }}
                            >
                              <Text style={{ 
                                color: selectedReciter.id === reciter.id ? '#667eea' : '#FFFFFF',
                                fontWeight: selectedReciter.id === reciter.id ? '600' : '400'
                              }}>
                                {reciter.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                // Regular prayer step
                <>
                  <View style={styles.postureSection}>
                    <View style={[styles.postureIcon, { backgroundColor: getPostureColor(currentStepData.posture) + '20' }]}>
                      <Ionicons 
                        name={getPostureIcon(currentStepData.posture)} 
                        size={32} 
                        color={getPostureColor(currentStepData.posture)} 
                      />
                    </View>
                    <View style={styles.postureInfo}>
                      <Text style={styles.stepTitle}>{currentStepData.title}</Text>
                      <Text style={styles.stepInstruction}>{currentStepData.instruction}</Text>
                    </View>
                  </View>

                  <View style={styles.textSection}>
                    <View style={styles.arabicContainer}>
                      <Text style={styles.arabicText}>{currentStepData.arabic}</Text>
                      <TouchableOpacity 
                        style={[styles.playButton, isPlaying && styles.playingButton]}
                        onPress={() => {
                          if (isPlaying) {
                            // If playing, stop audio
                            handleStopAudio();
                          } else {
                            // If not playing, play current step
                            playCurrentStep(currentStep);
                          }
                        }}
                      >
                        <Ionicons 
                          name={isPlaying ? "stop" : "play"} 
                          size={20} 
                          color="#fff" 
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.transliterationContainer}>
                      <Text style={styles.transliterationText}>
                        {currentStepData.transliteration}
                      </Text>
                    </View>

                    <View style={styles.translationContainer}>
                      <Text style={styles.translationText}>
                        {currentStepData.translation}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.navigationControls}>
            <TouchableOpacity 
              style={[styles.navButton, styles.prevButton, currentStep === 0 && styles.disabledButton]}
              onPress={() => previousStep()}
              disabled={currentStep === 0}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                              <Text style={[styles.navButtonText, currentStep === 0 && styles.disabledButtonText]}>{t('previous', currentLanguage)}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, styles.nextButton]}
              onPress={currentStep === prayerSteps.length - 1 ? 
                async () => {
                  await cleanupAudio();
                  Alert.alert(
                    'Prayer Complete!',
                    'May Allah accept your prayer. Ameen.',
                    [
                      { text: 'Make Du\'a', onPress: () => {} },
                      { text: 'Finish', onPress: async () => {
                        await cleanupAudio();
                        navigation.goBack();
                      }}
                    ]
                  );
                } : () => nextStep()}
            >
              <Text style={styles.navButtonText}>
                {currentStep === prayerSteps.length - 1 ? t('complete', currentLanguage) : t('next', currentLanguage)}
              </Text>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        {renderQuranOptionsModal()}
      </View>
      
      {/* Custom Selection UI - moved to top level */}
      {quranRecitationMode === 'custom' && showCustomSelectionUI && (
        <View style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.8)', 
          justifyContent: 'center', 
          alignItems: 'center',
          zIndex: 9999
        }}>
          <View style={{ 
            backgroundColor: '#1E1E1E', 
            borderRadius: 24, 
            padding: 32, 
            width: '95%', 
            maxWidth: 500,
            maxHeight: '90%'
          }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20, marginBottom: 24, textAlign: 'center' }}>
              {t('customQuranSelection', currentLanguage)}
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {[1, 2].map((rakahNum) => {
                const sel = selectedQuranOptions[`rakah${rakahNum}`] || { type: 'surah', value: '112', start: 1, end: 4 };
                const surah = surahList.find(s => s.number.toString() === sel.value) || surahList[111];
                const ayahCount = surah ? (surah.ayahs || 4) : 4;
                return (
                  <View key={rakahNum} style={{ 
                    backgroundColor: '#404040', 
                    borderRadius: 12, 
                    padding: 16, 
                    marginBottom: 16,
                    borderWidth: 2,
                    borderColor: '#555'
                  }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>
                      {t('rakah', currentLanguage)} {rakahNum}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ color: '#BBBBBB', fontWeight: '600', fontSize: 14 }}>{t('surah', currentLanguage)}:</Text>
                      <TouchableOpacity 
                        style={{ backgroundColor: '#2C2C2C', padding: 8, borderRadius: 8, minWidth: 120 }}
                        onPress={() => setPickerModal({ type: 'surah', rakah: rakahNum })}
                      >
                        <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 15, textAlign: 'center' }}>{surah.name}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#BBBBBB', fontWeight: '600', fontSize: 14 }}>{t('ayah', currentLanguage)}s:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                          style={{ backgroundColor: '#2C2C2C', padding: 8, borderRadius: 8, minWidth: 50, marginRight: 8 }}
                          onPress={() => setPickerModal({ type: 'start', rakah: rakahNum })}
                        >
                          <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 15, textAlign: 'center' }}>{sel.start || 1}</Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#BBBBBB', marginHorizontal: 8 }}>-</Text>
                        <TouchableOpacity 
                          style={{ backgroundColor: '#2C2C2C', padding: 8, borderRadius: 8, minWidth: 50 }}
                          onPress={() => setPickerModal({ type: 'end', rakah: rakahNum })}
                        >
                          <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 15, textAlign: 'center' }}>{sel.end || ayahCount}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity 
                style={{ 
                  backgroundColor: '#6c757d', 
                  borderRadius: 12, 
                  padding: 12,
                  flex: 1,
                  marginRight: 10,
                  alignItems: 'center'
                }}
                onPress={() => setShowCustomSelectionUI(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t('cancel', currentLanguage)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ 
                  backgroundColor: '#667eea', 
                  borderRadius: 12, 
                  padding: 12,
                  flex: 1,
                  marginLeft: 10,
                  alignItems: 'center'
                }}
                onPress={() => setShowCustomSelectionUI(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t('done', currentLanguage)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Surah Picker Modal - moved to top level */}
      {(pickerModal && (!pickerModal.type || pickerModal.type === 'surah')) && (
        <Modal visible transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
            <View style={{ backgroundColor: '#1E1E1E', borderRadius: 24, padding: 28, width: '80%', maxWidth: 320, maxHeight: '60%' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 16, textAlign: 'center' }}>
                {t('selectSurahForRakah', currentLanguage).replace('{rakah}', pickerModal.rakah)}
              </Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {surahList.map((surah) => (
                  <TouchableOpacity
                    key={surah.number}
                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#333', alignItems: 'center' }}
                    onPress={() => {
                      setSelectedQuranOptions(prev => {
                        const key = `rakah${pickerModal.rakah}`;
                        const sel = prev[key] || { type: 'surah', value: '112', start: 1, end: 4 };
                        return {
                          ...prev,
                          [key]: {
                            ...sel,
                            value: surah.number.toString(),
                            start: 1,
                            end: surah.ayahs || 4
                          }
                        };
                      });
                      // Automatically open start ayah picker
                      setPickerModal({ type: 'start', rakah: pickerModal.rakah });
                    }}
                  >
                    <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 16 }}>{surah.number}. {surah.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }} onPress={() => setPickerModal(null)}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Ayah Picker Modal - moved to top level */}
      {(pickerModal && pickerModal.type === 'start') && (
        <Modal visible transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
            <View style={{ backgroundColor: '#1E1E1E', borderRadius: 24, padding: 28, width: '80%', maxWidth: 320, maxHeight: '60%' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 16, textAlign: 'center' }}>
                {t('selectStartingAyahForRakah', currentLanguage).replace('{rakah}', pickerModal.rakah)}
              </Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {(() => {
                  const currentSurahValue = selectedQuranOptions[`rakah${pickerModal.rakah}`]?.value || '112';
                  const currentSurah = surahList.find(s => s.number.toString() === currentSurahValue);
                  const ayahCount = currentSurah?.ayahs || 4;
                  return [...Array(ayahCount)].map((_, i) => (
                    <TouchableOpacity
                      key={i+1}
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#333', alignItems: 'center' }}
                      onPress={() => {
                        setSelectedQuranOptions(prev => {
                          const key = `rakah${pickerModal.rakah}`;
                          const sel = prev[key] || { type: 'surah', value: '112', start: 1, end: 4 };
                          return {
                            ...prev,
                            [key]: {
                              ...sel,
                              start: i+1
                            }
                          };
                        });
                        // Automatically open end ayah picker
                        setPickerModal({ type: 'end', rakah: pickerModal.rakah });
                      }}
                    >
                      <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 16 }}>{i+1}</Text>
                    </TouchableOpacity>
                  ));
                })()}
              </ScrollView>
              <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }} onPress={() => setPickerModal({ type: null, rakah: 1 })}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{t('cancel', currentLanguage)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* End Ayah Picker Modal - moved to top level */}
      {(pickerModal && pickerModal.type === 'end') && (
        <Modal visible transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
            <View style={{ backgroundColor: '#1E1E1E', borderRadius: 24, padding: 28, width: '80%', maxWidth: 320, maxHeight: '60%' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 16, textAlign: 'center' }}>
                {t('selectEndingAyahForRakah', currentLanguage).replace('{rakah}', pickerModal.rakah)}
              </Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {(() => {
                  const currentSurahValue = selectedQuranOptions[`rakah${pickerModal.rakah}`]?.value || '112';
                  const currentSurah = surahList.find(s => s.number.toString() === currentSurahValue);
                  const ayahCount = currentSurah?.ayahs || 4;
                  const startAyah = selectedQuranOptions[`rakah${pickerModal.rakah}`]?.start || 1;
                  return [...Array(ayahCount)].map((_, i) => {
                    const ayahNumber = i + 1;
                    if (ayahNumber < startAyah) return null; // Don't show ayahs before start
                    return (
                      <TouchableOpacity
                        key={ayahNumber}
                        style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#333', alignItems: 'center' }}
                        onPress={() => {
                          setSelectedQuranOptions(prev => {
                            const key = `rakah${pickerModal.rakah}`;
                            const sel = prev[key] || { type: 'surah', value: '112', start: 1, end: 4 };
                            return {
                              ...prev,
                              [key]: {
                                ...sel,
                                end: ayahNumber
                              }
                            };
                          });
                          // If this is rakah 1, automatically open rakah 2 selection
                          if (pickerModal.rakah === 1) {
                            setPickerModal({ type: 'surah', rakah: 2 });
                          } else {
                            // If this is rakah 2, close the modal
                            setPickerModal(null);
                          }
                        }}
                      >
                        <Text style={{ color: '#67C3F3', fontWeight: 'bold', fontSize: 16 }}>{ayahNumber}</Text>
                      </TouchableOpacity>
                    );
                  }).filter(Boolean);
                })()}
              </ScrollView>
              <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }} onPress={() => setPickerModal(null)}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{t('cancel', currentLanguage)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#272727',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2C2C2C',
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A9A9A9',
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#272727',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#A9A9A9',
    textAlign: 'center',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  controlsSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginVertical: 15,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 10,
  },
  stepContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  postureSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  postureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  postureInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepInstruction: {
    fontSize: 14,
    color: '#A9A9A9',
    lineHeight: 20,
  },
  textSection: {
    marginTop: 10,
  },
  arabicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  arabicText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
    lineHeight: 40,
    flex: 1,
    marginRight: 15,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingButton: {
    backgroundColor: '#FF6347',
  },
  transliterationContainer: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  transliterationText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#D3D3D3',
    lineHeight: 22,
  },
  translationContainer: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 15,
  },
  translationText: {
    fontSize: 14,
    color: '#D3D3D3',
    lineHeight: 22,
  },
  navigationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#272727',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  prevButton: {
    backgroundColor: '#6c757d',
    marginRight: 10,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 10,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#2C2C2C',
  },
  disabledButtonText: {
    color: '#555555',
  },
}); 