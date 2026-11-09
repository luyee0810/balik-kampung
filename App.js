import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar, Platform, Image } from 'react-native';
import GameScreen from './src/GameScreen';
import KampungScreen from './src/KampungScreen';
import Sprite from './src/Sprite';
import { SPRITES } from './src/assets';
import { SCREENS } from './src/art';

// Full-screen painted background (src/art.js SCREENS) with a fallback colour.
function Backdrop({ name, children }) {
  const source = SCREENS[name];
  if (!source) return <View style={[styles.fill, styles.plain]}>{children}</View>;
  return (
    <View style={[styles.fill, styles.plain]}>
      <Image source={source} resizeMode="cover" style={styles.cover} />
      {children}
    </View>
  );
}

export default function App() {
  // On the web, add ?play to the URL to skip the menu (handy while testing).
  const skipMenu = Platform.OS === 'web' && /[?&]play\b/.test(window.location.search);
  // ?kampung jumps straight to the arrival scene with RM120 (handy while testing)
  const toKampung = Platform.OS === 'web' && /[?&]kampung\b/.test(window.location.search);
  const [screen, setScreen] = useState(toKampung ? 'kampung' : skipMenu ? 'play' : 'menu'); // 'menu' | 'play' | 'kampung' | 'result'
  const [result, setResult] = useState(
    toKampung ? { win: true, score: 120, km: 300, hits: 0, collected: { duit: 8, rendang: 1, teh: 1 } } : null
  );
  const [best, setBest] = useState(0);
  const [round, setRound] = useState(0);

  const start = () => {
    setRound((r) => r + 1); // fresh GameScreen each time
    setScreen('play');
  };

  const handleEnd = (r) => {
    setResult(r);
    if (r.score > best) setBest(r.score);
    setScreen(r.win ? 'kampung' : 'result');
  };

  return (
    <View style={styles.fill}>
      <StatusBar hidden />
      {screen === 'menu' && (
        <Backdrop name="menu">
          <View style={styles.page}>
            <View style={styles.header}>
              <View style={styles.iconRow}>
                <Sprite sprite={SPRITES.player} width={56} />
                <Sprite sprite={SPRITES.kampung} width={56} />
              </View>
              <Text style={styles.title}>Balik Kampung</Text>
              <Text style={styles.sub}>KL → Kampung, 300 km. Mak is waiting.</Text>
            </View>
            <View style={styles.footer}>
              <View style={styles.panel}>
                <Text style={styles.line}>👆 Tap left/right or swipe to change lane (← → on keyboard)</Text>
                <Text style={styles.line}>🕳️ 🐄 🚗 🚌 Avoid potholes, lembu, cars, bas, lorry, kapcai</Text>
                <Text style={styles.line}>🧧 🍛 Collect duit raya & rendang</Text>
                <Text style={styles.line}>☕ Teh tarik at R&R = shield</Text>
                <Text style={styles.line}>📯 Hon (H) to make kancil, kapcai & lembu move aside</Text>
                <Text style={styles.line}>📱 Angkat Mak's calls for bonus</Text>
                <Text style={styles.line}>🛣️ 3 peringkat: the closer to Raya, the busier the road</Text>
              </View>
              <Pressable style={styles.btn} onPress={start}>
                <Text style={styles.btnText}>Jom balik!</Text>
              </Pressable>
              {best > 0 && <Text style={styles.best}>Best: RM{best}</Text>}
            </View>
          </View>
        </Backdrop>
      )}

      {screen === 'play' && <GameScreen key={round} onEnd={handleEnd} />}

      {screen === 'kampung' && result && (
        <KampungScreen key={round} result={result} onAgain={start} onMenu={() => setScreen('menu')} />
      )}

      {screen === 'result' && result && (
        <Backdrop name={result.win ? 'win' : 'lose'}>
          <View style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.title}>{result.win ? 'Sampai kampung!' : 'Alamak! Tak sampai...'}</Text>
              <Text style={styles.sub}>
                {result.win
                  ? result.hits === 0
                    ? 'Not even one scratch. Nenek bangga!'
                    : 'Selamat Hari Raya! Car got some scratches though.'
                  : `${result.lastHit} Stuck at ${result.km} km. Mak sad.`}
              </Text>
            </View>
            <View style={styles.footer}>
              <View style={styles.panel}>
                <Text style={styles.line}>Duit raya: RM{result.score}</Text>
                <Text style={styles.line}>
                  🧧 x{result.collected.duit}   🍛 x{result.collected.rendang}   ☕ x{result.collected.teh}
                </Text>
                <Text style={styles.line}>Distance: {result.km} km   ·   Best: RM{best}</Text>
              </View>
              <Pressable style={styles.btn} onPress={start}>
                <Text style={styles.btnText}>{result.win ? 'Balik lagi' : 'Cuba lagi'}</Text>
              </Pressable>
              <Pressable onPress={() => setScreen('menu')}>
                <Text style={styles.link}>Menu</Text>
              </Pressable>
            </View>
          </View>
        </Backdrop>
      )}
    </View>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } };

const styles = StyleSheet.create({
  fill: { flex: 1 },
  plain: { backgroundColor: '#1b4332' },
  cover: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  page: { flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 56 },
  header: { alignItems: 'center', maxWidth: 560 },
  footer: { alignItems: 'center', alignSelf: 'stretch', paddingBottom: 12 },
  iconRow: { flexDirection: 'row', gap: 8 },
  title: { fontSize: 38, fontWeight: '900', color: '#ffd43b', marginTop: 6, textAlign: 'center', ...shadow },
  sub: { fontSize: 17, color: '#fff', marginTop: 6, textAlign: 'center', fontWeight: '700', ...shadow },
  panel: {
    backgroundColor: 'rgba(14,40,28,0.72)', borderRadius: 16, padding: 16,
    alignSelf: 'stretch', maxWidth: 520, marginHorizontal: 'auto',
  },
  line: { color: '#fff', fontSize: 15, marginVertical: 3 },
  btn: { backgroundColor: '#ffd43b', paddingVertical: 14, paddingHorizontal: 44, borderRadius: 30, marginTop: 18 },
  btnText: { fontSize: 20, fontWeight: '900', color: '#1b4332' },
  best: { color: '#fff', marginTop: 12, fontWeight: '700', ...shadow },
  link: { color: '#fff', marginTop: 14, fontSize: 16, textDecorationLine: 'underline', fontWeight: '700', ...shadow },
});
