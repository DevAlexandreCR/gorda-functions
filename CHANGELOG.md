# Gorda Functions Service release notes

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Skip any auction applicant whose id differs from the service's `directed_to`, so a directed test service can only ever be assigned to its target driver, regardless of the driver's app version.
- Short-circuit `ProcessBalanceAction` for `origin: 'test'` services: no min-fee floor, no `trip_fee` write-back, and no balance deduction for any payment mode; `metadata.discount` is persisted as `0`.

## [2.0.4(2026-07-01)](https://github.com/DevAlexandreCR/gorda-functions/compare/2.0.4...2.0.3)

### Added

- Persist the computed driver deduction per completed service to RTDB `metadata.discount` (percentage drivers get the value, monthly `0`), written before the balance mutation for audit safety.
