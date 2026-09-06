# JobPulse France

Un agrégateur rapide d'offres de stage, d'alternance et de premier emploi tech en France. Le dépôt contient maintenant le socle et le premier connecteur officiel.

## Ce qui fonctionne déjà

- Dashboard sombre et responsive inspiré du produit de référence
- Base PostgreSQL pour les sources, offres, utilisateurs, préférences et alertes
- Route sécurisée `POST /api/ingest`
- Validation stricte des offres avec Zod
- Déduplication exacte par couple source/identifiant externe
- Route de lecture `GET /api/jobs`
- Jeu de données visuel de démonstration
- Connecteur OAuth2 France Travail et normalisation des offres
- Connecteur officiel La Bonne Alternance, optionnel tant que sa clé API n'est pas configurée
- Exclusion des annonces France Travail renvoyées par La Bonne Alternance pour éviter les doubles alertes
- Dédoublonnage flou inter-sources par similarité entreprise, titre et localisation
- Connecteurs ATS publics Greenhouse, Lever, Ashby et SmartRecruiters, configurables par entreprise
- Synchronisations séparées par source afin de respecter la durée maximale des fonctions Vercel
- Chemin rapide pour les offres déjà connues : le dédoublonnage flou est réservé aux nouvelles offres
- Conservation des doublons en base pour l'audit, sans double affichage ni double alerte Slack
- Recherches France Travail ciblées stage, alternance et apprentissage dans l'informatique
- Synchronisation protégée par `CRON_SECRET`, planifiée toutes les 10 minutes avec GitHub Actions
- Recherche réelle, filtres contrat/ville/télétravail et compteur dynamique
- Test du webhook Slack via `POST /api/slack/test`
- File d'envoi Slack persistante avec trois tentatives et zéro notification en double
- Alertes Slack limitées aux contrats configurés dans `SLACK_CONTRACTS`
- Connexion publique Google avec sessions JWT sécurisées
- Création ou mise à jour du compte utilisateur dans PostgreSQL à chaque connexion
- Pages protégées pour le profil, les candidatures et la future connexion Slack individuelle
- Profil candidat complet enregistré dans PostgreSQL : métiers, compétences, parcours, villes, contrats, télétravail et score minimal
- Suivi personnel des candidatures avec statuts, notes, lien vers l'offre et suppression sécurisée
- Ajout d'une offre depuis le marque-page du dashboard, sans doublon par utilisateur
- Connexion Slack OAuth individuelle avec choix du canal pendant l'autorisation
- Chiffrement AES-256-GCM des webhooks Slack et alertes filtrées par profil utilisateur
- Score de compatibilité réel et explicable basé sur le métier, les compétences, le contrat, la ville et le télétravail
- Respect du score minimum du profil avant l'envoi d'une alerte Slack individuelle

Le scoring affiché pour les utilisateurs connectés est calculé à partir de leur profil. Les utilisateurs sans profil ne voient aucun pourcentage artificiel.

## Lancement local

Prérequis : Node.js 20+, npm et Docker Desktop.

```bash
cp .env.example .env.local
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Ouvre ensuite `http://localhost:3000`.

## Activer France Travail

Crée une application sur le portail France Travail, active l'API des offres d'emploi puis copie le client ID et le secret dans `.env.local`. Les URL sont configurables dans ce fichier afin de pouvoir les modifier sans toucher au code si France Travail fait évoluer son portail.

Pour déclencher une synchronisation manuelle :

```bash
curl http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer replace-with-another-long-random-secret"
```

Sans PostgreSQL configuré, le dashboard conserve ses cartes de démonstration. Dès que la base et les identifiants France Travail sont actifs, les offres réelles les remplacent.

## Activer La Bonne Alternance

Demande une clé dans l'espace développeur de l'API Apprentissage, puis ajoute-la dans `LA_BONNE_ALTERNANCE_API_KEY`. Le connecteur recherche par défaut les métiers informatiques ROME définis dans `LA_BONNE_ALTERNANCE_ROMES`. Sans clé, cette source est simplement indiquée comme `skipped` dans la réponse du cron et France Travail continue de fonctionner.

## Tester Slack

Après avoir ajouté `SLACK_WEBHOOK_URL`, redémarre le serveur puis appelle la route de test avec le même `CRON_SECRET` que le cron. Un message « Connexion Slack réussie » doit apparaître dans le canal choisi. Les nouvelles offres correspondant à `SLACK_CONTRACTS` sont ensuite mises en file et envoyées pendant les synchronisations. Les offres déjà présentes avant cette version ne sont volontairement pas envoyées afin d'éviter un afflux initial.

### Slack individuel

Crée une Slack App, active **Incoming Webhooks** et ajoute l'URL de redirection `https://jobpulse-france.vercel.app/api/slack/callback`. Configure ensuite `APP_URL`, `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` et une clé hexadécimale de 64 caractères dans `SLACK_TOKEN_ENCRYPTION_KEY`. La connexion demande uniquement le scope `incoming-webhook`, qui laisse l'utilisateur choisir le canal pendant l'autorisation.

## Tester l'ingestion

Remplace la clé ci-dessous par celle de `.env.local` :

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer replace-with-a-long-random-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "ft-123456",
    "source": "france-travail",
    "company": "Exemple SAS",
    "title": "Stage développeur TypeScript",
    "description": "Développement d une application Next.js",
    "location": "Paris",
    "contract": "stage",
    "remote": true,
    "applyUrl": "https://example.com/jobs/ft-123456",
    "publishedAt": "2026-09-04T18:00:00.000Z"
  }'
```

Deux appels avec le même `source` et `externalId` mettent à jour `last_seen_at` au lieu de créer un doublon.

## Déploiement prévu

La cible est Vercel Hobby avec Neon Postgres. GitHub Actions appelle la route de synchronisation toutes les 10 minutes, car le cron Vercel Hobby est limité à une exécution quotidienne. Les secrets GitHub `JOBPULSE_CRON_URL` et `JOBPULSE_CRON_SECRET` doivent être configurés après le déploiement.

## Prochaine étape

Ajouter Greenhouse, Lever, Ashby et SmartRecruiters.
