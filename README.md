# JobPulse France

> Des offres tech françaises détectées à la source, classées selon le profil du candidat et envoyées sur Slack.

[Voir l'application](https://jobpulse-france.vercel.app) · [Signaler un problème](https://github.com/Shogun44-GT/jobpulse-france/issues)

## Pourquoi JobPulse ?

Les meilleures offres de stage, d'alternance et de premier emploi reçoivent rapidement beaucoup de candidatures. JobPulse interroge directement plusieurs sources officielles et ATS publics, élimine les doublons, calcule un score personnalisé et envoie les nouvelles offres pertinentes sur Slack.

## Fonctionnalités

- Collecte multi-sources : France Travail, La Bonne Alternance, Greenhouse, Lever, Ashby et SmartRecruiters
- Synchronisation planifiée source par source pour éviter les timeouts
- Déduplication exacte et floue entre plusieurs plateformes
- Recherche et filtres par contrat, ville et télétravail
- Connexion Google et espace personnel
- Profil candidat : métiers, compétences, parcours, localisation et score minimum
- Import sécurisé du CV PDF avec extraction locale du texte
- Score de compatibilité enrichi par le profil et le CV
- Connexion Slack OAuth individuelle et alertes personnalisées
- Rappels avant la date limite de candidature
- Suivi des candidatures avec statuts et notes
- Génération d'accroche, de lettre et de message LinkedIn avec la clé Gemini personnelle de l'utilisateur

## Protection des données

- Le PDF original du CV est analysé en mémoire puis supprimé immédiatement.
- Le texte extrait du CV et les webhooks Slack sont chiffrés en AES-256-GCM avant stockage.
- Des sous-clés indépendantes sont dérivées par usage (Slack, Gemini et CV) avec HKDF.
- Les clés Gemini sont personnelles, chiffrées et jamais envoyées au navigateur.
- Les utilisateurs peuvent remplacer ou supprimer leur CV et leur clé Gemini.
- Aucun secret ne doit être ajouté au dépôt Git.

## Architecture

| Composant | Technologie |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript |
| Authentification | Auth.js / Google OAuth |
| Base de données | PostgreSQL / Neon |
| Validation | Zod |
| Extraction PDF | unpdf |
| Notifications | Slack OAuth et Incoming Webhooks |
| IA | Gemini avec clé personnelle de l'utilisateur |
| Hébergement | Vercel |
| Planification | GitHub Actions |

## Sources d'offres

| Source | Type | Configuration |
| --- | --- | --- |
| France Travail | API OAuth2 officielle | Identifiants développeur requis |
| La Bonne Alternance | API officielle | Clé API requise |
| Greenhouse | ATS public | Liste d'entreprises |
| Lever | ATS public | Liste d'entreprises |
| Ashby | ATS public | Liste d'entreprises |
| SmartRecruiters | ATS public | Liste d'entreprises |

## Installation locale

### Prérequis

- Node.js 20 ou supérieur
- npm
- Docker Desktop

### Démarrage

```bash
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

L'application est ensuite accessible sur `http://localhost:3000`.

## Variables d'environnement

Crée un fichier `.env.local`. Ne publie jamais ses valeurs.

### Base et sécurité

```env
POSTGRES_URL=
AUTH_SECRET=
CRON_SECRET=
INGEST_API_KEY=
SLACK_TOKEN_ENCRYPTION_KEY=
APP_URL=http://localhost:3000
```

`SLACK_TOKEN_ENCRYPTION_KEY` doit contenir exactement 64 caractères hexadécimaux. C'est une clé maître : l'application en dérive une clé différente pour Slack, Gemini et les CV.

### Google OAuth

```env
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

### Slack OAuth

```env
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_WEBHOOK_URL=
SLACK_CONTRACTS=stage,alternance,graduate
```

### France Travail

```env
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=
FRANCE_TRAVAIL_TOKEN_URL=
FRANCE_TRAVAIL_API_URL=
```

### Autres sources

```env
LA_BONNE_ALTERNANCE_API_KEY=
LA_BONNE_ALTERNANCE_ROMES=
GREENHOUSE_BOARDS=
LEVER_SITES=
ASHBY_BOARDS=
SMARTRECRUITERS_COMPANIES=
```

Une source non configurée est ignorée sans bloquer les autres.

## Commandes utiles

```bash
npm run dev        # serveur de développement
npm run build      # compilation de production
npm test           # tests du dédoublonnage, du matching et de la sécurité
npm run db:migrate # migrations PostgreSQL
npm run db:seed    # données locales de démonstration
npm run secrets:rotate # rechiffre les secrets existants avec les sous-clés dédiées
```

## Synchronisation manuelle

```bash
curl "http://localhost:3000/api/cron/sync?source=france-travail" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Sources acceptées : `france-travail`, `la-bonne-alternance`, `greenhouse`, `lever`, `ashby`, `smartrecruiters` et `notifications`.

## Déploiement

1. Relier le dépôt GitHub à Vercel.
2. Relier une base Neon au projet.
3. Ajouter les variables d'environnement dans Vercel.
4. Exécuter les migrations sur la base de production.
5. Configurer les secrets GitHub `JOBPULSE_CRON_URL` et `JOBPULSE_CRON_SECRET`.
6. Vérifier le workflow dans l'onglet **Actions**.

La page publique n'affiche jamais les données de démonstration en production. Chaque exécution du cron est conservée pendant 30 jours dans `sync_runs` pour faciliter le diagnostic.

## État du projet

JobPulse est en phase de bêta publique contrôlée. Les retours prioritaires concernent la qualité des offres, la pertinence du score et la fiabilité des alertes.

## Auteur

Développé par [Shogun44-GT](https://github.com/Shogun44-GT).
