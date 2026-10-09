# LifeLens Mobile — Teknik Mimari

## Amaç

Mobil istemci, bir fotoğrafı veya önceden tanımlı günlük yaşam bağlamını kişiselleştirilmiş konuşma görevine dönüştürür. Uygulama internet ve API anahtarı olmadan sunum yapılabilen deterministik bir demo motoruna sahiptir; gerçek yapay zekâ sağlayıcısı aynı arayüzün arkasına takılabilir.

## Katmanlar

| Katman | Sorumluluk | Konum |
| --- | --- | --- |
| Rotalar | Ekran yaşam döngüsü ve derin bağlantı | src/app |
| Sunum | Mobile UI, görev akışı, etkileşim | App.tsx |
| Alan modeli | Sahne, ifade, öğrenme profili, değerlendirme tipleri | src/domain/types.ts |
| Öğrenme motoru | Demo değerlendirmesi ve üretim sağlayıcısı sözleşmesi | src/services/learningEngine.ts |
| Yerel veri | Öğrenme durumunu yükleme/kaydetme | src/services/learningRepository.ts |

## Öğrenme akışı

1. Kullanıcı kamera, galeri veya hazır bir sahne seçer.
2. Mission Studio; görünür nesneleri, güven seviyesini ve bağlamı gösterir.
3. Uygulama seviyeye uygun iletişim amacını ve ifade önerisini sunar.
4. Kullanıcı yanıtı üç boyutta değerlendirilir: doğruluk, doğallık, tarz uyumu.
5. Görev ve yeni ifade cihazda kalıcı olarak saklanır; ana ekranın ilerleme alanına yansır.

## Gerçek AI adaptasyonu

Üretim ortamında aşağıdaki istekler backend üzerinden yapılmalıdır:

- Görsel analiz: fotoğraf → nesneler, ortam, güven skoru
- Senaryo üretimi: analiz + CEFR seviyesi + hedef + İkiz profili → görev
- Değerlendirme: kullanıcı yanıtı + görev + İkiz profili → yapılandırılmış geri bildirim

İstemci, API anahtarı tutmamalıdır. Sunucu, içerik güvenliği, oran sınırlama, maliyet takibi ve doğrulama katmanını üstlenmelidir.

## Kalıcı veri ilkesi

Varsayılan olarak ham fotoğraf veya ses kaydı saklanmaz. Yerel depoda yalnızca kullanıcı tercihi, kaydedilmiş ifade, görev özeti ve ilerleme bilgisi bulunur. Medya işleme tercihi Profil ekranından yönetilir.
