import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Tab = 'home' | 'library' | 'twin' | 'profile';
type Chat = { id: string; sender: 'coach' | 'user'; text: string };

const C = {
  navy: '#0B2D46', teal: '#1E8C83', amber: '#F2A83B', coral: '#E36B4F',
  mist: '#F4F8F8', ink: '#17242E', slate: '#53616D', white: '#FFFFFF', line: '#DCE7E7',
};

const phrases = [
  ['Could I get some hot water?', 'Sıcak su alabilir miyim?'],
  ['Is there a plug near the table?', 'Masanın yakınında priz var mı?'],
  ['My coffee is getting cold.', 'Kahvem soğuyor.'],
] as const;

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([phrases[0][0]]);
  const [draft, setDraft] = useState('');
  const [chat, setChat] = useState<Chat[]>([
    { id: 'welcome', sender: 'coach', text: 'Welcome to the café. What would you like to ask for?' },
  ]);

  const takeOrPick = async (source: 'camera' | 'library') => {
    setCaptureOpen(false);
    const access = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!access.granted) {
      Alert.alert(
        'İzin gerekli',
        source === 'camera'
          ? 'Kamerayı kullanabilmek için izin gerekiyor. Galeriden görsel seçerek devam edebilirsin.'
          : 'Galeriden seçmek için medya izni gerekiyor. Kamera seçeneğini deneyebilirsin.',
      );
      return;
    }
    const response = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.72 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.72 });
    if (response.canceled || !response.assets[0]) return;
    setImageUri(response.assets[0].uri);
    setAnalysing(true);
    setScenarioOpen(false);
    setTimeout(() => {
      setAnalysing(false);
      setScenarioOpen(true);
    }, 1200);
  };

  const openTextScenario = () => {
    setCaptureOpen(false);
    setImageUri(null);
    setScenarioOpen(true);
  };

  const toggleSaved = (phrase: string) => {
    setSaved((items) => items.includes(phrase) ? items.filter((item) => item !== phrase) : [...items, phrase]);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const id = `${Date.now()}`;
    setChat((items) => [
      ...items,
      { id: `${id}-user`, sender: 'user', text },
      { id: `${id}-coach`, sender: 'coach', text: "Nice request. Add 'please' at the end to make it warmer." },
    ]);
    setDraft('');
  };

  return (
    <SafeAreaView style={s.safe}><StatusBar style="dark" />
      <View style={s.app}>
        {scenarioOpen ? (
          <Scenario
            imageUri={imageUri}
            chat={chat}
            draft={draft}
            saved={saved}
            onBack={() => setScenarioOpen(false)}
            onDraft={setDraft}
            onSend={send}
            onToggle={toggleSaved}
          />
        ) : (
          <>
            {tab === 'home' && <Home imageUri={imageUri} analysing={analysing} savedCount={saved.length} onCapture={() => setCaptureOpen(true)} onContinue={() => setScenarioOpen(true)} onText={openTextScenario} />}
            {tab === 'library' && <Library saved={saved} onToggle={toggleSaved} />}
            {tab === 'twin' && <Twin />}
            {tab === 'profile' && <Profile />}
            <Navigation tab={tab} onChange={setTab} />
          </>
        )}
      </View>
      <Modal transparent animationType="slide" visible={captureOpen} onRequestClose={() => setCaptureOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setCaptureOpen(false)}>
          <Pressable style={s.sheet} onPress={() => undefined}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Bugün ne görüyorsun?</Text>
            <Text style={s.sheetCopy}>Bir nesne veya ortam seç; LifeLens onu konuşma pratiğine dönüştürsün.</Text>
            <CaptureOption icon="◉" title="Kamerayı aç" description="Şu an çevrende olanı çek" onPress={() => takeOrPick('camera')} />
            <CaptureOption icon="▣" title="Galeriden seç" description="Daha önce çektiğin bir görseli kullan" onPress={() => takeOrPick('library')} />
            <CaptureOption icon="✦" title="Görselsiz devam et" description="Kısa bir metin senaryosu başlat" onPress={openTextScenario} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Home({ imageUri, analysing, savedCount, onCapture, onContinue, onText }: { imageUri: string | null; analysing: boolean; savedCount: number; onCapture: () => void; onContinue: () => void; onText: () => void }) {
  return <ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}>
    <View style={s.topbar}><View style={s.brand}><Image source={require('./assets/lifelens-logo.png')} style={s.logo} /><View><Text style={s.brandName}>LifeLens</Text><Text style={s.brandSub}>Çevrenden öğren</Text></View></View><View style={s.level}><Text style={s.levelText}>B1</Text></View></View>
    <View style={s.greeting}><View><Text style={s.eyebrow}>GÜNAYDIN, ALEX</Text><Text style={s.title}>Bugün hayatın{`\n`}ne söylüyor?</Text></View><Text style={s.sun}>☀︎</Text></View>
    <View style={s.streak}><View style={s.spark}><Text style={s.sparkText}>↗</Text></View><View style={s.grow}><Text style={s.streakTitle}>{savedCount + 3} gün pratik serisi</Text><Text style={s.streakCopy}>Küçük bir anı İngilizceye çevir.</Text></View><Text style={s.flame}>✦</Text></View>
    <Section title="Snap & Speak" note="Gerçek dünyadan pratik" />
    <Pressable style={s.captureCard} onPress={onCapture}><View style={s.glowOne} /><View style={s.glowTwo} /><View style={s.cameraIcon}><Text style={s.cameraIconText}>⌾</Text></View><Text style={s.captureTitle}>Bir anı yakala</Text><Text style={s.captureCopy}>Masandaki, mutfağındaki veya çevrendeki herhangi bir şeyden başlayalım.</Text><View style={s.captureButton}><Text style={s.captureButtonText}>Fotoğraf seç</Text><Text style={s.buttonArrow}>→</Text></View></Pressable>
    {analysing && <View style={s.analysis}><ActivityIndicator color={C.teal} /><View style={s.grow}><Text style={s.analysisTitle}>Görselin bağlamını inceliyorum</Text><Text style={s.analysisCopy}>Nesneleri, ortamı ve konuşma hedefini buluyorum.</Text></View></View>}
    {imageUri && !analysing && <Pressable style={s.continueCard} onPress={onContinue}><Image source={{ uri: imageUri }} style={s.thumb} /><View style={s.grow}><Text style={s.continueEyebrow}>HAZIR SENARYO</Text><Text style={s.continueTitle}>Kafede küçük bir çözüm bul</Text><Text style={s.continueCopy}>Sıcak su ve priz isteme pratiği</Text></View><Text style={s.chevron}>›</Text></Pressable>}
    <Section title="Bugünün ritmi" note="Kısa ve uygulanabilir" />
    <View style={s.miniGrid}><MiniCard accent="#DFF4F0" number="3" text="öğrenilen\nifade" /><MiniCard accent="#FFF0E9" number="7 dk" text="bu haftaki\npratik" /><Pressable style={[s.mini, { backgroundColor: C.navy }]} onPress={onText}><Text style={s.miniSymbol}>✦</Text><Text style={[s.miniText, { color: C.white }]}>Hızlı{`\n`}senaryo</Text></Pressable></View>
  </ScrollView>;
}

