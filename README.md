# HSR HoYoLAB Discord Profile Widget

Widget Discord Profile dynamique pour afficher des informations Honkai: Star Rail depuis HoYoLAB.

Le projet récupère les données HoYoLAB, les transforme en JSON compatible avec un Discord Profile Widget, puis pousse ce JSON vers Discord.

Le projet supporte deux méthodes :

1. **Méthode recommandée : agent Windows Playwright**
   - Un vrai navigateur Chromium est lancé.
   - Tu te connectes à HoYoLAB une fois.
   - L'agent intercepte les réponses réseau HoYoLAB.
   - Il envoie les données à l'API Debian.
   - C'est la méthode la plus stable contre les problèmes de cookies.

2. **Méthode alternative : cURL HoYoLAB sur Debian**
   - Tu copies les requêtes HoYoLAB depuis DevTools.
   - Debian rejoue les cURL régulièrement.
   - Ça marche, mais les cookies peuvent expirer ou devenir invalides.

Aucun token, cookie, secret, UID personnel ou ID Discord réel ne doit être commit dans ce repo public.

---

## Résultat affiché

Par défaut, le widget affiche :

| Case | Label | Source HoYoLAB |
|---|---|---|
| 1 | Energie | `/hkrpg/api/note` |
| 2 | Jours connexion | `/hkrpg/api/index` |
| 3 | Succes | `/hkrpg/api/index` |
| 4 | Tresors ouverts | `/hkrpg/api/index` |
| 5 | Univers simule | `/hkrpg/api/note` |
| 6 | Boss hebdo | `/hkrpg/api/note` |

Les noms dynamiques envoyés à Discord sont :

```text
title
subtitle
stat1_label
stat1_value
stat2_label
stat2_value
stat3_label
stat3_value
stat4_label
stat4_value
stat5_label
stat5_value
stat6_label
stat6_value
footer



---

## Note sur le refresh HoYoLAB

L agent Windows force un vrai refresh de la page HSR a chaque cycle :

```text
1. navigation avec parametre anti-cache _refresh
2. reload navigateur
3. touche F5 en fallback
```

C est necessaire car HoYoLAB peut garder la page ouverte sans renvoyer les nouvelles reponses /note et /index.
