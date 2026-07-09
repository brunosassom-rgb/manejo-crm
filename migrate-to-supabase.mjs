#!/usr/bin/env node
// One-time migration: reads a "Backup dos dados" export from Manejo CRM and
// pushes every row into Supabase, uploading base64 photos to Storage first.
// Safe to re-run (every write is an upsert keyed by id).
//
// Uso:
//   1. No app ainda em localStorage, clique em "Backup dos dados" (Configurações)
//      para baixar manejo-crm-backup-AAAA-MM-DD.json.
//   2. Rode "npm install" nesta pasta (uma vez).
//   3. Copie .env.example para .env e preencha SUPABASE_URL e
//      SUPABASE_SERVICE_ROLE_KEY (Project Settings -> API -> service_role —
//      NÃO é a anon key. Essa chave ignora RLS; nunca a coloque no app nem
//      no git).
//   4. node migrate-to-supabase.mjs "C:\caminho\para\manejo-crm-backup-....json"

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const backupPath = process.argv[2];
if (!backupPath) {
  console.error("Uso: node migrate-to-supabase.mjs <caminho-do-backup.json>");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em um arquivo .env (veja .env.example).");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Mesmo mapeamento usado em app.js (SYNC_ENTITY_TABLES) — mantenha os dois em sincronia.
const SYNC_ENTITY_TABLES = {
  leads: { table: "leads" },
  clientesAtivos: { table: "clientes_ativos" },
  consultores: { table: "consultores" },
  fornecedores: { table: "fornecedores" },
  pedidos: { table: "pedidos", fkField: "clientId", fkColumn: "client_id" },
  contatos: { table: "contatos", fkField: "clientId", fkColumn: "client_id" },
  competitivas: { table: "competitivas", fkField: "clientId", fkColumn: "client_id" },
  upsells: { table: "upsells", fkField: "clientId", fkColumn: "client_id" },
  sacs: { table: "sacs", fkField: "clientId", fkColumn: "client_id" },
  compromissos: { table: "compromissos", fkField: "clientId", fkColumn: "client_id" },
  estoques: { table: "estoques", fkField: "clientId", fkColumn: "client_id" },
  visitas: { table: "visitas", fkField: "clientId", fkColumn: "client_id" },
  propostas: { table: "propostas", fkField: "leadId", fkColumn: "lead_id" }
};
const APP_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
const APP_SETTINGS_KEYS = ["config", "metaVisitasMes", "avaliacaoCompetitiva", "estoqueAlertasDispensados", "roteiroDispensados"];

async function uploadDataUrl(dataUrl, destPath) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, contentType, b64] = match;
  const buffer = Buffer.from(b64, "base64");
  const { error } = await sb.storage.from("fotos").upload(destPath, buffer, { upsert: true, contentType });
  if (error) { console.warn(`  ! upload falhou (${destPath}):`, error.message); return null; }
  const { data, error: signErr } = await sb.storage.from("fotos").createSignedUrl(destPath, 60 * 60 * 24 * 365);
  if (signErr) { console.warn(`  ! assinatura de URL falhou (${destPath}):`, signErr.message); return null; }
  return data.signedUrl;
}

// Muta `state` in-place: troca cada data-URL base64 pela URL assinada do Storage,
// exatamente como o runtime faz em uploadPendingPhotos() (app.js) — mesma lógica,
// script separado porque este roda uma única vez, fora do navegador.
async function migratePhotos(state) {
  let count = 0;
  for (const visita of state.visitas || []) {
    for (const foto of [...(visita.fotos || []), ...(visita.fotosRecomendacoes || [])]) {
      if (foto && typeof foto.dataUrl === "string" && foto.dataUrl.startsWith("data:")) {
        const url = await uploadDataUrl(foto.dataUrl, `visitas/${visita.id}/${randomUUID()}.jpg`);
        if (url) { foto.dataUrl = url; count++; }
      }
    }
  }
  const cfg = state.config || {};
  if (typeof cfg.logoRepresentanteDataUrl === "string" && cfg.logoRepresentanteDataUrl.startsWith("data:")) {
    const url = await uploadDataUrl(cfg.logoRepresentanteDataUrl, "config/logo-representante.jpg");
    if (url) { cfg.logoRepresentanteDataUrl = url; count++; }
  }
  return count;
}

async function main() {
  const raw = fs.readFileSync(path.resolve(backupPath), "utf8");
  const state = JSON.parse(raw);

  console.log("Enviando fotos para o Storage...");
  const photoCount = await migratePhotos(state);
  console.log(`  ${photoCount} foto(s) enviada(s).\n`);

  // client_id/lead_id não têm FK no schema, então a ordem das tabelas não importa aqui.
  for (const [key, cfg] of Object.entries(SYNC_ENTITY_TABLES)) {
    const rows = (state[key] || []).map(r => {
      const row = { id: r.id, data: r };
      if (cfg.fkColumn) row[cfg.fkColumn] = r[cfg.fkField] || null;
      return row;
    });
    if (!rows.length) { console.log(`${cfg.table}: nada a importar (0 no backup).`); continue; }
    const { error } = await sb.from(cfg.table).upsert(rows, { onConflict: "id" });
    if (error) { console.error(`${cfg.table}: FALHOU —`, error.message); continue; }
    console.log(`${cfg.table}: ${rows.length} registro(s) importado(s).`);
  }

  const settingsData = {};
  for (const k of APP_SETTINGS_KEYS) settingsData[k] = state[k];
  const { error: settingsErr } = await sb.from("app_settings").upsert({ id: APP_SETTINGS_ID, data: settingsData }, { onConflict: "id" });
  if (settingsErr) console.error("app_settings: FALHOU —", settingsErr.message);
  else console.log("app_settings: importado.");

  console.log("\nMigração concluída. Confira as contagens acima contra o tamanho de cada lista no arquivo de backup (ex: state.leads.length).");
}

main().catch(err => { console.error(err); process.exit(1); });
