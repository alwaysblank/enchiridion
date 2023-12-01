import {visitParents} from 'unist-util-visit-parents'
import {
    DocumentTree,
    normalizeKey
} from '../../../markdown';
import {toString} from 'mdast-util-to-string';
import attributes, {Attribute} from '../attributes/attributes';
import {Entity} from '../../../dataTypes/Entity';
import {Action} from '../attributes/actions';
import {Alignment} from '../attributes/alignment';
import {Condition} from '../attributes/conditions';
import {Damage} from '../attributes/damage';
import {Mod, Roll} from '../../../dataTypes/dice';
import {Sense} from '../defs/sense';
import {Size} from '../attributes/size';
import {Skill} from '../attributes/skills';
import {Speed, SpeedType} from '../attributes/speed';
import {Stat, StatName} from '../attributes/stats';
import {Trait} from '../attributes/traits';
import {VillainAction} from '../attributes/villain_actions';

export interface Creature extends Entity {
    ac: number;
    actions?: Array<Action>,
    alignment?: Alignment,
    bonus_actions?: Array<Action>,
    condition_immunity?: Array<Condition>,
    cr: number,
    damage_immunity?: Array<Damage>,
    damage_vulnerability?: Array<Damage>,
    environment?: Array<string>,
    hp: number,
    hit_dice?: Roll,
    language?: Array<string>,
    lair_actions?: Array<Action>,
    legendary_actions?: Array<Action>,
    name: string,
    proficiency_bonus?: Mod,
    reactions?: Array<Action>,
    role?: string,
    senses?: Array<Sense>,
    size?: Size,
    skills?: Array<Skill>,
    speed: {[Property in SpeedType]?: Speed},
    source?: {
        name?: string,
        page?: number | URL,
    },
    stats: {[Property in StatName]?: Stat},
    traits?: Array<Trait>,
    creature_type?: string,
    creature_tags?: Array<string>,
    villain_actions?: Array<VillainAction>
}

export function creature(document: DocumentTree): Partial<Creature> {
    const name = document.name;
    const creature: Partial<Creature> = {name};
    const aliasLookup: {[index: string]: Attribute<keyof Creature>} = {};
    attributes.forEach( (attr: Attribute<keyof Creature>) => {
        const aliases: Array<string> = attr.aliases || [];
        [...aliases, attr.key as string].forEach(alias => aliasLookup[normalizeKey(alias)] = attr)
    })
    visitParents(document, (node, parents) => {
        if ('key' in node) {
            const key = normalizeKey(node.key);
            const attr: Attribute<keyof Creature> | null = aliasLookup[key] || null;
            if (attr) {
                const handler = attr.handle || toString;
                const value = handler(node, parents);
                if (value) {
                    if (creature[attr.key]) {
                        // If this exists, assume we want to append.
                        if (Array.isArray(creature[attr.key]) && Array.isArray(value)) {
                            // We should also deduplicate array values, at least naively.
                            creature[attr.key] = [...new Set([...creature[attr.key] as Array<any>, ...value])]
                            return;
                        } else if (typeof creature[attr.key] === 'object' && typeof value === 'object') {
                            creature[attr.key] = {...creature[attr.key] as object, ...value}
                            return;
                        }
                    }
                    creature[attr.key] = value;
                }
            }
        }
    });

    return creature;
}

