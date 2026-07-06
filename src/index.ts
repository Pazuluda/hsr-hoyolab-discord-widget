import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

const dataDir = path.join(process.cwd(), "data");

const noteFile = path.join(dataDir, "hoyo-raw.json");
const noteUpdatedFile = path.join(dataDir, "updated-at.txt");

const indexFile = path.join(dataDir, "hoyo-index.json");
const indexUpdatedFile = path.join(dataDir, "index-updated-at.txt");

type HoyoResponse = {
  retcode?: number;
  message?: string;
  data?: Record<string, any>;
};

async function readJson(file: string): Promise<any> {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

async function readText(file: string): Promise<string> {
  return await fs.readFile(file, "utf8").catch(() => "");
}

function field(name: string, value: string | number) {
  return {
    type: 1,
    name,
    value: String(value)
  };
}

function latestDate(...dates: string[]) {
  const valid = dates
    .map(d => d.trim())
    .filter(Boolean)
    .sort((a, b) => Date.parse(b) - Date.parse(a));

  return valid[0] || new Date().toISOString();
}

function getIndexStat(indexRaw: any, keys: string[], fallback = "?") {
  const stats = indexRaw?.data?.stats ?? indexRaw?.data ?? {};

  for (const key of keys) {
    const value = stats[key];

    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return fallback;
}

function realStamina(data: any, updatedAtText: string): number {
  const max = Number(data.max_stamina ?? 300);
  const current = Number(data.current_stamina ?? 0);
  const recoverSeconds = Number(data.stamina_recover_time ?? 0);

  if (!Number.isFinite(recoverSeconds) || recoverSeconds <= 0) {
    return Math.min(max, Math.max(0, current));
  }

  const updatedMs = Date.parse((updatedAtText || "").trim());
  const elapsedSeconds = Number.isFinite(updatedMs)
    ? Math.max(0, Math.floor((Date.now() - updatedMs) / 1000))
    : 0;

  const remainingSeconds = Math.max(0, recoverSeconds - elapsedSeconds);
  const calculated = max - Math.ceil(remainingSeconds / 360);

  return Math.min(max, Math.max(0, current, calculated));
}

function isNotePayload(body: HoyoResponse) {
  return body?.data?.current_stamina !== undefined;
}

function isIndexPayload(body: HoyoResponse) {
  return body?.data?.stats !== undefined;
}

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "hsr-widget-api"
  });
});

app.post("/api/push-hoyo", async (req, res) => {
  try {
    const token = req.header("x-widget-token");

    if (!process.env.PUSH_SECRET || token !== process.env.PUSH_SECRET) {
      res.status(401).json({ status: "unauthorized" });
      return;
    }

    const body = req.body as HoyoResponse;

    if (!body || body.retcode !== 0 || !body.data) {
      res.status(400).json({ status: "bad_hoyo_data" });
      return;
    }

    await fs.mkdir(dataDir, { recursive: true });

    if (isNotePayload(body)) {
      await fs.writeFile(noteFile, JSON.stringify(body, null, 2));
      await fs.writeFile(noteUpdatedFile, new Date().toISOString());
      res.json({ status: "ok", kind: "note" });
      return;
    }

    if (isIndexPayload(body)) {
      await fs.writeFile(indexFile, JSON.stringify(body, null, 2));
      await fs.writeFile(indexUpdatedFile, new Date().toISOString());
      res.json({ status: "ok", kind: "index" });
      return;
    }

    res.status(400).json({ status: "unknown_hoyo_data" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error" });
  }
});

app.get("/api/discord-widget", async (_req, res) => {
  try {
    const noteRaw = await readJson(noteFile).catch(() => null);
    const indexRaw = await readJson(indexFile).catch(() => null);

    const noteUpdated = await readText(noteUpdatedFile);
    const indexUpdated = await readText(indexUpdatedFile);

    const note = noteRaw?.data ?? {};

    const stamina = noteRaw
      ? `${realStamina(note, noteUpdated)}/${note.max_stamina ?? 300}`
      : "?/300";

    const activeDays = getIndexStat(indexRaw, ["active_days", "login_days"]);
    const achievements = getIndexStat(indexRaw, ["achievement_num", "achievements"]);
    const treasures = getIndexStat(indexRaw, ["chest_num", "treasure_num", "opened_chest_num"]);

    const rogue = noteRaw
      ? `${note.current_rogue_score ?? 0}/${note.max_rogue_score ?? 0}`
      : "?";

    const weeklyBoss = noteRaw
      ? `${note.weekly_cocoon_cnt ?? 0}/${note.weekly_cocoon_limit ?? 3}`
      : "?";

    const updatedAt = latestDate(noteUpdated, indexUpdated);

    res.json({
      data: {
        dynamic: [
          field("title", process.env.HSR_USERNAME ?? "YourName"),
          field("subtitle", `UID ${process.env.HSR_UID ?? "YOUR_HSR_UID"} • Europe`),

          field("stat1_label", "Energie"),
          field("stat1_value", stamina),

          field("stat2_label", "Jours connexion"),
          field("stat2_value", activeDays),

          field("stat3_label", "Succes"),
          field("stat3_value", achievements),

          field("stat4_label", "Tresors ouverts"),
          field("stat4_value", treasures),

          field("stat5_label", "Univers simule"),
          field("stat5_value", rogue),

          field("stat6_label", "Boss hebdo"),
          field("stat6_value", weeklyBoss),

          field("footer", `Maj ${updatedAt}`)
        ]
      }
    });
  } catch (error) {
    console.error(error);
    res.status(404).json({
      data: {
        dynamic: [
          field("title", process.env.HSR_USERNAME ?? "YourName"),
          field("subtitle", "Aucune donnee HoYoLAB"),
          field("stat1_label", "Erreur"),
          field("stat1_value", "no_data")
        ]
      }
    });
  }
});

app.get("/api/raw", async (_req, res) => {
  const note = await readJson(noteFile).catch(() => null);
  const index = await readJson(indexFile).catch(() => null);

  res.json({ note, index });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`HSR Widget API: http://0.0.0.0:${port}`);
});
