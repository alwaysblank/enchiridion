import {cleanString} from '../../../utils';

export const damage = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];

export const isDamageType = (type: string): boolean => {
    return damage.includes(cleanString(type));
}

export const extractDamageTypes = (types: Array<string>): typeof damage => {
    return types.filter(isDamageType);
}

export default damage;
