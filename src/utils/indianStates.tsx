export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
] as const;

export const INDIAN_UNION_TERRITORIES = [
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
] as const;

/** <option>s for every state and union territory, grouped. Keeps an unknown saved value selectable. */
export function StateOptions({ current }: { current?: string }) {
  const known = (INDIAN_STATES as readonly string[]).includes(current || '')
    || (INDIAN_UNION_TERRITORIES as readonly string[]).includes(current || '');
  return (
    <>
      {current && !known ? <option value={current}>{current}</option> : null}
      <optgroup label="States">
        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </optgroup>
      <optgroup label="Union Territories">
        {INDIAN_UNION_TERRITORIES.map((s) => <option key={s} value={s}>{s}</option>)}
      </optgroup>
    </>
  );
}
