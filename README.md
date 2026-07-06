# HSR HoYoLAB Discord Profile Widget

Widget Discord Profile dynamique pour Honkai: Star Rail, alimenté par HoYoLAB.

Le but du projet est simple :

```text
HoYoLAB → API locale Debian → JSON Discord Widget → profil Discord
```

Le projet peut fonctionner avec deux méthodes :

1. **Méthode recommandée : agent Windows Playwright**
   - un vrai Chromium s’ouvre ;
   - tu te connectes à HoYoLAB une fois ;
   - l’agent intercepte les requêtes HoYoLAB `/note` et `/index` ;
   - il envoie les données à Debian via `POST /api/push-hoyo`.

2. **Méthode alternative : cURL HoYoLAB**
   - tu copies les requêtes HoYoLAB depuis DevTools ;
   - Debian les rejoue avec des scripts bash ;
   - c’est plus fragile car les cookies HoYoLAB peuvent expirer.

Aucun token, cookie, secret ou identifiant personnel réel ne doit être publié dans ce repo.

---

## Ce que le widget affiche

Par défaut, le widget utilise 6 cases :

| Case | Label | Valeur | Source |
|---|---|---|---|
| 1 | Energie | `current_stamina/max_stamina` | `/hkrpg/api/note` |
| 2 | Jours connexion | `active_days` | `/hkrpg/api/index` |
| 3 | Succes | `achievement_num` | `/hkrpg/api/index` |
| 4 | Tresors ouverts | `chest_num` | `/hkrpg/api/index` |
| 5 | Univers simule | `current_rogue_score/max_rogue_score` | `/hkrpg/api/note` |
| 6 | Boss hebdo | `weekly_cocoon_cnt/weekly_cocoon_limit` | `/hkrpg/api/note` |

Les champs dynamiques envoyés à Discord sont :

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
```

---

## Architecture avec agent Windows

```text
Page HoYoLAB HSR
       ↓
Chromium Playwright sur Windows
       ↓
agent.js détecte /hkrpg/api/note et /hkrpg/api/index
       ↓
POST http://DEBIAN_IP/api/push-hoyo
       ↓
API Debian Node/Express
       ↓
GET /api/discord-widget
       ↓
scripts/push-discord-widget.sh
       ↓
PATCH Discord API
       ↓
Widget visible sur le profil Discord
```

---

## Architecture sans agent Windows

```text
Navigateur → DevTools → Copy as cURL
       ↓
hoyo-note-curl.sh / hoyo-index-curl.sh
       ↓
scripts/fetch-hoyo.sh
       ↓
API Debian Node/Express
       ↓
GET /api/discord-widget
       ↓
PATCH Discord API
```

---

## Fichiers importants

```text
src/index.ts
  API Express. Reçoit les données HoYoLAB, les stocke, puis construit le JSON Discord.

.env
  Configuration privée Debian. Ne jamais commit.

.env.example
  Exemple public sans vrais secrets.

data/hoyo-raw.json
  Dernière réponse HoYoLAB /note.

data/hoyo-index.json
  Dernière réponse HoYoLAB /index.

data/updated-at.txt
  Date de dernière mise à jour /note.

data/index-updated-at.txt
  Date de dernière mise à jour /index.

scripts/push-discord-widget.sh
  Envoie le JSON du widget vers l’API Discord.

scripts/push-discord-loop.sh
  Relance le push Discord en boucle.

scripts/fetch-hoyo.sh
  Méthode alternative cURL HoYoLAB.

scripts/fetch-loop.sh
  Boucle pour fetch HoYoLAB avec cURL.

windows-agent/agent.js
  Agent Playwright Windows.

windows-agent/start-agent.bat
  Lanceur Windows avec boucle de relance.

windows-agent/install-task.ps1
  Crée une tâche planifiée Windows.

windows-agent/push-secret.txt
  Secret local Windows. Ne jamais commit.

windows-agent/config.json
  Config locale Windows. Ne jamais commit.
