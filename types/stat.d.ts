import {DiceRollToken, OperatorToken} from '@airjp73/dice-notation';

export type Stat = {
	name: 'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma',
	value: number,
	save?: {
		operator: OperatorToken,
		mod: DiceRollToken,
	},
}
