# LifeLens Mobile

LifeLens, kullanıcının kendi çevresindeki fotoğrafları İngilizce konuşma pratiğine dönüştüren mobil MVP'dir.

## Hackathon MVP akışı

1. Kullanıcı kamera, galeri veya önceden hazırlanmış bağlamlardan birini seçer.
2. **Gemini Vision**, görseldeki yalnızca görünür nesneleri, ilişkileri, kanıtları ve belirsizlikleri yapılandırılmış biçimde çıkarır.
3. **Scenario AI**, Gemini analizini (fotoğrafın kendisini değil) kullanarak A2/B1 seviyesine ve İngilizce İkizi profiline uygun, fotoğraftan daha geniş ama bağlama bağlı bir günlük yaşam senaryosu üretir.
4. Kullanıcı metin üzerinden yapay zekâ konuşma partnerine yanıt verir.
5. Geri bildirim; doğruluk, doğallık ve **İngilizce İkizi** ile uyum katmanlarına ayrılır.
6. Kullanıcı kişiselleştirilmiş ifadeyi kitaplığına kaydeder ve ilerlemesi ana ekrana yansır.

## Jüri demosu

Ana ekrandaki **Hackathon Demo Modu**, mikrofon, su şişesi, laptop ve not defterini içeren "Jüri Masası" bağlamını doğrudan açar. Bu akış sırasıyla *Anlama → Görev → Konuşma → Geri bildirim* adımlarını görünür biçimde gösterir. Böylece canlı sunumda gerçek bir fotoğrafa ihtiyaç kalmadan ürünün değer önerisi tekrarlanabilir.

Kamera/galeri seçimi çalışır. `EXPO_PUBLIC_LIFELENS_API_URL` tanımlıysa fotoğraf güvenli AI Gateway'e gönderilir ve iki model sıralı olarak çalışır. Gateway yoksa arayüz, fotoğraftaki nesneleri uydurmayan ve açıkça **yerel güvenli görev** olarak etiketlenen bir yedek akış gösterir. Jüri Masası ise internet gerektirmeyen, hazırlanmış demo bağlamıdır.

## Ürün mimarisi

- **Expo Router:** Ana bölümler dosya tabanlı rotalara ayrılmıştır. Böylece Studio, Kütüphane, İkizim ve Profil ayrı ekranlar olarak büyüyebilir.
- **Kalıcı öğrenme verisi:** Görev geçmişi, ifadeler, seviye, İkiz profili ve gizlilik tercihi cihazda kalır.
- **İki aşamalı AI sınırı:** `missionPipeline`, mobil anahtar taşımadan Gateway'e gider. Gateway önce Gemini Vision ile kanıt temelli analiz yapar, ardından bu JSON'u ikinci senaryo modeline aktarır.
- **Tip güvenliği:** Öğrenme verisi, sahne, değerlendirme ve görev geçmişi merkezi olarak tanımlıdır.

Detaylı teknik harita: [Architecture](docs/ARCHITECTURE.md).

## Mobil + web: tek ürün, tek kaynak

LifeLens için ayrı bir web prototipi korunmaz. `App.tsx`, Expo Router rotaları, görev akışı, ifade kütüphanesi, İngilizce İkizim ve Gemini → Scenario AI pipeline'ı Android, iOS ve web için **aynı kaynak kodundan** derlenir. Böylece bir platformda görülen görev, metin, seviye mantığı ve güvenlik davranışı diğerinde de aynıdır.

Sadece cihazın saklama katmanı platforma göre değişir: mobilde SQLite, webde tarayıcı depolaması kullanılır. Bu teknik fark, içerik veya öğrenme geçmişinin şemasını değiştirmez. Ayrıntılı kontrol listesi: [Platform Parity](docs/PLATFORM_PARITY.md).

## Çalıştırma

```bash
npm install
npm start
```

Ardından Expo Go ile QR kodu okutabilir, `npm run ios` / `npm run android` komutlarını kullanabilir veya `npm run web` ile tarayıcıda açabilirsin. Yayınlanabilir web çıktısı için `npm run export:web` çalıştırılır.

## Kapsam

- Snap & Speak fotoğraf seçme/çekme akışı
- Beş adımlı Mission Studio ve bağlam güveni görünümü
- Canlı Jüri Masası demo senaryosu
- Metin tabanlı diyalog ve üç katmanlı geri bildirim
- Aranabilir, bağlam etiketli ifade kütüphanesi
- Düzenlenebilir İngilizce İkizim ton kontrolleri
- Life Map, ilerleme ve gizlilik tercihleri
- Cihaz yeniden başlatılsa da korunan öğrenme özeti ve son görev kaydı
- Fotoğraf → Gemini görünür bağlamı → ikinci AI ile genişletilmiş senaryo zinciri

## Canlı AI'ı bağlama

`mobile/.env.example` dosyasındaki yalnızca gateway URL'sini yerel ortam değişkenine ekleyin. Gemini ve senaryo modeli anahtarlarını mobil uygulamaya eklemeyin; [AI Gateway](../ai-gateway/README.md) bu anahtarları sunucu tarafında tutar. Google'ın Gemini API'si görseli `generateContent` isteğinde inline veri olarak alabilir; gateway bu çağrıyı kullanıcı cihazı yerine sunucudan yapar. [Gemini API dokümantasyonu](https://ai.google.dev/api/generate-content)
