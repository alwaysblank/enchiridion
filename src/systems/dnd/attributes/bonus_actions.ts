import {Attribute, genericActionHandler} from './attributes';

export const bonusActions: Attribute<'bonus_actions'> = {
    key: 'bonus_actions',
    aliases: ['bonus actions'],
    handle: genericActionHandler<'bonus_actions'>,
}

export default bonusActions;
