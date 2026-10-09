# LifeLens Mobile — Teknik Mimari

## Amaç

Mobil istemci, bir fotoğrafı veya önceden tanımlı günlük yaşam bağlamını kişiselleştirilmiş konuşma görevine dönüştürür. Uygulama internet ve API anahtarı olmadan sunum yapılabilen deterministik bir demo motoruna sahiptir; gerçek yapay zekâ sağlayıcısı aynı arayüzün arkasına takılabilir.

## Katmanlar

| Katman | Sorumluluk | Konum |
| --- | --- | --- |
| Rotalar | Ekran yaşam döngüsü ve derin bağlantı | src/app |
| Sunum | Mobile UI, görev akışı, etkileşim | App.tsx |
| Alan modeli | Sahne, ifade, öğrenme profili, değerlendirme tipleri | src/domain/types.ts |
| Fotoğraf pipeline'ı | Fotoğrafı gateway'e yollar, canlı/yedek akışı ayırır | src/services/missionPipeline.ts |
| Öğrenme motoru | Demo değerlendirmesi ve üretim sağlayıcısı sözleşmesi | src/services/learningEngine.ts |
| Yerel veri | Öğrenme durumunu yükleme/kaydetme | src/services/learningRepository.ts |

## Öğrenme akışı

1. Kullanıcı kamera, galeri veya hazır bir sahne seçer.
2. Gerçek fotoğrafta uygulama, görseli anahtarsız olarak AI Gateway'e yollar; mobil istemcide model anahtarı bulunmaz.
3. Gateway, **Gemini Vision** ile görünür nesne + kanıt + ilişki + belirsizlik JSON'u üretir.
4. Gateway, fotoğrafı değil bu JSON'u ikinci senaryo modeline ve kullanıcının CEFR/İkiz profil bilgisine aktarır.
5. İkinci model, görsel bağlamdan kopmayan fakat daha geniş günlük yaşam senaryosu, iletişim amacı ve ifade önerisi döndürür.
6. Mission Studio; görünür nesneleri, güven seviyesini, iki modelin rolünü ve belirsizlik notunu gösterir.
7. Kullanıcı yanıtı üç boyutta değerlendirilir: doğruluk, doğallık, tarz uyumu.
8. Görev ve yeni ifade cihazda kalıcı olarak saklanır; ana ekranın ilerleme alanına yansır.

## Gerçek AI adaptasyonu

Üretim ortamında fotoğraf akışı `ai-gateway` üzerinden yapılır:

- Görsel analiz: fotoğraf → Gemini → nesneler, görünür kanıt, ortam, ilişki, belirsizlik ve güven skoru
- Senaryo üretimi: Gemini analizi + CEFR seviyesi + hedef + İkiz profili → ikinci model → genişletilmiş görev
- Değerlendirme: kullanıcı yanıtı + görev + İkiz profili → yapılandırılmış geri bildirim

İstemci, API anahtarı tutmamalıdır. Sunucu; MIME/boyut denetimi, oran sınırlama, içerik güvenliği, maliyet takibi ve doğrulama katmanını üstlenir. Ham medya loglanmaz veya varsayılan olarak saklanmaz. Gateway erişilemezse istemci görseldeki nesneleri uydurmak yerine bunu belirten genel bir görev üretir.

## Kalıcı veri ilkesi

Varsayılan olarak ham fotoğraf veya ses kaydı saklanmaz. Yerel depoda yalnızca kullanıcı tercihi, kaydedilmiş ifade, görev özeti ve ilerleme bilgisi bulunur. Medya işleme tercihi Profil ekranından yönetilir.
