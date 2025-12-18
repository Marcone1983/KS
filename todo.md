# KannaSprout Mobile - TODO

## Core Features
- [x] Splash screen con logo animato
- [x] Home screen con panoramica giardino
- [x] Game screen con rendering 3D base
- [x] Sistema livelli e progressione
- [x] Paywall dopo Livello 1
- [x] Integrazione PayPal checkout ($10 una tantum)
- [x] Shop screen con categorie
- [x] Profile screen con statistiche
- [x] Encyclopedia screen
- [x] Settings screen

## Game Mechanics
- [x] Sistema wave/ondate parassiti
- [x] Controlli spray touch
- [x] Barra salute pianta
- [x] Sistema munizioni
- [x] Power-ups e boost
- [x] Sistema punteggio
- [x] Salvataggio progressi (AsyncStorage)

## Premium System
- [x] Verifica stato premium all'avvio
- [x] Paywall modal dopo Livello 1
- [x] PayPal SDK integration
- [x] Backend API per verifica pagamento
- [x] Sblocco permanente contenuti premium
- [x] Persistenza stato premium

## Backend/API
- [x] Endpoint verifica pagamento PayPal
- [x] Endpoint stato utente premium
- [x] Configurazione Vercel deployment
- [x] Configurazione Cloudflare Worker

## UI/UX
- [x] Tema colori verde/gold
- [x] Animazioni transizioni
- [x] Feedback haptic
- [x] Dark mode support
- [x] Safe area handling

## Branding
- [x] Generare logo app
- [x] Configurare app.config.ts
- [x] Splash screen assets
- [x] App icon assets

## Game Components (20 subagent)
- [x] HealthBar - barra vita pianta
- [x] AmmoCounter - contatore munizioni spray
- [x] WaveIndicator - indicatore ondata parassiti
- [x] ScoreDisplay - visualizzazione punteggio
- [x] PowerUpItem - oggetti potenziamento
- [x] PestSprite - sprite parassiti
- [x] PlantVisual - visualizzazione pianta
- [x] SprayEffect - effetto spray particelle
- [x] DailyReward - ricompense giornaliere
- [x] AchievementBadge - badge achievement
- [x] LeaderboardRow - riga classifica
- [x] ShopItemCard - card oggetti shop
- [x] CurrencyDisplay - visualizzazione valuta
- [x] LevelProgressBar - barra progresso livello
- [x] NotificationBanner - banner notifiche
- [x] TutorialOverlay - overlay tutorial
- [x] PremiumBadge - badge premium
- [x] GameTimer - timer di gioco
- [x] ComboCounter - contatore combo
- [x] useGameState - hook stato gioco

## Testing
- [ ] Test flow pagamento
- [ ] Test progressione livelli
- [ ] Test persistenza dati
- [x] Audit finale codice


## Correzioni Richieste dall'Utente
- [x] Rinominare app da "KannaSprout" a "Kurstaki Strike"
- [x] Usare il logo fornito (1000240992.png) in ogni pagina
- [x] Creare splash screen con background fornito (1000241000.jpg)
- [x] Implementare barra di caricamento animata con spruzzino che spruzza acqua
- [ ] Replicare esattamente le funzionalità del repository KS originale
- [ ] Non cancellare codice esistente, solo correggere errori


## Richieste Critiche - Grafica 3D AAA
- [ ] Installare pacchetti 3D: expo-three, three, @react-three/fiber, @react-three/drei, expo-gl
- [ ] Copiare modelli GLB in assets: plant03.glb, plant04.glb, spray.glb + textures
- [ ] Creare componente Game3D con rendering modelli GLB
- [ ] Implementare piante 3D (plant03.glb, plant04.glb) come fulcro del gioco
- [ ] Implementare spruzzino 3D (spray.glb) con textures
- [ ] Animazioni parassiti che attaccano le piante
- [ ] Effetto spray con particelle 3D

## Tutte le 25+ Sezioni da Creare (identiche al repository)
- [ ] SplashScreen - splash con barra caricamento spruzzino
- [ ] Game - gioco 3D principale
- [ ] Home - menu principale
- [ ] Dashboard - statistiche giocatore
- [ ] Shop - negozio in-app
- [ ] Encyclopedia - enciclopedia parassiti/piante
- [ ] Breeding - incrocio piante base
- [ ] LoreArchive - archivio storia/lore
- [ ] ResearchTree - albero ricerca
- [ ] PlantUpgrades - potenziamenti piante
- [ ] Crafting - creazione oggetti
- [ ] GrowingLab - laboratorio crescita
- [ ] BreedingLab - laboratorio breeding avanzato
- [ ] Leaderboards - classifiche
- [ ] PlayerProgression - progressione giocatore
- [ ] GardenCustomization - personalizzazione giardino
- [ ] CommunityHub - hub community
- [ ] Trading - scambio oggetti
- [ ] Codex - codice/guida
- [ ] Progression - sistema progressione
- [ ] Challenges - sfide giornaliere/settimanali
- [ ] GardenBuilder - costruttore giardino
- [ ] SeasonalEvents - eventi stagionali
- [ ] Achievements - achievement/trofei


## CORREZIONE CRITICA - Rendering 3D (NO EMOJI!)
- [x] RIMUOVERE tutte le emoji dal gioco (🐛, 🕷️, 🌿, etc.)
- [x] Implementare rendering 3D REALE con Three.js/expo-three
- [x] Caricare e renderizzare plant03.glb come pianta principale
- [x] Caricare e renderizzare plant04.glb come pianta secondaria
- [x] Caricare e renderizzare spray.glb come spruzzino del giocatore
- [x] Applicare le textures ai modelli 3D
- [ ] Copiare ESATTAMENTE il codice Game.jsx dal repository KS originale
- [x] Animazioni 3D per parassiti che attaccano le piante
- [x] Effetto spray 3D con particelle
