# LifeLens

![LifeLens amblemi](assets/lifelens_amblem_v2.png)

> **See · Hear · Speak**  
> Gündelik hayatı kişisel İngilizce pratiğine dönüştüren mobil öğrenme MVP’si.

LifeLens, kullanıcının kendi fotoğrafı ve sesiyle başlayan İngilizce çalışma deneyimidir. Bir nesne ya da an yakalanır; bu bağlamdan konuşma senaryoları, kelime açıklamaları ve tekrar çalışmaları üretilir. Amaç, İngilizceyi ezberlenecek içerik olmaktan çıkarıp kullanıcının hayatının parçası hâline getirmektir.

## Neyi amaçlıyoruz?

Klasik dil uygulamalarında kullanıcı çoğunlukla hazır bir ders yolunu takip eder. LifeLens’in çıkış noktası tersidir: öğrenme materyali kullanıcının gördüğü, söylediği ve kaydetmek istediği şeyden doğar.

| Sorun | LifeLens yaklaşımı |
| --- | --- |
| Kelimeler bağlamdan kopuk kalır. | Kelime; Türkçe anlamı ve geçtiği kaynak cümle ile saklanır. |
| Hazır diyaloglar kullanıcının hayatına uzak kalabilir. | Fotoğraftaki görünür bağlamdan, daha geniş günlük yaşam senaryoları hazırlanır. |
| Kullanıcı ne söylediği kadar nasıl söylediğini de geliştirmek ister. | Stüdyo, resmiyet, direktlik, samimiyet ve mizah eksenlerinde okunabilir geri bildirim sunar. |
| Kaydedilen kelimeler pasif bir listede kalır. | Kelime Quiz’i, kullanıcının kendi Kelime Kasası’ndan çoktan seçmeli tekrar üretir. |

## MVP deneyimi

```text
Fotoğraf çek / yükle
        ↓
Görünür bağlam analizi
        ↓
Bir nesneyle ilişkili üç genişletilmiş senaryo
        ↓
Kelime anlamı · kaynak cümle · Kelime Kasası
        ↓
Stüdyo’da sesli pratik ve ton analizi
        ↓
Kelime Quiz’i ile aktif tekrar
```

### Uygulamadaki temel akışlar

- **Yerel hesap:** Kayıt/giriş bilgileri cihazda tutulur. Kullanıcı yalnızca ilk girişte bilgi verir; oturum ekran değişimlerinde korunur.
- **Fotoğrafla öğrenme:** Kamera veya galeriden seçilen görsel güvenli AI Gateway’e gönderilebilir. Demo akışında “A paper cup.” açıklaması ve bardağa bağlı üç senaryo gösterilir.
- **Dokunarak kelime öğrenme:** Altı çizili İngilizce kelimeye dokunulduğunda Türkçesi gösterilir; hızlı çift dokunuşla Kelime Kasası’na cümlesiyle birlikte kaydedilir.
- **Stüdyo:** Cihazda alınan ilk iki kayıt, hackathon demosu için iki farklı İngilizce ifade ve ton analizi ile eşleştirilir:
  - `I respectfully decline your offer.` → “Teklifinizi reddediyorum.”
  - `How y’all doin.` → “Nasılız millet?”
- **Kelime Kasası:** Kullanıcı kendi kelimesini, anlamını ve isteğe bağlı örnek cümlesini ekleyebilir; kayıtlı kelimeleri silebilir.
- **Kelime Quiz’i:** Kasadaki anlamları karıştırarak çoktan seçmeli sorular üretir. Yanlış cevap sonrası doğru karşılık hemen görünür.
- **Profil:** A1–C2 seviye seçimi, fotoğraf işleme izni, cihazdan çıkış ve Google AI Studio API anahtarı edinme bağlantısı içerir.

## Benzer uygulamalar ve LifeLens’in farkı

LifeLens; kişiselleştirme, konuşma pratiği, geri bildirim ve kelime öğrenme gibi kanıtlanmış öğrenme kalıplarından yararlanır. Ayrıştığı yer, bunları kullanıcının kendi görsel ve ses bağlamında tek akışta birleştirmesidir.

| Uygulama / kategori | Ortak yön | LifeLens odağı |
| --- | --- | --- |
| Duolingo | Etkileşimli, kişiselleştirilmiş ve kısa öğrenme oturumları | Hazır ders yoluna ek olarak kullanıcının çektiği fotoğrafı öğrenme başlangıcı yapar. |
| Speak | Konuşma pratiği, yapay zekâ destekli diyalog ve ifade geri bildirimi | Konuşmayı, görsel bağlamdan üretilen senaryolar ve kaynak cümleye bağlı kelime kaydı ile besler. |
| ELSA Speak | Ses ve konuşma pratiğine odaklı öğrenme | Demo katmanında ifadenin tonunu da görünür kılar: resmiyet, direktlik, samimiyet ve mizah. |
| Zann WordUp / kelime uygulamaları | Görsel ve kullanım bağlamıyla kelime öğrenme | Kelimeyi kullanıcının gördüğü veya söylediği özgün cümleden Kelime Kasası’na taşır; ardından kişisel quiz oluşturur. |

