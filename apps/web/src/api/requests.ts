import type { AxiosRequestConfig } from 'axios';

import { apiClient } from './client';

type RequestOptions = Pick<AxiosRequestConfig, 'signal' | 'params'>;

// Thin wrappers that return the response body. Errors are thrown as-is;
// read their message with getErrorMessage.

export async function getData<T>(url: string, options?: RequestOptions) {
  const { data } = await apiClient.get<T>(url, options);
  return data;
}

export async function postData<T, U = unknown>(
  url: string,
  body?: U,
  options?: RequestOptions,
) {
  const { data } = await apiClient.post<T>(url, body, options);
  return data;
}

export async function putData<T, U = unknown>(
  url: string,
  body: U,
  options?: RequestOptions,
) {
  const { data } = await apiClient.put<T>(url, body, options);
  return data;
}

export async function patchData<T, U = unknown>(
  url: string,
  body: U,
  options?: RequestOptions,
) {
  const { data } = await apiClient.patch<T>(url, body, options);
  return data;
}

export async function deleteData<T, U = unknown>(
  url: string,
  body?: U,
  options?: RequestOptions,
) {
  const { data } = await apiClient.delete<T>(url, { ...options, data: body });
  return data;
}
