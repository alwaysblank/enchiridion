import {Attribute, makeGenericFilteredArrayHandler} from './attributes';
import {extractConditions} from './conditions';

const conditionImmunity: Attribute<'condition_immunity'> = {
    key: 'condition_immunity',
    aliases: ['condition immunity'],
    handle: makeGenericFilteredArrayHandler<'condition_immunity'>(extractConditions)
}

export default conditionImmunity;
