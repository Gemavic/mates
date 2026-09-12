/**
 * Provinces, territories and states, for the countries where "near you"
 * needs to mean something smaller than the whole country. Codes are the
 * ISO 3166-2 subdivision codes without the country prefix ("ON", not
 * "CA-ON"), which is what user_profiles.region_code stores.
 */
export interface Region { code: string; name: string }

const CANADA: Region[] = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

const UNITED_STATES: Region[] = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],
  ['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],
  ['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],
  ['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],
  ['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],
  ['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],
  ['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],
  ['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
].map(([code, name]) => ({ code, name }));

const NIGERIA: Region[] = [
  ['AB','Abia'],['AD','Adamawa'],['AK','Akwa Ibom'],['AN','Anambra'],['BA','Bauchi'],['BY','Bayelsa'],['BE','Benue'],
  ['BO','Borno'],['CR','Cross River'],['DE','Delta'],['EB','Ebonyi'],['ED','Edo'],['EK','Ekiti'],['EN','Enugu'],
  ['FC','Abuja (FCT)'],['GO','Gombe'],['IM','Imo'],['JI','Jigawa'],['KD','Kaduna'],['KN','Kano'],['KT','Katsina'],
  ['KE','Kebbi'],['KO','Kogi'],['KW','Kwara'],['LA','Lagos'],['NA','Nasarawa'],['NI','Niger'],['OG','Ogun'],
  ['ON','Ondo'],['OS','Osun'],['OY','Oyo'],['PL','Plateau'],['RI','Rivers'],['SO','Sokoto'],['TA','Taraba'],
  ['YO','Yobe'],['ZA','Zamfara'],
].map(([code, name]) => ({ code, name }));

const REGIONS: Record<string, Region[]> = { CA: CANADA, US: UNITED_STATES, NG: NIGERIA };

/** The regions for a country, or an empty list when we don't subdivide it. */
export function regionsFor(countryCode: string | null | undefined): Region[] {
  return countryCode ? (REGIONS[countryCode] ?? []) : [];
}

export function regionLabel(countryCode: string | null | undefined): string {
  if (countryCode === 'CA') return 'Province or territory';
  if (countryCode === 'US') return 'State';
  if (countryCode === 'NG') return 'State';
  return 'Region';
}

export function regionName(countryCode: string | null | undefined, regionCode: string | null | undefined): string | null {
  if (!regionCode) return null;
  const hit = regionsFor(countryCode).find((r) => r.code === regionCode);
  return hit ? hit.name : regionCode;
}
