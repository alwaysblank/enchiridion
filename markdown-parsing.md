# Parsing

This document describes a simple system for parsing markdown layout elements into rich data objects.
Because the basic markdown parser provided by Obsidian supports a limited subset of layout elements, some of this will need to be creative.
If support were ever added for definition lists, for instance, some of this would likely want to be rewritten.

## Goal

The goal of this parser is to generate a JavaScript object from a markdown file that can be easily converted to JSON.
Primarily, this means we need systems to establish the following:

- Nesting
- Key/value pairs
- Arrays

In most cases can assume all data types are `string` type, unless otherwise stated.
In some situations we may have sufficient context to determine data type.

This parser is only interested in parsing scalar data: It is not interested in linking or otherwise relating objects.
The closest it gets to this is loading linked or embedded documents.

## Nesting

Keyed sections are established by **header** elements, and their parent/child relationship is established by header depth and order.
For example:

```markdown
# Orc
## Actions
### Longsword
Melee Weapon Attack, +4 to hit.
## Stats
```

```json
{
  "orc": {
    "actions": {
      "longsword": {
        "text": "Melee Weapon Attack, +4 to hit."
      }
    },
    "stats": {}
  }
}
```

This limits us to a depth of 6, which is as many heading levels as the markdown parser supports.

## Key-Value Pairs

If the first element of a parent element is `strong` (usually `paragraph` or `listItem`), that element will be parsed as a key and the remainder of the content in that parent element will be considered the value.
Note that this _includes_ additional `strong` tags.
For example:

```markdown
**Strength** 10

**Dexterity** 14
```

```json
{
  "Strength": 10,
  "Dexterity": 14
}
```

## Combining

One of the primary features we want to enable is combining multiple documents.
As the parser works through the document, it may encounter elements that already exist.
Depending on particular rules, it will overwrite or add to those things.
For example:

```markdown
## Actions
### Longsword
Melee Weapon Attack, +5 to hit.
### Dagger
Melee Weapon Attack, +3 to hit, 5ft reach, one target.

## Actions
### Longsword
Melee Weapon Attack, +5 to hit, 10ft reach, one target.
```

```json
{
  "actions": {
    "longsword": {
      "text": "Melee Weapon Attack, +5 to hit, 10ft reach, one target."
    },
    "dagger": {
      "text": "Melee Weapon Attack, +3 to hit, 5ft reach, one target."
    }
  }
}
```

> **Note**
> 
> In these examples, title caps are converted into lowercase.
> In practice, data objects will use all lower case for keys, but will be smart enough to convert from title caps or certain abbreviations.
