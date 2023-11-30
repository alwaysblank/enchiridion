import {Attribute, genericActionHandler} from './attributes';

export const legendaryActions: Attribute<'legendary_actions'> = {
    key: 'legendary_actions',
    aliases: ['bonus actions'],
    handle: genericActionHandler<'legendary_actions'>,
}

export default legendaryActions;
