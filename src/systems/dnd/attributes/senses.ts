import {cleanString} from '../../../utils';
import {Attribute, makeGenericFilteredArrayHandler} from './attributes';

export const senseTypes = ['blindsight', 'darkvision', 'tremorsense', 'truesight'];

export const isSenseType = (sense: string): boolean => {
    return senseTypes.includes(cleanString(sense));
}

export const extractSenseTypes = (senses: Array<string>): typeof senseTypes => {
    return senses.filter(isSenseType);
}

const senses: Attribute<'senses'> = {
    key: 'senses',
    handle: makeGenericFilteredArrayHandler<'senses'>(extractSenseTypes)
}

export default senses;
