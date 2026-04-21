import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { C, API_BASE, classifyNoise } from '../constants';

// axios 逾時設定：5秒沒回應就放棄
const api = axios.create({ baseURL: API_BASE, timeout: 5000 });

export default function ResultScreen() {
  const [loading, setLoading]   = useState(false);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats]       = useState(null);
  const [userId, setUserId]     = useState('');
  const [error, setError]       = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(id => {
      if (id) { setUserId(id); loadData(id); }
    });
  }, []);

  const loadData = async (id) => {
    setLoading(true);
    setError('');
    try {
      const resR = await api.get(`/results/${id}`).catch(() => null);
      if (resR) setSessions(resR.data.results || []);

      const statR = await api.get(`/stats/${id}`).catch(() => null);
      if (statR) setStats(statR.data);

      if (!resR && !statR) {
        setError('無法連線到後端，請確認後端服務是否開啟');
      }
    } catch (e) {
      setError('發生錯誤：' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const ScatterPlot = ({ data }) => {
    if (!data || data.length < 2) return null;
    const dbs  = data.map(d => d.noise_db);
    const minDb = Math.min(...dbs), maxDb = Math.max(...dbs);
    const W = 280, H = 160;
    return (
      <View style={scatter.container}>
        <Text style={scatter.title}>噪音 dB vs 答對率</Text>
        <View style={{ width: W, height: H, position: 'relative', backgroundColor: '#F8F9FF', borderRadius: 8 }}>
          {data.map((d, i) => {
            const x = maxDb === minDb ? W/2 : ((d.noise_db - minDb) / (maxDb - minDb)) * (W - 30) + 10;
            const y = H - (d.accuracy * (H - 20)) - 10;
            return <View key={i} style={[scatter.dot, { left: x-6, top: y-6, backgroundColor: classifyNoise(d.noise_db).color }]} />;
          })}
          <Text style={[scatter.axisLabel, { bottom: -18, left: 0 }]}>低 dB</Text>
          <Text style={[scatter.axisLabel, { bottom: -18, right: 0 }]}>高 dB</Text>
          <Text style={[scatter.axisLabel, { top: 0, left: -32 }]}>100%</Text>
          <Text style={[scatter.axisLabel, { bottom: 0, left: -30 }]}>0%</Text>
        </View>
        <View style={scatter.legend}>
          {[['安靜',C.green],['中等',C.orange],['吵鬧',C.red]].map(([l,c]) => (
            <View key={l} style={scatter.legendItem}>
              <View style={[scatter.legendDot, { backgroundColor: c }]} />
              <Text style={scatter.legendText}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>我的測試成果</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => userId && loadData(userId)}>
            <Text style={styles.refreshText}>更新</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={C.accent} size="large" />
            <Text style={styles.loadingText}>連線中...</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>
              請確認：{'\n'}
              1. 電腦端的後端（python main.py）是否還在跑{'\n'}
              2. 手機和電腦是否在同一個 WiFi{'\n'}
              3. constants.js 裡的 IP 是否正確（{API_BASE}）
            </Text>
          </View>
        )}

        {!loading && stats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>統計分析結果</Text>
            <View style={styles.statsGrid}>
              <StatBox label="測試次數"   value={`${stats.n_sessions} 次`}   color={C.blue} />
              <StatBox label="安靜平均"   value={stats.mean_quiet ? `${Math.round(stats.mean_quiet*100)}%` : '--'} color={C.green} />
              <StatBox label="吵鬧平均"   value={stats.mean_loud  ? `${Math.round(stats.mean_loud*100)}%`  : '--'} color={C.red} />
              <StatBox label="相關係數 r" value={stats.correlation_r ?? '--'} color={C.teal} />
            </View>
            {stats.p_value !== null && (
              <View style={[styles.sigBox, { borderColor: stats.significant ? C.green : C.orange }]}>
                <Text style={styles.sigTitle}>{stats.significant ? '統計顯著 ✓' : '尚未顯著'}</Text>
                <Text style={styles.sigDetail}>p = {stats.p_value}  ·  t = {stats.t_statistic}  ·  d = {stats.cohen_d}</Text>
                <Text style={styles.sigExplain}>
                  {stats.significant
                    ? '噪音對你的認知表現有顯著影響（p < 0.05）'
                    : '目前資料量不足，請繼續測試'}
                </Text>
              </View>
            )}
            {stats.n_sessions < 10 && (
              <Text style={styles.progressNote}>還需要 {10 - stats.n_sessions} 次測試才能得到完整統計分析</Text>
            )}
          </View>
        )}

        {!loading && sessions.length >= 2 && <ScatterPlot data={sessions} />}

        {!loading && sessions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>測試記錄</Text>
            {sessions.slice(0, 15).map((s) => {
              const info = classifyNoise(s.noise_db);
              return (
                <View key={s.id} style={styles.sessionRow}>
                  <View style={[styles.catBadge, { backgroundColor: info.color }]}>
                    <Text style={styles.catBadgeText}>{info.label}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={styles.sessionAcc}>答對率：{Math.round(s.accuracy*100)}%</Text>
                    <Text style={styles.sessionMeta}>{s.noise_db} dB · {new Date(s.timestamp).toLocaleDateString('zh-TW')}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!loading && sessions.length === 0 && !error && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>還沒有測試記錄{'\n'}去做第一次測試吧！</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={[styles.statBox, { borderColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const scatter = StyleSheet.create({
  container:   { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 16, alignItems:'center', elevation:3 },
  title:       { fontSize: 13, fontWeight:'bold', color: C.text, marginBottom: 14 },
  dot:         { width: 12, height: 12, borderRadius: 6, position:'absolute' },
  axisLabel:   { fontSize: 10, color: C.gray, position:'absolute' },
  legend:      { flexDirection:'row', gap: 16, marginTop: 24 },
  legendItem:  { flexDirection:'row', alignItems:'center', gap: 4 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 11, color: C.gray },
});

const styles = StyleSheet.create({
  scroll:       { padding: 20, paddingBottom: 40 },
  headerRow:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 16 },
  header:       { fontSize: 20, fontWeight:'bold', color: C.text },
  refreshBtn:   { backgroundColor: C.accent, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  refreshText:  { color: C.white, fontSize: 13, fontWeight:'bold' },
  loadingBox:   { alignItems:'center', padding: 30 },
  loadingText:  { color: C.gray, marginTop: 12, fontSize: 13 },
  errorBox:     { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: C.orange },
  errorText:    { fontSize: 14, fontWeight:'bold', color: '#E65100', marginBottom: 8 },
  errorHint:    { fontSize: 12, color: '#BF360C', lineHeight: 22 },
  card:         { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 16, elevation: 3 },
  cardTitle:    { fontSize: 15, fontWeight:'bold', color: C.text, marginBottom: 14 },
  statsGrid:    { flexDirection:'row', flexWrap:'wrap', gap: 10, marginBottom: 14 },
  statBox:      { borderWidth: 2, borderRadius: 10, padding: 12, width: '47%', alignItems:'center' },
  statValue:    { fontSize: 20, fontWeight:'bold' },
  statLabel:    { fontSize: 11, color: C.gray, marginTop: 4 },
  sigBox:       { borderWidth: 2, borderRadius: 10, padding: 14, marginTop: 6 },
  sigTitle:     { fontSize: 15, fontWeight:'bold', color: C.text, marginBottom: 6 },
  sigDetail:    { fontSize: 13, color: C.gray, fontFamily:'monospace' },
  sigExplain:   { fontSize: 13, color: C.text, marginTop: 8, lineHeight: 20 },
  progressNote: { fontSize: 12, color: C.orange, textAlign:'center', marginTop: 10 },
  sessionRow:   { flexDirection:'row', alignItems:'center', marginBottom: 12, gap: 10 },
  catBadge:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 56, alignItems:'center' },
  catBadgeText: { color: C.white, fontSize: 12, fontWeight:'bold' },
  sessionAcc:   { fontSize: 14, fontWeight:'bold', color: C.text },
  sessionMeta:  { fontSize: 11, color: C.gray, marginTop: 2 },
  emptyCard:    { backgroundColor: C.white, borderRadius: 12, padding: 40, alignItems:'center', elevation: 2 },
  emptyText:    { fontSize: 16, color: C.gray, textAlign:'center', lineHeight: 26 },
});
