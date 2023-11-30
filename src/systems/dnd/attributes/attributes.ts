import {Action, Creature} from '../defs/creature';
import {BasicTypes, DocumentTree} from '../../../markdown';
import {toString} from 'mdast-util-to-string';
import {toInteger} from 'lodash';
import ac from './ac';
import actions from './actions';
import bonusActions from './bonus_actions';
import conditionImmunity from './condition_immunity';
import alignment from './alignment';
import cr from './cr';
import damageImmunity from './damage_immunity';
import damageVulnerability from './damage_vulnerability';
import environment from './environment';
import hitDice from './hit_dice';
import language from './language';
import lairActions from './lair_actions';
import legendaryActions from './legendary_actions';
import proficiencyBonus from './proficiency_bonus';
import reactions from './reactions';
import role from './role';
import senses from './senses';
import size from './size';
import skills from './skills';
import speed from './speed';
import stats from './stats';
import source from './source';
import traits from './traits';
import creatureType from './creature_type';
import creatureTags from './creature_tags';

export interface Attribute<Key extends keyof Creature> {
    key: Key,
    aliases?: Array<string>,
    handle?: (node: BasicTypes, parents: Array<BasicTypes | DocumentTree>) => Creature[Key],
}

export function genericActionHandler<Key extends keyof Creature>(node: BasicTypes): Creature[Key] {
    if (!('children' in node)) {
        return;
    }
    return node.children.map((section): Action | Record<string, never> => {
        if (!('children' in section) || !('key' in section)) return {};
        return {
            name: section.key,
            text: toString(section.children)
        }
    }).filter((action): action is Action  => 'name' in action)
}

export function genericIntegerHandler<Key extends keyof Creature>(node: BasicTypes): Creature[Key] {
    return toInteger(toString(node));
}

export function genericArrayHandler<Key extends keyof Creature>(node: BasicTypes): Creature[Key] {
    let found: Array<string> = [];
    if ('value' in node && typeof node.value === 'string') {
        found = [node.value];
    } else if ('children' in node) {
        found = node.children.map(child => toString(child));
    }
    found = [...new Set(found)]; // Deduplicate.
    if (found && found.length > 0) {
        return found;
    }
}

export function makeGenericFilteredArrayHandler<Key extends keyof Creature>(filterFunction: (items: Array<string>) => Array<string>): (node: BasicTypes) => Creature[Key] {
    return function(node: BasicTypes) {
        let found: Array<string> = [];
        if ('value' in node && typeof node.value === 'string') {
            found = filterFunction([node.value]);
        } else if ('children' in node) {
            found = filterFunction(node.children.map(child => toString(child)))
        }
        if (found && found.length > 0) {
            return found;
        }
    }
}

const attributes: Array<Attribute<keyof Creature>> = [
    ac,
    actions,
    alignment,
    bonusActions,
    conditionImmunity,
    cr,
    damageImmunity,
    damageVulnerability,
    environment,
    hitDice,
    language,
    lairActions,
    legendaryActions,
    proficiencyBonus,
    reactions,
    role,
    senses,
    size,
    skills,
    source,
    speed,
    stats,
    traits,
    creatureType,
    creatureTags,
];

export default attributes;
