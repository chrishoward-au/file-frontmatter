# TODO

## Bugs
- [ ] Fix issue with tags not being appended or replaced on notes properly
      - Investigate why tag modification operations (append/replace) are not affecting note frontmatter
      - Check tag comparison and frontmatter manipulation logic
      - Verify if changes are being saved correctly to files

## Features

## Improvements

- check if similar tag exists and use it
- ✅ make convert to lowercase an option
- ✅ fix tags returned as a single string, or multiple but some with more than one tag.
- - ✅ concatenate array then split
- ✅ if a markdown file, generate tags
- ✅ strip URLs from extracted text before generating tags
- add option to inline head/footer tags, or include in frontmatter
- review ai modules DRY and SRP
- improve spelling variants structure 
- add options if a file, to move files and notes to subfolders
- create full file template
- fix production not creating tags first run on files