# LifeLens — Gereksinim ve Algoritma İzlenebilirliği

Bu belge, hackathon MVP'sinde her gereksinimin ya çalışan bir karşılığı ya da açık bir kapsam durumu olmasını sağlar. **"Kısmi" veya "sonraki sürüm" durumundaki bir özellik tamamlanmış gibi sunulmaz.**

## Ürünün karar akışı

```text
Kullanıcı tercihi ve izin
        │
Fotoğraf (yalnızca izin açıksa) ──► Gemini Vision
                                      │ görünür kanıt + belirsizlik
                                      ▼
                         Gemini Scenario Agent (3 seçenek)
                                      │ CEFR + iletişim tonu
                                      ▼
                         görev → yanıt → geri bildirim
                                      │
                         ifade ve görev özeti (yerel)
```

## Algoritmik güvence noktaları

| Alan | Uygulanan kural | Neden gerekli |
| --- | --- | --- |
| Görsel girdi | MIME, Base64, dosya imzası ve 5 MB sınırı gateway'de doğrulanır. | Sahte/bozuk veya gereksiz büyük içerik sağlayıcıya gitmez. |
| Görsel anlama | Vision yalnızca görünür kanıt, ilişki ve belirsizlik döndürür. | Modelin görselde olmayan bir olayı gerçek gibi sunma riski azalır. |
| Senaryo | İkinci model ham fotoğrafı değil yapılandırılmış analizi; A2/B1 ve ton tercihlerini alır. Tam üç seçenek döndürür. | Nesneyle bağlantılı fakat genişletilmiş görev üretir; gizlilik yüzeyini küçültür. |
| Güvenlik | Boş/uygunsuz senaryo alanları ve açık zararlı ifadeler kullanıcıya ulaşmadan reddedilir. | Öğrenme içeriğinin kullanılabilirliğini korur. |
| Dil geri bildirimi | Yerel motor yalnızca açık, tanımlı dilbilgisi kalıplarını düzeltir; üslup alternatifini "yanlış" diye etiketlemez. | FR-42: doğru bir ifadeyi yalnızca daha doğal bir seçenek var diye yanlış saymaz. |
| İkiz profili | Türkçe örnekten cümle uzunluğu, doğrudanlık/nezaket/mizah işaretleri tahmin edilir; kullanıcı her değeri değiştirebilir. | Psikolojik kişilik iddiası yerine dil tercihi sunar. |
| Gizlilik | Tercih kapalıyken kamera/galeri görseli gönderilmez. Ham medya saklanmaz veya loglanmaz. | Kullanıcı kontrolü ve veri minimizasyonu. |
| Hata | Gateway hatası görsel hakkında tahmin üreten görev yerine nedenini açıklayan genel görev döndürür. | Hata halinde uydurma içerik engellenir. |

## Gereksinim matrisi

