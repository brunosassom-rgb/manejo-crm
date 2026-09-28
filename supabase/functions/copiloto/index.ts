// Copiloto do Manejo — camada 3 (a IA de verdade).
//
// O app.js já filtra "operações padrão" antes de chegar aqui (ver
// COPILOTO_ROTEIRO_PADRAO em app.js) — esta função só roda quando nenhum
// atalho conhecido resolveu, ou seja, é deliberadamente a parte cara e
// só entra quando precisa de interpretação de linguagem de verdade.
//
// v1: só a ação "registrar_contato" existe. Pra adicionar uma nova ação
// (agendar_compromisso, registrar_pedido...): 1) acrescente a definição em
// TOOLS, 2) leia o campo novo em `input` dentro de interpretarComIA,
// 3) escreva a função de gravação equivalente a gravarContato() e chame
// no bloco `if (body.confirmar)` de acordo com `body.confirmar.acao`.
//
// Protocolo com o front-end (sempre 2 passos, nunca grava direto):
//   1) POST { texto, clientIdAtual? }  -> { tipo: "confirmar", proposta, mensagem }
//                                          ou { tipo: "erro", mensagem }
//   2) POST { confirmar: proposta }    -> { tipo: "feito", mensagem }
// O passo 1 nunca grava nada — só o passo 2, depois que o técnico
// confirmou o resumo, escreve no banco.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
// Sonnet 5 (não o modelo topo de linha) de propósito: extrair campos de uma
// frase curta e casar com um nome de cliente é uma tarefa simples, e manter
// o custo baixo foi um requisito explícito do Bruno pra essa função. Se
// quiser mais barato ainda, troque por "claude-haiku-4-5".
const MODEL = "claude-sonnet-5";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(obj: unknown) {
  return new Response(JSON.stringify(obj), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const TOOLS = [
  {
    name: "registrar_contato",
    description:
      "Registra um contato (ligação, WhatsApp, visita) com um cliente ou lead do CRM, a partir do relato em linguagem natural do representante comercial.",
    input_schema: {
      type: "object",
      properties: {
        clientId: {
          type: "string",
          description: "id do cliente/lead identificado na lista fornecida no system prompt",
        },
        tipo: {
          type: "string",
          enum: ["Ligação", "WhatsApp", "Visita presencial", "E-mail"],
        },
        resumo: {
          type: "string",
          description: "resumo do que aconteceu, reescrito em português claro e objetivo",
        },
        resultado: {
          type: "string",
          enum: ["Avançou", "Manteve", "Regrediu", "Sem resposta"],
        },
        proximoPasso: {
          type: "string",
          description: "próximo passo combinado, se o relato mencionar algum; string vazia se não houver",
        },
      },
      required: ["clientId", "tipo", "resumo", "resultado", "proximoPasso"],
    },
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ tipo: "erro", mensagem: "Método não suportado." });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json();

    // Passo 2: confirmação — só aqui o banco é escrito de fato.
    if (body.confirmar) {
      const resultado = await gravarContato(admin, body.confirmar);
      return jsonResponse({ tipo: "feito", mensagem: resultado.mensagem });
    }

    // Passo 1: interpretar o texto e propor uma ação, sem gravar nada ainda.
    const texto = String(body.texto || "").trim();
    if (!texto) return jsonResponse({ tipo: "erro", mensagem: "Mensagem vazia." });

    const clientes = await buscarClientesResumidos(admin);
    const proposta = await interpretarComIA(texto, clientes, body.clientIdAtual);
    return jsonResponse(proposta);
  } catch (err) {
    console.error("Erro no Copiloto:", err);
    return jsonResponse({
      tipo: "erro",
      mensagem: "Não consegui processar agora. Tente de novo em instantes, ou registre pelo formulário normal.",
    });
  }
});

