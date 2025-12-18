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


## Build APK
- [ ] Configurare EAS (eas.json)
- [ ] Eseguire eas build -p android --profile preview
- [ ] Scaricare APK generato

- [x] Creare GitHub Actions workflow per build APK automatico
- [x] Push workflow su GitHub


## SVILUPPO AAA ENTERPRISE - 20 MODULI PARALLELI

### Modulo 1: Breeding 3D Avanzato
- [x] Sistema genetico completo con tratti ereditari
- [x] Visualizzazione 3D piante ibride in tempo reale
- [x] Animazioni incrocio con effetti particelle
- [x] Database genetico persistente

### Modulo 2: Growing Lab 3D con Feed e Tutor
- [x] Sistema nutrienti 3D interattivo
- [x] Tutor 3D animato che guida il giocatore
- [x] Ciclo crescita pianta con stadi visibili
- [x] Sistema irrigazione e fertilizzazione 3D

### Modulo 3: Profilo Utente Completo
- [x] Avatar 3D personalizzabile
- [x] Statistiche dettagliate con grafici
- [x] Sistema achievement con badge 3D
- [x] Cronologia attività

### Modulo 4: Garden 3D Condivisibile
- [x] Rendering garden completo in 3D
- [x] Sistema visita garden altri utenti
- [x] Condivisione social con preview 3D
- [x] Sistema like e commenti

### Modulo 5: Crafting System Completo
- [x] Workbench 3D interattivo
- [x] Ricette con ingredienti visualizzati in 3D
- [x] Animazioni crafting
- [x] Sistema rarità oggetti

### Modulo 6: Research Tree 3D
- [ ] Albero tecnologico 3D navigabile
- [ ] Animazioni sblocco ricerche
- [ ] Sistema prerequisiti
- [ ] Effetti visivi per ricerche attive

### Modulo 7: Encyclopedia 3D Interattiva
- [ ] Modelli 3D rotabili per ogni entry
- [ ] Sistema filtri e ricerca
- [ ] Animazioni creature/piante
- [ ] Audio descrizioni

### Modulo 8: Leaderboards Real-time
- [ ] Classifiche globali in tempo reale
- [ ] Classifiche per categoria
- [ ] Animazioni ranking
- [ ] Sistema sfide dirette

### Modulo 9: Challenges System
- [ ] Sfide giornaliere con timer 3D
- [ ] Sfide settimanali
- [ ] Sfide stagionali
- [ ] Ricompense 3D animate

### Modulo 10: Trading System
- [ ] Marketplace 3D
- [ ] Sistema offerte/richieste
- [ ] Preview oggetti 3D
- [ ] Storico transazioni

### Modulo 11: Community Hub
- [ ] Chat in tempo reale
- [ ] Sistema guild/clan
- [ ] Eventi community
- [ ] Forum integrato

### Modulo 12: Seasonal Events
- [ ] Eventi a tempo con temi 3D
- [ ] Ricompense esclusive
- [ ] Decorazioni stagionali garden
- [ ] Boss eventi speciali

### Modulo 13: Achievement System 3D
- [ ] Badge 3D animati
- [ ] Showcase trofei
- [ ] Progressione visuale
- [ ] Ricompense milestone

### Modulo 14: Garden Builder 3D
- [ ] Editor drag-and-drop 3D
- [ ] Decorazioni e strutture
- [ ] Sistema terreno
- [ ] Illuminazione personalizzabile

### Modulo 15: Plant Upgrades 3D
- [ ] Sistema potenziamento visuale
- [ ] Effetti particelle upgrade
- [ ] Statistiche animate
- [ ] Preview miglioramenti

### Modulo 16: Lore Archive
- [ ] Storie interattive
- [ ] Cutscene 3D
- [ ] Collezionabili lore
- [ ] Timeline eventi

### Modulo 17: Codex Completo
- [ ] Guida interattiva 3D
- [ ] Tutorial contestuali
- [ ] Tips sistema
- [ ] FAQ animate

### Modulo 18: Player Progression
- [ ] Sistema XP con animazioni
- [ ] Livelli con ricompense 3D
- [ ] Skill tree 3D
- [ ] Prestige system

### Modulo 19: Settings Avanzate
- [ ] Controlli grafici 3D
- [ ] Audio settings
- [ ] Notifiche personalizzabili
- [ ] Account management

### Modulo 20: Game Core AAA
- [ ] Rendering PBR avanzato
- [ ] Post-processing effetti
- [ ] Fisica realistica
- [ ] AI parassiti avanzata


## CREAZIONE ASSET 3D GLB

### Nutrienti e Fertilizzanti
- [x] Bottiglia Acqua 3D (water_bottle.glb)
- [x] Sacco Fertilizzante 3D (fertilizer_bag.glb)
- [x] Cristallo Nutriente Verde (nutrient_crystal_green.glb)
- [x] Cristallo Nutriente Blu (nutrient_crystal_blue.glb)
- [x] Cristallo Nutriente Oro (nutrient_crystal_gold.glb)
- [x] Goccia Essenza Magica (magic_essence.glb)
- [x] Polvere Dorata (golden_powder.glb)

### Parassiti e Nemici
- [x] Afide 3D (aphid.glb)
- [x] Ragnetto Rosso 3D (spider_mite.glb)
- [x] Bruco 3D (caterpillar.glb)
- [x] Mosca Bianca 3D (whitefly.glb)
- [x] Cocciniglia 3D (mealybug.glb)
- [x] Tripide 3D (thrip.glb)
- [x] Boss Locusta 3D (locust_boss.glb)

