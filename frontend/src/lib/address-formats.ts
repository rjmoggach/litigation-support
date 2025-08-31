// International address format configurations
export interface AddressFormat {
  country: string
  countryCode: string
  stateLabel: string
  zipLabel: string
  zipPlaceholder: string
  stateRequired: boolean
  zipRequired: boolean
  states?: { value: string; label: string }[]
}

export const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'YT', label: 'Yukon' },
]

export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

export const ADDRESS_FORMATS: Record<string, AddressFormat> = {
  US: {
    country: 'United States',
    countryCode: 'US',
    stateLabel: 'State',
    zipLabel: 'ZIP Code',
    zipPlaceholder: '12345',
    stateRequired: true,
    zipRequired: true,
    states: US_STATES,
  },
  CA: {
    country: 'Canada',
    countryCode: 'CA',
    stateLabel: 'Province',
    zipLabel: 'Postal Code',
    zipPlaceholder: 'K1A 0A6',
    stateRequired: true,
    zipRequired: true,
    states: CANADIAN_PROVINCES,
  },
  GB: {
    country: 'United Kingdom',
    countryCode: 'GB',
    stateLabel: 'County',
    zipLabel: 'Postcode',
    zipPlaceholder: 'SW1A 1AA',
    stateRequired: false,
    zipRequired: true,
  },
  AU: {
    country: 'Australia',
    countryCode: 'AU',
    stateLabel: 'State/Territory',
    zipLabel: 'Postcode',
    zipPlaceholder: '2000',
    stateRequired: true,
    zipRequired: true,
    states: [
      { value: 'NSW', label: 'New South Wales' },
      { value: 'VIC', label: 'Victoria' },
      { value: 'QLD', label: 'Queensland' },
      { value: 'WA', label: 'Western Australia' },
      { value: 'SA', label: 'South Australia' },
      { value: 'TAS', label: 'Tasmania' },
      { value: 'ACT', label: 'Australian Capital Territory' },
      { value: 'NT', label: 'Northern Territory' },
    ],
  },
  DE: {
    country: 'Germany',
    countryCode: 'DE',
    stateLabel: 'State',
    zipLabel: 'Postal Code',
    zipPlaceholder: '10115',
    stateRequired: false,
    zipRequired: true,
  },
  FR: {
    country: 'France',
    countryCode: 'FR',
    stateLabel: 'Region',
    zipLabel: 'Postal Code',
    zipPlaceholder: '75001',
    stateRequired: false,
    zipRequired: true,
  },
  // Add more countries as needed
}

export const COUNTRIES = Object.values(ADDRESS_FORMATS).map(format => ({
  value: format.countryCode,
  label: format.country,
}))

export function getAddressFormat(countryCode: string): AddressFormat {
  return ADDRESS_FORMATS[countryCode] || ADDRESS_FORMATS.US
}

export function validatePostalCode(countryCode: string, postalCode: string): boolean {
  if (!postalCode) return false
  
  const patterns = {
    US: /^\d{5}(-\d{4})?$/,
    CA: /^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/,  // Allow space to be optional
    GB: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i,
    AU: /^\d{4}$/,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
  }
  
  const pattern = patterns[countryCode as keyof typeof patterns]
  return pattern ? pattern.test(postalCode) : true
}

export function formatPostalCode(countryCode: string, postalCode: string): string {
  if (!postalCode) return postalCode
  
  // Format Canadian postal codes to include space
  if (countryCode === 'CA' && /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/.test(postalCode)) {
    return postalCode.slice(0, 3) + ' ' + postalCode.slice(3)
  }
  
  return postalCode
}