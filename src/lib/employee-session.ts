// Client-side employee session storage
export type EmployeeSession = {
  id: string;
  nome: string;
  cognome: string;
  mansione: string;
  negozio: string;
  session_token: string;
};

const KEY = "vc_employee_session";

export function getSession(): EmployeeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EmployeeSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: EmployeeSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("vc_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("vc_device_id", id);
  }
  return id;
}
