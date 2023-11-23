import {DiceRollToken, Token} from '@airjp73/dice-notation';
import {AC} from '../types/ac';
import {Alignment} from '../types/alignment';
import {Condition} from '../types/condition';
import {Damage} from '../types/damage';
import {Action, LegendaryAction, VillainAction} from '../types/action';
import {Skill} from '../types/skill';
import {Stat} from '../types/stat';

export class Creature {
	ac: AC;
	actions: Array<Action>;
	alignment: Alignment;
	bonusActions: Array<Action>;
	cr: number;
	environment: Set<string>;
	hp: { hp: number; dice: Array<Token> };
	immune: { condition?: Set<Condition>; damage?: Set<Damage> };
	lairActions: Array<Action>;
	legendaryActions: Array<LegendaryAction>;
	name: string;
	page: number | URL;
	proficiency: DiceRollToken;
	reaction: Array<Action>;
	resistant: Set<Damage>;
	senses: Set<string>;
	size: "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan";
	skill: Array<Skill>;
	source: string;
	speed: { walk: number; climb?: number; swim?: number; jump?: number };
	stats: { str: Stat; dex: Stat; con: Stat; int: Stat; wis: Stat; cha: Stat };
	type: { type: string; tags?: Set<string> };
	villainActions: [VillainAction<1>, VillainAction<2>, VillainAction<3>];
	vulnerable: Set<Damage>;


}
