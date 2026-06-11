/**
 * Google Business Profile API client.
 *
 * Uses the current split APIs for accounts and business information, and the
 * legacy v4 API for media, reviews, and local posts (those resources have not
 * been migrated to the newer APIs yet).
 *
 * All of these require your Google Cloud project to be granted Business
 * Profile API access — see the README for the setup steps.
 */
import axios from 'axios';

const ACCOUNT_MGMT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const LEGACY_V4_API = 'https://mybusiness.googleapis.com/v4';

// Fields the audit engine inspects on each location.
const LOCATION_READ_MASK = [
  'name',
  'title',
  'phoneNumbers',
  'categories',
  'websiteUri',
  'regularHours',
  'specialHours',
  'moreHours',
  'serviceArea',
  'storefrontAddress',
  'openInfo',
  'profile',
  'serviceItems',
  'metadata',
].join(',');

const authConfig = (token, params = {}) => ({
  headers: { Authorization: `Bearer ${token}` },
  params,
});

const fetchAllPages = async (url, token, params, itemsKey) => {
  const items = [];
  let pageToken;

  do {
    const { data } = await axios.get(url, authConfig(token, { ...params, pageToken }));
    items.push(...(data[itemsKey] || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
};

/** Lists every Business Profile account the signed-in user can manage. */
export const fetchAccounts = (token) =>
  fetchAllPages(`${ACCOUNT_MGMT_API}/accounts`, token, { pageSize: 20 }, 'accounts');

/**
 * Lists locations for an account (accountName is e.g. "accounts/123").
 */
export const fetchLocations = (token, accountName) =>
  fetchAllPages(
    `${BUSINESS_INFO_API}/${accountName}/locations`,
    token,
    { pageSize: 100, readMask: LOCATION_READ_MASK },
    'locations',
  );

/** Attributes set on a location (locationName is e.g. "locations/456"). */
export const fetchAttributes = async (token, locationName) => {
  const { data } = await axios.get(
    `${BUSINESS_INFO_API}/${locationName}/attributes`,
    authConfig(token),
  );
  return data.attributes || [];
};

// The v4 API addresses resources as accounts/{a}/locations/{l}.
const v4LocationPath = (accountName, locationName) =>
  `${accountName}/${locationName}`;

export const fetchMedia = (token, accountName, locationName) =>
  fetchAllPages(
    `${LEGACY_V4_API}/${v4LocationPath(accountName, locationName)}/media`,
    token,
    { pageSize: 100 },
    'mediaItems',
  );

export const fetchReviews = async (token, accountName, locationName) => {
  // One page of the newest reviews is enough for the audit signals.
  const { data } = await axios.get(
    `${LEGACY_V4_API}/${v4LocationPath(accountName, locationName)}/reviews`,
    authConfig(token, { pageSize: 50, orderBy: 'updateTime desc' }),
  );
  return {
    reviews: data.reviews || [],
    totalReviewCount: data.totalReviewCount || 0,
    averageRating: data.averageRating || 0,
  };
};

export const fetchLocalPosts = (token, accountName, locationName) =>
  fetchAllPages(
    `${LEGACY_V4_API}/${v4LocationPath(accountName, locationName)}/localPosts`,
    token,
    { pageSize: 20 },
    'localPosts',
  );

/**
 * Gathers everything the audit engine needs for one location. Supplemental
 * datasets (attributes, media, reviews, posts) fail soft: if an API is not
 * enabled or not permitted, the audit still runs on the data we do have.
 */
export const fetchAuditData = async (token, accountName, location) => {
  const settle = (promise) =>
    promise.then(
      (value) => ({ ok: true, value }),
      (error) => ({ ok: false, error: error?.response?.data?.error?.message || error.message }),
    );

  const [attributes, media, reviews, localPosts] = await Promise.all([
    settle(fetchAttributes(token, location.name)),
    settle(fetchMedia(token, accountName, location.name)),
    settle(fetchReviews(token, accountName, location.name)),
    settle(fetchLocalPosts(token, accountName, location.name)),
  ]);

  return { location, attributes, media, reviews, localPosts };
};
