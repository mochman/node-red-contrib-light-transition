# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.10.0] - 2026-10-15

### Added

- `Payload` option / `msg.transition.payloadFormat` (`Flat` or `HomeAssistant`). `HomeAssistant` puts the values under `msg.payload.data`, which is where the Home Assistant action nodes read them (#48). The default (`Flat`) is unchanged.
- `Rounding` option / `msg.transition.colorRounding` (`Truncate` or `Round`) for the Weighted color transition. `Round` uses far more of the available colors with a high number of steps (#47). The default (`Truncate`) is unchanged.
- Short (`#f80`) and RGBA (`#ff8800cc`, alpha ignored) hex colors are accepted. The editor and the input check already allowed them, but they used to crash the node.
- Tests that compare the output with the output of 1.9.1, and tests for the new options.

### Changed

- Removed the `loop` dependency. The node now uses one timer per step that is scheduled relative to the start of the transition, so the steps no longer drift (before, every step took a little longer than the configured time) and no extra timer is left running when a transition is stopped or restarted.
- A running transition keeps its own copy of the settings, so a later (invalid) message can no longer change it.

### Fixed

- `# of steps` = 1 no longer sends a message with `NaN` values after the total time, it sends the end values and `complete`.
- The Weighted transition no longer gives `NaN` colors when the start, transition and end colors are identical.
- An empty color in `msg.transition` falls back to the default color instead of crashing the node.
- A `null` payload no longer throws an error.

## [1.9.1] - 2025-10-30

- Added color_temp_kelvin to outputs for deprecation of color_temp in Home Assistant 2026.1.

## [1.8.1] - 2023-05-23

### Changed

- Fixed an issue where colors may not change when using large number of steps in 'Weighted' mode.
- Node-Red v3 github actions.
- Node versions for tests.

## [1.8.0] - 2023-02-04

### Changed

- Require node >= 14, npm >=6.14.4, node-red >=3.0.0

## [1.7.4] - 2022-04-23

### Added

- Localization files (en_US & de)
- This Change Log

### Changed

- Updated README with new CHANGELOG.

## [1.7.3] - 2022-04-20

### Changed

- Fixed an issue where brightness values could be NaN when using 'Exponential' mode.

## [1.7.2] - 2022-04-08

### Changed

- Fixed an issue where the RGB values could be below 0 when using 'Weighted Tranistion' mode.

## [1.7.1] - 2022-04-08

### Added

- More unit test to check for RGB being out of range.
- Added more github templates

### Changed

- Fixed an issue where the RGB values could be above 255 when using 'No Tranistion' mode.
- Github ci changes.

## [1.7.0] - 2022-04-02

### Added

- Added unit tests.

### Changed

- Changed UI element positioning.

## [1.6.0] - 2022-03-12

### Added

- Added ability to pass through original msg object (except msg.payload).

## [1.5.1] - 2022-03-03

### Changed

- Refactoring code

## [1.5.0] - 2022-02-28

### Added

- Ability to set 0 as starting or ending brightness.

## [1.4.6] - 2022-02-28

### Added

- package.json changes. Nothing changed in code.
- flows.nodered.org additions. Nothing changed in code.

### Changed

- Fixed an issue where sending any change to 'units' wouldn't be used.

## [1.4.3] - 2022-02-10

### Changed

- Fixed more RGB value issues.

## [1.4.2] - 2021-12-29

### Changed

- Fixed an issue where values wouldn't be reset after node is completed or stopped.

## [1.4.1] - 2021-11-29

### Changed

- Fixed an issue where the RGB values could be above 255 when using Half & Half mode.

## [1.4.0] - 2021-11-28

### Added

- Integer brightness is an output now.

## [1.3.1] - 2021-11-28

### Added

- Limits starting and ending brighness to 255.

## [1.3.0] - 2021-11-01

### Added

- Added brightness type. Can now choose between using brightness input as a percent (1-100)
  or as an integer (1-255).

## [1.2.1] - 2021-09-06

### Added

- Added color transition style. Can now choose between "Weighted", "Half & Half", and "None".
- Added images and examples to the README file.

## [1.1.0] - 2021-09-02

### Added

- Color_temp (mireds) to outputs

### Changed

- Logic of Linear brightness change

## [1.0.1] - 2021-09-01

### Added

- New for RGB Color selectors

## [1.0.0] - 2021-09-01

### Added

- Initial Release

[unreleased]: https://github.com/mochman/node-red-contrib-light-transition/compare/v1.9.1...HEAD
[1.9.1]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.9.1
[1.8.1]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.8.1
[1.8.0]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.8.0
[1.7.4]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.7.4
[1.7.3]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.7.3
[1.7.2]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.7.2
[1.7.1]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.7.1
[1.7.0]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.7.0
[1.6.0]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.6.0
[1.5.1]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.5.1
[1.5.0]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.5.0
[1.4.6]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.4.6
[1.4.3]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.4.3
[1.4.2]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.4.2
[1.4.1]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.4.1
[1.4.0]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.4.0
[1.3.1]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.3.1
[1.3.0]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.3.0
[1.2.1]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.2.1
[1.1.0]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.1.0
[1.0.1]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.0.1
[1.0.0]: https://github.com/mochman/node-red-contrib-light-transition/releases/tag/v1.0.0
