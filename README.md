# ESLint [![Dependency Status](https://gemnasium.com/zaggino/brackets-eslint.svg)](https://gemnasium.com/zaggino/brackets-eslint)

Brackets extension which provides file linting with ESLint.

Uses CLIEngine from https://www.npmjs.com/package/eslint
which should provide same results as linting in the command line (respecting all .eslintrc files)

Includes support for `esprima` and `esprima-fb` parsers.

## Install

Use [brackets-npm-registry](https://github.com/zaggino/brackets-npm-registry) (not available yet, use manual way)

or manually:

```
cd C:\Users\<username>\AppData\Roaming\Brackets\extensions\user
git clone https://github.com/zaggino/brackets-npm-registry.git
cd brackets-npm-registry
npm install
```

## Configuration

use standard `.eslintrc` file like [this one](.eslintrc)
