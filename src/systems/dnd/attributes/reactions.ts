import {Attribute, genericActionHandler} from './attributes';

export const reactions: Attribute<'reactions'> = {
    key: 'reactions',
    handle: genericActionHandler<'reactions'>,
}

export default reactions;