async function buscarClientesResumidos(admin: ReturnType<typeof createClient>) {
  const [{ data: leads, error: e1 }, { data: ativos, error: e2 }] = await Promise.all([
    admin.from("leads").select("id, data"),
    admin.from("clientes_ativos").select("id, data"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return [
    ...(leads || []).map((r) => ({ id: r.id, nome: r.data?.nome, fazenda: r.data?.fazenda, tipo: "lead" })),
    ...(ativos || []).map((r) => ({ id: r.id, nome: r.data?.nome, fazenda: r.data?.fazenda, tipo: "cliente ativo" })),
  ];
}

async function interpretarComIA(
  texto: string,
  clientes: { id: string; nome: string; fazenda: string; tipo: string }[],
  clientIdAtual?: string,
) {
  const listaClientes = clientes.map((c) => `${c.id} | ${c.nome} (${c.fazenda || "-"}) [${c.tipo}]`).join("\n");
  const clienteAberto = clientes.find((c) => c.id === clientIdAtual);

  const system = `Você ajuda um representante comercial de nutrição animal a registrar contatos no CRM Manejo, a partir do relato dele em português coloquial (pode vir com erro de digitação, sem acento, informal).

${clienteAberto ? `A ficha aberta agora no CRM é: ${clienteAberto.id} (${clienteAberto.nome}) — use esse id se o relato não deixar claro que é sobre outro cliente.` : "Nenhuma ficha de cliente está aberta agora — identifique o cliente pelo nome mencionado no relato."}

Lista de clientes/leads cadastrados (id | nome (fazenda) [tipo]):
${listaClientes}

Sempre que conseguir identificar o cliente com confiança razoável, chame a ferramenta registrar_contato com os dados extraídos do relato. Se o relato não deixar claro qual cliente é, ou não bater com nenhum da lista, NÃO chame a ferramenta — responda em texto simples pedindo pra ele especificar o nome do cliente.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools: TOOLS,
      messages: [{ role: "user", content: texto }],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${errBody}`);
  }
  const data = await resp.json();
  const toolUse = (data.content || []).find((b: { type: string }) => b.type === "tool_use");

  if (!toolUse) {
    const textBlock = (data.content || []).find((b: { type: string }) => b.type === "text");
    return {
      tipo: "erro",
      mensagem: textBlock?.text || "Não entendi qual cliente. Pode especificar o nome?",
    };
  }

  const input = toolUse.input as Record<string, string>;
  const cliente = clientes.find((c) => c.id === input.clientId);
  if (!cliente) {
    return { tipo: "erro", mensagem: "Não encontrei esse cliente cadastrado. Pode conferir o nome?" };
  }

  const proposta = { ...input, data: new Date().toISOString().slice(0, 10) };
  const passoTexto = input.proximoPasso ? ` Próximo passo: ${input.proximoPasso}.` : "";
  return {
    tipo: "confirmar",
    proposta,
    mensagem: `Vou registrar: ${input.tipo} com ${cliente.nome}, resultado "${input.resultado}".${passoTexto} Confirma?`,
  };
}

async function gravarContato(
  admin: ReturnType<typeof createClient>,
  proposta: { clientId: string; tipo: string; resumo: string; resultado: string; proximoPasso?: string; data: string },
) {
  const id = crypto.randomUUID();
  const contato = {
    id,
    clientId: proposta.clientId,
    data: proposta.data,
    tipo: proposta.tipo,
    duracao: "",
    comQuem: "",
    resumo: proposta.resumo,
    oQueClienteDisse: "",
    produtosDiscutidos: "",
    objecoesLevantadas: "",
    pendente: "",
    resultado: proposta.resultado,
    combinado: "",
    proximoPasso: proposta.proximoPasso || "",
    dataProximoContato: "",
    responsavelProximoPasso: "Eu",
    obs: "Registrado via Copiloto (IA).",
  };
  const { error } = await admin.from("contatos").insert({ id, client_id: proposta.clientId, data: contato });
  if (error) throw error;
  return { mensagem: "Contato registrado." };
}
