const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config.json");
const secretPath = path.join(__dirname, "push-secret.txt");

if (!fs.existsSync(configPath)) {
  console.error("[FATAL] config.json introuvable. Copie config.example.json vers config.json puis modifie-le.");
  process.exit(1);
}

if (!fs.existsSync(secretPath)) {
  console.error("[FATAL] push-secret.txt introuvable. Mets le PUSH_SECRET Debian dans ce fichier.");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const UID = String(config.uid || "").trim();
const DEBIAN_PUSH_URL = String(config.debianPushUrl || "").trim();
const PUSH_SECRET = fs.readFileSync(secretPath, "utf8").trim();
const TARGET_URL = String(config.targetUrl || "").trim();
const CHECK_EVERY_MS = Number(config.checkEveryMs || 60000);

if (!UID || !DEBIAN_PUSH_URL || !PUSH_SECRET || !TARGET_URL) {
  console.error("[FATAL] config.json ou push-secret.txt incomplet.");
  process.exit(1);
}

async function sendToDebian(json, kind) {
  const res = await fetch(DEBIAN_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-widget-token": PUSH_SECRET
    },
    body: JSON.stringify(json)
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Debian a refuse ${kind}: HTTP ${res.status} ${text}`);
  }

  console.log(`[OK] ${kind} envoye a Debian: ${new Date().toLocaleString()}`);
}

async function refreshHsrPage(page) {
  console.log("[INFO] Refresh page HSR...");

  try {
    await page.goto(TARGET_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(8000);
    return;
  } catch (err) {
    console.log("[WARN] page.goto impossible:", err.message);
  }

  try {
    await page.reload({
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(8000);
  } catch (err) {
    console.log("[WARN] page.reload impossible:", err.message);
  }
}

async function main() {
  console.log("[INFO] Lancement Chromium...");

  const context = await chromium.launchPersistentContext(path.join(__dirname, "hoyolab-profile"), {
    headless: false,
    viewport: { width: 1300, height: 900 }
  });

  const page = await context.newPage();

  page.on("response", async (res) => {
    try {
      const url = res.url();

      const isNote = url.includes("/hkrpg/api/note") && url.includes(`role_id=${UID}`);
      const isIndex = url.includes("/hkrpg/api/index") && url.includes(`role_id=${UID}`);

      if (!isNote && !isIndex) return;

      const kind = isNote ? "note" : "index";

      console.log(`[${kind.toUpperCase()} DETECTE]`, url);

      const json = await res.json().catch(() => null);
      if (!json) return;

      if (json.retcode !== 0 || !json.data) {
        console.log(`[ERREUR HOYOLAB ${kind}]`);
        console.log(JSON.stringify(json, null, 2));
        return;
      }

      if (isNote) {
        console.log(`[INFO] Energie HoYoLAB: ${json.data.current_stamina}/${json.data.max_stamina}`);
      }

      if (isIndex) {
        const stats = json.data.stats || {};
        console.log(`[INFO] Jours: ${stats.active_days} | Succes: ${stats.achievement_num} | Tresors: ${stats.chest_num}`);
      }

      await sendToDebian(json, kind);
    } catch (err) {
      console.log("[WARN]", err.message);
    }
  });

  console.log("[INFO] Ouverture page HSR...");
  await refreshHsrPage(page);

  while (true) {
    console.log(`[INFO] Prochain refresh dans ${CHECK_EVERY_MS / 1000}s...`);
    await page.waitForTimeout(CHECK_EVERY_MS);
    await refreshHsrPage(page);
  }
}

main().catch(err => {
  console.error("[FATAL]", err);
  process.exit(1);
});
