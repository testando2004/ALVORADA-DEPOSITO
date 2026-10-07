// Camada de dados: mesma interface para armazenamento local e Supabase.
// Tabelas: usuarios, lotes, itens_caixa, envelopes
window.DB = (() => {
  const cfg = window.APP_CONFIG || {};
  const online = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

  const uid = () =>
    (crypto.randomUUID && crypto.randomUUID()) ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

  const matches = (row, filters) =>
    Object.entries(filters).every(([k, v]) => (v === null ? row[k] == null : row[k] === v));

  // ---------- Local (localStorage) ----------
  const local = {
    async init() {},
    _get(t) {
      try { return JSON.parse(localStorage.getItem('dep_' + t)) || []; } catch { return []; }
    },
    _set(t, rows) { localStorage.setItem('dep_' + t, JSON.stringify(rows)); },
    async list(t, filters = {}) { return this._get(t).filter((r) => matches(r, filters)); },
    async insert(t, obj) {
      const row = { id: uid(), criado_em: new Date().toISOString(), ...obj };
      this._set(t, [...this._get(t), row]);
      return row;
    },
    async update(t, id, patch) {
      const rows = this._get(t);
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) return null;
      rows[i] = { ...rows[i], ...patch };
      this._set(t, rows);
      return rows[i];
    },
    async remove(t, id) { this._set(t, this._get(t).filter((r) => r.id !== id)); },
    async removeWhere(t, filters) { this._set(t, this._get(t).filter((r) => !matches(r, filters))); },
  };

  // ---------- Supabase ----------
  let sb;
  const check = ({ data, error }) => { if (error) throw error; return data; };
  const applyFilters = (q, filters) => {
    for (const [k, v] of Object.entries(filters)) q = v === null ? q.is(k, null) : q.eq(k, v);
    return q;
  };
  const supa = {
    async init() {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    },
    async list(t, filters = {}) { return check(await applyFilters(sb.from(t).select('*'), filters)); },
    async insert(t, obj) { return check(await sb.from(t).insert(obj).select().single()); },
    async update(t, id, patch) { return check(await sb.from(t).update(patch).eq('id', id).select().single()); },
    async remove(t, id) { check(await sb.from(t).delete().eq('id', id)); },
    async removeWhere(t, filters) { check(await applyFilters(sb.from(t).delete(), filters)); },
  };

  const api = online ? supa : local;

  // Apaga lotes (e seus itens) cujo prazo de 24h após o relatório já passou
  async function purgeExpirados() {
    const agora = Date.now();
    const lotes = await api.list('lotes');
    for (const l of lotes) {
      if (l.expira_em && new Date(l.expira_em).getTime() < agora) {
        await api.removeWhere('itens_caixa', { lote_id: l.id });
        await api.removeWhere('envelopes', { lote_id: l.id });
        await api.remove('lotes', l.id);
      }
    }
  }

  return { ...api, online, purgeExpirados };
})();
