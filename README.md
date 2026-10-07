# Controle de Depósito (PWA)

App para supervisores fazerem o **fechamento de caixas** e o **controle de envelopes**, com relatórios bonitos no final do dia.

## Como funciona

1. **Primeiro acesso**: cadastra o primeiro supervisor (nome + PIN).
2. **Cadastros**: operadores(as) de caixa e outros supervisores.
3. **Fechamento de Caixas**: para cada caixa lança PDV, operador(a), valor e supervisor. Ao final, *Gerar relatório*.
4. **Envelopes**: abre a câmera, lê o código de barras do envelope, informa o valor e adiciona. Ao final, *Gerar relatório*.
5. **Relatório**: imprimir / salvar em PDF ou compartilhar (WhatsApp etc.).
6. **Limpeza automática**: 24h depois de gerar o relatório, os dados daquele lançamento são apagados.

## Rodar no computador

Precisa ser servido por HTTP (não abra o `index.html` direto):

```bash
npx serve .
# ou
python -m http.server 8080
```

Abra `http://localhost:8080`.

> A **câmera** só funciona em `localhost` ou **HTTPS**. Para usar no celular, publique em um
> hospedeiro com HTTPS (Netlify, Vercel, GitHub Pages, Cloudflare Pages...) — é só subir a pasta.

## Banco de dados

Sem configuração, os dados ficam **só no aparelho** (localStorage).
Para usar o banco online (Supabase):

1. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL Editor.
2. Preencha `js/config.js` com `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

## Estrutura

```
index.html            página única
css/style.css         visual (laranja, verde e amarelo suaves)
js/config.js          chaves e configurações
js/db.js              camada de dados (local ou Supabase)
js/app.js             telas e regras
sw.js                 service worker (offline / instalável)
manifest.webmanifest  dados do app instalável
supabase/schema.sql   tabelas do banco
```
