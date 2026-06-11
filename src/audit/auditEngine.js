/**
 * Rules-based audit engine for a Google Business Profile location.
 *
 * Each check returns earned/max points plus a status and recommendation.
 * Checks whose underlying data could not be fetched are marked "na" and
 * excluded from the overall score, so a partially-permissioned account
 * still gets a meaningful report.
 */
import moment from 'moment';

export const STATUS = {
  PASS: 'pass',
  WARN: 'warn',
  FAIL: 'fail',
  NA: 'na',
};

const check = (id, label, maxPoints, { status, points, details, recommendation }) => ({
  id,
  label,
  maxPoints,
  status,
  points: status === STATUS.NA ? 0 : points,
  details,
  recommendation,
});

const na = (id, label, maxPoints, reason) =>
  check(id, label, maxPoints, {
    status: STATUS.NA,
    points: 0,
    details: `Not audited: ${reason}`,
  });

const DESCRIPTION_TARGET = 250; // chars; GBP allows up to 750
const PHOTO_TARGET = 10;
const ATTRIBUTE_TARGET = 5;
const POST_FRESHNESS_DAYS = 30;
const REVIEW_FRESHNESS_DAYS = 30;

const coreInfoChecks = (location) => {
  const checks = [];

  checks.push(check('title', 'Business name', 5, location.title
    ? { status: STATUS.PASS, points: 5, details: `"${location.title}"` }
    : { status: STATUS.FAIL, points: 0, recommendation: 'Set your business name.' }));

  const primary = location.categories?.primaryCategory?.displayName;
  checks.push(check('primary-category', 'Primary category', 10, primary
    ? { status: STATUS.PASS, points: 10, details: primary }
    : {
      status: STATUS.FAIL,
      points: 0,
      recommendation: 'Choose the most specific primary category — it is one of the strongest local ranking signals.',
    }));

  const additional = location.categories?.additionalCategories?.length || 0;
  checks.push(check('additional-categories', 'Additional categories', 5, additional > 0
    ? { status: STATUS.PASS, points: 5, details: `${additional} additional ${additional === 1 ? 'category' : 'categories'}` }
    : {
      status: STATUS.WARN,
      points: 2,
      recommendation: 'Add additional categories that describe secondary services to widen search coverage.',
    }));

  const hasAddress = Boolean(location.storefrontAddress?.addressLines?.length);
  const hasServiceArea = Boolean(location.serviceArea?.places?.placeInfos?.length);
  checks.push(check('address', 'Address or service area', 5, (hasAddress || hasServiceArea)
    ? {
      status: STATUS.PASS,
      points: 5,
      details: hasAddress ? 'Storefront address set' : 'Service area set',
    }
    : {
      status: STATUS.FAIL,
      points: 0,
      recommendation: 'Add a storefront address, or define a service area if you serve customers at their location.',
    }));

  const phone = location.phoneNumbers?.primaryPhone;
  checks.push(check('phone', 'Phone number', 5, phone
    ? { status: STATUS.PASS, points: 5, details: phone }
    : { status: STATUS.FAIL, points: 0, recommendation: 'Add a primary phone number so customers can call you directly.' }));

  checks.push(check('website', 'Website', 5, location.websiteUri
    ? { status: STATUS.PASS, points: 5, details: location.websiteUri }
    : { status: STATUS.FAIL, points: 0, recommendation: 'Link your website (or a booking/landing page) to capture search traffic.' }));

  const isOpen = location.openInfo?.status;
  checks.push(check('open-status', 'Open status', 5, isOpen === 'OPEN'
    ? { status: STATUS.PASS, points: 5, details: 'Marked as open' }
    : {
      status: STATUS.WARN,
      points: 0,
      details: isOpen ? `Status: ${isOpen}` : 'Status not set',
      recommendation: 'Confirm the business is marked OPEN; closed or pending statuses suppress visibility.',
    }));

  return checks;
};

