import {Attribute, makeGenericFilteredArrayHandler} from './attributes';
import {extractDamageTypes} from './damage';

const damageImmunity: Attribute<'damage_immunity'> = {
    key: 'damage_immunity',
    aliases: ['damage_immunity'],
    handle: makeGenericFilteredArrayHandler<'damage_immunity'>(extractDamageTypes)
}

export default damageImmunity
