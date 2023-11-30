import {cleanString} from '../../../utils';

export type Damage = typeof damage[number];

export const damage = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];

export const isDamageType = (type: string): boolean => {
    return damage.includes(cleanString(type));
}

export const extractDamageTypes = (types: Array<string>): Array<Damage> => {
    return types.filter(isDamageType);
}

export default damage;
