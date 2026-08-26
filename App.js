import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  TextInput, ActivityIndicator, Linking, Alert, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppStore } from './store';
import { 
  processFridgeImage, fetchRecipeFromAI, 
  fetchAlternativeRecipe, processVoiceAudio 
} from './geminiService';
import { HIGH_QUALITY_AAC_PRESET } from './config/audioConfig';

// Fun, engaging messages to prevent the app from feeling slow
const IMAGE_LOADING_MESSAGES = [
  "🔍 Inspecting your fridge...",
  "🥑 Spotting veggies & ingredients...",
  "✨ Almost got the full list!"
];

const VOICE_LOADING_MESSAGES = [
  "👂 Listening to your voice...",
  "📝 Decoding ingredients...",
  "🍳 Gathering your items!"
];

const RECIPE_LOADING_MESSAGES = [
  "👨‍🍳 Chef Gemini is thinking...",
  "🔥 Preheating the virtual oven...",
  "📖 Crafting the perfect recipe...",
  "🍽️ Adding final touches!"
];

export default function App() {
  const [manualInput, setManualInput] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom status text state
  const [loadingText, setLoadingText] = useState('');

  const { 
    apiKey, setApiKey, loadApiKey,
    ingredients, addIngredient, removeIngredient, 
    recipe, setRecipe, previousRecipes, 
    selectedCuisine, setSelectedCuisine, 
    loading, setLoading, resetSession 
  } = useAppStore();

  useEffect(() => {
    if (loadApiKey) loadApiKey();
  }, []);

  // Helper to cycle messages during longer requests
  const startLoadingAnimation = (messagesArray) => {
    setLoading(true);
    setLoadingText(messagesArray[0]);

    let index = 1;
    const interval = setInterval(() => {
      if (index < messagesArray.length) {
        setLoadingText(messagesArray[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 1800);

    return () => clearInterval(interval);
  };

  const pickImageAndScan = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: true,
      quality: 0.2,
      maxWidth: 800,
      maxHeight: 800,
    });

    if (!result.canceled && result.assets[0].base64) {
      const stopAnimation = startLoadingAnimation(IMAGE_LOADING_MESSAGES);
      try {
        const detected = await processFridgeImage(result.assets[0].base64, apiKey);
        detected.forEach(item => addIngredient(item));
      } catch (err) {
        Alert.alert("Error", err.message || "Could not process image.");
      } finally {
        stopAnimation();
        setLoading(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        const chunks = [];

        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64Audio = reader.result.split(',')[1];
            const stopAnimation = startLoadingAnimation(VOICE_LOADING_MESSAGES);
            try {
              const detectedItems = await processVoiceAudio(base64Audio, apiKey);
              detectedItems.forEach(item => addIngredient(item));
            } catch (err) {
              Alert.alert("Error", err.message || "Could not extract speech.");
            } finally {
              stopAnimation();
              setLoading(false);
            }
          };
        };

        mediaRecorder.start();
        setRecording(mediaRecorder);
        setIsRecording(true);
        return;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert('Error', 'Microphone permission required');

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(HIGH_QUALITY_AAC_PRESET);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert("Mic Error", "Microphone access failed.");
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (!recording) return;

    if (Platform.OS === 'web') {
      recording.stop();
      recording.stream.getTracks().forEach(track => track.stop());
      setRecording(null);
      return;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    const stopAnimation = startLoadingAnimation(VOICE_LOADING_MESSAGES);
    try {
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const detectedItems = await processVoiceAudio(base64Audio, apiKey);
      detectedItems.forEach(item => addIngredient(item));
    } catch (err) {
      Alert.alert("Error", err.message || "Could not extract speech.");
    } finally {
      stopAnimation();
      setLoading(false);
    }
  };

  const handleAddManual = () => {
    if (manualInput.trim()) {
      addIngredient(manualInput.trim().toLowerCase());
      setManualInput('');
    }
  };

  const handleGetRecipe = async () => {
    if (ingredients.length === 0) return Alert.alert("Notice", "Please add at least one ingredient!");
    const stopAnimation = startLoadingAnimation(RECIPE_LOADING_MESSAGES);
    try {
      const data = await fetchRecipeFromAI(ingredients, selectedCuisine, apiKey);
      setRecipe(data);
    } catch (err) {
      Alert.alert("Error", err.message || "Error generating recipe.");
    } finally {
      stopAnimation();
      setLoading(false);
    }
  };

  const handleGetAlternative = async () => {
    const stopAnimation = startLoadingAnimation(RECIPE_LOADING_MESSAGES);
    try {
      const data = await fetchAlternativeRecipe(ingredients, selectedCuisine, previousRecipes, apiKey);
      setRecipe(data);
    } catch (err) {
      Alert.alert("Error", err.message || "Error fetching alternative recipe.");
    } finally {
      stopAnimation();
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>What's For Dinner? 🍳</Text>

        <View style={styles.settingsHeader}>
          <Text style={styles.keyStatus}>
            Key Status: {apiKey ? "✅ Configured" : "⚠️ Key Required"}
          </Text>
          <TouchableOpacity style={styles.btnConfig} onPress={() => setShowSettings(!showSettings)}>
            <Text style={styles.btnConfigText}>{showSettings ? "Close" : "⚙️ Set API Key"}</Text>
          </TouchableOpacity>
        </View>

        {(showSettings || !apiKey) && (
          <View style={styles.keyCard}>
            <Text style={styles.cardTitle}>Enter Your Free Gemini API Key</Text>
            <Text style={styles.cardSub}>
              Get a free key in 30 seconds from{' '}
              <Text 
                style={styles.link} 
                onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
              >
                Google AI Studio
              </Text>
            </Text>
            <TextInput
              style={styles.keyInput}
              placeholder="AIzaSy..."
              value={tempKey}
              onChangeText={setTempKey}
              secureTextEntry
            />
            <TouchableOpacity style={styles.btnSave} onPress={() => {
              if (!tempKey.trim()) return Alert.alert("Error", "Please enter a valid API key.");
              setApiKey(tempKey.trim());
              setShowSettings(false);
              Alert.alert("Success", "API Key saved!");
            }}>
              <Text style={styles.btnSaveText}>Save Key</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btnSecondary} onPress={pickImageAndScan}>
            <Text style={styles.btnText}>📸 Scan Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnMic, isRecording && styles.btnMicActive]} 
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.btnText}>{isRecording ? "🔴 Stop Recording" : "🎙️ Hold / Tap Mic"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputRow}>
          <TextInput 
            style={styles.input} 
            placeholder="Add ingredient..." 
            value={manualInput}
            onChangeText={setManualInput}
          />
          <TouchableOpacity style={styles.btnAdd} onPress={handleAddManual}>
            <Text style={styles.btnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subHeader}>Active Ingredients ({ingredients.length}):</Text>
        <View style={styles.chipContainer}>
          {ingredients.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.chip} onPress={() => removeIngredient(idx)}>
              <Text style={styles.chipText}>{item} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.subHeader}>Cuisine Preference:</Text>
        <View style={styles.cuisineRow}>
          {['Any', 'Italian', 'Asian', 'Mexican', 'Indian'].map(c => (
            <TouchableOpacity 
              key={c} 
              style={[styles.cuisineBtn, selectedCuisine === c && styles.cuisineActive]}
              onPress={() => setSelectedCuisine(c)}
            >
              <Text style={selectedCuisine === c ? styles.activeText : styles.cuisineText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CUSTOM ENGAGING LOADING COMPONENT */}
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        ) : recipe ? (
          <View style={styles.recipeCard}>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            <Text style={styles.recipeTime}>⏱️ {recipe.time}</Text>
            <Text style={styles.subHeader}>Steps:</Text>
            {recipe.steps.map((step, i) => (
              <Text key={i} style={styles.stepText}>{i + 1}. {step}</Text>
            ))}

            <View style={styles.recipeActions}>
              <TouchableOpacity style={styles.btnAlt} onPress={handleGetAlternative}>
                <Text style={styles.btnText}>🔄 Something Else</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnReset} onPress={resetSession}>
                <Text style={styles.btnText}>Done Cooking</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.btnPrimary} onPress={handleGetRecipe}>
            <Text style={styles.btnPrimaryText}>Generate Healthy Dinner</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 20 },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  keyStatus: { fontSize: 14, fontWeight: '600' },
  btnConfig: { backgroundColor: '#6C757D', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  btnConfigText: { color: '#FFF', fontSize: 12 },
  keyCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#FFEBAA', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardSub: { fontSize: 13, color: '#666', marginVertical: 6 },
  link: { color: '#007AFF', textDecorationLine: 'underline' },
  keyInput: { borderWidth: 1, borderColor: '#DDD', padding: 10, borderRadius: 6, marginVertical: 10 },
  btnSave: { backgroundColor: '#28A745', padding: 10, borderRadius: 6, alignItems: 'center' },
  btnSaveText: { color: '#FFF', fontWeight: 'bold' },
  subHeader: { fontSize: 16, fontWeight: '600', marginTop: 15, marginBottom: 8 },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  inputRow: { flexDirection: 'row', marginBottom: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, backgroundColor: '#FFF' },
  btnAdd: { backgroundColor: '#28A745', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 8, marginLeft: 8 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#E9ECEF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  chipText: { fontSize: 14, color: '#495057' },
  cuisineRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cuisineBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
  cuisineActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  cuisineText: { color: '#333' },
  activeText: { color: '#FFF', fontWeight: 'bold' },
  btnPrimary: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, marginTop: 25, alignItems: 'center' },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  btnSecondary: { backgroundColor: '#6C757D', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnMic: { backgroundColor: '#17A2B8', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnMicActive: { backgroundColor: '#DC3545' },
  btnAlt: { backgroundColor: '#FF9500', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnReset: { backgroundColor: '#6C757D', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '600' },
  recipeCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, marginTop: 20, borderWidth: 1, borderColor: '#DDD' },
  recipeTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  recipeTime: { fontSize: 14, color: '#666', marginBottom: 10 },
  stepText: { fontSize: 14, color: '#333', marginBottom: 6 },
  recipeActions: { flexDirection: 'row', gap: 10, marginTop: 15 },
  // Styled card for dynamic loading text
  loadingCard: { 
    backgroundColor: '#EBF3FF', 
    padding: 24, 
    borderRadius: 12, 
    marginTop: 25, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BEE0FF'
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#0056B3',
    textAlign: 'center'
  }
});