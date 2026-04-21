export const C = {
  navy:    '#0D1B3E',
  blue:    '#1565C0',
  accent:  '#1E88E5',
  teal:    '#00897B',
  green:   '#43A047',
  orange:  '#FB8C00',
  red:     '#E53935',
  white:   '#FFFFFF',
  offwhite:'#F0F4FF',
  gray:    '#90A4AE',
  card:    '#162447',
  bg:      '#EEF2FF',
  text:    '#0D1B3E',
};

export const API_BASE = 'http://192.168.137.1:8000';

export function classifyNoise(db) {
  if (db < 45) return { cat: 'quiet',    label: '安靜',    color: C.green };
  if (db < 65) return { cat: 'moderate', label: '中等噪音', color: C.orange };
  return             { cat: 'loud',     label: '吵鬧',    color: C.red };
}
