import {Mod, Roll} from '../../../dataTypes/dice';
import {Sense} from './sense';
import {Entity} from '../../../dataTypes/Entity';
import {Condition} from '../attributes/conditions';
import {Damage} from '../attributes/damage';
import {Size} from '../attributes/size';
import {Skill} from '../attributes/skills';
import {Speed, SpeedType} from '../attributes/speed';
import {Stat, StatName} from '../attributes/stats';
import {Alignment} from '../attributes/alignment';
import {Action} from '../attributes/actions';
import {Trait} from '../attributes/traits';

export interface VillainAction<Order extends VillainActionOrder> extends Action {
    order: Order,
}


export type VillainActionOrder = 1 | 2 | 3;

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
    /**
     * Holding off on these for a bit.
    villain_actions?: [
        VillainAction<1>,
        VillainAction<2>,
        VillainAction<3>,
    ]
    */
}
