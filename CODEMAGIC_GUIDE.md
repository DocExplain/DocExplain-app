# Guide de Compilation iOS via le Cloud (Codemagic) ☁️

Puisque ton Mac est trop ancien pour compiler les dernières versions d'iOS, nous allons utiliser **Codemagic**, un service qui prête des Mac puissants dans le cloud pour compiler ton application.

Ce guide t'explique comment configurer tout ça **gratuitement** (pour 500min/mois).

## Prérequis
- Un compte **Apple Developer** payant (99$/an).
- Ton Mac (même ancien) pour générer les certificats.

---

## Étape 1 : Générer le Certificat de Distribution (Sur ton Mac) 🔐

C'est la partie la plus "technique". Suis bien les étapes.

1. **Ouvre "Trousseaux d'accès"** (Keychain Access) sur ton Mac (Applications > Utilitaires).
2. Dans le menu en haut : **Trousseaux d'accès > Assistant de certification > Demander un certificat à une autorité de certification**.
3. Email : ton email Apple ID. Nom : DocuMate Dev. Laisse "Email de l'autorité" vide.
4. Coche **"Enregistrée sur le disque"**. Clique Continuer.
5. Sauvegarde le fichier `CertificateSigningRequest.certSigningRequest` (CSR) sur ton bureau.

6. **Va sur [developer.apple.com](https://developer.apple.com/account/resources/certificates/list)** :
   - Section **Certificates** > Clique sur `+`.
   - Choisis **Apple Distribution** (ou iOS Distribution).
   - Upload ton fichier CSR.
   - Télécharge le certificat `.cer` généré.

7. **Installe et Exporte le .p12** :
   - Double-clique sur le fichier `.cer` téléchargé. Il s'ajoute à ton Trousseaux.
   - Dans Trousseaux d'accès, trouve ce certificat (ex: "Apple Distribution: Ton Nom").
   - Fais un clic-droit dessus > **Exporter**.
   - Choisis le format `.p12`.
   - **Important :** Mets un mot de passe fort (ex: `DocuMate2024!`) et retiens-le bien !

👉 Tu as maintenant un fichier `ios_distribution.p12`.

---

## Étape 2 : Créer le Profil de Provisioning (Sur le Web) 📄

1. Toujours sur [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list) :
   - **Identifiers** > `+` > App IDs.
   - Description : `DocuMate`.
   - Bundle ID : `com.docexplain.documate` (doit être identique à celui dans ton code).
   - Valide et créé.

2. Section **Profiles** > `+` :
   - Choisis **App Store** (sous Distribution).
   - Sélectionne ton App ID `com.docexplain.documate`.
   - Sélectionne ton Certificat (celui créé à l'étape 1).
   - Nomme le profil : `DocuMate App Store`.
   - Télécharge le fichier `.mobileprovision`.

👉 Tu as maintenant un fichier `DocuMate_App_Store.mobileprovision`.

---

## Étape 3 : Configurer Codemagic 🪄

1. Crée un compte sur [codemagic.io](https://codemagic.io) avec ton GitHub.
2. Ajoute ton repository `documate`.
3. Une fois le projet importé, va dans la section **Teams > Code signing identities**.
4. Upload tes deux fichiers :
   - Le certificat `.p12` (avec son mot de passe).
   - Le profil `.mobileprovision`.

5. Retourne sur ton **Application** dans Codemagic > Onglet **Workflow Editor** (ou utilise `codemagic.yaml` si détecté).
   - Si tu utilises l'UI :
     - Build triggers: Push sur `app`.
     - Environment: Node 16+.
     - Dependency caching: Enable.
     - Distribution: iOS code signing. Sélectionne ton certificat et profil.

6. Lance un **Start new build** ! 🚀

---

## Étape 4 : Déclarer l'Export Compliance (Automatique) 🔐

Apple demande si ton app utilise du chiffrement nécessitant une autorisation d'export. Pour la plupart des apps (qui n'utilisent que HTTPS), la réponse est **non**.

**Solution automatique (déjà configurée)** :
J'ai ajouté cette clé dans `ios/App/App/Info.plist` :
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Cela indique à Apple que ton app n'utilise que du chiffrement standard et évite le blocage à chaque build.

> **Note :** Si cette clé n'est pas présente, tu devras manuellement répondre "No" à la question d'export compliance sur App Store Connect après chaque upload. Avec cette clé, c'est automatique ! ✅

---

## Étape 5 : Migration ou Nouvelle App (DocExplain-app) 🆕

Si tu crées une nouvelle application (ex: migration vers `DocExplain-app`), voici les réglages spécifiques :

1.  **Créer l'app** : Add Application > GitHub > `DocExplain/DocExplain-app`.
2.  **Variables d'Environnement (Obligatoires)** :
    
    **Nom du groupe recommandé :** `ios_credentials`
    *(Si tu crées ce groupe dans tes paramètres d'équipe, tu pourras l'importer en un clic !)*

    **Liste des variables :**
    - `VITE_API_URL` (Ton URL Vercel de prod)
    - `CM_CERTIFICATE` (Fichier .p12)
    - `CM_CERTIFICATE_PASSWORD` (Mot de passe du .p12)
    - `CM_PROVISIONING_PROFILE` (Fichier .mobileprovision)
    - `APP_STORE_CONNECT_PRIVATE_KEY` (Fichier .p8 pour upload TestFlight)
    - `APP_STORE_CONNECT_KEY_IDENTIFIER` (ID de la clé)
    - `APP_STORE_CONNECT_ISSUER_ID` (ID de l'émetteur)

3.  **Vérification** :
    - Assure-toi que les certificats sont bien disponibles (soit via le groupe importé, soit ré-uploadés).

---

## Troubleshooting : Problèmes Courants 🛠️

### ❌ "Missing export compliance"
**Cause :** La clé `ITSAppUsesNonExemptEncryption` n'est pas dans `Info.plist`.  
**Solution :** Elle est déjà ajoutée automatiquement. Assure-toi que le fichier a bien été commité et pushé avant le build.

### ❌ "Missing Beta App Information"
**Cause :** Informations de contact manquantes sur App Store Connect.  
**Solution :** Va dans TestFlight > Test Information et remplis les coordonnées (voir Étape 3 bis).

### ❌ "Beta App Description is missing"
**Cause :** Description de l'app manquante pour TestFlight.  
**Solution :** Va dans TestFlight > App Information et ajoute une description en anglais.

### ❌ "Missing 1024x1024 App Icon"
**Cause :** Icône App Store manquante ou mal formatée.  
**Solution :** Assure-toi qu'il y a une icône 1024x1024 PNG sans transparence dans Assets.xcassets.

### ⏳ "Build is still processing"
**Cause :** Apple traite encore le build uploadé.  
**Solution :** Attends 5-20min. Le build apparaîtra automatiquement dans TestFlight une fois le traitement terminé.

### 🔄 Le build n'apparaît pas dans Codemagic
**Cause :** Le build n'a pas été déclenché automatiquement.  
**Solution :** Vérifie que tu as bien pushé sur la branche `main` (configurée dans `codemagic.yaml`).

