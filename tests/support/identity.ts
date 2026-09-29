/**
 * Test-data factories for YOS purchase journeys.
 *
 * `yesshop-dev` is a shared, stateful backend that caps purchases per
 * identity (about 5 prepaid / 15 postpaid) and may also key an account on
 * email. Re-running a spec with a hard-coded identity therefore starts
 * failing once the cap is hit - the order is rejected server-side and the
 * flow stalls on `/delivery-addresses`. Every spec should pull a fresh
 * identity from here instead of hard-coding one.
 *
 * Restructuring Agent: generated specs must import from this module, not
 * inline literal IDs / emails.
 */

/**
 * A Malaysian MyKad number is `YYMMDD` + place-of-birth code (2) +
 * serial (3) + gender digit (1) = 12 digits. The YOS site derives Date Of
 * Birth from `YYMMDD` and gender from the last digit's parity, so any
 * well-formed number yields a consistent DOB/gender on the form.
 *
 * `ageYears` is computed against *today*, not a hardcoded year, so the
 * caller's intended age band (e.g. under-12 for the age-eligibility gate)
 * stays correct no matter when the suite runs. The birth month/day is fixed
 * to 15 January - safely in the past relative to any run date - so calendar
 * age arithmetic always lands on exactly `ageYears`, never off-by-one from a
 * birthday that hasn't happened yet this year.
 *
 * Returns the number plus the DOB the site will display (DD/MM/YYYY), for
 * use in a `toHaveValue` assertion.
 */
export function makeMyKad(ageYears: number): { idNumber: string; dob: string } {
  const year = new Date().getFullYear() - ageYears;
  const yy = String(year % 100).padStart(2, '0');
  const tail = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0'); // PB + serial + gender
  return { idNumber: `${yy}0115${tail}`, dob: `15/01/${year}` };
}

/**
 * A passport-style ID as used by the YOS-ARS-43 journeys: a letter + 7
 * digits (e.g. `P5833558`). No DOB is derived from it - the form asks for
 * DOB separately.
 */
export function makePassport(): { idNumber: string } {
  const n = String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0');
  return { idNumber: `P${n}` };
}

/**
 * The site's "ID Type *" dropdown. MyKad, MyTentera, MyPr and MyKas all use
 * the same 12-digit YYMMDD-PB-###G NRIC-style format - DOB and Gender (last
 * digit's parity: odd male, even female) are derived by the site and
 * rendered read-only. Passport is the outlier: neither is embedded in the
 * number, so the form leaves both fields editable and they must be supplied.
 * Prepaid only ever offers MyKad/MyTentera in this dropdown - MyPr/MyKas/
 * Passport aren't selectable there at all (that's the "physical store"
 * restriction; postpaid offers all five).
 */
export type IdType = 'MyKad' | 'MyTentera' | 'MyPr' | 'MyKas' | 'Passport';

const MYKAD_SHAPED: IdType[] = ['MyKad', 'MyTentera', 'MyPr', 'MyKas'];

export type Customer = {
  idType: IdType;
  idNumber: string;
  dob: string;
  gender: 'MALE' | 'FEMALE';
  fullName: string;
  phone: string;
  email: string;
  address: string;
  unitNo: string;
  postalCode: string;
  state: string;
  city: string;
};

/**
 * A full mock customer with a fresh ID and a unique email each call.
 * Address / postcode are fixed on purpose - they drive the site's
 * State + City autofill, which specs assert against.
 *
 * Defaults to a MyKad adult. Pass `idType` to get a MyTentera/MyPr/MyKas
 * identity (same generator, different dropdown selection) or a Passport
 * identity (different number shape, and DOB/Gender must be supplied since
 * the site doesn't derive them).
 */
export function makeCustomer(
  overrides: Partial<Customer> & { idType?: IdType } = {},
): Customer {
  const idType = overrides.idType ?? 'MyKad';

  let idNumber: string;
  let dob: string;
  let gender: 'MALE' | 'FEMALE';

  if (MYKAD_SHAPED.includes(idType)) {
    const ageYears = 21 + Math.floor(Math.random() * 20); // adult, 21-40
    ({ idNumber, dob } = makeMyKad(ageYears));
    gender = Number(idNumber.slice(-1)) % 2 === 0 ? 'FEMALE' : 'MALE';
  } else {
    idNumber = makePassport().idNumber;
    dob = overrides.dob ?? '15/01/1995';
    gender = overrides.gender ?? 'MALE';
  }

  return {
    idType,
    idNumber,
    dob,
    gender,
    fullName: 'SITI NURULHUDA BINTI AHMAD',
    phone: '0192345678',
    email: `siti.nurulhuda.${Date.now()}@gmail.com`,
    address: 'NO 8 JALAN BUKIT BINTANG',
    unitNo: '12-3',
    postalCode: '55100',
    state: 'WILAYAH PERSEKUTUAN KUALA LUMPUR',
    city: 'KUALA LUMPUR',
    ...overrides,
  };
}

/**
 * The real person doing a manual eKYC. The VIDA check
 * scans a physical MyKad, so the form must carry that card's details - a
 * random `makeCustomer()` identity would not match. Details come from
 * `EKYC_*` env vars (local `.env`, never checked in); DOB and gender are
 * derived from the MyKad number exactly as the site does. Address stays the
 * fixed KL one from `makeCustomer()` so the State/City autofill assertions
 * still hold; only the unit number (12-19) is the tester's own.
 *
 * Note the per-ID order cap on `yesshop-dev` (~15 postpaid): a fixed real
 * identity burns through it, unlike the fresh ones from `makeCustomer()`.
 */
export function makeRealCustomer(): Customer {
  const need = (k: string): string => {
    const v = (process.env[k] ?? '').trim();
    if (!v) throw new Error(`${k} is not set - add it to .env (see .env.example)`);
    return v;
  };
  const idNumber = need('EKYC_ID_NUMBER');
  if (!/^\d{12}$/.test(idNumber)) throw new Error('EKYC_ID_NUMBER must be a 12-digit MyKad number');

  const yy = Number(idNumber.slice(0, 2));
  const currentYY = new Date().getFullYear() % 100;
  const year = (yy <= currentYY ? 2000 : 1900) + yy;
  const dob = `${idNumber.slice(4, 6)}/${idNumber.slice(2, 4)}/${year}`;

  return makeCustomer({
    idType: 'MyKad',
    idNumber,
    dob,
    gender: Number(idNumber.slice(-1)) % 2 === 0 ? 'FEMALE' : 'MALE',
    fullName: need('EKYC_FULL_NAME'),
    phone: need('EKYC_PHONE'),
    email: need('EKYC_EMAIL'),
    unitNo: '12-19',
  });
}
