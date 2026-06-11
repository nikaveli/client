/**
 * Sample dataset shaped like fetchAuditData() output, used by the demo mode
 * so the audit report can be previewed before Business Profile API access
 * is approved. Deliberately imperfect so the report shows a realistic mix
 * of passes, warnings, and recommendations.
 */
import moment from 'moment';

const daysAgo = (n) => moment().subtract(n, 'days').toISOString();

export const buildSampleAuditData = () => ({
  location: {
    name: 'locations/000000000000000000',
    title: "Mike's Coffee Roasters (Sample)",
    phoneNumbers: { primaryPhone: '(555) 123-4567' },
    websiteUri: 'https://example.com',
    categories: {
      primaryCategory: { displayName: 'Coffee shop' },
      additionalCategories: [{ displayName: 'Coffee roasters' }],
    },
    storefrontAddress: {
      addressLines: ['123 Main Street'],
      locality: 'Springfield',
      administrativeArea: 'IL',
    },
    openInfo: { status: 'OPEN' },
    regularHours: {
      periods: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
        openDay: day,
        openTime: { hours: 7 },
        closeDay: day,
        closeTime: { hours: 17 },
      })),
    },
    // No specialHours / moreHours / serviceItems — triggers warnings.
    profile: {
      description:
        'Family-owned coffee shop and small-batch roastery serving espresso, pour-overs, and fresh pastries.',
    },
  },
  attributes: {
    ok: true,
    value: [
      { name: 'attributes/has_wifi' },
      { name: 'attributes/serves_breakfast' },
      { name: 'attributes/wheelchair_accessible_entrance' },
    ],
  },
  media: {
    ok: true,
    value: [
      { locationAssociation: { category: 'COVER' } },
      { locationAssociation: { category: 'INTERIOR' } },
      { locationAssociation: { category: 'FOOD_AND_DRINK' } },
      { locationAssociation: { category: 'FOOD_AND_DRINK' } },
      { locationAssociation: { category: 'EXTERIOR' } },
      { locationAssociation: { category: 'TEAMS' } },
    ],
  },
  reviews: {
    ok: true,
    value: {
      totalReviewCount: 34,
      averageRating: 4.4,
      reviews: [
        { starRating: 'FIVE', updateTime: daysAgo(4), reviewReply: { comment: 'Thank you!' } },
        { starRating: 'FOUR', updateTime: daysAgo(11) },
        { starRating: 'FIVE', updateTime: daysAgo(19), reviewReply: { comment: 'Appreciate it!' } },
        { starRating: 'TWO', updateTime: daysAgo(26) },
        { starRating: 'FIVE', updateTime: daysAgo(33) },
        { starRating: 'FOUR', updateTime: daysAgo(41) },
      ],
    },
  },
  localPosts: {
    ok: true,
    value: [
      { summary: 'New single-origin Ethiopia drop!', updateTime: daysAgo(52) },
      { summary: 'Holiday hours announcement', updateTime: daysAgo(95) },
    ],
  },
});