| Grup | Durum | MVP karşılığı / sınır |
| --- | --- | --- |
| FR-01–06 Kullanıcı yönetimi | Sonraki sürüm | Yerel demo profili vardır; gerçek kayıt, oturum, hesap silme ve sunucu hesabı yoktur. |
| FR-07–10 Seviye | Uygulandı | Kullanıcı A2/B1 seçer; gateway senaryo istemine seviyeyi iletir. A1/B2 kapsam dışıdır. |
| FR-11 Uyarlanabilir zorluk | Kısmi | Görev sonucu yerelde kaydedilir; otomatik seviye yükseltme algoritması sonraki sürümdedir. |
| FR-12–20 Snap & Speak | Uygulandı | Kamera/galeri, Gemini Vision, görünür kanıt, üç geniş senaryo, seçim, yazılı görev ve ifade eşleştirmesi vardır. Sesli yanıt FR-31–32 kapsamındadır. |
| FR-21–26 İngilizce İkizim | Uygulandı | Türkçe metin örneği, şeffaf işaretler, düzenlenebilir üç ton değeri ve tona uygun alternatif vardır. |
| FR-27 Gelişmiş öğrenen profil | Sonraki sürüm | Uzun dönem geri bildirimiyle profil güncelleme henüz yoktur. |
| FR-28 Psikolojik hüküm yok | Uygulandı | Arayüz ve algoritma bunu dil tercihi tahmini olarak tanımlar. |
| FR-29–30, 33–35 Diyalog | Kısmi | Yazılı diyalog ve deterministik bir partner devam turu vardır. Çok turlu canlı LLM partneri sonraki sürümdedir. |
| FR-31–32 Ses | Sonraki sürüm | MVP'de sesli yanıt/transkripsiyon yoktur; metin akışı eksiksiz çalışır. |
| FR-36–43 Geri bildirim | Uygulandı (MVP) | Açık dilbilgisi hatası, doğallık ve ton uyumu ayrı verilir; sahne bağlamı kullanılır. Tam serbest metin dil modeli değerlendirmesi sonraki sürümdedir. |
| FR-44–46 İfade kütüphanesi | Uygulandı | İfade kaydetme, listeleme, silme; Türkçe anlam ve bağlam alanları vardır. |
| FR-47–49 Tekrar | Kısmi | Arama vardır; filtreleme, bildirim ve aralıklı tekrar zamanlayıcısı sonraki sürümdedir. |
| FR-50–55 Yaşam haritası | Kısmi | Görev geçmişi/ilerleme özeti ve demo ortam haritası vardır; gerçek ortam analitiği sonraki sürümdedir. |
| FR-56–59 Yönetim | Sonraki sürüm | Hackathon MVP'sinde yönetici paneli yoktur. |
| NFR-01–05 Performans | Uygulandı (hedef) | Aşama göstergesi, iki aşamalı zaman aşımı ve oran sınırı vardır. 10 sn hedefi ücretsiz sağlayıcı kuyruğu nedeniyle üretimde ölçülmelidir. |
| NFR-06–14 Güvenlik/gizlilik | Kısmi | Anahtar yalnızca gateway'de, medya varsayılan saklanmaz, giriş boyut/doğrulama/oran sınırı vardır. Üretim kimlik doğrulama ve resmi silme iş akışı sonraki sürümdedir. |
| NFR-15–25 UX/erişilebilirlik | Kısmi | Metinle tam akış, anlaşılır hata ve izin alternatifi vardır. Tam ekran okuyucu/kontrast denetimi yayın öncesi yapılmalıdır. |
| NFR-26–30 Güvenilirlik | Uygulandı (MVP) | İstek kimliği, hata kodu, timeout, güvenli fallback ve yapı şeması doğrulaması vardır. Merkezi gözlemleme sonraki sürümdedir. |
| AI-01–12 | Kısmi | Vision + ayrı Scenario Agent, belirsizlik, seviye, ton ve içerik denetimi vardır. Ses tanıma ve üretim maliyeti panosu sonraki sürümdedir. |
| BR-01–10 | Uygulandı (MVP) | Seviye, iletişim amacı, kullanıcı seçimi, başarısız analiz fallback'i, sahiplik ve içerik kontrolü akışa gömülüdür. |

## Doğrulama kanıtı

- `ai-gateway`: sözdizimi denetimi ve **2.000 HTTP senaryosu** (A2/B1 geçerli istek, bozuk görsel, yetkisiz istek, hatalı rota/metot).
- `mobile`: TypeScript, linter, web export ve Android export.
- Canlı güvenli örnekler: iki farklı görselde Gemini Vision → ikinci senaryo çağrısı ve A2/B1 ifade üretimi.

## Yayın kararı

MVP; fotoğraftan üç senaryo, Türkçe-İngilizce ton köprüsü, yazılı pratik, dürüst geri bildirim ve ifade kütüphanesi değer önerisini kanıtlar. Hesap sistemi, ses, aralıklı tekrar, otomatik seviye değişimi ve yönetim paneli ancak veri/operasyon ihtiyaçları kesinleştiğinde eklenmelidir.
