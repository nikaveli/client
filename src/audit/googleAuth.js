/**
 * Thin wrapper around Google Identity Services (GIS) for obtaining an
 * OAuth 2.0 access token with the Business Profile scope.
 *
 * Requires REACT_APP_GOOGLE_CLIENT_ID to be set (see .env.example).
 */
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/business.manage';

export const getClientId = () => process.env.REACT_APP_GOOGLE_CLIENT_ID;

let gisPromise = null;

const loadGis = () => {
  if (gisPromise) return gisPromise;

  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google.accounts.oauth2);
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve(window.google.accounts.oauth2);
      } else {
        reject(new Error('Google Identity Services loaded but oauth2 client is unavailable.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load the Google Identity Services script.'));
    document.head.appendChild(script);
  });

  return gisPromise;
};

/**
 * Opens the Google consent popup and resolves with an access token.
 */
export const requestAccessToken = async () => {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('Missing REACT_APP_GOOGLE_CLIENT_ID. Add it to your .env file.');
  }

  const oauth2 = await loadGis();

  return new Promise((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else {
          resolve(response.access_token);
        }
      },
      error_callback: (error) => {
        reject(new Error(error.message || 'Google sign-in was cancelled.'));
      },
    });

    tokenClient.requestAccessToken();
  });
};
