import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../entity/creature';
import {tokenize} from '@airjp73/dice-notation';
import {toString} from 'mdast-util-to-string';
import {Die, Mod, Roll} from '../../../types/dice';

const hitDice: Attribute<'hit_dice'> = {
    key: 'hit_dice',
    aliases: ['hd', 'hitdice', 'hit dice'],
    handle: (node: BasicTypes): Creature['hit_dice'] => {
        const tokens = tokenize(toString(node));
        const dice: Array<Die> = [];
        const mods: Array<Mod> = [];
        for (let i = 0; i < tokens.length; i++) {
            const current = tokens[i];
            if (current.type === 'DiceRoll' && current.detailType === '_SimpleDieRoll') {
                dice.push({sides: current.detail.numSides, count: current.detail.count});
                continue;
            }
            if (current.type === 'Operator') {
                const next = tokens[i + 1];
                if (next && next.type === 'DiceRoll' && ['+', '-'].contains(current.operator)) {
                    switch (next.detailType) {
                        case '_SimpleDieRoll':
                            dice.push({sides: next.detail.numSides, count: next.detail.count, operator: current.operator as '+' | '-'});
                            i++; // Advance our position, since we've consumed the next item.
                            break;
                        case '_Constant':
                            mods.push({value: next.detail, operator: current.operator as '+' | '-'})
                            i++; // Advance our position, since we've consumed the next item.
                            break;
                    }
                }
                continue;
            }
        }
        const result: Roll = {dice};
        if (mods.length > 0) {
            result.mods = mods;
        }
        return result;
    }
}

export default hitDice;
