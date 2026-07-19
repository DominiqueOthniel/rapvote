# RapVote · N£₩ St@r ₽uN€h

Compétition rap (New Star Punch) avec parcours d'épisodes, notation jury (3 profils), votes public Orange Money / MTN Money, split 50/50 artiste / organisation.

## Démarrage

```bash
npm install
npm run db:seed
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

## Parcours

13 étapes dynamiques (E0 à GF) : présentation, freestyle, thèmes, feats, remix, clash, hit, demi-finales, grande finale.

- Page publique : `/phases`
- Détail d'une étape : `/phases/[number]`
- Resync DB : `npm run db:sync-parcours`

## Admin

- URL: `/admin/login`
- Email: `admin@rapvote.cm`
- Mot de passe: `admin123`

## Jury

- URL: `/jury/login`
- `jury1@rapvote.cm` · `jury2@rapvote.cm` · `jury3@rapvote.cm`
- Mot de passe: `jury123`
- Notes sur 10, moyenne auto, 85% du score final (votes 15%)

## Paiements Campay

Sans clés Campay, les votes passent en mode démo (confirmation automatique).

Dans `.env` :

```
CAMPAY_USERNAME=...
CAMPAY_PASSWORD=...
CAMPAY_BASE_URL=https://www.campay.net/api
```

## Stack

Next.js, Prisma, SQLite (local) / Turso libSQL (Netlify), Campay (Orange Money + MTN Money Cameroun)

## Déploiement Netlify

SQLite fichier local ne fonctionne pas sur Netlify (serverless). Utilise Turso :

1. Crée une base sur [turso.tech](https://turso.tech)
2. Dans Netlify → Site settings → Environment variables :
   - `TURSO_DATABASE_URL` = `libsql://...`
   - `TURSO_AUTH_TOKEN` = ton token
   - `AUTH_SECRET` = une longue chaîne aléatoire
   - `DATABASE_URL` = la même URL Turso (pour Prisma CLI)
3. Applique le schéma puis seed depuis ta machine :

```bash
set TURSO_DATABASE_URL=libsql://...
set TURSO_AUTH_TOKEN=...
set DATABASE_URL=%TURSO_DATABASE_URL%
npx prisma db push
npm run db:seed
```

4. Redeploy le site Netlify
