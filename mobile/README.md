# LifeLens Mobile

LifeLens, kullanıcının kendi çevresindeki fotoğrafları İngilizce konuşma pratiğine dönüştüren mobil MVP'dir.

## Hackathon MVP akışı

1. Kullanıcı kamera, galeri veya önceden hazırlanmış bağlamlardan birini seçer.
2. LifeLens, görselden çıkan nesneleri, bağlam güvenini ve iletişim ihtiyacını gösterir.
3. Sistem A2/B1 seviyesine uygun, ölçülebilir bir konuşma görevi üretir.
4. Kullanıcı metin üzerinden yapay zekâ konuşma partnerine yanıt verir.
5. Geri bildirim; doğruluk, doğallık ve **İngilizce İkizi** ile uyum katmanlarına ayrılır.
6. Kullanıcı kişiselleştirilmiş ifadeyi kitaplığına kaydeder ve ilerlemesi ana ekrana yansır.

## Jüri demosu

Ana ekrandaki **Hackathon Demo Modu**, mikrofon, su şişesi, laptop ve not defterini içeren "Jüri Masası" bağlamını doğrudan açar. Bu akış sırasıyla *Anlama → Görev → Konuşma → Geri bildirim* adımlarını görünür biçimde gösterir. Böylece canlı sunumda gerçek bir fotoğrafa ihtiyaç kalmadan ürünün değer önerisi tekrarlanabilir.

Bu sürümde kamera/galeri seçimi çalışır; senaryo üretimi, konuşma partneri ve değerlendirme katmanı güvenli, deterministik demo verisiyle çalışır. Arayüz bu katmanların gerçek görsel model ve LLM API'siyle değiştirilmesi için tasarlanmıştır; görsel analiz sonucu olduğunu iddia eden doğrulanamayan ayrıntılar üretmez.

## Ürün mimarisi

- **Expo Router:** Ana bölümler dosya tabanlı rotalara ayrılmıştır. Böylece Studio, Kütüphane, İkizim ve Profil ayrı ekranlar olarak büyüyebilir.
- **Kalıcı öğrenme verisi:** Görev geçmişi, ifadeler, seviye, İkiz profili ve gizlilik tercihi cihazda kalır.
- **AI provider sınırı:** Öğrenme motoru, offline demo motoru ile gerçek görsel model/LLM adaptörünü birbirinden ayırır.
- **Tip güvenliği:** Öğrenme verisi, sahne, değerlendirme ve görev geçmişi merkezi olarak tanımlıdır.

Detaylı teknik harita: [Architecture](docs/ARCHITECTURE.md).

## Çalıştırma

```bash
npm install
npm start
```

Ardından Expo Go ile QR kodu okutabilir veya `npm run ios` / `npm run android` komutlarını kullanabilirsin.

## Kapsam

- Snap & Speak fotoğraf seçme/çekme akışı
- Beş adımlı Mission Studio ve bağlam güveni görünümü
- Canlı Jüri Masası demo senaryosu
- Metin tabanlı diyalog ve üç katmanlı geri bildirim
- Aranabilir, bağlam etiketli ifade kütüphanesi
- Düzenlenebilir İngilizce İkizim ton kontrolleri
- Life Map, ilerleme ve gizlilik tercihleri
- Cihaz yeniden başlatılsa da korunan öğrenme özeti ve son görev kaydı
