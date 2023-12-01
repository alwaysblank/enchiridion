import {Mod} from '../../../types/dice';
import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../entity/creature';
import {cleanString, stringsProbablyMatch} from '../../../utils';
import {toInteger} from 'lodash';

export interface Stat {
    name: StatName,
    score: number,
    mod: Mod,
}

export type StatName = typeof statNames[number];

export const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

export const statMap: Array<[StatName, string]> = [
    ['str',  'strength'],
    ['dex',  'dexterity'],
    ['con',  'constitution'],
    ['int',  'intelligence'],
    ['wis',  'wisdom'],
    ['cha',  'charisma'],
]

export const getStatName = (str: string): null | StatName => {
    const clean = cleanString(str);
    const shortMatch = statNames.find(s => s === clean);
    if (shortMatch) {
        return shortMatch;
    }
    const mapped = statMap.find(([, long]) => stringsProbablyMatch(long, str));
    if (mapped) {
        return mapped[0];
    }
    return null;
}

const stats: Attribute<'stats'> = {
    key: 'stats',
    aliases: ['ability scores', 'ability score', ...statNames],
    handle: (node: BasicTypes): Creature['stats'] => {
        const result: Creature['stats'] = {};
        if('children' in node) {
            node.children.forEach(child => {
                if ('key' in child && 'value' in child && typeof child.key === 'string') {
                    const name = getStatName(child.key);
                    const score = typeof child.value === 'number' ? child.value : toInteger(child.value);
                    if (name && score) {
                        const value = Math.floor((score - 10)/2);
                        const operator = value < 0 ? '-' : '+';
                        const mod: Mod = {
                            value: Math.abs(value),
                            operator,
                        }
                        result[name] = {
                            name,
                            score,
                            mod,
                        }
                    }
                }
            });
        }
        return result;
    }
}

export default stats;
