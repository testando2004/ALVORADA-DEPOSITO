// Configuração do sistema.
// Enquanto SUPABASE_URL e SUPABASE_ANON_KEY estiverem vazios, os dados
// ficam salvos apenas neste aparelho (localStorage).
// Quando preencher as chaves, o app passa a usar o banco online automaticamente.
window.APP_CONFIG = {
  SUPABASE_URL: 'https://rewysgbsiaanyyiefxwi.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_4dx6vLryCbGhW0yqyZHdzQ_uFEL5psK',

  // Quanto tempo (em horas) os dados ficam no sistema depois de gerar o relatório
  RETENCAO_HORAS: 24,

  NOME_EMPRESA: 'Alvorada Depósito',
};
