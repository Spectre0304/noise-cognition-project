import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '../constants';

export default function HomeScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [savedId, setSavedId] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(v => { if (v) { setUserId(v); setSavedId(v); }});
  }, []);

  const saveId = async () => {
    if (!userId.trim()) { Alert.alert('請輸入你的學號或暱稱'); return; }
    await AsyncStorage.setItem('user_id', userId.trim());
    setSavedId(userId.trim());
    Alert.alert('已儲存', `身份：${userId.trim()}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>噪音 × 認知表現量測系統</Text>
          <Text style={styles.heroSub}>
            測量你在不同噪音環境下的工作記憶表現{'\n'}找出你最適合讀書的環境
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>設定你的身份</Text>
          <TextInput
            style={styles.input}
            placeholder="輸入學號或暱稱（不會外流）"
            value={userId}
            onChangeText={setUserId}
            placeholderTextColor={C.gray}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveId}>
            <Text style={styles.saveBtnText}>儲存</Text>
          </TouchableOpacity>
          {savedId ? <Text style={styles.savedText}>目前身份：{savedId}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>測試流程</Text>
          {[
            { n:'1', t:'量測噪音', d:'APP 自動錄音30秒，計算環境分貝值' },
            { n:'2', t:'N-back 測試', d:'進行2分鐘標準工作記憶測試' },
            { n:'3', t:'記錄結果', d:'自動儲存噪音 + 成績資料' },
            { n:'4', t:'累積分析', d:'10次後可看個人化統計圖表' },
          ].map(({ n, t, d }) => (
            <View key={n} style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{t}</Text>
                <Text style={styles.stepDesc}>{d}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: '#E3F2FD' }]}>
          <Text style={[styles.cardTitle, { color: C.blue }]}>科學依據</Text>
          <Text style={styles.sciText}>
            本系統採用 <Text style={{ fontWeight:'bold' }}>Within-subjects 實驗設計</Text>，
            同一人在不同噪音環境下測試，用 <Text style={{ fontWeight:'bold' }}>Paired t-test</Text> 驗證差異。{'\n\n'}
            N-back 是心理學標準工作記憶測試（Owen et al., 2005），
            噪音超過 65 dB 會顯著降低認知表現（Stansfeld & Matheson, 2003）。
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.startBtn, !savedId && { opacity: 0.4 }]}
          onPress={() => savedId ? navigation.navigate('Test') : Alert.alert('請先設定你的身份')}
        >
          <Text style={styles.startBtnText}>開始測試</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  scroll:      { padding: 20, paddingBottom: 40 },
  hero:        { backgroundColor: C.navy, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  heroTitle:   { fontSize: 20, fontWeight: 'bold', color: C.white, textAlign: 'center' },
  heroSub:     { fontSize: 13, color: C.gray, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  card:        { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 16, elevation: 3 },
  cardTitle:   { fontSize: 15, fontWeight: 'bold', color: C.text, marginBottom: 12 },
  input:       { borderWidth: 1.5, borderColor: '#C5CAE9', borderRadius: 8, padding: 12, fontSize: 14, color: C.text, marginBottom: 10 },
  saveBtn:     { backgroundColor: C.blue, borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: C.white, fontWeight: 'bold', fontSize: 14 },
  savedText:   { color: C.teal, fontSize: 13, marginTop: 8, textAlign: 'center' },
  stepRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepNum:     { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  stepNumText: { color: C.white, fontWeight: 'bold', fontSize: 13 },
  stepTitle:   { fontSize: 14, fontWeight: 'bold', color: C.text },
  stepDesc:    { fontSize: 12, color: C.gray, marginTop: 2 },
  sciText:     { fontSize: 13, color: '#1A237E', lineHeight: 22 },
  startBtn:    { backgroundColor: C.teal, borderRadius: 14, padding: 18, alignItems: 'center', elevation: 5 },
  startBtnText:{ color: C.white, fontSize: 20, fontWeight: 'bold' },
});
