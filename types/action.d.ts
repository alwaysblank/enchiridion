export type Action = {
	name: string,
	type?: string, // i.e. "Melee Attack"
	entries: Array<string>,
}

export type LegendaryAction = Action & {
	cost: number, // Number of actions to do this.
}

export type VillainAction<VillainActionOrder> = Action & {
	order: VillainActionOrder,
}

export type VillainActionOrder = 1 | 2 | 3;
