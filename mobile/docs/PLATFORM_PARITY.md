# LifeLens Platform Parity

## İlke

LifeLens mobil ve web için iki ayrı ürün değil, tek Expo uygulamasıdır. Kullanıcı nereden giriş yaparsa yapsın aynı öğrenme deneyimini görür.

| Alan | Mobil (iOS / Android) | Web | Ortak kaynak |
| --- | --- | --- | --- |
| Ana sayfa ve Mission Studio | Evet | Evet | `App.tsx` |
| Bir Anı Yakala | Kamera / galeri | Kamera / dosya seçici | `expo-image-picker` + `App.tsx` |
| Gemini → Scenario AI | Evet | Evet | `missionPipeline.ts` + `ai-gateway` |
| A1–C2 seviye seçimi | Evet | Evet | alan modelleri + `App.tsx` |
| Ses Stüdyosu, ton analizi, Kelime Kasası | Evet | Evet | `expo-audio` + `App.tsx` |
| Yerel öğrenme özeti | SQLite | browser localStorage | aynı `LearningSnapshot` sözleşmesi |

## Kasıtlı platform farkları

- Mobilde fotoğraf için işletim sistemi kamera/galeri izni istenir; webde tarayıcı izin veya dosya seçicisini kullanır.
- Mobilde hesap, öğrenme özeti ve Kelime Kasası cihaz SQLite’ında; webde yalnızca kullanıcının tarayıcısında tutulur.
- Bunlar içerik farkı değildir: fotoğraf analizi, senaryo üretimi, görev metni, diyalog ve geri bildirim aynı girdilerle aynı pipeline’dan geçer.

## Yayın öncesi kontrol

1. `npx tsc --noEmit` ve `npx expo lint` başarılı olmalı.
2. `npm run export:web` başarılı olmalı.
3. Expo Go / iOS / Android’de; yerel kayıt/giriş, ana sayfa, Ses Stüdyosu, ses analizi, Kelime Kasası, fotoğraf seçimi ve profil ekranları kontrol edilmeli.
4. Webde aynı sekans kontrol edilmeli.
5. Gateway yokken her iki platformda da "yerel güvenli görev" görünmeli; görselde olmayan bir nesne iddia edilmemeli.
6. Gateway tanımlıyken her iki platformda da Gemini Vision → Scenario AI hattı görünmeli.
