# Como publicar o Copiloto (só o Bruno consegue fazer essas partes)

O código já está pronto e testado (com respostas simuladas). Faltam só os passos
que exigem sua conta — eu não tenho como fazer nenhum destes por você.

## 1. Pegar uma chave da Anthropic

1. Crie conta em https://console.anthropic.com (ou entre, se já tiver).
2. Cadastre um cartão em Billing (é cobrança por uso, sem mensalidade).
3. Em **API Keys**, crie uma chave nova. Copie o valor (começa com `sk-ant-...`).
4. Abra o arquivo `.env` desta pasta (já existe, com `SUPABASE_URL` e
   `SUPABASE_SERVICE_ROLE_KEY` preenchidos) e acrescente uma linha:
   ```
   ANTHROPIC_API_KEY=sk-ant-...(a chave que você copiou)...
   ```
   Esse arquivo já está protegido (nunca vai pro GitHub, ver `.gitignore`).

## 2. Instalar a ferramenta de linha de comando do Supabase

Rode isto uma vez, no PowerShell, dentro desta pasta do projeto:

```powershell
npm install -g supabase
supabase login
```

O `supabase login` abre o navegador pra você entrar com a conta do Supabase — só
precisa fazer isso uma vez neste computador.

## 3. Publicar a função e as chaves secretas

Ainda no PowerShell, dentro da pasta do projeto (`crm-nutricao-animal`):

```powershell
supabase functions deploy copiloto --project-ref wtnxenlaybqzjthxiurd
supabase secrets set --env-file .env --project-ref wtnxenlaybqzjthxiurd
```

O segundo comando lê o `.env` inteiro (as 3 chaves) e publica como segredo da
função — nenhuma delas aparece em lugar nenhum do código nem do GitHub.

## Pronto — como saber que funcionou

Abra o Manejo CRM, vá em qualquer tela (o painel "Assistente do Manejo" aparece
à direita no computador), digite algo como "liguei pro fulano, ele quer
aumentar o pedido" e mande. Se aparecer uma proposta pra confirmar em vez de só
abrir o formulário manual, funcionou.

Se não aparecer nada de diferente (continuar abrindo só o formulário manual),
volte aqui e me avise — provavelmente algum dos 3 passos acima não completou.

## Quanto isso custa

- A função em si (Supabase Edge Function): grátis no seu volume de uso (o plano
  gratuito cobre 500 mil execuções por mês).
- A chave da Anthropic: cobrada por uso. Pra um uso pessoal como o seu, deve
  ficar entre uns US$ 5 e 15 por mês. Acompanhe em console.anthropic.com ->
  Usage, e pode definir um limite de gasto mensal lá também, se quiser uma
  trava de segurança.