const hoursChecks = (location) => {
  const checks = [];

  const daysWithHours = new Set(
    (location.regularHours?.periods || []).map((p) => p.openDay),
  ).size;
  let regular;
  if (daysWithHours >= 5) {
    regular = { status: STATUS.PASS, points: 10, details: `Hours set for ${daysWithHours} day(s)` };
  } else if (daysWithHours > 0) {
    regular = {
      status: STATUS.WARN,
      points: 5,
      details: `Hours set for only ${daysWithHours} day(s)`,
      recommendation: 'Fill in business hours for every day you operate — incomplete hours frustrate customers and hurt ranking.',
    };
  } else {
    regular = {
      status: STATUS.FAIL,
      points: 0,
      recommendation: 'Add regular business hours; profiles without hours convert significantly worse.',
    };
  }
  checks.push(check('regular-hours', 'Regular hours', 10, regular));

  checks.push(check('special-hours', 'Special (holiday) hours', 3, location.specialHours?.specialHourPeriods?.length
    ? { status: STATUS.PASS, points: 3, details: `${location.specialHours.specialHourPeriods.length} special hour period(s)` }
    : {
      status: STATUS.WARN,
      points: 1,
      recommendation: 'Set special hours for upcoming holidays so Google doesn\'t flag your hours as unconfirmed.',
    }));

  checks.push(check('more-hours', 'More hours (e.g. delivery, drive-through)', 2, location.moreHours?.length
    ? { status: STATUS.PASS, points: 2, details: `${location.moreHours.length} extra hour set(s)` }
    : { status: STATUS.WARN, points: 1, recommendation: 'Add "more hours" sets if you offer services like delivery or senior hours.' }));

  return checks;
};

const contentChecks = (location) => {
  const checks = [];

  const description = location.profile?.description || '';
  let desc;
  if (description.length >= DESCRIPTION_TARGET) {
    desc = { status: STATUS.PASS, points: 10, details: `${description.length} characters` };
  } else if (description.length > 0) {
    desc = {
      status: STATUS.WARN,
      points: 5,
      details: `${description.length} characters`,
      recommendation: `Expand the business description to at least ${DESCRIPTION_TARGET} characters (max 750) and work in your main keywords naturally.`,
    };
  } else {
    desc = {
      status: STATUS.FAIL,
      points: 0,
      recommendation: 'Write a business description — it\'s prime keyword real estate shown on your profile.',
    };
  }
  checks.push(check('description', 'Business description', 10, desc));

  const serviceCount = location.serviceItems?.length || 0;
  checks.push(check('services', 'Services / menu items', 5, serviceCount > 0
    ? { status: STATUS.PASS, points: 5, details: `${serviceCount} service item(s)` }
    : {
      status: STATUS.WARN,
      points: 0,
      recommendation: 'List your services or products; each one is an extra surface for matching searches.',
    }));

  return checks;
};

const attributeChecks = (attributesResult) => {
  if (!attributesResult.ok) {
    return [na('attributes', 'Profile attributes', 5, attributesResult.error)];
  }
  const count = attributesResult.value.length;
  return [check('attributes', 'Profile attributes', 5, count >= ATTRIBUTE_TARGET
    ? { status: STATUS.PASS, points: 5, details: `${count} attributes set` }
    : {
      status: count > 0 ? STATUS.WARN : STATUS.FAIL,
      points: count > 0 ? 2 : 0,
      details: `${count} attributes set`,
      recommendation: 'Fill in applicable attributes (accessibility, amenities, payment options…) — they appear as profile highlights.',
    })];
};

const mediaChecks = (mediaResult) => {
  if (!mediaResult.ok) {
    return [na('photo-count', 'Photos & media', 15, mediaResult.error)];
  }

  const media = mediaResult.value;
  const count = media.length;
  const checks = [];

  let photos;
  if (count >= PHOTO_TARGET) {
    photos = { status: STATUS.PASS, points: 10, details: `${count} media items` };
  } else if (count > 0) {
    photos = {
      status: STATUS.WARN,
      points: 4,
      details: `${count} media items`,
      recommendation: `Upload at least ${PHOTO_TARGET} photos; listings with more photos get measurably more direction requests and calls.`,
    };
  } else {
    photos = { status: STATUS.FAIL, points: 0, recommendation: 'Add photos — profiles without photos are heavily penalised in discovery.' };
  }
  checks.push(check('photo-count', 'Photo count', 10, photos));

  const categories = new Set(media.map((m) => m.locationAssociation?.category));
  const hasBranding = categories.has('COVER') || categories.has('LOGO') || categories.has('PROFILE');
  checks.push(check('branding-photos', 'Logo / cover photo', 5, hasBranding
    ? { status: STATUS.PASS, points: 5, details: 'Branding media present' }
    : { status: STATUS.WARN, points: 0, recommendation: 'Set a logo and cover photo so you control how the profile looks.' }));

  return checks;
};

