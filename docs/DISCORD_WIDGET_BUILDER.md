# Discord Widget Builder

Le endpoint `/api/discord-widget` renvoie un JSON au format attendu par le widget Discord :

```json
{
  "data": {
    "dynamic": [
      { "type": 1, "name": "title", "value": "YourName" },
      { "type": 1, "name": "stat1_label", "value": "Energie" }
    ]
  }
}
```

Dans le builder, crée les champs suivants dans les données dynamiques :

- `title`
- `subtitle`
- `stat1_label`
- `stat1_value`
- `stat2_label`
- `stat2_value`
- `stat3_label`
- `stat3_value`
- `stat4_label`
- `stat4_value`
- `stat5_label`
- `stat5_value`
- `stat6_label`
- `stat6_value`
- `footer`

Pour afficher une valeur, utilise le type **User Data** puis choisis le nom du champ.

Ne mets pas `{{stat1_value}}` dans un champ texte simple si le builder affiche les accolades au lieu de la valeur.

Valeurs par défaut du projet :

| Champ | Label | Valeur |
|---|---|---|
| stat1 | Energie | Stamina HoYoLAB |
| stat2 | Jours connexion | `active_days` |
| stat3 | Succes | `achievement_num` |
| stat4 | Tresors ouverts | `chest_num` |
| stat5 | Univers simule | Score Univers simulé |
| stat6 | Boss hebdo | Boss hebdomadaires |
