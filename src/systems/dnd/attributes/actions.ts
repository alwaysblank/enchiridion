import {Attribute, genericActionHandler} from './attributes';

export const actions: Attribute<'actions'> = {
    key: 'actions',
    handle: genericActionHandler<'actions'>,
}

export default actions;
