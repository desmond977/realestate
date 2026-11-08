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

export const DEFAULT_PROPERTY_IMAGE_URL = '/assets/property-placeholder.svg'

export function propertyImageUrl(property) {
  if (!property) return DEFAULT_PROPERTY_IMAGE_URL;

  const rawUrl = property.image || property.image_url || property.cover_image || property.media?.[0]?.url || property.media?.[0]?.path;
  if (!rawUrl) return DEFAULT_PROPERTY_IMAGE_URL;

  const url = typeof rawUrl === 'string' ? rawUrl : rawUrl.url || rawUrl.path;
  if (!url) return DEFAULT_PROPERTY_IMAGE_URL;

  if (/^(blob:|data:)/i.test(url)) {
    return url;
  }

  if (/^https?:\/\//i.test(url)) {
    const parsedUrl = new URL(url);

    if (parsedUrl.pathname.startsWith('/storage/')) {
      return new URL(`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`, window.location.origin).toString();
    }

    return url;
  }

  const normalized = url.replace(/^\/+/, '').replace(/^storage\//, '');

  if (normalized.startsWith('uploads/') || normalized.startsWith('images/')) {
    return new URL(`/${normalized}`, window.location.origin).toString();
  }

  return assetUrl(normalized) || DEFAULT_PROPERTY_IMAGE_URL;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

const inFlightRequests = new Map();

function isSensitivePayload(value) {
  if (!value || typeof value !== 'object') return false;

  return Object.entries(value).some(([key, item]) =>
    /password|token|secret|proof|file|image/i.test(key)
      || (item && typeof item === 'object' && isSensitivePayload(item))
  );
}

function coalesceIdenticalRequests(method) {
  const send = api[method].bind(api);

  api[method] = (...args) => {
    const [url, dataOrConfig, configOrUndefined] = args;
    const config = method === 'delete' || method === 'get'
      ? (dataOrConfig || {})
      : (configOrUndefined || {});
    const data = method === 'delete' || method === 'get'
      ? config.data
      : dataOrConfig;

    if (
      (typeof FormData !== 'undefined' && data instanceof FormData)
      || config.signal
      || config.cancelToken
      || isSensitivePayload(data)
    ) {
      return send(...args);
    }

    let serializedData;
    let serializedParams;

    try {
      serializedData = JSON.stringify(data ?? null);
      serializedParams = JSON.stringify(config.params ?? null);
    } catch {
      return send(...args);
    }

    const requestKey = JSON.stringify([
      method,
      url,
      serializedParams,
      serializedData,
      config.responseType || '',
      getTokenForRequest(url) || '',
      localStorage.getItem('tenant_id') || '',
    ]);
    const existingRequest = inFlightRequests.get(requestKey);

    if (existingRequest) return existingRequest;

    const request = send(...args);
    inFlightRequests.set(requestKey, request);
    const clearRequest = () => {
      if (inFlightRequests.get(requestKey) === request) {
        inFlightRequests.delete(requestKey);
      }
    };
    request.then(clearRequest, clearRequest);

    return request;
  };
}

['get', 'post', 'put', 'patch', 'delete'].forEach(coalesceIdenticalRequests);

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
    if (error.response?.status === 401) {
      clearAuthForRequest(error.config?.url);
    }

    return Promise.reject(error);
  }
);
