# D&D Parsing

Once the [markdown parser](./markdown-parsing.md) has done its job, we parse that generic object to convert it into a D&D-specific object.
These are two separate steps because we want to leave the door open to parsing data form markdown into other forms—either for other TTRPG systems, or for something else—but also because the concerns of each parser are different.
The markdown parser is concerned with converting natural language into a data object.
The D&D parser is concerned with determining what in that data object has specific meaning in a D&D context and in some cases improving or detailing portions of it.

## Mapping & Normalization

Part of this process will be mapping and normalization, to allow for greater latitude when writing documents for human consumption.
Largely this will involve two types of actions:

- Enforce consistency of non-semantic elements.
  - i.e. `Longsword` => `longsword`, `some key` => `some_key`
- Mapping terms to their canonical variants.
  - i.e. `Strength` => `str`, `Challenge Rating` => `cr`

