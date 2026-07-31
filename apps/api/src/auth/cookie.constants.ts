// Scoping the refresh-token cookie's path to only the auth routes means
// it's never sent along with ordinary API requests (employees, payments,
// etc.) — a small defense-in-depth reduction in where that cookie travels.
export const ACCESS_TOKEN_COOKIE = 'access_token'
export const REFRESH_TOKEN_COOKIE = 'refresh_token'
export const AUTH_COOKIE_PATH = '/api/v1/auth'
