import {Alignment} from './alignment';
import {AC} from './ac';
import {DiceRollToken, Token} from '@airjp73/dice-notation';
import {Stat} from './stat';
import {Skill} from './skill';
import {Condition} from './condition';
import {Damage} from './damage';
import {Action, LegendaryAction, VillainAction} from './action';

export type Creature = {
	name: string,
	source?: string,
	page?: number|URL,
	size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan',
	type: {
		type: string,
		tags?: Array<string>,
	},
	alignment: Alignment,
	ac: AC,
	hp: {
		hp: number,
		dice: Array<Token>
	},
	cr: number,
	proficiency: DiceRollToken,
	speed: {
		walk: number,
		climb?: number,
		swim?: number,
		jump?: number,
	},
	stats: {
		str: Stat,
		dex: Stat,
		con: Stat,
		int: Stat,
		wis: Stat,
		cha: Stat,
	},
	skill?: Array<Skill>,
	senses?: Array<string>,
	immune?: {
		condition?: Array<Condition>,
		damage?: Array<Damage>,
	},
	resistant?: Array<Damage>,
	vulnerable?: Array<Damage>,
	actions?: Array<Action>,
	reaction?: Array<Action>,
	bonusActions?: Array<Action>,
	lairActions?: Array<Action>,
	legendaryActions?: Array<LegendaryAction>,
	villainActions?: [
		VillainAction<1>,
		VillainAction<2>,
		VillainAction<3>,
	],
	environment?: Array<string>,
}