function Scenario({ imageUri, chat, draft, saved, onBack, onDraft, onSend, onToggle }: { imageUri: string | null; chat: Chat[]; draft: string; saved: string[]; onBack: () => void; onDraft: (value: string) => void; onSend: () => void; onToggle: (phrase: string) => void }) {
  return <View style={s.scenarioRoot}>
    <View style={s.scenarioHeader}><Pressable style={s.back} onPress={onBack}><Text style={s.backText}>‹</Text></Pressable><View style={s.grow}><Text style={s.scenarioEyebrow}>SNAP & SPEAK · B1</Text><Text style={s.scenarioTitle}>Kafede küçük bir çözüm</Text></View><View style={s.timer}><Text style={s.timerText}>06:30</Text></View></View>
    <ScrollView contentContainerStyle={s.scenarioScroll} showsVerticalScrollIndicator={false}>
      <View style={s.scene}>{imageUri ? <Image source={{ uri: imageUri }} style={s.sceneImage} /> : <View style={s.scenePlaceholder}><Text style={s.placeholderCoffee}>☕</Text><Text style={s.placeholderText}>Kafe senaryosu</Text></View>}<View style={s.sceneShade} /><View style={s.sceneBadge}><Text style={s.sceneBadgeText}>GÖRSEL BAĞLAMI</Text></View><View style={s.sceneCaption}><Text style={s.sceneCaptionTitle}>Kahve · Laptop · Şarj</Text><Text style={s.sceneCaptionCopy}>Kısa, gerçekçi ve sana göre</Text></View></View>
      <View style={s.goal}><View style={s.goalIcon}><Text style={s.goalIconText}>◎</Text></View><View style={s.grow}><Text style={s.goalEyebrow}>GÖREVİN</Text><Text style={s.goalText}>Baristadan sıcak su ve yakındaki bir priz iste.</Text></View></View>
      <View style={s.phraseHeading}><Text style={s.sectionTitle}>İşine yarayacak ifadeler</Text><Text style={s.phraseNote}>Senin tonunda</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.phraseList}>{phrases.map(([en, tr]) => <Pressable key={en} style={s.phrase} onPress={() => onToggle(en)}><View style={s.phrasePlus}><Text style={[s.phrasePlusText, saved.includes(en) && { color: C.coral }]}>{saved.includes(en) ? '✓' : '+'}</Text></View><Text style={s.phraseEn}>{en}</Text><Text style={s.phraseTr}>{tr}</Text></Pressable>)}</ScrollView>
      <View style={s.dialogue}><View style={s.dialogueHeader}><View><Text style={s.dialogueEyebrow}>CANLI DİYALOG</Text><Text style={s.dialogueTitle}>Mina · Barista</Text></View><View style={s.ready}><View style={s.readyDot} /><Text style={s.readyText}>Hazır</Text></View></View>{chat.map((message) => <Bubble key={message.id} message={message} />)}</View>
    </ScrollView>
    <View style={s.composerArea}><View style={s.tip}><Text style={s.tipStar}>✦</Text><Text style={s.tipText}>İpucu: nazikçe istemek için “Could I…” ile başla.</Text></View><View style={s.composer}><TextInput value={draft} onChangeText={onDraft} onSubmitEditing={onSend} style={s.input} placeholder="İngilizce yanıtını yaz..." placeholderTextColor="#82909A" returnKeyType="send" /><Pressable style={s.send} onPress={onSend}><Text style={s.sendText}>↑</Text></Pressable></View></View>
  </View>;
}

