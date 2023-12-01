import {Attribute} from './attributes';
import {BasicTypes} from '../../../markdown';
import {Creature} from '../entity/creature';
import {Action} from './actions';
import {toString} from 'mdast-util-to-string';

export interface VillainAction extends Action {
    order: VillainActionOrder,
}

export type VillainActionOrder = 1 | 2 | 3;

const villainActions: Attribute<'villain_actions'> = {
    key: 'villain_actions',
    aliases: ['villain actions', 'villain action'],
    handle: (node: BasicTypes): Creature['villain_actions'] => {
        const result: Array<VillainAction> = [];
        if ('children' in node) {
            // This is probably a single action.
            node.children.forEach(child => {
                if ('key' in child && 'value' in child) {
                    const action: VillainAction = {
                        name: child.key,
                        text: toString(child),
                        order: (result.length + 1) as VillainActionOrder,
                    };
                    result.push(action);
                }
            })
        }
        return result;
    }
};

export default villainActions;