Bu karşılaştırma, ürünleri “daha iyi / daha kötü” diye sınıflandırmaz. LifeLens’in değer önerisi, **kişinin dünyasını öğrenme içeriğine dönüştürmesi**dir.

Karşılaştırma kaynakları: [Duolingo Teaching Method](https://blog.duolingo.com/duolingo-teaching-method/), [Speak](https://www.speak.com/), [ELSA Speak](https://elsaspeak.com/en), [Zann WordUp](https://www.wordupapp.co/).

## Yapay zekâ mimarisi

Canlı fotoğraf akışı, sağlayıcı anahtarını mobil uygulamaya koymadan iki aşamalı tasarlanmıştır:

```text
LifeLens Mobile / Web
          │  yalnızca gateway URL’si
          ▼
   LifeLens AI Gateway
          │
          ├─ 1. Gemini Vision
          │     Görünür nesneler, ilişkiler ve belirsizlikler
          │
          └─ 2. Gemini 2.5 Flash-Lite
                Doğrulanmış analizden üç genişletilmiş senaryo
```

- İkinci model ham fotoğrafı değil, ilk aşamanın yapılandırılmış analizini alır.
- Senaryo üretimi tam üç seçenek döndürür; seçilen öneri ve alternatifler uygulamada kullanılabilir.
- Ham fotoğraf dosyaya, loga veya veritabanına yazılmaz.
- Gateway erişilemezse uygulama, görselde olmayan nesneleri uydurmayan güvenli bir yerel yedek akışa döner.
- `GEMINI_API_KEY` yalnızca gateway’in ortam değişkenidir; mobil uygulamaya veya Git’e eklenmez.

## Teknoloji

| Katman | Kullanılan teknoloji |
| --- | --- |
| Mobil ve web istemcisi | Expo, React Native, Expo Router |
| Kamera / galeri | `expo-image-picker` |
| Ses kaydı | `expo-audio` |
| Yerel veri | Mobilde SQLite, webde tarayıcı depolaması |
| AI gateway | Node.js yerleşik HTTP sunucusu |
| Görüntü ve senaryo AI’ı | Gemini Vision + Gemini 2.5 Flash-Lite |

Mobil ve web sürümü aynı kaynak kodundan çalışır; öğrenme akışları, metinler ve veri şeması ortak tutulur.

## Hızlı başlangıç

### 1. Mobil uygulama

```bash
cd mobile
npm ci
npm run start
```

- Tarayıcıda çalıştırmak için: `npm run web`
- iOS simülatörü için: `npm run ios`
- Android için: `npm run android`
- Web çıktısı için: `npm run export:web`

### 2. AI Gateway (isteğe bağlı canlı analiz)

```bash
cd ai-gateway
cp .env.example .env
npm install
npm run dev
```

`ai-gateway/.env` içinde yalnızca sunucuda kalacak `GEMINI_API_KEY` değerini tanımlayın. Ardından mobil tarafta, yalnızca gateway adresini ekleyin:

```bash
EXPO_PUBLIC_LIFELENS_API_URL=https://your-lifelens-gateway.example.com
```

> `EXPO_PUBLIC_LIFELENS_API_URL` gizli anahtar değildir. API anahtarı veya `.env` dosyası hiçbir zaman Git’e eklenmemelidir.

## Doğrulama

```bash
# Mobil kod kalitesi
cd mobile
npm run lint

# Gateway söz dizimi ve 2.000 yerel senaryolu test paketi
cd ../ai-gateway
npm run check
npm run test:2000
```

`test:2000`; gerçek Gemini isteği veya API anahtarı kullanmadan, sentetik görseller ve hata durumlarıyla tam 2.000 yerel HTTP senaryosunu çalıştırır.

## Gizlilik notu

- Hesap, Kelime Kasası ve öğrenme ilerlemesi bu MVP’de cihazda yerel olarak saklanır.
- Fotoğraf gönderimi, profildeki izin anahtarı ile kullanıcı kontrolündedir.
- Canlı analizde görsel yalnızca görev üretimi amacıyla gateway üzerinden işlenir.
- Gerçek kişiler, özel yazılar veya hassas bilgi içeren fotoğraflar demo için yüklenmemelidir.

## Depo yapısı

```text
.
├── mobile/                         # Expo tabanlı iOS, Android ve web uygulaması
├── ai-gateway/                     # Gemini iki aşamalı güvenli AI gateway
├── assets/                          # LifeLens marka varlıkları
├── LifeLens_PDF_Dokumantasyon_Setı/ # Gereksinim, mimari, UI/UX ve rekabet PDF’leri
├── LifeLens_Juri_Sunumu.pptx        # Jüri sunumu
└── LifeLens_Kurumsal_Dokumantasyon_Setı_PDF.zip
```

## Hackathon demosu için 60 saniyelik akış

1. Yerel hesapla giriş yap.
2. **Fotoğrafla başla** ile bir fotoğraf seç.
3. Nesne açıklamasını ve üç genişletilmiş senaryoyu göster.
4. Bir kelimeye dokun, çift dokunuşla Kelime Kasası’na ekle.
5. Stüdyo’da kayıt al ve ton analizini aç.
6. Kelime Quiz’i ile kaydedilen kelimelerden birini tekrar et.

LifeLens’in sorusu şudur: **“Bugün gördüğün şey sana İngilizce ne öğretebilir?”**
