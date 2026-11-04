# ArtSyde

> Wear the curse.

Boutique en ligne de t-shirts personnalisés de style manga. L'identité de la marque est décrite dans [BRAND.md](./BRAND.md).

## Structure

Le projet est un monorepo (Turborepo + pnpm) qui contient deux applications Next.js et deux packages partagés.

```
apps/
  shop/     Boutique publique (port 3000) : catalogue, t-shirt 3D, designs clients, panier
  admin/    Monitoring privé (port 3001) : commandes, catalogue, statistiques
packages/
  db/       Prisma + schéma de la base PostgreSQL (Neon), client partagé
  ui/       Thème ArtSyde (couleurs, polices) et composants communs (logo…)
```

Les deux apps importent `@artsyde/db` et `@artsyde/ui`, donc un changement de schéma ou de design est visible des deux côtés.

## Démarrer

Il faut Node.js 20.9 ou plus récent et pnpm (`npm install -g pnpm`).

```bash
pnpm install
cp .env.example .env     # puis colle tes URLs Neon dans .env
pnpm db:migrate          # crée les tables dans Neon (demande un nom de migration, ex. "init")
pnpm dev                 # lance la boutique et le monitoring en même temps
```

La boutique est sur http://localhost:3000 et le monitoring sur http://localhost:3001. Pour lancer une seule app : `pnpm dev:shop` ou `pnpm dev:admin`.

## Base de données (Neon)

Dans la console Neon, choisis une région en Europe (la plus proche de la Côte d'Ivoire). Le fichier `.env` a besoin de deux URLs : `DATABASE_URL`, la connexion poolée (son hôte contient `-pooler`), utilisée par les apps, et `DIRECT_URL`, la connexion directe, utilisée par Prisma pour les migrations.

Les prix sont stockés en francs CFA (XOF), en nombres entiers.

## Commandes utiles

| Commande | Rôle |
|---|---|
| `pnpm dev` | Lance les deux apps en mode développement |
| `pnpm build` | Compile les deux apps pour la production |
| `pnpm typecheck` | Vérifie les types TypeScript partout |
| `pnpm db:migrate` | Applique les changements du schéma Prisma à la base |
| `pnpm db:studio` | Ouvre une interface pour voir et modifier les données |
