import {Mod, Roll} from '../../../dataTypes/dice';
import {Sense} from './sense';
import {Skill} from './skill';
import {Stat} from './stat';
import {Entity} from '../../../dataTypes/Entity';
import conditions from '../attributes/conditions';
import damage from '../attributes/damage';
import {senseTypes} from '../attributes/senses';

export interface Action {
    name: string,
    type?: string,
    text: string,
}

export interface VillainAction<Order extends VillainActionOrder> extends Action {
    order: Order,
}

export interface Trait {
    name: string,
    description: string,
}

export type Alignment =
    'chaotic evil' | 'chaotic neutral' | 'chaotic good' |
    'neutral evil' | 'true neutral' | 'neutral good' |
    'lawful evil' | 'lawful neutral' | 'lawful good' |
    'unaligned';

export type Size = 'microscopic' | 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan' | 'inconceivable';

export type VillainActionOrder = 1 | 2 | 3;

export interface Creature extends Entity {
    ac: number;
    actions?: Array<Action>,
    alignment?: Alignment,
    bonus_actions?: Array<Action>,
    condition_immunity?: typeof conditions,
    cr: number,
    damage_immunity?: typeof damage,
    damage_vulnerability?: typeof damage,
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
    senses?: typeof senseTypes,
    size: Size,
    skills?: Array<Skill>,
    speed: {
        walk: number,
        climb?: number,
        swim?: number,
        fly?: number,
        jump?: number
    },
    source?: {
        name: string,
        page?: number | URL,
    },
    stats: {
        str: Stat<'str'>,
        dex: Stat<'dex'>,
        con: Stat<'con'>,
        int: Stat<'int'>,
        wis: Stat<'wis'>,
        cha: Stat<'cha'>,
    },
    traits?: Array<Trait>,
    type?: {
        name: string,
        tags?: Array<string>,
    },
    villain_actions?: [
        VillainAction<1>,
        VillainAction<2>,
        VillainAction<3>,
    ]
}
