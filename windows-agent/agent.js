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

function makeFreshUrl(url) {
  const [beforeHash, hash = ""] = url.split("#");
  const fresh = new URL(beforeHash);

  fresh.searchParams.set("_refresh", String(Date.now()));

  return hash ? `${fresh.toString()}#${hash}` : fresh.toString();
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
  console.log("[INFO] Vrai refresh page HSR...");

  const freshUrl = makeFreshUrl(TARGET_URL);

  try {
    await page.bringToFront();

    console.log("[INFO] Navigation anti-cache...");
    await page.goto(freshUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(5000);
  } catch (err) {
    console.log("[WARN] page.goto anti-cache impossible:", err.message);
  }

  try {
    console.log("[INFO] Reload navigateur...");
    await page.reload({
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(5000);
  } catch (err) {
    console.log("[WARN] page.reload impossible:", err.message);
  }

  try {
    console.log("[INFO] F5 fallback...");
    await page.keyboard.press("F5");

    await page.waitForLoadState("domcontentloaded", {
      timeout: 60000
    }).catch(() => {});

    await page.waitForTimeout(8000);
  } catch (err) {
    console.log("[WARN] F5 impossible:", err.message);
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
    console.log(`[INFO] Prochain vrai refresh dans ${CHECK_EVERY_MS / 1000}s...`);
    await page.waitForTimeout(CHECK_EVERY_MS);
    await refreshHsrPage(page);
  }
}

main().catch(err => {
  console.error("[FATAL]", err);
  process.exit(1);
});
