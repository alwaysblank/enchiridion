import {cleanString} from '../../../utils';

export const conditions = [ 'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'poisoned', 'petrified', 'prone', 'restrained', 'stunned', 'unconscious', 'dazed' ];


export const isCondition = (condition: string): boolean => {
    return conditions.includes(cleanString(condition));
}

export const extractConditions = (conditions: Array<string>): typeof conditions => {
    return conditions.filter(isCondition);
}

export default conditions;
