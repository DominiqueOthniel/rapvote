# ForTheCulture · N£₩ St@r ₽uN€h

Compétition rap (New Star Punch) avec parcours d'épisodes, notation jury (3 profils), votes public Orange Money / MTN Money, split 50/50 artiste / organisation.

## Démarrage

1. Crée un projet gratuit sur [supabase.com](https://supabase.com)
2. Copie les URLs Postgres (Settings → Database) dans `.env` :

```env
# Pooler (Transaction) port 6543, pour l'app / Netlify
DATABASE_URL="postgresql://postgres.XXXX:MOTDEPASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct port 5432, pour prisma migrate / db push
DIRECT_URL="postgresql://postgres.XXXX:MOTDEPASSE@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

AUTH_SECRET="change-moi-par-une-longue-chaine-aleatoire"
```

3. Installe et initialise :

```bash
npm install
npx prisma migrate deploy
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
- Email: `admin@fortheculture.cm`
- Mot de passe: `admin123`

## Jury

- URL: `/jury/login`
- `jury1@fortheculture.cm` · `jury2@fortheculture.cm` · `jury3@fortheculture.cm`
- Mot de passe: `jury123`
- Notes sur 10, moyenne auto, 85% du score final (votes 15%)

## Déploiement Netlify

Dans **Site settings → Environment variables** :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL pooler Supabase (`:6543` + `?pgbouncer=true`) |
| `DIRECT_URL` | URL directe Supabase (`:5432`) |
| `AUTH_SECRET` | chaîne aléatoire longue |

Puis :

```bash
npx prisma migrate deploy
npm run db:seed
```

Redeploy le site.

## Paiements Campay

Sans clés Campay, les votes passent en mode démo (confirmation automatique).

```
CAMPAY_USERNAME=...
CAMPAY_PASSWORD=...
CAMPAY_BASE_URL=https://www.campay.net/api
```

## Stack

Next.js, Prisma, Supabase Postgres, Campay (Orange Money + MTN Money Cameroun)
