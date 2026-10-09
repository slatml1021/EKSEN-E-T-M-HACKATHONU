# LifeLens AI Gateway

Bu servis, mobil uygulamanın fotoğrafla öğrenme akışındaki iki modeli güvenli biçimde ayırır:

```text
Mobil uygulama → Gateway → Gemini Vision → yapılandırılmış görünür bağlam
                                  ↓
                         Scenario AI (OpenAI Responses API)
                                  ↓
                 seviyeye ve İngilizce İkizi'ne uygun geniş senaryo
```

## Neden iki model?

Gemini yalnızca fotoğrafta görünür olarak desteklenen nesneleri, ilişkileri ve belirsizlikleri JSON olarak döndürür. İkinci model fotoğrafı yeniden görmez; bu doğrulanmış analizi kullanarak, fotoğrafın bağlamına bağlı ama daha geniş bir günlük yaşam senaryosu yazar. Böylece ikinci aşama "görüntüde olmayan" bir ayrıntıyı kesin gerçek gibi kuramaz.

## Yerel çalıştırma

1. `ai-gateway/.env.example` içindeki değerleri dağıtım ortamının gizli değişkenlerine ekleyin. `.env` dosyası Git'e eklenmez.
2. Node 20+ ile `npm start` komutunu çalıştırın.
3. Mobil tarafına yalnızca uç nokta adresini verin:

```bash
EXPO_PUBLIC_LIFELENS_API_URL=https://your-gateway.example.com
```

`EXPO_PUBLIC_` değeri bir gizli anahtar değildir; yalnızca yayınlanmış gateway URL'sidir. `GEMINI_API_KEY` ve `OPENAI_API_KEY` sadece sunucuda kalır.

## API sözleşmesi

`POST /v1/missions/from-image`

İstek; base64 JPEG/PNG/WebP görseli ve kullanıcının A2/B1 seviyesi ile tarz tercihlerini alır. En fazla 5 MB görsel ve 12 istek / 10 dakika / IP kabul edilir. Yanıt; `analysis`, `mission` ve hangi katmanların çalıştığını gösteren `origin` alanlarını döndürür.

Ham fotoğraf hiçbir dosyaya, loga veya veritabanına yazılmaz. Uygulama gateway'e erişemediğinde mobil uygulama bunu açıkça belirten, fotoğraftaki nesneleri uydurmayan bir yerel görev gösterir.

## Yayına alma notu

Hackathon için paylaşımlı `LIFELENS_API_TOKEN` seçeneği vardır. Üretimde bunun yerine kullanıcı oturumunun doğrulanması, kalıcı oran sınırlama ve merkezi denetim kaydı eklenmelidir.
