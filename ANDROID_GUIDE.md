# Guide de Publication Android (Google Play) 🤖

Puisque nous utilisons **Capacitor**, nous allons générer un **Android App Bundle (.aab)** via Android Studio.

## Étape 1 : Corriger l'ID sur Google Play (Option A)
Ton application iOS et ton code Android utilisent l'ID : **`com.docexplain.documate`**.
C'est l'ID officiel.

1.  Connecte-toi à la **Google Play Console**.
2.  Si tu as une fiche "Brouillon" avec l'ID `com.documate.app`, supprime-la (ou ignore-la).
3.  Clique sur **Créer une application**.
4.  Nom de l'application : **DocuMate AI**.
5.  Langue par défaut : **Français** (ou Anglais).
6.  Application ou jeu : **Application**.
7.  Gratuite ou payante : **Gratuite**.
8.  Coche les cases obligatoires (Lois, Conditions d'utilisation).
9.  Clique sur **Créer l'application**.

✅ L'ID sera défini automatiquement lors du premier upload de l'AAB (qui contient `com.docexplain.documate`).

---

## Étape 2 : Préparer Android Studio 🛠️

1.  Ouvre **Android Studio**.
2.  Clique sur **Open** et sélectionne le dossier `android` dans ton projet (`c:\Users\nicol\Downloads\documate\android`).
3.  Laisse Android Studio synchroniser le projet (ça peut prendre quelques minutes, regarde la barre en bas).

---

## Étape 3 : Générer la Clé de Signature (Keystore) 🔑

Pour publier, il faut signer l'application.

1.  Dans Android Studio, menu : **Build > Generate Signed Bundle / APK**.
2.  Choisis **Android App Bundle** (Recommandé) et clique sur Next.
3.  Sous "Key store path", clique sur **Create new...**.
4.  Remplis le formulaire :
    - **Key store path** : Choisis un dossier sûr (ex: Documents/DocuMate) et nomme le fichier `upload-keystore.jks`.
    - **Password** : Choisis un mot de passe fort (ex: `DocuMateAndroid2024!`). Confirme-le.
    - **Alias** : `upload`.
    - **Key Password** : Même mot de passe.
    - **Certificate** : Remplis au moins "First and Last Name" (ex: DocuMate Dev) et "Country Code" (FR ou CH).
5.  Clique sur OK.
6.  De retour sur la fenêtre, coche "Remember passwords". Clique sur Next.
7.  Choisis **release** et clique sur **Create**.

⏳ Android Studio va compiler. Une fois fini, une petite fenêtre apparaîtra en bas à droite ("Locate").

---

## Étape 4 : Uploader sur Google Play 🚀

1.  Retourne sur la **Google Play Console** > Ton appli **DocuMate AI**.
2.  Dans le menu de gauche : **Tests > Tests internes** (pour commencer).
3.  Clique sur **Créer une version**.
4.  "App Bundle" : Glisse le fichier `.aab` que Android Studio a généré (il est dans `android/app/release/app-release.aab`).
5.  Donne un nom à la version (ex: `1.0 Initial Release`).
6.  Clique sur **Suivant** et **Enregistrer**.

---

## Étape 5 : Remplir la Fiche Play Store (Captures d'écran) 📸

Google demande des screenshots précis. Voici ce qu'il te faut :

### Champs à compléter (Fiche > Présentation de la version principale)
- **Nom** : DocuMate AI
- **Description courte** : Scannez, résumez et analysez vos documents instantanément avec l'IA.
- **Description complète** : DocuMate transforme votre téléphone en un scanner intelligent assisté par IA. Numérisez des documents, extrayez le texte et obtenez des analyses détaillées en quelques secondes.

### Images requises (Tailles exactes)
Tu peux utiliser les screenshots de l'émulateur ou les générer.

1.  **Icône** : 512 x 512 px (PNG).
2.  **Image présente** : 1024 x 500 px (JPG ou PNG).
3.  **Téléphone (x2 minimum)** : 1080 x 1920 px (Portrait) OU 1920 x 1080 px (Paysage).
4.  **Tablette 7 pouces (x1 minimum)** : Idem.
5.  **Tablette 10 pouces (x1 minimum)** : Idem.

💡 *Astuce : Si tu n'as pas de tablette, tu purras reprendre les screenshots téléphone et les redimensionner, mais l'idéal est de faire des "mockups" propres.*

---
