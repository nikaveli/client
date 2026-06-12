/**
 * Known franchise/chain brand names used to exclude non-independent businesses
 * from prospect scrapes. Matching is case-insensitive on the start of the
 * business name (so "McDonald's" matches "McDonald's Denver #4521").
 *
 * Extend freely — or pass extra names at runtime with --exclude "Name1,Name2".
 */
module.exports = [
  // Fast food / QSR
  "mcdonald's", 'burger king', "wendy's", 'subway', 'chipotle', 'taco bell',
  'kfc', 'pizza hut', "domino's", "papa john's", 'little caesars', 'chick-fil-a',
  'popeyes', 'dunkin', 'starbucks', 'panera', "jimmy john's", "jersey mike's",
  'firehouse subs', 'five guys', 'qdoba', 'panda express', 'sonic drive',
  'dairy queen', "arby's", "carl's jr", "hardee's", 'whataburger', 'in-n-out',
  'jack in the box', "raising cane's", 'wingstop', 'noodles & company',
  'einstein bros', 'krispy kreme', 'tropical smoothie', 'smoothie king',
  'jamba', 'cold stone', 'baskin-robbins', 'auntie', 'cinnabon', 'crumbl',
  'potbelly', 'schlotzsky', 'which wich', 'blaze pizza', 'mod pizza',
  'marco\'s pizza', 'papa murphy', 'wing street',
  // Casual dining chains
  'olive garden', "applebee's", "chili's", 'ihop', "denny's", 'waffle house',
  'buffalo wild wings', 'outback steakhouse', 'red lobster', 'red robin',
  'texas roadhouse', 'cracker barrel', "tgi friday", 'cheesecake factory',
  'pf chang', "bj's restaurant", 'hooters', 'dave & buster', 'golden corral',
  'first watch', 'snooze', 'village inn', 'perkins',
  // Coffee / breakfast
  'caribou coffee', 'dutch bros', 'scooters coffee', 'human bean', 'ziggi',
  // Services / retail commonly returned in local scrapes
  'great clips', 'supercuts', 'sport clips', 'massage envy',
  'european wax center', 'comfort dental', 'aspen dental', 'smile direct',
  'anytime fitness', 'planet fitness', 'orangetheory', 'crunch fitness',
  '24 hour fitness', 'gold\'s gym', 'la fitness', 'club pilates', 'pure barre',
  '7-eleven', 'circle k', 'walgreens', 'cvs', 'walmart', 'target', 'safeway',
  'king soopers', 'whole foods', 'trader joe', 'midas', 'jiffy lube',
  'grease monkey', 'firestone', 'discount tire', 'brakes plus', 'maaco',
  'h&r block', 'jackson hewitt', 'the ups store', 'fedex office',
];