function Bubble({ message }: { message: Chat }) {
  const coach = message.sender === 'coach';
  return <View style={[s.chatRow, !coach && s.chatRight]}>{coach && <View style={s.avatar}><Text style={s.avatarText}>M</Text></View>}<View style={[s.bubble, coach ? s.coachBubble : s.userBubble]}><Text style={[s.bubbleText, !coach && { color: C.white }]}>{message.text}</Text></View></View>;
}

function Library({ saved, onToggle }: { saved: string[]; onToggle: (phrase: string) => void }) {
  const entries = phrases.filter(([en]) => saved.includes(en));
  return <ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}><Header eyebrow="KENDİ İNGİLİZCEN" title={'İfadelerin\nseninle kalsın.'} /><View style={s.statGrid}><Stat number={`${entries.length}`} label="kaydedilen" color={C.teal} /><Stat number="2" label="kullanılan" color={C.coral} /><Stat number="B1" label="seviye" color={C.amber} /></View><Text style={s.sectionTitle}>Kaydettiklerin</Text>{entries.length ? entries.map(([en, tr]) => <Pressable style={s.libraryItem} key={en} onPress={() => onToggle(en)}><View style={s.libraryIcon}><Text>✦</Text></View><View style={s.grow}><Text style={s.libraryEn}>{en}</Text><Text style={s.libraryTr}>{tr}</Text></View><Text style={s.remove}>Kaldır</Text></Pressable>) : <View style={s.empty}><Text style={s.emptyIcon}>⌾</Text><Text style={s.emptyTitle}>Henüz kaydedilmiş ifade yok.</Text><Text style={s.emptyCopy}>Senaryo ekranındaki + düğmesiyle sana uyan ifadeleri saklayabilirsin.</Text></View>}</ScrollView>;
}

