# Guide de Configuration Production (AdMob & RevenueCat) 🌐

Ce guide explique comment récupérer les informations nécessaires et configurer vos services pour la production.

---

## 1. AdMob : Obtenir les IDs Android 📱

Pour activer les publicités sur Android, vous devez créer deux nouveaux blocs d'annonces.

1.  Connectez-vous à [AdMob](https://apps.admob.com/).
2.  Allez dans **Applications** > **DocuMate AI (Android)**.
3.  Dans le menu de gauche, cliquez sur **Blocs d'annonces**.
4.  Cliquez sur **Ajouter un bloc d'annonces**.
5.  **Pour l'Interstitiel** : 
    - Choisissez **Interstitiel**.
    - Nom du bloc : `Interstitial_Android_Main`.
    - Cliquez sur **Créer un bloc d'annonces**.
    - Copiez le code (format : `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`).
6.  **Pour la Récompense (Rewarded)** :
    - Cliquez sur **Ajouter un bloc d'annonces**.
    - Choisissez **Annonce avec récompense**.
    - Nom du bloc : `Reward_Android_Main`.
    - Valeur de la récompense : `1`.
    - Élément : `Scan` ou `Crédit`.
    - Cliquez sur **Créer un bloc d'annonces**.
    - Copiez le code.

---

## 2. RevenueCat : Configurer Android (Google Play) 🤖

Pour que RevenueCat puisse valider les abonnements Android, il a besoin d'un "Compte de Service".

1.  **Sur Google Cloud Console** :
    - Allez dans [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts).
    - Sélectionnez votre projet Android.
    - Cliquez sur **Create Service Account**.
    - Nommez-le `revenuecat-access` et donnez-lui le rôle **Owner** (ou plus précisément *Pub/Sub Admin* et *Google Play Billing*).
    - Une fois créé, cliquez sur les 3 points (Actions) > **Manage Keys**.
    - Cliquez sur **Add Key** > **Create new key** > **JSON**.
    - Le fichier sera téléchargé sur votre ordinateur.
2.  **Sur la Google Play Console** :
    - Allez dans **Configuration** > **Accès aux API**.
    - Vous devriez voir le compte de service que vous venez de créer. Cliquez sur **Accorder l'accès**.
    - Donnez les permissions de "Gestion de l'application" et "Afficher les données financières".
3.  **Sur RevenueCat Dashboard** :
    - Allez dans **Project Settings** > **Apps** > **Android**.
    - Sous **Google Play Service Account JSON**, importez le fichier JSON téléchargé à l'étape 1.

---

## 3. RevenueCat : Configurer iOS (Apple) 🍎

1.  **Sur App Store Connect** :
    - Allez dans **Mes applications** > **documate**.
    - Menu de gauche : **Abonnements** > **Paramètres**.
    - Copiez le **Secret partagé propre à l'application** (Shared Secret).
2.  **Sur RevenueCat Dashboard** :
    - Allez dans **Project Settings** > **Apps** > **iOS**.
    - Collez le code dans le champ **App Store Shared Secret**.

---

## 4. RevenueCat : Vérifier les Offres (Offerings) 💎

Le code de l'application attend une structure précise :

1.  Allez dans **Entitlements**.
2.  Vérifiez qu'il existe un entitlement nommé : **`DocExplain Premium`** (exactement).
3.  Allez dans **Offerings**.
4.  Vérifiez que vous avez un offering nommé **`default`** contenant vos packages (Hebdomadaire, Mensuel, Annuel).
5.  Chaque package doit être lié au produit correspondant sur l'App Store et le Play Store.

---

## 5. Fichier app-ads.txt (Anti-fraude) 🛡️

Indispensable pour toucher vos revenus publicitaires.

1.  **Sur votre site web** :
    - Copiez le contenu de votre fichier `app-ads.txt` (trouvé dans AdMob > Paramètres > app-ads.txt).
    - Publiez-le à l'adresse suivante : `https://documate.app/app-ads.txt`.
2.  **Sur la Google Play Console (Pour le crawler)** :
    - Allez dans **Croissance** (Grow) > **Présence sur le Store** > **Paramètres du Store**.
    - Dans la section **Coordonnées de la fiche du store**, remplissez le champ **Site Web** avec : `https://documate.app`.
    - Google utilisera cette adresse pour aller chercher automatiquement le fichier `/app-ads.txt`.
3.  **Sur l'App Store Connect** :
    - Allez dans la fiche de votre application.
    - Remplissez le champ **URL de l'assistance** (Marketing URL) avec `https://documate.app`.
