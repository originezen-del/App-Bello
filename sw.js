/*
 * ╔══════════════════════════════════════════════════════════╗
 * ║  Evento Explorer – Service Worker                       ║
 * ║  Proprietà esclusiva dell'utente                        ║
 * ║                                                          ║
 * ║  ✅ Nessun tracciante                                    ║
 * ║  ✅ Nessuna connessione esterna                          ║
 * ║  ✅ Nessuna raccolta dati                                ║
 * ║  ✅ Funziona completamente offline                       ║
 * ║  ✅ Codice sorgente leggibile e verificabile             ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Questo file gestisce SOLO la cache locale per uso offline.
 * Non invia dati a nessun server. Non legge cookie.
 * Non esegue analytics. Non contiene codice offuscato.
 */

const CACHE_NAME = 'evento-explorer-v1';

// File da mettere in cache per uso offline
const FILES_DA_CACHARE = [
  './index.html',
  './sw.js'
];

// ── INSTALLAZIONE: scarica e metti in cache ───────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_DA_CACHARE))
      .then(() => self.skipWaiting()) // attiva subito senza aspettare
  );
});

// ── ATTIVAZIONE: pulisce cache vecchie ────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(chiavi => Promise.all(
        chiavi
          .filter(chiave => chiave !== CACHE_NAME)
          .map(chiave => caches.delete(chiave))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: serve dalla cache se offline ──────────────────────
self.addEventListener('fetch', event => {
  // Gestisce SOLO richieste GET sulla stessa origine
  // Non intercetta mai richieste verso server esterni
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const stessaOrigine = url.origin === self.location.origin ||
                        event.request.url.startsWith('file://');

  if (!stessaOrigine) return; // lascia passare tutto il resto senza toccare nulla

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        // Strategia: prima rete, poi cache (quando online aggiorna sempre)
        const richiestRete = fetch(event.request)
          .then(risposta => {
            if (risposta && risposta.status === 200) {
              const copia = risposta.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, copia));
            }
            return risposta;
          })
          .catch(() => cached); // se offline → usa cache

        return cached || richiestRete;
      })
  );
});
