<div align="center">
<p>
    <img width="80" src="https://gist.githubusercontent.com/ImportProgram/ebcfad1a28b7a74f63069cf498f00ee4/raw/b3d5aaadd3b680d36d6d3638f2594afc55e56153/xemplate.svg?sanitize=true">
</p>
<h1>Xemplate</h1>
    A HTML template component compiler, dev server and more!
</div>

---

-   [Example](#example)
-   [Installation](#installation)
-   [Features](#features)
-   [Contributing](#contributing)
-   [Team](#team)
-   [FAQ](#faq)
-   [License](#license)

---

## Example

```html
<template id="Text">
    <p class="@class">$children</p>
</template>

<html>
    <body>
        <Text class="blue">Hello World<Text>
    </body>
<html>
```

## Installation

To use Xemplate, we need to install it globally:
`npm install xemplate -g`

Then to use xemplate we just use the `xem` command:

-   `xem dev <files>`
-   `xem build <files>`

### Building (TypeScript)

To modify or add additional features, clone the repo `https://github.com/ImportProgram/xemplate`

Then install all dependencies
`npm install`

And finally, to start the development server
`npm run dev`

#### Build

To build the project (out within /build):
`npm run build`

---

## Features

Xemplate by default is a plugin supported CLI. It also forces cache on all HTML Abstract Syntax Tree's (AST) by default, and if any plugin supports it.

Currently Xemplate includes these plugins:

-   Components: **Templating components**
    -   All template ID must start with a capital letter
    -   You can not have multiple of the same name in a single file

```html
<template id="Whatever">
    <p>$children</p>
    <p></p
></template>

<Whatever>Hello</Whatever>
```

-   Imports: **Import components from other files**
    -   Importing changes the component syntax by added the **as** attribute, which specifies where that component came from.
    -   Both attributes are required as shown below

```html
<import src="file.html" as="Library" />

<Library-Whatever>Hello</Library-Whatever>
```

-   HMR: **Hot Module Reloading**
    -   Web Server for development, with default port of 7500 (WebSocket at 7501)
    -   Replaces HTML document on save
    -   Supports multiple file editing

---

## Contributing

Make a pull request, add/modify a feature, pretty simple

---

## Team

| <a href="https://importprogram.me" target="_blank">**ImportProgram**</a>                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![ImportProgram](https://avatars2.githubusercontent.com/u/13824197?s=400&u=8a92fced0d0f3916717e36ebba7b4586922bf3ba&v=4&s=200)](https://importprogram.me) |
| <a href="http://github.com/ImportProgram" target="_blank">`github.com/ImportProgram`</a>                                                                   |

---

## FAQ

-   **Mulitline comments break the compiler!**

    -   Yeah this can happen, as currently html-parse-stringify2 doesn't support this, so a fork in the future may happen

-   **The TypeScript sucks!**

    -   This is my first project using typescript, so its not perfect. If you want to help fix my inexperience please make a pull request!

-   **Why are files being read sync, and not async?**
    -   Because of the order which parsing, running plugins and etc was being annoying. This doesn't affect performance.

---

## License

[![License](http://img.shields.io/:license-mit-blue.svg?style=flat-square)](http://badges.mit-license.org)

-   **[MIT license](http://opensource.org/licenses/mit-license.php)**
-   Copyright 2020 © <a href="http://importprogram.me" target="_blank">ImportProgram (Brendann Fuller)</a>.
