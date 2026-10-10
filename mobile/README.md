# LifeLens Mobile

LifeLens Mobile, kullanıcının kendi fotoğrafı ve sesiyle başlayan İngilizce öğrenme MVP’sidir. iOS, Android ve web aynı Expo / React Native kaynak kodundan çalışır.

Ana proje özeti, rakip karşılaştırması ve AI mimarisi için depo kökündeki [README](../README.md) dosyasına bakın.

## Uygulamadaki güncel deneyim

### Yerel giriş

- Kullanıcı kayıt olur veya daha önce oluşturduğu cihaz içi hesapla giriş yapar.
- Oturum yerelde korunur; ekran değişimlerinde kullanıcı bilgileri yeniden istenmez.
- “Bu cihazdan çıkış yap” seçeneği oturumu kaldırır.

### Keşfet: fotoğrafla başla

- Kamera veya galeriden fotoğraf seçilir.
- Gateway yapılandırılmışsa görsel, iki aşamalı Gemini akışına gider.
- Demo ekranı bir kâğıt bardak için `A paper cup.` tanımını ve üç genişletilmiş İngilizce senaryoyu gösterir.
- Altı çizili kelimeye dokunmak Türkçe karşılığını açar; hızlı çift dokunuş kelimeyi kaynak cümlesiyle birlikte Kelime Kasası’na ekler.

### Stüdyo: kayıt ve ton analizi

- Kullanıcı cihazında ses kaydı başlatıp durdurabilir.
- Hackathon MVP’sinde ilk kayıt aşağıdaki analiz örneğini açar:

  ```text
  I respectfully decline your offer.
  Teklifinizi reddediyorum.
  Resmiyet / Direktlik: yüksek
  Samimiyet / Mizah: düşük
  ```

- İkinci kayıt sıradaki örneği açar:

  ```text
  How y’all doin.
  Nasılız millet.
  Resmiyet / Direktlik: düşük
  Samimiyet: yüksek
  Mizah: orta-düşük
  ```

### Kelime Kasası ve Kelime Quiz’i

- Kullanıcı, kelimeyi Türkçesi ve isteğe bağlı örnek cümlesiyle kendisi ekleyebilir.
- Kaydedilen kelimeler, anlamları ve kaynak cümleleri birlikte görüntülenir.
- Kelime Quiz’i kasadaki kelimeleri karıştırarak çoktan seçmeli anlam soruları üretir; yanlış cevapta doğru karşılığı gösterir.

### Profil

- Kullanıcı adı ve e-posta bilgisi görünür.
- A1–C2 seviyeleri seçilebilir.
- Fotoğraf işleme izni kullanıcı tarafından kapatılabilir.
- “Gemini API Key’i edin” bağlantısı Google AI Studio’ya yönlendirir.

## Kurulum

```bash
npm ci
npm run start
```

Diğer çalışma komutları:

```bash
npm run web
npm run ios
npm run android
npm run export:web
npm run lint
```

## Canlı AI bağlantısı

Mobil uygulama yalnızca gateway URL’sini bilir. Sağlayıcı anahtarı mobilde tutulmaz.

```bash
EXPO_PUBLIC_LIFELENS_API_URL=https://your-lifelens-gateway.example.com
```

Gateway kurulum ve güvenlik ayrıntıları: [AI Gateway README](../ai-gateway/README.md).

Gateway ulaşılmazsa uygulama, fotoğrafta görünmeyen nesneleri iddia etmeyen güvenli bir yerel görev gösterir.

## Kaynak yapısı

```text
App.tsx                              # MVP deneyimi, ekranlar ve uygulama durumu
src/app/                             # Expo Router rotaları
src/services/authRepository.ts       # Cihaz içi kayıt / oturum
src/services/learningRepository*.ts  # Yerel öğrenme verisi
src/services/missionPipeline.ts      # Gateway istemcisi ve güvenli yedek akış
src/domain/types.ts                  # Paylaşılan veri tipleri
```

## Gizlilik

- Yerel hesap, Kelime Kasası ve öğrenme ilerlemesi cihazda tutulur.
- Fotoğraf yalnızca kullanıcı fotoğraf işleme iznini açtığında gönderilir.
- API anahtarı, `.env` ve hassas kullanıcı verileri Git’e eklenmez.
