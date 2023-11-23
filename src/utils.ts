export const replaceKey = (f: (s: string) => string) => (o: object): object =>
	Array.isArray(o)
		? o.map(replaceKey (f))
		: Object(o) === o
			? Object.fromEntries(Object.entries(o).map(([k, v]) => [f(k), replaceKey(f)(v)]))
			: o

export const replaceKeysInObj = (oldKey: string, newKey: string) =>
	replaceKey ((k: string) => k == oldKey ? newKey : k)