```

---

## Sécurité

Ne commit jamais :

```text
.env
*.log
data/*.json
data/*.txt
hoyo-curl.sh
hoyo-note-curl.sh
hoyo-index-curl.sh
windows-agent/config.json
windows-agent/push-secret.txt
windows-agent/hoyolab-profile/
node_modules/
```

Ces fichiers peuvent contenir :

```text
Discord bot token
PUSH_SECRET
cookies HoYoLAB
session navigateur HoYoLAB
UID personnel
IP locale
ID Discord
```

Si un token, cookie ou secret est affiché dans un screenshot ou envoyé dans un repo public, il faut le régénérer.

---

# Installation Debian

## 1. Installer les prérequis

```bash
sudo apt update
sudo apt install -y curl git nginx nodejs npm unzip
sudo npm install -g pm2
```

Vérifie Node :

```bash
node -v
npm -v
```

Node 18+ est recommandé.

---

## 2. Cloner le repo

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/hsr-hoyolab-discord-widget.git
cd hsr-hoyolab-discord-widget
npm install
cp .env.example .env
```

---

## 3. Configurer `.env`

```bash
nano .env
```

Exemple :

```env
PORT=3000

HSR_UID=YOUR_HSR_UID
HSR_REGION=prod_official_eur
HSR_USERNAME=YOUR_HSR_USERNAME

PUSH_SECRET=CHANGE_ME

DISCORD_APP_ID=YOUR_DISCORD_APPLICATION_ID
DISCORD_USER_ID=YOUR_DISCORD_USER_ID
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
```

Génère un vrai `PUSH_SECRET` :

```bash
openssl rand -hex 32
```

Mets le résultat dans `.env`.

---

## 4. Lancer l’API

Test manuel :

```bash
npm run dev
```

Dans un autre terminal :

```bash
curl http://127.0.0.1:3000/
```

Résultat attendu :

```json
{"status":"ok","service":"hsr-widget-api"}
```

---

## 5. Lancer l’API avec PM2

```bash
pm2 start npm --name hsr-widget-api -- run dev
pm2 save
pm2 status
```

Logs :

```bash
pm2 logs hsr-widget-api --lines 50
```

Démarrage automatique après reboot Debian :

```bash
pm2 startup
pm2 save
```

Si PM2 affiche une commande `sudo env PATH=... pm2 startup ...`, copie-la, exécute-la, puis refais :

```bash
pm2 save
```

---

# Nginx

Nginx permet d’utiliser :

```text
http://YOUR_DEBIAN_IP/api/discord-widget
```

au lieu de :

```text
http://YOUR_DEBIAN_IP:3000/api/discord-widget
```

Exemple de config :

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Installation :

```bash
sudo nano /etc/nginx/sites-available/hsr-widget
sudo ln -sf /etc/nginx/sites-available/hsr-widget /etc/nginx/sites-enabled/hsr-widget
sudo nginx -t
sudo systemctl reload nginx
```

Test :

```bash
curl http://127.0.0.1/
curl http://127.0.0.1/api/discord-widget
```

---

# Cloudflare Quick Tunnel optionnel

```bash
cloudflared tunnel --url http://127.0.0.1:80
```

Avec PM2 :

```bash
pm2 start "cloudflared tunnel --url http://127.0.0.1:80" --name hsr-cloudflare-tunnel
pm2 save
```

Récupérer l’URL :

```bash
grep -ho 'https://[-a-z0-9]*\.trycloudflare\.com' ~/.pm2/logs/hsr-cloudflare-tunnel-error.log | tail -n 1
```

Attention : une URL `trycloudflare.com` peut changer après redémarrage. Pour une URL stable, il faut un vrai domaine Cloudflare.

---

# Méthode recommandée : agent Windows Playwright

## 1. Préparer le dossier Windows

PowerShell :

```powershell
cd C:\
mkdir hsr-hoyo-agent
cd C:\hsr-hoyo-agent
```

Copie le contenu de `windows-agent` dans :

```text
C:\hsr-hoyo-agent
```

Puis installe :

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Utilise `npm.cmd` et `npx.cmd` si PowerShell bloque `npm.ps1` ou `npx.ps1`.

---

## 2. Configurer `config.json`

```powershell
copy .\config.example.json .\config.json
notepad .\config.json
```

Exemple :

```json
{
  "uid": "YOUR_HSR_UID",
  "debianPushUrl": "http://YOUR_DEBIAN_IP/api/push-hoyo",
  "targetUrl": "https://act.hoyolab.com/app/community-game-records-sea/rpg/index.html?bbs_presentation_style=fullscreen&gid=6&user_id=YOUR_HOYOLAB_USER_ID&utm_medium=gamecard&bbs_theme=dark&bbs_theme_device=1&utm_source=github#/hsr",
  "checkEveryMs": 60000
}
```

Notes :

```text
uid = UID Honkai: Star Rail
debianPushUrl = URL Debian qui reçoit les données
targetUrl = vraie page HoYoLAB HSR de ton profil
checkEveryMs = refresh en millisecondes
```

`YOUR_HOYOLAB_USER_ID` n’est pas forcément ton UID HSR.

---

## 3. Configurer `push-secret.txt`

PowerShell :

```powershell
notepad .\push-secret.txt
```

Mets uniquement la valeur de `PUSH_SECRET`, sans guillemets.

Le contenu doit correspondre au `PUSH_SECRET` dans `.env` côté Debian.

---

## 4. Lancer l’agent

```powershell
cd C:\hsr-hoyo-agent
node.exe .\agent.js
```

Chromium doit s’ouvrir. Connecte-toi à HoYoLAB dans cette fenêtre si nécessaire.

Résultat attendu :

```text
[INFO] Lancement Chromium...
[INFO] Ouverture page HSR...
[NOTE DETECTE]
[INFO] Energie HoYoLAB: 149/300
[OK] note envoye a Debian
[INDEX DETECTE]
[INFO] Jours: ... | Succes: ... | Tresors: ...
[OK] index envoye a Debian
```

---

## 5. Vérifier côté Debian

Avec Nginx :

```bash
curl -s http://127.0.0.1/api/raw
curl -s http://127.0.0.1/api/discord-widget
```

Sans Nginx :

```bash
curl -s http://127.0.0.1:3000/api/raw
curl -s http://127.0.0.1:3000/api/discord-widget
```

---

## 6. Démarrage automatique Windows

Créer le lanceur :

```powershell
cd C:\hsr-hoyo-agent

@'
@echo off
cd /d C:\hsr-hoyo-agent

:loop
echo [%date% %time%] Lancement agent.js >> C:\hsr-hoyo-agent\agent.log
node.exe C:\hsr-hoyo-agent\agent.js >> C:\hsr-hoyo-agent\agent.log 2>&1

echo [%date% %time%] Agent stoppe, relance dans 10 secondes >> C:\hsr-hoyo-agent\agent.log
timeout /t 10 /nobreak >nul
goto loop
'@ | Set-Content -Path C:\hsr-hoyo-agent\start-agent.bat -Encoding ASCII
```

Créer la tâche :

```powershell
schtasks /Delete /TN "HSR HoYoLAB Agent" /F 2>$null
schtasks /Create /TN "HSR HoYoLAB Agent" /TR "C:\hsr-hoyo-agent\start-agent.bat" /SC ONLOGON /RL HIGHEST /F
```

Tester :

```powershell
schtasks /Run /TN "HSR HoYoLAB Agent"
```

Vérifier :

```powershell
schtasks /Query /TN "HSR HoYoLAB Agent"
Get-Content C:\hsr-hoyo-agent\agent.log -Tail 40
```

Important : la tâche est en `ONLOGON`. Elle démarre quand une session Windows est ouverte, pas avant.

---

# Méthode alternative : cURL HoYoLAB sans agent Windows

Cette méthode est plus fragile. HoYoLAB peut renvoyer :

```json
{"data":null,"message":"invalid request","retcode":-10001}
```

Dans ce cas, les cookies ou headers copiés ne sont plus valides.

## 1. Copier les requêtes HoYoLAB

Ouvre la page HoYoLAB HSR dans ton navigateur.

DevTools :

```text
F12 → Network / Réseau
```

Recharge la page.

Cherche :

```text
/hkrpg/api/note
/hkrpg/api/index
```

Pour chaque requête :

```text
clic droit → Copy → Copy as cURL
```

---

## 2. Créer les fichiers Debian

```bash
nano hoyo-note-curl.sh
```

Colle le cURL de `/note`.

```bash
nano hoyo-index-curl.sh
```

Colle le cURL de `/index`.

Puis :

```bash
chmod +x hoyo-note-curl.sh hoyo-index-curl.sh
bash scripts/fetch-hoyo.sh
```

Résultat attendu :

```text
OK: note sauvegarde
OK: index sauvegarde
```

Automatiser :

```bash
pm2 start scripts/fetch-loop.sh --name hsr-hoyolab-fetcher
pm2 save
```

Si tu utilises l’agent Windows, évite de laisser un vieux fetcher cURL tourner :

```bash
pm2 stop hsr-hoyolab-fetcher
pm2 save
```

Sinon il peut écraser des données fraîches.

---

# Discord Widget Builder

`/api/discord-widget` renvoie un JSON comme :

```json
{
  "data": {
    "dynamic": [
      { "type": 1, "name": "title", "value": "YourName" },
      { "type": 1, "name": "stat1_label", "value": "Energie" },
      { "type": 1, "name": "stat1_value", "value": "149/300" }
    ]
  }
}
```

Dans le Discord Widget Builder, crée les champs :

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
```

Pour afficher une valeur dynamique :

```text
Value Type → User Data
```

Erreur rencontrée :

```text
{{stat1_value}}
```

Si le builder affiche littéralement `{{stat1_value}}`, tu as mis un texte normal. Il faut choisir `User Data`.

---

# Push vers Discord

Le script :

```bash
scripts/push-discord-widget.sh
```

fait :

```text
1. charge .env
2. récupère GET /api/discord-widget
3. PATCH Discord API profile widget
```

Test :

```bash
bash scripts/push-discord-widget.sh
```

Automatisation :

```bash
pm2 start scripts/push-discord-loop.sh --name hsr-discord-pusher
pm2 save
```

Commande cURL complète :

```bash
set -a
source .env
set +a

curl -s http://127.0.0.1:${PORT:-3000}/api/discord-widget | curl -i -X PATCH "https://discord.com/api/v9/applications/${DISCORD_APP_ID}/users/${DISCORD_USER_ID}/identities/0/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
  -H "User-Agent: DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)" \
  --data-binary @-
```

Avec Nginx :

```bash
curl -s http://127.0.0.1/api/discord-widget | curl -i -X PATCH "https://discord.com/api/v9/applications/${DISCORD_APP_ID}/users/${DISCORD_USER_ID}/identities/0/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
  -H "User-Agent: DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)" \
  --data-binary @-
```

---

# Debug rapide

Debian :

```bash
curl http://127.0.0.1/
curl http://127.0.0.1/api/raw
curl http://127.0.0.1/api/discord-widget

pm2 status
pm2 logs hsr-widget-api --lines 50
pm2 logs hsr-discord-pusher --lines 50
pm2 logs hsr-hoyolab-fetcher --lines 50
```

Windows :

```powershell
cd C:\hsr-hoyo-agent
node.exe .\agent.js
Get-Content C:\hsr-hoyo-agent\agent.log -Tail 50
schtasks /Query /TN "HSR HoYoLAB Agent"
schtasks /Run /TN "HSR HoYoLAB Agent"
```

---

# Problèmes rencontrés et solutions

## `SyntaxError: Unexpected identifier 'C'`

Erreur :

```text
C:\hsr-hoyo-agent\agent.js:1
cd C:\hsr-hoyo-agent
   ^
SyntaxError: Unexpected identifier 'C'
```

Cause : une commande PowerShell a été collée dans `agent.js`.

Fix : `agent.js` doit commencer par :

```js
const { chromium } = require("playwright");
```

Pas par :

```text
cd C:\hsr-hoyo-agent
```

---

## PowerShell écrit le fichier JS dans le désordre

Solution fiable :

```text
1. écrire agent.js avec Notepad
2. mettre le secret dans push-secret.txt
3. ne pas mettre le secret directement dans le code
```

---

## `Cannot find module 'playwright'`

Fix :

```powershell
cd C:\hsr-hoyo-agent
npm.cmd install
npx.cmd playwright install chromium
node.exe .\agent.js
```

---

## PowerShell bloque `npm.ps1` ou `npx.ps1`

Fix :

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

---

## Node lancé depuis le mauvais dossier

Fix :

```powershell
cd C:\hsr-hoyo-agent
node.exe .\agent.js
```

---

## Debian répond `unauthorized`

Cause : `PUSH_SECRET` Windows et Debian différents.

Debian :

```bash
grep '^PUSH_SECRET=' .env
```

Windows :

```powershell
Get-Content C:\hsr-hoyo-agent\push-secret.txt
```

Régénérer :

```bash
NEW_SECRET=$(openssl rand -hex 32)

grep -v '^PUSH_SECRET=' .env > .env.tmp
mv .env.tmp .env
echo "PUSH_SECRET=$NEW_SECRET" >> .env

pm2 restart hsr-widget-api

echo "$NEW_SECRET"
```

Puis remets le nouveau secret dans `push-secret.txt`.

---

## `retcode -10001 invalid request`

Cause probable : session HoYoLAB invalide.

Fix méthode cURL : recopier `/note` et `/index` depuis DevTools.

Fix méthode Windows : se reconnecter à HoYoLAB dans la fenêtre Chromium ouverte par l’agent.

---

## Données Windows OK mais Discord vieux

Vérifie :

```bash
curl -s http://127.0.0.1/api/discord-widget
bash scripts/push-discord-widget.sh
pm2 logs hsr-discord-pusher --lines 50
```

---

## Ancien cURL écrase les données Windows

Fix :

```bash
pm2 stop hsr-hoyolab-fetcher
pm2 save
```

---

## Discord `401 Unauthorized`

Causes possibles :

```text
mauvais DISCORD_BOT_TOKEN
token reset
"Bot" écrit deux fois
token OAuth au lieu du token bot
token exposé publiquement
```

Test :

```bash
set -a
source .env
set +a

curl -s https://discord.com/api/v10/users/@me \
  -H "Authorization: Bot ${DISCORD_BOT_TOKEN}" \
  -H "User-Agent: DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)"
```

---

## Git `dubious ownership detected`

Cause : Git lancé avec un utilisateur différent du propriétaire du dossier.

Fix propre :

```bash
sudo chown -R YOUR_DEBIAN_USER:YOUR_DEBIAN_USER /home/YOUR_DEBIAN_USER/hsr-hoyolab-discord-widget-public
su - YOUR_DEBIAN_USER
cd /home/YOUR_DEBIAN_USER/hsr-hoyolab-discord-widget-public
git status
```

---

## `current directory is not a git repository`

Cause : mauvais dossier.

Fix :

```bash
cd /home/YOUR_DEBIAN_USER/hsr-hoyolab-discord-widget-public
git status
```

---

## GitHub refuse le mot de passe

GitHub n’accepte pas le mot de passe classique pour `git push`.

Utilise :

```bash
gh auth login
```

ou un Personal Access Token.

---

## `Repository not found`

Ca veut souvent dire :

```text
repo pas créé
remote mauvais
pseudo GitHub mauvais
mauvais compte GitHub
token sans droits
```

Vérifie :

```bash
git remote -v
```

Créer avec GitHub CLI :

```bash
gh repo create hsr-hoyolab-discord-widget --public --source=. --remote=origin --push
```

À lancer dans le dossier du repo, pas depuis `/root`.

---

# Repo public et repo privé

Recommandation :

```text
Repo privé = ton vrai projet local
Repo public = template propre sans secret
```

Ne rends jamais public le repo privé.

Avant de push public :

```bash
git status --ignored
git ls-files
git ls-files | grep -E '(^\.env$|hoyo.*curl|push-secret|config\.json|hoyolab-profile|data/.*\.json|data/.*\.txt)' || true
```

Si un fichier sensible est tracké :

```bash
git rm --cached FILE_NAME
```

Commit :

```bash
git add .
git commit -m "Initial public release"
git branch -M main
```

Push :

```bash
gh auth login
gh repo create hsr-hoyolab-discord-widget --public --source=. --remote=origin --push
```

Si le repo existe déjà :

```bash
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/hsr-hoyolab-discord-widget.git
git push -u origin main
```

---

# Licence

Projet fourni comme template communautaire.

Vérifie les conditions d’utilisation de HoYoLAB et Discord avant usage public.
