import {cleanString} from '../../../utils';

export type Condition = typeof conditions[number];

export const conditions = [ 'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'poisoned', 'petrified', 'prone', 'restrained', 'stunned', 'unconscious', 'dazed' ];


export const isCondition = (condition: string): boolean => {
    return conditions.includes(cleanString(condition));
}

export const extractConditions = (conditions: Array<string>): Array<Condition> => {
    return conditions.filter(isCondition);
}

export default conditions;
