# Guide de Publication iOS (Spécial Mac Ancien / Débutant)

Ce guide est conçu pour t'aider à compiler et publier **DocuMate** sur iOS en utilisant ton MacBook Pro (macOS 10.15 Catalina).

> [!WARNING]
> **Attention :** Ta version de macOS (10.15 Catalina) limite la version de Xcode installable (max Xcode 12.4).
> Les versions récentes de Capacitor et iOS requièrent souvent Xcode 14/15.
> Si tu rencontres des erreurs de compatibilité, il faudra peut-être utiliser une version plus ancienne de Capacitor ou passer par un service cloud (ex: Codemagic).

## 1. Préparer ton Mac 🛠️

Avant de commencer, tu dois installer les outils de développement. Ouvre le **Terminal** sur ton Mac (Applications > Utilitaires > Terminal) et exécute ces commandes une par une.

### A. Installer Node.js et npm
Vérifie si tu l'as déjà :
```bash
node -v
npm -v
```
Si tu obtiens une erreur, télécharge et installe la version **Node.js 16 ou 18** (compatible Catalina) depuis : [nodejs.org/download/release/](https://nodejs.org/download/release/v16.20.2/) (choisis le `.pkg`).

### B. Installer CocoaPods
CocoaPods gère les dépendances iOS natives.
```bash
sudo gem install cocoapods
```
*(Entre ton mot de passe Mac quand demandé, il ne s'affichera pas à l'écran).*

### C. Installer Xcode
Si ce n'est pas déjà fait :
1. Ouvre l'**App Store** sur ton Mac.
2. Cherche **Xcode**.
3. Si la dernière version n'est pas compatible, connecte-toi sur [developer.apple.com/download/all](https://developer.apple.com/download/all/) avec ton compte Apple ID et cherche **Xcode 12.4**.
4. Télécharge et installe-le.
5. Ouvre Xcode une fois pour accepter les conditions et installer les composants.

---

## 2. Récupérer le Projet 📂

Sur ton Mac, récupère la dernière version du code :

1. Ouvre le Terminal.
2. Clone le projet (ou pull si déjà fait) :
```bash
git clone https://github.com/DocExplain/documate.git
cd documate
git checkout app
git pull origin app
```

---

## 3. Installer les Dépendances 📦

Toujours dans le dossier `documate` sur ton Terminal :

1. Installe les librairies JS :
```bash
npm install
```

2. Compile l'app web :
```bash
npm run build
```

3. Synchronise avec iOS :
```bash
npx cap sync ios
```
*(Si cette étape échoue avec une erreur de version Capacitor/iOS, c'est ici qu'on saura si ton Mac est trop vieux).*

---

## 4. Ouvrir et Configurer dans Xcode 🍎

1. Lance la commande pour ouvrir le projet :
```bash
npx cap open ios
```
*(Cela doit ouvrir Xcode. Sinon, ouvre manuellement le fichier `ios/App/App.xcworkspace`).*

2. Dans Xcode (colonne de gauche), clique sur le projet tout en haut : **App**.
3. Dans la partie centrale, sélectionne la cible **App** (sous TARGETS).
4. Va dans l'onglet **Signing & Capabilities**.
5. Dans la section **Signing** :
   - **Team** : Sélectionne ton compte Apple Developer personnel.
   - **Bundle Identifier** : Doit être `com.documate.app` (ou celui que tu as défini sur ton compte Apple).

---

## 5. Tester sur Simulateur ou iPhone 📱

1. En haut à gauche de Xcode, sélectionne ton appareil cible (ex: "iPhone 11" ou ton iPhone branché en USB).
2. Clique sur le bouton **Play** (▶️) ou fais `Cmd + R`.
3. L'app devrait se lancer !

> [!TIP]
> Si tu as des erreurs de compilation (rouge), copie-les. C'est souvent lié à la version de Swift ou du SDK iOS trop vieux sur Catalina.

---

## 6. Créer l'Archive pour l'App Store 🚀

Si tout fonctionne et que tu es prêt à publier :

1. Sélectionne **Any iOS Device (arm64)** dans la liste des appareils en haut (au lieu du simulateur).
2. Menu **Product** > **Archive**.
3. Attends la fin de la compilation. La fenêtre "Organizer" va s'ouvrir.
4. Clique sur **Distribute App**.
5. Choisis **App Store Connect** > **Upload**.
6. Suis les étapes (Next, Next...) jusqu'à l'envoi final.

---

## ❓ En cas de problème "Version trop vieille"

Si tu ne peux pas compiler car Capacitor demande un iOS SDK plus récent :
- **Solution 1** : Utiliser [Codemagic.io](https://codemagic.io) (Gratuit 500min/mois). Tu connectes ton GitHub, et ils compilent pour toi sur des Mac récents.
- **Solution 2** : "Downgrade" Capacitor (compliqué et risqué).

Bonne chance ! 🤞
