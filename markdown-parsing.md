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

Any punctuation between the key and value will be removed by the parser, allowing for flexibility in the representation:

```markdown
- **Strength:** 10
- **Dexterity**: 14
- **Constitution** - 12
```

```json
{
  "strength": 10,
  "dexterity": 14,
  "constitution": 12
}
```

## Arrays

Lists that **do not** include key-value paris parse will be parsed as arrays where the value of each list item is a row in the array.
For example:

```markdown
## Stats

- **Strength** 10
- **Intelligence** 16

## Languages

- Common
- Abyssal
```

```json
{
  "stats": {
    "strength": 10,
    "intelligence": 16
  },
  "languages": [
    "Common",
    "Abyssal"
  ]
}
```

An array must have a parent that is a section, so arrays _must_ appear in a format like this:

```markdown
## Languages
- Common
- Abyssal

- Resistances
  - Lightning
  - Psychic
```

```json
{
  "languages": [
    "Common",
    "Abyssal"
  ],
  "resistances": [
    "Lightning",
    "Psychic"
  ]
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

---
- every node we insert into our tree will need a key
- that's just how JSON works
- so how do we determine the key?
  - HEADINGS: The heading text is the key, and initially the value is an empty object (or, potentially, an array)
  - PARAGRAPH (or other plain text): No key of its own; key will come from whatever the parent element is (usually a HEADING)
  - KEY-VALUE LISTS: Each item in the list provides its own key and value.
  - ARRAY LISTS: Like paragraphs, these rely on the parent element for their key
- Effectively, we have two types of nodes:
  - PROVIDE THEIR OWN KEY: Headings, key-value lists
  - INHERIT KEY FROM PARENT: Paragraph, array lists
- What can provide a key:
  - A heading
  - `<strong>` element at the head of a `<p>` element
  - a plain-text list item that contains a sublist
  - table heading
- Apart from headings, all of these are self-contained: We can look at the element and it's children in the AST, and determine that it will provide its own key (or won't)
- Headings already have applicable code
- any element that provides its own key should return an object, which will be merged w/ the spread operator
- any element that does _not_ provide its own key should return either an array, or a string--but in general we won't have these, since key-providers will usually contain them
