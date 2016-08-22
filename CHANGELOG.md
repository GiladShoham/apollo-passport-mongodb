# Change Log
All notable changes to this project will be documented in this file.
This project will adhere to [Semantic Versioning](http://semver.org/) from v1.0.0+.
We use the format from [keepachangelog.com](keepachangelog.com).

## [Unreleased]

## [v0.0.3] - 2016-08-21

### Added
* `apollo-passport-database-driver` keyword in `package.json` (had to republished).

## [v0.0.2] - 2016-08-20

### Added
* API documentation, inline via jsdoc.  JSdoc dev dependency and `npm run jsdoc`
  with config, built to [docs/api](docs/api) as linked to from the README.
* [CONTRIBUTING.md](CONTRIBUTING.md) as specific to this driver.

### Changed
* Renamed the following methods to clarify that they are internal methods and
  not a part of the API:  `_init()`, `_ready()`
* `fetchConfig()` is no longer run from `_init()`, and now awaits `_ready()`.
  It should be called directly by Apollo Passport.

### Fixed
* `options.configTableName` was accidentally ignored / mispelled
  (for `new DBDriver()`).
* `fetchConfig()` is no longer run from

[Unreleased]: https://github.com/apollo-passport/rethinkdbdash/compare/master...devel
[v0.0.2]: https://github.com/apollo-passport/rethinkdbdash/compare/v0.0.1...v0.0.2
