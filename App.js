import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAppStore } from './store';
import { processFridgeImage, fetchRecipeFromAI, fetchAlternativeRecipe, processVoiceAudio } from './geminiService';

export default function App() {
  const [manualInput, setManualInput] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const { 
    ingredients, addIngredient, removeIngredient, 
    recipe, setRecipe, previousRecipes, 
    selectedCuisine, setSelectedCuisine, 
    loading, setLoading, resetSession 
  } = useAppStore();

  // Photo Scan Handler
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
      setLoading(true);
      try {
        const detected = await processFridgeImage(result.assets[0].base64);
        detected.forEach(item => addIngredient(item));
      } catch (err) {
        alert("Could not process image.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return alert('Microphone permission required');

      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true 
      });

      // Explicitly set preset to AAC encoding for reliable API decoding
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  // Stop Voice Recording & Send to Gemini
  const stopRecording = async () => {
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    setLoading(true);
    try {
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const detectedItems = await processVoiceAudio(base64Audio);
      detectedItems.forEach(item => addIngredient(item));
    } catch (err) {
      alert("Could not extract speech.");
    } finally {
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
    if (ingredients.length === 0) return alert("Please add at least one ingredient!");
    setLoading(true);
    try {
      const data = await fetchRecipeFromAI(ingredients, selectedCuisine);
      setRecipe(data);
    } catch (err) {
      alert("Error generating recipe.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetAlternative = async () => {
    setLoading(true);
    try {
      const data = await fetchAlternativeRecipe(ingredients, selectedCuisine, previousRecipes);
      setRecipe(data);
    } catch (err) {
      alert("Error fetching alternative recipe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>What's For Dinner? 🍳</Text>

        {/* Scan & Voice Controls */}
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

        {/* Manual Input Entry */}
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

        {/* Active RAM Chips */}
        <Text style={styles.subHeader}>Active Ingredients ({ingredients.length}):</Text>
        <View style={styles.chipContainer}>
          {ingredients.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.chip} onPress={() => removeIngredient(idx)}>
              <Text style={styles.chipText}>{item} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cuisine Preferences */}
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

        {/* Recipe Display */}
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
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
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
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
  recipeActions: { flexDirection: 'row', gap: 10, marginTop: 15 }
});