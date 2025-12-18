# KannaSprout Mobile - Design Document

## Overview
App mobile per il gioco KannaSprout - un gioco di coltivazione e difesa delle piante di cannabis con grafica 3D, sistema di progressione, e monetizzazione tramite PayPal.

## Screen List

### 1. Splash Screen
- Logo animato KannaSprout
- Loading indicator
- Verifica stato premium utente

### 2. Home Screen (Tab principale)
- Panoramica giardino virtuale
- Statistiche rapide (livello, punteggio, valuta)
- Accesso rapido al gioco
- Banner promozioni/eventi

### 3. Game Screen
- Vista 3D del giardino con piante
- Controlli spray per difesa dai parassiti
- HUD con salute pianta, munizioni, punteggio
- Sistema wave/livelli
- **PAYWALL dopo completamento Livello 1**

### 4. Paywall Screen (Modal)
- Messaggio sblocco premium
- Prezzo: $10 una tantum
- Pulsante PayPal checkout
- Lista benefici premium
- Opzione "Continua gratis" (limitata)

### 5. Shop Screen (Tab)
- Acquisto semi e boost
- Skin e cosmetici
- Valuta in-game (GLeaf)
- Upgrade spray e piante

### 6. Profile Screen (Tab)
- Statistiche giocatore
- Achievements/trofei
- Stato premium
- Impostazioni account

### 7. Encyclopedia Screen
- Catalogo piante sbloccate
- Info parassiti
- Guida gameplay

### 8. Settings Screen
- Audio on/off
- Notifiche
- Lingua
- Privacy/Terms
- Logout

## Primary Content and Functionality

### Home Screen
- **Card Giardino**: Preview 3D miniatura del giardino attuale
- **Stats Bar**: Livello | GLeaf | Punteggio totale
- **Quick Play Button**: Accesso diretto al gioco
- **Daily Rewards**: Bonus giornaliero

### Game Screen
- **3D Canvas**: Rendering Three.js/React Three Fiber della scena
- **Plant Health Bar**: Barra vita pianta (verde → rosso)
- **Ammo Counter**: Munizioni spray disponibili
- **Wave Indicator**: Ondata corrente / totale
- **Score Display**: Punteggio in tempo reale
- **Pause Button**: Menu pausa
- **Power-ups**: Boost temporanei raccolti

### Paywall Screen
- **Hero Image**: Illustrazione premium
- **Title**: "Sblocca KannaSprout Premium"
- **Price Badge**: "$10 - Una Tantum"
- **Benefits List**:
  - ✓ Tutti i livelli sbloccati
  - ✓ Piante esclusive
  - ✓ Nessuna pubblicità
  - ✓ Bonus GLeaf giornalieri
  - ✓ Skin premium
- **PayPal Button**: Checkout sicuro
- **Skip Button**: "Continua con versione limitata"

### Shop Screen
- **Categories Tabs**: Semi | Boost | Cosmetici | Premium
- **Item Cards**: Immagine, nome, prezzo, pulsante acquisto
- **Currency Display**: GLeaf disponibili
- **Featured Items**: Offerte speciali

## Key User Flows

### Flow 1: Primo Avvio → Gioco → Paywall
1. Utente apre app → Splash Screen
2. Caricamento completato → Home Screen
3. Tap "Gioca" → Game Screen (Livello 1)
4. Completa Livello 1 → **Paywall Modal**
5. Opzione A: Paga $10 → PayPal → Premium sbloccato → Livello 2
6. Opzione B: Skip → Versione limitata (replay Livello 1)

### Flow 2: Utente Premium
1. Apre app → Verifica stato premium (AsyncStorage/Backend)
2. Premium = true → Accesso completo a tutti i livelli
3. Gioca liberamente senza interruzioni

### Flow 3: Acquisto Shop
1. Tab Shop → Sfoglia categorie
2. Seleziona item → Conferma acquisto
3. Deduzione GLeaf → Item aggiunto inventario

### Flow 4: Pagamento PayPal
1. Tap "Acquista Premium" → Inizia checkout PayPal
2. Redirect a PayPal (WebView/Browser)
3. Utente completa pagamento
4. Callback a app → Verifica pagamento (Backend)
5. Aggiorna stato premium → Sblocca contenuti

## Color Choices

### Primary Palette
- **Primary Green**: #2D7D46 (Verde cannabis/natura)
- **Secondary Green**: #4CAF50 (Accento luminoso)
- **Gold Accent**: #FFD700 (Premium/Rewards)
- **Dark Background**: #1A1A2E (Sfondo scuro)
- **Card Surface**: #252540 (Superfici elevate)

### Text Colors
- **Primary Text**: #FFFFFF (Bianco)
- **Secondary Text**: #B0B0C0 (Grigio chiaro)
- **Disabled Text**: #606080 (Grigio scuro)

### Semantic Colors
- **Success**: #4CAF50 (Verde)
- **Warning**: #FFC107 (Giallo)
- **Error**: #F44336 (Rosso)
- **Info**: #2196F3 (Blu)

### PayPal Branding
- **PayPal Blue**: #003087
- **PayPal Light Blue**: #009CDE

## Typography

- **Title**: 32pt, Bold, lineHeight 40
- **Subtitle**: 24pt, SemiBold, lineHeight 32
- **Body**: 16pt, Regular, lineHeight 24
- **Caption**: 12pt, Regular, lineHeight 16
- **Button**: 16pt, SemiBold

## Spacing System (8pt grid)
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

## Component Radius
- Buttons: 12px
- Cards: 16px
- Modals: 24px
- Input fields: 8px

## Navigation Structure

```
Tab Bar (Bottom)
├── Home (house.fill)
├── Game (gamecontroller.fill) 
├── Shop (cart.fill)
└── Profile (person.fill)

Stack Navigation
├── Home → Encyclopedia
├── Game → Paywall (Modal)
├── Shop → Item Detail
└── Profile → Settings
```

## Safe Area Considerations
- Top: Status bar + notch
- Bottom: Tab bar + home indicator
- Touch targets: minimum 44pt
- Primary actions in bottom 1/3 (thumb zone)