const reviewChecks = (reviewsResult) => {
  if (!reviewsResult.ok) {
    return [na('reviews', 'Reviews & replies', 23, reviewsResult.error)];
  }

  const { reviews, totalReviewCount, averageRating } = reviewsResult.value;
  const checks = [];

  checks.push(check('review-count', 'Review volume', 5, totalReviewCount >= 10
    ? { status: STATUS.PASS, points: 5, details: `${totalReviewCount} reviews` }
    : {
      status: totalReviewCount > 0 ? STATUS.WARN : STATUS.FAIL,
      points: totalReviewCount > 0 ? 2 : 0,
      details: `${totalReviewCount} reviews`,
      recommendation: 'Build a steady review-request flow (post-sale email/SMS with your review link).',
    }));

  checks.push(check('review-rating', 'Average rating', 5, averageRating >= 4
    ? { status: STATUS.PASS, points: 5, details: `${averageRating.toFixed(1)} ★` }
    : {
      status: STATUS.WARN,
      points: averageRating >= 3 ? 2 : 0,
      details: averageRating ? `${averageRating.toFixed(1)} ★` : 'No rating yet',
      recommendation: 'Address recurring complaints in low reviews; aim for a sustained 4.0+ average.',
    }));

  const replied = reviews.filter((r) => r.reviewReply).length;
  const replyRate = reviews.length ? replied / reviews.length : 0;
  checks.push(check('reply-rate', 'Owner reply rate (recent reviews)', 10, reviews.length === 0
    ? { status: STATUS.WARN, points: 0, details: 'No reviews to reply to yet' }
    : replyRate >= 0.5
      ? { status: STATUS.PASS, points: 10, details: `${Math.round(replyRate * 100)}% of recent reviews answered` }
      : {
        status: STATUS.FAIL,
        points: Math.round(replyRate * 10),
        details: `${Math.round(replyRate * 100)}% of recent reviews answered`,
        recommendation: 'Reply to every review — replies signal an active business to both Google and customers.',
      }));

  const newest = reviews[0]?.updateTime || reviews[0]?.createTime;
  const fresh = newest && moment(newest).isAfter(moment().subtract(REVIEW_FRESHNESS_DAYS, 'days'));
  checks.push(check('review-freshness', 'Recent review activity', 3, fresh
    ? { status: STATUS.PASS, points: 3, details: `Latest review ${moment(newest).fromNow()}` }
    : {
      status: STATUS.WARN,
      points: 0,
      details: newest ? `Latest review ${moment(newest).fromNow()}` : 'No reviews yet',
      recommendation: 'Review recency matters — keep new reviews coming in continuously, not in bursts.',
    }));

  return checks;
};

const postChecks = (postsResult) => {
  if (!postsResult.ok) {
    return [na('posts', 'Google Posts', 7, postsResult.error)];
  }

  const posts = postsResult.value;
  const newest = posts
    .map((p) => p.updateTime || p.createTime)
    .sort()
    .pop();
  const fresh = newest && moment(newest).isAfter(moment().subtract(POST_FRESHNESS_DAYS, 'days'));

  return [check('post-freshness', 'Recent Google Post', 7, fresh
    ? { status: STATUS.PASS, points: 7, details: `Last post ${moment(newest).fromNow()}` }
    : {
      status: posts.length ? STATUS.WARN : STATUS.FAIL,
      points: posts.length ? 2 : 0,
      details: newest ? `Last post ${moment(newest).fromNow()}` : 'No posts yet',
      recommendation: `Publish a Google Post at least every ${POST_FRESHNESS_DAYS} days (offers, updates, events) to keep the profile active.`,
    })];
};

/**
 * @param {object} data result of fetchAuditData()
 * @returns {{ percent: number, score: number, maxScore: number, sections: Array }}
 */
export const runAudit = (data) => {
  const sections = [
    { id: 'core', title: 'Core business information', checks: coreInfoChecks(data.location) },
    { id: 'hours', title: 'Opening hours', checks: hoursChecks(data.location) },
    { id: 'content', title: 'Profile content', checks: contentChecks(data.location) },
    { id: 'attributes', title: 'Attributes', checks: attributeChecks(data.attributes) },
    { id: 'media', title: 'Photos & media', checks: mediaChecks(data.media) },
    { id: 'reviews', title: 'Reviews & engagement', checks: reviewChecks(data.reviews) },
    { id: 'posts', title: 'Google Posts', checks: postChecks(data.localPosts) },
  ];

  const scored = sections.flatMap((s) => s.checks).filter((c) => c.status !== STATUS.NA);
  const score = scored.reduce((sum, c) => sum + c.points, 0);
  const maxScore = scored.reduce((sum, c) => sum + c.maxPoints, 0);

  return {
    sections,
    score,
    maxScore,
    percent: maxScore ? Math.round((score / maxScore) * 100) : 0,
    recommendations: scored
      .filter((c) => c.recommendation)
      .sort((a, b) => (b.maxPoints - b.points) - (a.maxPoints - a.points))
      .map((c) => c.recommendation),
  };
};
