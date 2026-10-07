(() => {
  'use strict';

  const CFG = window.APP_CONFIG || {};
  const RET_H = CFG.RETENCAO_HORAS || 24;
  const SCANNER_LIB = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
  const app = document.getElementById('app');

  // ================= Utilidades =================
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const somar = (itens) => itens.reduce((a, i) => a + Math.round((Number(i.valor) || 0) * 100), 0) / 100;
  const parseMoney = (s) => (parseInt(String(s).replace(/\D/g, ''), 10) || 0) / 100;
  const agoraISO = () => new Date().toISOString();
  const dataLonga = (iso) => { const s = new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); };
  const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR');
  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
  const pdvNorm = (s) => { s = String(s).trim(); return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s.toUpperCase(); };
  const pdvFmt = (p) => (/^\d+$/.test(p) ? p.padStart(2, '0') : p);
  const porPdv = (a, b) => (parseInt(a.pdv, 10) || 0) - (parseInt(b.pdv, 10) || 0) || String(a.pdv).localeCompare(b.pdv);
  const porCriacao = (a, b) => new Date(a.criado_em) - new Date(b.criado_em);
  const iniciais = (n) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  function restante(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'expirando';
    const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
    return h ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
  }

  // Hash simples do PIN (cyrb53) — evita guardar o PIN em texto puro
  function hashPin(pin) {
    const str = 'deposito:' + pin;
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  const ICONS = {
    back: '<path d="M15 18l-6-6 6-6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M14 8v8M17 8v8"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    print: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  };
  const ic = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

  // ================= UI helpers =================
  let toastTimer;
  function toast(msg, tipo = '') {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast show ${tipo}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = 'toast'), 2600);
  }

  function modal({ html, onMount, onClose }) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(bg);
    let aberto = true;
    const close = () => {
      if (!aberto) return;
      aberto = false;
      onClose && onClose();
      bg.remove();
    };
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    onMount && onMount(bg, close);
    return close;
  }

  function confirmar(titulo, msg, { ok = 'Confirmar', cls = 'primary' } = {}) {
    return new Promise((res) => {
      let resposta = false;
      modal({
        html: `<h3>${titulo}</h3><p>${msg}</p>
          <div class="btn-row"><button class="btn" data-close>Cancelar</button><button class="btn ${cls}" data-ok>${ok}</button></div>`,
        onMount: (bg, close) => { $('[data-ok]', bg).onclick = () => { resposta = true; close(); }; },
        onClose: () => res(resposta),
      });
    });
  }

  // Modal com formulário. campos: [{name, label, type, value, attrs}]
  function formModal(titulo, campos, ok = 'Salvar') {
    return new Promise((res) => {
      let dados = null;
      modal({
        html: `<h3>${titulo}</h3><form style="margin-top:14px">
          ${campos.map((c) => `<label>${c.label}<input name="${c.name}" type="${c.type || 'text'}" value="${esc(c.value || '')}" ${c.attrs || ''} autocomplete="off"></label>`).join('')}
          <div class="btn-row"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">${ok}</button></div></form>`,
        onMount: (bg, close) => {
          const f = $('form', bg);
          setTimeout(() => f.elements[0].focus(), 50);
          f.onsubmit = (e) => {
            e.preventDefault();
            dados = Object.fromEntries(new FormData(f));
            close();
          };
        },
        onClose: () => res(dados),
      });
    });
  }

  function bip() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 1100; g.gain.value = 0.15;
      o.start(); o.stop(ctx.currentTime + 0.12);
    } catch { /* sem áudio */ }
  }

  // Máscara de dinheiro: digita só números e vira R$ 0,00
  document.addEventListener('input', (e) => {
    if (!e.target.classList.contains('money')) return;
    const v = parseMoney(e.target.value);
    e.target.value = v ? brl(v) : '';
  });

  // Trava duplo clique em botões de envio enquanto salva
  async function comTrava(btn, fn) {
    if (btn) btn.disabled = true;
    try { await fn(); } catch (err) { console.error(err); toast('Ops! Não foi possível salvar. Tente de novo.', 'err'); }
    finally { if (btn && btn.isConnected) btn.disabled = false; }
  }

  // ================= Sessão / roteamento =================
  const S = { user: null, edit: null };
  let rotaAtual = '';
  let installPrompt = null;

  async function carregarSessao() {
    const id = localStorage.getItem('dep_sessao');
    if (!id) return;
    const [u] = await DB.list('usuarios', { id });
    if (u && u.tipo === 'supervisor') S.user = u;
    else localStorage.removeItem('dep_sessao');
  }

  function ir(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function entrar(u) {
    S.user = u;
    localStorage.setItem('dep_sessao', u.id);
    localStorage.setItem('dep_ultimo', u.id);
    toast(`Olá, ${u.nome.split(' ')[0]}!`, 'ok');
    ir('#/');
  }

  async function render() {
    const [rota = '', param] = location.hash.replace(/^#\/?/, '').split('/');
    try {
      const sups = await DB.list('usuarios', { tipo: 'supervisor' });
      if (!sups.length) return viewSetup();
      if (!S.user) return viewLogin(sups);
      const views = { caixas: viewCaixas, envelopes: viewEnvelopes, cadastros: viewCadastros, relatorios: viewRelatorios, relatorio: viewRelatorio };
      await (views[rota] || viewHome)(param);
      if (rotaAtual !== location.hash) { window.scrollTo(0, 0); rotaAtual = location.hash; }
    } catch (err) {
      console.error(err);
      app.innerHTML = `<div class="auth"><div class="card center"><div class="logo">${ic('box')}</div>
        <h1>Não foi possível carregar</h1><p class="muted">Verifique a internet e tente novamente.</p>
        <button class="btn primary block" onclick="location.reload()">Tentar de novo</button></div></div>`;
    }
  }

  function shell({ title, sub = '', back = '#/', right = '', body, footer = '', wide = false }) {
    app.className = wide ? 'wide' : '';
    app.innerHTML = `
      <header class="topbar${wide ? ' flat' : ''}"><div class="topbar-row">
        ${back ? `<a class="icon-btn" href="${back}" aria-label="Voltar">${ic('back')}</a>` : ''}
        <h1>${title}</h1>${right}
      </div>${sub ? `<div class="sub">${sub}</div>` : ''}</header>
      <main>${body}</main>
      ${footer ? `<div class="footer-bar">${footer}</div>` : ''}`;
  }

  async function loteAberto(tipo, criar = false) {
    const ls = await DB.list('lotes', { tipo, supervisor_id: S.user.id, fechado_em: null });
    if (ls.length) return ls.sort(porCriacao)[0];
    if (!criar) return null;
    return DB.insert('lotes', { tipo, supervisor_id: S.user.id, supervisor_nome: S.user.nome, fechado_em: null, expira_em: null });
  }

  async function encerrarLote(lote, qtd, total, nomeItem) {
    const ok = await confirmar(
      'Gerar relatório?',
      `São <b>${qtd} ${nomeItem}</b> somando <b>${brl(total)}</b>.<br><br>O lançamento será encerrado e o relatório ficará disponível por <b>${RET_H} horas</b>. Depois disso os dados são apagados automaticamente.`,
      { ok: 'Gerar relatório', cls: 'success' }
    );
    if (!ok) return;
    await DB.update('lotes', lote.id, {
      fechado_em: agoraISO(),
      expira_em: new Date(Date.now() + RET_H * 3600e3).toISOString(),
    });
    toast('Relatório gerado!', 'ok');
    ir('#/relatorio/' + lote.id);
  }

  // ================= Primeiro acesso =================
  function viewSetup() {
    app.innerHTML = `<div class="auth"><div class="card">
      <div class="logo">${ic('box')}</div>
      <h1>Bem-vindo(a)!</h1>
      <p class="center muted">Vamos cadastrar o primeiro supervisor do sistema.</p>
      <form id="f">
        <label>Nome completo<input name="nome" required placeholder="Seu nome" autocomplete="name"></label>
        <label>Crie um PIN (4 a 6 números)<input name="pin" class="pin" type="password" inputmode="numeric" maxlength="6" required></label>
        <label>Repita o PIN<input name="pin2" class="pin" type="password" inputmode="numeric" maxlength="6" required></label>
        <button class="btn primary block">Começar</button>
      </form></div></div>`;
    $('#f').onsubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      const nome = f.nome.value.trim(), pin = f.pin.value, pin2 = f.pin2.value;
      if (!/^\d{4,6}$/.test(pin)) return toast('O PIN deve ter de 4 a 6 números', 'err');
      if (pin !== pin2) return toast('Os PINs não conferem', 'err');
      comTrava($('button', f), async () => {
        entrar(await DB.insert('usuarios', { nome, tipo: 'supervisor', pin_hash: hashPin(pin) }));
      });
    };
  }

  // ================= Login =================
  function viewLogin(sups) {
    sups.sort(porNome);
    let sel = sups.length === 1 ? sups[0].id : localStorage.getItem('dep_ultimo');
    if (!sups.some((s) => s.id === sel)) sel = '';
    app.innerHTML = `<div class="auth"><div class="card">
      <div class="logo">${ic('box')}</div>
      <h1>${esc(CFG.NOME_EMPRESA || 'Controle de Depósito')}</h1>
      <p class="center muted">Quem está entrando?</p>
      <div class="chips">${sups.map((s) => `<button type="button" class="chip ${s.id === sel ? 'on' : ''}" data-id="${s.id}">${esc(s.nome)}</button>`).join('')}</div>
      <form id="f">
        <label>PIN<input id="pin" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label>
        <button class="btn primary block">Entrar</button>
      </form></div></div>`;
    app.onclick = (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      sel = chip.dataset.id;
      app.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === chip));
      $('#pin').focus();
    };
    $('#f').onsubmit = (e) => {
      e.preventDefault();
      const s = sups.find((x) => x.id === sel);
      if (!s) return toast('Toque no seu nome primeiro', 'err');
      if (s.pin_hash !== hashPin($('#pin').value)) {
        $('#pin').value = '';
        return toast('PIN incorreto', 'err');
      }
      entrar(s);
    };
  }

  // ================= Início =================
  async function viewHome() {
    const [lc, le] = await Promise.all([loteAberto('caixas'), loteAberto('envelopes')]);
    const [ic_, ie] = await Promise.all([
      lc ? DB.list('itens_caixa', { lote_id: lc.id }) : [],
      le ? DB.list('envelopes', { lote_id: le.id }) : [],
    ]);
    const h = new Date().getHours();
    const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    // Só o primeiro nome (nunca e-mail completo); sem nome → "Administrador"
    const primeiro = (S.user.nome || '').split('@')[0].trim().split(/\s+/)[0] || 'Administrador';
    const totalDia = somar(ic_) + somar(ie);
    // Contador discreto: verde = há lançamentos, cinza = nada ainda
    const contador = (n, total) => n
      ? `<span class="a-count"><span class="dot ok"></span>${n} hoje · ${brl(total)}</span>`
      : `<span class="a-count"><span class="dot idle"></span>0 hoje</span>`;
    const acao = (href, icone, titulo, desc, itens) => `
      <a class="panel action" href="${href}">
        <div class="a-top"><span class="a-ico">${ic(icone)}</span>${contador(itens.length, somar(itens))}</div>
        <div><h3>${titulo}</h3><p>${desc}</p></div>
        <span class="a-go">Abrir ${ic('back')}</span>
      </a>`;
    const link = (href, icone, titulo, desc) => `
      <li><a href="${href}"><span class="l-ico">${ic(icone)}</span><div><b>${titulo}</b><span>${desc}</span></div><span class="chev">${ic('back')}</span></a></li>`;

    shell({
      back: '',
      wide: true,
      title: `${saud}, ${esc(primeiro)}<small>${dataLonga(agoraISO())}</small>`,
      right: `${installPrompt ? `<button class="hbtn" data-act="instalar" aria-label="Instalar app">${ic('download')}<span>Instalar</span></button>` : ''}
              <button class="hbtn" data-act="sair" aria-label="Sair">${ic('logout')}<span>Sair</span></button>`,
      body: `
        <div class="h-label">Resumo do dia</div>
        <section class="panel kstrip" aria-label="Resumo do dia">
          <div><div class="k">Total do dia</div><div class="v hl">${brl(totalDia)}</div></div>
          <div><div class="k">Caixas lançados</div><div class="v">${ic_.length}</div></div>
          <div><div class="k"><span class="dot ${ie.length ? 'pend' : 'idle'}"></span>Envelopes pendentes</div><div class="v">${ie.length}</div></div>
        </section>

        <div class="h-label">Lançamentos</div>
        <div class="actions">
          ${acao('#/caixas', 'cash', 'Fechamento de Caixas', 'Conferir PDV, operador(a), valor e supervisor de cada caixa.', ic_)}
          ${acao('#/envelopes', 'mail', 'Envelopes', 'Ler o código de barras e registrar o valor de cada envelope.', ie)}
        </div>

        <div class="h-label">Gerenciar</div>
        <ul class="panel links">
          ${link('#/cadastros', 'users', 'Cadastros', 'Operadores de caixa e supervisores')}
          ${link('#/relatorios', 'file', 'Relatórios', `Gerados nas últimas ${RET_H}h`)}
        </ul>
        <p class="mode-note">${DB.online ? 'Conectado ao banco de dados online' : 'Modo local · dados salvos apenas neste aparelho'}</p>`,
    });

    app.onclick = async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'sair' && (await confirmar('Sair do sistema?', 'Os lançamentos em andamento continuam salvos.', { ok: 'Sair' }))) {
        S.user = null;
        localStorage.removeItem('dep_sessao');
        ir('#/');
      }
      if (act === 'instalar' && installPrompt) {
        installPrompt.prompt();
        installPrompt = null;
      }
    };
  }

  // ================= Fechamento de caixas =================
  async function viewCaixas() {
    const lote = await loteAberto('caixas');
    const [itens, usuarios] = await Promise.all([
      lote ? DB.list('itens_caixa', { lote_id: lote.id }) : [],
      DB.list('usuarios'),
    ]);
    itens.sort(porPdv);
    const ops = usuarios.filter((u) => u.tipo === 'operador').sort(porNome);
    const sups = usuarios.filter((u) => u.tipo === 'supervisor').sort(porNome);
    const ed = S.edit?.tabela === 'itens_caixa' ? itens.find((i) => i.id === S.edit.id) : null;
    const total = somar(itens);

    const usados = new Set(itens.map((i) => i.pdv));
    let prox = 1;
    while (usados.has(String(prox))) prox++;

    const opSel = ed ? ed.operador_id : '';
    const supSel = ed ? ed.supervisor_id : S.user.id;

    shell({
      title: 'Fechamento de Caixas',
      sub: lote ? `Iniciado às ${hora(lote.criado_em)}` : 'Lance cada caixa conferido',
      body: `
        <form class="card" id="f">
          <h2>${ed ? `Editando PDV ${pdvFmt(ed.pdv)}` : 'Lançar caixa'}</h2>
          <div class="grid2">
            <label>PDV<input name="pdv" inputmode="numeric" required autocomplete="off" value="${esc(pdvFmt(ed ? ed.pdv : String(prox)))}"></label>
            <label>Valor<input name="valor" class="money" inputmode="numeric" placeholder="R$ 0,00" autocomplete="off" value="${ed ? brl(ed.valor) : ''}"></label>
          </div>
          <div class="field"><span>Operador(a) do caixa</span>
            <div class="row">
              <select name="operador"><option value="">${ops.length ? 'Selecione…' : 'Cadastre no botão +'}</option>
                ${ops.map((o) => `<option value="${o.id}" ${o.id === opSel ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}
                ${ed && !ops.some((o) => o.id === ed.operador_id) ? `<option value="${ed.operador_id}" selected>${esc(ed.operador_nome)}</option>` : ''}
              </select>
              <button type="button" class="btn square yellow" data-act="novo-op" aria-label="Cadastrar operador">${ic('plus')}</button>
            </div>
          </div>
          <label>Supervisor<select name="supervisor">
            ${sups.map((s) => `<option value="${s.id}" ${s.id === supSel ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
          </select></label>
          ${ed
            ? `<div class="btn-row"><button type="button" class="btn" data-act="cancelar">Cancelar</button><button class="btn primary">${ic('check')} Salvar</button></div>`
            : `<button class="btn primary block">${ic('plus')} Adicionar caixa</button>`}
        </form>

        <div class="summary">
          <div><div class="lbl">Total conferido</div><div class="val">${brl(total)}</div></div>
          <div class="count">${itens.length}<small>${itens.length === 1 ? 'caixa' : 'caixas'}</small></div>
        </div>

        ${itens.length ? `<ul class="list">${itens.map((i) => `
          <li class="item ${ed?.id === i.id ? 'editing' : ''}">
            <div class="badge"><div><small>PDV</small>${esc(pdvFmt(i.pdv))}</div></div>
            <div class="info"><b>${esc(i.operador_nome)}</b><span>Sup. ${esc(i.supervisor_nome)} · ${hora(i.criado_em)}</span></div>
            <div class="side">
              <div class="amount">${brl(i.valor)}</div>
              <div class="acts">
                <button data-edit="${i.id}" aria-label="Editar">${ic('edit')}</button>
                <button class="del" data-del="${i.id}" aria-label="Excluir">${ic('trash')}</button>
              </div>
            </div>
          </li>`).join('')}</ul>`
        : `<div class="empty">${ic('cash')}<div>Nenhum caixa lançado ainda.<br>Comece pelo PDV 01!</div></div>`}`,
      footer: `<button class="btn success" data-act="gerar" ${itens.length ? '' : 'disabled'}>${ic('file')} Gerar relatório do dia</button>`,
    });

    const f = $('#f');
    f.onsubmit = (e) => {
      e.preventDefault();
      comTrava($('button:not([type=button])', f), async () => {
        const pdv = pdvNorm(f.pdv.value);
        const valor = parseMoney(f.valor.value);
        const op = ops.find((o) => o.id === f.operador.value) || (ed && ed.operador_id === f.operador.value && { id: ed.operador_id, nome: ed.operador_nome });
        const sup = sups.find((s) => s.id === f.supervisor.value);
        if (!pdv) return toast('Informe o número do PDV', 'err');
        if (!op) return toast('Selecione quem estava no caixa', 'err');
        if (!sup) return toast('Selecione o supervisor', 'err');
        if (!valor && !(await confirmar('Valor zerado', `O PDV ${pdvFmt(pdv)} está com valor R$ 0,00. Lançar assim mesmo?`))) return;
        if (itens.some((i) => i.pdv === pdv && i.id !== ed?.id) &&
            !(await confirmar('PDV repetido', `O PDV ${pdvFmt(pdv)} já foi lançado. Deseja lançar outro mesmo assim?`))) return;

        const dados = { pdv, valor, operador_id: op.id, operador_nome: op.nome, supervisor_id: sup.id, supervisor_nome: sup.nome };
        if (ed) {
          await DB.update('itens_caixa', ed.id, dados);
          S.edit = null;
          toast('Caixa atualizado', 'ok');
        } else {
          const l = await loteAberto('caixas', true);
          await DB.insert('itens_caixa', { ...dados, lote_id: l.id });
          toast(`PDV ${pdvFmt(pdv)} lançado · ${brl(valor)}`, 'ok');
        }
        await render();
      });
    };

    app.onclick = async (e) => {
      const t = e.target.closest('[data-act],[data-edit],[data-del]');
      if (!t) return;
      if (t.dataset.edit) { S.edit = { tabela: 'itens_caixa', id: t.dataset.edit }; await render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (t.dataset.del) {
        const i = itens.find((x) => x.id === t.dataset.del);
        if (!(await confirmar('Excluir caixa?', `PDV ${pdvFmt(i.pdv)} · ${esc(i.operador_nome)} · ${brl(i.valor)}`, { ok: 'Excluir', cls: 'danger' }))) return;
        await DB.remove('itens_caixa', i.id);
        if (itens.length === 1) await DB.remove('lotes', lote.id);
        if (S.edit?.id === i.id) S.edit = null;
        toast('Caixa excluído');
        await render();
      }
      if (t.dataset.act === 'cancelar') { S.edit = null; await render(); }
      if (t.dataset.act === 'gerar') await encerrarLote(lote, itens.length, total, itens.length === 1 ? 'caixa' : 'caixas');
      if (t.dataset.act === 'novo-op') {
        const d = await formModal('Novo operador(a)', [{ name: 'nome', label: 'Nome de quem trabalha no caixa', attrs: 'required' }], 'Cadastrar');
        if (!d?.nome.trim()) return;
        const u = await DB.insert('usuarios', { nome: d.nome.trim(), tipo: 'operador' });
        ops.push(u);
        f.operador.add(new Option(u.nome, u.id, true, true));
        toast(`${u.nome} cadastrado(a)`, 'ok');
      }
    };
  }

  // ================= Envelopes =================
  async function viewEnvelopes() {
    const lote = await loteAberto('envelopes');
    const itens = lote ? await DB.list('envelopes', { lote_id: lote.id }) : [];
    itens.sort(porCriacao);
    const ed = S.edit?.tabela === 'envelopes' ? itens.find((i) => i.id === S.edit.id) : null;
    const total = somar(itens);

    shell({
      title: 'Envelopes',
      sub: lote ? `Iniciado às ${hora(lote.criado_em)}` : 'Leia o código e informe o valor',
      body: `
        <form class="card" id="f">
          <h2>${ed ? 'Editando envelope' : 'Novo envelope'}</h2>
          ${ed ? '' : `<button type="button" class="btn yellow block" data-act="scan" style="margin-bottom:14px">${ic('scan')} Escanear código de barras</button>`}
          <label>Código do envelope<input name="codigo" required autocomplete="off" placeholder="Leia com a câmera ou digite" value="${esc(ed?.codigo || '')}"></label>
          <label>Valor do envelope<input name="valor" class="money" inputmode="numeric" placeholder="R$ 0,00" autocomplete="off" value="${ed ? brl(ed.valor) : ''}"></label>
          ${ed
            ? `<div class="btn-row"><button type="button" class="btn" data-act="cancelar">Cancelar</button><button class="btn primary">${ic('check')} Salvar</button></div>`
            : `<button class="btn primary block">${ic('plus')} Adicionar envelope</button>`}
        </form>

        <div class="summary">
          <div><div class="lbl">Total em envelopes</div><div class="val">${brl(total)}</div></div>
          <div class="count">${itens.length}<small>${itens.length === 1 ? 'envelope' : 'envelopes'}</small></div>
        </div>

        ${itens.length ? `<ul class="list">${itens.map((i, n) => ({ i, n })).reverse().map(({ i, n }) => `
          <li class="item ${ed?.id === i.id ? 'editing' : ''}">
            <div class="badge yellow">${n + 1}</div>
            <div class="info"><b class="code">${esc(i.codigo)}</b><span>${hora(i.criado_em)} · ${esc(i.supervisor_nome)}</span></div>
            <div class="side">
              <div class="amount">${brl(i.valor)}</div>
              <div class="acts">
                <button data-edit="${i.id}" aria-label="Editar">${ic('edit')}</button>
                <button class="del" data-del="${i.id}" aria-label="Excluir">${ic('trash')}</button>
              </div>
            </div>
          </li>`).join('')}</ul>`
        : `<div class="empty">${ic('mail')}<div>Nenhum envelope ainda.<br>Toque em “Escanear” para começar.</div></div>`}`,
      footer: `<button class="btn success" data-act="gerar" ${itens.length ? '' : 'disabled'}>${ic('file')} Gerar relatório de envelopes</button>`,
    });

    const f = $('#f');
    f.onsubmit = (e) => {
      e.preventDefault();
      comTrava($('button:not([type=button])', f), async () => {
        const codigo = f.codigo.value.trim();
        const valor = parseMoney(f.valor.value);
        if (!codigo) return toast('Informe o código do envelope', 'err');
        if (itens.some((i) => i.codigo === codigo && i.id !== ed?.id)) return toast('Esse envelope já foi lançado!', 'err');
        if (!valor && !(await confirmar('Valor zerado', 'Este envelope está com R$ 0,00. Lançar assim mesmo?'))) return;
        if (ed) {
          await DB.update('envelopes', ed.id, { codigo, valor });
          S.edit = null;
          toast('Envelope atualizado', 'ok');
        } else {
          const l = await loteAberto('envelopes', true);
          await DB.insert('envelopes', { lote_id: l.id, codigo, valor, supervisor_id: S.user.id, supervisor_nome: S.user.nome });
          toast(`Envelope adicionado · ${brl(valor)}`, 'ok');
        }
        await render();
      });
    };

    app.onclick = async (e) => {
      const t = e.target.closest('[data-act],[data-edit],[data-del]');
      if (!t) return;
      if (t.dataset.act === 'scan') {
        abrirScanner((codigo) => {
          f.codigo.value = codigo;
          if (itens.some((i) => i.codigo === codigo)) toast('Atenção: esse envelope já foi lançado!', 'err');
          else toast('Código lido!', 'ok');
          f.valor.focus();
        });
      }
      if (t.dataset.edit) { S.edit = { tabela: 'envelopes', id: t.dataset.edit }; await render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (t.dataset.del) {
        const i = itens.find((x) => x.id === t.dataset.del);
        if (!(await confirmar('Excluir envelope?', `${esc(i.codigo)} · ${brl(i.valor)}`, { ok: 'Excluir', cls: 'danger' }))) return;
        await DB.remove('envelopes', i.id);
        if (itens.length === 1) await DB.remove('lotes', lote.id);
        if (S.edit?.id === i.id) S.edit = null;
        toast('Envelope excluído');
        await render();
      }
      if (t.dataset.act === 'cancelar') { S.edit = null; await render(); }
      if (t.dataset.act === 'gerar') await encerrarLote(lote, itens.length, total, itens.length === 1 ? 'envelope' : 'envelopes');
    };
  }

  function carregarScript(src) {
    return new Promise((res, rej) => {
      if (window.Html5Qrcode) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function abrirScanner(onCode) {
    if (!window.isSecureContext) return toast('A câmera só funciona com o app aberto em HTTPS', 'err');
    let scanner = null, fechado = false, lido = false;
    const parar = async () => {
      try { if (scanner?.isScanning) await scanner.stop(); scanner?.clear(); } catch { /* já parado */ }
    };
    const close = modal({
      html: `<h3>Escanear envelope</h3><p>Aponte a câmera para o código de barras do envelope.</p>
        <div class="scanner-box"><div id="reader"></div></div>
        <button class="btn block" data-close>Cancelar</button>`,
      onClose: () => { fechado = true; parar(); },
    });
    try {
      await carregarScript(SCANNER_LIB);
      if (fechado) return;
      scanner = new Html5Qrcode('reader', { verbose: false, experimentalFeatures: { useBarCodeDetectorIfSupported: true } });
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: (w, h) => ({ width: Math.floor(w * 0.88), height: Math.max(60, Math.floor(Math.min(h * 0.45, 170))) }) },
        (texto) => {
          if (lido) return;
          lido = true;
          bip();
          navigator.vibrate?.(70);
          close();
          onCode(texto.trim());
        },
        () => {}
      );
      if (fechado) parar();
    } catch (err) {
      console.error(err);
      close();
      const negado = String(err).match(/NotAllowed|Permission/i);
      toast(negado ? 'Permita o acesso à câmera nas configurações' : 'Não foi possível abrir a câmera', 'err');
    }
  }

  // ================= Cadastros =================
  async function viewCadastros(aba = 'operadores') {
    const tipo = aba === 'supervisores' ? 'supervisor' : 'operador';
    const lista = (await DB.list('usuarios', { tipo })).sort(porNome);
    const sup = tipo === 'supervisor';

    shell({
      title: 'Cadastros',
      sub: 'Quem trabalha nos caixas e quem usa o app',
      body: `
        <div class="tabs">
          <a href="#/cadastros/operadores" class="${sup ? '' : 'on'}">Operadores</a>
          <a href="#/cadastros/supervisores" class="${sup ? 'on' : ''}">Supervisores</a>
        </div>
        <form class="card" id="f">
          <h2>${sup ? 'Novo supervisor' : 'Novo operador(a) de caixa'}</h2>
          <label>Nome<input name="nome" required autocomplete="off" placeholder="Nome completo"></label>
          ${sup ? `<label>PIN de acesso (4 a 6 números)<input name="pin" class="pin" type="password" inputmode="numeric" maxlength="6" required></label>` : ''}
          <button class="btn primary block">${ic('plus')} Cadastrar</button>
        </form>
        <div class="section-title"><h3>${sup ? 'Supervisores' : 'Operadores'}</h3><span class="pill gray">${lista.length}</span></div>
        ${lista.length ? `<ul class="list">${lista.map((u) => `
          <li class="item">
            <div class="badge ${sup ? '' : 'yellow'}">${esc(iniciais(u.nome))}</div>
            <div class="info"><b>${esc(u.nome)}</b><span>${sup ? (u.id === S.user.id ? 'Você · supervisor' : 'Supervisor') : 'Operador(a) de caixa'}</span></div>
            <div class="acts">
              <button data-edit="${u.id}" aria-label="Editar">${ic('edit')}</button>
              ${u.id === S.user.id ? '' : `<button class="del" data-del="${u.id}" aria-label="Excluir">${ic('trash')}</button>`}
            </div>
          </li>`).join('')}</ul>`
        : `<div class="empty">${ic('users')}<div>Ninguém cadastrado ainda.</div></div>`}`,
    });

    const f = $('#f');
    f.onsubmit = (e) => {
      e.preventDefault();
      const nome = f.nome.value.trim();
      if (!nome) return;
      if (sup && !/^\d{4,6}$/.test(f.pin.value)) return toast('O PIN deve ter de 4 a 6 números', 'err');
      if (lista.some((u) => u.nome.toLowerCase() === nome.toLowerCase())) return toast('Já existe alguém com esse nome', 'err');
      comTrava($('button', f), async () => {
        await DB.insert('usuarios', sup ? { nome, tipo, pin_hash: hashPin(f.pin.value) } : { nome, tipo });
        toast(`${nome} cadastrado(a)!`, 'ok');
        await render();
        $('#f input')?.focus();
      });
    };

    app.onclick = async (e) => {
      const t = e.target.closest('[data-edit],[data-del]');
      if (!t) return;
      const u = lista.find((x) => x.id === (t.dataset.edit || t.dataset.del));
      if (t.dataset.del) {
        if (!(await confirmar(`Excluir ${esc(u.nome)}?`, 'Os lançamentos já feitos continuam com o nome registrado.', { ok: 'Excluir', cls: 'danger' }))) return;
        await DB.remove('usuarios', u.id);
        toast('Cadastro excluído');
        return render();
      }
      const campos = [{ name: 'nome', label: 'Nome', value: u.nome, attrs: 'required' }];
      if (sup) campos.push({ name: 'pin', label: 'Novo PIN (deixe vazio para manter)', type: 'password', attrs: 'inputmode="numeric" maxlength="6" class="pin"' });
      const d = await formModal('Editar cadastro', campos);
      if (!d) return;
      const patch = { nome: d.nome.trim() || u.nome };
      if (sup && d.pin) {
        if (!/^\d{4,6}$/.test(d.pin)) return toast('O PIN deve ter de 4 a 6 números', 'err');
        patch.pin_hash = hashPin(d.pin);
      }
      const novo = await DB.update('usuarios', u.id, patch);
      if (u.id === S.user.id) S.user = novo;
      toast('Cadastro atualizado', 'ok');
      render();
    };
  }

  // ================= Relatórios =================
  async function viewRelatorios() {
    const lotes = (await DB.list('lotes')).filter((l) => l.fechado_em).sort((a, b) => new Date(b.fechado_em) - new Date(a.fechado_em));
    const resumo = await Promise.all(lotes.map(async (l) => {
      const itens = await DB.list(l.tipo === 'caixas' ? 'itens_caixa' : 'envelopes', { lote_id: l.id });
      return { l, qtd: itens.length, total: somar(itens) };
    }));

    shell({
      title: 'Relatórios',
      sub: `Ficam disponíveis por ${RET_H}h após serem gerados`,
      body: resumo.length ? `<ul class="list">${resumo.map(({ l, qtd, total }) => `
          <li><a class="item" href="#/relatorio/${l.id}" style="text-decoration:none;color:inherit">
            <div class="badge ${l.tipo === 'caixas' ? '' : 'yellow'}">${ic(l.tipo === 'caixas' ? 'cash' : 'mail')}</div>
            <div class="info"><b>${l.tipo === 'caixas' ? 'Fechamento de caixas' : 'Envelopes'}</b>
              <span>${dataCurta(l.fechado_em)} às ${hora(l.fechado_em)} · ${esc(l.supervisor_nome)} · ${qtd} ${l.tipo === 'caixas' ? 'caixas' : 'env.'}</span>
              <span class="pill yellow" style="margin-top:6px;display:inline-flex">Apaga em ${restante(l.expira_em)}</span></div>
            <div class="amount">${brl(total)}</div>
          </a></li>`).join('')}</ul>`
        : `<div class="card empty">${ic('file')}<div>Nenhum relatório nas últimas ${RET_H}h.</div></div>`,
    });
    app.onclick = null;
  }

  async function viewRelatorio(id) {
    const [lote] = await DB.list('lotes', { id });
    if (!lote) {
      shell({ title: 'Relatório', body: `<div class="card empty">${ic('file')}<div>Relatório não encontrado.<br>Ele pode ter sido apagado após ${RET_H}h.</div></div>` });
      app.onclick = null;
      return;
    }
    const caixas = lote.tipo === 'caixas';
    const itens = await DB.list(caixas ? 'itens_caixa' : 'envelopes', { lote_id: id });
    itens.sort(caixas ? porPdv : porCriacao);
    const total = somar(itens);
    const qtd = itens.length;
    const media = qtd ? total / qtd : 0;
    const maior = itens.reduce((m, i) => (Number(i.valor) > Number(m?.valor ?? -1) ? i : m), null);
    const supervisores = [...new Set([lote.supervisor_nome, ...itens.map((i) => i.supervisor_nome)].filter(Boolean))];
    const ref = lote.fechado_em || agoraISO();
    const titulo = caixas ? 'Fechamento de Caixas' : 'Relatório de Envelopes';

    const tabela = caixas
      ? `<table class="rt"><thead><tr><th>PDV</th><th>Operador(a)</th><th class="hide-sm">Supervisor</th><th class="hide-sm">Hora</th><th class="num">Valor</th></tr></thead>
          <tbody>${itens.map((i) => `<tr><td class="pdv">${esc(pdvFmt(i.pdv))}</td><td>${esc(i.operador_nome)}</td><td class="hide-sm">${esc(i.supervisor_nome)}</td><td class="hide-sm">${hora(i.criado_em)}</td><td class="num">${brl(i.valor)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2">Total geral</td><td class="hide-sm"></td><td class="hide-sm"></td><td class="num">${brl(total)}</td></tr></tfoot></table>`
      : `<table class="rt"><thead><tr><th>#</th><th>Código do envelope</th><th class="hide-sm">Hora</th><th class="num">Valor</th></tr></thead>
          <tbody>${itens.map((i, n) => `<tr><td class="pdv">${n + 1}</td><td class="code">${esc(i.codigo)}</td><td class="hide-sm">${hora(i.criado_em)}</td><td class="num">${brl(i.valor)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2">Total geral</td><td class="hide-sm"></td><td class="num">${brl(total)}</td></tr></tfoot></table>`;

    shell({
      title: 'Relatório',
      sub: lote.expira_em ? `Disponível por mais ${restante(lote.expira_em)}` : '',
      body: `
        <article class="report">
          <div class="report-head">
            <div class="brand"><div class="mini">${ic('box')}</div>${esc(CFG.NOME_EMPRESA || 'Controle de Depósito')}</div>
            <h2>${titulo}</h2>
            <div class="date">${dataLonga(ref)}</div>
          </div>
          <div class="report-body">
            <div class="kpis">
              <div class="kpi green"><div class="k">Valor total</div><div class="v">${brl(total)}</div></div>
              <div class="kpi orange"><div class="k">${caixas ? 'Caixas' : 'Envelopes'}</div><div class="v">${qtd}</div></div>
              <div class="kpi yellow"><div class="k">Média</div><div class="v">${brl(media)}</div></div>
            </div>
            <div class="meta">
              <div><span>Supervisor${supervisores.length > 1 ? 'es' : ''}</span><b>${supervisores.map(esc).join(', ')}</b></div>
              <div><span>Período</span><b>${hora(lote.criado_em)} às ${hora(ref)}</b></div>
              ${maior ? `<div><span>Maior valor</span><b>${brl(maior.valor)} ${caixas ? `· PDV ${esc(pdvFmt(maior.pdv))}` : ''}</b></div>` : ''}
              <div><span>Emitido em</span><b>${dataCurta(ref)} às ${hora(ref)}</b></div>
            </div>
            ${tabela}
            <div class="signs"><div>Supervisor</div><div>Conferente / Gerência</div></div>
          </div>
          <div class="report-foot">Gerado pelo app ${esc(CFG.NOME_EMPRESA || 'Controle de Depósito')} · ${dataCurta(ref)} ${hora(ref)}</div>
        </article>
        <div class="notice no-print" style="margin-top:14px">${ic('clock')}<div>Salve em PDF ou compartilhe — este relatório será apagado automaticamente ${lote.expira_em ? `em ${restante(lote.expira_em)}` : `${RET_H}h após gerado`}.</div></div>
        <div class="report-actions no-print">
          <button class="btn primary" data-act="imprimir">${ic('print')} Imprimir / PDF</button>
          <button class="btn success" data-act="compartilhar">${ic('share')} Compartilhar</button>
        </div>
        <a class="btn ghost block no-print" href="#/" style="margin-top:6px;text-decoration:none">${ic('home')} Voltar ao início</a>`,
    });

    app.onclick = async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'imprimir') {
        const original = document.title;
        document.title = `${caixas ? 'Fechamento-Caixas' : 'Envelopes'}-${dataCurta(ref).replace(/\//g, '-')}`;
        window.print();
        setTimeout(() => (document.title = original), 1000);
      }
      if (act === 'compartilhar') {
        const linhas = caixas
          ? itens.map((i) => `PDV ${pdvFmt(i.pdv)} · ${i.operador_nome} — ${brl(i.valor)}`)
          : itens.map((i, n) => `${n + 1}. ${i.codigo} — ${brl(i.valor)}`);
        const texto = [`*${titulo}*`, dataLonga(ref), `Supervisor: ${supervisores.join(', ')}`, '', ...linhas, '',
          `*Total: ${brl(total)}* (${qtd} ${caixas ? 'caixas' : 'envelopes'})`].join('\n');
        try {
          if (navigator.share) await navigator.share({ title: titulo, text: texto });
          else { await navigator.clipboard.writeText(texto); toast('Resumo copiado! É só colar no WhatsApp', 'ok'); }
        } catch (err) { if (err.name !== 'AbortError') toast('Não foi possível compartilhar', 'err'); }
      }
    };
  }

  // ================= Inicialização =================
  window.addEventListener('hashchange', () => { S.edit = null; render(); });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });

  const limpar = () => DB.purgeExpirados().catch((err) => console.warn('Limpeza falhou', err));
  setInterval(limpar, 10 * 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) limpar(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW', err));
  }

  (async () => {
    try {
      await DB.init();
      await limpar();
      await carregarSessao();
    } catch (err) { console.error(err); }
    render();
  })();
})();
