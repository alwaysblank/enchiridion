import {DiceRollToken, OperatorToken} from '@airjp73/dice-notation';

export type Skill = {
	name: string,
	roll: {
		operator: OperatorToken,
		mod: DiceRollToken,
	},
	passive: number,
	proficient: boolean,
}