function Twin() {
  return <ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}><Header eyebrow="İNGİLİZCE İKİZİN" title={'İngilizce konuşurken\nkendin gibi ol.'} /><View style={s.twinHero}><Text style={s.twinIcon}>◌</Text><Text style={s.twinTitle}>Tarzın: kısa, samimi, net</Text><Text style={s.twinCopy}>Türkçe anlatımındaki doğrudan ve hafif esprili tonu, İngilizce önerilere yansıtıyoruz.</Text></View><Text style={s.sectionTitle}>Aynı anlam, senin tonun</Text><View style={s.compare}><Text style={s.compareLabel}>RESMÎ VE UZAK</Text><Text style={s.compareMuted}>I respectfully decline your offer.</Text><View style={s.divider} /><Text style={s.compareActiveLabel}>SANA UYGUN</Text><Text style={s.compareActive}>I’d pass on that, thanks.</Text><Text style={s.compareNote}>Kısa, saygılı ve doğal.</Text></View><Pressable style={s.primary}><Text style={s.primaryText}>Tarzımı düzenle</Text><Text style={s.primaryArrow}>→</Text></Pressable></ScrollView>;
}

function Profile() {
  return <ScrollView contentContainerStyle={s.screen} showsVerticalScrollIndicator={false}><View style={s.profileHero}><View style={s.profileAvatar}><Text style={s.profileAvatarText}>A</Text></View><View><Text style={s.eyebrow}>PROFİL</Text><Text style={s.profileName}>Alexandra</Text><Text style={s.profileMeta}>Türkçe → İngilizce · B1</Text></View></View><View style={s.progress}><View><Text style={s.progressLabel}>Bu haftaki pratik</Text><Text style={s.progressValue}>7 / 10 dk</Text></View><View style={s.ring}><Text style={s.ringText}>70%</Text></View></View><Text style={s.sectionTitle}>Öğrenme ayarları</Text><Setting icon="◎" title="İngilizce seviyesi" value="B1 · Orta" /><Setting icon="◌" title="Öğrenme hedefi" value="Günlük konuşma" /><Setting icon="◉" title="Medya saklama" value="Geçici işleme" /><Setting icon="↗" title="Verilerim" value="İndir veya sil" /></ScrollView>;
}

