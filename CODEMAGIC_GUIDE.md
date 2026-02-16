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
   - Bundle ID : `com.documate.app` (doit être identique à celui dans ton code).
   - Valide et créé.

2. Section **Profiles** > `+` :
   - Choisis **App Store** (sous Distribution).
   - Sélectionne ton App ID `com.documate.app`.
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

## Étape 4 : Récupérer et Uploader l'IPA 📲

A la fin du build (environ 10-15min), Codemagic te donnera un fichier **`.ipa`**.

Pour l'envoyer sur l'App Store :
1. Télécharge l'app **Transporter** sur le Mac App Store (gratuit).
2. Connecte-toi avec ton compte Apple.
3. Glisse le fichier `.ipa` dans Transporter.
4. Clique sur **Livrer** (Deliver).

C'est fini ! L'app sera dispo dans TestFlight / App Store Connect sous 30min. 🎉
