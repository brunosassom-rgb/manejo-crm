const STORAGE_KEY = "brunosassoCrm_v5";

// ---------- Supabase (sincronização entre dispositivos) ----------
// Preencha com a URL e a anon key do seu projeto (Supabase → Project Settings → API).
// A anon key é segura para expor no cliente — a segurança real vem das políticas de
// RLS definidas em schema.sql, não do sigilo desta chave. Enquanto ficarem vazias, o
// CRM continua funcionando 100% local (como hoje), sem tentar sincronizar.
const SUPABASE_URL = "https://wtnxenlaybqzjthxiurd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zYUVB9AhL2MJUiFv9TwzVA_2S7EH9H2";
const sb = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Funil de LEAD (6 etapas) — Cliente Ativo é uma entidade separada, fora do funil
const LEAD_FUNIL_STAGES = ["Prospecção", "Qualificação", "Diagnóstico", "Proposta enviada", "Negociação", "Fechamento"];
const LEAD_STAGE_CRITERIA = {
  "Prospecção": "primeiro contato realizado", "Qualificação": "perfil confirmado, BANT validado",
  "Diagnóstico": "visita realizada, dores identificadas", "Proposta enviada": "cotação ou proposta formal enviada",
  "Negociação": "em discussão de condições", "Fechamento": "aguardando decisão final"
};
const STAGE_COLOR = {
  "Prospecção": "#5f7038", "Qualificação": "#748743", "Diagnóstico": "#7d8a4f",
  "Proposta enviada": "#93a06a", "Negociação": "#8f9c52", "Fechamento": "#232b1f"
};
const LEAD_STATUS_TERMINAIS = ["Bloqueado", "Inativo", "Perdido", "Convertido"];
const ETAPA_NORMALIZE = { "Proposta em desenvolvimento": "Diagnóstico" };

const COMO_CHEGOU_OPCOES = ["Indicação", "Visita prospectiva", "Evento", "Originação interna", "LinkedIn", "WhatsApp", "Outro"];
const PAPEL_CONTATO_OPCOES = ["Decisor", "Influenciador", "Consultor externo", "Comprador", "Técnico", "Outro"];
const CANAL_PREFERIDO_OPCOES = ["WhatsApp", "Ligação", "E-mail", "Visita"];
const TIPO_ANIMAL_OPCOES = ["Bovinos de corte", "Bovinos de leite", "Equinos", "Suínos", "Aves de postura", "Aves de corte", "Peixe", "Caprinos", "Ovinos", "Outro"];
const FASES_POR_TIPO_ANIMAL = {
  "Bovinos de corte": ["Cria", "Recria", "Engorda", "Confinamento", "Misto"],
  "Bovinos de leite": ["Lactação", "Secas", "Novilhas", "Cria"],
  "Equinos": ["Esporte", "Trabalho", "Lazer", "Reprodução", "Criação"],
  "Aves de postura": ["Postura", "Pintinhos", "Matrizes"],
  "Aves de corte": ["Corte", "Pintinhos", "Matrizes"],
  "Peixe": ["Alevinagem", "Crescimento", "Engorda", "Terminação"]
};
const SISTEMA_PRODUCAO_OPCOES = ["Extensivo", "Semi-intensivo", "Intensivo", "Confinamento", "Integrado", "Outro"];
const SATISFACAO_FORNECEDOR_OPCOES = ["Satisfeito", "Neutro", "Insatisfeito", "Desconhecido"];
const OLD_CATEGORIA_LOOKUP = {
  "Bovinos de corte recria": ["Bovinos de corte", "Recria"], "Bovinos de corte engorda": ["Bovinos de corte", "Engorda"],
  "Bovinos de corte confinamento": ["Bovinos de corte", "Confinamento"], "Bovinos de corte cria": ["Bovinos de corte", "Cria"],
  "Vacas de cria": ["Bovinos de corte", "Cria"], "Bovinos de leite": ["Bovinos de leite", "Lactação"],
  "Equinos de trabalho": ["Equinos", "Trabalho"], "Equinos de esporte": ["Equinos", "Esporte"], "Equinos de lazer": ["Equinos", "Lazer"],
  "Suínos": ["Suínos", ""], "Frangos de corte": ["Aves de corte", "Corte"], "Poedeiras": ["Aves de postura", "Postura"],
  "Pintados": ["Aves de corte", "Pintinhos"], "Peixe tambaqui": ["Peixe", "Engorda"], "Peixe tilápia": ["Peixe", "Engorda"],
  "Peixe outros": ["Peixe", "Engorda"], "Outros": ["Outro", ""]
};

const BANT_BUDGET_OPCOES = ["Investe", "Intermediário", "Vê como custo", "Desconhecido"];
const BANT_AUTHORITY_OPCOES = ["Decisor final", "Influenciador", "Técnico sem poder de decisão", "Desconhecido"];
const BANT_NEED_OPCOES = ["Sim, com problema claro", "Sim, com problema vago", "Não identificado"];
const BANT_TIMING_OPCOES = ["Urgente agora", "Próximos 30 dias", "Próximos 90 dias", "Sem prazo definido"];
const BANT_PONTOS = {
  budget: { "Investe": 2, "Intermediário": 1, "Vê como custo": 0, "Desconhecido": 0 },
  authority: { "Decisor final": 2, "Influenciador": 1, "Técnico sem poder de decisão": 0, "Desconhecido": 0 },
  need: { "Sim, com problema claro": 2, "Sim, com problema vago": 1, "Não identificado": 0 },
  timing: { "Urgente agora": 2, "Próximos 30 dias": 1.5, "Próximos 90 dias": 1, "Sem prazo definido": 0 }
};
function computeBantScore(lead) {
  if (!lead.bantBudget && !lead.bantAuthority && !lead.bantNeed && !lead.bantTiming) return null;
  const pts = (BANT_PONTOS.budget[lead.bantBudget] || 0) + (BANT_PONTOS.authority[lead.bantAuthority] || 0)
    + (BANT_PONTOS.need[lead.bantNeed] || 0) + (BANT_PONTOS.timing[lead.bantTiming] || 0);
  if (pts >= 5.5) return "Quente";
  if (pts >= 3) return "Morno";
  return "Frio";
}

const PROXIMO_PASSO_TIPO_OPCOES = ["Visita presencial", "Ligação", "Envio de proposta", "Envio de material", "Follow-up WhatsApp", "Aguardar retorno do cliente", "Outro"];
const STATUS_ESPECIAL_OPCOES = ["", "Aguardando formulação interna", "Aguardando cadastro", "Aguardando decisão do dono", "Bloqueado por consultor", "Em teste de produto", "Outro"];
const MOTIVO_ENCERRAMENTO_OPCOES = ["Perdido para concorrente", "Bloqueado por vínculo do consultor", "Sem potencial identificado", "Cliente sem interesse no momento", "Sem retorno após múltiplas tentativas", "Outro"];
const RESULTADO_CONTATO_OPCOES = ["Avançou", "Manteve", "Regrediu", "Sem resposta"];
function nomeUsuarioPadrao() { return (state.config && state.config.nomeUsuario) || "Usuário"; }

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const base = {
    clients: [], leads: [], clientesAtivos: [], propostas: [], upsells: [],
    pedidos: [], contatos: [], competitivas: [], consultores: [], sacs: [], compromissos: [],
    avaliacaoCompetitiva: {}, fornecedores: [], dashboardLayout: [], visitas: [], metaVisitasMes: 20, estoques: [], roteiroDispensados: [], estoqueAlertasDispensados: [],
    config: { nomeEmpresa: "", nomeCrm: "Manejo", nomeUsuario: "Bruno Sasso", cargoUsuario: "Gerente de Território", whatsappUsuario: "", emailUsuario: "", empresaRepresentante: "", logoRepresentanteDataUrl: "" }
  };
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw);
    parsed.config = { ...base.config, ...(parsed.config || {}) };
    return { ...base, ...parsed };
  } catch {
    return base;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); // instantâneo, funciona offline — sempre roda
  queueSync(); // em segundo plano, não bloqueia; não faz nada se sb ainda não estiver configurado
}

// ---------- Sincronização com Supabase (push com diff + pull) ----------
// Cada tabela guarda o registro inteiro em `data` (jsonb) — o mesmo formato que já
// existe em state[key] — mais uma coluna `client_id`/`lead_id` promovida só para
// RLS/joins. `client_id` não tem FK: pode apontar tanto para um lead quanto para um
// cliente ativo (um registro pode existir antes da conversão do lead).
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

let lastSyncedSnapshot = null;
let syncDebounceTimer = null;
let syncInFlight = false;
let syncPending = false;

function queueSync() {
  if (!sb) return;
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => { diffAndPush(); }, 400);
}

async function uploadDataUrlToStorage(dataUrl, path) {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const { error: upErr } = await sb.storage.from("fotos").upload(path, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
    if (upErr) { console.warn("Upload de foto falhou:", upErr.message); return null; }
    const { data, error: signErr } = await sb.storage.from("fotos").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr) { console.warn("Não foi possível gerar URL da foto:", signErr.message); return null; }
    return data.signedUrl;
  } catch (err) {
    console.warn("Upload de foto falhou:", err);
    return null;
  }
}

// Fotos são salvas localmente como data-URL base64 (compressImageFile). Antes de
// sincronizar, troca qualquer data-URL ainda pendente por uma URL assinada do
// Storage — e muda isso direto em `state`, não só no payload de saída, para o
// localStorage parar de carregar blobs enormes e para o diff não reenviar de novo.
async function uploadPendingPhotos() {
  if (!sb) return false;
  let changed = false;
  for (const visita of state.visitas || []) {
    for (const foto of [...(visita.fotos || []), ...(visita.fotosRecomendacoes || [])]) {
      if (foto && typeof foto.dataUrl === "string" && foto.dataUrl.startsWith("data:")) {
        const url = await uploadDataUrlToStorage(foto.dataUrl, `visitas/${visita.id}/${uid()}.jpg`);
        if (url) { foto.dataUrl = url; changed = true; }
      }
    }
  }
  const cfg = state.config || {};
  if (typeof cfg.logoRepresentanteDataUrl === "string" && cfg.logoRepresentanteDataUrl.startsWith("data:")) {
    const url = await uploadDataUrlToStorage(cfg.logoRepresentanteDataUrl, "config/logo-representante.jpg");
    if (url) { cfg.logoRepresentanteDataUrl = url; changed = true; }
  }
  if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return changed;
}

async function diffAndPush() {
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return; // sem login (ex: "Continuar sem entrar"), não tenta sincronizar
  if (syncInFlight) { syncPending = true; return; }
  syncInFlight = true;
  try {
    await uploadPendingPhotos();
    const snapshot = lastSyncedSnapshot || {};
    for (const [key, cfg] of Object.entries(SYNC_ENTITY_TABLES)) {
      const current = state[key] || [];
      const previous = snapshot[key] || [];
      const prevById = new Map(previous.map(r => [r.id, r]));
      const currIds = new Set(current.map(r => r.id));
      const toUpsert = current.filter(r => {
        const prev = prevById.get(r.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(r);
      });
      const toDelete = previous.filter(r => !currIds.has(r.id)).map(r => r.id);
      if (toUpsert.length) {
        const rows = toUpsert.map(r => {
          const row = { id: r.id, data: r };
          if (cfg.fkColumn) row[cfg.fkColumn] = r[cfg.fkField] || null;
          return row;
        });
        const { error } = await sb.from(cfg.table).upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
      if (toDelete.length) {
        const { error } = await sb.from(cfg.table).delete().in("id", toDelete);
        if (error) throw error;
      }
    }
    const settingsData = {}, prevSettingsData = {};
    for (const k of APP_SETTINGS_KEYS) { settingsData[k] = state[k]; prevSettingsData[k] = snapshot[k]; }
    if (JSON.stringify(settingsData) !== JSON.stringify(prevSettingsData)) {
      const { error } = await sb.from("app_settings").upsert({ id: APP_SETTINGS_ID, data: settingsData }, { onConflict: "id" });
      if (error) throw error;
    }
    lastSyncedSnapshot = structuredClone(state);
  } catch (err) {
    console.warn("Sincronização com Supabase falhou (dados seguem salvos localmente, tentará de novo):", err && err.message ? err.message : err);
  } finally {
    syncInFlight = false;
    if (syncPending) { syncPending = false; queueSync(); }
  }
}

// Traz o estado completo do Supabase e substitui `state` local — usado no login e
// toda vez que o app volta ao primeiro plano, para pegar edições feitas em outro
// dispositivo. Sempre busca tudo (não incremental): o volume de dados de um CRM de
// uma pessoa/pequena equipe é pequeno o bastante pra isso ser simples e robusto,
// sem depender de relógio de dispositivo ou janelas de "desde o último pull".
async function pullAllTablesAndMerge() {
  if (!sb) return false;
  // Sem sessão, as políticas de RLS bloqueiam a leitura e cada tabela volta vazia —
  // isso pareceria "Supabase vazio" e acionaria a trava de segurança abaixo por engano
  // (ex: usuário que clicou em "Continuar sem entrar" e o app tenta sincronizar em
  // segundo plano mesmo assim). Sem sessão, nem tenta.
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return false;
  const next = { ...state };
  try {
    for (const [key, cfg] of Object.entries(SYNC_ENTITY_TABLES)) {
      const { data, error } = await sb.from(cfg.table).select("id, data");
      if (error) throw error;
      next[key] = (data || []).map(row => row.data);
    }
    const { data: settingsRow, error: settingsErr } = await sb.from("app_settings").select("data").eq("id", APP_SETTINGS_ID).maybeSingle();
    if (settingsErr) throw settingsErr;
    if (settingsRow && settingsRow.data) {
      for (const k of APP_SETTINGS_KEYS) {
        if (settingsRow.data[k] !== undefined) next[k] = settingsRow.data[k];
      }
    }

    // Trava de segurança: se o Supabase ainda está totalmente vazio (ex: login
    // feito antes de rodar a migração) mas este dispositivo já tem dados reais
    // salvos localmente, NUNCA sobrescreve — isso apagaria tudo silenciosamente.
    // Um pull legítimo não deveria zerar um dispositivo com dados; nesse caso é
    // quase sempre "ainda não migrei", não "apaguei tudo de propósito".
    const remoteIsEmpty = Object.keys(SYNC_ENTITY_TABLES).every(k => (next[k] || []).length === 0);
    const localHasData = Object.keys(SYNC_ENTITY_TABLES).some(k => (state[k] || []).length > 0);
    if (remoteIsEmpty && localHasData) {
      console.warn("Pull ignorado: Supabase está vazio, mas há dados locais. Nada foi sobrescrito — rode a migração (migrate-to-supabase.mjs) para levar os dados locais para a nuvem.");
      showToast("Supabase ainda vazio — mantendo seus dados locais até a migração ser feita.");
      return false;
    }

    state = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    lastSyncedSnapshot = structuredClone(state);
    return true;
  } catch (err) {
    console.warn("Não foi possível baixar dados do Supabase (usando cache local):", err && err.message ? err.message : err);
    return false;
  }
}

window.addEventListener("online", () => queueSync());
setInterval(() => { if (document.visibilityState === "visible") queueSync(); }, 60000);

// ---------- Migração: state.clients (modelo antigo unificado) → leads[] / clientesAtivos[] ----------
function migrateLegacyClientsIfNeeded() {
  if (!state.clients || !state.clients.length) return;
  const statusPorEtapaAntiga = { "Bloqueado": "Bloqueado", "Inativo": "Inativo", "Perdido": "Perdido" };
  state.clients.forEach(c => {
    if (c.etapaFunil === "Cliente ativo") {
      state.clientesAtivos.push({
        id: c.id, leadOrigemId: null,
        nome: c.nome || "", fazenda: c.fazenda || "", cpfCnpj: c.cpfCnpj || "",
        enderecoRua: "", enderecoNumero: "", enderecoBairro: "", municipio: c.municipio || "", estado: c.estado || "", cep: "",
        whatsappDecisor: c.whatsappDecisor || "", nomeDecisor: c.nomeDecisor || "", cargoDecisor: c.cargoDecisor || "",
        whatsappInfluenciador: c.whatsappInfluenciador || "", nomeInfluenciador: c.nomeInfluenciador || "", cargoInfluenciador: c.cargoInfluenciador || "",
        categoriasAnimais: c.categoriasAnimais || [], sistemaProducao: c.sistemaProducao || "",
        dataCadastroAprovado: c.dataAberturaCadastro || "", condicaoPagamentoDias: c.prazoPagamento || "",
        tipoFrete: c.tipoFrete || "",
        cadastroAprovado: c.cadastroAberto || "nao",
        alertaRecompraDias: c.alertaRecompraDias || 5,
        consultorId: c.consultorId || "", temConsultor: c.temConsultor || "nao",
        obsGerais: c.obsGerais || "", criadoEm: c.criadoEm || todayStr()
      });
    } else {
      const etapaFunil = LEAD_FUNIL_STAGES.includes(c.etapaFunil) ? c.etapaFunil : "Prospecção";
      state.leads.push({
        id: c.id, nome: c.nome || "", fazenda: c.fazenda || "", cpfCnpj: c.cpfCnpj || "",
        enderecoRua: "", enderecoNumero: "", enderecoBairro: "", municipio: c.municipio || "", estado: c.estado || "", cep: "",
        whatsappDecisor: c.whatsappDecisor || "", nomeDecisor: c.nomeDecisor || "", cargoDecisor: c.cargoDecisor || "",
        whatsappInfluenciador: c.whatsappInfluenciador || "", nomeInfluenciador: c.nomeInfluenciador || "", cargoInfluenciador: c.cargoInfluenciador || "",
        comoChegou: c.comoChegou || "", indicadoPor: c.indicadoPor || "",
        categoriasAnimais: c.categoriasAnimais || [], sistemaProducao: c.sistemaProducao || "",
        fornecedorAtual: "", produtoAtual: "", volumeMensalEstimado: c.potencialVolumeMensal || "",
        nivelTecnologico: c.nivelTecnologico || "", temConsultor: c.temConsultor || "nao", consultorId: c.consultorId || "",
        etapaFunil, temperatura: "Morno", probabilidade: c.probabilidadeFechamento || "Média",
        produtoInteresse: c.produtoProposta || "", potencialTon: c.potencialVolumeMensal || "",
        objecoes: c.objecoes || "", obsEstrategicas: c.obsComerciais || "",
        status: statusPorEtapaAntiga[c.etapaFunil] || "Ativo", dataConversao: "", clienteAtivoId: "",
        proximoPasso: c.proximoPasso || "", dataProximoPasso: c.dataProximoPasso || "", statusProximoPasso: c.statusProximoPasso || "",
        historicoEtapas: [{ etapa: etapaFunil, data: c.criadoEm || todayStr() }],
        criadoEm: c.criadoEm || todayStr()
      });
    }
  });
  state.clients = [];
  saveState();
}

// ---------- Migração de schema: categoria animal (tipo+fase+situação atual), contatos múltiplos, BANT, próximo passo estruturado ----------
function migrarCategoriaRowV5(row, lead) {
  if (row.tipoAnimal !== undefined) return row; // já migrada
  const [tipoAnimal, faseProducao] = OLD_CATEGORIA_LOOKUP[row.categoria] || ["Outro", ""];
  return {
    id: uid(), tipoAnimal, faseProducao, quantidade: row.quantidade || "",
    sistemaProducao: (lead && lead.sistemaProducao) || "",
    fornecedorAtual: "", produtoAtual: "", volumeMensalEstimado: "",
    prazoPagamento: "", tipoFrete: "FOB", satisfacao: "", reclamacoes: "", tempoDeUso: ""
  };
}

function migrateLeadSchemaV5IfNeeded() {
  state.leads.forEach(lead => {
    if (typeof lead.objecoes === "string") lead.objecoes = lead.objecoes ? [lead.objecoes] : [];
    lead.objecoes = lead.objecoes || [];
    if (lead.schemaV5) return;
    const categorias = (lead.categoriasAnimais || []).map((row, i) => {
      const migrada = migrarCategoriaRowV5(row, lead);
      if (i === 0) {
        migrada.fornecedorAtual = lead.fornecedorAtual || "";
        migrada.produtoAtual = lead.produtoAtual || "";
        migrada.volumeMensalEstimado = lead.volumeMensalEstimado || "";
      }
      return migrada;
    });
    lead.categoriasAnimais = categorias;
    delete lead.fornecedorAtual; delete lead.produtoAtual; delete lead.volumeMensalEstimado; delete lead.sistemaProducao;

    lead.nomeFantasia = lead.nomeFantasia || "";
    lead.enderecoComplemento = lead.enderecoComplemento || "";
    lead.lat = lead.lat || ""; lead.lng = lead.lng || "";
    lead.areaTotalHectares = lead.areaTotalHectares || "";

    if (!lead.contatosPessoas) {
      lead.contatosPessoas = [];
      if (lead.nomeDecisor) lead.contatosPessoas.push({ id: uid(), nome: lead.nomeDecisor, cargo: lead.cargoDecisor || "", papel: "Decisor", whatsapp: lead.whatsappDecisor || "", email: "", canalPreferido: "WhatsApp", obs: "", principal: true });
      if (lead.nomeInfluenciador) lead.contatosPessoas.push({ id: uid(), nome: lead.nomeInfluenciador, cargo: lead.cargoInfluenciador || "", papel: "Influenciador", whatsapp: lead.whatsappInfluenciador || "", email: "", canalPreferido: "WhatsApp", obs: "", principal: false });
    }

    lead.bantBudget = lead.bantBudget || ""; lead.bantAuthority = lead.bantAuthority || "";
    lead.bantNeed = lead.bantNeed || ""; lead.bantTiming = lead.bantTiming || "";
    lead.potencialValor = lead.potencialValor || "";

    if (lead.proximoPassoTipo === undefined) {
      lead.proximoPassoTipo = lead.proximoPasso ? "Outro" : "";
      lead.proximoPassoObs = lead.proximoPasso || "";
      lead.proximoPassoResponsavel = "Eu";
    }
    lead.statusEspecial = lead.statusEspecial || "";
    lead.statusEspecialObs = lead.statusEspecialObs || "";
    lead.vendedorResponsavel = lead.vendedorResponsavel || "";
    lead.dataEncerramento = lead.dataEncerramento || "";
    lead.motivoEncerramento = lead.motivoEncerramento || "";
    lead.concorrenteMotivo = lead.concorrenteMotivo || "";

    lead.schemaV5 = true;
  });

  state.clientesAtivos.forEach(cliente => {
    if (!cliente.schemaV5) {
      cliente.categoriasAnimais = (cliente.categoriasAnimais || []).map(row => migrarCategoriaRowV5(row, cliente));
      delete cliente.sistemaProducao;
      cliente.schemaV5 = true;
    }
    if (cliente.contatosPessoas === undefined) cliente.contatosPessoas = [];
    cliente.nivelTecnologico = cliente.nivelTecnologico || "";
    cliente.areaTotalHectares = cliente.areaTotalHectares || "";
    cliente.statusCadastro = cliente.statusCadastro || (cliente.cadastroAprovado === "sim" ? "Ativo" : "Em análise");
    cliente.cicloObs = cliente.cicloObs || "";
    cliente.status = cliente.status || "Ativo";
    cliente.motivoInativacao = cliente.motivoInativacao || "";
    cliente.concorrenteInativacao = cliente.concorrenteInativacao || "";
    cliente.dataInativacao = cliente.dataInativacao || "";
    cliente.vendedorResponsavel = cliente.vendedorResponsavel || nomeUsuarioPadrao();
    cliente.dataConversao = cliente.dataConversao || cliente.criadoEm || todayStr();
  });

  saveState();
}

// ---------- Migração: fornecedor.tipo (nome da empresa) → fornecedor.ehCasa (booleano estável) ----------
function migrateFornecedoresEhCasaIfNeeded() {
  if (!state.fornecedores || !state.fornecedores.length) return;
  let mudou = false;
  state.fornecedores.forEach(f => {
    if (f.ehCasa === undefined) {
      f.ehCasa = f.tipo === ((state.config && state.config.nomeEmpresa) || "");
      delete f.tipo;
      mudou = true;
    }
  });
  if (mudou) saveState();
}

// ---------- Migração: "Volume mensal estimado" digitado à mão → "consumo por animal" ----------
// Volume mensal estimado passou a ser sempre CALCULADO (quantidade × consumo por animal), não
// mais digitado direto. Quem já tinha um volume declarado à mão ganha aqui um "consumo por
// animal" equivalente, pra não perder a estimativa já existente quando o campo virar somente
// leitura na próxima edição.
function migrateConsumoPorAnimalIfNeeded() {
  let mudou = false;
  [...state.leads, ...state.clientesAtivos].forEach(entidade => {
    (entidade.categoriasAnimais || []).forEach(cat => {
      if (cat.consumoPorAnimalDia === undefined) {
        const qtd = Number(cat.quantidade) || 0;
        const vol = Number(cat.volumeMensalEstimado) || 0;
        cat.consumoPorAnimalDia = (qtd > 0 && vol > 0) ? String(Math.round((vol * 1000 / (qtd * 30)) * 1000) / 1000) : "";
        mudou = true;
      }
    });
  });
  if (mudou) saveState();
}

// ---------- Acessores combinados (usados por pedidos, contatos, agenda, busca, etc.) ----------
function getEntidadeById(id) {
  return state.leads.find(x => x.id === id) || state.clientesAtivos.find(x => x.id === id) || null;
}
function isLeadId(id) { return state.leads.some(x => x.id === id); }
function todasEntidadesSelecionaveis() {
  return [...state.leads.filter(l => l.status === "Ativo"), ...state.clientesAtivos];
}

let state = loadState();
migrateLegacyClientsIfNeeded();
migrateLeadSchemaV5IfNeeded();
migrateFornecedoresEhCasaIfNeeded();
migrateConsumoPorAnimalIfNeeded();
// Renomeação da marca: instâncias antigas (BRUNOSASSO) ou sem nome passam a "Manejo"
function migrateBrandNameIfNeeded() {
  if (state.config && (!state.config.nomeCrm || /brunosasso/i.test(state.config.nomeCrm))) {
    state.config.nomeCrm = "Manejo";
    saveState();
  }
}
migrateBrandNameIfNeeded();

function aplicarConfigMarca() {
  const cfg = state.config || {};
  document.title = `${cfg.nomeCrm || "CRM"} CRM`;

  const railBrand = document.getElementById("rail-brand-name");
  if (railBrand) railBrand.textContent = cfg.nomeCrm || "CRM";
  const railNome = document.getElementById("rail-user-nome");
  if (railNome) railNome.textContent = cfg.nomeUsuario || "Usuário";
  const railCargo = document.getElementById("rail-user-cargo");
  if (railCargo) railCargo.textContent = cfg.cargoUsuario || "";
  const avatarHtml = cfg.fotoUsuarioDataUrl ? `<img src="${cfg.fotoUsuarioDataUrl}" alt="">` : initials(cfg.nomeUsuario);
  const railAvatar = document.getElementById("rail-user-avatar");
  if (railAvatar) railAvatar.innerHTML = avatarHtml;
  const perfilFotoPreview = document.getElementById("perfil-foto-preview");
  if (perfilFotoPreview) perfilFotoPreview.innerHTML = avatarHtml;
  const btnRemoverFotoPerfil = document.getElementById("btn-remover-foto-perfil");
  if (btnRemoverFotoPerfil) btnRemoverFotoPerfil.style.display = cfg.fotoUsuarioDataUrl ? "" : "none";
  const perfilNome = document.getElementById("perfil-nome-usuario");
  if (perfilNome) perfilNome.value = cfg.nomeUsuario || "";
  const perfilCargo = document.getElementById("perfil-cargo-usuario");
  if (perfilCargo) perfilCargo.value = cfg.cargoUsuario || "";
  const perfilWhatsapp = document.getElementById("perfil-whatsapp-usuario");
  if (perfilWhatsapp) perfilWhatsapp.value = cfg.whatsappUsuario || "";
  const perfilEmail = document.getElementById("perfil-email-usuario");
  if (perfilEmail) perfilEmail.value = cfg.emailUsuario || "";

  const nomeEmpresa = cfg.nomeEmpresa || "";
  const hintFornecedores = document.getElementById("hint-fornecedores-casa");
  if (hintFornecedores) hintFornecedores.textContent = `Fornecedores (${nomeEmpresa || "empresa"} ou concorrentes) são cadastrados aqui — nunca como cliente.`;
  const tituloRadar = document.getElementById("titulo-radar-competitivo");
  if (tituloRadar) tituloRadar.textContent = `Radar — ${nomeEmpresa || "empresa"} vs. concorrência`;
  const hintConcorrencia = document.getElementById("hint-carteira-concorrencia");
  if (hintConcorrencia) hintConcorrencia.textContent = `Todo cliente cujo fornecedor atual não é ${nomeEmpresa || "a empresa"} é tratado como concorrência.`;
  const legendCadastro = document.getElementById("legend-cadastro-empresa");
  if (legendCadastro) legendCadastro.textContent = `Cadastro no ${nomeEmpresa || "sistema"}`;
  const sacOptAnalise = document.getElementById("sac-status-opt-analise");
  if (sacOptAnalise) sacOptAnalise.textContent = `Em análise pelo time ${nomeEmpresa || "responsável"}`;
  const labelPedidoEmpresa = document.getElementById("label-pedido-numero-empresa");
  if (labelPedidoEmpresa) labelPedidoEmpresa.textContent = `no ${nomeEmpresa || "sistema"}`;
  const fornecedorOptCasa = document.getElementById("fornecedor-tipo-opt-casa");
  if (fornecedorOptCasa) fornecedorOptCasa.textContent = "Nós";
}
aplicarConfigMarca();

function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function daysBetween(d1, d2) { return Math.round((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24)); }
function addDays(dateStr, days) { const d = new Date(dateStr); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function formatDate(iso) { if (!iso) return "-"; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }
function formatMoney(v) { const n = Number(v) || 0; return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
// Volume/quantidade com separador de milhar pt-BR — "v.toFixed(1)" cru vira "67500.0" (sem
// separador e com ponto em vez de vírgula) pra volumes grandes; toLocaleString formata igual
// em qualquer tela ou relatório que mostre tonelagem.
function formatVolume(v) { const n = Number(v) || 0; return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
// Contagem inteira (cabeças de rebanho, etc.) com separador de milhar — sem casas decimais.
function formatInt(v) { const n = Number(v) || 0; return n.toLocaleString("pt-BR"); }
function escapeHtml(str) { if (str === null || str === undefined || str === "") return ""; return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function field(label, value) { return `<div><span>${label}</span>${escapeHtml(value) || "-"}</div>`; }
// Variante pra relatórios exportados: campo some por completo se vazio, em vez de mostrar "-"
// (ver ponto 7 da revisão de relatórios — excesso de "-" polui um documento que vai pro cliente).
function reportField(label, value) { return escapeHtml(value) ? field(label, value) : ""; }
function consultorNome(id) { const c = state.consultores.find(x => x.id === id); return c ? c.nome : ""; }
function initials(name) { if (!name) return "?"; return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join(""); }
function onlyDigits(str) { return (str || "").replace(/\D/g, ""); }

// ---------- Acessores ----------
function pedidosForClient(clientId) { return state.pedidos.filter(p => p.clientId === clientId).sort((a, b) => new Date(a.dataPedido) - new Date(b.dataPedido)); }
// Valor do pedido: só o valor lançado — preço varia demais por produto pra estimar por um
// "preço médio" único (mineral simples e ração premium não têm o mesmo R$/ton).
function valorPedido(p) {
  return Number(p.valor) || 0;
}
// Link de WhatsApp do contato principal de um cliente/lead
function waLinkForClient(clientId) {
  if (!clientId) return null;
  const ent = getEntidadeById(clientId);
  const pessoas = (ent && ent.contatosPessoas) || [];
  const p = pessoas.find(cp => cp.principal && onlyDigits(cp.whatsapp)) || pessoas.find(cp => onlyDigits(cp.whatsapp));
  return p ? `https://wa.me/55${onlyDigits(p.whatsapp)}` : null;
}
// Tendência de volume (e valor) : últimos 12 meses vs. os 12 meses anteriores (reutilizado por
// fidelização, churn e a Matriz Nine Box).
function computeVolumeTrend(cliente) {
  const pedidos = pedidosForClient(cliente.id);
  const hoje = todayStr();
  const inicioAtual = addDays(hoje, -365);
  const inicioAnterior = addDays(hoje, -730);
  const pedidosAtuais = pedidos.filter(p => p.dataPedido >= inicioAtual && p.dataPedido <= hoje);
  const pedidosAnteriores = pedidos.filter(p => p.dataPedido >= inicioAnterior && p.dataPedido < inicioAtual);
  const volumeAtual = pedidosAtuais.reduce((s, p) => s + (Number(p.volume) || 0), 0);
  const volumeAnterior = pedidosAnteriores.reduce((s, p) => s + (Number(p.volume) || 0), 0);
  const valorAtual = pedidosAtuais.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const valorAnterior = pedidosAnteriores.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  return { volumeAtual, volumeAnterior, valorAtual, valorAnterior };
}
// "Cliente Fidelizado": cresceu (ou manteve +1t) frente ao período anterior. Sem período anterior, não classifica.
function isClienteFidelizado(cliente) {
  const { volumeAtual, volumeAnterior } = computeVolumeTrend(cliente);
  return volumeAnterior > 0 && volumeAtual >= volumeAnterior + 1;
}
// Score único de risco de churn (0-100), combinando sinais já existentes no CRM
function computeChurnRisco(cliente) {
  let score = 0;
  const motivos = [];
  const insight = computeClientInsight(cliente);
  if (insight.status === "atrasado") { score += 40; motivos.push("recompra atrasada"); }
  else if (insight.status === "atencao") { score += 15; motivos.push("recompra no limite"); }

  const hoje = todayStr();
  const sacAberto = sacsForClient(cliente.id).some(s => !["Resolvido", "Encerrado sem resolução"].includes(s.status) && daysBetween(s.data, hoje) > 5);
  if (sacAberto) { score += 25; motivos.push("SAC aberto há +5 dias"); }

  const contatos = contatosForClient(cliente.id);
  if (contatos.length && daysBetween(contatos[0].data, hoje) > 30) { score += 20; motivos.push("sem contato há +30 dias"); }

  const { volumeAtual, volumeAnterior } = computeVolumeTrend(cliente);
  if (volumeAtual < volumeAnterior) { score += 15; motivos.push("volume em queda"); }

  score = Math.min(100, score);
  const nivel = score <= 30 ? "Baixo" : score <= 60 ? "Médio" : "Alto";
  return { score, nivel, motivos };
}

// ---------- Matriz Nine Box (Clientes) ----------
// Divide uma lista de {id, valor} em terços relativos (nunca faixas fixas em R$/score) — o mesmo
// cliente pode mudar de terço só porque a carteira ao redor dele mudou, e é assim mesmo que deve
// funcionar: a classificação é sempre relativa à carteira atual.
function computeTercosPorId(itens) {
  const validos = itens.filter(x => x.valor != null);
  const ordenado = validos.slice().sort((a, b) => a.valor - b.valor);
  const n = ordenado.length;
  const corte1 = Math.floor(n / 3);
  const corte2 = Math.floor(n * 2 / 3);
  const nivelPorId = {};
  ordenado.forEach((x, i) => { nivelPorId[x.id] = i < corte1 ? "Baixo" : i < corte2 ? "Médio" : "Alto"; });
  return nivelPorId;
}
// R$/atividade nos últimos 12 meses — null (sem dado) quando não há contato nem visita registrada,
// pra não dividir por zero nem sugerir uma eficiência que não dá pra calcular de verdade.
function computeEficienciaCliente(cliente, valorUltimos12Meses) {
  const atividades = contatosForClient(cliente.id).length + visitasForClient(cliente.id).length;
  if (!atividades) return null;
  return valorUltimos12Meses / atividades;
}
// Selo por terço de eficiência: só os extremos (top/bottom 1/3) recebem selo — o terço do meio fica
// sem marcação pra não poluir a matriz com informação que não muda a ação a tomar.
function computeEficienciaSelos(clientesAtivos, valorPorClientId) {
  const itens = clientesAtivos
    .map(c => ({ id: c.id, valor: computeEficienciaCliente(c, valorPorClientId[c.id] || 0) }))
    .filter(x => x.valor != null);
  const ordenado = itens.slice().sort((a, b) => a.valor - b.valor);
  const n = ordenado.length;
  const corte1 = Math.floor(n / 3);
  const corte2 = Math.floor(n * 2 / 3);
  const seloPorId = {};
  ordenado.forEach((x, i) => {
    if (i < corte1) seloPorId[x.id] = "manutencao";
    else if (i >= corte2) seloPorId[x.id] = "eficiente";
  });
  return seloPorId;
}
const NINE_BOX_LABELS = {
  Alto:  { Baixo: "Reavaliar esforço", Médio: "Atenção",         Alto: "Resgate urgente" },
  Médio: { Baixo: "Monitorar",         Médio: "Manter relação",  Alto: "Proteger" },
  Baixo: { Baixo: "Desenvolver",       Médio: "Expandir",        Alto: "Cliente-modelo" }
};
const NINE_BOX_ROW_TONE = { Alto: "late", Médio: "warn", Baixo: "ok" };

// Programa de indicação — quem foi indicado por este cliente (cruzamento por NOME em texto livre;
// sensível a digitação diferente, ex.: "Luiz" vs "Luiz Mousquer" — limitação aceitável nesta 1ª versão)
function indicadosPor(cliente) {
  const chaves = [cliente.nome, cliente.nomeFantasia].filter(Boolean).map(n => n.trim().toLowerCase());
  if (!chaves.length) return [];
  return [...state.leads, ...state.clientesAtivos].filter(e => {
    const ind = (e.indicadoPor || "").trim().toLowerCase();
    return ind && chaves.includes(ind) && e.id !== cliente.id;
  });
}
function contatosForClient(clientId) { return state.contatos.filter(c => c.clientId === clientId).sort((a, b) => new Date(b.data) - new Date(a.data)); }
function competitivasForClient(clientId) { return state.competitivas.filter(c => c.clientId === clientId).sort((a, b) => new Date(b.data) - new Date(a.data)); }
function sacsForClient(clientId) { return state.sacs.filter(s => s.clientId === clientId).sort((a, b) => new Date(b.data) - new Date(a.data)); }
function propostasForLead(leadId) { return state.propostas.filter(p => p.leadId === leadId).sort((a, b) => (a.versao || 0) - (b.versao || 0)); }
function badgeClassForPropostaStatus(status) {
  if (status === "Aceita") return "badge-ok";
  if (status === "Recusada" || status === "Substituída por nova versão") return "badge-late";
  return "badge-warn";
}
function mostBoughtProduct(pedidos) {
  if (!pedidos.length) return null;
  const counts = {};
  pedidos.forEach(p => {
    const nomes = (p.produtos && p.produtos.length) ? p.produtos.map(x => x.nome) : [p.produto];
    nomes.filter(Boolean).forEach(nome => { counts[nome] = (counts[nome] || 0) + 1; });
  });
  const entries = Object.entries(counts);
  return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : null;
}

// ---------- Toasts ----------
function showToast(message) {
  const stack = document.getElementById("toast-stack");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---------- Módulo 4 · Ciclo de recompra ----------
// Consumo mensal declarado por PRODUTO (campos "Produto que usa hoje" + "Volume mensal
// estimado", lado a lado em cada categoria animal na aba Perfil Produtivo) — não por cliente.
// Categorias diferentes podem usar produtos diferentes com ritmos de consumo bem diferentes
// (ex: mineral pra cria, ração pra engorda), então somar tudo num único total do cliente dava
// uma estimativa de recompra sem sentido quando comparada ao volume de UM pedido específico.
function consumosPorProdutoCliente(client) {
  const mapa = {};
  (client.categoriasAnimais || []).forEach(c => {
    const produto = (c.produtoAtual || "").trim();
    const volume = Number(c.volumeMensalEstimado) || 0;
    if (!produto || !volume) return;
    mapa[produto] = (mapa[produto] || 0) + volume;
  });
  return Object.entries(mapa).map(([produto, consumoMensal]) => ({ produto, consumoMensal }));
}
function consumoMensalPorProduto(client, produtoNome) {
  if (!produtoNome) return 0;
  const alvo = produtoNome.trim().toLowerCase();
  return consumosPorProdutoCliente(client)
    .filter(c => c.produto.toLowerCase() === alvo)
    .reduce((s, c) => s + c.consumoMensal, 0);
}

// ---------- Classificação A/B/C por potencial de volume ----------
// Cadência de visita sugerida por faixa — não bloqueia nada, só alimenta o alerta "Visita em
// atraso" no Roteiro do dia, pra cliente de baixo potencial não tomar o mesmo tempo que um de
// alto potencial.
const CLASSIFICACAO_CADENCIA_DIAS = { A: 15, B: 30, C: 60 };

// "Tamanho" do cliente pra fins de priorização: volume médio mensal REAL de compra (histórico de
// pedidos, quando existe) ou o consumo mensal já declarado no cadastro (Perfil Produtivo) pra
// quem acabou de ser implantado e ainda não tem pedido — a classificação já nasce com o cliente.
function volumePotencialMensalCliente(client) {
  const pedidos = pedidosForClient(client.id);
  if (pedidos.length) {
    const meses = Math.max(1, Math.min(12, daysBetween(pedidos[0].dataPedido, todayStr()) / 30));
    const volumeTotal = pedidos.reduce((s, p) => s + (Number(p.volume) || 0), 0);
    return volumeTotal / meses;
  }
  return (client.categoriasAnimais || []).reduce((s, c) => s + (Number(c.volumeMensalEstimado) || 0), 0);
}

// Classifica todos os clientes ativos por percentil de volume (Pareto: top 20% = A, próximos
// 30% = B, restante 50% = C) — se ajusta sozinho conforme a carteira cresce, sem limiar fixo de
// toneladas que precisaria ser recalibrado por território/porte de operação.
function classificacaoABCClientes() {
  const ranking = state.clientesAtivos
    .filter(c => c.status === "Ativo")
    .map(c => ({ id: c.id, volume: volumePotencialMensalCliente(c) }))
    .sort((a, b) => b.volume - a.volume);
  const n = ranking.length;
  const corteA = Math.ceil(n * 0.2);
  const corteB = Math.ceil(n * 0.5);
  const mapa = {};
  ranking.forEach((r, i) => { mapa[r.id] = i < corteA ? "A" : i < corteB ? "B" : "C"; });
  return mapa;
}
function classificacaoBadgeHtml(classe) {
  if (!classe) return "";
  return `<span class="badge-classe badge-classe-${classe.toLowerCase()}" title="Classificação por potencial de volume — A é o maior potencial">${classe}</span>`;
}
function classificarCicloStatus(daysSinceLast, cicloDias, favoriteProduct) {
  const ratio = daysSinceLast / cicloDias;
  let status, statusLabel, tip;
  if (ratio <= 0.8) {
    status = "em-dia"; statusLabel = "Em dia";
    tip = `Cliente dentro do ciclo normal (a cada ${cicloDias} dias em média, já se passaram ${daysSinceLast}).`;
  } else if (ratio <= 1.2) {
    status = "atencao"; statusLabel = "Hora de contatar";
    tip = `Próximo do intervalo médio de compra (${cicloDias} dias — já se passaram ${daysSinceLast}). Bom momento para contato${favoriteProduct ? `, oferecendo ${favoriteProduct}` : ""}.`;
  } else {
    status = "atrasado"; statusLabel = "Atrasado";
    tip = `${daysSinceLast} dias sem comprar, acima do intervalo médio (${cicloDias} dias). Priorize o contato${favoriteProduct ? ` — considere reforçar ${favoriteProduct}` : ""}.`;
  }
  return { status, statusLabel, tip };
}
function computeClientInsight(client) {
  const pedidos = pedidosForClient(client.id);
  const contatos = contatosForClient(client.id);
  const ltv = pedidos.reduce((sum, p) => sum + valorPedido(p), 0);
  const favoriteProduct = mostBoughtProduct(pedidos);
  const lastContactDate = contatos.length ? contatos[0].data : null;
  const consumosPorProduto = consumosPorProdutoCliente(client);

  if (pedidos.length < 2) {
    const last = pedidos[pedidos.length - 1];
    const daysSinceLast = last ? daysBetween(last.dataPedido, todayStr()) : null;

    // Sem 2 pedidos não dá pra tirar uma média de intervalo — mas se existe consumo mensal
    // declarado especificamente para o PRODUTO desse pedido (não uma soma de todos os produtos
    // do cliente), dá pra estimar quantos dias aquele volume deve durar e prever a próxima
    // compra a partir disso em vez de deixar "sem histórico suficiente".
    const consumoDoProduto = last ? consumoMensalPorProduto(client, last.produto) : 0;
    if (last && consumoDoProduto > 0) {
      const volumeUltimo = Number(last.volume) || 0;
      const consumoDiario = consumoDoProduto / 30;
      const cicloDias = volumeUltimo > 0 ? Math.max(1, Math.round(volumeUltimo / consumoDiario)) : null;
      if (cicloDias) {
        const nextExpectedDate = addDays(last.dataPedido, cicloDias);
        const diasRestantes = cicloDias - daysSinceLast;
        const progresso = Math.max(0, Math.min(100, Math.round((daysSinceLast / cicloDias) * 100)));
        const { status, statusLabel, tip } = classificarCicloStatus(daysSinceLast, cicloDias, favoriteProduct);
        return {
          status, statusLabel, avgInterval: cicloDias, avgVolume: volumeUltimo, daysSinceLast,
          lastPedidoDate: last.dataPedido, nextExpectedDate, diasRestantes, progresso,
          ltv, favoriteProduct, lastContactDate, consumosPorProduto, cicloOrigem: "consumo",
          tip: `${tip} Estimativa baseada no consumo declarado de ${last.produto} (${formatVolume(consumoDoProduto)} t/mês), não em histórico de pedidos.`
        };
      }
    }

    return {
      status: "sem-historico", statusLabel: "Sem histórico suficiente", avgInterval: null,
      daysSinceLast, lastPedidoDate: last ? last.dataPedido : null, nextExpectedDate: null,
      ltv, favoriteProduct, lastContactDate, consumosPorProduto, cicloOrigem: null,
      tip: pedidos.length === 0
        ? (consumosPorProduto.length
          ? "Há consumo mensal declarado por produto, mas ainda sem nenhum pedido registrado — registre o primeiro pedido para a previsão de recompra começar a valer."
          : "Cliente ainda sem nenhum pedido registrado. Registre o primeiro pedido para começar a acompanhar o ciclo de compra.")
        : "Só há um pedido registrado, e não há consumo mensal declarado para o produto desse pedido — ainda não dá para estimar a recompra."
    };
  }

  const ultimos3 = pedidos.slice(-3);
  const intervals = [];
  for (let i = 1; i < ultimos3.length; i++) intervals.push(daysBetween(ultimos3[i - 1].dataPedido, ultimos3[i].dataPedido));
  const avgInterval = Math.max(1, Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length));
  const avgVolume = ultimos3.reduce((s, p) => s + (Number(p.volume) || 0), 0) / ultimos3.length;
  const lastPedidoDate = pedidos[pedidos.length - 1].dataPedido;
  const daysSinceLast = daysBetween(lastPedidoDate, todayStr());
  const nextExpectedDate = addDays(lastPedidoDate, avgInterval);
  const diasRestantes = avgInterval - daysSinceLast;
  const progresso = Math.max(0, Math.min(100, Math.round((daysSinceLast / avgInterval) * 100)));

  const { status, statusLabel, tip: tipBase } = classificarCicloStatus(daysSinceLast, avgInterval, favoriteProduct);
  let tip = tipBase;
  if (lastContactDate) {
    const daysSinceContact = daysBetween(lastContactDate, todayStr());
    if (daysSinceContact > avgInterval) tip += ` Último contato foi há ${daysSinceContact} dias — vale retomar.`;
  }
  return { status, statusLabel, avgInterval, avgVolume, daysSinceLast, lastPedidoDate, nextExpectedDate, diasRestantes, progresso, ltv, favoriteProduct, lastContactDate, consumosPorProduto, cicloOrigem: "historico", tip };
}

// ---------- Estoque do cliente (por categoria animal) — base do forecast de recompra ----------
function estoquesForCategoria(clientId, categoriaId) {
  return state.estoques
    .filter(e => e.clientId === clientId && e.categoriaAnimalId === categoriaId)
    .sort((a, b) => new Date(b.data) - new Date(a.data));
}
function estoquesForClient(clientId) {
  return state.estoques.filter(e => e.clientId === clientId).sort((a, b) => new Date(b.data) - new Date(a.data));
}
// Projeta, a partir da última leitura de estoque e do consumo mensal declarado na categoria,
// quantos dias restam e em que data o estoque deve se esgotar. Sem leitura ou sem consumo
// declarado (volumeMensalEstimado), não há como prever — retorna null.
function computeEstoqueForecast(clientId, categoria) {
  const leituras = estoquesForCategoria(clientId, categoria.id);
  const consumoMensal = Number(categoria.volumeMensalEstimado) || 0;
  if (!leituras.length || consumoMensal <= 0) return null;
  const ultima = leituras[0];
  const consumoDiario = consumoMensal / 30;
  const diasDesdeLeitura = daysBetween(ultima.data, todayStr());
  const estoqueAtualEstimado = Number(ultima.quantidadeEstoque) - (consumoDiario * diasDesdeLeitura);
  const diasRestantes = Math.round(estoqueAtualEstimado / consumoDiario);
  const dataPrevistaEsgotamento = addDays(todayStr(), diasRestantes);
  return { ultima, consumoDiario, estoqueAtualEstimado, diasRestantes, dataPrevistaEsgotamento };
}
// Todas as previsões de estoque de um cliente, uma por categoria animal (só as que têm previsão possível)
function computeEstoqueForecastsCliente(entidade) {
  return (entidade.categoriasAnimais || [])
    .map(cat => ({ categoria: cat, forecast: computeEstoqueForecast(entidade.id, cat) }))
    .filter(x => x.forecast);
}
function estoqueAlertaDispensadoManualmente(clientId, categoriaId, dataLeitura) {
  return (state.estoqueAlertasDispensados || []).includes(`${clientId}|${categoriaId}|${dataLeitura}`);
}
function dispensarEstoqueAlerta(clientId, categoriaId, dataLeitura) {
  state.estoqueAlertasDispensados = state.estoqueAlertasDispensados || [];
  state.estoqueAlertasDispensados.push(`${clientId}|${categoriaId}|${dataLeitura}`);
  saveState();
}
function estoqueAlertaSuprimido(clientId, categoriaId, forecast) {
  const dataLeitura = forecast.ultima.data;
  const entregue = state.pedidos.some(p => p.clientId === clientId && p.status === "Entregue" && (p.dataEntregaRealizada || p.dataPedido) >= dataLeitura);
  if (entregue) return true;
  return estoqueAlertaDispensadoManualmente(clientId, categoriaId, dataLeitura);
}

// ---------- Alertas ----------
// Próxima ocorrência de um aniversário (mês/dia), ignorando o ano
function aniversarioInfo(dateStr) {
  if (!dateStr) return null;
  // Parse manual da string (não "new Date(dateStr)"): "YYYY-MM-DD" é interpretado como UTC
  // meia-noite, e .getMonth()/.getDate() locais num fuso atrás de UTC (Brasil) devolviam o dia
  // anterior ao que foi digitado.
  const [ys, ms, ds] = dateStr.split("-").map(Number);
  if (!ys || !ms || !ds) return null;
  // "new Date()" sem argumento reflete o relógio local de verdade — mesmo raciocínio acima:
  // NÃO usar "new Date(todayStr())" aqui, pois teria o mesmo problema de parse em UTC.
  const now = new Date();
  const h0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = h0.getFullYear();
  let alvo = new Date(year, ms - 1, ds);
  if (alvo < h0) { year++; alvo = new Date(year, ms - 1, ds); }
  return { dias: Math.round((alvo - h0) / 86400000), anos: year - ys, label: alvo.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) };
}

function computeAlerts() {
  const alerts = [];
  const today = todayStr();

  state.leads.filter(l => l.status === "Ativo").forEach(l => {
    if (l.statusProximoPasso !== "Feito" && l.dataProximoPasso && l.dataProximoPasso < today) {
      alerts.push({ clientId: l.id, clientName: l.nome, tipo: "Próximo passo vencido", severidade: "late",
        mensagem: `"${l.proximoPassoTipo || "Próximo passo"}" venceu em ${formatDate(l.dataProximoPasso)}.` });
    }
    const contatos = contatosForClient(l.id);
    const dias = contatos.length ? daysBetween(contatos[0].data, today) : null;
    if (dias === null || dias > 7) {
      alerts.push({ clientId: l.id, clientName: l.nome, tipo: "Lead sem contato", severidade: "warn",
        mensagem: dias === null ? "Nenhum contato registrado ainda." : `Sem contato há ${dias} dias.` });
    }
    if (l.dataProximoPasso === today) {
      alerts.push({ clientId: l.id, clientName: l.nome, tipo: "Follow-up hoje", severidade: "today",
        mensagem: `"${l.proximoPassoTipo || "Próximo passo"}" agendado para hoje.` });
    }
    contatos.forEach(ct => {
      if (ct.dataProximoContato === today) {
        alerts.push({ clientId: l.id, clientName: l.nome, tipo: "Follow-up hoje", severidade: "today", mensagem: `Próximo contato agendado para hoje.` });
      }
    });

    if (l.etapaFunil === "Proposta enviada") {
      const ultimaMudanca = (l.historicoEtapas || []).slice().reverse().find(h => h.etapa === "Proposta enviada");
      const diasNaEtapa = ultimaMudanca ? daysBetween(ultimaMudanca.data, today) : null;
      if (diasNaEtapa !== null && diasNaEtapa > 3) {
        alerts.push({ clientId: l.id, clientName: l.nome, tipo: "Proposta sem atualização", severidade: "orange",
          mensagem: `Há ${diasNaEtapa} dias em "Proposta enviada" sem atualização.` });
      }
    }

    if (l.temperatura === "Quente") {
      const ultimaEtapa = (l.historicoEtapas || [])[(l.historicoEtapas || []).length - 1];
      const diasSemAvanco = ultimaEtapa ? daysBetween(ultimaEtapa.data, today) : null;
      if (diasSemAvanco !== null && diasSemAvanco > 5) {
        alerts.push({ clientId: l.id, clientName: l.nome, tipo: "Lead quente parado", severidade: "late",
          mensagem: `Lead quente sem avanço de etapa há ${diasSemAvanco} dias.` });
      }
    }
  });

  state.leads.filter(l => l.status === "Bloqueado").forEach(l => {
    const dias = l.dataEncerramento ? daysBetween(l.dataEncerramento, today) : null;
    if (dias !== null && dias > 30) {
      alerts.push({ clientId: l.id, clientName: l.nome, tipo: "Bloqueado sem revisão", severidade: "warn",
        mensagem: `Bloqueado há ${dias} dias — vale reavaliar.` });
    }
  });

  const classificacaoVisitas = classificacaoABCClientes();
  state.clientesAtivos.filter(c => c.status === "Ativo").forEach(c => {
    const insight = computeClientInsight(c);
    if (insight.avgInterval) {
      const diasParaProximo = insight.avgInterval - insight.daysSinceLast;
      const limiar = Number(c.alertaRecompraDias) || 5;
      if (diasParaProximo <= limiar) {
        alerts.push({ clientId: c.id, clientName: c.nome, tipo: "Recompra próxima",
          severidade: diasParaProximo < 0 ? "late" : "warn",
          mensagem: diasParaProximo < 0
            ? `${Math.abs(diasParaProximo)} dias além do previsto para o próximo pedido.`
            : `Faltam ~${diasParaProximo} dias para o próximo pedido previsto.` });
      }
    }
    if (insight.status === "atrasado" && insight.avgInterval) {
      alerts.push({ clientId: c.id, clientName: c.nome, tipo: "Cliente em risco", severidade: "late",
        mensagem: `${insight.daysSinceLast} dias sem pedido, além do ciclo esperado.` });
    }

    computeEstoqueForecastsCliente(c).forEach(({ categoria, forecast }) => {
      if (forecast.diasRestantes <= 20 && !estoqueAlertaSuprimido(c.id, categoria.id, forecast)) {
        alerts.push({ clientId: c.id, clientName: c.nome, tipo: "Estoque baixo",
          categoriaAnimalId: categoria.id, dataLeitura: forecast.ultima.data,
          severidade: forecast.diasRestantes < 0 ? "late" : "orange",
          mensagem: forecast.diasRestantes < 0
            ? `Estoque de ${categoriaRowLabel(categoria)} já deve ter esgotado (previsto ${formatDate(forecast.dataPrevistaEsgotamento)}).`
            : `Estoque de ${categoriaRowLabel(categoria)} deve acabar em ~${forecast.diasRestantes} dias (${formatDate(forecast.dataPrevistaEsgotamento)}).` });
      }
    });

    sacsForClient(c.id).filter(s => !["Resolvido", "Encerrado sem resolução"].includes(s.status)).forEach(s => {
      const dias = daysBetween(s.data, today);
      if (dias > 5) alerts.push({ clientId: c.id, clientName: c.nome, tipo: "SAC aberto", severidade: "orange",
        mensagem: `${s.numero} aberto há ${dias} dias sem atualização.` });
    });

    if (statusGeralDocumentacao(c) !== "Completo") {
      alerts.push({ clientId: c.id, clientName: c.nome, tipo: "Documento pendente", severidade: "info",
        mensagem: `Documentação ${statusGeralDocumentacao(c).toLowerCase()}.` });
    }

    upsellsForClient(c.id).filter(u => !["Convertida", "Descartada"].includes(u.status)).forEach(u => {
      const dias = daysBetween(u.dataIdentificacao, today);
      if (dias > 15) alerts.push({ clientId: c.id, clientName: c.nome, tipo: "Upsell sem avanço", severidade: "warn",
        mensagem: `Oportunidade "${u.produto}" sem avanço há ${dias} dias.` });
    });

    // Visita em atraso conforme a cadência da classificação A/B/C (potencial por volume) — cliente
    // de maior potencial cobra visita mais cedo que um de potencial baixo.
    const classeVisita = classificacaoVisitas[c.id];
    if (classeVisita) {
      const cadenciaDias = CLASSIFICACAO_CADENCIA_DIAS[classeVisita];
      const visitas = visitasForClient(c.id);
      const diasSemVisita = visitas.length ? daysBetween(visitas[0].dataVisita, today) : daysBetween(c.dataConversao || c.criadoEm || today, today);
      if (diasSemVisita > cadenciaDias) {
        alerts.push({ clientId: c.id, clientName: c.nome, tipo: "Visita em atraso",
          severidade: diasSemVisita > cadenciaDias * 1.5 ? "late" : "orange",
          mensagem: `Classificação ${classeVisita} (visitar a cada ${cadenciaDias} dias) — ${diasSemVisita} dias sem visita.` });
      }
    }

    // Datas importantes — aniversário de contato. Severidade "today" no dia exato (não só
    // "info") é o que faz o item entrar no Roteiro do dia como ação de ligar — "info" sozinho
    // só aparece no painel de Alertas, sem virar tarefa acionável.
    (c.contatosPessoas || []).forEach(pessoa => {
      const info = aniversarioInfo(pessoa.dataNascimento);
      if (info && info.dias === 0) {
        alerts.push({ clientId: c.id, clientName: c.nome, tipo: "Aniversário hoje", severidade: "today",
          mensagem: `Ligar para parabenizar ${pessoa.nome || "o contato"} — aniversário hoje.` });
      } else if (info && info.dias <= 7) {
        alerts.push({ clientId: c.id, clientName: c.nome, tipo: "Aniversário próximo", severidade: "info",
          mensagem: `Aniversário de ${pessoa.nome || "contato"} em ${info.label}.` });
      }
    });
    // Datas importantes — aniversário de fidelidade (data de conversão em cliente)
    const infoFid = aniversarioInfo(c.dataConversao);
    if (infoFid && infoFid.dias <= 7 && infoFid.anos > 0) {
      alerts.push({ clientId: c.id, clientName: c.nome, tipo: "Aniversário de cliente", severidade: "info",
        mensagem: `${infoFid.anos} ${infoFid.anos === 1 ? "ano" : "anos"} como cliente em ${infoFid.label}.` });
    }

    // Score de churn "Alto" — evita duplicar se já há "Cliente em risco" por recompra atrasada
    if (typeof computeChurnRisco === "function") {
      const risco = computeChurnRisco(c);
      const jaTemRisco = alerts.some(a => a.clientId === c.id && a.tipo === "Cliente em risco");
      if (risco.nivel === "Alto" && !jaTemRisco) {
        alerts.push({ clientId: c.id, clientName: c.nome, tipo: "Cliente em risco", severidade: "late",
          mensagem: `Risco de churn ALTO (${risco.score}/100): ${risco.motivos.join("; ")}.` });
      }
    }
  });

  const order = { late: 0, today: 1, orange: 2, warn: 3, info: 4 };
  return alerts.sort((a, b) => (order[a.severidade] ?? 3) - (order[b.severidade] ?? 3));
}

function isRoteiroDispensadoHoje(item) {
  const chave = `${todayStr()}|${item.clientId || ""}|${item.tipo}`;
  return (state.roteiroDispensados || []).includes(chave);
}
function marcarRoteiroDispensadoHoje(clientId, tipo) {
  const hoje = todayStr();
  state.roteiroDispensados = (state.roteiroDispensados || []).filter(k => k.startsWith(hoje + "|"));
  state.roteiroDispensados.push(`${hoje}|${clientId || ""}|${tipo}`);
}

function alertVisualClass(sev) { if (sev === "late") return "late"; if (sev === "today") return "today"; if (sev === "orange") return "orange"; if (sev === "info") return "info"; return "upcoming"; }
function badgeClassForSeverity(sev) { if (sev === "late") return "badge-late"; if (sev === "today") return "badge-warn"; return "badge-neutral"; }
function badgeClassForStage(stage) {
  if (stage === "Fechamento") return "badge-ok";
  if (stage === "Proposta enviada" || stage === "Negociação") return "badge-warn";
  return "badge-neutral";
}
function badgeClassForLeadStatus(status) {
  if (status === "Convertido") return "badge-ok";
  if (status === "Bloqueado" || status === "Perdido") return "badge-late";
  return "badge-neutral";
}

// ---------- Navegação principal ----------
function switchMainTab(tabName, preselectClientId) {
  if (tabName !== "ficha") fichaNavStack = [];
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabName));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === tabName));
  if (tabName === "dashboard") { renderDashboardCanvas(); renderDashboard(); }
  if (tabName === "pipeline") renderPipeline();
  if (tabName === "clientes") renderClientList();
  if (tabName === "leads") renderLeadsList();
  if (tabName === "agenda") renderAgenda();
  if (tabName === "competitiva") renderCompetitivaPage();
  if (tabName === "relatorios") initRelatoriosTab();
  if (tabName === "configuracoes") {
    renderConsultorList();
    renderFornecedoresList();
    document.getElementById("input-meta-visitas").value = state.metaVisitasMes || 0;
    document.getElementById("config-nome-empresa").value = state.config.nomeEmpresa || "";
    document.getElementById("config-empresa-representante").value = state.config.empresaRepresentante || "";
    renderLogoRepresentantePreview();
  }
  if (preselectClientId) { /* reserved for future preselect needs */ }
}
document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => switchMainTab(btn.dataset.tab)));

// ---------- Tema escuro ----------
function applyTheme() {
  const dark = localStorage.getItem("crm-theme") === "dark";
  document.body.classList.toggle("theme-dark", dark);
  document.getElementById("theme-toggle").textContent = dark ? "Light" : "Dark";
}
function toggleTheme() {
  const dark = localStorage.getItem("crm-theme") === "dark";
  localStorage.setItem("crm-theme", dark ? "light" : "dark");
  applyTheme();
}
document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
document.getElementById("btn-toggle-dark-settings").addEventListener("click", toggleTheme);
document.getElementById("input-meta-visitas").addEventListener("change", e => {
  state.metaVisitasMes = Number(e.target.value) || 0;
  saveState();
  if (document.getElementById("visitas-widget-body")) renderVisitasWidget();
});
[["config-nome-empresa", "nomeEmpresa"], ["config-empresa-representante", "empresaRepresentante"]]
  .forEach(([domId, key]) => {
    document.getElementById(domId).addEventListener("change", e => {
      state.config[key] = e.target.value.trim();
      saveState();
      aplicarConfigMarca();
    });
  });

// ---------- Dropdown de perfil do usuário (avatar no topo) ----------
document.getElementById("btn-rail-user").addEventListener("click", () => switchMainTab("meus-dados"));
document.querySelectorAll(".perfil-config-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchMainTab(btn.dataset.toptab));
});
document.getElementById("btn-salvar-perfil").addEventListener("click", () => {
  state.config.nomeUsuario = document.getElementById("perfil-nome-usuario").value.trim();
  state.config.cargoUsuario = document.getElementById("perfil-cargo-usuario").value.trim();
  state.config.whatsappUsuario = document.getElementById("perfil-whatsapp-usuario").value.trim();
  state.config.emailUsuario = document.getElementById("perfil-email-usuario").value.trim();
  saveState();
  aplicarConfigMarca();
  showToast("Dados do perfil salvos.");
});
document.getElementById("perfil-foto-input").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  state.config.fotoUsuarioDataUrl = await compressImageFile(file);
  saveState();
  aplicarConfigMarca();
  e.target.value = "";
});
document.getElementById("btn-remover-foto-perfil").addEventListener("click", () => {
  state.config.fotoUsuarioDataUrl = "";
  saveState();
  aplicarConfigMarca();
});

function renderLogoRepresentantePreview() {
  const container = document.getElementById("config-logo-representante-preview");
  if (!container) return;
  container.innerHTML = state.config.logoRepresentanteDataUrl
    ? `<img src="${state.config.logoRepresentanteDataUrl}" alt="Logo do representante"><button type="button" id="btn-remover-logo-representante" class="btn-mini">Remover</button>`
    : `<p class="hint">Nenhuma logo enviada — o cabeçalho do relatório de visita usa texto.</p>`;
  const btnRemover = document.getElementById("btn-remover-logo-representante");
  if (btnRemover) btnRemover.addEventListener("click", () => {
    state.config.logoRepresentanteDataUrl = "";
    saveState();
    renderLogoRepresentantePreview();
  });
}
document.getElementById("config-logo-representante-input").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  state.config.logoRepresentanteDataUrl = await compressImageFile(file);
  saveState();
  renderLogoRepresentantePreview();
  e.target.value = "";
});

// ---------- Busca global ----------
document.getElementById("global-search").addEventListener("input", e => {
  const term = e.target.value.trim();
  if (!term) return;
  const termLower = term.toLowerCase();
  const matchesCliente = state.clientesAtivos.some(c => [c.nome, c.fazenda, c.municipio].some(v => (v || "").toLowerCase().includes(termLower)));
  const matchesLead = state.leads.filter(l => l.status !== "Convertido").some(l => [l.nome, l.fazenda, l.municipio].some(v => (v || "").toLowerCase().includes(termLower)));

  if (!matchesCliente && matchesLead) {
    switchMainTab("leads");
    document.getElementById("busca-lead").value = term;
    renderLeadsList();
  } else {
    switchMainTab("clientes");
    document.getElementById("busca-cliente").value = term;
    renderClientList();
  }
});
// ---------- Menu "+ Novo" (ações rápidas) ----------
document.getElementById("btn-quick-actions").addEventListener("click", e => {
  e.stopPropagation();
  document.getElementById("quick-actions-dropdown").classList.toggle("hidden");
});
document.querySelectorAll("#quick-actions-dropdown .quick-action-item").forEach(btn => {
  btn.addEventListener("click", () => document.getElementById("quick-actions-dropdown").classList.add("hidden"));
});
document.addEventListener("click", e => {
  const dropdown = document.getElementById("quick-actions-dropdown");
  if (!dropdown.classList.contains("hidden") && !e.target.closest(".quick-actions-menu")) {
    dropdown.classList.add("hidden");
  }
});

document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    document.getElementById("global-search").focus();
  }
  if (e.key === "n" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
    openClienteModal();
  }
  if (e.key === "Escape") {
    // #modal-login fica de fora: só fecha por login concluído ou pelo botão
    // "Continuar sem entrar" — senão o usuário pode achar que "entrou" ao
    // simplesmente apertar Esc, e nunca perceber que a sincronização não está ativa.
    document.querySelectorAll(".modal-overlay:not(.hidden):not(#modal-login)").forEach(m => m.classList.add("hidden"));
  }
});

// ---------- Sino de notificações ----------
document.getElementById("appbar-bell").addEventListener("click", () => {
  const alerts = computeAlerts();
  if (!alerts.length) { showToast("Nenhum alerta no momento."); return; }
  showToast(`${alerts.length} alerta(s) — confira o Dashboard.`);
  switchMainTab("dashboard");
});

function refreshBellBadge() {
  const late = computeAlerts().filter(a => a.severidade === "late").length;
  const badge = document.getElementById("bell-badge");
  if (late > 0) { badge.style.display = "flex"; badge.textContent = late; }
  else { badge.style.display = "none"; }
}

// ---------- Contador animado ----------
function animateCounter(el, target, isMoney) {
  const start = 0;
  const duration = 500;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = start + (target - start) * progress;
    el.textContent = isMoney ? formatMoney(value) : Math.round(value).toLocaleString("pt-BR");
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================================
// Ícones — linha fina monocromática (nunca emoji), reaproveitados em
// Dashboard, Relatórios e Inteligência Competitiva via .panel-ico/.kpi-ico,
// que já definem cor por tom (tone-sage/gold/blue/late/olive/purple).
// ============================================================
const ICONS = {
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>`,
  money: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.3c-.6-.7-1.6-1-2.5-1-1.4 0-2.5.7-2.5 1.9s1.1 1.6 2.5 1.9 2.5.6 2.5 1.9-1.1 1.9-2.5 1.9c-.9 0-1.9-.3-2.5-1"/><path d="M12 6.4v11.2"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  funnel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M9 12h6"/><path d="M9 16h6"/><path d="M9 8h1"/></svg>`,
  barChart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  messageCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  trendingUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  trendingDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  award: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
  mapPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="14" height="10" rx="1"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>`,
  alertTriangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  leaf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  refreshCw: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>`,
  scale: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M5 7h14"/><path d="M5 7 2 14a3 3 0 0 0 6 0z"/><path d="M19 7l-3 7a3 3 0 0 0 6 0z"/></svg>`,
  ticket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4z"/><line x1="9" y1="9" x2="9" y2="15"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`,
  phoneOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.4 12.4 0 0 0 3.81.61 2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2A19 19 0 0 1 2.72 3.81 2 2 0 0 1 4.72 2h3.5a2 2 0 0 1 2 2 12.4 12.4 0 0 0 .61 3.81 2 2 0 0 1-.45 2.11z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  resize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
  gripVertical: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>`
};

// ============================================================
// DASHBOARD — layout editável (widgets: arrastar e redimensionar)
// ============================================================
const DEFAULT_DASHBOARD_LAYOUT = [
  { id: "roteiro", span: 3, title: "Roteiro do dia" },
  { id: "kpis", span: 3, title: "KPIs" },
  { id: "funil", span: 2, title: "Funil de vendas" },
  { id: "alertas", span: 1, title: "Alertas do dia" },
  { id: "contatos", span: 1, title: "Próximos contatos" },
  { id: "volume6m", span: 1, title: "Volume — últimos 6 meses" },
  { id: "ranking", span: 1, title: "Top 5 clientes por volume" },
  { id: "territorio", span: 1, title: "Carteira por município" },
  { id: "visitas", span: 1, title: "Visitas técnicas no mês" }
];
const WIDGET_INNER_HTML = {
  roteiro: `<div id="roteiro-list"></div>`,
  kpis: `<div class="kpi-row" id="kpi-row"></div>`,
  funil: `<div class="funnel-visual" id="funnel-visual"></div>`,
  alertas: `<div id="alertas-list"></div>`,
  contatos: `<div id="proximos-contatos-list"></div>`,
  volume6m: `<div class="bars-chart" id="bars-chart"></div>`,
  ranking: `<div id="ranking-list"></div>`,
  territorio: `<div id="territorio-list"></div>`,
  visitas: `<div id="visitas-widget-body"></div>`
};
const WIDGET_ICON = {
  roteiro: [ICONS.clipboard, "sage"], kpis: [ICONS.barChart, "gold"], funil: [ICONS.funnel, "blue"], alertas: [ICONS.bell, "late"],
  contatos: [ICONS.messageCircle, "olive"], volume6m: [ICONS.trendingUp, "purple"], ranking: [ICONS.award, "gold"], territorio: [ICONS.mapPin, "sage"], visitas: [ICONS.truck, "blue"]
};

let dashboardEditMode = false;
let draggedWidgetId = null;

function getDashboardLayout() {
  if (!state.dashboardLayout || !state.dashboardLayout.length) return DEFAULT_DASHBOARD_LAYOUT.map(w => ({ ...w }));
  const saved = state.dashboardLayout.map(s => {
    const def = DEFAULT_DASHBOARD_LAYOUT.find(d => d.id === s.id) || {};
    return { ...def, ...s };
  }).filter(w => WIDGET_INNER_HTML[w.id]);
  // acrescenta widgets novos que ainda não estão no layout salvo (Roteiro no topo)
  const savedIds = new Set(saved.map(w => w.id));
  const novos = DEFAULT_DASHBOARD_LAYOUT.filter(d => !savedIds.has(d.id) && WIDGET_INNER_HTML[d.id]);
  return [...novos.filter(n => n.id === "roteiro"), ...saved, ...novos.filter(n => n.id !== "roteiro")];
}

function renderDashboardCanvas() {
  const layout = getDashboardLayout();
  const canvas = document.getElementById("dash-canvas");
  canvas.innerHTML = layout.map(w => {
    const [icon, tone] = WIDGET_ICON[w.id] || [ICONS.barChart, "sage"];
    return `
    <div class="dash-widget ${w.id === "kpis" ? "dash-widget-flat" : ""}" data-widget-id="${w.id}" data-span="${w.span}" style="grid-column: span ${w.span};" ${dashboardEditMode ? 'draggable="true"' : ""}>
      <div class="dash-widget-head">
        <h3><span class="panel-ico tone-${tone}">${icon}</span>${escapeHtml(w.title)}</h3>
        ${dashboardEditMode ? `<div class="widget-controls"><button type="button" class="btn-resize-widget" data-widget-id="${w.id}" title="Mudar tamanho">${ICONS.resize}</button><span class="drag-handle" title="Arrastar sobre outro widget pra trocar de lugar">${ICONS.gripVertical}</span></div>` : ""}
      </div>
      ${WIDGET_INNER_HTML[w.id]}
    </div>`;
  }).join("");

  if (dashboardEditMode) attachDashboardEditHandlers();
}

function persistDashboardLayoutFromDOM() {
  const layout = [...document.querySelectorAll("#dash-canvas .dash-widget")].map(el => {
    const def = DEFAULT_DASHBOARD_LAYOUT.find(d => d.id === el.dataset.widgetId) || {};
    return { id: el.dataset.widgetId, span: Number(el.dataset.span) || 1, title: def.title };
  });
  state.dashboardLayout = layout;
  saveState();
}

function attachDashboardEditHandlers() {
  const canvas = document.getElementById("dash-canvas");
  canvas.querySelectorAll(".dash-widget").forEach(el => {
    el.addEventListener("dragstart", () => { draggedWidgetId = el.dataset.widgetId; el.classList.add("dragging"); });
    el.addEventListener("dragend", () => { el.classList.remove("dragging"); draggedWidgetId = null; });
    el.addEventListener("dragover", e => { e.preventDefault(); el.classList.add("drag-over"); });
    el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
    el.addEventListener("drop", e => {
      e.preventDefault();
      el.classList.remove("drag-over");
      if (!draggedWidgetId || draggedWidgetId === el.dataset.widgetId) return;
      const layout = getDashboardLayout();
      const fromIdx = layout.findIndex(w => w.id === draggedWidgetId);
      const toIdx = layout.findIndex(w => w.id === el.dataset.widgetId);
      const [moved] = layout.splice(fromIdx, 1);
      layout.splice(toIdx, 0, moved);
      state.dashboardLayout = layout;
      saveState();
      renderDashboardCanvas();
      renderDashboard();
    });
  });
  canvas.querySelectorAll(".btn-resize-widget").forEach(btn => {
    btn.addEventListener("click", () => {
      const widgetEl = canvas.querySelector(`.dash-widget[data-widget-id="${btn.dataset.widgetId}"]`);
      const nextSpan = (Number(widgetEl.dataset.span) % 3) + 1;
      widgetEl.dataset.span = nextSpan;
      widgetEl.style.gridColumn = `span ${nextSpan}`;
      persistDashboardLayoutFromDOM();
    });
  });
}

document.getElementById("qa-editar-layout").addEventListener("click", () => {
  switchMainTab("dashboard");
  dashboardEditMode = !dashboardEditMode;
  document.getElementById("qa-editar-layout").textContent = dashboardEditMode ? "Concluir edição do layout" : "Editar layout do dashboard";
  renderDashboardCanvas();
  renderDashboard();
});

function renderDashboard() {
  const clientesAtivos = state.clientesAtivos;
  const leadsPipeline = state.leads.filter(l => l.status === "Ativo").length;

  const thisMonth = todayStr().slice(0, 7);
  const lastMonthDate = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);
  const volThis = state.pedidos.filter(p => p.dataPedido && p.dataPedido.slice(0, 7) === thisMonth).reduce((s, p) => s + (Number(p.volume) || 0), 0);
  const volLast = state.pedidos.filter(p => p.dataPedido && p.dataPedido.slice(0, 7) === lastMonth).reduce((s, p) => s + (Number(p.volume) || 0), 0);
  const valorThis = state.pedidos.filter(p => p.dataPedido && p.dataPedido.slice(0, 7) === thisMonth).reduce((s, p) => s + valorPedido(p), 0);
  const pctDelta = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;
  const volumeDelta = pctDelta(volThis, volLast);

  const ICO = {
    box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>`,
    money: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.3c-.6-.7-1.6-1-2.5-1-1.4 0-2.5.7-2.5 1.9s1.1 1.6 2.5 1.9 2.5.6 2.5 1.9-1.1 1.9-2.5 1.9c-.9 0-1.9-.3-2.5-1"/><path d="M12 6.4v11.2"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    funnel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>`
  };
  const noventa = new Date(); noventa.setDate(noventa.getDate() - 90);
  const cut90 = noventa.toISOString().slice(0, 10);
  const volTrim = state.pedidos.filter(p => p.dataPedido && p.dataPedido >= cut90).reduce((s, p) => s + (Number(p.volume) || 0), 0);
  const kpiValor = valorThis > 0
    ? { label: "Valor vendido no mês (R$)", value: valorThis, isMoney: true, delta: null, tone: "gold", icon: ICO.money }
    : { label: "Volume no trimestre (ton)", value: volTrim, isMoney: false, suffix: "t", delta: null, tone: "gold", icon: ICO.money };
  const kpis = [
    { label: "Volume vendido no mês (ton)", value: volThis, isMoney: false, suffix: "t", delta: volumeDelta, tone: "olive", icon: ICO.box },
    kpiValor,
    { label: "Clientes ativos", value: clientesAtivos.length, isMoney: false, delta: null, tone: "sage", icon: ICO.users },
    { label: "Leads no pipeline", value: leadsPipeline, isMoney: false, delta: null, tone: "blue", icon: ICO.funnel }
  ];
  document.getElementById("kpi-row").innerHTML = kpis.map((k, i) => `
    <div class="kpi-card">
      <span class="kpi-ico tone-${k.tone}">${k.icon}</span>
      <div class="kpi-body">
        <div class="kpi-top">
          <span class="kpi-label">${k.label}</span>
          ${k.delta === null ? "" : `<span class="kpi-delta ${k.delta > 0 ? "up" : k.delta < 0 ? "down" : "flat"}">${k.delta > 0 ? "▲" : k.delta < 0 ? "▼" : "–"} ${Math.abs(k.delta)}%</span>`}
        </div>
        <div class="kpi-value" id="kpi-val-${i}">0</div>
      </div>
    </div>
  `).join("");
  kpis.forEach((k, i) => {
    const el = document.getElementById(`kpi-val-${i}`);
    if (k.suffix) {
      let v = 0; const target = k.value;
      const t0 = performance.now();
      (function step(now) { const p = Math.min((now - t0) / 500, 1); el.textContent = formatVolume(target * p) + k.suffix; if (p < 1) requestAnimationFrame(step); })(t0);
    } else animateCounter(el, k.value, k.isMoney);
  });

  const leadsAtivos = state.leads.filter(l => l.status === "Ativo");
  const maxCount = Math.max(1, ...LEAD_FUNIL_STAGES.map(stage => leadsAtivos.filter(l => l.etapaFunil === stage).length));
  const STAGE_FUNIL_COR = ["#A3AE8B", "#93A07A", "#82906A", "#6C7A52", "#5B6746", "#4B5347"]; // mesma ordem de LEAD_FUNIL_STAGES
  const maxBarWidth = 220; // px, largura da etapa com mais leads
  document.getElementById("funnel-visual").innerHTML = LEAD_FUNIL_STAGES.map((stage, i) => {
    const stageLeads = leadsAtivos.filter(l => l.etapaFunil === stage);
    const count = stageLeads.length;
    const valorPotencial = stageLeads.reduce((s, l) => s + (Number(l.potencialValor) || 0), 0);
    const largura = Math.max(24, Math.round((count / maxCount) * maxBarWidth)); // mínimo 24px pra não sumir quando count for baixo
    return `
      <div class="funil-row">
        <div class="funil-bar-slot"><div class="funil-bar" style="width:${largura}px; background:${STAGE_FUNIL_COR[i]};">${count}</div></div>
        <div class="funil-text"><div class="funil-label">${escapeHtml(stage)}</div><div class="funil-value">${formatMoney(valorPotencial)}</div></div>
      </div>`;
  }).join("");

  const alerts = computeAlerts();
  document.getElementById("alertas-list").innerHTML = alerts.length
    ? alerts.slice(0, 12).map(a => `
        <div class="alert-item ${a.tipo === "Estoque baixo" ? "alert-item-destaque" : ""}" data-client-id="${a.clientId}">
          <span class="alert-dot ${alertVisualClass(a.severidade)}"></span>
          <div><div class="name">${escapeHtml(a.clientName)}</div><div class="msg">${a.tipo === "Estoque baixo" ? `<span class="inline-ico">${ICONS.box}</span> ` : ""}${escapeHtml(a.tipo)} — ${escapeHtml(a.mensagem)}</div></div>
        </div>`).join("")
    : `<div class="empty-state-plain">Nenhum alerta no momento.</div>`;
  document.querySelectorAll("#alertas-list .alert-item").forEach(el => el.addEventListener("click", () => openFicha(el.dataset.clientId)));

  const proximos = state.contatos.filter(c => c.dataProximoContato && c.dataProximoContato >= todayStr())
    .sort((a, b) => new Date(a.dataProximoContato) - new Date(b.dataProximoContato)).slice(0, 8);
  document.getElementById("proximos-contatos-list").innerHTML = proximos.length
    ? proximos.map(c => {
        const cli = getEntidadeById(c.clientId);
        const when = c.dataProximoContato === todayStr() ? "Hoje" : c.dataProximoContato === addDays(todayStr(), 1) ? "Amanhã" : formatDate(c.dataProximoContato);
        return `<div class="contact-row"><div class="avatar">${initials(cli ? cli.nome : "?")}</div><div class="info"><div class="name">${escapeHtml(cli ? cli.nome : "-")}</div><div class="type">${escapeHtml(c.tipo)}</div></div><div class="when">${when}</div></div>`;
      }).join("")
    : `<div class="empty-state">Nenhum contato agendado.</div>`;

  const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
  const monthVolumes = months.map(m => state.pedidos.filter(p => p.dataPedido && p.dataPedido.slice(0, 7) === m).reduce((s, p) => s + (Number(p.volume) || 0), 0));
  const maxVol = Math.max(...monthVolumes, 1);
  document.getElementById("bars-chart").innerHTML = months.map((m, i) => {
    const [y, mm] = m.split("-");
    const label = new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
    const h = Math.max((monthVolumes[i] / maxVol) * 100, 3);
    return `<div class="bar-col"><div class="bar-value">${monthVolumes[i].toFixed(0)}</div><div class="bar-fill" style="height:${h}%"></div><div class="bar-label">${label}</div></div>`;
  }).join("");

  const ranking = state.clientesAtivos
    .map(c => ({ client: c, volume: pedidosForClient(c.id).reduce((s, p) => s + (Number(p.volume) || 0), 0) }))
    .filter(r => r.volume > 0).sort((a, b) => b.volume - a.volume).slice(0, 5);
  const maxRank = ranking.length ? ranking[0].volume : 1;
  document.getElementById("ranking-list").innerHTML = ranking.length
    ? ranking.map((r, i) => `
        <div class="rank-row"><span class="rank-n">${i + 1}</span><span class="rank-name">${escapeHtml(r.client.nome)}</span>
          <div class="rank-track"><div class="rank-fill" style="width:${(r.volume / maxRank) * 100}%"></div></div>
          <span class="rank-val">${formatVolume(r.volume)}t</span></div>`).join("")
    : `<div class="empty-state">Nenhum pedido registrado ainda.</div>`;

  // ---- Roteiro do dia (worklist acionável) ----
  if (document.getElementById("roteiro-list")) {
    const hoje = todayStr();
    const acionaveis = computeAlerts()
      .filter(a => a.severidade === "late" || a.severidade === "today" || a.tipo === "Recompra próxima" || a.tipo === "Estoque baixo" || a.tipo === "Visita em atraso")
      .filter(a => !isRoteiroDispensadoHoje(a));
    const visitasHoje = (state.compromissos || []).filter(c => c.data === hoje && !c.feito).map(c => {
      const cli = c.clientId ? getEntidadeById(c.clientId) : null;
      return { compromissoId: c.id, clientId: c.clientId || null, clientName: cli ? cli.nome : (c.descricao || "Compromisso"), tipo: "Agenda de hoje", mensagem: `${c.descricao || "Compromisso"}${c.hora ? " · " + c.hora : ""}`, severidade: "today" };
    });
    const itens = [...visitasHoje, ...acionaveis];
    const head = `<div class="roteiro-head"><span class="roteiro-count">${itens.length} ${itens.length === 1 ? "ação para hoje" : "ações para hoje"}</span></div>`;
    document.getElementById("roteiro-list").innerHTML = head + (itens.length
      ? `<div class="roteiro-items">` + itens.slice(0, 12).map(a => {
          const wa = waLinkForClient(a.clientId);
          const isEstoque = a.tipo === "Estoque baixo";
          return `<div class="roteiro-item ${isEstoque ? "roteiro-item-destaque" : ""}">
            <span class="alert-dot ${alertVisualClass(a.severidade)}"></span>
            <div class="roteiro-txt"><div class="roteiro-name">${escapeHtml(a.clientName)}</div><div class="roteiro-msg">${isEstoque ? `<span class="inline-ico">${ICONS.box}</span> ` : ""}${escapeHtml(a.tipo)} — ${escapeHtml(a.mensagem)}</div></div>
            <div class="roteiro-actions">
              ${isEstoque
                ? `<button type="button" class="roteiro-lock-btn" data-client-id="${a.clientId || ""}" data-categoria-id="${a.categoriaAnimalId || ""}" data-data-leitura="${a.dataLeitura || ""}" title="Some quando o pedido for entregue — clique se perdeu essa venda">${ICONS.lock}</button>`
                : `<button type="button" class="roteiro-feito-dot" data-compromisso-id="${a.compromissoId || ""}" data-client-id="${a.clientId || ""}" data-tipo="${escapeHtml(a.tipo)}" title="Marcar como feito">${ICONS.check}</button>`}
              ${a.clientId ? `<button type="button" class="btn-mini roteiro-open" data-client-id="${a.clientId}">Abrir</button>` : ""}
              ${wa ? `<a class="btn-mini btn-mini-wa" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
            </div>
          </div>`;
        }).join("") + `</div>`
      : `<div class="empty-state-plain">Tudo em dia — nenhuma ação pendente para hoje.</div>`);
    document.querySelectorAll("#roteiro-list .roteiro-open").forEach(b => b.addEventListener("click", () => openFicha(b.dataset.clientId)));
    document.querySelectorAll("#roteiro-list .roteiro-feito-dot").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.compromissoId) {
        const compromisso = state.compromissos.find(c => c.id === b.dataset.compromissoId);
        if (compromisso) compromisso.feito = true;
      } else {
        marcarRoteiroDispensadoHoje(b.dataset.clientId, b.dataset.tipo);
      }
      saveState();
      renderDashboard();
    }));
    document.querySelectorAll("#roteiro-list .roteiro-lock-btn").forEach(b => b.addEventListener("click", () => {
      if (confirm("Marcar que você perdeu essa venda (foi para a concorrência ou o cliente desistiu)? O alerta de estoque baixo desta categoria vai parar de aparecer até uma nova contagem de estoque.")) {
        dispensarEstoqueAlerta(b.dataset.clientId, b.dataset.categoriaId, b.dataset.dataLeitura);
        renderDashboard();
      }
    }));
  }

  // ---- Carteira por município (visão de território) ----
  if (document.getElementById("territorio-list")) {
    const porMun = {};
    state.clientesAtivos.forEach(c => {
      const mun = ((c.municipio || "").trim()) || "—";
      const vol = pedidosForClient(c.id).reduce((s, p) => s + (Number(p.volume) || 0), 0);
      if (!porMun[mun]) porMun[mun] = { clientes: 0, volume: 0 };
      porMun[mun].clientes += 1;
      porMun[mun].volume += vol;
    });
    const linhas = Object.entries(porMun).map(([mun, v]) => ({ mun, ...v })).sort((a, b) => b.volume - a.volume).slice(0, 8);
    const maxT = Math.max(1, ...linhas.map(l => l.volume));
    document.getElementById("territorio-list").innerHTML = linhas.length
      ? linhas.map(l => `
          <div class="rank-row"><span class="rank-name terr-name">${escapeHtml(l.mun)}</span>
            <div class="rank-track"><div class="rank-fill" style="width:${(l.volume / maxT) * 100}%"></div></div>
            <span class="rank-val">${l.volume.toFixed(0)}t<span class="terr-cli"> · ${l.clientes}</span></span></div>`).join("")
      : `<div class="empty-state">Sem dados de território ainda.</div>`;
  }

  if (document.getElementById("visitas-widget-body")) renderVisitasWidget();
  refreshBellBadge();
}

// ============================================================
// PIPELINE (KANBAN)
// ============================================================
function populatePipelineFilters() {
  const municipios = [...new Set(state.leads.map(c => c.municipio).filter(Boolean))].sort();
  const categorias = [...new Set(state.leads.flatMap(c => clientCategoriaList(c)))].sort();
  const produtos = [...new Set(state.leads.map(l => l.produtoInteresse).filter(Boolean))].sort();
  const fill = (id, values, current) => {
    const sel = document.getElementById(id);
    sel.innerHTML = sel.options[0].outerHTML + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    sel.value = current || "";
  };
  fill("filtro-municipio", municipios, document.getElementById("filtro-municipio").value);
  fill("filtro-categoria", categorias, document.getElementById("filtro-categoria").value);
  fill("filtro-produto", produtos, document.getElementById("filtro-produto").value);
}
["filtro-municipio", "filtro-categoria", "filtro-produto", "filtro-temperatura"].forEach(id => document.getElementById(id).addEventListener("change", renderPipeline));

function renderPipeline() {
  populatePipelineFilters();
  const fMun = document.getElementById("filtro-municipio").value;
  const fCat = document.getElementById("filtro-categoria").value;
  const fProd = document.getElementById("filtro-produto").value;
  const fTemp = document.getElementById("filtro-temperatura").value;
  const hoje = todayStr();

  const leadsFiltrados = state.leads.filter(l => l.status === "Ativo").filter(l =>
    (!fMun || l.municipio === fMun) && (!fCat || clientCategoriaList(l).includes(fCat)) &&
    (!fProd || l.produtoInteresse === fProd) && (!fTemp || l.temperatura === fTemp)
  );

  const colunasLead = LEAD_FUNIL_STAGES.map(stage => {
    const leadsNaEtapa = leadsFiltrados.filter(l => l.etapaFunil === stage);
    const volumeTotal = leadsNaEtapa.reduce((s, l) => s + (Number(l.potencialTon) || 0), 0);
    const cards = leadsNaEtapa.map(l => {
      const vencido = l.dataProximoPasso && l.dataProximoPasso < hoje && l.statusProximoPasso !== "Feito";
      const tempCls = l.temperatura === "Quente" ? "temp-quente" : l.temperatura === "Frio" ? "temp-frio" : l.temperatura === "Morno" ? "temp-morno" : "";
      return `
        <div class="kanban-card ${tempCls}" draggable="true" data-client-id="${l.id}" style="${vencido ? "border-color:#a8441f;" : ""}">
          <div class="kc-top"><span class="kc-name">${escapeHtml(l.nome)}</span>${l.temperatura ? `<span class="kc-temp ${tempCls}">${escapeHtml(l.temperatura)}</span>` : `<span class="kc-dot" style="background:${vencido ? "#a8441f" : STAGE_COLOR[stage]}"></span>`}</div>
          <div class="kc-sub">${escapeHtml(l.municipio || "-")} · ${escapeHtml(describeCategorias(l) || "sem categoria")}</div>
          <div class="kc-meta"><span class="kc-pot">${l.potencialTon ? l.potencialTon + "t" : "—"}</span><span class="${vencido ? "kc-vencido" : ""}">${l.dataProximoPasso ? formatDate(l.dataProximoPasso) : "sem próximo passo"}</span></div>
        </div>`;
    }).join("");
    return `
      <div class="kanban-col" data-stage="${stage}">
        <div class="kanban-col-header">
          <div><div class="stage-name">${stage}</div><div class="stage-meta">${formatVolume(volumeTotal)}t potencial</div></div>
          <span class="kanban-count">${leadsNaEtapa.length}</span>
        </div>
        <div class="kanban-drop" data-stage="${stage}">${cards}</div>
      </div>`;
  }).join("");

  document.getElementById("kanban-board").innerHTML = colunasLead;

  document.querySelectorAll(".kanban-card").forEach(card => {
    card.addEventListener("dragstart", () => card.classList.add("dragging"));
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("click", e => { if (!card.classList.contains("dragging")) openFicha(card.dataset.clientId); });
  });

  document.querySelectorAll(".kanban-drop").forEach(drop => {
    if (drop.dataset.nodrop) return;
    drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("drag-over"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("drag-over"));
    drop.addEventListener("drop", e => {
      e.preventDefault();
      drop.classList.remove("drag-over");
      const dragging = document.querySelector(".kanban-card.dragging");
      if (!dragging) return;
      const lead = state.leads.find(l => l.id === dragging.dataset.clientId);
      if (lead) {
        lead.etapaFunil = drop.dataset.stage;
        lead.historicoEtapas = lead.historicoEtapas || [];
        lead.historicoEtapas.push({ etapa: drop.dataset.stage, data: todayStr() });
        saveState();
        showToast(`${lead.nome} movido para "${drop.dataset.stage}".`);
        renderPipeline();
      }
    });
  });
}

// ============================================================
// CLIENTES / LEADS
// ============================================================
function renderClientList() {
  const container = document.getElementById("clientes-list");
  const query = document.getElementById("busca-cliente").value.trim().toLowerCase();
  const classificacao = classificacaoABCClientes();
  const filtered = state.clientesAtivos.filter(c => {
    if (!query) return true;
    return [c.nome, c.fazenda, c.municipio].some(v => (v || "").toLowerCase().includes(query));
  });
  container.innerHTML = filtered.length ? filtered.map(c => clienteAtivoCardHtml(c, query, classificacao[c.id])).join("")
    : `<div class="empty-state">Nenhum cliente ativo encontrado.</div>`;
  container.querySelectorAll(".card").forEach(card => card.addEventListener("click", () => openFicha(card.dataset.clientId)));
}
document.getElementById("busca-cliente").addEventListener("input", renderClientList);

function clienteMiniCardMatrizHtml(cliente, valor, riscoInfo, selo) {
  const atividades = contatosForClient(cliente.id).length + visitasForClient(cliente.id).length;
  const seloHtml = selo === "eficiente" ? `<span class="matriz-selo matriz-selo-eficiente">⚡ eficiente</span>`
    : selo === "manutencao" ? `<span class="matriz-selo matriz-selo-manutencao">🔧 alta manutenção</span>` : "";
  return `
    <div class="matriz-card" data-client-id="${cliente.id}">
      <div class="matriz-card-nome">${escapeHtml(cliente.nome)}</div>
      <div class="matriz-card-linha"><span>${formatMoney(valor)}</span><span>${atividades} ativ.</span></div>
      <div class="matriz-card-linha"><span>Risco: ${riscoInfo.score}</span>${seloHtml}</div>
    </div>`;
}

function renderClientesMatriz() {
  const container = document.getElementById("clientes-matriz");
  const clientesAtivos = state.clientesAtivos;

  const valorPorClientId = {};
  clientesAtivos.forEach(c => { valorPorClientId[c.id] = computeVolumeTrend(c).valorAtual; });
  const nivelValorPorId = computeTercosPorId(clientesAtivos.map(c => ({ id: c.id, valor: valorPorClientId[c.id] })));
  const seloPorId = computeEficienciaSelos(clientesAtivos, valorPorClientId);

  const grid = { Alto: { Baixo: [], Médio: [], Alto: [] }, Médio: { Baixo: [], Médio: [], Alto: [] }, Baixo: { Baixo: [], Médio: [], Alto: [] } };
  const riscoPorId = {};
  clientesAtivos.forEach(c => {
    const riscoInfo = computeChurnRisco(c);
    riscoPorId[c.id] = riscoInfo;
    const valorNivel = nivelValorPorId[c.id] || "Baixo";
    grid[riscoInfo.nivel][valorNivel].push(c);
  });

  const rows = ["Alto", "Médio", "Baixo"];
  const cols = ["Baixo", "Médio", "Alto"];

  if (!clientesAtivos.length) {
    container.innerHTML = `<div class="empty-state">Nenhum cliente ativo encontrado.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="nine-box-grid">
      <div class="nine-box-corner"></div>
      ${cols.map(v => `<div class="nine-box-col-header">Valor ${v}</div>`).join("")}
      ${rows.map(r => `
        <div class="nine-box-row-header tone-${NINE_BOX_ROW_TONE[r]}">Risco ${r}</div>
        ${cols.map(v => {
          const clientesCell = grid[r][v];
          const urgente = r === "Alto" && v === "Alto";
          return `
            <div class="nine-box-cell tone-${NINE_BOX_ROW_TONE[r]}${urgente ? " nine-box-cell-urgente" : ""}">
              <div class="nine-box-cell-label">${NINE_BOX_LABELS[r][v]}</div>
              <div class="nine-box-cell-count">${clientesCell.length} cliente${clientesCell.length === 1 ? "" : "s"}</div>
              <div class="nine-box-cell-cards">
                ${clientesCell.length
                  ? clientesCell.map(c => clienteMiniCardMatrizHtml(c, valorPorClientId[c.id], riscoPorId[c.id], seloPorId[c.id])).join("")
                  : `<p class="hint" style="margin:0;">Nenhum cliente</p>`}
              </div>
            </div>`;
        }).join("")}
      `).join("")}
    </div>
    <div class="nine-box-legenda">
      <span><i class="nine-box-legenda-dot tone-late"></i>Risco alto</span>
      <span><i class="nine-box-legenda-dot tone-warn"></i>Risco médio</span>
      <span><i class="nine-box-legenda-dot tone-ok"></i>Risco baixo</span>
      <span><span class="matriz-selo matriz-selo-eficiente">⚡ eficiente</span> maior R$/atividade (1/3 superior)</span>
      <span><span class="matriz-selo matriz-selo-manutencao">🔧 alta manutenção</span> menor R$/atividade (1/3 inferior)</span>
    </div>`;
  container.querySelectorAll(".matriz-card").forEach(card => card.addEventListener("click", () => openFicha(card.dataset.clientId)));
}

document.querySelectorAll("#clientes-view-switch button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#clientes-view-switch button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const isMatriz = btn.dataset.view === "matriz";
    document.getElementById("busca-cliente").classList.toggle("hidden", isMatriz);
    document.getElementById("clientes-list").classList.toggle("hidden", isMatriz);
    document.getElementById("clientes-matriz").classList.toggle("hidden", !isMatriz);
    if (isMatriz) renderClientesMatriz();
  });
});

function renderLeadsList() {
  const container = document.getElementById("leads-list");
  const query = document.getElementById("busca-lead").value.trim().toLowerCase();
  const leads = state.leads.filter(l => l.status !== "Convertido").filter(l => {
    if (!query) return true;
    return [l.nome, l.fazenda, l.municipio, l.estado].some(v => (v || "").toLowerCase().includes(query));
  });
  container.innerHTML = leads.length ? leads.map(l => leadCardHtml(l, query)).join("")
    : `<div class="empty-state">Nenhum lead encontrado.</div>`;
  container.querySelectorAll(".card").forEach(card => card.addEventListener("click", () => openFicha(card.dataset.clientId)));
}
document.getElementById("busca-lead").addEventListener("input", renderLeadsList);

function highlight(text, term) {
  if (!term || !text) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx)) + "<mark>" + escapeHtml(text.slice(idx, idx + term.length)) + "</mark>" + escapeHtml(text.slice(idx + term.length));
}

function leadCardHtml(lead, query) {
  const badge = lead.status !== "Ativo"
    ? `<span class="badge ${badgeClassForLeadStatus(lead.status)}">${escapeHtml(lead.status)}</span>`
    : `<span class="badge ${badgeClassForStage(lead.etapaFunil)}">${escapeHtml(lead.etapaFunil || "-")}</span>`;
  const contatos = contatosForClient(lead.id);
  const ultimoContato = contatos.length ? formatDate(contatos[0].data) : "—";
  const ultimaEtapa = (lead.historicoEtapas || [])[(lead.historicoEtapas || []).length - 1];
  const diasNaEtapa = ultimaEtapa ? daysBetween(ultimaEtapa.data, todayStr()) : (lead.criadoEm ? daysBetween(lead.criadoEm, todayStr()) : null);
  return `
    <div class="card" data-client-id="${lead.id}">
      <div class="card-top">
        <div><div class="card-name">${highlight(lead.nome, query)}${lead.fazenda ? " · " + escapeHtml(lead.fazenda) : ""}</div>
        <div class="card-sub">${escapeHtml(describeCategorias(lead))} ${lead.municipio ? "· " + escapeHtml(lead.municipio) : ""}${lead.temperatura ? " · " + escapeHtml(lead.temperatura) : ""}</div></div>
        ${badge}
      </div>
      <div class="client-meta">
        <span class="cm"><span class="cm-l">Potencial</span><span class="cm-v">${lead.potencialTon ? lead.potencialTon + "t/mês" : "—"}</span></span>
        <span class="cm"><span class="cm-l">Próx. passo</span><span class="cm-v">${lead.dataProximoPasso ? formatDate(lead.dataProximoPasso) : "—"}</span></span>
        <span class="cm"><span class="cm-l">Últ. contato</span><span class="cm-v">${ultimoContato}</span></span>
        <span class="cm"><span class="cm-l">Na etapa há</span><span class="cm-v">${diasNaEtapa != null ? diasNaEtapa + "d" : "—"}</span></span>
      </div>
    </div>`;
}

function clienteAtivoCardHtml(cliente, query, classe) {
  const insight = computeClientInsight(cliente);
  const badge = cliente.status === "Inativo"
    ? `<span class="badge badge-late">Inativo</span>`
    : `<span class="badge ${insight.status === "atrasado" ? "badge-late" : insight.status === "atencao" ? "badge-warn" : insight.status === "em-dia" ? "badge-ok" : "badge-neutral"}">${insight.statusLabel}</span>`;
  const classeBadge = classificacaoBadgeHtml(classe);
  const prog = insight.progresso != null ? Math.max(0, Math.min(100, insight.progresso)) : null;
  const progCor = insight.status === "atrasado" ? "var(--late-text)" : insight.status === "atencao" ? "var(--warn-text)" : "var(--primary)";
  const spPeds = state.pedidos.filter(p => p.clientId === cliente.id && p.volume).sort((a, b) => (a.dataPedido || "").localeCompare(b.dataPedido || "")).slice(-6);
  const spMax = Math.max(1, ...spPeds.map(p => Number(p.volume) || 0));
  const spark = spPeds.length >= 2 ? `<div class="client-spark" title="Últimos pedidos (volume)">${spPeds.map(p => `<i style="height:${Math.max(3, Math.round((Number(p.volume) || 0) / spMax * 22))}px"></i>`).join("")}</div>` : "";
  return `
    <div class="card client-card" data-client-id="${cliente.id}">
      <div class="card-top">
        <div><div class="card-name">${highlight(cliente.nome, query)}${cliente.fazenda ? " · " + escapeHtml(cliente.fazenda) : ""}</div>
        <div class="card-sub">${escapeHtml(describeCategorias(cliente))} ${cliente.municipio ? "· " + escapeHtml(cliente.municipio) : ""}</div></div>
        <div class="card-right">${classeBadge}${badge}${spark}</div>
      </div>
      <div class="client-meta">
        <span class="cm"><span class="cm-l">Últ. pedido</span><span class="cm-v">${insight.lastPedidoDate ? formatDate(insight.lastPedidoDate) : "—"}</span></span>
        <span class="cm"><span class="cm-l">Vol. médio</span><span class="cm-v">${insight.avgVolume ? formatVolume(insight.avgVolume) + "t" : "—"}</span></span>
        <span class="cm"><span class="cm-l">Recompra</span><span class="cm-v">${insight.diasRestantes != null ? "~" + insight.diasRestantes + "d" : "—"}</span></span>
        <span class="cm"><span class="cm-l">Favorito</span><span class="cm-v">${insight.favoriteProduct ? escapeHtml(insight.favoriteProduct) : "—"}</span></span>
      </div>
      ${prog != null ? `<div class="client-recompra" title="Ciclo de recompra"><div class="client-recompra-fill" style="width:${prog}%;background:${progCor}"></div></div>` : ""}
    </div>`;
}

function refreshClientSelects() {
  const soClientesAtivos = [document.getElementById("pedido-cliente"), document.getElementById("relatorio-cliente-select"), document.getElementById("relatorio-cliente-periodo-select")];
  const todasEntidades = [document.getElementById("contato-cliente"), document.getElementById("compromisso-cliente"), document.getElementById("visita-cliente")];

  soClientesAtivos.forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = state.clientesAtivos.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}${c.fazenda ? " · " + escapeHtml(c.fazenda) : ""}</option>`).join("");
    if (current) sel.value = current;
  });

  todasEntidades.forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    const placeholder = sel.id === "compromisso-cliente" ? `<option value="">— Nenhum —</option>` : "";
    sel.innerHTML = placeholder + todasEntidadesSelecionaveis().map(c => `<option value="${c.id}">${escapeHtml(c.nome)}${c.fazenda ? " · " + escapeHtml(c.fazenda) : ""}</option>`).join("");
    if (current) sel.value = current;
  });
}

document.getElementById("qa-novo-lead").addEventListener("click", () => openClienteModal());

// ============================================================
// CONSULTORES
// ============================================================
function renderConsultorList() {
  const container = document.getElementById("consultores-list");
  container.innerHTML = state.consultores.length
    ? state.consultores.map(cons => `
        <div class="card" data-consultor-id="${cons.id}">
          <div class="card-top">
            <div><div class="card-name">${escapeHtml(cons.nome)}${cons.empresa ? " · " + escapeHtml(cons.empresa) : ""}</div>
            <div class="card-sub">${escapeHtml(cons.regiao || "")} ${cons.whatsapp ? "· " + escapeHtml(cons.whatsapp) : ""}</div></div>
            ${cons.multiplicador === "sim" ? `<span class="badge badge-ok">Multiplicador</span>` : ""}
          </div>
        </div>`).join("")
    : `<div class="empty-state">Nenhum consultor/nutricionista cadastrado ainda.</div>`;
  container.querySelectorAll(".card").forEach(card => card.addEventListener("click", () => openConsultorModal(card.dataset.consultorId)));
}

function refreshConsultorSelect() {
  ["cliente-consultor-id", "ca-consultor-id"].forEach(id => {
    const sel = document.getElementById(id);
    const current = sel.value;
    sel.innerHTML = `<option value="">— Nenhum —</option>` + state.consultores.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join("");
    sel.value = current;
  });
}

document.getElementById("qa-novo-consultor").addEventListener("click", () => openConsultorModal());

const CONSULTOR_FIELD_MAP = [
  ["consultor-nome", "nome"], ["consultor-empresa", "empresa"], ["consultor-whatsapp", "whatsapp"],
  ["consultor-regiao", "regiao"], ["consultor-estimativa-clientes", "estimativaClientes"],
  ["consultor-parceria-concorrente", "parceriaConcorrente"], ["consultor-nome-concorrente-parceiro", "nomeConcorrenteParceiro"],
  ["consultor-multiplicador", "multiplicador"], ["consultor-obs", "obs"]
];

function openConsultorModal(consultorId) {
  const form = document.getElementById("form-consultor");
  form.reset();
  document.getElementById("consultor-id").value = "";
  document.getElementById("modal-consultor-titulo").textContent = "Novo consultor/nutricionista";
  if (consultorId) {
    const cons = state.consultores.find(c => c.id === consultorId);
    if (cons) {
      document.getElementById("modal-consultor-titulo").textContent = "Editar consultor/nutricionista";
      document.getElementById("consultor-id").value = cons.id;
      CONSULTOR_FIELD_MAP.forEach(([domId, key]) => { document.getElementById(domId).value = cons[key] || ""; });
    }
  }
  document.getElementById("modal-consultor").classList.remove("hidden");
}

document.getElementById("form-consultor").addEventListener("submit", e => {
  e.preventDefault();
  const id = document.getElementById("consultor-id").value || uid();
  const data = { id };
  CONSULTOR_FIELD_MAP.forEach(([domId, key]) => { data[key] = document.getElementById(domId).value.trim(); });
  const idx = state.consultores.findIndex(c => c.id === id);
  if (idx >= 0) state.consultores[idx] = data; else state.consultores.push(data);
  saveState();
  closeModal("modal-consultor");
  renderConsultorList();
  refreshConsultorSelect();
  showToast("Consultor/nutricionista salvo.");
});

// ============================================================
// MODAL CLIENTE (novo/editar)
// ============================================================
const CLIENTE_FIELD_MAP = [
  ["cliente-nome", "nome"], ["cliente-nome-fantasia", "nomeFantasia"], ["cliente-cpf-cnpj", "cpfCnpj"], ["cliente-fazenda", "fazenda"],
  ["cliente-endereco-rua", "enderecoRua"], ["cliente-endereco-numero", "enderecoNumero"], ["cliente-endereco-bairro", "enderecoBairro"],
  ["cliente-endereco-complemento", "enderecoComplemento"],
  ["cliente-municipio", "municipio"], ["cliente-estado", "estado"], ["cliente-cep", "cep"],
  ["cliente-como-chegou", "comoChegou"], ["cliente-indicado-por", "indicadoPor"],
  ["cliente-area-hectares", "areaTotalHectares"], ["cliente-nivel-tecnologico", "nivelTecnologico"],
  ["cliente-tem-consultor", "temConsultor"], ["cliente-consultor-id", "consultorId"],
  ["cliente-bant-budget", "bantBudget"], ["cliente-bant-authority", "bantAuthority"], ["cliente-bant-need", "bantNeed"], ["cliente-bant-timing", "bantTiming"],
  ["cliente-etapa-funil", "etapaFunil"], ["cliente-status", "status"], ["cliente-temperatura", "temperatura"],
  ["cliente-probabilidade", "probabilidade"], ["cliente-produto-proposta", "produtoInteresse"],
  ["cliente-potencial-volume", "potencialTon"], ["cliente-potencial-valor", "potencialValor"],
  ["cliente-obs-comerciais", "obsEstrategicas"],
  ["cliente-proximo-passo-tipo", "proximoPassoTipo"], ["cliente-data-proximo-passo", "dataProximoPasso"],
  ["cliente-proximo-passo-responsavel", "proximoPassoResponsavel"], ["cliente-proximo-passo-obs", "proximoPassoObs"],
  ["cliente-status-proximo-passo", "statusProximoPasso"],
  ["cliente-status-especial", "statusEspecial"], ["cliente-status-especial-obs", "statusEspecialObs"],
  ["cliente-obs-gerais", "obsGerais"]
];

// ---------- Contatos dinâmicos (nome/cargo/papel/whatsapp/e-mail/canal, com contato principal) ----------
let currentContatosPessoas = [];

function renderContatosPessoasRowsGeneric(list, containerId, rerender) {
  const container = document.getElementById(containerId);
  container.innerHTML = list.map((p, i) => `
    <div class="contato-pessoa-card" data-idx="${i}">
      <div class="contato-pessoa-row">
        <input type="text" class="cp-nome" placeholder="Nome completo" value="${escapeHtml(p.nome || "")}">
        <input type="text" class="cp-cargo" placeholder="Cargo" value="${escapeHtml(p.cargo || "")}">
        <select class="cp-papel">${PAPEL_CONTATO_OPCOES.map(o => `<option ${p.papel === o ? "selected" : ""}>${o}</option>`).join("")}</select>
        ${list.length > 1 ? `<button type="button" class="btn-remove-cat btn-remove-contato" title="Remover">Remover</button>` : `<span></span>`}
      </div>
      <div class="contato-pessoa-row">
        <input type="text" class="cp-whatsapp" placeholder="WhatsApp com DDD" value="${escapeHtml(p.whatsapp || "")}">
        <input type="email" class="cp-email" placeholder="E-mail" value="${escapeHtml(p.email || "")}">
        <select class="cp-canal">${CANAL_PREFERIDO_OPCOES.map(o => `<option ${p.canalPreferido === o ? "selected" : ""}>${o}</option>`).join("")}</select>
        <label class="cp-principal-label"><input type="radio" name="cp-principal-${containerId}" class="cp-principal" ${p.principal ? "checked" : ""}> Principal</label>
      </div>
      <label class="cp-nasc-label">Data de nascimento <input type="date" class="cp-nascimento" value="${escapeHtml(p.dataNascimento || "")}"></label>
      <input type="text" class="cp-obs" placeholder="Observação sobre esse contato" value="${escapeHtml(p.obs || "")}">
      ${onlyDigits(p.whatsapp) ? `<a class="btn-secondary cp-wa-link" href="https://wa.me/55${onlyDigits(p.whatsapp)}" target="_blank" rel="noopener">Abrir WhatsApp</a>` : ""}
    </div>
  `).join("");

  container.querySelectorAll(".contato-pessoa-card").forEach(card => {
    const idx = Number(card.dataset.idx);
    card.querySelector(".cp-nome").addEventListener("input", e => { list[idx].nome = e.target.value; });
    card.querySelector(".cp-cargo").addEventListener("input", e => { list[idx].cargo = e.target.value; });
    card.querySelector(".cp-papel").addEventListener("change", e => { list[idx].papel = e.target.value; });
    card.querySelector(".cp-whatsapp").addEventListener("input", e => { list[idx].whatsapp = e.target.value; });
    card.querySelector(".cp-email").addEventListener("input", e => { list[idx].email = e.target.value; });
    card.querySelector(".cp-canal").addEventListener("change", e => { list[idx].canalPreferido = e.target.value; });
    card.querySelector(".cp-obs").addEventListener("input", e => { list[idx].obs = e.target.value; });
    const nascEl = card.querySelector(".cp-nascimento");
    if (nascEl) nascEl.addEventListener("change", e => { list[idx].dataNascimento = e.target.value; });
    card.querySelector(".cp-principal").addEventListener("change", () => {
      list.forEach((p, i2) => p.principal = i2 === idx);
    });
    const btnRemove = card.querySelector(".btn-remove-contato");
    if (btnRemove) btnRemove.addEventListener("click", () => { list.splice(idx, 1); rerender(); });
  });
}

function renderContatosPessoasRows() { renderContatosPessoasRowsGeneric(currentContatosPessoas, "cliente-contatos-list", renderContatosPessoasRows); }

document.getElementById("btn-add-contato-pessoa").addEventListener("click", () => {
  currentContatosPessoas.push({ id: uid(), nome: "", cargo: "", papel: "Decisor", whatsapp: "", email: "", canalPreferido: "WhatsApp", obs: "", principal: currentContatosPessoas.length === 0 });
  renderContatosPessoasRows();
});

let currentContatosPessoasCA = [];
function renderContatosPessoasRowsCA() { renderContatosPessoasRowsGeneric(currentContatosPessoasCA, "ca-contatos-list", renderContatosPessoasRowsCA); }
document.getElementById("btn-add-contato-pessoa-ca").addEventListener("click", () => {
  currentContatosPessoasCA.push({ id: uid(), nome: "", cargo: "", papel: "Decisor", whatsapp: "", email: "", canalPreferido: "WhatsApp", obs: "", principal: currentContatosPessoasCA.length === 0 });
  renderContatosPessoasRowsCA();
});

// ---------- Objeções identificadas (lista dinâmica, começa vazia) ----------
let currentObjecoes = [];
function renderObjecoesRows() {
  const container = document.getElementById("cliente-objecoes-list");
  container.innerHTML = currentObjecoes.map((texto, i) => `
    <div class="objecao-row" data-idx="${i}">
      <input type="text" class="obj-texto" placeholder="Objeção identificada" value="${escapeHtml(texto)}">
      <button type="button" class="btn-remove-cat" title="Remover">Remover</button>
    </div>`).join("");
  container.querySelectorAll(".objecao-row").forEach(row => {
    const idx = Number(row.dataset.idx);
    row.querySelector(".obj-texto").addEventListener("input", e => { currentObjecoes[idx] = e.target.value; });
    row.querySelector(".btn-remove-cat").addEventListener("click", () => { currentObjecoes.splice(idx, 1); renderObjecoesRows(); });
  });
  const counter = document.getElementById("cliente-objecoes-count");
  if (counter) counter.textContent = currentObjecoes.length ? `${currentObjecoes.length} objeções cadastradas` : "";
}
document.getElementById("btn-add-objecao").addEventListener("click", () => { currentObjecoes.push(""); renderObjecoesRows(); });

function syncDecisorFromContatos(data) {
  const pessoas = data.contatosPessoas || [];
  const principal = pessoas.find(p => p.principal) || pessoas[0];
  data.nomeDecisor = principal ? principal.nome : "";
  data.cargoDecisor = principal ? principal.cargo : "";
  data.whatsappDecisor = principal ? principal.whatsapp : "";
  const influenciador = pessoas.find(p => p !== principal && p.papel === "Influenciador") || pessoas.find(p => p !== principal);
  data.nomeInfluenciador = influenciador ? influenciador.nome : "";
  data.cargoInfluenciador = influenciador ? influenciador.cargo : "";
  data.whatsappInfluenciador = influenciador ? influenciador.whatsapp : "";
}

// ---------- Categoria animal (tipo + fase + quantidade + sistema + situação atual) ----------
let currentCategoriasAnimais = [];

function categoriaRowLabel(row) { return row.faseProducao ? `${row.tipoAnimal} — ${row.faseProducao}` : (row.tipoAnimal || ""); }
function categoriaVazia() {
  return { id: uid(), tipoAnimal: "", faseProducao: "", quantidade: "", sistemaProducao: "",
    fornecedorAtual: "", produtoAtual: "", volumeMensalEstimado: "", consumoPorAnimalDia: "", prazoPagamento: "", tipoFrete: "FOB",
    satisfacao: "", reclamacoes: "", tempoDeUso: "" };
}
// "Volume mensal estimado" (toneladas) NUNCA é digitado à mão — é sempre calculado a partir da
// quantidade de animais × consumo por animal (kg/dia), pra nunca ficar dessincronizado quando o
// rebanho muda numa visita técnica.
function calcVolumeMensalEstimado(quantidade, consumoPorAnimalDia) {
  const qtd = Number(quantidade) || 0;
  const consumo = Number(consumoPorAnimalDia) || 0;
  return (qtd * consumo * 30) / 1000;
}

function renderCategoriasAnimaisRowsGeneric(list, containerId, totalId, rerender) {
  const container = document.getElementById(containerId);
  container.innerHTML = list.map((row, i) => {
    const fases = FASES_POR_TIPO_ANIMAL[row.tipoAnimal] || [];
    return `
    <div class="categoria-card" data-idx="${i}">
      <div class="categoria-animal-row">
        <select class="cat-tipo">
          <option value="">— Tipo de animal —</option>
          ${TIPO_ANIMAL_OPCOES.map(o => `<option value="${o}" ${row.tipoAnimal === o ? "selected" : ""}>${o}</option>`).join("")}
        </select>
        <select class="cat-fase" ${!fases.length ? "disabled" : ""}>
          <option value="">${fases.length ? "— Fase —" : "—"}</option>
          ${fases.map(o => `<option value="${o}" ${row.faseProducao === o ? "selected" : ""}>${o}</option>`).join("")}
        </select>
        <input type="number" class="cat-qty" min="0" placeholder="Quantidade" value="${escapeHtml(row.quantidade || "")}">
        ${list.length > 1 ? `<button type="button" class="btn-remove-cat" title="Remover">Remover</button>` : `<span></span>`}
      </div>
      <label class="cat-sistema-label">Sistema de produção
        <select class="cat-sistema">
          <option value="">— Selecione —</option>
          ${SISTEMA_PRODUCAO_OPCOES.map(o => `<option value="${o}" ${row.sistemaProducao === o ? "selected" : ""}>${o}</option>`).join("")}
        </select>
      </label>
      <details class="categoria-situacao">
        <summary>Situação atual (fornecedor, produto, satisfação...)</summary>
        <div class="categoria-situacao-grid">
          <input type="text" class="cat-fornecedor" placeholder="Empresa fornecedora atual" list="fornecedores-datalist" value="${escapeHtml(row.fornecedorAtual || "")}">
          <input type="text" class="cat-produto" placeholder="Produto que usa hoje" value="${escapeHtml(row.produtoAtual || "")}">
          <div class="cat-consumo-wrap">
            <input type="number" class="cat-consumo-animal" min="0" step="any" placeholder="Consumo por animal (kg/dia)" value="${escapeHtml(row.consumoPorAnimalDia || "")}">
            <span class="cat-volume-calc">${formatVolume(calcVolumeMensalEstimado(row.quantidade, row.consumoPorAnimalDia))} t/mês estimado</span>
          </div>
          <input type="text" class="cat-prazo" placeholder="Prazo de pagamento" value="${escapeHtml(row.prazoPagamento || "")}">
          <select class="cat-frete"><option value="FOB" ${row.tipoFrete === "FOB" ? "selected" : ""}>FOB</option><option value="CIF" ${row.tipoFrete === "CIF" ? "selected" : ""}>CIF</option></select>
          <select class="cat-satisfacao">
            <option value="">— Satisfação —</option>
            ${SATISFACAO_FORNECEDOR_OPCOES.map(o => `<option value="${o}" ${row.satisfacao === o ? "selected" : ""}>${o}</option>`).join("")}
          </select>
          <input type="text" class="cat-tempo-uso" placeholder="Há quanto tempo usa" value="${escapeHtml(row.tempoDeUso || "")}">
          <textarea class="cat-reclamacoes" placeholder="Reclamações / pontos fracos relatados" rows="2">${escapeHtml(row.reclamacoes || "")}</textarea>
        </div>
      </details>
    </div>
  `; }).join("");

  container.querySelectorAll(".categoria-card").forEach(card => {
    const idx = Number(card.dataset.idx);
    const recalcularVolume = () => {
      list[idx].volumeMensalEstimado = calcVolumeMensalEstimado(list[idx].quantidade, list[idx].consumoPorAnimalDia);
      const calcEl = card.querySelector(".cat-volume-calc");
      if (calcEl) calcEl.textContent = `${formatVolume(list[idx].volumeMensalEstimado)} t/mês estimado`;
    };
    card.querySelector(".cat-tipo").addEventListener("change", e => { list[idx].tipoAnimal = e.target.value; list[idx].faseProducao = ""; rerender(); });
    card.querySelector(".cat-fase").addEventListener("change", e => { list[idx].faseProducao = e.target.value; });
    card.querySelector(".cat-qty").addEventListener("input", e => { list[idx].quantidade = e.target.value; renderCategoriasTotalGeneric(list, totalId); recalcularVolume(); });
    card.querySelector(".cat-sistema").addEventListener("change", e => { list[idx].sistemaProducao = e.target.value; });
    card.querySelector(".cat-fornecedor").addEventListener("input", e => { list[idx].fornecedorAtual = e.target.value; });
    card.querySelector(".cat-produto").addEventListener("input", e => { list[idx].produtoAtual = e.target.value; });
    card.querySelector(".cat-consumo-animal").addEventListener("input", e => { list[idx].consumoPorAnimalDia = e.target.value; recalcularVolume(); });
    card.querySelector(".cat-prazo").addEventListener("input", e => { list[idx].prazoPagamento = e.target.value; });
    card.querySelector(".cat-frete").addEventListener("change", e => { list[idx].tipoFrete = e.target.value; });
    card.querySelector(".cat-satisfacao").addEventListener("change", e => { list[idx].satisfacao = e.target.value; });
    card.querySelector(".cat-tempo-uso").addEventListener("input", e => { list[idx].tempoDeUso = e.target.value; });
    card.querySelector(".cat-reclamacoes").addEventListener("input", e => { list[idx].reclamacoes = e.target.value; });
    const btnRemove = card.querySelector(".btn-remove-cat");
    if (btnRemove) btnRemove.addEventListener("click", () => { list.splice(idx, 1); rerender(); });
  });
  renderCategoriasTotalGeneric(list, totalId);
}

function renderCategoriasTotalGeneric(list, totalId) {
  const el = document.getElementById(totalId);
  if (!el) return;
  const total = list.reduce((s, r) => s + (Number(r.quantidade) || 0), 0);
  el.textContent = `Total de animais: ${total}`;
}

function renderCategoriasAnimaisRows() { renderCategoriasAnimaisRowsGeneric(currentCategoriasAnimais, "cliente-categorias-list", "cliente-categorias-total", renderCategoriasAnimaisRows); }
function renderCategoriasTotal() { renderCategoriasTotalGeneric(currentCategoriasAnimais, "cliente-categorias-total"); }

document.getElementById("btn-add-categoria-animal").addEventListener("click", () => {
  currentCategoriasAnimais.push(categoriaVazia());
  renderCategoriasAnimaisRows();
});

let currentCategoriasAnimaisCA = [];
function renderCategoriasAnimaisRowsCA() { renderCategoriasAnimaisRowsGeneric(currentCategoriasAnimaisCA, "ca-categorias-list", "ca-categorias-total", renderCategoriasAnimaisRowsCA); }
document.getElementById("btn-add-categoria-animal-ca").addEventListener("click", () => {
  currentCategoriasAnimaisCA.push(categoriaVazia());
  renderCategoriasAnimaisRowsCA();
});

function categoriasTableHtml(categoriasAnimais, clientId) {
  const rows = (categoriasAnimais || []).filter(c => c.tipoAnimal);
  if (!rows.length) return `<p class="hint">Nenhuma categoria cadastrada.</p>`;
  const total = rows.reduce((s, r) => s + (Number(r.quantidade) || 0), 0);
  const situacaoRows = rows.filter(r => r.fornecedorAtual || r.produtoAtual || r.satisfacao || r.reclamacoes);
  const forecastRows = clientId ? rows.map(r => ({ r, forecast: computeEstoqueForecast(clientId, r) })).filter(x => x.forecast) : [];
  // As 3 tabelas mostram coisas bem diferentes (rebanho, fornecimento atual, previsão de
  // estoque) — sem um subtítulo cada uma, ficavam empilhadas sem nada as diferenciando.
  return `<h5 class="report-table-subtitle">Rebanho por categoria</h5>
  <table class="mini"><thead><tr><th>Categoria</th><th>Sistema</th><th>Quantidade</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${escapeHtml(categoriaRowLabel(r))}</td><td>${escapeHtml(r.sistemaProducao || "-")}</td><td>${formatInt(r.quantidade)}</td></tr>`).join("")}
    <tr><td colspan="2"><strong>Total</strong></td><td><strong>${formatInt(total)}</strong></td></tr>
  </tbody></table>
  ${situacaoRows.length ? `<h5 class="report-table-subtitle">Fornecimento atual por categoria</h5>
  <table class="mini"><thead><tr><th>Categoria</th><th>Fornecedor</th><th>Produto</th><th>Volume</th><th>Satisfação</th></tr></thead><tbody>
    ${situacaoRows.map(r => `<tr><td>${escapeHtml(categoriaRowLabel(r))}</td><td>${escapeHtml(r.fornecedorAtual || "-")}</td><td>${escapeHtml(r.produtoAtual || "-")}</td><td>${r.volumeMensalEstimado ? formatVolume(r.volumeMensalEstimado) + " t/mês" : "-"}</td><td>${escapeHtml(r.satisfacao || "-")}</td></tr>`).join("")}
  </tbody></table>` : ""}
  ${forecastRows.length ? `<h5 class="report-table-subtitle">Previsão de estoque por categoria</h5>
  <table class="mini"><thead><tr><th>Categoria</th><th>Último estoque registrado</th><th>Consumo mensal</th><th>Previsão de esgotamento</th></tr></thead><tbody>
    ${forecastRows.map(({ r, forecast }) => {
      const urgente = forecast.diasRestantes <= 20;
      const diasLabel = forecast.diasRestantes >= 0 ? `${forecast.diasRestantes} dias` : "esgotado";
      return `<tr><td>${escapeHtml(categoriaRowLabel(r))}</td><td>${formatVolume(forecast.ultima.quantidadeEstoque)} t (${formatDate(forecast.ultima.data)})</td><td>${formatVolume(r.volumeMensalEstimado)} t/mês</td><td><span class="badge ${urgente ? "badge-late" : "badge-ok"}">${diasLabel} — ${formatDate(forecast.dataPrevistaEsgotamento)}</span></td></tr>`;
    }).join("")}
  </tbody></table>` : ""}`;
}

function describeCategorias(client) {
  const cats = client.categoriasAnimais || [];
  if (!cats.length) return "";
  return cats.filter(c => c.tipoAnimal).map(c => c.quantidade ? `${categoriaRowLabel(c)} (${c.quantidade})` : categoriaRowLabel(c)).join(" · ");
}

function clientCategoriaList(client) {
  return (client.categoriasAnimais || []).map(c => c.tipoAnimal).filter(Boolean);
}

function ativarAbaLead(tab) {
  document.querySelectorAll(".cliente-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.ctab === tab));
  document.querySelectorAll(".cliente-ctab-panel").forEach(p => p.classList.toggle("active", p.dataset.ctabPanel === tab));
}

document.getElementById("form-cliente").addEventListener("submit", e => {
  e.preventDefault();
  const id = document.getElementById("cliente-id").value || uid();
  const data = { id };
  CLIENTE_FIELD_MAP.forEach(([domId, key]) => { data[key] = document.getElementById(domId).value.trim(); });

  // Validado aqui em vez de usar "required" nativo no input: o campo Nome fica em uma aba que pode
  // estar escondida (display:none) no momento do envio, e o navegador bloqueia o submit sem mostrar
  // nenhum aviso quando o campo inválido não está visível. Validação manual sempre avisa o usuário.
  if (!data.nome) {
    showToast("Informe o nome do produtor / razão social.");
    ativarAbaLead("identificacao");
    return;
  }
  if (!data.proximoPassoTipo || !document.getElementById("cliente-data-proximo-passo").value) {
    showToast("Todo lead precisa ter um próximo passo (tipo e data) definido.");
    ativarAbaLead("comercial");
    return;
  }
  if (data.statusEspecial && !data.statusEspecialObs) {
    showToast("Descreva o motivo do status especial / bloqueio.");
    ativarAbaLead("comercial");
    return;
  }
  const categoriaSemVolume = currentCategoriasAnimais.find(c => c.tipoAnimal && c.produtoAtual && !c.volumeMensalEstimado);
  if (categoriaSemVolume) {
    showToast(`Informe o volume mensal estimado de "${categoriaRowLabel(categoriaSemVolume)}" — obrigatório quando há produto atual preenchido (é a base da previsão de estoque).`);
    ativarAbaLead("produtivo");
    return;
  }

  data.categoriasAnimais = currentCategoriasAnimais.filter(c => c.tipoAnimal);
  data.contatosPessoas = currentContatosPessoas.filter(c => c.nome);
  data.objecoes = currentObjecoes.filter(Boolean);
  syncDecisorFromContatos(data);

  const idx = state.leads.findIndex(l => l.id === id);
  const anterior = idx >= 0 ? state.leads[idx] : null;
  if (anterior && anterior.status === "Convertido") {
    // Lead já convertido em Cliente Ativo é estado terminal — o formulário de Lead não tem opção
    // "Convertido" no select de status, então preservamos os campos de funil para não reabrir o lead
    // como se ainda estivesse ativo no pipeline.
    data.status = "Convertido";
    data.etapaFunil = anterior.etapaFunil;
  }
  data.criadoEm = anterior ? anterior.criadoEm : todayStr();
  data.dataConversao = anterior ? anterior.dataConversao : "";
  data.clienteAtivoId = anterior ? anterior.clienteAtivoId : "";
  data.vendedorResponsavel = anterior ? anterior.vendedorResponsavel : "";
  data.dataEncerramento = anterior ? anterior.dataEncerramento : "";
  data.motivoEncerramento = anterior ? anterior.motivoEncerramento : "";
  data.concorrenteMotivo = anterior ? anterior.concorrenteMotivo : "";
  data.lat = anterior ? anterior.lat : ""; data.lng = anterior ? anterior.lng : "";
  data.schemaV5 = true;
  data.historicoEtapas = anterior ? (anterior.historicoEtapas || []) : [];
  if (!anterior || anterior.etapaFunil !== data.etapaFunil) {
    data.historicoEtapas.push({ etapa: data.etapaFunil, data: todayStr() });
  }

  if (idx >= 0) state.leads[idx] = data; else state.leads.push(data);
  saveState();
  closeModal("modal-cliente");
  refreshClientSelects();
  renderClientList();
  renderLeadsList();
  renderDashboard();
  if (currentFichaClientId === id) { renderFichaLeft(); renderFichaTab(); }
  showToast("Lead salvo.");
});

function openClienteModal(clientId) {
  refreshConsultorSelect();
  refreshFornecedoresDatalist();
  const form = document.getElementById("form-cliente");
  form.reset();
  document.getElementById("cliente-id").value = "";
  document.getElementById("modal-cliente-titulo").textContent = "Novo lead";
  currentCategoriasAnimais = [categoriaVazia()];
  currentContatosPessoas = [{ id: uid(), nome: "", cargo: "", papel: "Decisor", whatsapp: "", email: "", canalPreferido: "WhatsApp", obs: "", principal: true }];
  currentObjecoes = [];
  document.getElementById("cliente-lat").value = "";
  document.getElementById("cliente-lng").value = "";
  document.getElementById("cliente-localizacao-status").textContent = "";

  if (clientId) {
    const lead = state.leads.find(l => l.id === clientId);
    if (lead) {
      document.getElementById("modal-cliente-titulo").textContent = "Editar lead";
      document.getElementById("cliente-id").value = lead.id;
      CLIENTE_FIELD_MAP.forEach(([domId, key]) => {
        const el = document.getElementById(domId);
        if (el) el.value = lead[key] || "";
      });
      if (lead.categoriasAnimais && lead.categoriasAnimais.length) {
        currentCategoriasAnimais = lead.categoriasAnimais.map(c => ({ ...c }));
      }
      if (lead.contatosPessoas && lead.contatosPessoas.length) {
        currentContatosPessoas = lead.contatosPessoas.map(c => ({ ...c }));
      }
      currentObjecoes = Array.isArray(lead.objecoes) ? [...lead.objecoes] : [];
      document.getElementById("cliente-lat").value = lead.lat || "";
      document.getElementById("cliente-lng").value = lead.lng || "";
      if (lead.lat && lead.lng) document.getElementById("cliente-localizacao-status").textContent = `Localização salva: ${lead.lat}, ${lead.lng}`;
    }
  }
  renderCategoriasAnimaisRows();
  renderContatosPessoasRows();
  renderObjecoesRows();
  document.querySelectorAll(".cliente-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.ctab === "identificacao"));
  document.querySelectorAll(".cliente-ctab-panel").forEach(p => p.classList.toggle("active", p.dataset.ctabPanel === "identificacao"));
  document.getElementById("modal-cliente").classList.remove("hidden");
}

function capturarLocalizacao(latId, lngId, statusId) {
  const statusEl = document.getElementById(statusId);
  if (!navigator.geolocation) { statusEl.textContent = "Geolocalização não suportada neste navegador."; return; }
  statusEl.textContent = "Capturando localização...";
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(6), lng = pos.coords.longitude.toFixed(6);
      document.getElementById(latId).value = lat;
      document.getElementById(lngId).value = lng;
      statusEl.textContent = `Localização capturada: ${lat}, ${lng}`;
    },
    err => { statusEl.textContent = "Não foi possível obter a localização (" + err.message + ")."; },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
document.getElementById("btn-capturar-gps").addEventListener("click", () => capturarLocalizacao("cliente-lat", "cliente-lng", "cliente-localizacao-status"));
document.getElementById("btn-capturar-gps-ca").addEventListener("click", () => capturarLocalizacao("ca-lat", "ca-lng", "ca-localizacao-status"));

document.querySelectorAll(".cliente-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cliente-tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".cliente-ctab-panel").forEach(p => p.classList.toggle("active", p.dataset.ctabPanel === btn.dataset.ctab));
  });
});

// ============================================================
// MODAL COMPETITIVA / SAC / CRÉDITO
// ============================================================
function openCompetitivaModal(clientId) {
  document.getElementById("form-competitiva").reset();
  document.getElementById("competitiva-cliente-id").value = clientId;
  document.getElementById("competitiva-data").value = todayStr();
  document.getElementById("modal-competitiva").classList.remove("hidden");
}
const COMPETITIVA_FIELD_MAP = [
  ["competitiva-data", "data"], ["competitiva-concorrente", "concorrente"], ["competitiva-produto", "produtoConcorrente"],
  ["competitiva-preco", "preco"], ["competitiva-canal", "canalVenda"], ["competitiva-prazo", "prazoPagamento"],
  ["competitiva-frete", "frete"], ["competitiva-bonificacoes", "bonificacoes"], ["competitiva-ponto-fraco", "pontoFraco"], ["competitiva-ponto-forte", "pontoForte"]
];
document.getElementById("form-competitiva").addEventListener("submit", e => {
  e.preventDefault();
  const clientId = document.getElementById("competitiva-cliente-id").value;
  const data = { id: uid(), clientId };
  COMPETITIVA_FIELD_MAP.forEach(([domId, key]) => { data[key] = document.getElementById(domId).value.trim(); });
  state.competitivas.push(data);
  saveState();
  closeModal("modal-competitiva");
  if (currentFichaClientId === clientId) renderFichaTab();
  showToast("Observação competitiva salva.");
});

function openEstoqueModal(clientId) {
  const entidade = getEntidadeById(clientId);
  if (!entidade) return;
  document.getElementById("form-estoque").reset();
  document.getElementById("estoque-cliente-id").value = clientId;
  document.getElementById("estoque-data").value = todayStr();
  document.getElementById("estoque-origem").value = "informado";
  const categorias = entidade.categoriasAnimais || [];
  const sel = document.getElementById("estoque-categoria");
  sel.innerHTML = categorias.length
    ? categorias.map(c => `<option value="${c.id}">${escapeHtml(categoriaRowLabel(c))}${c.produtoAtual ? " — " + escapeHtml(c.produtoAtual) : ""}</option>`).join("")
    : `<option value="">Cadastre uma categoria animal no Perfil Produtivo antes</option>`;
  document.getElementById("modal-estoque").classList.remove("hidden");
}
document.getElementById("form-estoque").addEventListener("submit", e => {
  e.preventDefault();
  const clientId = document.getElementById("estoque-cliente-id").value;
  const categoriaAnimalId = document.getElementById("estoque-categoria").value;
  if (!categoriaAnimalId) { showToast("Cadastre uma categoria animal antes de registrar estoque."); return; }
  state.estoques.push({
    id: uid(), clientId, categoriaAnimalId,
    data: document.getElementById("estoque-data").value,
    quantidadeEstoque: Number(document.getElementById("estoque-quantidade").value) || 0,
    origem: document.getElementById("estoque-origem").value,
    obs: document.getElementById("estoque-obs").value.trim()
  });
  saveState();
  closeModal("modal-estoque");
  if (currentFichaClientId === clientId) renderFichaTab();
  showToast("Estoque registrado.");
});

function popularPedidoSelect(selectId, clientId, selectedId) {
  const sel = document.getElementById(selectId);
  const pedidos = pedidosForClient(clientId).slice().reverse();
  sel.innerHTML = `<option value="">— Nenhum —</option>` + pedidos.map(p => `<option value="${p.id}">${escapeHtml(p.numeroPedidoADM || formatDate(p.dataPedido))} — ${formatDate(p.dataPedido)}</option>`).join("");
  sel.value = selectedId || "";
}

function openSacModal(clientId, pedidoId) {
  const form = document.getElementById("form-sac");
  form.reset();
  document.getElementById("sac-id").value = "";
  document.getElementById("sac-cliente-id").value = clientId;
  document.getElementById("sac-data").value = todayStr();
  document.getElementById("sac-numero").value = `SAC-${String(state.sacs.length + 1).padStart(4, "0")}`;
  document.getElementById("sac-responsavel").value = nomeUsuarioPadrao();
  popularPedidoSelect("sac-pedido", clientId, pedidoId);
  document.getElementById("modal-sac").classList.remove("hidden");
}
function openSacModalEdit(sacId) {
  const sac = state.sacs.find(s => s.id === sacId);
  if (!sac) return;
  openSacModal(sac.clientId);
  document.getElementById("sac-id").value = sac.id;
  document.getElementById("sac-numero").value = sac.numero;
  document.getElementById("sac-data").value = sac.data;
  popularPedidoSelect("sac-pedido", sac.clientId, sac.pedidoId);
  document.getElementById("sac-tipo").value = sac.tipo || "Avaria no produto";
  document.getElementById("sac-produto").value = sac.produto || "";
  document.getElementById("sac-quantidade").value = sac.quantidade || "";
  document.getElementById("sac-responsavel").value = sac.responsavel || nomeUsuarioPadrao();
  document.getElementById("sac-status").value = sac.status || "Aberto";
  document.getElementById("sac-data-resolucao").value = sac.dataResolucao || "";
  document.getElementById("sac-impacto").value = sac.impacto || "";
  document.getElementById("sac-descricao").value = sac.descricao || "";
  document.getElementById("sac-como-resolvido").value = sac.comoResolvido || "";
}
document.getElementById("form-sac").addEventListener("submit", e => {
  e.preventDefault();
  const clientId = document.getElementById("sac-cliente-id").value;
  const id = document.getElementById("sac-id").value || uid();
  const sac = {
    id, clientId, numero: document.getElementById("sac-numero").value,
    data: document.getElementById("sac-data").value, pedidoId: document.getElementById("sac-pedido").value,
    tipo: document.getElementById("sac-tipo").value, descricao: document.getElementById("sac-descricao").value.trim(),
    produto: document.getElementById("sac-produto").value.trim(), quantidade: document.getElementById("sac-quantidade").value.trim(),
    responsavel: document.getElementById("sac-responsavel").value.trim(), status: document.getElementById("sac-status").value,
    dataResolucao: document.getElementById("sac-data-resolucao").value, comoResolvido: document.getElementById("sac-como-resolvido").value.trim(),
    impacto: document.getElementById("sac-impacto").value
  };
  const idx = state.sacs.findIndex(s => s.id === id);
  if (idx >= 0) state.sacs[idx] = sac; else state.sacs.push(sac);
  saveState();
  closeModal("modal-sac");
  if (currentFichaClientId === clientId) renderFichaTab();
  showToast(`${sac.numero} salvo.`);
});

// ============================================================
// MODAL PEDIDO / CONTATO / COMPROMISSO
// ============================================================
let currentPedidoProdutos = [];

function produtoPedidoVazio() { return { id: uid(), nome: "", codigo: "", quantidadeSacos: "", pesoToneladas: "", valorUnitario: "", valorTotal: "" }; }

function renderPedidoProdutosRows() {
  const container = document.getElementById("pedido-produtos-list");
  container.innerHTML = currentPedidoProdutos.map((p, i) => `
    <div class="produto-pedido-row" data-idx="${i}">
      <input type="text" class="pp-nome" placeholder="Produto" value="${escapeHtml(p.nome || "")}">
      <input type="text" class="pp-codigo" placeholder="Código" value="${escapeHtml(p.codigo || "")}">
      <input type="number" class="pp-sacos" min="0" placeholder="Sacos" value="${escapeHtml(p.quantidadeSacos || "")}">
      <input type="number" class="pp-peso" min="0" step="any" placeholder="Peso (ton)" value="${escapeHtml(p.pesoToneladas || "")}">
      <input type="number" class="pp-valor-unit" min="0" step="0.01" placeholder="Valor unitário" value="${escapeHtml(p.valorUnitario || "")}">
      <input type="number" class="pp-valor-total" placeholder="Valor total" readonly value="${escapeHtml(p.valorTotal || "")}">
      ${currentPedidoProdutos.length > 1 ? `<button type="button" class="btn-remove-cat" title="Remover">Remover</button>` : `<span></span>`}
    </div>
  `).join("");

  container.querySelectorAll(".produto-pedido-row").forEach(row => {
    const idx = Number(row.dataset.idx);
    const recalc = () => {
      const p = currentPedidoProdutos[idx];
      const total = (Number(p.quantidadeSacos) || 0) * (Number(p.valorUnitario) || 0);
      p.valorTotal = total ? total.toFixed(2) : "";
      row.querySelector(".pp-valor-total").value = p.valorTotal;
      renderPedidoTotais();
    };
    row.querySelector(".pp-nome").addEventListener("input", e => { currentPedidoProdutos[idx].nome = e.target.value; });
    row.querySelector(".pp-codigo").addEventListener("input", e => { currentPedidoProdutos[idx].codigo = e.target.value; });
    row.querySelector(".pp-sacos").addEventListener("input", e => { currentPedidoProdutos[idx].quantidadeSacos = e.target.value; recalc(); });
    row.querySelector(".pp-peso").addEventListener("input", e => { currentPedidoProdutos[idx].pesoToneladas = e.target.value; renderPedidoTotais(); });
    row.querySelector(".pp-valor-unit").addEventListener("input", e => { currentPedidoProdutos[idx].valorUnitario = e.target.value; recalc(); });
    const btnRemove = row.querySelector(".btn-remove-cat");
    if (btnRemove) btnRemove.addEventListener("click", () => { currentPedidoProdutos.splice(idx, 1); renderPedidoProdutosRows(); renderPedidoTotais(); });
  });
  const counter = document.getElementById("pedido-produtos-total-count");
  if (counter) counter.textContent = currentPedidoProdutos.length > 1 ? `${currentPedidoProdutos.length} produtos cadastrados` : "";
}

function renderPedidoTotais() {
  const valorProdutos = currentPedidoProdutos.reduce((s, p) => s + (Number(p.valorTotal) || 0), 0);
  const frete = Number(document.getElementById("pedido-frete").value) || 0;
  document.getElementById("pedido-valor-produtos").value = valorProdutos.toFixed(2);
  document.getElementById("pedido-valor-com-frete").value = (valorProdutos + frete).toFixed(2);
}
document.getElementById("btn-add-produto-pedido").addEventListener("click", () => { currentPedidoProdutos.push(produtoPedidoVazio()); renderPedidoProdutosRows(); });
document.getElementById("pedido-frete").addEventListener("input", renderPedidoTotais);

function openPedidoModal(clientId, pedidoId) {
  const form = document.getElementById("form-pedido");
  form.reset();
  document.getElementById("pedido-id").value = "";
  document.getElementById("pedido-data").value = todayStr();
  document.getElementById("pedido-status").value = "Em processamento";
  document.getElementById("pedido-tipo-frete").value = "FOB";
  document.getElementById("pedido-condicao-pagamento").value = "";
  document.getElementById("pedido-frete").value = 0;
  currentPedidoProdutos = [produtoPedidoVazio()];
  if (clientId) {
    document.getElementById("pedido-cliente").value = clientId;
    if (!pedidoId) {
      const cliente = state.clientesAtivos.find(c => c.id === clientId);
      if (cliente) {
        if (cliente.condicaoPagamentoDias) document.getElementById("pedido-condicao-pagamento").value = cliente.condicaoPagamentoDias;
        if (cliente.tipoFrete) document.getElementById("pedido-tipo-frete").value = cliente.tipoFrete;
      }
    }
  }

  if (pedidoId) {
    const pedido = state.pedidos.find(p => p.id === pedidoId);
    if (pedido) {
      document.getElementById("pedido-id").value = pedido.id;
      document.getElementById("pedido-cliente").value = pedido.clientId;
      document.getElementById("pedido-numero-adm").value = pedido.numeroPedidoADM || "";
      document.getElementById("pedido-data").value = pedido.dataPedido || "";
      document.getElementById("pedido-status").value = pedido.status || "Em processamento";
      document.getElementById("pedido-carregamento-previsto").value = pedido.dataCarregamentoPrevista || "";
      document.getElementById("pedido-carregamento-realizado").value = pedido.dataCarregamentoRealizada || "";
      document.getElementById("pedido-entrega-prevista").value = pedido.dataEntregaPrevista || "";
      document.getElementById("pedido-entrega-realizada").value = pedido.dataEntregaRealizada || "";
      document.getElementById("pedido-satisfacao-entrega").value = pedido.satisfacaoEntrega || "— Não avaliado —";
      document.getElementById("pedido-frete").value = pedido.frete || 0;
      document.getElementById("pedido-condicao-pagamento").value = pedido.condicaoPagamento || "";
      document.getElementById("pedido-tipo-frete").value = pedido.tipoFrete || "FOB";
      if (pedido.produtos && pedido.produtos.length) currentPedidoProdutos = pedido.produtos.map(p => ({ ...p }));
    }
  }
  renderPedidoProdutosRows();
  renderPedidoTotais();
  document.getElementById("modal-pedido").classList.remove("hidden");
}
document.getElementById("form-pedido").addEventListener("submit", e => {
  e.preventDefault();
  if (!state.clientesAtivos.length) { showToast("Cadastre um cliente ativo antes."); return; }
  const clientId = document.getElementById("pedido-cliente").value;
  const id = document.getElementById("pedido-id").value || uid();
  const produtos = currentPedidoProdutos.filter(p => p.nome);
  const valorProdutos = produtos.reduce((s, p) => s + (Number(p.valorTotal) || 0), 0);
  const frete = Number(document.getElementById("pedido-frete").value) || 0;
  const status = document.getElementById("pedido-status").value;
  const dataEntregaRealizada = document.getElementById("pedido-entrega-realizada").value;
  const dataEntregaPrevista = document.getElementById("pedido-entrega-prevista").value;

  const pedido = {
    id, clientId, numeroPedidoADM: document.getElementById("pedido-numero-adm").value.trim(),
    dataPedido: document.getElementById("pedido-data").value,
    dataCarregamentoPrevista: document.getElementById("pedido-carregamento-previsto").value,
    dataCarregamentoRealizada: document.getElementById("pedido-carregamento-realizado").value,
    dataEntregaPrevista, dataEntregaRealizada,
    produtos, valorProdutos: valorProdutos.toFixed(2), frete, valorComFrete: (valorProdutos + frete).toFixed(2),
    condicaoPagamento: document.getElementById("pedido-condicao-pagamento").value.trim(),
    tipoFrete: document.getElementById("pedido-tipo-frete").value, status,
    satisfacaoEntrega: document.getElementById("pedido-satisfacao-entrega").value,
    produto: produtos.map(p => p.nome).join(", "),
    volume: produtos.reduce((s, p) => s + (Number(p.pesoToneladas) || 0), 0) || "",
    valor: (valorProdutos + frete).toFixed(2),
    dataEntrega: dataEntregaRealizada || dataEntregaPrevista || ""
  };
  const idx = state.pedidos.findIndex(p => p.id === id);
  if (idx >= 0) state.pedidos[idx] = pedido; else state.pedidos.push(pedido);
  saveState();
  closeModal("modal-pedido");
  if (currentFichaClientId === clientId) { renderFichaLeft(); renderFichaTab(); }
  renderDashboard();
  showToast("Pedido registrado.");

  if (status === "Com ocorrência") {
    showToast("Status 'Com ocorrência' — abrindo SAC vinculado.");
    openSacModal(clientId, id);
  }
});

function openContatoModal(clientId, contatoId) {
  document.getElementById("form-contato").reset();
  document.getElementById("contato-id").value = "";
  document.getElementById("contato-data").value = todayStr();
  if (clientId) document.getElementById("contato-cliente").value = clientId;

  const contato = contatoId ? state.contatos.find(c => c.id === contatoId) : null;
  if (contato) document.getElementById("contato-cliente").value = contato.clientId;

  atualizarComQuemOptions();

  if (contato) {
    document.getElementById("contato-id").value = contato.id;
    document.getElementById("contato-data").value = contato.data || "";
    document.getElementById("contato-tipo").value = contato.tipo || "";
    document.getElementById("contato-duracao").value = contato.duracao || "";
    document.getElementById("contato-com-quem").value = contato.comQuem || "";
    document.getElementById("contato-produtos").value = contato.produtosDiscutidos || "";
    document.getElementById("contato-objecoes").value = contato.objecoesLevantadas || "";
    document.getElementById("contato-pendente").value = contato.pendente || "";
    document.getElementById("contato-resultado").value = contato.resultado || "";
    document.getElementById("contato-proximo-passo").value = contato.proximoPasso || "";
    document.getElementById("contato-proximo-data").value = contato.dataProximoContato || "";
    document.getElementById("contato-responsavel").value = contato.responsavelProximoPasso || "Eu";
    document.getElementById("contato-resumo").value = contato.resumo || "";
    document.getElementById("contato-cliente-disse").value = contato.oQueClienteDisse || "";
    document.getElementById("contato-combinado").value = contato.combinado || "";
    document.getElementById("contato-obs").value = contato.obs || "";
  }

  document.getElementById("btn-excluir-contato").classList.toggle("hidden", !contato);
  document.getElementById("modal-contato").classList.remove("hidden");
}
document.getElementById("btn-excluir-contato").addEventListener("click", () => {
  const contatoId = document.getElementById("contato-id").value;
  if (!contatoId) return;
  if (!confirm("Excluir este registro de contato?")) return;
  const clientId = document.getElementById("contato-cliente").value;
  state.contatos = state.contatos.filter(c => c.id !== contatoId);
  saveState();
  closeModal("modal-contato");
  if (currentFichaClientId === clientId) { renderFichaLeft(); renderFichaTab(); }
  showToast("Contato excluído.");
});
function atualizarComQuemOptions() {
  const clientId = document.getElementById("contato-cliente").value;
  const select = document.getElementById("contato-com-quem");
  const lead = state.leads.find(l => l.id === clientId);
  if (lead && lead.contatosPessoas && lead.contatosPessoas.length) {
    select.innerHTML = lead.contatosPessoas.map(p => `<option>${escapeHtml(p.nome)}${p.papel ? " (" + escapeHtml(p.papel) + ")" : ""}</option>`).join("") + `<option>Outro</option>`;
  } else {
    select.innerHTML = `<option>Decisor</option><option>Influenciador</option><option>Outro</option>`;
  }
}
document.getElementById("contato-cliente").addEventListener("change", atualizarComQuemOptions);

const TEMPERATURA_ORDEM = ["Frio", "Morno", "Quente"];
document.getElementById("form-contato").addEventListener("submit", e => {
  e.preventDefault();
  const clientId = document.getElementById("contato-cliente").value;
  if (!clientId) { showToast("Selecione um cliente/lead antes."); return; }
  const contatoId = document.getElementById("contato-id").value;
  const proximoPasso = document.getElementById("contato-proximo-passo").value.trim();
  const dataProximoContato = document.getElementById("contato-proximo-data").value;
  const resultado = document.getElementById("contato-resultado").value;
  const contato = {
    id: contatoId || uid(), clientId, data: document.getElementById("contato-data").value, tipo: document.getElementById("contato-tipo").value,
    duracao: document.getElementById("contato-duracao").value.trim(), comQuem: document.getElementById("contato-com-quem").value,
    resumo: document.getElementById("contato-resumo").value.trim(), oQueClienteDisse: document.getElementById("contato-cliente-disse").value.trim(),
    produtosDiscutidos: document.getElementById("contato-produtos").value.trim(), objecoesLevantadas: document.getElementById("contato-objecoes").value.trim(),
    pendente: document.getElementById("contato-pendente").value.trim(), resultado,
    combinado: document.getElementById("contato-combinado").value.trim(), proximoPasso,
    dataProximoContato, responsavelProximoPasso: document.getElementById("contato-responsavel").value,
    obs: document.getElementById("contato-obs").value.trim()
  };
  if (contatoId) {
    const idx = state.contatos.findIndex(c => c.id === contatoId);
    if (idx >= 0) state.contatos[idx] = contato; else state.contatos.push(contato);
  } else {
    state.contatos.push(contato);
  }

  if (!contatoId) {
    const lead = state.leads.find(l => l.id === clientId);
    if (lead) {
      if (proximoPasso) { lead.proximoPassoObs = proximoPasso; lead.proximoPassoTipo = lead.proximoPassoTipo || "Follow-up WhatsApp"; lead.statusProximoPasso = "Pendente"; }
      if (dataProximoContato) lead.dataProximoPasso = dataProximoContato;

      const idxTemp = TEMPERATURA_ORDEM.indexOf(lead.temperatura);
      if (resultado === "Avançou" && idxTemp >= 0 && idxTemp < TEMPERATURA_ORDEM.length - 1) {
        const novaTemp = TEMPERATURA_ORDEM[idxTemp + 1];
        if (confirm(`Resultado "Avançou". Atualizar a temperatura de ${lead.nome} de "${lead.temperatura}" para "${novaTemp}"?`)) lead.temperatura = novaTemp;
      } else if (resultado === "Regrediu" && idxTemp > 0) {
        const novaTemp = TEMPERATURA_ORDEM[idxTemp - 1];
        if (confirm(`Resultado "Regrediu". Atualizar a temperatura de ${lead.nome} de "${lead.temperatura}" para "${novaTemp}"?`)) lead.temperatura = novaTemp;
      }
    }
  }

  saveState();
  closeModal("modal-contato");
  if (currentFichaClientId === clientId) { renderFichaLeft(); renderFichaTab(); }
  refreshClientSelects(); renderClientList(); renderLeadsList();
  renderDashboard();
  showToast(contatoId ? "Contato atualizado." : "Contato registrado.");
});

function openCompromissoModal(clientId) {
  document.getElementById("form-compromisso").reset();
  document.getElementById("compromisso-data").value = todayStr();
  if (clientId) document.getElementById("compromisso-cliente").value = clientId;
  document.getElementById("modal-compromisso").classList.remove("hidden");
}
document.getElementById("qa-novo-compromisso").addEventListener("click", () => openCompromissoModal());
document.getElementById("form-compromisso").addEventListener("submit", e => {
  e.preventDefault();
  state.compromissos.push({
    id: uid(), clientId: document.getElementById("compromisso-cliente").value, tipo: document.getElementById("compromisso-tipo").value,
    data: document.getElementById("compromisso-data").value, hora: document.getElementById("compromisso-hora").value,
    descricao: document.getElementById("compromisso-descricao").value.trim()
  });
  saveState();
  closeModal("modal-compromisso");
  renderAgenda();
  showToast("Compromisso salvo.");
});

// ============================================================
// FICHA DO CLIENTE
// ============================================================
let currentFichaClientId = null;
let currentFichaTab = "produtivo";
let currentFichaSecao = "metricas";

let currentFichaTipo = "lead";
let fichaNavStack = [];

function activateFichaPanel() {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "ficha"));
}

function openFicha(clientId, isBackNav) {
  if (!isBackNav) {
    const activePanel = document.querySelector(".tab-panel.active");
    if (activePanel && activePanel.id === "ficha") {
      if (currentFichaClientId && currentFichaClientId !== clientId) {
        fichaNavStack.push({ tipo: "ficha", id: currentFichaClientId });
      }
    } else if (activePanel) {
      fichaNavStack.push({ tipo: "tab", nome: activePanel.id });
    }
  }

  currentFichaClientId = clientId;
  currentFichaTipo = isLeadId(clientId) ? "lead" : "cliente";

  document.getElementById("ficha-lead-nav").classList.toggle("hidden", currentFichaTipo !== "lead");
  document.getElementById("ficha-sub-tabs").classList.toggle("hidden", currentFichaTipo !== "cliente");

  if (currentFichaTipo === "lead") {
    currentFichaTab = "produtivo";
    document.querySelectorAll("#ficha-lead-nav .detalhe-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.dtab === currentFichaTab));
  } else {
    currentFichaSecao = "metricas";
    renderFichaClienteSubTabs();
  }

  renderFichaLeft();
  renderFichaTab();
  activateFichaPanel();
}

function sairDaFicha(fallbackTab) {
  while (fichaNavStack.length) {
    const anterior = fichaNavStack.pop();
    if (anterior.tipo === "tab") { switchMainTab(anterior.nome); return; }
    if (anterior.tipo === "ficha" && getEntidadeById(anterior.id)) { openFicha(anterior.id, true); return; }
  }
  switchMainTab(fallbackTab);
}

function voltarDaFicha() {
  sairDaFicha(currentFichaTipo === "lead" ? "leads" : "clientes");
}
document.getElementById("btn-ficha-voltar").addEventListener("click", voltarDaFicha);

function renderFichaLeft() {
  const entidade = getEntidadeById(currentFichaClientId);
  const container = document.getElementById("ficha-left");
  if (!entidade) return;
  const isLead = currentFichaTipo === "lead";
  const wa = onlyDigits(entidade.whatsappDecisor);

  const badge = isLead
    ? (entidade.status !== "Ativo" ? `<span class="badge ${badgeClassForLeadStatus(entidade.status)} fbadge">${escapeHtml(entidade.status)}</span>` : `<span class="badge ${badgeClassForStage(entidade.etapaFunil)} fbadge">${escapeHtml(entidade.etapaFunil)}</span>`)
    : (entidade.status === "Inativo" ? `<span class="badge badge-late fbadge">Inativo</span>`
      : isClienteFidelizado(entidade) ? `<span class="badge badge-ok fbadge">Cliente Fidelizado</span>`
      : `<span class="badge badge-ok fbadge">Cliente Ativo</span>`);
  const classeBadge = (!isLead && entidade.status === "Ativo") ? classificacaoBadgeHtml(classificacaoABCClientes()[entidade.id]) : "";

  const potencialBox = isLead
    ? `<div class="ficha-potencial"><div class="v">${entidade.potencialTon ? entidade.potencialTon + " t/mês" : "-"}</div><div class="l">Potencial estimado · ${escapeHtml(entidade.temperatura || "-")}</div></div>`
    : "";

  const podeConverter = isLead && entidade.etapaFunil === "Fechamento" && entidade.status === "Ativo";
  const idxEtapaAtual = isLead ? LEAD_FUNIL_STAGES.indexOf(entidade.etapaFunil) : -1;
  const podeAvancarEtapa = isLead && entidade.status === "Ativo" && idxEtapaAtual >= 0 && idxEtapaAtual < LEAD_FUNIL_STAGES.length - 1;
  const proximaEtapaLead = podeAvancarEtapa ? LEAD_FUNIL_STAGES[idxEtapaAtual + 1] : null;
  const clienteInativo = !isLead && entidade.status === "Inativo";
  const wazeUrl = entidade.lat && entidade.lng ? `https://waze.com/ul?ll=${entidade.lat},${entidade.lng}&navigate=yes` : "";
  const mapsUrl = entidade.lat && entidade.lng ? `https://www.google.com/maps?q=${entidade.lat},${entidade.lng}`
    : [entidade.enderecoRua, entidade.enderecoNumero, entidade.municipio, entidade.estado].filter(Boolean).length
      ? `https://www.google.com/maps?q=${encodeURIComponent([entidade.enderecoRua, entidade.enderecoNumero, entidade.municipio, entidade.estado].filter(Boolean).join(", "))}` : "";

  container.innerHTML = `
    <div class="ficha-avatar">${initials(entidade.nome)}</div>
    <div class="fnome">${escapeHtml(entidade.nome)}</div>
    <div class="card-sub">${escapeHtml(entidade.fazenda || "")}</div>
    ${badge}${classeBadge}
    ${podeAvancarEtapa ? `<button class="btn-secondary" id="btn-ficha-avancar-etapa" style="width:100%; margin-top:8px;">Avançar para "${escapeHtml(proximaEtapaLead)}"</button>` : ""}
    <div class="ficha-contacts">
      ${wa ? `<a class="ficha-contact-btn" href="https://wa.me/55${wa}" target="_blank" rel="noopener">WhatsApp: ${escapeHtml(entidade.whatsappDecisor)}</a>` : ""}
      ${wa ? `<a class="ficha-contact-btn" href="tel:${wa}">Ligar: ${escapeHtml(entidade.whatsappDecisor)}</a>` : ""}
      ${!wa ? `<div class="hint">Sem WhatsApp/telefone cadastrado.</div>` : ""}
      ${mapsUrl ? `<a class="ficha-contact-btn" href="${mapsUrl}" target="_blank" rel="noopener">Abrir no Google Maps</a>` : ""}
      ${wazeUrl ? `<a class="ficha-contact-btn" href="${wazeUrl}" target="_blank" rel="noopener">Abrir no Waze</a>` : ""}
    </div>
    ${potencialBox}
    <div class="ficha-actions">
      ${podeConverter ? `<button class="btn-primary" id="btn-ficha-converter">Converter em Cliente Ativo</button>` : ""}
      ${isLead ? `<button class="btn-secondary" id="btn-ficha-editar">Editar lead</button>
      <div class="ficha-action-menu">
        <button class="btn-secondary" id="btn-ficha-registrar-acao">Registrar ação</button>
        <div class="ficha-action-dropdown hidden" id="ficha-action-dropdown">
          <button type="button" class="ficha-action-item" id="btn-ficha-mensagem">Registrar Mensagem</button>
          <button type="button" class="ficha-action-item" id="btn-ficha-visita">Registrar Visita</button>
          <button type="button" class="ficha-action-item" id="btn-ficha-ligacao">Registrar Ligação</button>
          <button type="button" class="ficha-action-item" id="btn-ficha-relatorio-visita">Relatório de Visita Técnica</button>
        </div>
      </div>` : ""}
      ${!isLead ? `<button class="btn-secondary ficha-secao-btn active" id="btn-ficha-secao-metricas" data-secao="metricas">Métricas</button>
      <button class="btn-secondary ficha-secao-btn" id="btn-ficha-secao-historico" data-secao="historico">Histórico</button>
      <button class="btn-secondary ficha-secao-btn" id="btn-ficha-secao-acoes" data-secao="acoes">Registrar ação</button>
      <button class="btn-secondary ficha-secao-btn" id="btn-ficha-secao-cadastro" data-secao="cadastro">Cadastro</button>
      <button class="btn-secondary ficha-secao-btn" id="btn-ficha-secao-relatorio" data-secao="relatorio">Relatório Gerencial</button>` : ""}
      ${!isLead ? (clienteInativo ? `<button class="btn-secondary" id="btn-reativar-cliente">Reativar cliente</button>` : `<button class="btn-secondary" id="btn-inativar-cliente" style="color:var(--late-text); border-color:var(--late-text);">Inativar cliente</button>`) : ""}
      <button class="btn-secondary" id="btn-ficha-excluir" style="color:var(--late-text); border-color:var(--late-text);">Excluir ${isLead ? "lead" : "cliente"}</button>
    </div>
  `;
  const abrirContatoComTipo = tipo => { openContatoModal(entidade.id); document.getElementById("contato-tipo").value = tipo; };
  const btnConverter = document.getElementById("btn-ficha-converter");
  if (btnConverter) btnConverter.addEventListener("click", () => converterLeadEmCliente(entidade.id));
  const btnAvancarEtapa = document.getElementById("btn-ficha-avancar-etapa");
  if (btnAvancarEtapa) {
    btnAvancarEtapa.addEventListener("click", () => {
      if (confirm(`Critério da próxima etapa "${proximaEtapaLead}": ${LEAD_STAGE_CRITERIA[proximaEtapaLead]}.\n\nAvançar ${entidade.nome} de "${entidade.etapaFunil}" para "${proximaEtapaLead}"?`)) {
        entidade.etapaFunil = proximaEtapaLead;
        entidade.historicoEtapas = entidade.historicoEtapas || [];
        entidade.historicoEtapas.push({ etapa: proximaEtapaLead, data: todayStr() });
        saveState();
        renderFichaLeft();
        renderFichaTab();
        refreshClientSelects(); renderClientList(); renderLeadsList(); renderDashboard();
        showToast(`Etapa atualizada para "${proximaEtapaLead}".`);
      }
    });
  }
  if (isLead) {
    document.getElementById("btn-ficha-registrar-acao").addEventListener("click", e => {
      e.stopPropagation();
      document.getElementById("ficha-action-dropdown").classList.toggle("hidden");
    });
    document.querySelectorAll("#ficha-action-dropdown .ficha-action-item").forEach(btn => {
      btn.addEventListener("click", () => document.getElementById("ficha-action-dropdown").classList.add("hidden"));
    });
    document.getElementById("btn-ficha-editar").addEventListener("click", () => { openClienteModal(entidade.id); });
    document.getElementById("btn-ficha-mensagem").addEventListener("click", () => abrirContatoComTipo("WhatsApp"));
    document.getElementById("btn-ficha-visita").addEventListener("click", () => abrirContatoComTipo("Visita presencial"));
    document.getElementById("btn-ficha-ligacao").addEventListener("click", () => abrirContatoComTipo("Ligação"));
    document.getElementById("btn-ficha-relatorio-visita").addEventListener("click", () => { openVisitaModal(entidade.id); });
  }
  if (!isLead) {
    document.querySelectorAll(".ficha-secao-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        currentFichaSecao = btn.dataset.secao;
        document.querySelectorAll(".ficha-secao-btn").forEach(b => b.classList.toggle("active", b === btn));
        renderFichaClienteSubTabs();
        renderFichaTab();
      });
    });
  }
  const btnInativar = document.getElementById("btn-inativar-cliente");
  if (btnInativar) btnInativar.addEventListener("click", () => openInativarClienteModal(entidade.id));
  const btnReativar = document.getElementById("btn-reativar-cliente");
  if (btnReativar) btnReativar.addEventListener("click", () => reativarCliente(entidade.id));
  document.getElementById("btn-ficha-excluir").addEventListener("click", () => excluirCliente(entidade));
}

document.addEventListener("click", e => {
  document.querySelectorAll(".ficha-action-dropdown").forEach(dropdown => {
    if (!dropdown.classList.contains("hidden") && !e.target.closest(".ficha-action-menu")) {
      dropdown.classList.add("hidden");
    }
  });
});

function irParaAbaLead(tab) {
  currentFichaTab = tab;
  document.querySelectorAll("#ficha-lead-nav .detalhe-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.dtab === tab));
  renderFichaTab();
}
document.querySelectorAll("#ficha-lead-nav .detalhe-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => irParaAbaLead(btn.dataset.dtab));
});

// ---------- Navegação da ficha de Cliente Ativo (Histórico / Cadastro) ----------
const HISTORICO_SUBTABS = [
  { key: "followups", label: "Follow-ups" },
  { key: "visitas", label: "Visitas" },
  { key: "vendas", label: "Histórico de Vendas" },
  { key: "concorrencia", label: "Inteligência Competitiva" },
  { key: "sac", label: "SAC" }
];
const CADASTRO_SUBTABS = [
  { key: "identificacao", label: "Identificação" },
  { key: "contatos", label: "Contatos" },
  { key: "produtivo", label: "Perfil Produtivo" }
];

function renderFichaClienteSubTabs() {
  const bar = document.getElementById("ficha-sub-tabs");
  if (["metricas", "acoes", "relatorio"].includes(currentFichaSecao)) {
    currentFichaTab = currentFichaSecao;
    bar.innerHTML = "";
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");
  const subtabs = currentFichaSecao === "historico" ? HISTORICO_SUBTABS : CADASTRO_SUBTABS;
  currentFichaTab = subtabs[0].key;
  bar.innerHTML = subtabs.map((t, i) => `<button class="detalhe-tab-btn ${i === 0 ? "active" : ""}" data-dtab="${t.key}">${t.label}</button>`).join("");
  bar.querySelectorAll(".detalhe-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      bar.querySelectorAll(".detalhe-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFichaTab = btn.dataset.dtab;
      renderFichaTab();
    });
  });
}

function renderMetricasTab(cliente) {
  const pedidos = pedidosForClient(cliente.id);
  const insight = computeClientInsight(cliente);
  const volumeTotal = pedidos.reduce((s, p) => s + (Number(p.volume) || 0), 0);
  const valorTotal = pedidos.reduce((s, p) => s + valorPedido(p), 0);
  const nPedidos = pedidos.length;
  const ticketMedioTon = nPedidos ? volumeTotal / nPedidos : 0;
  const ticketMedioReais = nPedidos ? valorTotal / nPedidos : 0;
  const freqEsperadaEm5Anos = insight.avgInterval ? (5 * 365) / insight.avgInterval : 0;
  const ltvProjetado = ticketMedioReais * freqEsperadaEm5Anos;
  const diasComoCliente = cliente.dataConversao ? daysBetween(cliente.dataConversao, todayStr()) : null;

  const now = new Date();
  const thisMonth = dateToStr(now).slice(0, 7);
  const lastMonth = dateToStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
  const volThis = pedidos.filter(p => p.dataPedido && p.dataPedido.slice(0, 7) === thisMonth).reduce((s, p) => s + (Number(p.volume) || 0), 0);
  const volLast = pedidos.filter(p => p.dataPedido && p.dataPedido.slice(0, 7) === lastMonth).reduce((s, p) => s + (Number(p.volume) || 0), 0);
  const variacao = volLast > 0 ? Math.round(((volThis - volLast) / volLast) * 100) : null;

  const risco = computeChurnRisco(cliente);
  const riscoBadge = risco.nivel === "Alto" ? "badge-late" : risco.nivel === "Médio" ? "badge-warn" : "badge-ok";
  const indicados = indicadosPor(cliente);
  const visitas = visitasForClient(cliente.id);
  const avals = [...pedidos.map(p => p.satisfacaoEntrega), ...visitas.map(v => v.satisfacaoCliente)]
    .filter(a => a && a !== "— Não avaliado —");
  const positivas = avals.filter(a => a === "Ótima" || a === "Boa").length;

  const cards = [
    { v: formatVolume(volumeTotal) + " t", l: "Volume total comprado" },
    { v: formatMoney(valorTotal), l: "Valor total comprado" },
    { v: formatVolume(ticketMedioTon) + " t / " + formatMoney(ticketMedioReais), l: "Ticket médio (volume / valor)" },
    { v: insight.avgInterval ? insight.avgInterval + " dias" : "-", l: "Frequência média de compra" },
    { v: nPedidos, l: "Número de pedidos" },
    { v: insight.statusLabel, l: "Recompra" },
    { v: formatMoney(ltvProjetado), l: "LTV estimado (projeção 5 anos)" },
    { v: variacao === null ? "-" : (variacao >= 0 ? "+" : "") + variacao + "%", l: "Variação de volume (mês vs. anterior)" },
    { v: diasComoCliente !== null ? diasComoCliente + " dias" : "-", l: "Cliente ativo há" },
    { v: `<span class="badge ${riscoBadge}">${risco.nivel}</span> <span class="metrica-sub">${risco.score}/100</span>`, l: "Risco de churn" },
    { v: indicados.length, l: "Clientes indicados" },
    { v: avals.length ? `${positivas} de ${avals.length}` : "—", l: avals.length ? "Avaliações positivas" : "Sem avaliações registradas" }
  ];

  const indicadosHtml = indicados.length ? `
    <h4>Indicados por ${escapeHtml(cliente.nome)}</h4>
    <p class="hint" style="margin-top:-4px">Cruzamento por nome (texto livre) — pode variar conforme a grafia usada no cadastro.</p>
    <div class="indicados-list">${indicados.map(e => `<button type="button" class="btn-secondary indicado-link" data-goto="${e.id}">${escapeHtml(e.nome)}${e.fazenda ? " · " + escapeHtml(e.fazenda) : ""}</button>`).join("")}</div>
  ` : "";

  return `
    <div class="metrica-cards">${cards.map(c => `<div class="metrica-card"><div class="v">${c.v}</div><div class="l">${c.l}</div></div>`).join("")}</div>
    ${indicadosHtml}
    <h4>Evolução do volume (últimos 12 meses)</h4>
    ${monthlyVolumeBarsHtml(pedidos)}
  `;
}
// Navegação para a ficha de um cliente/lead indicado (delegado, funciona após qualquer render)
document.addEventListener("click", e => {
  const link = e.target.closest(".indicado-link");
  if (link && link.dataset.goto) openFicha(link.dataset.goto);
});

// ---------- Conversão Lead → Cliente Ativo ----------
function converterLeadEmCliente(leadId) {
  const lead = state.leads.find(l => l.id === leadId);
  if (!lead) return;
  if (!confirm(`Converter ${lead.nome} em Cliente Ativo? O lead será arquivado (status "Convertido") e o histórico de follow-ups fica vinculado ao cliente.`)) return;

  const novoCliente = {
    id: uid(), leadOrigemId: lead.id,
    nome: lead.nome, fazenda: lead.fazenda, cpfCnpj: lead.cpfCnpj,
    enderecoRua: lead.enderecoRua, enderecoNumero: lead.enderecoNumero, enderecoBairro: lead.enderecoBairro,
    enderecoComplemento: lead.enderecoComplemento, municipio: lead.municipio, estado: lead.estado, cep: lead.cep,
    lat: lead.lat || "", lng: lead.lng || "",
    whatsappDecisor: lead.whatsappDecisor, nomeDecisor: lead.nomeDecisor, cargoDecisor: lead.cargoDecisor,
    whatsappInfluenciador: lead.whatsappInfluenciador, nomeInfluenciador: lead.nomeInfluenciador, cargoInfluenciador: lead.cargoInfluenciador,
    contatosPessoas: (lead.contatosPessoas || []).map(c => ({ ...c })),
    categoriasAnimais: (lead.categoriasAnimais || []).map(c => ({ ...c })),
    nivelTecnologico: lead.nivelTecnologico || "", areaTotalHectares: lead.areaTotalHectares || "",
    statusCadastro: "Em análise", dataCadastroAprovado: "", condicaoPagamentoDias: "", tipoFrete: "FOB",
    cadastroAprovado: "nao", alertaRecompraDias: 5, cicloObs: "",
    consultorId: lead.consultorId, temConsultor: lead.temConsultor,
    status: "Ativo", motivoInativacao: "", concorrenteInativacao: "", dataInativacao: "",
    vendedorResponsavel: nomeUsuarioPadrao(), dataConversao: todayStr(),
    obsGerais: lead.obsGerais, criadoEm: todayStr(), schemaV5: true
  };
  state.clientesAtivos.push(novoCliente);

  // Revincula o histórico acumulado como lead (follow-ups, visitas, observações competitivas) ao novo id do cliente
  state.contatos.forEach(c => { if (c.clientId === lead.id) c.clientId = novoCliente.id; });
  state.visitas.forEach(v => { if (v.clientId === lead.id) v.clientId = novoCliente.id; });
  state.competitivas.forEach(c => { if (c.clientId === lead.id) c.clientId = novoCliente.id; });

  lead.status = "Convertido";
  lead.dataConversao = todayStr();
  lead.clienteAtivoId = novoCliente.id;
  lead.vendedorResponsavel = nomeUsuarioPadrao();

  saveState();
  refreshClientSelects(); renderClientList(); renderLeadsList(); renderDashboard();
  if (currentFichaClientId === lead.id) { renderFichaLeft(); renderFichaTab(); }
  showToast(`${novoCliente.nome} convertido em Cliente Ativo.`);

  if (confirm("Deseja registrar o primeiro pedido agora?")) {
    openPedidoModal(novoCliente.id);
  } else {
    openFicha(novoCliente.id);
  }
}

const CLIENTE_ATIVO_FIELD_MAP = [
  ["ca-nome", "nome"], ["ca-nome-fantasia", "nomeFantasia"], ["ca-fazenda", "fazenda"], ["ca-cpf-cnpj", "cpfCnpj"],
  ["ca-endereco-rua", "enderecoRua"], ["ca-endereco-numero", "enderecoNumero"], ["ca-endereco-complemento", "enderecoComplemento"],
  ["ca-endereco-bairro", "enderecoBairro"], ["ca-municipio", "municipio"], ["ca-estado", "estado"], ["ca-cep", "cep"],
  ["ca-como-chegou", "comoChegou"], ["ca-indicado-por", "indicadoPor"],
  ["ca-tem-consultor", "temConsultor"], ["ca-consultor-id", "consultorId"],
  ["ca-area-hectares", "areaTotalHectares"], ["ca-nivel-tecnologico", "nivelTecnologico"],
  ["ca-status-cadastro", "statusCadastro"], ["ca-data-cadastro-aprovado", "dataCadastroAprovado"],
  ["ca-cadastro-aprovado", "cadastroAprovado"], ["ca-vendedor-responsavel", "vendedorResponsavel"],
  ["ca-alerta-recompra-dias", "alertaRecompraDias"], ["ca-ciclo-obs", "cicloObs"]
];

function ativarAbaClienteAtivo(tab) {
  document.querySelectorAll(".ca-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.catab === tab));
  document.querySelectorAll(".ca-ctab-panel").forEach(p => p.classList.toggle("active", p.dataset.catabPanel === tab));
}
document.querySelectorAll(".ca-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => ativarAbaClienteAtivo(btn.dataset.catab));
});

function openClienteAtivoModal(clienteId) {
  const cliente = state.clientesAtivos.find(c => c.id === clienteId);
  if (!cliente) return;
  refreshConsultorSelect();
  refreshFornecedoresDatalist();
  document.getElementById("ca-id").value = cliente.id;
  CLIENTE_ATIVO_FIELD_MAP.forEach(([domId, key]) => {
    const el = document.getElementById(domId);
    if (el) el.value = (cliente[key] !== undefined && cliente[key] !== null) ? cliente[key] : "";
  });
  document.getElementById("ca-status-cadastro").value = cliente.statusCadastro || "Em análise";
  document.getElementById("ca-cadastro-aprovado").value = cliente.cadastroAprovado || "nao";
  document.getElementById("ca-tem-consultor").value = cliente.temConsultor || "nao";
  document.getElementById("ca-vendedor-responsavel").value = cliente.vendedorResponsavel || nomeUsuarioPadrao();
  document.getElementById("ca-alerta-recompra-dias").value = cliente.alertaRecompraDias || 5;

  currentCategoriasAnimaisCA = (cliente.categoriasAnimais && cliente.categoriasAnimais.length) ? cliente.categoriasAnimais.map(c => ({ ...c })) : [categoriaVazia()];
  currentContatosPessoasCA = (cliente.contatosPessoas && cliente.contatosPessoas.length) ? cliente.contatosPessoas.map(c => ({ ...c })) : [{ id: uid(), nome: "", cargo: "", papel: "Decisor", whatsapp: "", email: "", canalPreferido: "WhatsApp", obs: "", principal: true }];
  renderCategoriasAnimaisRowsCA();
  renderContatosPessoasRowsCA();

  document.getElementById("ca-lat").value = cliente.lat || "";
  document.getElementById("ca-lng").value = cliente.lng || "";
  document.getElementById("ca-localizacao-status").textContent = cliente.lat && cliente.lng ? `Localização salva: ${cliente.lat}, ${cliente.lng}` : "";

  ativarAbaClienteAtivo("identificacao");
  document.getElementById("modal-cliente-ativo").classList.remove("hidden");
}
document.getElementById("form-cliente-ativo").addEventListener("submit", e => {
  e.preventDefault();
  const cliente = state.clientesAtivos.find(c => c.id === document.getElementById("ca-id").value);
  if (!cliente) return;
  if (!document.getElementById("ca-nome").value.trim()) {
    showToast("Informe o nome do cliente.");
    ativarAbaClienteAtivo("identificacao");
    return;
  }
  const categoriaSemVolumeCA = currentCategoriasAnimaisCA.find(c => c.tipoAnimal && c.produtoAtual && !c.volumeMensalEstimado);
  if (categoriaSemVolumeCA) {
    showToast(`Informe o volume mensal estimado de "${categoriaRowLabel(categoriaSemVolumeCA)}" — obrigatório quando há produto atual preenchido (é a base da previsão de estoque).`);
    ativarAbaClienteAtivo("produtivo");
    return;
  }
  CLIENTE_ATIVO_FIELD_MAP.forEach(([domId, key]) => { cliente[key] = document.getElementById(domId).value.trim(); });
  cliente.alertaRecompraDias = Number(cliente.alertaRecompraDias) || 5;
  cliente.vendedorResponsavel = cliente.vendedorResponsavel || nomeUsuarioPadrao();
  cliente.categoriasAnimais = currentCategoriasAnimaisCA.filter(c => c.tipoAnimal);
  cliente.contatosPessoas = currentContatosPessoasCA.filter(c => c.nome);
  syncDecisorFromContatos(cliente);
  cliente.lat = document.getElementById("ca-lat").value;
  cliente.lng = document.getElementById("ca-lng").value;
  saveState();
  closeModal("modal-cliente-ativo");
  showToast("Cadastro do cliente salvo.");
  refreshClientSelects(); renderClientList();
  if (currentFichaClientId === cliente.id) { renderFichaLeft(); renderFichaTab(); }
});

// ---------- Propostas (versionadas por lead) ----------
let currentPropostaProdutos = [];
function produtoPropostaVazio() { return { id: uid(), nome: "", quantidade: "", valorUnitario: "", valorTotal: "" }; }

function renderPropostaProdutosRows() {
  const container = document.getElementById("proposta-produtos-list");
  container.innerHTML = currentPropostaProdutos.map((p, i) => `
    <div class="produto-proposta-row" data-idx="${i}">
      <input type="text" class="prop-nome" placeholder="Produto" value="${escapeHtml(p.nome || "")}">
      <input type="number" class="prop-qtd" min="0" step="any" placeholder="Quantidade" value="${escapeHtml(p.quantidade || "")}">
      <input type="number" class="prop-valor-unit" min="0" step="0.01" placeholder="Valor unitário" value="${escapeHtml(p.valorUnitario || "")}">
      <input type="number" class="prop-valor-total" placeholder="Valor total" readonly value="${escapeHtml(p.valorTotal || "")}">
      ${currentPropostaProdutos.length > 1 ? `<button type="button" class="btn-remove-cat" title="Remover">Remover</button>` : `<span></span>`}
    </div>
  `).join("");
  container.querySelectorAll(".produto-proposta-row").forEach(row => {
    const idx = Number(row.dataset.idx);
    const recalc = () => {
      const p = currentPropostaProdutos[idx];
      const total = (Number(p.quantidade) || 0) * (Number(p.valorUnitario) || 0);
      p.valorTotal = total ? total.toFixed(2) : "";
      row.querySelector(".prop-valor-total").value = p.valorTotal;
      renderPropostaValorTotal();
    };
    row.querySelector(".prop-nome").addEventListener("input", e => { currentPropostaProdutos[idx].nome = e.target.value; });
    row.querySelector(".prop-qtd").addEventListener("input", e => { currentPropostaProdutos[idx].quantidade = e.target.value; recalc(); });
    row.querySelector(".prop-valor-unit").addEventListener("input", e => { currentPropostaProdutos[idx].valorUnitario = e.target.value; recalc(); });
    const btnRemove = row.querySelector(".btn-remove-cat");
    if (btnRemove) btnRemove.addEventListener("click", () => { currentPropostaProdutos.splice(idx, 1); renderPropostaProdutosRows(); renderPropostaValorTotal(); });
  });
  const counter = document.getElementById("proposta-produtos-count");
  if (counter) counter.textContent = currentPropostaProdutos.length > 1 ? `${currentPropostaProdutos.length} produtos cadastrados` : "";
}
function renderPropostaValorTotal() {
  const total = currentPropostaProdutos.reduce((s, p) => s + (Number(p.valorTotal) || 0), 0);
  document.getElementById("proposta-valor-total").value = total.toFixed(2);
}
document.getElementById("btn-add-produto-proposta").addEventListener("click", () => { currentPropostaProdutos.push(produtoPropostaVazio()); renderPropostaProdutosRows(); });

function openPropostaModal(leadId) {
  const form = document.getElementById("form-proposta");
  form.reset();
  document.getElementById("proposta-id").value = "";
  document.getElementById("proposta-lead-id").value = leadId;
  document.getElementById("proposta-data-envio").value = todayStr();
  document.getElementById("proposta-status").value = "Aguardando retorno";
  currentPropostaProdutos = [produtoPropostaVazio()];
  renderPropostaProdutosRows();
  renderPropostaValorTotal();
  document.getElementById("modal-proposta").classList.remove("hidden");
}
document.getElementById("form-proposta").addEventListener("submit", e => {
  e.preventDefault();
  const leadId = document.getElementById("proposta-lead-id").value;
  const anteriores = propostasForLead(leadId);
  const produtos = currentPropostaProdutos.filter(p => p.nome);
  const valorTotal = produtos.reduce((s, p) => s + (Number(p.valorTotal) || 0), 0);
  const proposta = {
    id: uid(), leadId, versao: anteriores.length + 1,
    dataEnvio: document.getElementById("proposta-data-envio").value,
    validade: document.getElementById("proposta-validade").value,
    volumeTotal: document.getElementById("proposta-volume-total").value,
    produtos, valorTotal: valorTotal.toFixed(2),
    condicaoPagamento: document.getElementById("proposta-condicao-pagamento").value.trim(),
    tipoFrete: document.getElementById("proposta-tipo-frete").value,
    status: document.getElementById("proposta-status").value,
    motivoRecusa: document.getElementById("proposta-motivo-recusa").value.trim()
  };
  const anterior = anteriores[anteriores.length - 1];
  if (anterior && (anterior.status === "Aguardando retorno" || anterior.status === "Em negociação")) {
    anterior.status = "Substituída por nova versão";
  }
  state.propostas.push(proposta);
  saveState();
  closeModal("modal-proposta");
  if (currentFichaClientId === leadId) renderFichaTab();
  showToast(`Proposta v${proposta.versao} salva.`);
});

// ---------- Encerramento de lead ----------
document.getElementById("encerrar-motivo").addEventListener("change", e => {
  document.getElementById("encerrar-concorrente-label").style.display = e.target.value === "Perdido para concorrente" ? "" : "none";
});
function openEncerrarLeadModal(leadId) {
  document.getElementById("form-encerrar-lead").reset();
  document.getElementById("encerrar-lead-id").value = leadId;
  document.getElementById("encerrar-concorrente-label").style.display = "";
  document.getElementById("modal-encerrar-lead").classList.remove("hidden");
}
document.getElementById("form-encerrar-lead").addEventListener("submit", e => {
  e.preventDefault();
  const leadId = document.getElementById("encerrar-lead-id").value;
  const lead = state.leads.find(l => l.id === leadId);
  if (!lead) return;
  const motivo = document.getElementById("encerrar-motivo").value;
  const statusPorMotivo = {
    "Perdido para concorrente": "Perdido", "Sem retorno após múltiplas tentativas": "Perdido",
    "Cliente sem interesse no momento": "Perdido", "Sem potencial identificado": "Inativo",
    "Bloqueado por vínculo do consultor": "Bloqueado", "Outro": "Inativo"
  };
  lead.status = statusPorMotivo[motivo] || "Inativo";
  lead.motivoEncerramento = motivo;
  lead.concorrenteMotivo = motivo === "Perdido para concorrente" ? document.getElementById("encerrar-concorrente").value.trim() : "";
  lead.dataEncerramento = todayStr();
  saveState();
  closeModal("modal-encerrar-lead");
  refreshClientSelects(); renderClientList(); renderLeadsList(); renderDashboard();
  if (currentFichaClientId === leadId) { renderFichaLeft(); renderFichaTab(); }
  showToast(`Lead encerrado (${motivo}).`);
});

function reativarLead(leadId) {
  const lead = state.leads.find(l => l.id === leadId);
  if (!lead) return;
  if (!confirm(`Reativar ${lead.nome}? O lead voltará para o pipeline como Ativo.`)) return;
  lead.status = "Ativo";
  lead.motivoEncerramento = ""; lead.concorrenteMotivo = ""; lead.dataEncerramento = "";
  saveState();
  refreshClientSelects(); renderClientList(); renderLeadsList(); renderDashboard();
  renderFichaLeft(); renderFichaTab();
  showToast(`${lead.nome} reativado.`);
}

// ---------- Inativação de Cliente Ativo ----------
document.getElementById("inativar-motivo").addEventListener("change", e => {
  document.getElementById("inativar-concorrente-label").style.display = e.target.value === "Migrou para concorrente" ? "" : "none";
});
function openInativarClienteModal(clienteId) {
  document.getElementById("form-inativar-cliente").reset();
  document.getElementById("inativar-cliente-id").value = clienteId;
  document.getElementById("inativar-concorrente-label").style.display = "";
  document.getElementById("modal-inativar-cliente").classList.remove("hidden");
}
document.getElementById("form-inativar-cliente").addEventListener("submit", e => {
  e.preventDefault();
  const clienteId = document.getElementById("inativar-cliente-id").value;
  const cliente = state.clientesAtivos.find(c => c.id === clienteId);
  if (!cliente) return;
  const motivo = document.getElementById("inativar-motivo").value;
  cliente.status = "Inativo";
  cliente.motivoInativacao = motivo;
  cliente.concorrenteInativacao = motivo === "Migrou para concorrente" ? document.getElementById("inativar-concorrente").value.trim() : "";
  cliente.dataInativacao = todayStr();
  saveState();
  closeModal("modal-inativar-cliente");
  refreshClientSelects(); renderClientList(); renderDashboard();
  if (currentFichaClientId === clienteId) { renderFichaLeft(); renderFichaTab(); }
  showToast(`Cliente inativado (${motivo}).`);
});
function reativarCliente(clienteId) {
  const cliente = state.clientesAtivos.find(c => c.id === clienteId);
  if (!cliente) return;
  if (!confirm(`Reativar ${cliente.nome}? Volta a aparecer como cliente ativo.`)) return;
  cliente.status = "Ativo";
  cliente.motivoInativacao = ""; cliente.concorrenteInativacao = ""; cliente.dataInativacao = "";
  saveState();
  refreshClientSelects(); renderClientList(); renderDashboard();
  renderFichaLeft(); renderFichaTab();
  showToast(`${cliente.nome} reativado.`);
}

function renderFichaTab() {
  const entidade = getEntidadeById(currentFichaClientId);
  const container = document.getElementById("ficha-conteudo");
  if (!entidade) { container.innerHTML = ""; return; }

  if (currentFichaTipo === "lead") {
    const renderers = { produtivo: renderProdutivoTab, contatos: renderContatosTimelineTab, visitas: renderVisitasFichaTab, propostas: renderFunilTab, concorrencia: renderFornecedorTab };
    container.innerHTML = renderers[currentFichaTab](entidade);
    attachFichaEvents(entidade);
    if (currentFichaTab === "visitas") attachVisitasFichaEvents(entidade);
    return;
  }

  const renderers = {
    metricas: renderMetricasTab,
    acoes: renderAcoesTab,
    relatorio: renderRelatorioSecaoTab,
    followups: c => renderContatosTimelineTab(c, { showContatosPessoas: false, showRegistrarButton: false }),
    visitas: c => renderVisitasFichaTab(c, { showRegistrarButton: false }),
    vendas: renderHistoricoVendasCompleto,
    concorrencia: renderFornecedorTab,
    sac: renderSacTab,
    identificacao: renderCadastroIdentificacaoTab,
    contatos: renderCadastroContatosTab,
    produtivo: renderCadastroProdutivoTab
  };
  container.innerHTML = renderers[currentFichaTab](entidade);
  attachFichaEvents(entidade);
  if (currentFichaTab === "visitas") attachVisitasFichaEvents(entidade);
  if (currentFichaTab === "vendas") attachHistoricoVendasEvents(entidade);
  if (currentFichaTab === "sac") attachSacTabEvents();
  if (currentFichaTab === "acoes") attachAcoesEvents(entidade);
  if (currentFichaTab === "relatorio") attachRelatorioSecaoEvents(entidade);
}

// Painel de ações (abre ao lado, como as outras seções) — substitui o dropdown flutuante
function renderAcoesTab(cliente) {
  const acoes = [
    { id: "acao-venda", t: "Registrar Venda", d: "Novo pedido/venda para este cliente" },
    { id: "acao-contato", t: "Registrar Contato", d: "Follow-up, ligação, WhatsApp ou visita" },
    { id: "acao-sac", t: "Registrar SAC", d: "Atendimento ou ocorrência do cliente" },
    { id: "acao-visita", t: "Relatório de Visita Técnica", d: "Formulário completo de visita" },
    { id: "acao-estoque", t: "Registrar Estoque", d: "Estoque atual de uma categoria animal" }
  ];
  return `
  <div class="detalhe-section"><h4>Registrar ação</h4>
    <p class="hint" style="margin-bottom:14px">O que você quer registrar para ${escapeHtml(cliente.nome)}?</p>
    <div class="acoes-grid">
      ${acoes.map(a => `<button type="button" class="acao-card" id="${a.id}"><span class="acao-t">${a.t}</span><span class="acao-d">${escapeHtml(a.d)}</span></button>`).join("")}
    </div>
  </div>`;
}
function attachAcoesEvents(cliente) {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
  on("acao-venda", () => openPedidoModal(cliente.id));
  on("acao-contato", () => openContatoModal(cliente.id));
  on("acao-sac", () => openSacModal(cliente.id));
  on("acao-visita", () => openVisitaModal(cliente.id));
  on("acao-estoque", () => openEstoqueModal(cliente.id));
}

// Relatório Gerencial como seção (painel ao lado)
function renderRelatorioSecaoTab(cliente) {
  const opts = [
    { id: "rel-completo", t: "Relatório completo", d: "Ficha completa: histórico, vendas e ciclo de recompra" },
    { id: "rel-periodo", t: "Relatório por período", d: "Atividade do cliente em um mês específico" }
  ];
  return `
  <div class="detalhe-section"><h4>Relatório Gerencial</h4>
    <p class="hint" style="margin-bottom:14px">Gerar relatório de ${escapeHtml(cliente.nome)}.</p>
    <div class="acoes-grid">
      ${opts.map(o => `<button type="button" class="acao-card" id="${o.id}"><span class="acao-t">${o.t}</span><span class="acao-d">${escapeHtml(o.d)}</span></button>`).join("")}
    </div>
  </div>`;
}
function attachRelatorioSecaoEvents(cliente) {
  const completo = document.getElementById("rel-completo");
  if (completo) completo.addEventListener("click", () => {
    switchMainTab("relatorios");
    document.querySelectorAll(".report-switch-btn").forEach(b => b.classList.toggle("active", b.dataset.report === "cliente"));
    document.querySelectorAll(".report-panel").forEach(p => p.classList.toggle("active", p.id === "report-cliente"));
    currentReportView = "cliente";
    document.getElementById("relatorio-cliente-select").value = cliente.id;
    renderRelatorioCliente(cliente.id);
  });
  const periodo = document.getElementById("rel-periodo");
  if (periodo) periodo.addEventListener("click", () => {
    switchMainTab("relatorios");
    document.querySelectorAll(".report-switch-btn").forEach(b => b.classList.toggle("active", b.dataset.report === "cliente-periodo"));
    document.querySelectorAll(".report-panel").forEach(p => p.classList.toggle("active", p.id === "report-cliente-periodo"));
    currentReportView = "cliente-periodo";
    document.getElementById("relatorio-cliente-periodo-select").value = cliente.id;
    const mesInput = document.getElementById("relatorio-cliente-periodo-mes");
    if (!mesInput.value) mesInput.value = todayStr().slice(0, 7);
    renderRelatorioClientePeriodo(cliente.id, mesInput.value);
  });
}

function renderCadastroIdentificacaoTab(cliente) {
  const statusGeral = statusGeralDocumentacao(cliente);
  const statusBadgeClass = statusGeral === "Completo" ? "badge-ok" : statusGeral === "Em análise" ? "badge-warn" : "badge-late";
  const statusLabel = statusGeral === "Completo" ? "Aprovado" : statusGeral;
  return `
  <div class="detalhe-section"><h4>Identificação</h4>
    <p>Cadastro: <span class="badge ${statusBadgeClass}">${statusLabel}</span></p>
    <div class="detalhe-grid">
      ${field("Nome", cliente.nome)}
      ${field("Nome fantasia", cliente.nomeFantasia)}
      ${field("Fazenda/empresa", cliente.fazenda)}
      ${field("CPF/CNPJ", cliente.cpfCnpj)}
      ${field("Endereço", [cliente.enderecoRua, cliente.enderecoNumero, cliente.enderecoBairro].filter(Boolean).join(", "))}
      ${field("Complemento", cliente.enderecoComplemento)}
      ${field("Município", cliente.municipio)}
      ${field("Estado", cliente.estado)}
      ${field("CEP", cliente.cep)}
      ${field("Como chegou até mim", cliente.comoChegou)}
      ${field("Indicado por", cliente.indicadoPor)}
    </div>
  </div>
  <div class="actions-row"><button class="btn-secondary" id="btn-editar-cadastro-cliente">Editar cadastro</button></div>`;
}

function renderCadastroContatosTab(cliente) {
  const contatosHtml = renderContatosPessoasSection(cliente);
  return `
  ${contatosHtml || `<div class="empty-state">Nenhum contato cadastrado.</div>`}
  <div class="detalhe-section"><h4>Consultor / Nutricionista externo</h4>
    <div class="detalhe-grid">
      ${field("Tem consultor/nutricionista externo", cliente.temConsultor === "sim" ? "Sim" : "Não")}
      ${field("Consultor/Nutricionista vinculado", consultorNome(cliente.consultorId))}
    </div>
  </div>
  <div class="actions-row"><button class="btn-secondary" id="btn-editar-cadastro-cliente">Editar cadastro</button></div>`;
}

function renderCadastroProdutivoTab(cliente) {
  return renderProdutivoTab(cliente) + `<div class="actions-row"><button class="btn-secondary" id="btn-editar-cadastro-cliente">Editar cadastro</button></div>`;
}

function renderHistoricoVendasCompleto(cliente) {
  return `
  ${renderVendasTab(cliente)}
  <h3>Ciclo de Recompra</h3>
  ${stripActionsRow(renderRecompraTab(cliente))}
  <h3>Upsell e Expansão</h3>
  ${renderUpsellTab(cliente)}`;
}
function attachHistoricoVendasEvents(cliente) {
  attachVendasTabEvents(cliente);
  attachUpsellTabEvents(cliente);
}

function renderProdutivoTab(entidade) {
  const isLead = isLeadId(entidade.id);
  const extras = isLead ? `<div class="detalhe-grid">
    ${field("Área total (hectares)", entidade.areaTotalHectares)}
    ${field("Nível tecnológico", entidade.nivelTecnologico)}
    ${field("Tem consultor/nutricionista externo", entidade.temConsultor === "sim" ? "Sim" : "Não")}
    ${field("Consultor/Nutricionista vinculado", consultorNome(entidade.consultorId))}
  </div>` : "";
  return `
  <div class="detalhe-section"><h4>Categoria animal</h4>
    ${categoriasTableHtml(entidade.categoriasAnimais, entidade.id)}
  </div>
  ${extras}`;
}

const RESULTADO_BADGE = { "Avançou": "badge-ok", "Manteve": "badge-neutral", "Regrediu": "badge-late", "Sem resposta": "badge-warn" };

function renderContatosPessoasSection(entidade) {
  if (!(entidade.contatosPessoas || []).length) return "";
  const rows = entidade.contatosPessoas.map(p => `<tr>
    <td>${escapeHtml(p.nome)}${p.principal ? " (Principal)" : ""}</td><td>${escapeHtml(p.cargo || "-")}</td><td>${escapeHtml(p.papel || "-")}</td>
    <td>${escapeHtml(p.canalPreferido || "-")}</td>
    <td>${onlyDigits(p.whatsapp) ? `<a href="https://wa.me/55${onlyDigits(p.whatsapp)}" target="_blank" rel="noopener">${escapeHtml(p.whatsapp)}</a>` : "-"}</td>
  </tr>`).join("");
  return `<div class="detalhe-section"><h4>Contatos cadastrados</h4>
    <table class="mini"><thead><tr><th>Nome</th><th>Cargo</th><th>Papel</th><th>Canal preferido</th><th>WhatsApp</th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;
}

function renderContatosTimelineTab(client, { showContatosPessoas = true, showRegistrarButton = true } = {}) {
  const contatos = contatosForClient(client.id);
  const items = contatos.map(c => `
    <div class="timeline-item" data-contato-id="${c.id}" style="cursor:pointer">
      <div class="timeline-body">
        <div class="timeline-head"><span class="t-tipo">${escapeHtml(c.tipo)}${c.comQuem ? " · " + escapeHtml(c.comQuem) : ""}</span><span class="t-data">${formatDate(c.data)}${c.resultado ? ` <span class="badge ${RESULTADO_BADGE[c.resultado] || "badge-neutral"}">${escapeHtml(c.resultado)}</span>` : ""}</span></div>
        ${c.resumo ? `<div class="timeline-resumo">${escapeHtml(c.resumo)}</div>` : ""}
        ${c.combinado ? `<div class="timeline-resumo">Combinado: ${escapeHtml(c.combinado)}</div>` : ""}
        ${c.proximoPasso ? `<div class="timeline-next">Próximo passo: ${escapeHtml(c.proximoPasso)}${c.dataProximoContato ? " — " + formatDate(c.dataProximoContato) : ""}</div>` : ""}
      </div>
    </div>`).join("");
  return `
    ${showContatosPessoas ? renderContatosPessoasSection(client) : ""}
    <div class="timeline">${items || `<div class="empty-state">Nenhum contato registrado.</div>`}</div>
    ${showRegistrarButton ? `<div class="actions-row"><button class="btn-secondary" id="btn-novo-contato-cliente">+ Registrar contato</button></div>` : ""}
  `;
}

function renderFunilTab(lead) {
  const historico = (lead.historicoEtapas || []).map(h => `<li>${formatDate(h.data)} — ${escapeHtml(h.etapa)}</li>`).join("") || "<li>Sem histórico registrado.</li>";
  const bantScore = computeBantScore(lead);
  const propostas = propostasForLead(lead.id).slice().reverse();
  const propostaRows = propostas.map(p => `<tr><td>v${p.versao}</td><td>${formatDate(p.dataEnvio)}</td><td>${p.volumeTotal || "-"}</td><td>${p.valorTotal ? formatMoney(p.valorTotal) : "-"}</td><td><span class="badge ${badgeClassForPropostaStatus(p.status)}">${escapeHtml(p.status)}</span></td></tr>`).join("")
    || `<tr><td colspan="5">Nenhuma proposta registrada.</td></tr>`;
  const convertido = lead.status === "Convertido";
  const encerrado = lead.status !== "Ativo" && !convertido;
  const clienteVinculado = convertido ? getEntidadeById(lead.clienteAtivoId) : null;
  return `<div class="detalhe-grid">
    ${field("Etapa atual", lead.etapaFunil)}
    ${field("Status do lead", lead.status)}
    ${field("Temperatura", lead.temperatura)}
    ${bantScore ? field("Qualificação BANT", bantScore) : ""}
    ${field("Probabilidade de fechamento", lead.probabilidade)}
    ${field("Produto de interesse", lead.produtoInteresse)}
    ${field("Potencial estimado", lead.potencialTon ? lead.potencialTon + " t/mês" : "")}
    ${field("Valor potencial estimado", lead.potencialValor ? formatMoney(lead.potencialValor) : "")}
    ${field("Próximo passo", lead.proximoPassoTipo)}
    ${field("Data do próximo passo", lead.dataProximoPasso ? formatDate(lead.dataProximoPasso) : "")}
    ${field("Responsável pelo próximo passo", lead.proximoPassoResponsavel)}
  </div>
  ${lead.proximoPassoObs ? `<div class="detalhe-section"><h4>Observações do próximo passo</h4><p>${escapeHtml(lead.proximoPassoObs)}</p></div>` : ""}
  ${lead.statusEspecial ? `<div class="tip-box">Status especial: <strong>${escapeHtml(lead.statusEspecial)}</strong>${lead.statusEspecialObs ? " — " + escapeHtml(lead.statusEspecialObs) : ""}</div>` : ""}
  ${convertido ? `<div class="tip-box" style="background:var(--ok-bg); color:var(--ok-text);">Lead convertido em Cliente Ativo em ${formatDate(lead.dataConversao)}. Este registro é somente histórico — o funil de vendas não se aplica mais a ele.${clienteVinculado ? "" : " (o cliente gerado não foi encontrado — pode ter sido excluído)"}</div>` : ""}
  ${encerrado ? `<div class="tip-box" style="background:var(--late-bg); color:var(--late-text);">Lead encerrado em ${formatDate(lead.dataEncerramento)} — motivo: ${escapeHtml(lead.motivoEncerramento || lead.status)}${lead.concorrenteMotivo ? " (" + escapeHtml(lead.concorrenteMotivo) + ")" : ""}</div>` : ""}
  ${(lead.objecoes || []).length ? `<div class="detalhe-section"><h4>Objeções identificadas</h4><ul>${lead.objecoes.map(o => `<li>${escapeHtml(o)}</li>`).join("")}</ul></div>` : ""}
  ${lead.obsEstrategicas ? `<div class="detalhe-section"><h4>Observações estratégicas internas</h4><p>${escapeHtml(lead.obsEstrategicas)}</p></div>` : ""}
  <div class="detalhe-section"><h4>Propostas</h4>
    <table class="mini"><thead><tr><th>Versão</th><th>Envio</th><th>Volume</th><th>Valor</th><th>Status</th></tr></thead><tbody>${propostaRows}</tbody></table>
    ${convertido ? "" : `<div class="actions-row"><button class="btn-secondary" id="btn-nova-proposta">+ Nova versão de proposta</button></div>`}
  </div>
  <div class="detalhe-section"><h4>Histórico de etapas</h4><ul>${historico}</ul></div>
  <div class="actions-row">
    ${convertido ? "" : `<button class="btn-secondary" id="btn-editar-cliente">Editar lead</button>`}
    ${convertido ? (clienteVinculado ? `<button class="btn-primary" id="btn-ver-cliente-convertido">Ver ficha do cliente</button>` : "") : (encerrado ? `<button class="btn-secondary" id="btn-reativar-lead">Reativar lead</button>` : `<button class="btn-secondary" id="btn-encerrar-lead" style="color:var(--late-text); border-color:var(--late-text);">Encerrar lead</button>`)}
  </div>`;
}

function renderFornecedorTab(lead) {
  const obs = competitivasForClient(lead.id);
  const rows = obs.map(o => `<tr><td>${formatDate(o.data)}</td><td>${escapeHtml(o.concorrente || "-")}</td><td>${escapeHtml(o.produtoConcorrente || "-")}</td><td>${escapeHtml(o.preco || "-")}</td><td>${escapeHtml(o.canalVenda || "-")}</td></tr>`).join("")
    || `<tr><td colspan="5">Nenhuma observação registrada.</td></tr>`;
  const categorias = (lead.categoriasAnimais || []).filter(c => c.fornecedorAtual);
  const categoriaRows = categorias.length
    ? categorias.map(c => `<tr><td>${escapeHtml(categoriaRowLabel(c))}</td><td>${escapeHtml(c.fornecedorAtual)}</td><td>${escapeHtml(c.produtoAtual || "-")}</td><td>${escapeHtml(c.volumeMensalEstimado || "-")}</td><td>${badgeFornecedorClassificacao(c.fornecedorAtual)}</td></tr>`).join("")
    : `<tr><td colspan="5">Nenhum fornecedor cadastrado — preencha em Perfil Produtivo &gt; Situação atual.</td></tr>`;
  return `
    <div class="detalhe-section"><h4>Fornecedor e produto por categoria</h4>
      <table class="mini"><thead><tr><th>Categoria</th><th>Fornecedor</th><th>Produto</th><th>Volume</th><th>Classificação</th></tr></thead><tbody>${categoriaRows}</tbody></table>
    </div>
    <div class="detalhe-section"><h4>Observações competitivas registradas</h4>
      <table class="mini"><thead><tr><th>Data</th><th>Concorrente</th><th>Produto</th><th>Preço</th><th>Canal</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="actions-row"><button class="btn-secondary" id="btn-nova-competitiva">+ Nova observação</button></div>`;
}

function badgeClassForPedidoStatus(status) {
  if (status === "Entregue") return "badge-ok";
  if (status === "Com ocorrência" || status === "Cancelado") return "badge-late";
  return "badge-warn";
}

// Retorna o HTML completo (com o wrapper .sparkline-bars OU uma mensagem de "sem dados
// suficientes") — com menos da metade dos 12 meses tendo algum volume, um gráfico de barras só
// mostra chão vazio com uma barrinha solta em algum canto, mais confuso do que informativo.
function monthlyVolumeBarsHtml(pedidos) {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) months.push(dateToStr(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
  const volumesPorMes = months.map(m => pedidos.filter(p => p.dataPedido && p.dataPedido.slice(0, 7) === m).reduce((s, p) => s + (Number(p.volume) || 0), 0));
  const mesesComVolume = volumesPorMes.filter(v => v > 0).length;
  if (mesesComVolume < Math.ceil(months.length / 2)) {
    return `<p class="hint">Ainda não há histórico de pedidos suficiente para visualizar a tendência de volume mensal.</p>`;
  }
  const maxVol = Math.max(1, ...volumesPorMes);
  const barsHtml = months.map((m, i) => {
    const [y, mm] = m.split("-");
    const label = new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
    const h = Math.round((volumesPorMes[i] / maxVol) * 100);
    return `<div class="bar" style="height:${volumesPorMes[i] ? Math.max(h, 3) : 2}%;" title="${label}: ${formatVolume(volumesPorMes[i])} t"><span class="bar-label">${label}</span></div>`;
  }).join("");
  return `<div class="sparkline-bars">${barsHtml}</div>`;
}

let vendasFiltro = { periodo: "", produto: "", status: "" };

function renderVendasTab(cliente) {
  const todosPedidos = pedidosForClient(cliente.id).slice().reverse();
  const barsHtml = monthlyVolumeBarsHtml(todosPedidos);

  const produtosUnicos = [...new Set(todosPedidos.flatMap(p => (p.produtos || []).map(x => x.nome)).filter(Boolean))];
  const filtrados = todosPedidos.filter(p => {
    if (vendasFiltro.periodo && p.dataPedido && p.dataPedido.slice(0, 7) !== vendasFiltro.periodo) return false;
    if (vendasFiltro.produto && !(p.produtos || []).some(x => x.nome === vendasFiltro.produto)) return false;
    if (vendasFiltro.status && p.status !== vendasFiltro.status) return false;
    return true;
  });

  const statusOpcoes = ["Em processamento", "Carregado", "Em trânsito", "Entregue", "Com ocorrência", "Cancelado"];
  const rows = filtrados.map(p => `<tr data-pedido-id="${p.id}" style="cursor:pointer">
    <td>${escapeHtml(p.numeroPedidoADM || "-")}</td><td>${formatDate(p.dataPedido)}</td>
    <td>${escapeHtml(p.produto || "-")}</td><td>${p.volume ? formatVolume(p.volume) : "-"}</td>
    <td>${p.valorComFrete ? formatMoney(p.valorComFrete) : "-"}</td>
    <td>${p.dataEntregaRealizada ? formatDate(p.dataEntregaRealizada) : (p.dataEntregaPrevista ? "prev. " + formatDate(p.dataEntregaPrevista) : "-")}</td>
    <td><span class="badge ${badgeClassForPedidoStatus(p.status)}">${escapeHtml(p.status || "-")}</span></td>
  </tr>`).join("") || `<tr><td colspan="7">Nenhum pedido no filtro selecionado.</td></tr>`;

  return `
    <h4>Volume mensal (últimos 12 meses)</h4>
    ${barsHtml}
    <div class="actions-row no-print" style="margin-bottom:10px;">
      <input type="month" id="vendas-filtro-periodo" value="${vendasFiltro.periodo}">
      <select id="vendas-filtro-produto"><option value="">Produto (todos)</option>${produtosUnicos.map(p => `<option ${vendasFiltro.produto === p ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")}</select>
      <select id="vendas-filtro-status"><option value="">Status (todos)</option>${statusOpcoes.map(s => `<option ${vendasFiltro.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
    </div>
    <div style="overflow-x:auto;">
    <table class="mini"><thead><tr><th>Nº do pedido</th><th>Data</th><th>Produtos</th><th>Volume (t)</th><th>Valor c/ frete</th><th>Entrega</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="detalhe-section no-print">
      <h4>Condições padrão deste cliente</h4>
      <div class="detalhe-grid">
        <label>Condição de pagamento padrão (dias)
          <input type="text" id="vendas-condicao-pagamento-padrao" value="${escapeHtml(cliente.condicaoPagamentoDias || "")}" placeholder="Ex: 30/60/90 dias">
        </label>
        <label>Tipo de frete padrão
          <select id="vendas-tipo-frete-padrao">
            <option ${cliente.tipoFrete === "FOB" || !cliente.tipoFrete ? "selected" : ""}>FOB</option>
            <option ${cliente.tipoFrete === "CIF" ? "selected" : ""}>CIF</option>
          </select>
        </label>
      </div>
      <p class="hint">Usadas para pré-preencher novos pedidos deste cliente.</p>
    </div>`;
}

function attachVendasTabEvents(cliente) {
  document.getElementById("vendas-filtro-periodo").addEventListener("change", e => { vendasFiltro.periodo = e.target.value; renderFichaTab(); });
  document.getElementById("vendas-filtro-produto").addEventListener("change", e => { vendasFiltro.produto = e.target.value; renderFichaTab(); });
  document.getElementById("vendas-filtro-status").addEventListener("change", e => { vendasFiltro.status = e.target.value; renderFichaTab(); });
  document.querySelectorAll("#ficha-conteudo tr[data-pedido-id]").forEach(tr => {
    tr.addEventListener("click", () => { openPedidoModal(cliente.id, tr.dataset.pedidoId); });
  });
  document.getElementById("vendas-condicao-pagamento-padrao").addEventListener("change", e => {
    cliente.condicaoPagamentoDias = e.target.value.trim();
    saveState();
  });
  document.getElementById("vendas-tipo-frete-padrao").addEventListener("change", e => {
    cliente.tipoFrete = e.target.value;
    saveState();
  });
}

const CICLO_COR = { "em-dia": "#1e7a3d", "atencao": "#b3860f", "atrasado": "#b3261e", "sem-historico": "#8a8f7a" };

function renderRecompraTab(client) {
  const insight = computeClientInsight(client);
  const cor = CICLO_COR[insight.status] || CICLO_COR["sem-historico"];
  const barra = insight.avgInterval ? `
    <div class="ciclo-progresso"><div class="ciclo-progresso-fill" style="width:${Math.min(100, insight.progresso)}%; background:${cor};"></div></div>
    <p class="hint">${insight.diasRestantes >= 0 ? `Faltam ~${insight.diasRestantes} dias para o próximo pedido previsto.` : `${Math.abs(insight.diasRestantes)} dias além do previsto.`}</p>` : "";
  const origemLabel = insight.cicloOrigem === "consumo" ? "estimado pelo consumo declarado" : insight.cicloOrigem === "historico" ? "calculado pelo histórico de pedidos" : "";
  const consumosHtml = (insight.consumosPorProduto || []).length
    ? `<div class="detalhe-grid">${insight.consumosPorProduto.map(c => field(c.produto, formatVolume(c.consumoMensal) + " t/mês")).join("")}</div>`
    : `<p class="hint">Sem consumo mensal declarado — em cada categoria animal, na aba Perfil Produtivo, informe "Produto que usa hoje" e "Volume mensal estimado" para o sistema estimar a recompra desse produto mesmo sem histórico de pedidos.</p>`;
  return `
    <div class="tip-box"><strong>${insight.statusLabel}.</strong> ${escapeHtml(insight.tip)}</div>
    ${barra}
    <div class="detalhe-grid">
      ${reportField(`Ciclo médio${origemLabel ? " (" + origemLabel + ")" : ""}`, insight.avgInterval ? insight.avgInterval + " dias" : "")}
      ${reportField("Volume médio por pedido", insight.avgVolume ? formatVolume(insight.avgVolume) + " t" : "")}
      ${reportField("Data do último pedido", insight.lastPedidoDate ? formatDate(insight.lastPedidoDate) : "")}
      ${reportField("Dias desde o último pedido", insight.daysSinceLast !== null ? insight.daysSinceLast : "")}
      ${reportField("Próximo pedido previsto", insight.nextExpectedDate ? formatDate(insight.nextExpectedDate) : "")}
      ${reportField("Produto favorito", insight.favoriteProduct)}
      ${reportField("Avisar (dias antes do previsto)", client.alertaRecompraDias)}
    </div>
    <div class="detalhe-section"><h4>Consumo mensal declarado por produto</h4>${consumosHtml}</div>
    ${client.cicloObs ? `<div class="detalhe-section"><h4>Observações sobre o ciclo</h4><p>${escapeHtml(client.cicloObs)}</p></div>` : ""}`;
}

function statusGeralDocumentacao(client) {
  if (client.cadastroAprovado === "sim") return "Completo";
  if (client.statusCadastro === "Em análise") return "Em análise";
  return "Pendente";
}

function badgeClassForSacStatus(status) {
  if (status === "Resolvido") return "badge-ok";
  if (status === "Encerrado sem resolução") return "badge-late";
  return "badge-warn";
}
function renderSacTab(client) {
  const sacs = sacsForClient(client.id);
  const rows = sacs.map(s => `<tr data-sac-id="${s.id}" style="cursor:pointer">
    <td>${escapeHtml(s.numero)}</td><td>${formatDate(s.data)}</td><td>${escapeHtml(s.tipo)}</td>
    <td>${escapeHtml(s.produto || "-")}</td><td>${escapeHtml(s.responsavel || "-")}</td>
    <td><span class="badge ${badgeClassForSacStatus(s.status)}">${escapeHtml(s.status)}</span></td>
  </tr>`).join("") || `<tr><td colspan="6">Nenhum SAC registrado.</td></tr>`;
  return `
    <div class="detalhe-section" style="overflow-x:auto;">
      <table class="mini"><thead><tr><th>Número</th><th>Abertura</th><th>Tipo</th><th>Produto</th><th>Responsável</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}
function attachSacTabEvents() {
  document.querySelectorAll("#ficha-conteudo tr[data-sac-id]").forEach(tr => {
    tr.addEventListener("click", () => { openSacModalEdit(tr.dataset.sacId); });
  });
}

// ---------- Upsell e expansão ----------
function upsellsForClient(clientId) { return state.upsells.filter(u => u.clientId === clientId).sort((a, b) => new Date(b.dataIdentificacao) - new Date(a.dataIdentificacao)); }
function badgeClassForUpsellStatus(status) {
  if (status === "Convertida") return "badge-ok";
  if (status === "Descartada") return "badge-late";
  return "badge-warn";
}
function openUpsellModal(clientId, upsellId) {
  const form = document.getElementById("form-upsell");
  form.reset();
  document.getElementById("upsell-id").value = "";
  document.getElementById("upsell-cliente-id").value = clientId;
  document.getElementById("upsell-data").value = todayStr();
  document.getElementById("upsell-status").value = "Identificada";
  const catSelect = document.getElementById("upsell-categoria");
  catSelect.innerHTML = `<option value="">— Selecione —</option>` + TIPO_ANIMAL_OPCOES.map(o => `<option>${o}</option>`).join("");
  if (upsellId) {
    const u = state.upsells.find(x => x.id === upsellId);
    if (u) {
      document.getElementById("upsell-id").value = u.id;
      document.getElementById("upsell-produto").value = u.produto || "";
      catSelect.value = u.categoria || "";
      document.getElementById("upsell-volume").value = u.volumePotencial || "";
      document.getElementById("upsell-justificativa").value = u.justificativa || "";
      document.getElementById("upsell-status").value = u.status || "Identificada";
      document.getElementById("upsell-data").value = u.dataIdentificacao || todayStr();
      document.getElementById("upsell-proximo-passo").value = u.proximoPasso || "";
    }
  }
  document.getElementById("modal-upsell").classList.remove("hidden");
}
document.getElementById("form-upsell").addEventListener("submit", e => {
  e.preventDefault();
  const clientId = document.getElementById("upsell-cliente-id").value;
  const id = document.getElementById("upsell-id").value || uid();
  const upsell = {
    id, clientId, produto: document.getElementById("upsell-produto").value.trim(),
    categoria: document.getElementById("upsell-categoria").value, volumePotencial: document.getElementById("upsell-volume").value,
    justificativa: document.getElementById("upsell-justificativa").value.trim(), status: document.getElementById("upsell-status").value,
    dataIdentificacao: document.getElementById("upsell-data").value, proximoPasso: document.getElementById("upsell-proximo-passo").value.trim()
  };
  const idx = state.upsells.findIndex(u => u.id === id);
  if (idx >= 0) state.upsells[idx] = upsell; else state.upsells.push(upsell);
  saveState();
  closeModal("modal-upsell");
  if (currentFichaClientId === clientId) renderFichaTab();
  showToast("Oportunidade de upsell salva.");
});

function renderUpsellTab(client) {
  const upsells = upsellsForClient(client.id);
  const rows = upsells.map(u => `<tr data-upsell-id="${u.id}" style="cursor:pointer">
    <td>${escapeHtml(u.produto || "-")}</td><td>${escapeHtml(u.categoria || "-")}</td>
    <td>${u.volumePotencial ? formatVolume(u.volumePotencial) + " t" : "-"}</td>
    <td>${formatDate(u.dataIdentificacao)}</td>
    <td><span class="badge ${badgeClassForUpsellStatus(u.status)}">${escapeHtml(u.status)}</span></td>
  </tr>`).join("") || `<tr><td colspan="5">Nenhuma oportunidade registrada.</td></tr>`;
  return `
    <div class="detalhe-section" style="overflow-x:auto;">
      <table class="mini"><thead><tr><th>Produto</th><th>Categoria alvo</th><th>Volume potencial</th><th>Identificado em</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="actions-row"><button class="btn-secondary" id="btn-nova-oportunidade-upsell">+ Nova oportunidade</button></div>`;
}
function attachUpsellTabEvents(client) {
  document.getElementById("btn-nova-oportunidade-upsell").addEventListener("click", () => openUpsellModal(client.id));
  document.querySelectorAll("#ficha-conteudo tr[data-upsell-id]").forEach(tr => {
    tr.addEventListener("click", () => openUpsellModal(client.id, tr.dataset.upsellId));
  });
}

function excluirCliente(entidade) {
  const isLead = isLeadId(entidade.id);
  if (!confirm(`Excluir ${entidade.nome}? Remove também pedidos, contatos e observações ligados a ele.`)) return;
  if (isLead) {
    state.leads = state.leads.filter(l => l.id !== entidade.id);
    // limpa a referência órfã no cliente gerado por este lead, se houver
    const clienteVinculado = state.clientesAtivos.find(c => c.leadOrigemId === entidade.id);
    if (clienteVinculado) clienteVinculado.leadOrigemId = null;
  } else {
    state.clientesAtivos = state.clientesAtivos.filter(c => c.id !== entidade.id);
    // limpa a referência órfã no lead que originou este cliente, se houver
    const leadVinculado = state.leads.find(l => l.clienteAtivoId === entidade.id);
    if (leadVinculado) leadVinculado.clienteAtivoId = "";
  }
  state.pedidos = state.pedidos.filter(p => p.clientId !== entidade.id);
  state.contatos = state.contatos.filter(c => c.clientId !== entidade.id);
  state.competitivas = state.competitivas.filter(c => c.clientId !== entidade.id);
  state.sacs = state.sacs.filter(s => s.clientId !== entidade.id);
  state.visitas = state.visitas.filter(v => v.clientId !== entidade.id);
  state.upsells = state.upsells.filter(u => u.clientId !== entidade.id);
  if (isLead) state.propostas = state.propostas.filter(p => p.leadId !== entidade.id);
  saveState();
  refreshClientSelects();
  renderClientList(); renderLeadsList(); renderDashboard();
  showToast(`${isLead ? "Lead" : "Cliente"} excluído.`);
  sairDaFicha(isLead ? "leads" : "clientes");
}

function attachFichaEvents(entidade) {
  const isLead = isLeadId(entidade.id);
  const map = {
    "btn-editar-cliente": () => { isLead ? openClienteModal(entidade.id) : openClienteAtivoModal(entidade.id); },
    "btn-novo-contato-cliente": () => openContatoModal(entidade.id),
    "btn-nova-competitiva": () => openCompetitivaModal(entidade.id),
    "btn-nova-proposta": () => openPropostaModal(entidade.id),
    "btn-encerrar-lead": () => openEncerrarLeadModal(entidade.id),
    "btn-reativar-lead": () => reativarLead(entidade.id),
    "btn-ver-cliente-convertido": () => { if (entidade.clienteAtivoId) openFicha(entidade.clienteAtivoId); },
    "btn-editar-cadastro-cliente": () => { openClienteAtivoModal(entidade.id); }
  };
  Object.entries(map).forEach(([id, fn]) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); });
  document.querySelectorAll("#ficha-conteudo .timeline-item[data-contato-id]").forEach(item => {
    item.addEventListener("click", () => openContatoModal(entidade.id, item.dataset.contatoId));
  });
}

// ============================================================
// AGENDA
// ============================================================
const EVENT_TYPES = {
  visita: { label: "Visita", colorVar: "--primary" },
  ligacao: { label: "Ligação", colorVar: "--text-muted" },
  followup: { label: "Follow-up", colorVar: "--urgent" },
  reuniao: { label: "Reunião", colorVar: "--chart-2" },
  viagem: { label: "Viagem", colorVar: "--ok-text" },
  pedido: { label: "Pedido", colorVar: "--primary-hover" },
  vencido: { label: "Recompra vencida", colorVar: "--late-text" },
  estoque: { label: "Estoque acabando", colorVar: "--warn-text" },
  aniversario: { label: "Aniversário", colorVar: "--chart-1" }
};

let calendarView = "mes";
let calendarCursor = new Date();
let agendaActiveFilters = new Set(Object.keys(EVENT_TYPES));

function dateToStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function startOfWeek(date) { const d = new Date(date); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }

function getAllAgendaEvents() {
  const events = [];
  state.compromissos.forEach(c => {
    const cli = getEntidadeById(c.clientId);
    const classe = EVENT_TYPES[c.tipo] ? c.tipo : "followup";
    events.push({ data: c.data, hora: c.hora || "", classe, label: c.descricao || EVENT_TYPES[classe].label, clientName: cli ? cli.nome : null });
  });
  state.pedidos.forEach(p => {
    const cli = getEntidadeById(p.clientId);
    events.push({ data: p.dataPedido, hora: "", classe: "pedido", label: `Pedido: ${cli ? cli.nome : "-"}`, clientName: cli ? cli.nome : null });
  });
  state.clientesAtivos.forEach(c => {
    const insight = computeClientInsight(c);
    if (insight.nextExpectedDate) {
      const vencido = insight.status === "atrasado";
      events.push({ data: insight.nextExpectedDate, hora: "", classe: vencido ? "vencido" : "followup", label: "Recompra prevista: " + c.nome, clientName: c.nome });
    }
    computeEstoqueForecastsCliente(c).forEach(({ categoria, forecast }) => {
      if (estoqueAlertaSuprimido(c.id, categoria.id, forecast)) return;
      const dataAlerta = addDays(forecast.dataPrevistaEsgotamento, -20);
      events.push({ data: dataAlerta, hora: "", classe: "estoque", label: `Estoque de ${categoriaRowLabel(categoria)} acabando: ${c.nome}`, clientName: c.nome });
    });
    (c.contatosPessoas || []).forEach(pessoa => {
      const info = aniversarioInfo(pessoa.dataNascimento);
      if (info) events.push({ data: addDays(todayStr(), info.dias), hora: "", classe: "aniversario", label: `Ligar para parabenizar: ${pessoa.nome || "contato"}`, clientName: c.nome });
    });
  });
  return events.filter(e => agendaActiveFilters.has(e.classe));
}

function renderAgendaFilters() {
  const container = document.getElementById("agenda-filters");
  container.innerHTML = Object.entries(EVENT_TYPES).map(([classe, info]) => `
    <label class="agenda-filter-chip ${agendaActiveFilters.has(classe) ? "active" : ""}" data-classe="${classe}">
      <input type="checkbox" ${agendaActiveFilters.has(classe) ? "checked" : ""}>
      <span class="dot" style="background:var(${info.colorVar})"></span>${info.label}
    </label>
  `).join("");
  container.querySelectorAll(".agenda-filter-chip").forEach(chip => {
    chip.addEventListener("click", e => {
      e.preventDefault();
      const classe = chip.dataset.classe;
      if (agendaActiveFilters.has(classe)) agendaActiveFilters.delete(classe); else agendaActiveFilters.add(classe);
      renderAgenda();
    });
  });
}

document.querySelectorAll(".view-switch-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view-switch-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    calendarView = btn.dataset.view;
    renderAgenda();
  });
});

function renderAgenda() {
  renderAgendaFilters();
  const events = getAllAgendaEvents();
  const body = document.getElementById("calendar-body");
  if (calendarView === "mes") renderMonthView(events, body);
  else if (calendarView === "semana") renderWeekView(events, body);
  else renderDayView(events, body);

  const hoje = events.filter(e => e.data === todayStr()).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
  document.getElementById("agenda-hoje-list").innerHTML = hoje.length
    ? hoje.map(e => `<div class="contact-row"><div class="avatar">${initials(e.clientName || "?")}</div><div class="info"><div class="name">${escapeHtml(e.clientName || e.label)}</div><div class="type">${escapeHtml(e.label)}</div></div><div class="when">${e.hora || ""}</div></div>`).join("")
    : `<div class="empty-state">Nada agendado pra hoje.</div>`;
}

function renderMonthView(events, body) {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  document.getElementById("cal-title").textContent = calendarCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const dows = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, out: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, out: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - startOffset - daysInMonth + 1, out: true });

  const dowRow = dows.map(d => `<div class="calendar-dow">${d}</div>`).join("");
  const grid = cells.map(cell => {
    const dateStr = cell.out ? null : `${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
    const isToday = dateStr === todayStr();
    const dayEvents = dateStr ? events.filter(e => e.data === dateStr) : [];
    const shown = dayEvents.slice(0, 3);
    const extra = dayEvents.length - shown.length;
    return `<div class="calendar-cell ${cell.out ? "out" : ""} ${isToday ? "today" : ""}">
      <div class="calendar-daynum">${cell.day}</div>
      ${shown.map(e => `<div class="calendar-evt evt-${e.classe}" title="${escapeHtml(e.label)}">${escapeHtml(e.label)}</div>`).join("")}
      ${extra > 0 ? `<div class="calendar-evt" style="background:transparent;color:var(--text-faint);">+${extra}</div>` : ""}
    </div>`;
  }).join("");

  body.innerHTML = `<div class="calendar-grid">${dowRow}</div><div class="calendar-grid" style="margin-top:4px">${grid}</div>`;
}

function renderWeekView(events, body) {
  const start = startOfWeek(calendarCursor);
  const days = [];
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  const end = days[6];
  document.getElementById("cal-title").textContent = `${start.getDate()} – ${end.getDate()} de ${end.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;

  const dows = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const dowRow = days.map((d, i) => `<div class="calendar-dow">${dows[i]} ${d.getDate()}</div>`).join("");
  const grid = days.map(d => {
    const dateStr = dateToStr(d);
    const isToday = dateStr === todayStr();
    const dayEvents = events.filter(e => e.data === dateStr).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
    return `<div class="calendar-cell calendar-week-col ${isToday ? "today" : ""}">
      ${dayEvents.map(e => `<div class="calendar-evt evt-${e.classe}" title="${escapeHtml(e.label)}">${e.hora ? escapeHtml(e.hora) + " " : ""}${escapeHtml(e.label)}</div>`).join("") || `<span class="hint" style="font-size:0.68rem;">-</span>`}
    </div>`;
  }).join("");

  body.innerHTML = `<div class="calendar-grid">${dowRow}</div><div class="calendar-grid" style="margin-top:4px">${grid}</div>`;
}

function renderDayView(events, body) {
  const dateStr = dateToStr(calendarCursor);
  document.getElementById("cal-title").textContent = calendarCursor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const dayEvents = events.filter(e => e.data === dateStr).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));

  body.innerHTML = `<div class="day-list">${dayEvents.length
    ? dayEvents.map(e => `
        <div class="day-event-row" style="--border-left-color: var(${EVENT_TYPES[e.classe].colorVar})">
          <div class="dey-hora">${e.hora || "—"}</div>
          <div><div class="dey-label">${escapeHtml(e.label)}</div><div class="dey-sub">${EVENT_TYPES[e.classe].label}</div></div>
        </div>`).join("")
    : `<div class="empty-state">Nada agendado pra este dia.</div>`}</div>`;
}

document.getElementById("cal-prev").addEventListener("click", () => {
  if (calendarView === "mes") calendarCursor.setMonth(calendarCursor.getMonth() - 1);
  else if (calendarView === "semana") calendarCursor.setDate(calendarCursor.getDate() - 7);
  else calendarCursor.setDate(calendarCursor.getDate() - 1);
  renderAgenda();
});
document.getElementById("cal-next").addEventListener("click", () => {
  if (calendarView === "mes") calendarCursor.setMonth(calendarCursor.getMonth() + 1);
  else if (calendarView === "semana") calendarCursor.setDate(calendarCursor.getDate() + 7);
  else calendarCursor.setDate(calendarCursor.getDate() + 1);
  renderAgenda();
});

// ============================================================
// INTELIGÊNCIA COMPETITIVA
// ============================================================
function classificarFornecedorTexto(text) {
  const nome = (text || "").trim();
  if (!nome) return "sem-informacao";
  const fornecedor = state.fornecedores.find(f => (f.nome || "").trim().toLowerCase() === nome.toLowerCase());
  if (!fornecedor) return "sem-informacao";
  return fornecedor.ehCasa ? "casa" : "concorrente";
}
function badgeFornecedorClassificacao(fornecedorText) {
  const classe = classificarFornecedorTexto(fornecedorText);
  if (classe === "casa") return `<span class="badge badge-ok">${escapeHtml((state.config && state.config.nomeEmpresa) || "Empresa")}</span>`;
  if (classe === "concorrente") return `<span class="badge badge-late">Concorrente</span>`;
  return `<span class="badge badge-neutral">Sem informação</span>`;
}

function renderCarteiraFornecedor() {
  const linhas = [];
  state.leads.filter(l => l.status === "Ativo").forEach(l => (l.categoriasAnimais || []).forEach(c => { if (c.fornecedorAtual) linhas.push({ entidade: l, tipo: "Lead", cat: c }); }));
  state.clientesAtivos.forEach(cl => (cl.categoriasAnimais || []).forEach(c => { if (c.fornecedorAtual) linhas.push({ entidade: cl, tipo: "Cliente Ativo", cat: c }); }));
  const linhasClassificadas = linhas.map(l => ({ ...l, classe: classificarFornecedorTexto(l.cat.fornecedorAtual) }));
  const comCasa = linhasClassificadas.filter(x => x.classe === "casa");
  const comConcorrente = linhasClassificadas.filter(x => x.classe === "concorrente");
  const semInfo = [...state.leads.filter(l => l.status === "Ativo"), ...state.clientesAtivos].filter(e => !(e.categoriasAnimais || []).some(c => c.fornecedorAtual));
  const nomeEmpresaAtual = (state.config && state.config.nomeEmpresa) || "empresa";
  const totalLeadsClientes = state.leads.filter(l => l.status === "Ativo").length + state.clientesAtivos.length;
  const totalMapeado = comCasa.length + comConcorrente.length;
  const pctConcorrente = totalMapeado ? Math.round((comConcorrente.length / totalMapeado) * 100) : 0;

  document.getElementById("competitiva-hero-num").innerHTML = `${pctConcorrente}<span>%</span>`;
  document.getElementById("competitiva-hero-title").textContent = totalMapeado
    ? `Das categorias mapeadas, ${pctConcorrente}% está com a concorrência`
    : "Nenhuma categoria com fornecedor mapeado ainda";
  document.getElementById("competitiva-hero-sub").textContent = `${totalMapeado} de ${totalLeadsClientes} leads/clientes ativos já têm fornecedor identificado.`;
  document.getElementById("competitiva-hero-chips").innerHTML = `
    <div class="hero-chip"><b>${comCasa.length}</b>Com ${escapeHtml(nomeEmpresaAtual)}</div>
    <div class="hero-chip"><b>${comConcorrente.length}</b>Com concorrente</div>
    <div class="hero-chip"><b>${semInfo.length}</b>Sem info</div>
  `;

  const porConcorrente = {};
  comConcorrente.forEach(x => {
    const nome = x.cat.fornecedorAtual.trim();
    porConcorrente[nome] = (porConcorrente[nome] || 0) + (Number(x.cat.volumeMensalEstimado) || 0);
  });
  const rankingConcorrentes = Object.entries(porConcorrente).sort((a, b) => b[1] - a[1]);
  const maxVolConcorrente = Math.max(1, ...rankingConcorrentes.map(([, v]) => v));
  document.getElementById("ranking-concorrentes-list").innerHTML = rankingConcorrentes.length
    ? rankingConcorrentes.map(([nome, vol], i) => `
        <div class="rank-row"><span class="rank-n">${i + 1}</span><span class="rank-name">${escapeHtml(nome)}</span>
          <div class="rank-track"><div class="rank-fill" style="width:${(vol / maxVolConcorrente) * 100}%"></div></div>
          <span class="rank-val">${formatVolume(vol)}t</span></div>`).join("")
    : `<div class="empty-state">Nenhum concorrente com volume registrado ainda.</div>`;

  document.getElementById("carteira-fornecedor-tabela-body").innerHTML = linhasClassificadas.length
    ? linhasClassificadas.map(({ entidade, tipo, cat, classe }) => {
        const classificacao = classe === "casa" ? `<span class="badge badge-ok">${escapeHtml((state.config && state.config.nomeEmpresa) || "Empresa")}</span>`
          : classe === "concorrente" ? `<span class="badge badge-late">Concorrente</span>`
          : `<span class="badge badge-neutral">Sem informação</span>`;
        return `<tr data-client-id="${entidade.id}" style="cursor:pointer">
          <td>${escapeHtml(entidade.nome)}</td><td>${tipo}</td><td>${escapeHtml(categoriaRowLabel(cat))}</td><td>${escapeHtml(entidade.municipio || "-")}</td>
          <td>${escapeHtml(cat.fornecedorAtual)}</td><td>${classificacao}</td>
          <td>${escapeHtml(cat.volumeMensalEstimado || "-")}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="7">Nenhum lead ou cliente com fornecedor cadastrado ainda.</td></tr>`;
  document.querySelectorAll("#carteira-fornecedor-tabela-body tr[data-client-id]").forEach(tr => {
    tr.addEventListener("click", () => openFicha(tr.dataset.clientId));
  });
}

// ---------- Fornecedores (entidade própria — nunca vira cliente) ----------
function renderFornecedoresList() {
  const container = document.getElementById("fornecedores-list");
  container.innerHTML = state.fornecedores.length
    ? state.fornecedores.map(f => `
        <div class="card" data-fornecedor-id="${f.id}">
          <div class="card-top">
            <div><div class="card-name">${escapeHtml(f.nome)}</div>${f.obs ? `<div class="card-sub">${escapeHtml(f.obs)}</div>` : ""}</div>
            <span class="badge ${f.ehCasa ? "badge-ok" : "badge-late"}">${f.ehCasa ? escapeHtml((state.config && state.config.nomeEmpresa) || "Empresa") : "Concorrente"}</span>
          </div>
        </div>`).join("")
    : `<div class="empty-state">Nenhum fornecedor cadastrado ainda.</div>`;
  container.querySelectorAll(".card").forEach(card => card.addEventListener("click", () => openFornecedorModal(card.dataset.fornecedorId)));
}

function refreshFornecedoresDatalist() {
  const list = document.getElementById("fornecedores-datalist");
  if (list) list.innerHTML = state.fornecedores.map(f => `<option value="${escapeHtml(f.nome)}">`).join("");
}

function openFornecedorModal(fornecedorId) {
  document.getElementById("form-fornecedor").reset();
  document.getElementById("fornecedor-id").value = "";
  document.getElementById("modal-fornecedor-titulo").textContent = "Novo fornecedor";
  if (fornecedorId) {
    const f = state.fornecedores.find(x => x.id === fornecedorId);
    if (f) {
      document.getElementById("modal-fornecedor-titulo").textContent = "Editar fornecedor";
      document.getElementById("fornecedor-id").value = f.id;
      document.getElementById("fornecedor-nome").value = f.nome || "";
      document.getElementById("fornecedor-tipo").value = f.ehCasa ? "casa" : "concorrente";
      document.getElementById("fornecedor-obs").value = f.obs || "";
    }
  }
  document.getElementById("btn-excluir-fornecedor").classList.toggle("hidden", !fornecedorId);
  document.getElementById("modal-fornecedor").classList.remove("hidden");
}
document.getElementById("qa-novo-fornecedor").addEventListener("click", () => openFornecedorModal());
document.getElementById("btn-excluir-fornecedor").addEventListener("click", () => {
  const fornecedorId = document.getElementById("fornecedor-id").value;
  if (!fornecedorId) return;
  if (!confirm("Excluir este fornecedor?")) return;
  state.fornecedores = state.fornecedores.filter(f => f.id !== fornecedorId);
  saveState();
  closeModal("modal-fornecedor");
  renderFornecedoresList();
  refreshFornecedoresDatalist();
  showToast("Fornecedor excluído.");
});
document.getElementById("form-fornecedor").addEventListener("submit", e => {
  e.preventDefault();
  const id = document.getElementById("fornecedor-id").value || uid();
  const data = {
    id, nome: document.getElementById("fornecedor-nome").value.trim(),
    ehCasa: document.getElementById("fornecedor-tipo").value === "casa", obs: document.getElementById("fornecedor-obs").value.trim()
  };
  const idx = state.fornecedores.findIndex(f => f.id === id);
  if (idx >= 0) state.fornecedores[idx] = data; else state.fornecedores.push(data);
  saveState();
  closeModal("modal-fornecedor");
  renderFornecedoresList();
  refreshFornecedoresDatalist();
  showToast("Fornecedor salvo.");
});

function applyMasonry(container) {
  if (!container) return;
  const rowH = 8, gap = 16;
  Array.from(container.children).forEach(child => {
    const h = child.getBoundingClientRect().height;
    const span = Math.max(1, Math.ceil((h + gap) / (rowH + gap)));
    child.style.gridRowEnd = `span ${span}`;
  });
}
let masonryResizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(masonryResizeTimer);
  masonryResizeTimer = setTimeout(() => applyMasonry(document.getElementById("competitiva-masonry")), 150);
});

function renderCompetitivaPage() {
  refreshFornecedoresDatalist();
  renderCarteiraFornecedor();
  const rows = state.competitivas.map(o => {
    const cli = getEntidadeById(o.clientId);
    return { ...o, regiao: cli ? (cli.municipio || cli.regiao || "-") : "-" };
  }).sort((a, b) => new Date(b.data) - new Date(a.data));

  document.getElementById("competitiva-tabela-body").innerHTML = rows.length
    ? rows.map(o => `<tr><td>${escapeHtml(o.concorrente || "-")}</td><td>${escapeHtml(o.produtoConcorrente || "-")}</td><td>${escapeHtml(o.preco || "-")}</td><td>${escapeHtml(o.canalVenda || "-")}</td><td>${escapeHtml(o.prazoPagamento || "-")}</td><td>${escapeHtml(o.frete || "-")}</td><td>${escapeHtml(o.bonificacoes || "-")}</td><td>${escapeHtml(o.regiao)}</td></tr>`).join("")
    : `<tr><td colspan="8">Nenhuma observação registrada ainda. Adicione pela ficha do cliente, aba "Intel. Competitiva".</td></tr>`;

  renderRadar();

  const municipioCounts = {};
  state.competitivas.forEach(o => {
    const cli = getEntidadeById(o.clientId);
    if (!cli || !cli.municipio) return;
    municipioCounts[cli.municipio] = municipioCounts[cli.municipio] || new Set();
    if (o.concorrente) municipioCounts[cli.municipio].add(o.concorrente);
  });
  const entries = Object.entries(municipioCounts);
  const maxCount = Math.max(...entries.map(([, s]) => s.size), 1);
  document.getElementById("heatmap-grid").innerHTML = entries.length
    ? entries.map(([mun, set]) => {
        const intensity = set.size / maxCount;
        const bg = `rgba(147,160,106,${0.25 + intensity * 0.65})`;
        return `<div class="heatmap-cell" style="background:${bg}; color:${intensity > 0.5 ? "#fff" : "#1a1a1a"}"><div class="hm-n">${set.size}</div>${escapeHtml(mun)}</div>`;
      }).join("")
    : `<div class="empty-state">Cadastre município nos clientes para ver o mapa.</div>`;

  const pontosFracos = state.competitivas.filter(o => o.pontoFraco).sort((a, b) => new Date(b.data) - new Date(a.data));
  document.getElementById("pontos-fracos-list").innerHTML = pontosFracos.length
    ? pontosFracos.map(o => {
        const cli = getEntidadeById(o.clientId);
        return `<div class="card" data-client-id="${o.clientId}"><div class="card-top"><div class="card-name">${escapeHtml(o.concorrente || "Concorrente")}</div><span class="card-sub">${formatDate(o.data)}</span></div><div class="card-tip">${escapeHtml(o.pontoFraco)} ${cli ? "— relatado por " + escapeHtml(cli.nome) : ""}</div></div>`;
      }).join("")
    : `<div class="empty-state">Nenhum ponto fraco relatado ainda.</div>`;
  document.querySelectorAll("#pontos-fracos-list .card").forEach(el => el.addEventListener("click", () => openFicha(el.dataset.clientId)));

  const pontosFortes = state.competitivas.filter(o => o.pontoForte).sort((a, b) => new Date(b.data) - new Date(a.data));
  document.getElementById("pontos-fortes-list").innerHTML = pontosFortes.length
    ? pontosFortes.map(o => {
        const cli = getEntidadeById(o.clientId);
        return `<div class="card" data-client-id="${o.clientId}"><div class="card-top"><div class="card-name">${escapeHtml(o.concorrente || "Concorrente")}</div><span class="card-sub">${formatDate(o.data)}</span></div><div class="card-tip">${escapeHtml(o.pontoForte)} ${cli ? "— relatado por " + escapeHtml(cli.nome) : ""}</div></div>`;
      }).join("")
    : `<div class="empty-state">Nenhum ponto forte relatado ainda.</div>`;
  document.querySelectorAll("#pontos-fortes-list .card").forEach(el => el.addEventListener("click", () => openFicha(el.dataset.clientId)));

  applyMasonry(document.getElementById("competitiva-masonry"));
}

const RADAR_AXES = ["Preço", "Prazo", "Suporte técnico", "Qualidade", "Logística"];

function renderRadar() {
  const av = state.avaliacaoCompetitiva;
  const minha = av.minhaEmpresa || [4, 3, 5, 4, 3];
  const concorrente = av.concorrente || [3, 4, 3, 4, 4];
  const nomeConcorrente = av.nomeConcorrente || "Concorrente principal";

  const size = 280, center = size / 2, radius = 100, n = RADAR_AXES.length;
  const angle = i => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointsFor = (values) => values.map((v, i) => {
    const r = (v / 5) * radius;
    return `${center + r * Math.cos(angle(i))},${center + r * Math.sin(angle(i))}`;
  }).join(" ");

  const gridLevels = [1, 2, 3, 4, 5];
  const gridPolys = gridLevels.map(lvl => {
    const r = (lvl / 5) * radius;
    return `<polygon points="${RADAR_AXES.map((_, i) => `${center + r * Math.cos(angle(i))},${center + r * Math.sin(angle(i))}`).join(" ")}" fill="none" stroke="var(--border)" stroke-width="1"/>`;
  }).join("");

  const axisLines = RADAR_AXES.map((label, i) => {
    const x = center + radius * Math.cos(angle(i));
    const y = center + radius * Math.sin(angle(i));
    const lx = center + (radius + 22) * Math.cos(angle(i));
    const ly = center + (radius + 22) * Math.sin(angle(i));
    return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="var(--border)" stroke-width="1"/>
      <text x="${lx}" y="${ly}" font-size="10" fill="var(--text-muted)" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
  }).join("");

  document.getElementById("radar-chart").innerHTML = `
    <svg width="${size}" height="${size + 20}" viewBox="0 0 ${size} ${size + 20}">
      ${gridPolys}
      ${axisLines}
      <polygon points="${pointsFor(concorrente)}" fill="#a8441f22" stroke="#a8441f" stroke-width="2"/>
      <polygon points="${pointsFor(minha)}" fill="#5f703855" stroke="#5f7038" stroke-width="2"/>
    </svg>
    <div style="display:flex; gap:16px; justify-content:center; font-size:0.78rem; margin-top:6px;">
      <span><span style="display:inline-block;width:10px;height:10px;background:#5f7038;border-radius:2px;margin-right:5px;"></span>Minha empresa</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:#a8441f;border-radius:2px;margin-right:5px;"></span>${escapeHtml(nomeConcorrente)}</span>
    </div>
    <div class="actions-row" style="justify-content:center; margin-top:10px;"><button class="btn-secondary" id="btn-editar-radar">Editar avaliação (1-5)</button></div>
  `;
  document.getElementById("btn-editar-radar").addEventListener("click", () => {
    const nome = prompt("Nome do concorrente comparado:", nomeConcorrente) || nomeConcorrente;
    const novaMinha = RADAR_AXES.map((axis, i) => Number(prompt(`Minha empresa — ${axis} (1 a 5):`, minha[i])) || minha[i]);
    const novaConc = RADAR_AXES.map((axis, i) => Number(prompt(`${nome} — ${axis} (1 a 5):`, concorrente[i])) || concorrente[i]);
    state.avaliacaoCompetitiva = { minhaEmpresa: novaMinha, concorrente: novaConc, nomeConcorrente: nome };
    saveState();
    renderRadar();
  });
}

// ============================================================
// RELATÓRIO DE VISITA TÉCNICA
// ============================================================
const VISITA_OBJETIVOS = ["Primeira visita", "Visita técnica", "Entrega de proposta", "Acompanhamento pós-venda", "Resolução de problema", "Apresentação de produto", "Outro"];
const CONDICAO_BADGE_CLASS = { "Ótima": "badge-otima", "Boa": "badge-boa", "Regular": "badge-regular", "Crítica": "badge-critica" };

let currentVisitaFotos = [];
let currentVisitaFotosRecomendacoes = [];
let currentVisitaProdutos = [];
let visitaSelecionadaId = null;

function nextReportNumber() {
  const year = new Date().getFullYear();
  const countThisYear = state.visitas.filter(v => v.numero && v.numero.startsWith(`RVT-${year}-`)).length;
  return `RVT-${year}-${String(countThisYear + 1).padStart(3, "0")}`;
}

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function visitasForClient(clientId) {
  return state.visitas.filter(v => v.clientId === clientId).sort((a, b) => new Date(b.dataVisita) - new Date(a.dataVisita));
}

// ---------- Formulário ----------
function renderVisitaObjetivosCheckboxes(selected) {
  const container = document.getElementById("visita-objetivos-container");
  container.innerHTML = VISITA_OBJETIVOS.map(o => `
    <label><input type="checkbox" value="${o}" ${selected.includes(o) ? "checked" : ""}> ${o}</label>
  `).join("");
}

function renderVisitaFotosPreview() {
  const container = document.getElementById("visita-fotos-preview");
  container.innerHTML = currentVisitaFotos.map((f, i) => `
    <div class="visita-foto-thumb" data-idx="${i}">
      <img src="${f.dataUrl}" alt="Foto ${i + 1}">
      <button type="button" class="btn-remove-foto" title="Remover">&times;</button>
    </div>
  `).join("");
  container.querySelectorAll(".btn-remove-foto").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.closest(".visita-foto-thumb").dataset.idx);
      currentVisitaFotos.splice(idx, 1);
      renderVisitaFotosPreview();
    });
  });
}

document.getElementById("visita-fotos-input").addEventListener("change", async e => {
  const files = [...e.target.files].slice(0, 10 - currentVisitaFotos.length);
  for (const file of files) {
    try {
      const dataUrl = await compressImageFile(file);
      currentVisitaFotos.push({ dataUrl, legenda: "" });
    } catch { /* ignora arquivo que falhar ao processar */ }
  }
  renderVisitaFotosPreview();
  e.target.value = "";
  if (currentVisitaFotos.length >= 10) showToast("Limite de 10 fotos atingido.");
});

function renderVisitaFotosRecomendacoesPreview() {
  const container = document.getElementById("visita-fotos-recomendacoes-preview");
  container.innerHTML = currentVisitaFotosRecomendacoes.map((f, i) => `
    <div class="visita-foto-thumb-legenda" data-idx="${i}">
      <div class="foto-img-wrap">
        <img src="${f.dataUrl}" alt="Foto ${i + 1}">
        <button type="button" class="btn-remove-foto" title="Remover">&times;</button>
      </div>
      <input type="text" class="visita-foto-legenda" placeholder="Legenda (opcional)" value="${escapeHtml(f.legenda || "")}">
    </div>
  `).join("");
  container.querySelectorAll(".btn-remove-foto").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.closest(".visita-foto-thumb-legenda").dataset.idx);
      currentVisitaFotosRecomendacoes.splice(idx, 1);
      renderVisitaFotosRecomendacoesPreview();
    });
  });
  container.querySelectorAll(".visita-foto-legenda").forEach(input => {
    input.addEventListener("input", () => {
      const idx = Number(input.closest(".visita-foto-thumb-legenda").dataset.idx);
      currentVisitaFotosRecomendacoes[idx].legenda = input.value;
    });
  });
}
document.getElementById("visita-fotos-recomendacoes-input").addEventListener("change", async e => {
  const files = [...e.target.files].slice(0, 10 - currentVisitaFotosRecomendacoes.length);
  for (const file of files) {
    try {
      const dataUrl = await compressImageFile(file);
      currentVisitaFotosRecomendacoes.push({ dataUrl, legenda: "" });
    } catch { /* ignora arquivo que falhar ao processar */ }
  }
  renderVisitaFotosRecomendacoesPreview();
  e.target.value = "";
  if (currentVisitaFotosRecomendacoes.length >= 10) showToast("Limite de 10 fotos atingido.");
});

function renderVisitaProdutosRows() {
  const container = document.getElementById("visita-produtos-recomendados-list");
  container.innerHTML = currentVisitaProdutos.map((p, i) => `
    <div class="produto-recomendado-row" data-idx="${i}">
      <button type="button" class="btn-remove-produto" title="Remover">&times;</button>
      <label>Produto<input type="text" class="prod-nome" value="${escapeHtml(p.produto || "")}" placeholder="Ex: Tech Sal 80"></label>
      <label>Categoria<input type="text" class="prod-categoria" value="${escapeHtml(p.categoria || "")}" placeholder="Ex: Suplementação mineral"></label>
      <label>Dose recomendada<input type="text" class="prod-dose" value="${escapeHtml(p.dose || "")}" placeholder="Ex: 80g/cab/dia"></label>
      <label>Justificativa técnica<input type="text" class="prod-justificativa" value="${escapeHtml(p.justificativa || "")}"></label>
    </div>
  `).join("");
  container.querySelectorAll(".produto-recomendado-row").forEach(rowEl => {
    const idx = Number(rowEl.dataset.idx);
    rowEl.querySelector(".prod-nome").addEventListener("input", e => currentVisitaProdutos[idx].produto = e.target.value);
    rowEl.querySelector(".prod-categoria").addEventListener("input", e => currentVisitaProdutos[idx].categoria = e.target.value);
    rowEl.querySelector(".prod-dose").addEventListener("input", e => currentVisitaProdutos[idx].dose = e.target.value);
    rowEl.querySelector(".prod-justificativa").addEventListener("input", e => currentVisitaProdutos[idx].justificativa = e.target.value);
    rowEl.querySelector(".btn-remove-produto").addEventListener("click", () => {
      currentVisitaProdutos.splice(idx, 1);
      renderVisitaProdutosRows();
    });
  });
}
document.getElementById("btn-add-produto-recomendado").addEventListener("click", () => {
  currentVisitaProdutos.push({ produto: "", categoria: "", dose: "", justificativa: "" });
  renderVisitaProdutosRows();
});

document.getElementById("visita-cliente-busca").addEventListener("input", e => {
  const term = e.target.value.trim().toLowerCase();
  document.querySelectorAll("#visita-cliente option").forEach(opt => {
    opt.style.display = !term || opt.textContent.toLowerCase().includes(term) ? "" : "none";
  });
});

function atualizarVisitaClienteInfo() {
  const client = getEntidadeById(document.getElementById("visita-cliente").value);
  const box = document.getElementById("visita-cliente-info");
  if (!client) { box.classList.remove("visible"); renderVisitaEstoqueRows(); return; }
  box.innerHTML = `<strong>${escapeHtml(client.nome)}</strong>${client.fazenda ? " · " + escapeHtml(client.fazenda) : ""}${client.municipio ? " · " + escapeHtml(client.municipio) : ""}${client.nomeDecisor ? " · Decisor: " + escapeHtml(client.nomeDecisor) : ""}`;
  box.classList.add("visible");
  renderVisitaEstoqueRows();
}
document.getElementById("visita-cliente").addEventListener("change", atualizarVisitaClienteInfo);

function renderVisitaEstoqueRows() {
  const container = document.getElementById("visita-estoque-categorias-list");
  if (!container) return;
  const entidade = getEntidadeById(document.getElementById("visita-cliente").value);
  const categorias = entidade ? (entidade.categoriasAnimais || []) : [];
  container.innerHTML = categorias.length
    ? categorias.map(cat => `
      <div class="categoria-card" data-categoria-id="${cat.id}">
        <div style="font-size:0.85rem; font-weight:600; margin-bottom:6px;">${escapeHtml(categoriaRowLabel(cat))}${cat.produtoAtual ? " — " + escapeHtml(cat.produtoAtual) : ""}</div>
        <div class="categoria-animal-row">
          <input type="number" class="visita-estoque-qtd-animais" min="0" placeholder="Quantidade de animais" value="${escapeHtml(cat.quantidade || "")}">
          <input type="number" class="visita-estoque-quantidade" min="0" step="any" placeholder="Estoque atual (toneladas)">
        </div>
      </div>`).join("")
    : `<p class="hint">Nenhuma categoria animal cadastrada ainda — cadastre no Perfil Produtivo antes da visita.</p>`;
}

function openVisitaModal(clientId, duplicarDeVisitaId) {
  const form = document.getElementById("form-visita");
  form.reset();
  document.getElementById("visita-id").value = "";
  document.getElementById("modal-visita-titulo").textContent = "Relatório de Visita Técnica";
  document.getElementById("visita-cliente-busca").value = "";
  document.querySelectorAll("#visita-cliente option").forEach(opt => opt.style.display = "");
  currentVisitaFotos = [];
  currentVisitaFotosRecomendacoes = [];
  currentVisitaProdutos = [];
  document.getElementById("visita-data").value = todayStr();
  document.getElementById("visita-responsavel").value = nomeUsuarioPadrao();
  document.getElementById("visita-satisfacao-cliente").value = "— Não avaliado —";
  renderVisitaObjetivosCheckboxes([]);

  const duplicar = duplicarDeVisitaId ? state.visitas.find(v => v.id === duplicarDeVisitaId) : null;
  if (duplicar) {
    document.getElementById("modal-visita-titulo").textContent = "Nova visita (baseada em " + duplicar.numero + ")";
    document.getElementById("visita-cliente").value = duplicar.clientId;
    document.getElementById("visita-responsavel").value = duplicar.responsavelVisita || nomeUsuarioPadrao();
    document.getElementById("visita-participantes").value = duplicar.participantes || "";
    renderVisitaObjetivosCheckboxes(duplicar.objetivos || []);
    document.getElementById("visita-objetivo-detalhe").value = duplicar.objetivoDetalhe || "";
    document.getElementById("visita-situacao-atual").value = duplicar.situacaoAtual || "";
    document.getElementById("visita-problemas").value = duplicar.problemasIdentificados || "";
    document.getElementById("visita-produtos-atuais").value = duplicar.produtosAtuaisTexto || "";
    document.getElementById("visita-condicao-geral").value = duplicar.condicaoGeral || "Boa";
    document.getElementById("visita-recomendacoes").value = duplicar.recomendacoes || "";
    currentVisitaProdutos = (duplicar.produtosRecomendados || []).map(p => ({ ...p }));
    currentVisitaFotosRecomendacoes = (duplicar.fotosRecomendacoes || []).map(f => ({ ...f }));
    document.getElementById("visita-protocolo").value = duplicar.protocoloSugerido || "";
    document.getElementById("visita-resultados-esperados").value = duplicar.resultadosEsperados || "";
    document.getElementById("visita-proxima-acao").value = duplicar.proximaAcao || "Enviar proposta";
  } else if (clientId) {
    document.getElementById("visita-cliente").value = clientId;
  }
  atualizarVisitaClienteInfo();
  renderVisitaFotosPreview();
  renderVisitaFotosRecomendacoesPreview();
  renderVisitaProdutosRows();
  document.getElementById("modal-visita").classList.remove("hidden");
}

document.getElementById("form-visita").addEventListener("submit", e => {
  e.preventDefault();
  const clientId = document.getElementById("visita-cliente").value;
  if (!clientId) { showToast("Selecione um cliente/lead."); return; }
  const entidadeVisita = getEntidadeById(clientId);
  const estoqueCards = [...document.querySelectorAll("#visita-estoque-categorias-list .categoria-card")];
  const cardEstoqueFaltando = estoqueCards.find(card => !card.querySelector(".visita-estoque-quantidade").value || !card.querySelector(".visita-estoque-qtd-animais").value);
  if (cardEstoqueFaltando) {
    showToast("Informe a quantidade de animais e o estoque atual de todas as categorias animais antes de salvar a visita.");
    document.getElementById("visita-section-situacao").open = true;
    return;
  }
  const objetivos = [...document.querySelectorAll("#visita-objetivos-container input:checked")].map(i => i.value);
  const id = document.getElementById("visita-id").value || uid();
  const idx = state.visitas.findIndex(v => v.id === id);
  const numero = idx >= 0 ? state.visitas[idx].numero : nextReportNumber();

  const visita = {
    id, numero, clientId,
    dataVisita: document.getElementById("visita-data").value,
    horaInicio: document.getElementById("visita-hora-inicio").value,
    horaFim: document.getElementById("visita-hora-fim").value,
    responsavelVisita: document.getElementById("visita-responsavel").value.trim(),
    participantes: document.getElementById("visita-participantes").value.trim(),
    objetivos, objetivoDetalhe: document.getElementById("visita-objetivo-detalhe").value.trim(),
    situacaoAtual: document.getElementById("visita-situacao-atual").value.trim(),
    problemasIdentificados: document.getElementById("visita-problemas").value.trim(),
    produtosAtuaisTexto: document.getElementById("visita-produtos-atuais").value.trim(),
    condicaoGeral: document.getElementById("visita-condicao-geral").value,
    fotos: currentVisitaFotos.slice(),
    recomendacoes: document.getElementById("visita-recomendacoes").value.trim(),
    produtosRecomendados: currentVisitaProdutos.filter(p => p.produto),
    fotosRecomendacoes: currentVisitaFotosRecomendacoes.slice(),
    protocoloSugerido: document.getElementById("visita-protocolo").value.trim(),
    resultadosEsperados: document.getElementById("visita-resultados-esperados").value.trim(),
    compromissos: document.getElementById("visita-compromissos").value.trim(),
    proximaAcao: document.getElementById("visita-proxima-acao").value,
    dataProximoContato: document.getElementById("visita-data-proximo-contato").value,
    obsFinais: document.getElementById("visita-obs-finais").value.trim(),
    percepcaoVendedor: document.getElementById("visita-percepcao-vendedor").value.trim(),
    temperaturaLead: document.getElementById("visita-temperatura-lead").value,
    satisfacaoCliente: document.getElementById("visita-satisfacao-cliente").value,
    objecoesInternas: document.getElementById("visita-objecoes-internas").value.trim(),
    criadoEm: idx >= 0 ? state.visitas[idx].criadoEm : todayStr()
  };

  if (idx >= 0) state.visitas[idx] = visita; else state.visitas.push(visita);

  if (entidadeVisita) {
    estoqueCards.forEach(card => {
      const categoriaId = card.dataset.categoriaId;
      const categoria = (entidadeVisita.categoriasAnimais || []).find(c => c.id === categoriaId);
      const qtdAnimais = card.querySelector(".visita-estoque-qtd-animais").value;
      const qtdEstoque = card.querySelector(".visita-estoque-quantidade").value;
      if (categoria && qtdAnimais !== "") {
        categoria.quantidade = qtdAnimais;
        // Rebanho mudou na visita → "Volume mensal estimado" (calculado, nunca digitado) precisa
        // ser recalculado agora, senão a previsão de estoque fica presa na quantidade antiga.
        categoria.volumeMensalEstimado = calcVolumeMensalEstimado(categoria.quantidade, categoria.consumoPorAnimalDia);
      }
      state.estoques.push({
        id: uid(), clientId, categoriaAnimalId: categoriaId,
        data: visita.dataVisita, quantidadeEstoque: Number(qtdEstoque) || 0,
        origem: "visita", obs: ""
      });
    });
  }

  const novaEtapa = document.getElementById("visita-atualizar-etapa").value;
  if (novaEtapa && isLeadId(clientId)) {
    const lead = state.leads.find(c => c.id === clientId);
    if (lead) {
      if (LEAD_FUNIL_STAGES.includes(novaEtapa)) {
        if (lead.etapaFunil !== novaEtapa) {
          lead.etapaFunil = novaEtapa;
          lead.historicoEtapas = lead.historicoEtapas || [];
          lead.historicoEtapas.push({ etapa: novaEtapa, data: todayStr() });
        }
      } else if (novaEtapa === "Cliente ativo") {
        converterLeadEmCliente(clientId);
      } else {
        lead.status = novaEtapa;
      }
    }
  }

  saveState();
  closeModal("modal-visita");
  showToast(`Relatório ${visita.numero} salvo.`);
  if (currentFichaClientId === clientId) renderFichaTab();
  renderDashboard();
  refreshClientSelects(); renderClientList(); renderLeadsList();

  if (confirm("Relatório salvo. Deseja gerar o PDF agora?")) {
    visitaSelecionadaId = visita.id;
    switchMainTab("relatorios");
    document.querySelectorAll(".report-switch-btn").forEach(b => b.classList.toggle("active", b.dataset.report === "visitas"));
    document.getElementById("report-cliente").classList.remove("active");
    document.getElementById("report-mensal").classList.remove("active");
    document.getElementById("report-visitas").classList.add("active");
    currentReportView = "visitas";
    initVisitasReportTab();
    setTimeout(() => abrirPreviewImpressao("visita-documento-conteudo", { outroContainerId: "visitas-gerencial-conteudo" }), 200);
  }
});

// ---------- Documento (PDF) ----------
function renderVisitaDocumento(visita) {
  if (!visita) return `<div class="empty-state">Selecione um relatório na tabela acima.</div>`;
  const client = getEntidadeById(visita.clientId) || {};
  const problemasLi = (visita.problemasIdentificados || "").split("\n").filter(Boolean).map(l => `<li>${escapeHtml(l)}</li>`).join("");
  const compromissosLi = (visita.compromissos || "").split("\n").filter(Boolean).map(l => `<li>${escapeHtml(l)}</li>`).join("");
  const fotosHtml = visita.fotos && visita.fotos.length
    ? `<div class="visita-doc-fotos">${visita.fotos.map((f, i) => `<div class="visita-doc-foto"><img src="${f.dataUrl}"><div class="cap">Foto ${i + 1}</div></div>`).join("")}</div>`
    : `<p class="hint">Nenhuma foto registrada.</p>`;
  const fotosRecomendacoesHtml = visita.fotosRecomendacoes && visita.fotosRecomendacoes.length
    ? `<div class="visita-doc-fotos">${visita.fotosRecomendacoes.map((f, i) => `<div class="visita-doc-foto"><img src="${f.dataUrl}"><div class="cap">${escapeHtml(f.legenda) || "Foto " + (i + 1)}</div></div>`).join("")}</div>`
    : "";
  const produtosHtml = (visita.produtosRecomendados || []).length
    ? visita.produtosRecomendados.map(p => `
        <div class="visita-doc-produto-card">
          <div class="nome">${escapeHtml(p.produto)}</div>
          <div class="meta-line">${escapeHtml(p.categoria || "-")} ${p.dose ? "· Dose: " + escapeHtml(p.dose) : ""}</div>
          ${p.justificativa ? `<div class="justificativa">${escapeHtml(p.justificativa)}</div>` : ""}
        </div>`).join("")
    : `<p class="hint">Nenhum produto específico recomendado nesta visita.</p>`;

  const identificacaoHtml = `<div class="detalhe-grid">
    ${field("Cliente", client.nome)}${field("Fazenda", client.fazenda)}${field("Município", client.municipio)}${reportField("Decisor visitado", client.nomeDecisor)}
    ${reportField("Horário", [visita.horaInicio, visita.horaFim].filter(Boolean).join(" às "))}${field("Responsável técnico", visita.responsavelVisita)}${reportField("Participantes", visita.participantes)}
  </div>`;

  const objetivoHtml = `
    <p>${escapeHtml((visita.objetivos || []).join(", ") || "-")}</p>
    ${visita.objetivoDetalhe ? `<p>${escapeHtml(visita.objetivoDetalhe)}</p>` : ""}`;

  const situacaoHtml = `
    <span class="visita-doc-badge ${CONDICAO_BADGE_CLASS[visita.condicaoGeral] || "badge-boa"}">${escapeHtml(visita.condicaoGeral || "-")}</span>
    <h4>Situação atual</h4>
    <p>${escapeHtml(visita.situacaoAtual) || "-"}</p>
    <h4>Problemas identificados</h4>
    ${problemasLi ? `<ul>${problemasLi}</ul>` : `<p>-</p>`}
    <h4>Produtos em uso</h4>
    <p>${escapeHtml(visita.produtosAtuaisTexto) || "-"}</p>
    ${fotosHtml}`;

  const recomendacoesHtml = `
    <p>${escapeHtml(visita.recomendacoes) || "-"}</p>
    ${produtosHtml}
    ${visita.protocoloSugerido ? `<div class="visita-doc-dashed"><strong>Protocolo sugerido:</strong> ${escapeHtml(visita.protocoloSugerido)}</div>` : ""}
    ${visita.resultadosEsperados ? `<h4>Resultados esperados</h4><p>${escapeHtml(visita.resultadosEsperados)}</p>` : ""}
    ${fotosRecomendacoesHtml}`;

  const proximosPassosHtml = `
    ${compromissosLi ? `<ol>${compromissosLi}</ol>` : `<p>-</p>`}
    <div class="visita-doc-proxima-acao">
      <strong>${escapeHtml(visita.proximaAcao || "-")}</strong>${visita.dataProximoContato ? " — " + formatDate(visita.dataProximoContato) : ""}
    </div>
    ${visita.obsFinais ? `<p style="margin-top:10px;">${escapeHtml(visita.obsFinais)}</p>` : ""}`;

  const metaLinha = `${escapeHtml(visita.numero)} · ${formatDate(visita.dataVisita)}`;
  return `
    ${reportCapaHtml({ eyebrow: "Relatório de Visita Técnica", titulo: client.nome, subtitulo: reportLocalLinha(client), metaLinha, topicos: ["Objetivo", "Situação encontrada", "Recomendações", "Próximos passos"] })}
    <div class="report-content-scope">
      ${reportRunningHeadHtml(`${client.nome}${client.fazenda ? " · " + client.fazenda : ""}`, metaLinha)}
      <div class="report-doc">
        ${reportDocHead(`${escapeHtml(client.nome)}${client.fazenda ? " · " + escapeHtml(client.fazenda) : ""}`, metaLinha)}
        <div class="report-sections">
          ${reportSectionHtml(ICONS.folder, "Identificação", identificacaoHtml, 0)}
          ${reportSectionHtml(ICONS.target, "Objetivo da visita", objetivoHtml, 1)}
          ${reportSectionHtml(ICONS.alertTriangle, "Situação encontrada", situacaoHtml, 2)}
          ${reportSectionHtml(ICONS.leaf, "Recomendações técnicas", recomendacoesHtml, 3)}
          ${reportSectionHtml(ICONS.clipboard, "Próximos passos", proximosPassosHtml, 4)}
        </div>
      </div>
      ${reportRunningFootHtml()}
    </div>
    ${reportEncerramentoHtml(reportGreetingName(client))}`;
}

// ---------- Lista / busca (tela Relatórios) ----------
function initVisitasReportTab() {
  const selectObjetivo = document.getElementById("visitas-filtro-objetivo");
  if (!selectObjetivo.dataset.filled) {
    selectObjetivo.innerHTML += VISITA_OBJETIVOS.map(o => `<option value="${o}">${o}</option>`).join("");
    selectObjetivo.dataset.filled = "1";
  }
  renderVisitasTabela();
  const mesInput = document.getElementById("visitas-gerencial-mes");
  if (!mesInput.value) mesInput.value = todayStr().slice(0, 7);
  renderVisitasGerencial(mesInput.value);
  if (visitaSelecionadaId) {
    const visita = state.visitas.find(v => v.id === visitaSelecionadaId);
    document.getElementById("visita-documento-conteudo").innerHTML = renderVisitaDocumento(visita);
  }
}

function renderVisitasTabela() {
  const busca = document.getElementById("visitas-busca").value.trim().toLowerCase();
  const dataFiltro = document.getElementById("visitas-filtro-data").value;
  const objFiltro = document.getElementById("visitas-filtro-objetivo").value;

  const rows = state.visitas
    .map(v => ({ v, client: getEntidadeById(v.clientId) }))
    .filter(({ v, client }) => {
      if (busca && !(client && client.nome.toLowerCase().includes(busca))) return false;
      if (dataFiltro && v.dataVisita !== dataFiltro) return false;
      if (objFiltro && !(v.objetivos || []).includes(objFiltro)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.v.dataVisita) - new Date(a.v.dataVisita));

  document.getElementById("visitas-tabela-body").innerHTML = rows.length
    ? rows.map(({ v, client }) => `
        <tr data-visita-id="${v.id}" style="cursor:pointer">
          <td>${escapeHtml(v.numero)}</td><td>${escapeHtml(client ? client.nome : "-")}</td>
          <td>${formatDate(v.dataVisita)}</td><td>${escapeHtml((v.objetivos || [])[0] || "-")}</td>
          <td><span class="badge ${v.condicaoGeral === "Crítica" ? "badge-late" : v.condicaoGeral === "Regular" ? "badge-warn" : "badge-ok"}">${escapeHtml(v.condicaoGeral || "-")}</span></td>
          <td><button type="button" class="btn-secondary btn-duplicar-visita" data-visita-id="${v.id}">Duplicar</button></td>
        </tr>`).join("")
    : `<tr><td colspan="6">Nenhum relatório de visita encontrado.</td></tr>`;

  document.querySelectorAll("#visitas-tabela-body tr[data-visita-id]").forEach(tr => {
    tr.addEventListener("click", e => {
      if (e.target.closest(".btn-duplicar-visita")) return;
      visitaSelecionadaId = tr.dataset.visitaId;
      document.getElementById("visita-documento-conteudo").innerHTML = renderVisitaDocumento(state.visitas.find(v => v.id === visitaSelecionadaId));
    });
  });
  document.querySelectorAll(".btn-duplicar-visita").forEach(btn => {
    btn.addEventListener("click", () => openVisitaModal(null, btn.dataset.visitaId));
  });
}
["visitas-busca", "visitas-filtro-data", "visitas-filtro-objetivo"].forEach(id => document.getElementById(id).addEventListener("input", renderVisitasTabela));
document.getElementById("btn-imprimir-visita").addEventListener("click", () => {
  abrirPreviewImpressao("visita-documento-conteudo", { outroContainerId: "visitas-gerencial-conteudo" });
});

// Junta-se ao mesmo sistema de capa/cabeçalho-rodapé/encerramento dos demais relatórios —
// antes era só um painel .no-print sem nenhuma marca, sem botão de imprimir próprio e sem
// como sair como PDF de verdade.
function renderVisitasGerencial(yyyyMM) {
  const container = document.getElementById("visitas-gerencial-conteudo");
  if (!yyyyMM) { container.innerHTML = `<div class="empty-state">Selecione um mês.</div>`; return; }
  const inMonth = v => v.dataVisita && v.dataVisita.slice(0, 7) === yyyyMM;
  const visitasMes = state.visitas.filter(inMonth);
  const criticas = visitasMes.filter(v => v.condicaoGeral === "Crítica").length;
  const [y, m] = yyyyMM.split("-");
  const mesLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const tiles = [
    { icon: ICONS.truck, label: "Visitas no período", value: visitasMes.length },
    { icon: ICONS.target, label: "Meta do mês", value: state.metaVisitasMes || 0 },
    { icon: ICONS.alertTriangle, label: "Condições críticas", value: criticas },
    { icon: ICONS.users, label: "Clientes distintos visitados", value: new Set(visitasMes.map(v => v.clientId)).size }
  ];

  const porMunicipio = {};
  visitasMes.forEach(v => {
    const client = getEntidadeById(v.clientId);
    if (!client || !client.municipio) return;
    porMunicipio[client.municipio] = (porMunicipio[client.municipio] || 0) + 1;
  });
  const entries = Object.entries(porMunicipio);
  const maxCount = Math.max(...entries.map(([, n]) => n), 1);
  const heatmapHtml = entries.length
    ? `<div class="heatmap-grid">${entries.map(([mun, n]) => {
        const intensity = n / maxCount;
        return `<div class="heatmap-cell" style="background: rgba(147,160,106,${0.25 + intensity * 0.65}); color:${intensity > 0.5 ? "#fff" : "#1a1a1a"}"><div class="hm-n">${n}</div>${escapeHtml(mun)}</div>`;
      }).join("")}</div>`
    : `<p class="hint">Nenhuma visita registrada no período — sem cidade suficiente pra desenhar o mapa de calor ainda.</p>`;

  const metaLinha = `Relatório gerado em ${formatDate(todayStr())}`;
  container.innerHTML = `
    ${reportCapaHtml({ eyebrow: "Relatório Interno", titulo: "Visitas Técnicas", subtitulo: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1), metaLinha, topicos: ["Visitas no período", "Por município"], interno: true })}
    <div class="report-content-scope">
      ${reportRunningHeadHtml("Visitas Técnicas — Gerencial", metaLinha)}
      <div class="report-doc">
        ${reportDocHead("Gerencial de visitas técnicas", mesLabel)}
        ${reportStatTilesHtml(tiles)}
        <div class="report-sections">
          ${reportSectionHtml(ICONS.mapPin, "Visitas por município", heatmapHtml, 0)}
        </div>
      </div>
      ${reportRunningFootHtml()}
    </div>
    ${reportEncerramentoHtml(null)}`;
}
document.getElementById("visitas-gerencial-mes").addEventListener("change", e => renderVisitasGerencial(e.target.value));
// Os dois documentos (visita individual e gerencial do período) convivem na mesma aba — sem
// isolar um do outro na hora de imprimir, os dois vazavam juntos no PDF de qualquer um dos
// botões, já que window.print() imprime tudo que está visível na página.
document.getElementById("btn-imprimir-visitas-gerencial").addEventListener("click", () => {
  abrirPreviewImpressao("visitas-gerencial-conteudo", { outroContainerId: "visita-documento-conteudo" });
});
window.addEventListener("afterprint", () => {
  document.getElementById("visita-documento-conteudo").classList.remove("hidden-for-print");
  document.getElementById("visitas-gerencial-conteudo").classList.remove("hidden-for-print");
  fecharPreviewImpressao();
});

// ---------- Widget do Dashboard ----------
function renderVisitasWidget() {
  const mes = todayStr().slice(0, 7);
  const count = state.visitas.filter(v => v.dataVisita && v.dataVisita.slice(0, 7) === mes).length;
  const meta = state.metaVisitasMes || 0;
  const pct = meta > 0 ? Math.min(Math.round((count / meta) * 100), 100) : 0;
  document.getElementById("visitas-widget-body").innerHTML = `
    <div class="kpi-value">${count}<span style="font-size:1rem; color:var(--text-muted);"> / ${meta}</span></div>
    <div class="kpi-label" style="margin-bottom:8px;">Visitas realizadas vs. meta do mês</div>
    <div class="rank-track"><div class="rank-fill" style="width:${pct}%; background:${pct >= 100 ? "var(--ok-text)" : "var(--chart-1)"}"></div></div>
  `;
}

// ---------- Ficha do cliente: aba Visitas ----------
function renderVisitasFichaTab(client, { showRegistrarButton = true } = {}) {
  const visitas = visitasForClient(client.id);
  const cards = visitas.map(v => `
    <div class="card" data-visita-id="${v.id}">
      <div class="card-top">
        <div><div class="card-name">${escapeHtml(v.numero)} — ${formatDate(v.dataVisita)}</div><div class="card-sub">${escapeHtml((v.objetivos || [])[0] || "-")}</div></div>
        <span class="badge ${v.condicaoGeral === "Crítica" ? "badge-late" : v.condicaoGeral === "Regular" ? "badge-warn" : "badge-ok"}">${escapeHtml(v.condicaoGeral || "-")}</span>
      </div>
      <div class="actions-row">
        <button type="button" class="btn-secondary btn-ver-visita" data-visita-id="${v.id}">Ver / Imprimir</button>
        <button type="button" class="btn-secondary btn-duplicar-visita-ficha" data-visita-id="${v.id}">Duplicar</button>
      </div>
    </div>
  `).join("") || `<div class="empty-state">Nenhuma visita técnica registrada ainda.</div>`;

  return `
    ${showRegistrarButton ? `<div class="actions-row" style="margin-bottom:12px;"><button type="button" class="btn-primary" id="btn-nova-visita-ficha">+ Nova visita técnica</button></div>` : ""}
    <div class="cards">${cards}</div>
  `;
}

function attachVisitasFichaEvents(client) {
  const btnNova = document.getElementById("btn-nova-visita-ficha");
  if (btnNova) btnNova.addEventListener("click", () => { openVisitaModal(client.id); });
  document.querySelectorAll(".btn-ver-visita").forEach(btn => {
    btn.addEventListener("click", () => {
      visitaSelecionadaId = btn.dataset.visitaId;
      switchMainTab("relatorios");
      document.querySelectorAll(".report-switch-btn").forEach(b => b.classList.toggle("active", b.dataset.report === "visitas"));
      document.getElementById("report-cliente").classList.remove("active");
      document.getElementById("report-mensal").classList.remove("active");
      document.getElementById("report-visitas").classList.add("active");
      currentReportView = "visitas";
      initVisitasReportTab();
    });
  });
  document.querySelectorAll(".btn-duplicar-visita-ficha").forEach(btn => {
    btn.addEventListener("click", () => { openVisitaModal(null, btn.dataset.visitaId); });
  });
}

// ============================================================
// RELATÓRIOS
// ============================================================
function stripActionsRow(html) { return html.replace(/<div class="actions-row"[^>]*>[\s\S]*?<\/div>/g, ""); }

let currentReportView = "cliente";
document.querySelectorAll(".report-switch-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".report-switch-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentReportView = btn.dataset.report;
    document.getElementById("report-cliente").classList.toggle("active", currentReportView === "cliente");
    document.getElementById("report-cliente-periodo").classList.toggle("active", currentReportView === "cliente-periodo");
    document.getElementById("report-mensal").classList.toggle("active", currentReportView === "mensal");
    document.getElementById("report-visitas").classList.toggle("active", currentReportView === "visitas");
    document.getElementById("report-funil").classList.toggle("active", currentReportView === "funil");
    if (currentReportView === "visitas") initVisitasReportTab();
    if (currentReportView === "funil") renderRelatorioFunil();
    if (currentReportView === "cliente-periodo") {
      const sel = document.getElementById("relatorio-cliente-periodo-select");
      const mesInput = document.getElementById("relatorio-cliente-periodo-mes");
      if (!mesInput.value) mesInput.value = todayStr().slice(0, 7);
      if (sel.value) renderRelatorioClientePeriodo(sel.value, mesInput.value);
      else if (state.clientesAtivos.length) renderRelatorioClientePeriodo(state.clientesAtivos[0].id, mesInput.value);
    }
  });
});
// ---------- Preview de impressão ----------
// Clona o HTML já renderizado do container do relatório pra dentro do modal de preview, em vez
// de chamar window.print() direto — assim dá pra conferir capa/cabeçalho/rodapé/encerramento
// (que só aparecem em @media print) antes de abrir a caixa de impressão de verdade.
let previewImpressaoOutroContainerId = null;
function abrirPreviewImpressao(containerId, opcoes) {
  opcoes = opcoes || {};
  const origem = document.getElementById(containerId);
  if (!origem) return;
  previewImpressaoOutroContainerId = opcoes.outroContainerId || null;
  document.getElementById("print-preview-content").innerHTML = origem.innerHTML;
  const modal = document.getElementById("modal-print-preview");
  modal.classList.remove("hidden");
  modal.classList.add("print-preview-mode");
}
function fecharPreviewImpressao() {
  const modal = document.getElementById("modal-print-preview");
  modal.classList.add("hidden");
  modal.classList.remove("print-preview-mode");
  document.getElementById("print-preview-content").innerHTML = "";
}
document.getElementById("btn-print-preview-fechar").addEventListener("click", fecharPreviewImpressao);
document.getElementById("btn-print-preview-imprimir").addEventListener("click", () => {
  if (previewImpressaoOutroContainerId) {
    const outro = document.getElementById(previewImpressaoOutroContainerId);
    if (outro) outro.classList.add("hidden-for-print");
  }
  window.print();
});

document.getElementById("btn-imprimir-relatorio-funil").addEventListener("click", () => abrirPreviewImpressao("relatorio-funil-conteudo"));

function initRelatoriosTab() {
  refreshClientSelects();
  const clienteSelect = document.getElementById("relatorio-cliente-select");
  if (clienteSelect.value) renderRelatorioCliente(clienteSelect.value);
  else if (state.clientesAtivos.length) renderRelatorioCliente(state.clientesAtivos[0].id);
  const mesInput = document.getElementById("relatorio-mes-select");
  if (!mesInput.value) mesInput.value = todayStr().slice(0, 7);
  renderRelatorioMensal(mesInput.value);
}
document.getElementById("relatorio-cliente-select").addEventListener("change", e => renderRelatorioCliente(e.target.value));
document.getElementById("relatorio-mes-select").addEventListener("change", e => renderRelatorioMensal(e.target.value));
document.getElementById("btn-imprimir-relatorio-cliente").addEventListener("click", () => abrirPreviewImpressao("relatorio-cliente-conteudo"));
document.getElementById("btn-imprimir-relatorio-mensal").addEventListener("click", () => abrirPreviewImpressao("relatorio-mensal-conteudo"));
document.getElementById("relatorio-cliente-periodo-select").addEventListener("change", e => renderRelatorioClientePeriodo(e.target.value, document.getElementById("relatorio-cliente-periodo-mes").value));
document.getElementById("relatorio-cliente-periodo-mes").addEventListener("change", e => renderRelatorioClientePeriodo(document.getElementById("relatorio-cliente-periodo-select").value, e.target.value));
document.getElementById("btn-imprimir-relatorio-cliente-periodo").addEventListener("click", () => abrirPreviewImpressao("relatorio-cliente-periodo-conteudo"));

// ---------- Sistema visual dos relatórios (cabeçalho, KPIs com ícone, seção em cartão) ----------
// Usado por TODOS os tipos de relatório (cliente, período, mensal, funil, visita) — é isso que
// garante que todos pareçam parte da mesma família visual, com capa, cabeçalho/rodapé fixo e
// encerramento, em vez de só os relatórios de cliente terem esse tratamento.
const REPORT_TONE_CYCLE = ["sage", "blue", "gold", "late", "purple", "olive"];
function reportDocHead(tituloHtml, subtitulo) {
  return `<div class="report-doc-head"><div><h2 class="rdh-title">${tituloHtml}</h2><div class="rdh-sub">${escapeHtml(subtitulo)}</div></div></div>`;
}
function reportStatTileItems(tiles) {
  return tiles.map((t, i) => `
    <div class="stat-tile"><div class="stat-ico panel-ico tone-${REPORT_TONE_CYCLE[i % REPORT_TONE_CYCLE.length]}">${t.icon}</div>
      <div><div class="stat-value">${escapeHtml(String(t.value))}</div><div class="stat-label">${escapeHtml(t.label)}</div></div></div>`).join("");
}
function reportStatTilesHtml(tiles) { return `<div class="stat-tiles">${reportStatTileItems(tiles)}</div>`; }
function reportSectionHtml(icon, titulo, innerHtml, idx) {
  const tone = REPORT_TONE_CYCLE[idx % REPORT_TONE_CYCLE.length];
  return `<div class="rs-card" data-tone="${tone}"><h3><span class="panel-ico tone-${tone}">${icon}</span>${escapeHtml(titulo)}</h3>${innerHtml}</div>`;
}
// Tabela densa (4+ colunas) vira lista de cartões empilhados em vez de <table> — dentro da coluna
// estreita de .report-sections-compact uma table.mini de 4-5 colunas quebra cada palavra do
// cabeçalho numa linha ("Statu/s"); como cartão, cada linha vira um bloco legível.
function reportRecordCardsHtml(colunas, linhas) {
  if (!linhas.length) return `<p class="hint" style="margin:4px 0 0;">Nenhum registro no período.</p>`;
  return `<div class="rs-records">${linhas.map(linha => `
    <div class="rs-record">${colunas.map((col, i) => (linha[i] && linha[i] !== "-") ? `<div class="rs-record-field"><span>${escapeHtml(col)}</span>${linha[i]}</div>` : "").join("")}</div>
  `).join("")}</div>`;
}
// Nome curto e pessoal pra saudação de encerramento — evita usar a razão social inteira
// ("Obrigado pela confiança, Agropecuária" quando o cliente é "Agropecuária Montanha...").
function reportGreetingName(entidade) {
  if (!entidade) return "";
  const contatos = entidade.contatosPessoas || [];
  const principal = contatos.find(p => p.principal) || contatos[0];
  const fonte = (principal && principal.nome) || entidade.nomeFantasia || entidade.nome || "";
  return fonte.trim().split(" ")[0] || "";
}
// Reaproveita a estética do .sparkline-bars (mesmo componente do Histórico de vendas) pra
// qualquer série mensal do relatório — comunica tendência melhor que uma coluna de números crua.
function reportBarsHtml(items) {
  const maxVal = Math.max(1, ...items.map(i => i.value));
  return `<div class="sparkline-bars">${items.map(i => {
    const h = Math.round((i.value / maxVal) * 100);
    return `<div class="bar" style="height:${i.value ? Math.max(h, 3) : 2}%;" title="${escapeHtml(i.label)}: ${escapeHtml(String(i.display ?? i.value))}"><span class="bar-label">${escapeHtml(i.label)}</span></div>`;
  }).join("")}</div>`;
}
function reportLocalLinha(client) {
  return [client.fazenda, client.municipio ? client.municipio + (client.estado ? ", " + client.estado : "") : ""].filter(Boolean).join(" — ");
}
// Celular/e-mail do usuário (Configurações → Empresa e marca) — permite o cliente que recebe o
// relatório contatar o consultor direto a partir do PDF, sem precisar procurar em outro lugar.
function reportContatoUsuarioLinha(cfg) {
  return [cfg.whatsappUsuario, cfg.emailUsuario].filter(Boolean).join(" · ");
}

// ---------- Capa, encerramento e cabeçalho/rodapé fixo — comuns a todos os relatórios ----------
// A empresa representante (Configurações → Empresa e marca) é a identidade que o cliente
// reconhece — precisa ser a protagonista visual. "Manejo CRM" vira crédito discreto (é a
// ferramenta que gerou o documento, não quem o cliente faz negócio com).
function reportCapaHtml({ eyebrow, titulo, subtitulo, metaLinha, topicos, interno }) {
  const cfg = state.config || {};
  const temMarcaPropria = !!cfg.empresaRepresentante;
  const empresaRep = cfg.empresaRepresentante || "Manejo CRM";
  const logoHtml = cfg.logoRepresentanteDataUrl
    ? `<img src="${cfg.logoRepresentanteDataUrl}" alt="${escapeHtml(empresaRep)}">`
    : `<img src="assets/brand-mark.png" alt="Manejo CRM">`;
  const chipsHtml = (topicos || []).map(t => `<span class="report-capa-chip">${escapeHtml(t)}</span>`).join("");
  const contatoLinha = reportContatoUsuarioLinha(cfg);
  return `
    <div class="report-capa">
      <img class="report-capa-wm" src="assets/touro-corpo.png" alt="">
      ${interno ? `<div class="report-capa-interno">Uso interno — não enviar ao cliente</div>` : ""}
      <div class="report-capa-brand">
        ${logoHtml}
        <div><div class="rcb-main">${escapeHtml(empresaRep)}</div><div class="rcb-sub">Nutrição Animal</div></div>
      </div>
      <div class="report-capa-mid">
        <div class="report-capa-eyebrow">${escapeHtml(eyebrow)}</div>
        <h2 class="report-capa-nome">${escapeHtml(titulo)}</h2>
        ${subtitulo ? `<div class="report-capa-fazenda">${escapeHtml(subtitulo)}</div>` : ""}
        <div class="report-capa-linha"></div>
        <div class="report-capa-meta">${escapeHtml(metaLinha)}</div>
        ${chipsHtml ? `<div class="report-capa-chips">${chipsHtml}</div>` : ""}
      </div>
      <div class="report-capa-bottom">
        <div>Preparado por<br><b>${escapeHtml(cfg.nomeUsuario || "-")}</b>${cfg.cargoUsuario ? " — " + escapeHtml(cfg.cargoUsuario) : ""}${contatoLinha ? `<br><span style="opacity:0.75;">${escapeHtml(contatoLinha)}</span>` : ""}</div>
        <div style="text-align:right;"><b>Documento confidencial</b>${temMarcaPropria ? `<br><span class="report-capa-credit">via Manejo CRM</span>` : ""}</div>
      </div>
    </div>`;
}
// nomeSaudacao presente = documento client-facing ("Obrigado pela confiança, Roberto");
// ausente = relatório interno (Mensal/Funil), fecha de forma neutra, sem fingir se dirigir a um cliente.
function reportEncerramentoHtml(nomeSaudacao) {
  const cfg = state.config || {};
  const temMarcaPropria = !!cfg.empresaRepresentante;
  const empresaRep = cfg.empresaRepresentante || "Manejo CRM";
  const logoHtml = cfg.logoRepresentanteDataUrl
    ? `<img src="${cfg.logoRepresentanteDataUrl}" alt="${escapeHtml(empresaRep)}">`
    : `<img src="assets/brand-mark.png" alt="Manejo CRM">`;
  const titulo = nomeSaudacao ? `Obrigado pela confiança, ${escapeHtml(nomeSaudacao)}` : "Relatório concluído";
  const texto = nomeSaudacao
    ? "Este documento reúne o histórico completo até a data de geração. Qualquer dúvida sobre os dados ou próximos passos, fale direto com seu consultor técnico."
    : "Relatório gerado automaticamente a partir dos dados registrados no CRM até a data abaixo — uso interno da equipe comercial.";
  return `
    <div class="report-encerramento">
      <img class="report-enc-wm" src="assets/touro-corpo.png" alt="">
      ${!nomeSaudacao ? `<div class="report-capa-interno report-enc-interno">Uso interno — não enviar ao cliente</div>` : ""}
      <div class="report-enc-brand">
        ${logoHtml}
        <div><div class="rcb-main">${escapeHtml(empresaRep)}</div><div class="rcb-sub">Nutrição Animal</div></div>
      </div>
      <div class="report-enc-mid">
        <div class="report-enc-eyebrow">Relatório concluído</div>
        <h2 class="report-enc-title">${titulo}</h2>
        <p class="report-enc-texto">${texto}</p>
        <div class="report-enc-card">
          <div class="nome">${escapeHtml(cfg.nomeUsuario || "-")}</div>
          <div class="cargo">${escapeHtml(cfg.cargoUsuario || "Consultor Técnico")}</div>
          <div class="empresa">${escapeHtml(empresaRep)}</div>
          ${reportContatoUsuarioLinha(cfg) ? `<div class="contato">${escapeHtml(reportContatoUsuarioLinha(cfg))}</div>` : ""}
        </div>
      </div>
      <div class="report-enc-bottom">
        <div class="report-enc-linha"></div>
        <div class="report-enc-foot-brand">Documento confidencial${temMarcaPropria ? " · via Manejo CRM" : ""}</div>
      </div>
    </div>`;
}
function reportRunningHeadHtml(tituloEsquerda, subtitulo) {
  return `<div class="report-running-head"><b>${escapeHtml(tituloEsquerda)}</b><span>${escapeHtml(subtitulo)}</span></div>`;
}
function reportRunningFootHtml() {
  const cfg = state.config || {};
  const empresaRep = cfg.empresaRepresentante || "Manejo CRM";
  return `<div class="report-running-foot"><span class="rf-mark"><img src="assets/brand-mark.png" alt="">${escapeHtml(empresaRep)}</span></div>`;
}

// Cartões de contato-chave (em vez da table.mini de 5 colunas) — legível também espremido
// nas 2 colunas compactas do relatório.
function reportContatosPessoasCardsHtml(client) {
  const contatos = client.contatosPessoas || [];
  if (!contatos.length) return `<p class="hint" style="margin:4px 0 0;">Nenhum contato cadastrado.</p>`;
  const linhas = contatos.map(p => [
    escapeHtml(p.nome || "-") + (p.principal ? " <em>(Principal)</em>" : ""),
    escapeHtml(p.cargo || "-"),
    onlyDigits(p.whatsapp) ? `<a href="https://wa.me/55${onlyDigits(p.whatsapp)}" target="_blank" rel="noopener">${escapeHtml(p.whatsapp)}</a>` : "-"
  ]);
  return reportRecordCardsHtml(["Nome", "Cargo", "WhatsApp"], linhas);
}
function reportUpsellCardsHtml(client) {
  const linhas = upsellsForClient(client.id).map(u => [
    escapeHtml(u.produto || ""), escapeHtml(u.categoria || ""),
    u.volumePotencial ? formatVolume(u.volumePotencial) + " t potenciais" : "",
    `<span class="badge ${badgeClassForUpsellStatus(u.status)}">${escapeHtml(u.status)}</span> · identificado em ${formatDate(u.dataIdentificacao)}`
  ]);
  return reportRecordCardsHtml(["Produto", "Categoria", "Volume", "Status"], linhas);
}
function reportSacCardsHtml(client) {
  const linhas = sacsForClient(client.id).map(s => [
    escapeHtml(s.numero) + " · " + escapeHtml(s.tipo), escapeHtml(s.produto || ""),
    `<span class="badge ${badgeClassForSacStatus(s.status)}">${escapeHtml(s.status)}</span> · aberto em ${formatDate(s.data)}`
  ]);
  return reportRecordCardsHtml(["Ocorrência", "Produto", "Status"], linhas);
}
// Versão do cadastro segura pra sair no PDF do cliente: sem status de cadastro interno,
// CPF/CNPJ, "como chegou até mim" nem "indicado por" — informação nossa sobre como/por que
// prospectamos o cliente, não algo que deveria aparecer no documento que ele recebe.
function reportCadastroClienteHtml(cliente) {
  return `<div class="detalhe-grid">
    ${reportField("Nome fantasia", cliente.nomeFantasia)}
    ${reportField("Fazenda/empresa", cliente.fazenda)}
    ${reportField("Endereço", [cliente.enderecoRua, cliente.enderecoNumero, cliente.enderecoBairro].filter(Boolean).join(", "))}
    ${reportField("Complemento", cliente.enderecoComplemento)}
    ${reportField("Município", cliente.municipio)}
    ${reportField("Estado", cliente.estado)}
    ${reportField("CEP", cliente.cep)}
  </div>`;
}

function renderRelatorioCliente(clientId) {
  const container = document.getElementById("relatorio-cliente-conteudo");
  const client = state.clientesAtivos.find(c => c.id === clientId);
  if (!client) { container.innerHTML = `<div class="empty-state">Cadastre um cliente ativo para gerar o relatório.</div>`; return; }
  // Só Perfil produtivo e Histórico de vendas têm tabela larga o bastante (6-7 colunas) pra
  // precisar da página inteira. As demais viram cartões (reportXCardsHtml) em vez de <table> —
  // por isso cabem de verdade lado a lado nas 2 colunas compactas, sem quebrar palavra por linha.
  const secoesLargas = [
    [ICONS.leaf, "Perfil produtivo", renderProdutivoTab(client)],
    [ICONS.box, "Histórico de vendas", stripActionsRow(renderVendasTab(client))]
  ];
  // SAC e Upsell só entram se houver pelo menos um registro — uma seção "SAC: nenhum registro"
  // não agrega nada ao cliente, só ocupa espaço e levanta a pergunta de por que existe.
  const secoesCompactas = [
    [ICONS.refreshCw, "Ciclo de recompra", stripActionsRow(renderRecompraTab(client))],
    [ICONS.folder, "Dados cadastrais", reportCadastroClienteHtml(client)],
    [ICONS.users, "Contatos-chave", reportContatosPessoasCardsHtml(client)],
    [ICONS.messageCircle, "Histórico de contatos", stripActionsRow(renderContatosTimelineTab(client, { showContatosPessoas: false }))],
    upsellsForClient(client.id).length ? [ICONS.trendingUp, "Oportunidades de upsell", reportUpsellCardsHtml(client)] : null,
    sacsForClient(client.id).length ? [ICONS.ticket, "SAC", reportSacCardsHtml(client)] : null
  ].filter(Boolean);
  const todosTopicos = [...secoesLargas, ...secoesCompactas].map(s => s[1]);
  const metaLinha = `Relatório gerado em ${formatDate(todayStr())}`;
  container.innerHTML = `
    ${reportCapaHtml({ eyebrow: "Relatório do Cliente", titulo: client.nome, subtitulo: reportLocalLinha(client), metaLinha, topicos: todosTopicos })}
    <div class="report-content-scope">
      ${reportRunningHeadHtml(`${client.nome}${client.fazenda ? " · " + client.fazenda : ""}`, metaLinha)}
      <div class="report-doc">
        ${reportDocHead(`${escapeHtml(client.nome)}${client.fazenda ? " · " + escapeHtml(client.fazenda) : ""}`, metaLinha)}
        <div class="report-sections">${secoesLargas.map(([icon, titulo, html], i) => reportSectionHtml(icon, titulo, html, i)).join("")}</div>
        <div class="report-sections-compact">${secoesCompactas.map(([icon, titulo, html], i) => reportSectionHtml(icon, titulo, html, i + secoesLargas.length)).join("")}</div>
      </div>
      ${reportRunningFootHtml()}
    </div>
    ${reportEncerramentoHtml(reportGreetingName(client))}`;
}

function renderRelatorioClientePeriodo(clientId, yyyyMM) {
  const container = document.getElementById("relatorio-cliente-periodo-conteudo");
  const client = state.clientesAtivos.find(c => c.id === clientId);
  if (!client) { container.innerHTML = `<div class="empty-state">Selecione um cliente.</div>`; return; }
  if (!yyyyMM) { container.innerHTML = `<div class="empty-state">Selecione um mês.</div>`; return; }
  const inMonth = dateStr => dateStr && dateStr.slice(0, 7) === yyyyMM;
  const pedidosMes = pedidosForClient(clientId).filter(p => inMonth(p.dataPedido));
  const volumeMes = pedidosMes.reduce((s, p) => s + (Number(p.volume) || 0), 0);
  const valorMes = pedidosMes.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const contatosMes = contatosForClient(clientId).filter(c => inMonth(c.data));
  const visitasMes = visitasForClient(clientId).filter(v => inMonth(v.dataVisita));
  const sacsMes = sacsForClient(clientId).filter(s => inMonth(s.data));
  const [y, m] = yyyyMM.split("-");
  const mesLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const tiles = [
    { icon: ICONS.box, label: "Pedidos no período", value: pedidosMes.length },
    { icon: ICONS.scale, label: "Volume vendido (ton)", value: formatVolume(volumeMes) },
    { icon: ICONS.money, label: "Valor vendido", value: formatMoney(valorMes) },
    { icon: ICONS.messageCircle, label: "Contatos realizados", value: contatosMes.length },
    { icon: ICONS.truck, label: "Visitas técnicas", value: visitasMes.length },
    { icon: ICONS.ticket, label: "SAC aberto no período", value: sacsMes.length }
  ];
  const pedidosCards = reportRecordCardsHtml(["Data", "Produto", "Volume", "Valor"],
    pedidosMes.map(p => [formatDate(p.dataPedido), escapeHtml(p.produto), p.volume ? formatVolume(p.volume) + " t" : "-", p.valor ? formatMoney(p.valor) : "-"]));
  const contatosCards = reportRecordCardsHtml(["Data", "Tipo", "Resumo"],
    contatosMes.map(c => [formatDate(c.data), escapeHtml(c.tipo), escapeHtml(c.resumo || "-")]));
  const visitasCards = reportRecordCardsHtml(["Data", "Objetivos"],
    visitasMes.map(v => [formatDate(v.dataVisita), escapeHtml((v.objetivos || []).join(", ") || "-")]));
  const sacsCards = reportRecordCardsHtml(["Número", "Data", "Tipo", "Status"],
    sacsMes.map(s => [escapeHtml(s.numero), formatDate(s.data), escapeHtml(s.tipo), escapeHtml(s.status)]));
  const metaLinha = `Atividades de ${mesLabel}`;
  const topicos = ["Pedidos", "Contatos", "Visitas técnicas", "SAC"];
  // SAC do período só entra se teve algum registro nesse mês — mesmo raciocínio do relatório
  // completo: uma seção "SAC: nenhum registro" não soma nada pro cliente.
  const secoesCompactasPeriodo = [
    [ICONS.messageCircle, "Contatos do período", contatosCards, 1],
    [ICONS.truck, "Visitas técnicas do período", visitasCards, 2],
    sacsMes.length ? [ICONS.ticket, "SAC do período", sacsCards, 3] : null
  ].filter(Boolean);
  container.innerHTML = `
    ${reportCapaHtml({ eyebrow: "Relatório do Cliente · Período", titulo: client.nome, subtitulo: reportLocalLinha(client), metaLinha, topicos })}
    <div class="report-content-scope">
      ${reportRunningHeadHtml(`${client.nome}${client.fazenda ? " · " + client.fazenda : ""}`, metaLinha)}
      <div class="report-doc">
        ${reportDocHead(`${escapeHtml(client.nome)}${client.fazenda ? " · " + escapeHtml(client.fazenda) : ""}`, metaLinha)}
        ${reportStatTilesHtml(tiles)}
        <div class="report-sections">
          ${reportSectionHtml(ICONS.box, "Pedidos do período", pedidosCards, 0)}
        </div>
        <div class="report-sections-compact">
          ${secoesCompactasPeriodo.map(([icon, titulo, html, idx]) => reportSectionHtml(icon, titulo, html, idx)).join("")}
        </div>
      </div>
      ${reportRunningFootHtml()}
    </div>
    ${reportEncerramentoHtml(reportGreetingName(client))}`;
}

function renderRelatorioMensal(yyyyMM) {
  const container = document.getElementById("relatorio-mensal-conteudo");
  if (!yyyyMM) { container.innerHTML = `<div class="empty-state">Selecione um mês.</div>`; return; }
  const inMonth = dateStr => dateStr && dateStr.slice(0, 7) === yyyyMM;
  const novosLeads = state.leads.filter(c => inMonth(c.criadoEm)).map(c => ({ c, tipo: "Lead" }));
  const novosCA = state.clientesAtivos.filter(c => inMonth(c.criadoEm)).map(c => ({ c, tipo: "Cliente ativo" }));
  const novosClientes = [...novosLeads, ...novosCA];
  const pedidosMes = state.pedidos.filter(p => inMonth(p.dataPedido));
  const volumeMes = pedidosMes.reduce((s, p) => s + (Number(p.volume) || 0), 0);
  const valorMes = pedidosMes.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const contatosMes = state.contatos.filter(c => inMonth(c.data));
  const propostasMes = state.leads.filter(l => (l.historicoEtapas || []).some(h => h.etapa === "Proposta enviada" && inMonth(h.data)));
  const contatosPorTipo = {};
  contatosMes.forEach(c => { contatosPorTipo[c.tipo] = (contatosPorTipo[c.tipo] || 0) + 1; });
  const tiles = [
    { icon: ICONS.users, label: "Novos clientes", value: novosClientes.length }, { icon: ICONS.box, label: "Pedidos no mês", value: pedidosMes.length },
    { icon: ICONS.scale, label: "Volume vendido (ton)", value: formatVolume(volumeMes) }, { icon: ICONS.money, label: "Valor vendido", value: formatMoney(valorMes) },
    { icon: ICONS.messageCircle, label: "Contatos realizados", value: contatosMes.length }, { icon: ICONS.fileText, label: "Propostas enviadas", value: propostasMes.length }
  ];
  const [y, m] = yyyyMM.split("-");
  const mesLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const novosCards = reportRecordCardsHtml(["Nome", "Fazenda", "Tipo"],
    novosClientes.map(({ c, tipo }) => [escapeHtml(c.nome), escapeHtml(c.fazenda || "-"), escapeHtml(tipo)]));
  const pedidosCards = reportRecordCardsHtml(["Data", "Cliente", "Produto", "Volume", "Valor"],
    pedidosMes.map(p => { const c = state.clientesAtivos.find(x => x.id === p.clientId); return [formatDate(p.dataPedido), escapeHtml(c ? c.nome : "-"), escapeHtml(p.produto), p.volume ? p.volume + " t" : "-", p.valor ? formatMoney(p.valor) : "-"]; }));
  const contatosTipoGrid = Object.entries(contatosPorTipo).map(([tipo, count]) => field(tipo, String(count))).join("") || `<p class="hint">Nenhum contato no período.</p>`;
  const metaLinha = `Relatório gerado em ${formatDate(todayStr())}`;
  container.innerHTML = `
    ${reportCapaHtml({ eyebrow: "Relatório Interno", titulo: "Atividades do mês", subtitulo: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1), metaLinha, topicos: ["Contatos", "Novos clientes", "Pedidos"], interno: true })}
    <div class="report-content-scope">
      ${reportRunningHeadHtml("Atividades do mês", mesLabel)}
      <div class="report-doc">
        ${reportDocHead("Atividades do mês", mesLabel)}
        ${reportStatTilesHtml(tiles)}
        <div class="report-sections">
          ${reportSectionHtml(ICONS.box, "Pedidos do mês", pedidosCards, 0)}
        </div>
        <div class="report-sections-compact">
          ${reportSectionHtml(ICONS.messageCircle, "Contatos por tipo", `<div class="detalhe-grid">${contatosTipoGrid}</div>`, 1)}
          ${reportSectionHtml(ICONS.users, "Novos clientes cadastrados", novosCards, 2)}
        </div>
      </div>
      ${reportRunningFootHtml()}
    </div>
    ${reportEncerramentoHtml(null)}`;
}

function renderRelatorioFunil() {
  const container = document.getElementById("relatorio-funil-conteudo");
  const hoje = new Date();

  const meses = [];
  for (let i = 5; i >= 0; i--) meses.push(`${new Date(hoje.getFullYear(), hoje.getMonth() - i, 1).getFullYear()}-${String(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1).getMonth() + 1).padStart(2, "0")}`);
  const conversaoPorMes = meses.map(mes => {
    // Taxa por coorte: dos leads CRIADOS neste mês, quantos já converteram até hoje (não confunde com
    // conversões de coortes antigas que aconteceram de coincidência neste mesmo mês).
    const novosDoMes = state.leads.filter(l => (l.criadoEm || "").slice(0, 7) === mes);
    const convertidosDessaCoorte = novosDoMes.filter(l => l.dataConversao).length;
    const [y, m] = mes.split("-");
    const labelCurto = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
    const labelLongo = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    const taxa = novosDoMes.length ? Math.round((convertidosDessaCoorte / novosDoMes.length) * 100) : 0;
    return { labelCurto, labelLongo, novos: novosDoMes.length, convertidos: convertidosDessaCoorte, taxa };
  });
  // Com menos da metade dos meses tendo algum lead novo, um gráfico de barras só mostra chão
  // vazio — a tabela abaixo já traz os números reais, o gráfico só entra quando há histórico
  // de verdade pra desenhar uma tendência.
  const mesesComLeads = conversaoPorMes.filter(c => c.novos > 0).length;
  const temConversao = conversaoPorMes.some(c => c.taxa > 0);
  const conversaoBarsHtml = mesesComLeads >= Math.ceil(meses.length / 2) && temConversao
    ? reportBarsHtml(conversaoPorMes.map(c => ({ label: c.labelCurto, value: c.taxa, display: c.novos ? c.taxa + "%" : "sem leads novos" })))
    : `<p class="hint">Ainda não há conversões suficientes nos últimos 6 meses para visualizar a tendência — os números por mês estão na tabela abaixo.</p>`;
  const conversaoRows = conversaoPorMes.map(c => `<tr><td>${c.labelLongo}</td><td>${c.novos}</td><td>${c.convertidos}</td><td>${c.novos ? c.taxa + "%" : "-"}</td></tr>`).join("");

  const somaPorEtapa = {}, contPorEtapa = {};
  state.leads.forEach(l => {
    const hist = l.historicoEtapas || [];
    for (let i = 0; i < hist.length; i++) {
      let fim;
      if (hist[i + 1]) fim = hist[i + 1].data;
      else if (l.status === "Ativo") fim = todayStr();
      else if (l.status === "Convertido") fim = l.dataConversao || null;
      else fim = l.dataEncerramento || null;
      if (!fim) continue;
      const dias = daysBetween(hist[i].data, fim);
      if (dias < 0) continue;
      somaPorEtapa[hist[i].etapa] = (somaPorEtapa[hist[i].etapa] || 0) + dias;
      contPorEtapa[hist[i].etapa] = (contPorEtapa[hist[i].etapa] || 0) + 1;
    }
  });
  const etapaRows = LEAD_FUNIL_STAGES.map(etapa => {
    const media = contPorEtapa[etapa] ? Math.round(somaPorEtapa[etapa] / contPorEtapa[etapa]) : null;
    return `<tr><td>${etapa}</td><td>${media !== null ? media + " dias" : "sem dados suficientes"}</td><td>${contPorEtapa[etapa] || 0}</td></tr>`;
  }).join("");

  const semPedido = state.clientesAtivos.map(c => ({ c, insight: computeClientInsight(c) })).filter(({ insight }) => insight.status === "atrasado");
  const semPedidoCards = reportRecordCardsHtml(["Cliente", "Ciclo médio", "Dias sem comprar"],
    semPedido.map(({ c, insight }) => [escapeHtml(c.nome), insight.avgInterval + " dias", insight.daysSinceLast + " dias"]));

  const semContato = state.leads.filter(l => l.status === "Ativo").map(l => {
    const contatos = contatosForClient(l.id);
    const dias = contatos.length ? daysBetween(contatos[0].data, todayStr()) : null;
    return { l, dias };
  }).filter(({ dias }) => dias === null || dias > 7);
  const semContatoCards = reportRecordCardsHtml(["Lead", "Etapa", "Sem contato"],
    semContato.map(({ l, dias }) => [escapeHtml(l.nome), escapeHtml(l.etapaFunil), dias === null ? "nunca contatado" : dias + " dias"]));

  const totalNovos = meses.reduce((s, mes) => s + state.leads.filter(l => (l.criadoEm || "").slice(0, 7) === mes).length, 0);
  const totalConvertidos = meses.reduce((s, mes) => s + state.leads.filter(l => (l.criadoEm || "").slice(0, 7) === mes && l.dataConversao).length, 0);
  const etapaMaisLenta = LEAD_FUNIL_STAGES.filter(e => contPorEtapa[e]).sort((a, b) => (somaPorEtapa[b] / contPorEtapa[b]) - (somaPorEtapa[a] / contPorEtapa[a]))[0];
  const tiles = [
    { icon: ICONS.trendingUp, label: "Taxa de conversão (6 meses)", value: totalNovos ? Math.round((totalConvertidos / totalNovos) * 100) + "%" : "-" },
    { icon: ICONS.clock, label: "Etapa mais lenta", value: etapaMaisLenta || "-" },
    { icon: ICONS.alertTriangle, label: "Clientes atrasados", value: semPedido.length },
    { icon: ICONS.phoneOff, label: "Leads sem contato", value: semContato.length }
  ];
  const metaLinha = `Relatório gerado em ${formatDate(todayStr())}`;

  container.innerHTML = `
    ${reportCapaHtml({ eyebrow: "Relatório Interno", titulo: "Funil & Carteira", subtitulo: "Conversão, ritmo de etapas e alertas de carteira", metaLinha, topicos: ["Conversão", "Tempo por etapa", "Atrasados", "Sem contato"], interno: true })}
    <div class="report-content-scope">
      ${reportRunningHeadHtml("Funil & Carteira", metaLinha)}
      <div class="report-doc">
        ${reportDocHead("Funil &amp; carteira", metaLinha)}
        ${reportStatTilesHtml(tiles)}
        <div class="report-sections">
          ${reportSectionHtml(ICONS.refreshCw, "Taxa de conversão lead → cliente (últimos 6 meses)", `${conversaoBarsHtml}<table class="mini"><thead><tr><th>Mês</th><th>Novos leads</th><th>Convertidos</th><th>Taxa</th></tr></thead><tbody>${conversaoRows}</tbody></table>`, 0)}
          ${reportSectionHtml(ICONS.clock, "Tempo médio de cada etapa do funil", `<table class="mini"><thead><tr><th>Etapa</th><th>Tempo médio</th><th>Passagens registradas</th></tr></thead><tbody>${etapaRows}</tbody></table>`, 1)}
        </div>
        <div class="report-sections-compact">
          ${reportSectionHtml(ICONS.alertTriangle, "Clientes sem pedido há mais de um ciclo", semPedidoCards, 2)}
          ${reportSectionHtml(ICONS.phoneOff, "Leads sem contato há mais de 7 dias", semContatoCards, 3)}
        </div>
      </div>
      ${reportRunningFootHtml()}
    </div>
    ${reportEncerramentoHtml(null)}`;
}

// ---------- Relatórios rápidos (cards) ----------
document.querySelectorAll(".btn-relatorio-rapido").forEach(btn => {
  btn.addEventListener("click", () => {
    const tipo = btn.dataset.relatorio;
    const msgs = {
      pipeline: "Veja a distribuição do funil no Dashboard e o quadro completo no Pipeline.",
      volume: "Veja o ranking de volume no Dashboard, ou gere o relatório detalhado por cliente abaixo.",
      conversao: "Taxa de conversão lead → cliente e tempo médio por etapa abaixo, em Funil & Carteira.",
      followups: "Leads sem contato há mais de 7 dias e clientes sem pedido há mais de um ciclo abaixo, em Funil & Carteira.",
      competitiva: "Veja a tabela, radar e mapa de calor na tela Inteligência Competitiva."
    };
    showToast(msgs[tipo] || "Relatório disponível abaixo.");
    if (tipo === "conversao" || tipo === "followups") {
      document.querySelectorAll(".report-switch-btn").forEach(b => b.classList.toggle("active", b.dataset.report === "funil"));
      document.querySelectorAll(".report-panel").forEach(p => p.classList.toggle("active", p.id === "report-funil"));
      currentReportView = "funil";
      renderRelatorioFunil();
    } else if (tipo === "pipeline") {
      switchMainTab("pipeline");
    } else if (tipo === "volume") {
      switchMainTab("dashboard");
    } else if (tipo === "competitiva") {
      switchMainTab("competitiva");
    }
  });
});

// ---------- Fechar modais ----------
document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", () => closeModal(btn.dataset.closeModal)));
// Nenhum modal fecha por clique fora: todos são formulários de cadastro/edição, e um clique
// perdido do lado de fora descartava silenciosamente o que já tinha sido digitado. Fechar exige
// um clique explícito no X, em "Cancelar" ou Esc — igual ao #modal-login já fazia.
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

// ============================================================
// IMPORTAR DADOS (mapeamento JSON externo → schema do CRM)
// ============================================================
function mapJsonCategorias(raw) {
  return raw.categoria_animal ? [{ id: uid(), tipoAnimal: raw.categoria_animal, faseProducao: "", quantidade: raw.tamanho_rebanho || "", sistemaProducao: raw.sistema_producao || "", fornecedorAtual: "", produtoAtual: "", volumeMensalEstimado: "", prazoPagamento: "", tipoFrete: "FOB", satisfacao: "", reclamacoes: "", tempoDeUso: "" }] : [];
}

function mapJsonComum(raw) {
  const contatosPessoas = [];
  if (raw.decisor) contatosPessoas.push({ id: uid(), nome: raw.decisor, cargo: raw.cargo_decisor || "", papel: "Decisor", whatsapp: raw.whatsapp || "", email: "", canalPreferido: "WhatsApp", obs: "", principal: true });
  if (raw.influenciador) contatosPessoas.push({ id: uid(), nome: raw.influenciador, cargo: raw.cargo_influenciador || "", papel: "Influenciador", whatsapp: "", email: "", canalPreferido: "WhatsApp", obs: "", principal: false });
  return {
    id: uid(), origemId: raw.id, nome: raw.nome || "", fazenda: raw.fazenda || "",
    municipio: raw.municipio || "", estado: raw.estado || "", whatsappDecisor: raw.whatsapp || "",
    nomeDecisor: raw.decisor || "", cargoDecisor: raw.cargo_decisor || "",
    nomeInfluenciador: raw.influenciador || "", cargoInfluenciador: raw.cargo_influenciador || "",
    contatosPessoas, categoriasAnimais: mapJsonCategorias(raw),
    criadoEm: todayStr()
  };
}

function mapJsonLead(raw) {
  const produtoAtual = raw.produto_atual || raw.suplemento_atual || "";
  const etapaRaw = raw.etapa_funil || "Prospecção";
  const etapaFunil = LEAD_FUNIL_STAGES.includes(etapaRaw) ? etapaRaw : (ETAPA_NORMALIZE[etapaRaw] || "Prospecção");
  const objecoesArr = Array.isArray(raw.objecoes) ? raw.objecoes : (raw.objecoes ? [raw.objecoes] : []);
  const produtoPropostaTxt = Array.isArray(raw.proposta_produtos) ? raw.proposta_produtos.join(", ") : raw.proposta_produtos || "";
  const potencialVolume = raw.potencial_mensal_ton ?? raw.proposta_volume_ton ?? "";
  const statusMap = { "Bloqueado": "Bloqueado", "Inativo": "Inativo", "Perdido": "Perdido" };

  const obsParts = [];
  if (raw.observacoes) obsParts.push(raw.observacoes);
  if (raw.status_especial) obsParts.push("Status especial: " + raw.status_especial);

  const comum = mapJsonComum(raw);
  if (comum.categoriasAnimais[0]) {
    comum.categoriasAnimais[0].fornecedorAtual = produtoAtual;
    comum.categoriasAnimais[0].produtoAtual = produtoAtual;
    comum.categoriasAnimais[0].volumeMensalEstimado = potencialVolume;
  }

  return {
    ...comum,
    nomeFantasia: "", enderecoComplemento: "", lat: "", lng: "", areaTotalHectares: "",
    nivelTecnologico: "", temConsultor: "nao", consultorId: "",
    bantBudget: "", bantAuthority: "", bantNeed: "", bantTiming: "",
    etapaFunil, status: statusMap[etapaRaw] || "Ativo", temperatura: "Morno",
    probabilidade: "", produtoInteresse: produtoPropostaTxt, potencialTon: potencialVolume, potencialValor: "",
    objecoes: objecoesArr, obsEstrategicas: "",
    proximoPassoTipo: raw.proximo_contato ? "Follow-up WhatsApp" : "", dataProximoPasso: raw.proximo_contato || "",
    proximoPassoResponsavel: "Eu", proximoPassoObs: "",
    statusProximoPasso: raw.proximo_contato ? "Pendente" : "",
    statusEspecial: "", statusEspecialObs: "",
    vendedorResponsavel: "", dataConversao: "", clienteAtivoId: "",
    dataEncerramento: "", motivoEncerramento: "", concorrenteMotivo: "",
    historicoEtapas: [{ etapa: etapaFunil, data: todayStr() }],
    obsGerais: obsParts.join(" "), schemaV5: true
  };
}

function mapJsonClienteAtivo(raw) {
  return {
    ...mapJsonComum(raw),
    nivelTecnologico: "", areaTotalHectares: "", temConsultor: "nao", consultorId: "",
    statusCadastro: "Ativo", dataCadastroAprovado: "", cadastroAprovado: "sim",
    condicaoPagamentoDias: raw.prazo_pagamento || "", tipoFrete: raw.tipo_frete || "FOB",
    alertaRecompraDias: raw.ciclo_recompra_dias || 5, cicloObs: "",
    status: "Ativo", motivoInativacao: "", concorrenteInativacao: "", dataInativacao: "",
    vendedorResponsavel: nomeUsuarioPadrao(), dataConversao: todayStr(),
    obsGerais: raw.observacoes || "", schemaV5: true
  };
}

function synthesizePedidos(raw, clientId) {
  const pedidos = [];
  if (!raw.ultimo_pedido_data || !raw.ultimo_pedido_volume_ton) return pedidos;
  const produto = raw.produto_atual || raw.suplemento_atual || "Produto";
  if (raw.ciclo_recompra_dias) {
    pedidos.push({ id: uid(), clientId, produto, volume: raw.ultimo_pedido_volume_ton, valor: "", dataPedido: addDays(raw.ultimo_pedido_data, -raw.ciclo_recompra_dias), dataEntrega: "" });
  }
  pedidos.push({ id: uid(), clientId, produto, volume: raw.ultimo_pedido_volume_ton, valor: "", dataPedido: raw.ultimo_pedido_data, dataEntrega: "" });
  return pedidos;
}

function mapContatos(raw, clientId) {
  return (raw.historico_contatos || []).map(h => ({
    id: uid(), clientId, data: h.data, tipo: h.tipo || "Outro", duracao: "", comQuem: "",
    resumo: h.resumo || "", oQueClienteDisse: "", produtosDiscutidos: "",
    objecoesLevantadas: "", pendente: h.pendente || "", proximoPasso: h.proximo_passo || "",
    dataProximoContato: "", responsavelProximoPasso: "Eu", obs: ""
  }));
}

function mapCompetitiva(raw, clientId) {
  if (!raw.inteligencia_competitiva) return null;
  const ic = raw.inteligencia_competitiva;
  const primeiraData = (raw.historico_contatos && raw.historico_contatos[0]) ? raw.historico_contatos[0].data : todayStr();
  return {
    id: uid(), clientId, data: primeiraData, concorrente: ic.concorrente_principal || "",
    produtoConcorrente: ic.produto_concorrente || "", preco: ic.preco_observado || "",
    canalVenda: ic.canal_venda_concorrente || "", prazoPagamento: "", frete: "", bonificacoes: "", pontoFraco: "", pontoForte: ""
  };
}

function maybeCreateConsultor(raw) {
  if (!raw.influenciador) return null;
  return {
    id: uid(), nome: raw.influenciador, empresa: raw.empresa_influenciador || "", whatsapp: "",
    regiao: raw.municipio || "", estimativaClientes: "",
    parceriaConcorrente: raw.influenciador_parceiro_concorrente ? "sim" : "desconhecido",
    nomeConcorrenteParceiro: raw.concorrente_influenciador || "", multiplicador: "nao", obs: ""
  };
}

function importJsonData(data) {
  const existingIds = new Set([...state.leads, ...state.clientesAtivos].map(c => c.origemId).filter(Boolean));
  let counts = { clientes: 0, pulados: 0, pedidos: 0, contatos: 0, competitivas: 0, consultores: 0 };

  const allRaw = [
    ...(data.clientes_ativos || []).map(raw => ({ raw, tipo: "cliente" })),
    ...(data.leads || []).map(raw => ({ raw, tipo: "lead" }))
  ];

  allRaw.forEach(({ raw, tipo }) => {
    if (raw.id && existingIds.has(raw.id)) { counts.pulados++; return; }

    const client = tipo === "cliente" ? mapJsonClienteAtivo(raw) : mapJsonLead(raw);
    const consultorRecord = maybeCreateConsultor(raw);
    if (consultorRecord) {
      state.consultores.push(consultorRecord);
      client.consultorId = consultorRecord.id;
      client.temConsultor = "sim";
      counts.consultores++;
    }
    if (tipo === "cliente") state.clientesAtivos.push(client); else state.leads.push(client);
    counts.clientes++;

    const pedidos = synthesizePedidos(raw, client.id);
    if (tipo === "cliente") { state.pedidos.push(...pedidos); counts.pedidos += pedidos.length; }

    const contatos = mapContatos(raw, client.id);
    state.contatos.push(...contatos);
    counts.contatos += contatos.length;

    const comp = mapCompetitiva(raw, client.id);
    if (comp) { state.competitivas.push(comp); counts.competitivas++; }
  });

  saveState();
  refreshClientSelects(); refreshConsultorSelect();
  renderDashboard(); renderClientList(); renderLeadsList(); renderConsultorList();

  const statusEl = document.getElementById("import-json-status");
  const resumo = `${counts.clientes} clientes/leads importados` + (counts.pulados ? `, ${counts.pulados} já existiam (pulados)` : "") +
    ` · ${counts.pedidos} pedidos · ${counts.contatos} contatos · ${counts.competitivas} obs. competitivas · ${counts.consultores} consultores.`;
  if (statusEl) statusEl.textContent = resumo;
  showToast(`Importação concluída: ${counts.clientes} clientes/leads.`);
}

document.getElementById("import-json-file").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      importJsonData(data);
    } catch (err) {
      document.getElementById("import-json-status").textContent = "Erro ao importar: arquivo JSON inválido.";
      showToast("Erro ao importar: JSON inválido.");
    }
  };
  reader.readAsText(file);
});

// ---------- Backup completo (exportar / restaurar) ----------
const btnExportBackup = document.getElementById("btn-export-backup");
if (btnExportBackup) btnExportBackup.addEventListener("click", () => {
  try {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manejo-crm-backup-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast("Backup exportado.");
  } catch (e) { showToast("Não foi possível exportar o backup."); }
});
const restoreBackupInput = document.getElementById("restore-backup-file");
if (restoreBackupInput) restoreBackupInput.addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  const statusEl = document.getElementById("restore-backup-status");
  const reader = new FileReader();
  reader.onload = evt => {
    let data;
    try { data = JSON.parse(evt.target.result); }
    catch { if (statusEl) statusEl.textContent = "Arquivo de backup inválido."; return; }
    if (!data || !data.config) { if (statusEl) statusEl.textContent = "Este arquivo não parece um backup do Manejo CRM."; return; }
    if (!confirm("Restaurar este backup vai SUBSTITUIR todos os dados atuais deste navegador. Continuar?")) { e.target.value = ""; return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    location.reload();
  };
  reader.readAsText(file);
});

// ---------- Login / logout (Supabase Auth, e-mail + senha) ----------
function showLoginModal() { const m = document.getElementById("modal-login"); if (m) m.classList.remove("hidden"); }
function hideLoginModal() { const m = document.getElementById("modal-login"); if (m) m.classList.add("hidden"); }
// O modal de login tem 3 telas dentro do mesmo overlay: entrar (padrão), pedir link pra
// definir/redefinir senha, e definir a nova senha (essa última abre sozinha quando o usuário
// clica no link recebido por e-mail — ver o listener de PASSWORD_RECOVERY abaixo).
function showLoginView(view) {
  ["form-login", "form-login-recuperar", "form-login-nova-senha"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== view);
  });
}

async function initAuthAndSync() {
  if (!sb) return; // credenciais do Supabase ainda não configuradas: app roda só local, como hoje

  const formLogin = document.getElementById("form-login");
  if (formLogin) formLogin.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-senha").value;
    if (!email || !senha) return;
    const btn = document.getElementById("btn-login-enviar");
    const statusEl = document.getElementById("login-status");
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    btn.disabled = false;
    if (error && statusEl) {
      statusEl.style.display = "block";
      statusEl.textContent = "E-mail ou senha incorretos. Se ainda não definiu uma senha, use o link abaixo.";
    }
    // Se der certo, onAuthStateChange (SIGNED_IN) cuida de fechar o modal e sincronizar.
  });

  const btnIrRecuperar = document.getElementById("btn-login-ir-recuperar");
  if (btnIrRecuperar) btnIrRecuperar.addEventListener("click", () => showLoginView("form-login-recuperar"));
  const btnVoltarEntrar = document.getElementById("btn-login-voltar-entrar");
  if (btnVoltarEntrar) btnVoltarEntrar.addEventListener("click", () => showLoginView("form-login"));

  const formRecuperar = document.getElementById("form-login-recuperar");
  if (formRecuperar) formRecuperar.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("login-recuperar-email").value.trim();
    if (!email) return;
    const btn = document.getElementById("btn-login-recuperar-enviar");
    const statusEl = document.getElementById("login-recuperar-status");
    btn.disabled = true;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href });
    btn.disabled = false;
    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.textContent = error ? `Erro: ${error.message}` : "Link enviado — verifique seu e-mail e clique nele para definir a senha.";
    }
  });

  const formNovaSenha = document.getElementById("form-login-nova-senha");
  if (formNovaSenha) formNovaSenha.addEventListener("submit", async e => {
    e.preventDefault();
    const senha = document.getElementById("login-nova-senha").value;
    const confirmar = document.getElementById("login-nova-senha-confirmar").value;
    const statusEl = document.getElementById("login-nova-senha-status");
    if (senha !== confirmar) {
      if (statusEl) { statusEl.style.display = "block"; statusEl.textContent = "As senhas não coincidem."; }
      return;
    }
    const btn = document.getElementById("btn-login-nova-senha-salvar");
    btn.disabled = true;
    const { error } = await sb.auth.updateUser({ password: senha });
    btn.disabled = false;
    if (error) {
      if (statusEl) { statusEl.style.display = "block"; statusEl.textContent = `Erro: ${error.message}`; }
      return;
    }
    showToast("Senha definida com sucesso.");
    // onAuthStateChange (SIGNED_IN) já deixa autenticado com a sessão de recuperação — fecha o modal e sincroniza.
  });

  const btnContinuarOffline = document.getElementById("btn-login-continuar-offline");
  if (btnContinuarOffline) btnContinuarOffline.addEventListener("click", () => {
    hideLoginModal();
    showToast("Usando o CRM só neste aparelho — os dados não vão sincronizar até você entrar.");
  });

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) btnLogout.addEventListener("click", async () => {
    await sb.auth.signOut();
    location.reload();
  });

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      showLoginModal();
      showLoginView("form-login-nova-senha");
      return;
    }
    if (session) {
      hideLoginModal();
      if (event === "SIGNED_IN") pullAllTablesAndMerge().then(ok => { if (ok) boot(); });
    } else {
      showLoginView("form-login");
      showLoginModal();
    }
  });

  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    hideLoginModal();
    pullAllTablesAndMerge().then(ok => { if (ok) boot(); });
  } else {
    showLoginView("form-login");
    showLoginModal();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pullAllTablesAndMerge().then(ok => { if (ok) boot(); });
  });
}

// ============================================================
// INIT
// ============================================================
// boot() é chamado duas vezes: uma vez já, de forma síncrona, a partir do que já
// está em localStorage (pinta a tela instantaneamente, funciona offline, igual ao
// comportamento de sempre); e de novo, silenciosamente, assim que o primeiro pull
// do Supabase terminar. Funciona sem tocar nas dezenas de funções de renderização
// porque todas elas já sobrescrevem innerHTML por completo — chamar de novo é seguro.
function boot() {
  applyTheme();
  refreshClientSelects();
  refreshConsultorSelect();
  refreshFornecedoresDatalist();
  renderDashboardCanvas();
  renderDashboard();
  renderClientList();
  renderLeadsList();
  renderConsultorList();
}
boot();
initAuthAndSync();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.warn("Falha ao registrar service worker:", err));
  });
}
