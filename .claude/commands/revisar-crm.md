---
description: Audita o CRM (index.html + app.js) em busca de inconsistências de modelagem, transições de estado quebradas e conclusões ilógicas do funil.
---

Aja como engenheiro de prompts e auditor de lógica de negócio sênior. Revise o CRM deste projeto (`index.html`, `app.js`) em busca de inconsistências, incompatibilidades e conclusões ilógicas na modelagem de dados e no funil de vendas.

## Modelo de referência (confirmado no código)

- Duas entidades separadas: `state.leads` (prospects) e `state.clientesAtivos` (convertidos). Não são a mesma tabela.
- `LEAD_FUNIL_STAGES` (app.js:4) é a ÚNICA lista válida de etapas de um lead: Prospecção, Qualificação, Diagnóstico, Proposta enviada, Negociação, Fechamento.
- O campo `status` do lead (Ativo/Bloqueado/Inativo/Perdido/Convertido) é INDEPENDENTE do `etapaFunil` — nunca devem ser gravados no mesmo campo.
- A única conversão válida de lead → cliente é `converterLeadEmCliente()` (app.js:1750), que: cria o registro em `clientesAtivos`, seta `lead.status = "Convertido"`, vincula `lead.clienteAtivoId` / `novoCliente.leadOrigemId`, e revincula histórico (contatos, visitas, competitivas) ao novo id.
- Regra de negócio: só pode converter se `etapaFunil === "Fechamento" && status === "Ativo"` (app.js:1677).

## Bug já confirmado (usar como modelo do que procurar)

Em `index.html:1319-1330`, o select `visita-atualizar-etapa` (modal de Visita Técnica) mistura valores de `etapaFunil` com valores de `status` no mesmo campo, incluindo a opção "Cliente ativo". Em `app.js:3017-3025`, selecionar essa opção apenas grava `lead.etapaFunil = "Cliente ativo"` — um valor fora de `LEAD_FUNIL_STAGES` — sem chamar `converterLeadEmCliente()`. Consequência: o registro nunca migra para `clientesAtivos`, some do Kanban (que itera só `LEAD_FUNIL_STAGES`), não aparece na aba Clientes, mas continua contando como lead ativo em relatórios.

Confirme se esse bug ainda existe e corrija (a correção correta é: ao selecionar "Cliente ativo" nesse dropdown, chamar `converterLeadEmCliente(clientId)` em vez de atribuir a string a `etapaFunil`; e mover "Bloqueado"/"Inativo"/"Perdido" para atualizarem `lead.status`, não `lead.etapaFunil`). Depois procure ativamente por bugs da MESMA classe em outros lugares:

## O que investigar sistematicamente

1. **Todo write-path de `etapaFunil` e `status`**: `grep` por `.etapaFunil =` e `.status =` em `app.js`. Para cada ocorrência, confirme que o valor atribuído pertence ao enum correto (`LEAD_FUNIL_STAGES` para etapaFunil; Ativo/Bloqueado/Inativo/Perdido/Convertido para status de lead; Ativo/Inativo para status de cliente).
2. **Todo filtro por status/etapa**: `grep` por `.filter(` combinado com `status ===` ou `etapaFunil ===`. Verifique se cada filtro é consistente com o texto exibido ao usuário (ex: hint da aba "Leads" diz "Prospecção e Diagnóstico", mas o código realmente filtra por isso? A aba "Clientes" diz "Proposta enviada em diante" — isso bate com o filtro real, ou a aba Clientes lê só de `clientesAtivos` e essa frase do hint está desatualizada/enganosa?).
3. **Outros dropdowns/formulários que misturam campos diferentes num único select** (como o bug confirmado). Procure em `index.html` por `<select>` cujas opções pareçam vir de mais de um domínio conceitual (funil + status, ou status de lead + status de cliente + motivo de encerramento).
4. **Duplicação de listas de motivos**: `MOTIVO_ENCERRAMENTO_OPCOES` (lead) vs. opções de `inativar-motivo` (cliente) — são conceitualmente parecidas mas para entidades diferentes; confirme que nenhuma tela usa a lista errada para a entidade errada.
5. **Referências cruzadas órfãs**: `leadOrigemId`, `clienteAtivoId` — existe algum caminho de código (exclusão de lead/cliente, importação JSON) que apaga um lado do vínculo sem atualizar o outro, deixando um ID pendurado?
6. **Importação de JSON** (`import-json-file`, funções de migração como `migrateLegacyClientsIfNeeded` e o parser perto de `app.js:3474`): os enums usados na normalização (`ETAPA_NORMALIZE`, `statusMap`) cobrem todos os valores possíveis do arquivo exportado, ou algum valor cai no fallback errado silenciosamente?
7. **Contagens e relatórios**: (`renderDashboard`, `initRelatorioFunil`, KPIs) — algum total soma leads e clientes de fontes diferentes de um jeito que pode dar dado inconsistente com o que aparece nas listas (ex: contar "Ativo" sem excluir "Convertido", ou contar conversões do mês por `dataConversao` em `state.leads` quando deveria olhar `clientesAtivos`)?

## Formato do relatório

Para cada problema, reporte:
- **Onde**: arquivo:linha
- **O que está errado**: descrição objetiva
- **Por que é ilógico**: qual regra de negócio ou dado contraditório isso viola
- **Impacto real**: o que o usuário vê de errado na prática
- **Sugestão de correção**: mudança pontual

Liste todos os problemas encontrados primeiro. Não aplique nenhuma correção antes de eu confirmar quais quero que sejam feitas.
