/**
 * Serviço de Autenticação de Usuário Único para o Sound Agriculture Dashboard
 */

const SESSION_KEY = 'sound_auth_session_v1';
const CUSTOM_PASS_KEY = 'sound_auth_custom_pass';

// Credenciais padrão (configuráveis via variáveis de ambiente .env se desejado)
const ENV_USER = import.meta.env.VITE_AUTH_USERNAME || 'admin';
const ENV_PASS = import.meta.env.VITE_AUTH_PASSWORD || 'sound@2026';

// Nomes de usuário aceitos (flexibilidade para o cliente)
const ACCEPTED_USERNAMES = [
  ENV_USER.toLowerCase(),
  'sound',
  'sound.admin',
  'comercial@sound.ag'
];

/**
 * Retorna a senha esperada (customizada ou padrão)
 */
function getExpectedPassword() {
  const custom = localStorage.getItem(CUSTOM_PASS_KEY);
  if (custom) return custom;
  return ENV_PASS;
}

/**
 * Valida credenciais e inicia a sessão
 */
export function login(username = '', password = '', rememberMe = true) {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  const isUserValid = ACCEPTED_USERNAMES.includes(cleanUser);
  const isPassValid = cleanPass === getExpectedPassword();

  if (isUserValid && isPassValid) {
    const sessionData = {
      username: username.trim(),
      role: 'Administrador Comercial',
      loginAt: new Date().toISOString(),
      expiresAt: rememberMe ? null : Date.now() + 8 * 60 * 60 * 1000 // 8 horas se não lembrar
    };

    const serialized = JSON.stringify(sessionData);
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, serialized);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, serialized);
      localStorage.removeItem(SESSION_KEY);
    }

    return { success: true, user: sessionData };
  }

  return {
    success: false,
    error: 'Usuário ou senha incorretos. Verifique suas credenciais.'
  };
}

/**
 * Encerra a sessão ativa
 */
export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error('Erro ao deslogar:', err);
  }
}

/**
 * Verifica se existe uma sessão válida ativa
 */
export function checkAuth() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;

    const session = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      logout();
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Retorna as informações do usuário autenticado
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

/**
 * Permite que o usuário altere a senha se desejar
 */
export function changePassword(currentPassword, newPassword) {
  if (currentPassword !== getExpectedPassword()) {
    return { success: false, error: 'A senha atual está incorreta.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
  }

  localStorage.setItem(CUSTOM_PASS_KEY, newPassword);
  return { success: true };
}
