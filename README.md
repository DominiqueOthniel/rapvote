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

Next.js, Prisma, SQLite, Campay (Orange Money + MTN Money Cameroun)
