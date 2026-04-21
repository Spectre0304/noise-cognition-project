import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { C, API_BASE, classifyNoise } from '../constants';

const api = axios.create({ baseURL: API_BASE, timeout: 5000 });

const LETTERS     = ['A','B','C','D','E','F','G','H'];
const TRIAL_MS    = 2500;
const TEST_TRIALS = 30;
const N_LEVEL     = 2;

function generateSequence(trials, n) {
  const seq = [], targets = [];
  for (let i = 0; i < trials; i++) {
    let letter;
    if (i >= n && Math.random() < 0.33) {
      letter = seq[i - n];
      targets.push(true);
    } else {
      do { letter = LETTERS[Math.floor(Math.random() * LETTERS.length)]; }
      while (i >= n && letter === seq[i - n]);
      targets.push(false);
    }
    seq.push(letter);
  }
  return { seq, targets };
}

export default function TestScreen({ navigation }) {
  const [phase, setPhase]           = useState('idle');
  const [noiseDb, setNoiseDb]       = useState(0);
  const [countdown, setCountdown]   = useState(30);
  const [noiseCat, setNoiseCat]     = useState(null);
  const [trialIdx, setTrialIdx]     = useState(0);
  const [currentLetter, setCurrent] = useState('');
  const [responses, setResponses]   = useState([]);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [showFeedback, setShowFeedback]   = useState(null);

  const seqRef         = useRef(null);
  const targetRef      = useRef(null);
  const recordingRef   = useRef(null);
  const dbSamplesRef   = useRef([]);
  const letterStartRef = useRef(null);
  const responded      = useRef(false);
  const timerRef       = useRef(null);
  const fadAnim        = useRef(new Animated.Value(1)).current;

  const startNoiseMeasurement = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('需要麥克風權限'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (s) => { if (s.metering !== undefined) dbSamplesRef.current.push(s.metering); },
        200
      );
      recordingRef.current = recording;
      setPhase('noise');
      let sec = 30;
      timerRef.current = setInterval(() => {
        sec--;
        setCountdown(sec);
        if (sec <= 0) { clearInterval(timerRef.current); stopNoiseMeasurement(); }
      }, 1000);
    } catch (err) {
      Alert.alert('錯誤', '無法啟動麥克風：' + err.message);
    }
  };

  const stopNoiseMeasurement = async () => {
    if (!recordingRef.current) return;
    await recordingRef.current.stopAndUnloadAsync();
    recordingRef.current = null;
    const samples = dbSamplesRef.current.filter(d => d > -160);
    const avgDb   = samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : -60;
    const envDb   = Math.round(avgDb + 90);
    setNoiseDb(envDb);
    setNoiseCat(classifyNoise(envDb));
    setPhase('ready_nback');
  };

  const startNback = useCallback(() => {
    const { seq, targets } = generateSequence(TEST_TRIALS, N_LEVEL);
    seqRef.current    = seq;
    targetRef.current = targets;
    setTrialIdx(0);
    setResponses([]);
    setReactionTimes([]);
    setCurrent(seq[0]);
    letterStartRef.current = Date.now();
    responded.current = false;
    setPhase('nback');
  }, []);

  useEffect(() => {
    if (phase !== 'nback') return;
    if (trialIdx >= TEST_TRIALS) { finishNback(); return; }
    setCurrent(seqRef.current[trialIdx]);
    letterStartRef.current = Date.now();
    responded.current = false;
    setShowFeedback(null);
    fadAnim.setValue(0);
    Animated.timing(fadAnim, { toValue:1, duration:150, useNativeDriver:true }).start();
    const t = setTimeout(() => { if (!responded.current) handleNoResponse(); }, TRIAL_MS);
    return () => clearTimeout(t);
  }, [trialIdx, phase]);

  const handleResponse = (isMatch) => {
    if (phase !== 'nback' || responded.current) return;
    responded.current = true;
    const rt      = Date.now() - letterStartRef.current;
    const correct = isMatch === targetRef.current[trialIdx];
    Haptics.impactAsync(correct ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy);
    setShowFeedback(correct ? 'correct' : 'wrong');
    setResponses(prev => [...prev, correct]);
    setReactionTimes(prev => [...prev, rt]);
    setTimeout(() => setTrialIdx(i => i + 1), 400);
  };

  const handleNoResponse = () => {
    const wasTarget = targetRef.current[trialIdx];
    setResponses(prev => [...prev, !wasTarget]);
    setReactionTimes(prev => [...prev, TRIAL_MS]);
    setTrialIdx(i => i + 1);
  };

  const finishNback = async () => {
    const correct  = responses.filter(Boolean).length;
    const accuracy = correct / responses.length;
    const validRTs = reactionTimes.filter((r, i) => responses[i] && r < TRIAL_MS);
    const avgRt    = validRTs.length > 0 ? validRTs.reduce((a, b) => a + b, 0) / validRTs.length : TRIAL_MS;
    setPhase('done');
    const userId = await AsyncStorage.getItem('user_id');
    try {
      await api.post('/result', {
        user_id:   userId || 'anonymous',
        noise_db:  noiseDb,
        noise_cat: noiseCat?.cat || 'moderate',
        n_level:   N_LEVEL,
        accuracy,
        avg_rt_ms: avgRt,
        total_q:   responses.length,
        correct,
      });
    } catch (e) {
      console.warn('後端上傳失敗（資料仍可本機查看）', e.message);
    }
  };

  const reset = () => {
    setPhase('idle');
    setCountdown(30);
    dbSamplesRef.current = [];
  };

  // ── idle ─────────────────────────────────────────────────────
  if (phase === 'idle') return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.center}>
        <Text style={styles.bigIcon}>🎙️</Text>
        <Text style={styles.title}>準備開始測試</Text>
        <Text style={styles.sub}>流程：量測噪音 30秒 → N-back 測試 → 查看結果</Text>
        <TouchableOpacity style={styles.mainBtn} onPress={startNoiseMeasurement}>
          <Text style={styles.mainBtnText}>開始量測噪音</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // ── noise ────────────────────────────────────────────────────
  if (phase === 'noise') return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.center}>
        <Text style={styles.bigIcon}>🎙️</Text>
        <Text style={styles.title}>量測環境噪音中...</Text>
        <Text style={styles.dbText}>{countdown} 秒</Text>
        <Text style={styles.sub}>請保持在測試環境中，不要說話</Text>
        <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 20 }} />
      </View>
    </SafeAreaView>
  );

  // ── ready_nback ──────────────────────────────────────────────
  if (phase === 'ready_nback') return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.center}>
        <View style={[styles.noiseCard, { borderColor: noiseCat?.color }]}>
          <Text style={styles.title}>噪音量測完成</Text>
          <Text style={[styles.dbText, { color: noiseCat?.color }]}>{noiseDb} dB</Text>
          <Text style={[styles.catText, { color: noiseCat?.color }]}>{noiseCat?.label}</Text>
        </View>
        <Text style={styles.sub}>
          接下來進行 2-back 測試{'\n'}看到與 2 個前相同的字母就按「符合」
        </Text>
        <TouchableOpacity style={styles.mainBtn} onPress={startNback}>
          <Text style={styles.mainBtnText}>開始 N-back 測試</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // ── nback ────────────────────────────────────────────────────
  if (phase === 'nback') return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.navy }]} edges={['bottom']}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(trialIdx / TEST_TRIALS) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{Math.min(trialIdx + 1, TEST_TRIALS)} / {TEST_TRIALS}</Text>
      <View style={styles.letterBox}>
        <Animated.Text style={[styles.letter, { opacity: fadAnim }]}>{currentLetter}</Animated.Text>
        {showFeedback && (
          <Text style={[styles.feedback, { color: showFeedback === 'correct' ? C.green : C.red }]}>
            {showFeedback === 'correct' ? '✓' : '✗'}
          </Text>
        )}
      </View>
      <Text style={styles.nbackHint}>
        {trialIdx < N_LEVEL ? '記住前幾個字母...' : ''}
      </Text>
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.responseBtn, { backgroundColor: '#B71C1C' }]} onPress={() => handleResponse(false)}>
          <Text style={styles.responseBtnText}>✗{'\n'}不符合</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.responseBtn, { backgroundColor: C.teal }]} onPress={() => handleResponse(true)}>
          <Text style={styles.responseBtnText}>✓{'\n'}符合</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // ── done ─────────────────────────────────────────────────────
  if (phase === 'done') {
    const correct  = responses.filter(Boolean).length;
    const accuracy = Math.round((correct / responses.length) * 100);
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.bigIcon}>🎉</Text>
          <Text style={styles.title}>測試完成！</Text>
          <View style={[styles.resultCard, { borderColor: noiseCat?.color }]}>
            <Text style={styles.resultRow}>環境噪音：<Text style={{ color: noiseCat?.color, fontWeight:'bold' }}>{noiseDb} dB（{noiseCat?.label}）</Text></Text>
            <Text style={styles.resultRow}>答對率：<Text style={{ color: C.accent, fontWeight:'bold' }}>{accuracy}%</Text></Text>
            <Text style={styles.resultRow}>答對題數：{correct} / {responses.length}</Text>
          </View>
          <Text style={styles.sub}>資料已記錄，累積10筆後可查看統計分析</Text>
          <TouchableOpacity style={styles.mainBtn} onPress={reset}>
            <Text style={styles.mainBtnText}>再測一次</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: C.navy, marginTop: 10 }]} onPress={() => navigation.navigate('Result')}>
            <Text style={styles.mainBtnText}>查看我的統計</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: C.bg },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  bigIcon:         { fontSize: 64, marginBottom: 16 },
  title:           { fontSize: 22, fontWeight: 'bold', color: C.text, textAlign: 'center', marginBottom: 8 },
  sub:             { fontSize: 14, color: C.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  dbText:          { fontSize: 52, fontWeight: 'bold', color: C.accent, textAlign: 'center' },
  catText:         { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  noiseCard:       { borderWidth: 2, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, width: '90%' },
  mainBtn:         { backgroundColor: C.teal, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', width: '90%', elevation: 4 },
  mainBtnText:     { color: C.white, fontSize: 18, fontWeight: 'bold' },
  progressBar:     { height: 6, backgroundColor: '#1E3A6E', width: '100%' },
  progressFill:    { height: 6, backgroundColor: C.teal },
  progressText:    { color: C.gray, fontSize: 12, alignSelf: 'flex-end', padding: 8 },
  letterBox:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  letter:          { fontSize: 120, fontWeight: 'bold', color: C.white, fontFamily: 'monospace' },
  feedback:        { fontSize: 48, fontWeight: 'bold', position: 'absolute', bottom: -20 },
  nbackHint:       { color: C.gray, fontSize: 14, marginBottom: 20 },
  btnRow:          { flexDirection: 'row', gap: 20, paddingHorizontal: 30, paddingBottom: 30 },
  responseBtn:     { flex: 1, height: 80, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  responseBtnText: { color: C.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  resultCard:      { borderWidth: 2, borderRadius: 16, padding: 24, width: '90%', marginBottom: 20, backgroundColor: C.white, elevation: 4 },
  resultRow:       { fontSize: 16, color: C.text, marginBottom: 10 },
});
