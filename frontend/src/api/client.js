import axios from "axios";

export const API_BASE_URL = "/api/v1";

const AUTH_STORAGE = {
  admin: {
    token: "auth_token",
    user: "auth_user",
  },
  client: {
    token: "client_auth_token",
    user: "client_auth_user",
  },
};

function isClientRequest(url = "") {
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

  return normalizedUrl === "/client" || normalizedUrl.startsWith("/client/");
}

function getTokenForRequest(url) {
  const scope = isClientRequest(url) ? AUTH_STORAGE.client : AUTH_STORAGE.admin;

  return localStorage.getItem(scope.token);
}

function clearAuthForRequest(url) {
  const scopeName = isClientRequest(url) ? "client" : "admin";
  const scope = isClientRequest(url) ? AUTH_STORAGE.client : AUTH_STORAGE.admin;

  localStorage.removeItem(scope.token);
  localStorage.removeItem(scope.user);
  window.dispatchEvent(new CustomEvent("auth:cleared", { detail: { scope: scopeName } }));
}

function getTenantHeaders() {
  const tenantId = localStorage.getItem("tenant_id");

  return tenantId ? { "X-Tenant-ID": tenantId } : {};
}

export function assetUrl(path) {
  if (!path) return null;

  if (/^(blob:|data:|https?:\/\/)/i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/")
    ? path
    : `/storage/${path.replace(/^storage\//, "")}`;

  return new URL(normalizedPath, window.location.origin).toString();
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getTokenForRequest(config.url);

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  Object.assign(config.headers, getTenantHeaders());

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearAuthForRequest(error.config?.url);
    }

    return Promise.reject(error);
  }
);
