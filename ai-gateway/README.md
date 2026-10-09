# LifeLens AI Gateway

Bu servis, mobil uygulamanın fotoğrafla öğrenme akışındaki iki modeli güvenli biçimde ayırır:

```text
Mobil uygulama → Gateway → Gemini Vision → yapılandırılmış görünür bağlam
                                  ↓
                       Gemini 2.5 Flash-Lite (aynı API anahtarı)
                                  ↓
                   üç genişletilmiş, seçilebilir konuşma senaryosu
```

## Neden iki model?

Gemini Vision yalnızca fotoğrafta görünür olarak desteklenen nesneleri, ilişkileri ve belirsizlikleri JSON olarak döndürür. Ardından aynı sunucu tarafı `GEMINI_API_KEY` ile çalışan **Gemini 2.5 Flash-Lite**, ham fotoğrafı değil bu doğrulanmış analizi ve aşağıdaki ürün talimatını alır: “Verilen analize göre bir senaryo oluştur. Bu senaryo analizdeki obje ile bağlantılı ama genişletilmiş olsun. Farklı birkaç senaryo öner.”

İkinci çağrı tam olarak üç farklı seçeneği yapılandırılmış JSON olarak döndürür; uygulama önerilen seçeneği açar ve diğer ikisini de seçilebilir biçimde gösterir. Gemini 2.5 Flash-Lite, yeni projelerde erişim kısıtına takılırsa gateway yalnızca `GEMINI_SCENARIO_FALLBACK_MODEL` değerine geçer; bu sayede demo akışı tamamen kesilmez.

## Yerel çalıştırma

1. `ai-gateway/.env.example` içindeki değerleri dağıtım ortamının gizli değişkenlerine ekleyin. `.env` dosyası Git'e eklenmez.
2. Node 20+ ile `npm start` komutunu çalıştırın.
3. Mobil tarafına yalnızca uç nokta adresini verin:

```bash
EXPO_PUBLIC_LIFELENS_API_URL=https://your-gateway.example.com
```

`EXPO_PUBLIC_` değeri bir gizli anahtar değildir; yalnızca yayınlanmış gateway URL'sidir. `GEMINI_API_KEY` yalnızca sunucuda kalır.

## API sözleşmesi

`POST /v1/missions/from-image`

İstek; base64 JPEG/PNG/WebP görseli ve kullanıcının A2/B1 seviyesi ile tarz tercihlerini alır. En fazla 5 MB görsel ve 12 istek / 10 dakika / IP kabul edilir. Yanıt; `analysis`, önerilen `mission`, üç senaryonun tamamını içeren `alternatives` ve hangi katmanların çalıştığını gösteren `origin` alanlarını döndürür.

Ham fotoğraf hiçbir dosyaya, loga veya veritabanına yazılmaz. Uygulama gateway'e erişemediğinde mobil uygulama bunu açıkça belirten, fotoğraftaki nesneleri uydurmayan bir yerel görev gösterir.

## Test paketi

`npm run test:2000`, internet veya Gemini anahtarı kullanmadan **tam 2.000** yerel HTTP senaryosu koşturur. Paket; farklı sentetik PNG'lerle A2/B1 görev üretimini, üç senaryo sözleşmesini, seçili senaryo eşleşmesini, yetkilendirme kontrolünü, hatalı medya/öğrenen isteklerini ve bilinmeyen uç noktaları kapsar. Test sağlayıcısı yalnızca `LIFELENS_TEST_MODE=1` ile başlar; normal çalıştırmada hiçbir zaman devreye girmez.

## Yayına alma notu

Hackathon için paylaşımlı `LIFELENS_API_TOKEN` seçeneği vardır. Üretimde bunun yerine kullanıcı oturumunun doğrulanması, kalıcı oran sınırlama ve merkezi denetim kaydı eklenmelidir.
