# Enchiridion

A tool for managing 5e D&D content in Obsidian.
This is primarily intended as a tool for DMs, but it can be used by anyone.

## Design

1. **File-based** - A file should represent an individual item.
2. **Human-readable and non-Obsidian-dependant** - This tool should enable additional functionality/layout, but a file should be useful and usable without it.
3. **Flexible and extensible** - The plugin itself should allow expansion, but individual elements should also allow composition, inheritance, etc.
4. **Reliable and communicative** - I've had issues with other plugins that solve these issues where things just _don't work_ and don't provide any feedback regarding what's wrong.

## Data Storage

The initial and primary system of storing structure data should be markdown files, where basic markdown layout tools can be used contextually to describe more richly structure data as parsed by this plugin.
The plugin may later expand to support alternate data sources, such as frontmatter, JSON files, etc, but this is the core UI.

### Parsing

A separate document details how the internal parser will work: [Markdown Parsing](./markdown-parsing.md).

