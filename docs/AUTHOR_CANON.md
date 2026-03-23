# Author Canon

## Recommended Format

- One author: `Firstname Lastname`
- Multiple authors: `Author One | Author Two | Author Three`

## Rules

- Use one explicit delimiter for multiple authors: ` | `
- Do not encode multiple authors as a comma-separated string
- Do not encode multiple authors as `and`, `und`, `/`, `&`
- Do not use `Lastname, Firstname` as the recommended public format
- If possible, publish each author as a separate author entry in the source feed

## Legacy Handling

- Leading `@` is ignored for author identity
- Automatic splitting is done only for the canonical delimiter
- Legacy ambiguous strings are handled only through explicit overrides in `config/author_overrides.json`
