import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../entity/creature';
import {toString} from 'mdast-util-to-string';
import {toInteger} from 'lodash';
import {Mod} from '../../../types/dice';

const proficiencyBonus: Attribute<'proficiency_bonus'> = {
    key: 'proficiency_bonus',
    aliases: ['proficiency', 'pb'],
    handle: (node: BasicTypes): Creature['proficiency_bonus'] => {
        let result: Mod = {value: 0};
        if ('value' in node) {
            const str = toString(node);
            result = {value: toInteger(str), operator: '+'}
            if (str.includes('-')) {
                result.operator = '-';
            }
        }
        return result;
    }
}

export default proficiencyBonus;
