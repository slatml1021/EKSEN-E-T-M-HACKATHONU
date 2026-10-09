# LifeLens Mobile

LifeLens, kullanıcının kendi çevresindeki fotoğrafları İngilizce konuşma pratiğine dönüştüren mobil MVP'dir.

## İlk MVP akışı

1. Kullanıcı kamera veya galeriden bir görsel seçer.
2. Uygulama görsel analizini temsil eden durum ekranını gösterir.
3. Görsel bağlamından kafe/priz/sıcak su örneğinde bir konuşma görevi açılır.
4. Kullanıcı ifade kaydeder, metinle yanıt verir ve kişiselleştirilmiş geri bildirim alır.

Bu ilk uygulama sürümünde görsel seçme/çekme akışı çalışır. Senaryo üretimi ve diyalog yanıtları arayüz içinde güvenli örnek verilerle temsil edilir; sonraki adımda backend ve yapay zekâ servislerine bağlanacaktır.

## Çalıştırma

```bash
npm install
npm start
```

Ardından Expo Go ile QR kodu okutabilir veya `npm run ios` / `npm run android` komutlarını kullanabilirsin.

## Kapsam

- Snap & Speak fotoğraf seçme/çekme akışı
- Görsel bağlamı gösteren senaryo ekranı
- Metin tabanlı diyalog arayüzü
- Kaydedilen ifade kütüphanesi
- İngilizce İkizim kişiselleştirme ekranı
- Profil ve ilerleme özeti