function Header({ eyebrow, title }: { eyebrow: string; title: string }) { return <View style={s.simpleHeader}><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.title}>{title}</Text></View>; }
function Section({ title, note }: { title: string; note: string }) { return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text><Text style={s.sectionNote}>{note}</Text></View>; }
function MiniCard({ accent, number, text }: { accent: string; number: string; text: string }) { return <View style={[s.mini, { backgroundColor: accent }]}><Text style={s.miniNumber}>{number}</Text><Text style={s.miniText}>{text}</Text></View>; }
function CaptureOption({ icon, title, description, onPress }: { icon: string; title: string; description: string; onPress: () => void }) { return <Pressable style={s.option} onPress={onPress}><View style={s.optionIcon}><Text style={s.optionIconText}>{icon}</Text></View><View style={s.grow}><Text style={s.optionTitle}>{title}</Text><Text style={s.optionCopy}>{description}</Text></View><Text style={s.optionArrow}>›</Text></Pressable>; }
function Stat({ number, label, color }: { number: string; label: string; color: string }) { return <View style={s.stat}><Text style={[s.statNumber, { color }]}>{number}</Text><Text style={s.statLabel}>{label}</Text></View>; }
function Setting({ icon, title, value }: { icon: string; title: string; value: string }) { return <Pressable style={s.setting}><View style={s.settingIcon}><Text style={s.settingIconText}>{icon}</Text></View><View style={s.grow}><Text style={s.settingTitle}>{title}</Text><Text style={s.settingValue}>{value}</Text></View><Text style={s.settingArrow}>›</Text></Pressable>; }
function Navigation({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) { const items: [Tab, string, string][] = [['home', '⌂', 'Keşfet'], ['library', '◫', 'İfadelerim'], ['twin', '◌', 'İngilizce ikizim'], ['profile', '◉', 'Profil']]; return <View style={s.nav}>{items.map(([id, icon, label]) => <Pressable key={id} style={s.navItem} onPress={() => onChange(id)}><Text style={[s.navIcon, tab === id && { color: C.teal }]}>{icon}</Text><Text style={[s.navLabel, tab === id && { color: C.teal }]}>{label}</Text></Pressable>)}</View>; }

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.white }, app: { flex: 1, backgroundColor: C.white }, grow: { flex: 1 },
  screen: { gap: 18, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 116 }, topbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, brand: { alignItems: 'center', flexDirection: 'row', gap: 9 }, logo: { height: 39, resizeMode: 'contain', width: 48 }, brandName: { color: C.navy, fontSize: 18, fontWeight: '800' }, brandSub: { color: C.slate, fontSize: 11, fontWeight: '600' }, level: { backgroundColor: '#E8F4F2', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 }, levelText: { color: C.teal, fontSize: 12, fontWeight: '800' },
  greeting: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginTop: 13 }, eyebrow: { color: C.teal, fontSize: 11, fontWeight: '800', letterSpacing: 1.05 }, title: { color: C.ink, fontSize: 29, fontWeight: '800', letterSpacing: -0.7, lineHeight: 34, marginTop: 7 }, sun: { color: C.amber, fontSize: 33, marginTop: 5 },
  streak: { alignItems: 'center', backgroundColor: C.navy, borderRadius: 20, flexDirection: 'row', gap: 12, padding: 16 }, spark: { alignItems: 'center', backgroundColor: '#1D4D70', borderRadius: 15, height: 40, justifyContent: 'center', width: 40 }, sparkText: { color: C.amber, fontSize: 23, fontWeight: '800' }, streakTitle: { color: C.white, fontSize: 15, fontWeight: '800' }, streakCopy: { color: '#C9D8E2', fontSize: 12, marginTop: 3 }, flame: { color: C.amber, fontSize: 22 },
  section: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }, sectionTitle: { color: C.ink, fontSize: 17, fontWeight: '800' }, sectionNote: { color: C.slate, fontSize: 11 },
  captureCard: { backgroundColor: '#DDF3EF', borderRadius: 26, minHeight: 247, overflow: 'hidden', padding: 23 }, glowOne: { backgroundColor: '#C2E8E3', borderRadius: 130, height: 200, position: 'absolute', right: -67, top: -90, width: 200 }, glowTwo: { backgroundColor: '#F9DCA6', borderRadius: 80, bottom: -59, height: 153, position: 'absolute', right: 22, width: 153 }, cameraIcon: { alignItems: 'center', backgroundColor: C.white, borderRadius: 17, height: 51, justifyContent: 'center', width: 51 }, cameraIconText: { color: C.teal, fontSize: 31, fontWeight: '700' }, captureTitle: { color: C.navy, fontSize: 24, fontWeight: '800', marginTop: 18 }, captureCopy: { color: '#346169', fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: '84%' }, captureButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.teal, borderRadius: 13, flexDirection: 'row', gap: 12, marginTop: 18, paddingHorizontal: 15, paddingVertical: 11 }, captureButtonText: { color: C.white, fontSize: 13, fontWeight: '800' }, buttonArrow: { color: C.white, fontSize: 16, fontWeight: '800' },
  analysis: { alignItems: 'center', backgroundColor: C.mist, borderColor: C.line, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 }, analysisTitle: { color: C.navy, fontSize: 13, fontWeight: '800' }, analysisCopy: { color: C.slate, fontSize: 11, marginTop: 3 }, continueCard: { alignItems: 'center', backgroundColor: C.white, borderColor: C.line, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 9 }, thumb: { backgroundColor: '#E6E6E6', borderRadius: 12, height: 58, width: 58 }, continueEyebrow: { color: C.teal, fontSize: 9, fontWeight: '800', letterSpacing: 0.75 }, continueTitle: { color: C.ink, fontSize: 14, fontWeight: '800', marginTop: 2 }, continueCopy: { color: C.slate, fontSize: 11, marginTop: 2 }, chevron: { color: C.navy, fontSize: 28 },
  miniGrid: { flexDirection: 'row', gap: 10 }, mini: { borderRadius: 18, flex: 1, minHeight: 112, padding: 14 }, miniNumber: { color: C.navy, fontSize: 20, fontWeight: '800' }, miniSymbol: { color: C.amber, fontSize: 20 }, miniText: { color: C.slate, fontSize: 11, fontWeight: '700', lineHeight: 15, marginTop: 7 },
  nav: { backgroundColor: C.white, borderTopColor: '#E9EEEE', borderTopWidth: 1, bottom: 0, flexDirection: 'row', left: 0, paddingBottom: Platform.select({ ios: 10, default: 7 }), paddingHorizontal: 8, paddingTop: 9, position: 'absolute', right: 0 }, navItem: { alignItems: 'center', flex: 1, gap: 3 }, navIcon: { color: '#8C9AA3', fontSize: 20 }, navLabel: { color: '#8C9AA3', fontSize: 9, fontWeight: '700' },
  backdrop: { backgroundColor: 'rgba(11, 45, 70, 0.42)', flex: 1, justifyContent: 'flex-end' }, sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 }, handle: { alignSelf: 'center', backgroundColor: '#CED8D8', borderRadius: 8, height: 5, marginBottom: 18, width: 45 }, sheetTitle: { color: C.ink, fontSize: 22, fontWeight: '800' }, sheetCopy: { color: C.slate, fontSize: 13, lineHeight: 19, marginBottom: 19, marginTop: 5 }, option: { alignItems: 'center', borderBottomColor: '#EDF2F1', borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 15 }, optionIcon: { alignItems: 'center', backgroundColor: C.mist, borderRadius: 13, height: 42, justifyContent: 'center', width: 42 }, optionIconText: { color: C.teal, fontSize: 21, fontWeight: '700' }, optionTitle: { color: C.ink, fontSize: 15, fontWeight: '800' }, optionCopy: { color: C.slate, fontSize: 11, marginTop: 3 }, optionArrow: { color: C.navy, fontSize: 25 },
  scenarioRoot: { backgroundColor: C.mist, flex: 1 }, scenarioHeader: { alignItems: 'center', backgroundColor: C.white, flexDirection: 'row', gap: 11, padding: 15 }, back: { alignItems: 'center', backgroundColor: C.mist, borderRadius: 99, height: 34, justifyContent: 'center', width: 34 }, backText: { color: C.navy, fontSize: 28, lineHeight: 29 }, scenarioEyebrow: { color: C.teal, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 }, scenarioTitle: { color: C.ink, fontSize: 14, fontWeight: '800', marginTop: 2 }, timer: { backgroundColor: '#FFF3D9', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 }, timerText: { color: '#A66D0F', fontSize: 11, fontWeight: '800' }, scenarioScroll: { gap: 16, padding: 16, paddingBottom: 132 },
  scene: { backgroundColor: C.navy, borderRadius: 22, height: 203, overflow: 'hidden' }, sceneImage: { height: '100%', width: '100%' }, scenePlaceholder: { alignItems: 'center', backgroundColor: '#234C65', flex: 1, justifyContent: 'center' }, placeholderCoffee: { fontSize: 50 }, placeholderText: { color: C.white, fontSize: 15, fontWeight: '800', marginTop: 4 }, sceneShade: { backgroundColor: 'rgba(8, 32, 48, 0.43)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }, sceneBadge: { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 8, left: 13, paddingHorizontal: 8, paddingVertical: 5, position: 'absolute', top: 13 }, sceneBadgeText: { color: C.navy, fontSize: 9, fontWeight: '800', letterSpacing: 0.65 }, sceneCaption: { bottom: 16, left: 16, position: 'absolute' }, sceneCaptionTitle: { color: C.white, fontSize: 18, fontWeight: '800' }, sceneCaptionCopy: { color: '#E8F2F2', fontSize: 12, marginTop: 2 },
  goal: { alignItems: 'center', backgroundColor: C.white, borderRadius: 16, flexDirection: 'row', gap: 12, padding: 15 }, goalIcon: { alignItems: 'center', backgroundColor: '#FFF3D9', borderRadius: 13, height: 42, justifyContent: 'center', width: 42 }, goalIconText: { color: C.amber, fontSize: 21, fontWeight: '800' }, goalEyebrow: { color: C.coral, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 }, goalText: { color: C.ink, fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: 3 }, phraseHeading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' }, phraseNote: { color: C.teal, fontSize: 11, fontWeight: '700' }, phraseList: { gap: 10, paddingRight: 16 }, phrase: { backgroundColor: C.white, borderColor: C.line, borderRadius: 15, borderWidth: 1, minHeight: 112, padding: 13, width: 193 }, phrasePlus: { alignItems: 'center', backgroundColor: C.mist, borderRadius: 9, height: 22, justifyContent: 'center', position: 'absolute', right: 10, top: 10, width: 22 }, phrasePlusText: { color: C.teal, fontSize: 16, fontWeight: '800' }, phraseEn: { color: C.ink, fontSize: 14, fontWeight: '800', lineHeight: 19, marginRight: 18, marginTop: 26 }, phraseTr: { color: C.slate, fontSize: 11, lineHeight: 15, marginTop: 5 },
  dialogue: { backgroundColor: C.white, borderRadius: 18, gap: 13, padding: 15 }, dialogueHeader: { alignItems: 'center', borderBottomColor: '#EDF1F2', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12 }, dialogueEyebrow: { color: C.teal, fontSize: 9, fontWeight: '800', letterSpacing: 0.75 }, dialogueTitle: { color: C.ink, fontSize: 15, fontWeight: '800', marginTop: 3 }, ready: { alignItems: 'center', backgroundColor: '#E7F5F0', borderRadius: 99, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 5 }, readyDot: { backgroundColor: C.teal, borderRadius: 99, height: 6, width: 6 }, readyText: { color: C.teal, fontSize: 10, fontWeight: '800' }, chatRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 }, chatRight: { justifyContent: 'flex-end' }, avatar: { alignItems: 'center', backgroundColor: C.coral, borderRadius: 99, height: 26, justifyContent: 'center', width: 26 }, avatarText: { color: C.white, fontSize: 11, fontWeight: '800' }, bubble: { borderRadius: 14, maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 10 }, coachBubble: { backgroundColor: C.mist, borderBottomLeftRadius: 3 }, userBubble: { backgroundColor: C.teal, borderBottomRightRadius: 3 }, bubbleText: { color: C.ink, fontSize: 13, lineHeight: 18 },
  composerArea: { backgroundColor: C.white, borderTopColor: '#E5ECEB', borderTopWidth: 1, bottom: 0, left: 0, padding: 13, position: 'absolute', right: 0 }, tip: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 9 }, tipStar: { color: C.amber, fontSize: 13 }, tipText: { color: C.slate, flex: 1, fontSize: 10, lineHeight: 14 }, composer: { alignItems: 'center', backgroundColor: C.mist, borderRadius: 16, flexDirection: 'row', paddingLeft: 14, paddingRight: 5, paddingVertical: 5 }, input: { color: C.ink, flex: 1, fontSize: 13, minHeight: 34 }, send: { alignItems: 'center', backgroundColor: C.teal, borderRadius: 12, height: 35, justifyContent: 'center', width: 35 }, sendText: { color: C.white, fontSize: 21, fontWeight: '800' },
  simpleHeader: { marginTop: 12 }, statGrid: { flexDirection: 'row', gap: 10 }, stat: { backgroundColor: C.mist, borderRadius: 16, flex: 1, minHeight: 83, padding: 13 }, statNumber: { fontSize: 21, fontWeight: '800' }, statLabel: { color: C.slate, fontSize: 11, fontWeight: '600', marginTop: 4 }, libraryItem: { alignItems: 'center', backgroundColor: C.white, borderBottomColor: C.line, borderBottomWidth: 1, flexDirection: 'row', gap: 11, paddingVertical: 15 }, libraryIcon: { alignItems: 'center', backgroundColor: '#FFF3D9', borderRadius: 11, height: 37, justifyContent: 'center', width: 37 }, libraryEn: { color: C.ink, fontSize: 14, fontWeight: '800' }, libraryTr: { color: C.slate, fontSize: 11, marginTop: 3 }, remove: { color: C.coral, fontSize: 11, fontWeight: '700' }, empty: { alignItems: 'center', backgroundColor: C.mist, borderRadius: 19, marginTop: 4, padding: 26 }, emptyIcon: { color: C.teal, fontSize: 30 }, emptyTitle: { color: C.ink, fontSize: 14, fontWeight: '800', marginTop: 7 }, emptyCopy: { color: C.slate, fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: 'center' },
  twinHero: { backgroundColor: '#E7F5F0', borderRadius: 22, padding: 20 }, twinIcon: { color: C.teal, fontSize: 36 }, twinTitle: { color: C.navy, fontSize: 20, fontWeight: '800', marginTop: 10 }, twinCopy: { color: '#42686D', fontSize: 13, lineHeight: 19, marginTop: 7 }, compare: { backgroundColor: C.white, borderColor: C.line, borderRadius: 18, borderWidth: 1, padding: 17 }, compareLabel: { color: '#93A0A7', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }, compareMuted: { color: C.slate, fontSize: 14, lineHeight: 20, marginTop: 5 }, divider: { backgroundColor: C.line, height: 1, marginVertical: 15 }, compareActiveLabel: { color: C.teal, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }, compareActive: { color: C.ink, fontSize: 17, fontWeight: '800', marginTop: 5 }, compareNote: { color: C.slate, fontSize: 12, marginTop: 5 }, primary: { alignItems: 'center', backgroundColor: C.navy, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 17, paddingVertical: 16 }, primaryText: { color: C.white, fontSize: 14, fontWeight: '800' }, primaryArrow: { color: C.amber, fontSize: 18, fontWeight: '800' },
  profileHero: { alignItems: 'center', flexDirection: 'row', gap: 15, marginTop: 12 }, profileAvatar: { alignItems: 'center', backgroundColor: C.coral, borderRadius: 99, height: 62, justifyContent: 'center', width: 62 }, profileAvatarText: { color: C.white, fontSize: 24, fontWeight: '800' }, profileName: { color: C.ink, fontSize: 23, fontWeight: '800', marginTop: 2 }, profileMeta: { color: C.slate, fontSize: 12, marginTop: 3 }, progress: { alignItems: 'center', backgroundColor: C.navy, borderRadius: 21, flexDirection: 'row', justifyContent: 'space-between', padding: 19 }, progressLabel: { color: '#C7D7E0', fontSize: 12 }, progressValue: { color: C.white, fontSize: 22, fontWeight: '800', marginTop: 4 }, ring: { alignItems: 'center', borderColor: C.amber, borderRadius: 99, borderWidth: 4, height: 55, justifyContent: 'center', width: 55 }, ringText: { color: C.white, fontSize: 11, fontWeight: '800' }, setting: { alignItems: 'center', backgroundColor: C.white, borderBottomColor: C.line, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 15 }, settingIcon: { alignItems: 'center', backgroundColor: C.mist, borderRadius: 11, height: 39, justifyContent: 'center', width: 39 }, settingIconText: { color: C.teal, fontSize: 18, fontWeight: '700' }, settingTitle: { color: C.ink, fontSize: 14, fontWeight: '800' }, settingValue: { color: C.slate, fontSize: 11, marginTop: 3 }, settingArrow: { color: C.slate, fontSize: 25 },
});
