# Backend

Tout ce qui ne tourne que sur le serveur : la base de données, le stockage des photos et les actions appelées par le site et l'admin. Rien ici n'est envoyé au navigateur.

| Fichier | Rôle |
| --- | --- |
| `db.ts` | Client Prisma, connecté à Neon |
| `catalog.ts` | Catalogue de la boutique, lu depuis la base et mis en cache |
| `place-order.ts` | Action `placeOrder` : enregistre une commande, prix recalculés depuis la base |
| `order-lookup.ts` | Lit une commande pour sa page de suivi (`/commande/[id]`) |
| `buy-credits.ts` | Action `buyCredits` : enregistre un achat de crédits non payé |
| `r2.ts` | Liens signés et suppression des photos sur Cloudflare R2 |
| `admin/token.ts` | Jeton de session admin (aussi utilisé par `src/proxy.ts`) |
| `admin/auth.ts` | `requireAdmin` : vérifie la session à chaque lecture |
| `admin/actions.ts` | Connexion et déconnexion de l'admin |
| `admin/products.ts` | Création et modification des produits, photos |
| `admin/purchases.ts` | Marquer un achat de crédits comme payé |
| `admin/queries.ts` | Lectures des écrans de l'admin |

Les types et les constantes partagés avec le site (prix, packs, qualités, libellés) restent dans `src/lib/`.
