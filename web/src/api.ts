export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;

  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? "Erro inesperado");
  }

  return res.json() as Promise<T>;
}

export interface User {
  id: string;
  email: string;
  is_admin: boolean;
}

export interface UsuarioListItem {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface ProcedimentoListItem {
  id: string;
  titulo: string;
  tags: string[];
  cliente_origem: string | null;
  status: "rascunho" | "validado";
  versao: number;
  data_origem: string | null;
  created_at: string;
}

export interface Secao {
  heading_level: number;
  heading_title: string;
  parent_heading_title: string | null;
  order_index: number;
}

export interface ProcedimentoDetail extends ProcedimentoListItem {
  html_original: string;
  secoes: Secao[];
}

export const api = {
  login: (email: string, password: string) =>
    request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ status: string }>("/api/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/auth/me"),

  listarProcedimentos: () => request<ProcedimentoListItem[]>("/api/procedimentos"),
  obterProcedimento: (id: string) => request<ProcedimentoDetail>(`/api/procedimentos/${id}`),
  criarProcedimento: (form: FormData) =>
    request<ProcedimentoListItem>("/api/procedimentos", { method: "POST", body: form }),

  listarUsuarios: () => request<UsuarioListItem[]>("/api/users"),
  criarUsuario: (email: string, password: string, isAdmin: boolean) =>
    request<UsuarioListItem>("/api/users", {
      method: "POST",
      body: JSON.stringify({ email, password, is_admin: isAdmin }),
    }),
};
