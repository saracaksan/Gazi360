/* Gazi Ortaokulu Davranış Takip · PWA katmanı
   1) google.script.run uyumluluk katmanı: uygulama kodu değişmeden Apps Script API'sine bağlanır
   2) Service worker kaydı
   3) Çevrimdışı uyarısı ve "Uygulamayı yükle" düğmesi */
(function () {
  'use strict';

  /* ---------- 1) API bağlantısı ---------- */
  if (!window.google || !window.google.script) {
    const ZAMAN_ASIMI = 30000;

    const olustur = (ok, hata) => new Proxy({}, {
      get: (_, ad) => {
        if (ad === 'withSuccessHandler') return f => olustur(f, hata);
        if (ad === 'withFailureHandler') return f => olustur(ok, f);
        if (typeof ad !== 'string') return undefined;

        return (...args) => {
          const bildirHata = m => { if (hata) hata(new Error(m)); };
          const url = window.API_URL;

          if (!url || url.indexOf('script.google.com') < 0) {
            return bildirHata('API adresi ayarlanmamış. config.js dosyasındaki API_URL değerini girin.');
          }
          if (!navigator.onLine) {
            return bildirHata('İnternet bağlantısı yok. Bağlantıyı kontrol edip tekrar deneyin.');
          }

          const kontrol = new AbortController();
          const sayac = setTimeout(() => kontrol.abort(), ZAMAN_ASIMI);

          // text/plain: tarayıcı ön kontrol (preflight) istemez, Apps Script CORS ile yanıt verir
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ fn: ad, args: args }),
            signal: kontrol.signal
          })
            .then(r => r.json())
            .then(j => {
              if (j.ok) { if (ok) ok(j.veri); }
              else bildirHata(j.hata || 'Bilinmeyen hata.');
            })
            .catch(e => bildirHata(e.name === 'AbortError'
              ? 'Sunucu zamanında yanıt vermedi. Tekrar deneyin.'
              : 'Sunucuya ulaşılamadı. Bağlantınızı ve API adresini kontrol edin.'))
            .finally(() => clearTimeout(sayac));
        };
      }
    });

    window.google = { script: { run: olustur(null, null) } };
  }

  /* ---------- 2) Service worker ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  /* ---------- 3) Çevrimdışı uyarısı ve yükleme düğmesi ---------- */
  const hazir = fn => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  };

  hazir(() => {
    const cubuk = document.createElement('div');
    cubuk.textContent = 'Çevrimdışısınız. Kayıt girmek için internet bağlantısı gerekir.';
    cubuk.style.cssText = 'display:none;position:fixed;left:0;right:0;bottom:0;z-index:90;background:#b91c1c;color:#fff;text-align:center;padding:8px;font:13px/1.3 sans-serif';
    document.body.appendChild(cubuk);
    const guncelle = () => { cubuk.style.display = navigator.onLine ? 'none' : 'block'; };
    window.addEventListener('online', guncelle);
    window.addEventListener('offline', guncelle);
    guncelle();
  });

  const kurulu = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  let dugme = null, yuklemeIstegi = null;

  const goster = (metin, tikla) => {
    if (kurulu) return;
    hazir(() => {
      if (!dugme) {
        dugme = document.createElement('button');
        dugme.style.cssText = 'position:fixed;left:12px;bottom:14px;z-index:70;background:#14407a;color:#fff;border:0;border-radius:999px;padding:11px 16px;font:600 14px sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.3);cursor:pointer';
        document.body.appendChild(dugme);
      }
      dugme.textContent = metin;
      dugme.onclick = tikla;
    });
  };
  const kaldir = () => { if (dugme) { dugme.remove(); dugme = null; } };

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    yuklemeIstegi = e;
    goster('📲 Uygulamayı yükle', async () => {
      yuklemeIstegi.prompt();
      try { await yuklemeIstegi.userChoice; } catch (x) {}
      yuklemeIstegi = null;
      kaldir();
    });
  });
  window.addEventListener('appinstalled', kaldir);

  // iPhone/iPad: tarayıcı yükleme istemi vermez, kullanıcıya yol gösterilir
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !kurulu) {
    goster('📲 Ana ekrana ekle', () => {
      alert('Safari’de alttaki Paylaş düğmesine dokunun, ardından "Ana Ekrana Ekle" seçeneğini seçin.');
    });
  }
})();
