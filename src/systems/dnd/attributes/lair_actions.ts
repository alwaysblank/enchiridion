import {Attribute, genericActionHandler} from './attributes';

export const lairActions: Attribute<'lair_actions'> = {
    key: 'lair_actions',
    aliases: ['bonus actions'],
    handle: genericActionHandler<'lair_actions'>,
}

export default lairActions;