### Power-up e Pozioni
- [x] Super Spray 3D (super_spray.glb)
- [x] Pozione Salute 3D (health_potion.glb)
- [x] Scudo Barriera 3D (shield_barrier.glb)
- [x] Elisir Crescita 3D (growth_elixir.glb)
- [x] Siero Definitivo 3D (ultimate_serum.glb)
- [x] Bomba Insetticida 3D (insecticide_bomb.glb)

### Oggetti Marketplace
- [x] Vaso Decorativo Base (pot_basic.glb)
- [x] Vaso Decorativo Premium (pot_premium.glb)
- [x] Vaso Decorativo Leggendario (pot_legendary.glb)
- [x] Lampada Crescita (grow_lamp.glb)
- [x] Sistema Irrigazione (irrigation_system.glb)
- [x] Serra Mini (mini_greenhouse.glb)
- [x] Recinzione Garden (garden_fence.glb)
- [x] Fontana Decorativa (decorative_fountain.glb)

### Badge e Trofei
- [x] Badge Bronzo (badge_bronze.glb)
- [x] Badge Argento (badge_silver.glb)
- [x] Badge Oro (badge_gold.glb)
- [x] Trofeo Campione (trophy_champion.glb)
- [x] Corona Premium (crown_premium.glb)



## INTEGRAZIONE ASSET 3D

- [x] Integrare asset GLB nello Shop come prodotti acquistabili
- [x] Usare parassiti 3D (aphid.glb, spider_mite.glb, etc.) nel gioco
- [ ] Visualizzare preview 3D dei prodotti nello shop



## CREAZIONE SUONI AUDIO

- [x] UI base (tap x3, back, open, close, tab_switch, notif, success, error, toggle, slider)
- [x] Transizioni (splash_home, enter_game, page)
- [x] Shop/Inventory (open, buy, buy_rare, denied, add_item, equip)
- [x] Breeding (open, select, start, loop, complete, strain_unlock, growth_tick, plant_levelup)
- [x] Spray (start, loop, stop, hit_leaf x3, empty, refill)
- [x] Pests (spawn, idle_loop, hit x2, die_fall, wave_complete)
- [x] Progress (xp_tick, challenge_start, challenge_complete, challenge_fail)
- [x] Ambiente (day_loop, night_loop, wind_gust, leaves_rustle)


## INTEGRAZIONE AUDIO

- [x] Creare hook useSounds per gestione audio centralizzata
- [x] Integrare suoni UI (tap, back, open, close, toggle)
- [x] Integrare suoni Shop (buy, denied, equip)
- [x] Integrare suoni Spray nel gioco
- [x] Integrare suoni Pests nel gioco
- [x] Integrare suoni Breeding
- [x] Integrare ambient loops
- [x] Creare pagina Settings audio con slider volume



## SVILUPPO CONTINUO

- [x] Sistema inventario per oggetti acquistati
- [x] Leaderboard globale e sistema social
- [x] Tutorial interattivo per nuovi utenti
- [x] Ottimizzazione performance 3D (hook use-3d-performance con LOD, object pooling, auto-adjust)
- [x] Sistema notifiche push (hook use-notifications con daily reminder, plant reminders, challenges)
- [x] Achievements e badge system (24 achievements con 5 categorie, badge 3D, progress tracking)
- [x] Daily challenges (già implementato con filtri, progress bar, ricompense)
- [x] Sistema di trading tra utenti (browse, my offers, create, 3D animation)

## FUNZIONALITÀ AVANZATE

- [x] Sistema weather dinamico con effetti 3D (pioggia, sole, neve, temporale, nebbia, vento)
- [x] Mini-giochi bonus (catch the drop, pest defense, speed spray)
- [x] Sistema guild/clan con chat e eventi cooperativi (home, members, chat, events, emblema 3D)
- [x] Seasonal events con contenuti esclusivi (progress bar, milestones, sfide, shop esclusivo, decorazioni 3D)


## POLISH E ANIMAZIONI

- [x] Animazioni di transizione avanzate (fade, slide, scale, flip, bounce, staggered list, pulse, shake)
- [x] Effetti particellari 3D (instanced mesh, configurable particles)
- [x] Sistema feedback tattile avanzato (23 pattern haptic: tap, spray, pest_death, level_up, achievement, etc.)
- [x] Schermata statistiche dettagliate con 4 categorie
- [x] Home page con 22+ link a tutte le sezioni


## CLOUD SYNC E PERSISTENZA

- [x] Hook useCloudSync per sincronizzazione progressi
- [x] Salvataggio locale con AsyncStorage
- [x] Auto-sync periodico ogni 60 secondi
- [x] Metodi helper per score, currency, inventory, achievements


## SISTEMA COMBATTIMENTO AVANZATO

- [x] Boss Battles con 3 boss (Re Locusta, Regina Ragno, Bruco Titano)
- [x] Pattern di attacco multipli (charge, projectile, aoe, summon)
- [x] Weak points con damage multiplier
- [x] Sistema fasi boss con scaling difficolta
- [x] 10 Power-ups (damage boost, speed, heal, shield, multishot, freeze, magnet, xp/coin boost, invincibility)
- [x] Sistema rarita power-ups (common, rare, epic, legendary)
- [x] Combo System con 6 tier (good, great, excellent, perfect, legendary)
- [x] Critical hits e perfect hits
- [x] Combo multiplier fino a 3x
